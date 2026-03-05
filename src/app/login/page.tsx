"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) router.push("/dashboard");
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("Logging in...");

    try {
      const res = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(`❌ ${data?.error ?? "Login failed."}`);
        return;
      }

      // Store auth/session values once
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", String(data.user?.id ?? ""));
      localStorage.setItem("userName", String(data.user?.name ?? ""));
      localStorage.setItem("avatar", String(data.user?.avatar ?? ""));

      setMessage("✅ Login successful! Redirecting...");
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (err) {
      console.error(err);
      setMessage("❌ Network error. Check server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white font-sans">
      {/* Overlay gradient */}
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
              Welcome back to
            </h2>
            <h1 className="mt-1 text-3xl font-extrabold text-amber-300 drop-shadow-md sm:text-4xl">
              Networ.King 👑
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="current-password"
              className="w-full rounded-lg bg-white/20 p-3 text-white placeholder-gray-300 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-400"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-amber-400 py-3 font-semibold text-gray-900 transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:hover:scale-105 sm:hover:bg-amber-300"
            >
              {isSubmitting ? "Logging in..." : "Log In"}
            </button>

            <Link
  href="/forgot-password"
  className="block text-center text-sm text-amber-300 hover:underline"
>
  Forgot your password?
</Link>

          </form>

          {message && (
            <p className="mt-4 text-center text-sm text-gray-100">{message}</p>
          )}

          <p className="mt-6 text-center text-sm text-gray-200/90">
            Don’t have an account?{" "}
            <Link href="/register" className="font-semibold text-amber-300 hover:underline">
              Register here
            </Link>
          </p>
        </motion.div>

        {/* Footer: flow on mobile, no overlap */}
        <footer className="mt-8 text-center text-xs text-gray-200/80 sm:mt-10 sm:text-sm md:absolute md:bottom-6 md:mt-0">
          © {new Date().getFullYear()} Networ.King
        </footer>
      </div>
    </main>
  );
}
