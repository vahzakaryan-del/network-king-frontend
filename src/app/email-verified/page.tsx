"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function EmailVerifiedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-zinc-900 text-white p-6">
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-800 rounded-2xl p-10 text-center max-w-md shadow-xl"
      >
        <h1 className="text-3xl font-bold mb-4 text-green-400">
          ✅ Email Verified
        </h1>

        <p className="text-zinc-300 mb-6">
          Your account has been successfully verified.
        </p>

        <button
          onClick={() => router.push("/login")}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 transition"
        >
          Go to Login
        </button>
      </motion.div>

    </div>
  );
}