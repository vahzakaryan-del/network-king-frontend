import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Best-effort in-memory rate limit (works well on a single server;
 * on serverless it still helps but may reset between invocations).
 */
type RateEntry = { count: number; resetAt: number };
const rateMap = new Map<string, RateEntry>();

function getClientIp(req: Request) {
  // Common proxies / Vercel headers:
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();

  // Fallback key if IP is not available:
  return "unknown";
}

function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= limit) return true;

  entry.count += 1;
  rateMap.set(key, entry);
  return false;
}

// Optional: occasional cleanup so map doesn't grow forever
function cleanupRateMap() {
  const now = Date.now();
  for (const [k, v] of rateMap.entries()) {
    if (now > v.resetAt) rateMap.delete(k);
  }
}

export async function POST(req: Request) {
  try {
    cleanupRateMap();

    const ip = getClientIp(req);

    // Example limit: 5 requests per 10 minutes per IP
    const LIMIT = 5;
    const WINDOW_MS = 10 * 60 * 1000;

    if (isRateLimited(ip, LIMIT, WINDOW_MS)) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const message = String(body?.message ?? "").trim();

    // NEW: sanitize name for subject (prevent long/abuse input)
const safeName = name.slice(0, 80);

// NEW: timestamp for debugging/logging
const timestamp = new Date().toISOString();

    // Honeypot: bots often fill hidden fields
    const company = String(body?.company ?? "").trim();
    if (company) {
      // Pretend it's ok (or return 400). Pretending ok reduces bot learning.
      return NextResponse.json({ ok: true });
    }

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email address." },
        { status: 400 }
      );
    }

    if (message.length < 5) {
      return NextResponse.json(
        { ok: false, error: "Message is too short." },
        { status: 400 }
      );
    }

    // Basic length caps to reduce abuse
    if (name.length > 120 || email.length > 200 || message.length > 5000) {
      return NextResponse.json(
        { ok: false, error: "Message too long." },
        { status: 400 }
      );
    }

    const to = process.env.CONTACT_TO_EMAIL;
    const from = process.env.CONTACT_FROM_EMAIL;

    if (!to || !from) {
      return NextResponse.json(
        { ok: false, error: "Server email config missing." },
        { status: 500 }
      );
    }
const result = await resend.emails.send({
  from,
  to,
  subject: `Networ.King Contact — ${safeName}`,
  replyTo: email,
  text: [
  `Name: ${name}`,
  `Email: ${email}`,
  `IP: ${ip}`,
  `Time: ${timestamp}`, // NEW
  "",
  "Message:",
  message,
].join("\n"),
});

console.log("RESEND_RESULT:", result);

if ((result as any)?.error) {
  console.error("Resend error:", (result as any).error);
  return NextResponse.json(
    { ok: false, error: "Email provider error." },
    { status: 502 }
  );
}


    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to send message." },
      { status: 500 }
    );
  }
}
