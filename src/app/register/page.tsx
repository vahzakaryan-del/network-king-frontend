"use client";

function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  if (m === 0) return `${s}s`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

import { Suspense, useEffect,  useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

function RegisterPageContent() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    agreeToTerms: false,
  });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingVerification, setWaitingVerification] = useState(false);
  const [cooldownUntilMs, setCooldownUntilMs] = useState<number | null>(null);
const [nowMs, setNowMs] = useState(Date.now());

  const router = useRouter();
  const searchParams = useSearchParams();

  // referral from /register?ref=XXXX
  const refFromUrl = searchParams.get("ref");

  useEffect(() => {
    if (refFromUrl) {
      localStorage.setItem("ref", refFromUrl);
    }
  }, [refFromUrl]);
  useEffect(() => {

  if (!waitingVerification) return;

  const interval = setInterval(async () => {

    try {

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/email-status?email=${encodeURIComponent(formData.email)}`
      );

      const data = await res.json();

      if (data.verified) {
        router.push("/login?verified=1");
      }

    } catch (err) {
      console.error("Verification check failed:", err);
    }

  }, 5000);

  return () => clearInterval(interval);

}, [waitingVerification, formData.email]);
 
  useEffect(() => {
  const id = setInterval(() => setNowMs(Date.now()), 1000);
  return () => clearInterval(id);
}, []);
  
const cooldownSecondsLeft = useMemo(() => {
  if (!cooldownUntilMs) return 0;
  const diff = Math.ceil((cooldownUntilMs - nowMs) / 1000);
  return Math.max(0, diff);
}, [cooldownUntilMs, nowMs]);

const isCoolingDown = cooldownSecondsLeft > 0;


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;

    if (name === "name") {
      const sanitized = value.replace(/[^A-Za-z\s]/g, "").slice(0, 24);

      setFormData((prev) => ({
        ...prev,
        name: sanitized,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resendVerification = async () => {

  if (isCoolingDown) return;

  try {

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.email }),
    });

    if (res.ok) {
      setCooldownUntilMs(Date.now() + 60000); // start 60s timer
    }

  } catch (err) {
    console.error("Resend verification failed:", err);
  }

};
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreeToTerms) {
      setMessage("⚠️ Please agree to the Terms & Conditions first.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Registering...");

    try {
      const ref = (refFromUrl || localStorage.getItem("ref") || "").trim();

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ref: ref || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
  localStorage.removeItem("ref");

  setWaitingVerification(true);
  setMessage("");

  // send verification email immediately
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: formData.email }),
  });
  setCooldownUntilMs(Date.now() + 60000);
}

      
      else {
        setMessage(`❌ ${data?.error ?? "Registration failed."}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Network error. Check server.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Join the Kingdom of
            </h2>

            <h1 className="mt-1 text-3xl font-extrabold text-amber-300 drop-shadow-md sm:text-4xl">
              👑 Networ.King
            </h1>

            {(refFromUrl ||
              (typeof window !== "undefined" &&
                localStorage.getItem("ref"))) && (
              <p className="mt-2 text-xs text-amber-200/90">
                Invite detected — your signup will be counted.
              </p>
            )}
          </div>

          {!waitingVerification && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="name"
              maxLength={24}
              pattern="^[A-Za-z\s]{1,24}$"
              title="Name must contain only letters and spaces (max 24 characters)"
              className="w-full rounded-lg bg-white/20 p-3 text-white placeholder-gray-300 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-400"
            />

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              inputMode="email"
              className="w-full rounded-lg bg-white/20 p-3 text-white placeholder-gray-300 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-400"
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className="w-full rounded-lg bg-white/20 p-3 text-white placeholder-gray-300 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-400"
            />

            <label className="flex items-start gap-2 pt-1 text-sm text-gray-200/90">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 accent-amber-400"
              />
              <span className="leading-relaxed">
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-semibold text-amber-300 hover:underline"
                >
                  Terms & Conditions
                </Link>{" "}
                and acknowledge the{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-semibold text-amber-300 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-amber-400 py-3 font-semibold text-gray-900 transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:hover:scale-105 sm:hover:bg-amber-300"
            >
              {isSubmitting ? "Registering..." : "Register"}
            </button>
          </form>
          )}

          {waitingVerification && (

  <div className="space-y-4 text-center">

    <div className="rounded-xl border border-white/40 bg-white/10 backdrop-blur-md p-5 text-gray-100 shadow-lg">

      <div className="text-lg font-semibold text-white mb-2">
        Verify your email
      </div>

      <div className="text-sm text-gray-200">
        We sent a verification link to:
      </div>

      <div className="text-sm font-semibold text-amber-300 mt-1">
        {formData.email}
      </div>

      <div className="text-xs text-gray-300 mt-3 flex items-center justify-center gap-2">
        <span className="animate-pulse">Checking verification...</span>
      </div>

    </div>

   <button
  onClick={resendVerification}
  disabled={isCoolingDown}
  className="w-full rounded-lg bg-amber-400 py-3 font-semibold text-gray-900 disabled:opacity-60"
>
  {isCoolingDown
    ? `Resend in ${formatSeconds(cooldownSecondsLeft)}`
    : "Resend verification email"}
</button>

  </div>

)}

          {message && (
            <p className="mt-4 text-center text-sm text-gray-100">{message}</p>
          )}

          <p className="mt-6 text-center text-sm text-gray-200/90">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-amber-300 hover:underline"
            >
              Log in here
            </Link>
          </p>
        </motion.div>

        <footer className="mt-8 text-center text-xs text-gray-200/80 sm:mt-10 sm:text-sm md:absolute md:bottom-6 md:mt-0">
          © {new Date().getFullYear()} Networ.King
        </footer>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-indigo-900" />}>
      <RegisterPageContent />
    </Suspense>
  );
}