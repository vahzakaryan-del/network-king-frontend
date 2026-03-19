"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
      company: String(formData.get("company") ?? ""), // honeypot
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setStatus("error");
        setError(data?.error ?? "Failed to send message.");
        return;
      }

      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-6 sm:space-y-10">
      <header className="space-y-2">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-300 hover:text-zinc-400"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-4 text-2xl sm:text-3xl font-semibold text-zinc-300">
          Contact
        </h1>

        <p className="text-sm sm:text-base text-zinc-300">
          For support, account issues, or data requests, please use the form below.
        </p>

        <p className="text-xs text-zinc-400">
          We usually respond within 1–2 business days.
        </p>
      </header>

      {/* Separator */}
      <div className="pt-2">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Honeypot (bot trap) */}
        <input
          name="company"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <input
            required
            name="name"
            placeholder="Name"
            className="bg-white/5 border border-amber-200/30 rounded-xl px-4 py-3 outline-none focus:border-amber-200/60 text-zinc-200 placeholder:text-zinc-500"
          />

          <input
            required
            name="email"
            type="email"
            placeholder="Email"
            className="bg-white/5 border border-amber-200/30 rounded-xl px-4 py-3 outline-none focus:border-amber-200/60 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>

        <textarea
          required
          name="message"
          rows={6}
          placeholder="Your message"
          className="w-full bg-white/5 border border-amber-200/30 rounded-xl px-4 py-3 outline-none focus:border-amber-200/60 text-zinc-200 placeholder:text-zinc-500 resize-none"
        />

        <button
          disabled={status === "sending"}
          className="w-full rounded-xl bg-white/10 hover:bg-white/20 border border-amber-200/30 px-4 py-3 text-zinc-200 disabled:opacity-60 transition"
        >
          {status === "sending"
            ? "Sending..."
            : status === "sent"
            ? "Message sent ✓"
            : "Send message"}
        </button>

        {/* Success */}
        {status === "sent" && (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Your message has been sent successfully. We’ll get back to you soon.
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <p className="text-xs text-zinc-400 leading-relaxed">
          Tip: If you&apos;re reporting a bug, please include steps for us to reproduce it.
        </p>

        {/* GDPR note */}
        <p className="text-xs text-zinc-500 leading-relaxed">
          This form can also be used to request access to or deletion of your personal data.
        </p>
      </form>
    </div>
  );
}