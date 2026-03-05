"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    agreeToTerms: false,
  });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ referral from /register?ref=XXXX
  const refFromUrl = searchParams.get("ref");

  // ✅ make referral sticky across navigation
  useEffect(() => {
    if (refFromUrl) {
      localStorage.setItem("ref", refFromUrl);
    }
  }, [refFromUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, type, value, checked } = e.target;

  if (name === "name") {
    // Allow only letters and spaces
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

      const res = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ref: ref || undefined, // ✅ only send if exists
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // ✅ avoid accidental reuse
        localStorage.removeItem("ref");

        setMessage("✅ Registration successful! Redirecting to login...");
        setTimeout(() => router.push("/login"), 1200);
      } else {
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

      {/* Wrapper: padding + safe mobile height */}
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

            {/* Optional: tiny hint if ref exists */}
            {(refFromUrl || (typeof window !== "undefined" && localStorage.getItem("ref"))) && (
              <p className="mt-2 text-xs text-amber-200/90">
                Invite detected — your signup will be counted.
              </p>
            )}
          </div>

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

        {/* Footer: flow on mobile, no overlap with keyboard/content */}
        <footer className="mt-8 text-center text-xs text-gray-200/80 sm:mt-10 sm:text-sm md:absolute md:bottom-6 md:mt-0">
          © {new Date().getFullYear()} Networ.King
        </footer>
      </div>
    </main>
  );
}
