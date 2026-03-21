import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type RateEntry = { count: number; resetAt: number };
const rateMap = new Map<string, RateEntry>();

function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();

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

    if (isRateLimited(ip, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const message = String(body?.message ?? "").trim();

    const company = String(body?.company ?? "").trim();
    if (company) {
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

    const to = process.env.CONTACT_TO_EMAIL;

    if (!to) {
      return NextResponse.json(
        { ok: false, error: "Server email config missing." },
        { status: 500 }
      );
    }

    const result = await resend.emails.send({
      // ✅ FIX: use safe sender (Resend requires verified or Gmail-like)
      from: "NetworKing <onboarding@resend.dev>",

      to,

      // ✅ FIX: static subject (no user content)
      subject: "New Contact Message",

      // ✅ FIX: safe reply
      replyTo: email,

      // ✅ FIX: SIMPLE TEXT ONLY (no HTML)
      text: `New contact message

Name: ${name}
Email: ${email}

Message:
${message}`,
    });

    if ((result as any)?.error) {
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