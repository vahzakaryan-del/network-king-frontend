"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type NoticeKind = "success" | "warning" | "error" | "info";

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return `${mm}:${ss}`;
}

function NoticeBox({
  kind,
  title,
  children,
}: {
  kind: NoticeKind;
  title?: string;
  children: React.ReactNode;
}) {
  const styles = useMemo(() => {
    switch (kind) {
      case "success":
        return "border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
      case "warning":
        return "border-amber-400/40 bg-amber-400/10 text-amber-100";
      case "error":
        return "border-rose-400/40 bg-rose-400/10 text-rose-100";
      default:
        return "border-white/15 bg-white/10 text-gray-100";
    }
  }, [kind]);

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

const COOLDOWN_STORAGE_KEY = "forgotPasswordCooldownUntilMs";
const COOLDOWN_SECONDS = 15 * 60;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const [notice, setNotice] = useState<{
    kind: NoticeKind;
    title?: string;
    text: string;
  } | null>(null);

  // cooldownUntilMs: timestamp in ms when user can retry
  const [cooldownUntilMs, setCooldownUntilMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  // tick clock while cooldown is active
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // load cooldown from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (!raw) return;
      const until = Number(raw);
      if (Number.isFinite(until) && until > Date.now()) {
        setCooldownUntilMs(until);
      } else {
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const cooldownSecondsLeft = useMemo(() => {
    if (!cooldownUntilMs) return 0;
    const diff = Math.ceil((cooldownUntilMs - nowMs) / 1000);
    return Math.max(0, diff);
  }, [cooldownUntilMs, nowMs]);

  const isCoolingDown = cooldownSecondsLeft > 0;

  const startCooldown = () => {
    const until = Date.now() + COOLDOWN_SECONDS * 1000;
    setCooldownUntilMs(until);
    try {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, String(until));
    } catch {
      // ignore
    }
  };

  const clearCooldown = () => {
    setCooldownUntilMs(null);
    try {
      localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCoolingDown) {
      setSent(true);
      setNotice({
        kind: "warning",
        title: "Please wait",
        text: `Too many reset attempts. Try again in ${formatSeconds(
          cooldownSecondsLeft
        )}.`,
      });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // ✅ Rate-limited
      if (res.status === 429) {
        startCooldown();
        setSent(true);
        setNotice({
          kind: "warning",
          title: "Too many requests",
          text: `You’ve requested too many reset links. Try again in ${formatSeconds(
            COOLDOWN_SECONDS
          )}.`,
        });
        return;
      }

      const data = await res.json().catch(() => null);

      setSent(true);
      setNotice({
        kind: "success",
        title: "Request received",
        text:
          data?.message ??
          "If that email exists, a reset link was sent. Please check your inbox/spam folder.",
      });
    } catch (err) {
      console.error(err);
      // Keep safe + user-friendly (don’t reveal account existence)
      setSent(true);
      setNotice({
        kind: "error",
        title: "Network error",
        text: "We couldn’t send the request right now. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // when cooldown ends, clear storage automatically
  useEffect(() => {
    if (cooldownUntilMs && cooldownSecondsLeft === 0) {
      clearCooldown();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldownSecondsLeft]);

  return (
    <main className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white font-sans">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          className="w-full max-w-md rounded-2xl bg-white/10 p-6 shadow-2xl backdrop-blur-md sm:p-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 text-center">
            <h2 className="text-base font-medium text-gray-200 sm:text-lg">
              Forgot your password?
            </h2>
            <h1 className="mt-1 text-3xl font-extrabold text-amber-300 drop-shadow-md sm:text-4xl">
              Networ.King 👑
            </h1>
            <p className="mt-2 text-sm text-gray-200">
              Enter your email and we’ll send you a reset link.
            </p>
          </div>

          {!sent ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  inputMode="email"
                  className="w-full rounded-lg bg-white/20 p-3 text-white placeholder-gray-300 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-400"
                />

                <button
                  type="submit"
                  disabled={isSubmitting || isCoolingDown}
                  className="w-full rounded-lg bg-amber-400 py-3 font-semibold text-gray-900 transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:hover:scale-105 sm:hover:bg-amber-300"
                >
                  {isCoolingDown
                    ? `Try again in ${formatSeconds(cooldownSecondsLeft)}`
                    : isSubmitting
                    ? "Sending..."
                    : "Send reset link"}
                </button>
              </form>

              {notice && (
                <div className="mt-4">
                  <NoticeBox kind={notice.kind} title={notice.title}>
                    {notice.text}
                  </NoticeBox>
                </div>
              )}

              <p className="mt-6 text-center text-sm text-gray-200/90">
                <Link
                  href="/login"
                  className="font-semibold text-amber-300 hover:underline"
                >
                  Back to login
                </Link>
              </p>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-fit rounded-full bg-white/10 px-4 py-2 text-sm text-gray-100 ring-1 ring-white/10">
                {notice?.kind === "warning"
                  ? "⏳ Please wait"
                  : notice?.kind === "error"
                  ? "⚠️ Error"
                  : "✅ Done"}
              </div>

              {notice ? (
                <NoticeBox kind={notice.kind} title={notice.title}>
                  {notice.text}
                  {isCoolingDown && (
                    <>
                      <div className="mt-2 font-semibold">
                        Try again in {formatSeconds(cooldownSecondsLeft)}.
                      </div>
                    </>
                  )}
                </NoticeBox>
              ) : (
                <NoticeBox kind="info">
                  If that email exists, you’ll receive a reset link shortly.
                </NoticeBox>
              )}

              <div className="space-y-2">
                <Link
                  href="/login"
                  className="block w-full rounded-lg bg-white/10 py-3 font-semibold text-gray-100 ring-1 ring-white/10 hover:bg-white/15"
                >
                  Back to login
                </Link>

                <button
                  type="button"
                  disabled={isCoolingDown}
                  onClick={() => {
                    setSent(false);
                    setNotice(null);
                    setEmail("");
                  }}
                  className="w-full rounded-lg py-3 text-sm text-amber-200 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCoolingDown
                    ? `You can resend in ${formatSeconds(cooldownSecondsLeft)}`
                    : "Send another link"}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <footer className="mt-8 text-center text-xs text-gray-200/80 sm:mt-10 sm:text-sm md:absolute md:bottom-6 md:mt-0">
          © {new Date().getFullYear()} Networ.King
        </footer>
      </div>
    </main>
  );
}
