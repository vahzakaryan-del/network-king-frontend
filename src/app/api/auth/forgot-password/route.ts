import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim();

    const res = await fetch("http://localhost:4000/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => null);

    // Always return generic, even if backend errors
    return NextResponse.json({
      ok: true,
      message: data?.message ?? "If that email exists, a reset link was sent.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      ok: true,
      message: "If that email exists, a reset link was sent.",
    });
  }
}
