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

    // sanitize name for subject
    const safeName = name.slice(0, 80);

    // timestamp
    const timestamp = new Date().toISOString();

    // Honeypot
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

      // ✅ improved TEXT version (less spammy)
      text: `
New contact message from Networ.King

Name: ${name}
Email: ${email}
Time: ${timestamp}

Message:
${message}

Reply directly to this email to respond.
`,

      // ✅ HTML version (VERY IMPORTANT)
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>📩 New Contact Message</h2>

          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Time:</strong> ${timestamp}</p>

          <p><strong>Message:</strong></p>
          <div style="padding:10px; border:1px solid #ddd; border-radius:6px; white-space: pre-line;">
            ${message}
          </div>

          <hr />
          <p style="font-size:12px;color:#888;">
            Sent via Networ.King contact form
          </p>
        </div>
      `,
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