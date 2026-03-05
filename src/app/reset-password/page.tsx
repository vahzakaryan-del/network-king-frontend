"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiEye, FiEyeOff } from "react-icons/fi"; // Eye icons

function getPasswordStrength(pw: string) {
  const length = pw.length;

  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  let score = 0;
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (hasLower && hasUpper) score += 1;
  if (hasNumber) score += 1;
  if (hasSymbol) score += 1;

  const label =
    score <= 1
      ? "Weak"
      : score === 2
      ? "Fair"
      : score === 3
      ? "Good"
      : score === 4
      ? "Strong"
      : "Very strong";

  return { score, label, hasLower, hasUpper, hasNumber, hasSymbol, length };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const strength = getPasswordStrength(password);
  const strengthPct = Math.min(100, (strength.score / 5) * 100);

  // Prevent copy, cut, and paste actions
  const handleCopyCutPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setMessage("Copying, cutting, or pasting passwords is not allowed.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setMessage("Missing token. Please use the link from your email.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password.length > 72) {
      setMessage("Password too long.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    if (strength.score <= 1) {
      setMessage("Please choose a stronger password.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Resetting password...");

    try {
      const res = await fetch("http://localhost:4000/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(`❌ ${data?.error ?? "Reset failed."}`);
        return;
      }

      setMessage("✅ Password updated! Redirecting to login...");
      setTimeout(() => router.push("/login"), 900);
    } catch (err) {
      console.error(err);
      setMessage("❌ Network error. Check server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-amber-400 text-white font-sans">
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
              Set a new password for
            </h2>
            <h1 className="mt-1 text-3xl font-extrabold text-amber-300 drop-shadow-md sm:text-4xl">
              Networ.King 👑
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Input */}
            <div className="relative">
              <input
                type={isPasswordVisible ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                onCopy={handleCopyCutPaste}
                onCut={handleCopyCutPaste}
                onPaste={handleCopyCutPaste}
                className="w-full rounded-lg bg-white/20 p-3 text-white placeholder-gray-300 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setIsPasswordVisible((prev) => !prev)}
              >
                {isPasswordVisible ? (
                  <FiEyeOff className="text-white" />
                ) : (
                  <FiEye className="text-white" />
                )}
              </button>
            </div>

            {/* Strength meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-200">
                <span>Password strength</span>
                <span className="font-semibold text-amber-200">{strength.label}</span>
              </div>

              <div className="h-2 w-full rounded-full bg-white/10 ring-1 ring-white/10 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${strengthPct}%` }}
                />
              </div>

              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-200/90">
                <li className={strength.length >= 8 ? "text-emerald-200" : ""}>• 8+ chars</li>
                <li className={strength.hasNumber ? "text-emerald-200" : ""}>• Number</li>
                <li className={strength.hasSymbol ? "text-emerald-200" : ""}>• Symbol</li>
                <li className={strength.hasUpper ? "text-emerald-200" : ""}>• Uppercase</li>
              </ul>
            </div>

            {/* Confirm Password Input */}
            <div className="relative">
              <input
                type={isConfirmPasswordVisible ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                onCopy={handleCopyCutPaste}
                onCut={handleCopyCutPaste}
                onPaste={handleCopyCutPaste}
                className="w-full rounded-lg bg-white/20 p-3 text-white placeholder-gray-300 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setIsConfirmPasswordVisible((prev) => !prev)}
              >
                {isConfirmPasswordVisible ? (
                  <FiEyeOff className="text-white" />
                ) : (
                  <FiEye className="text-white" />
                )}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-amber-400 py-3 font-semibold text-gray-900 transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:hover:scale-105 sm:hover:bg-amber-300"
            >
              {isSubmitting ? "Resetting..." : "Reset password"}
            </button>
          </form>

          {message && (
            <p className="mt-4 text-center text-sm text-gray-100">{message}</p>
          )}

          <p className="mt-6 text-center text-sm text-gray-200/90">
            <Link
              href="/login"
              className="font-semibold text-amber-300 hover:underline"
            >
              Back to login
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
