"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-white bg-gradient-to-br from-gray-700 via-slate-700 to-gray-800 px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
        className="text-center"
      >
        <div className="text-7xl mb-6">⚠️</div>

        <h1 className="text-4xl font-extrabold mb-4">
          Payment Cancelled
        </h1>

        <p className="text-lg opacity-90 mb-6">
          Your payment was cancelled. No charges were made.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push("/avatars")}
            className="px-6 py-3 rounded-xl bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-300"
          >
            Back to Avatars
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 rounded-xl bg-white/20 border border-white/20 font-semibold hover:bg-white/30"
          >
            Go to Dashboard
          </button>
        </div>
      </motion.div>
    </main>
  );
}