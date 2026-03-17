"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

type ButtonType = {
  label: string;
  target: string;
  color: "yellow" | "white" | "black" | "blue";
};

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<p className="text-white text-center mt-20">Loading...</p>}>
      <PaymentCancelContent />
    </Suspense>
  );
}

function PaymentCancelContent() {
  const params = useSearchParams();
  const router = useRouter();
  const from = params.get("from"); // "avatars", "dashboard", "myrooms", "tests"
  const [seconds, setSeconds] = useState(4);

  useEffect(() => {
    const timer = setTimeout(() => setSeconds((s) => Math.max(s - 1, 0)), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const handleRedirect = (target: string) => router.push(target);

  // Define buttons and labels
  const buttons: ButtonType[] = [
    { label: "Go to Avatars", target: "/avatar", color: "yellow" },
    { label: "Go to Dashboard", target: "/dashboard", color: "white" },
    { label: "Return to Rooms", target: "/myrooms", color: "black" },
    { label: "Go to Tests", target: "/tests", color: "blue" },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-white bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 px-6">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 12 }}
        className="text-center"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 0.6,
          }}
          className="text-7xl mb-6"
        >
          ❌
        </motion.div>

        <h1 className="text-4xl font-extrabold mb-4">Payment Cancelled</h1>

        <p className="text-lg opacity-90 mb-3">
          Your transaction was not completed.
        </p>

        <p className="text-sm opacity-80 mb-6">
          No charges were made. You can try again or go back.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-4">
          {buttons.map((btn) => {
            const isOrigin = from === btn.target.slice(1); // compare to path without "/"
            const baseClasses =
              "px-6 py-3 rounded-xl font-bold transition shadow-md hover:brightness-110";
            let colorClasses = "";

            switch (btn.color) {
              case "yellow":
                colorClasses = isOrigin
                  ? "bg-yellow-300 text-gray-900 border-2 border-white"
                  : "bg-yellow-400 text-gray-900 hover:bg-yellow-300";
                break;
              case "white":
                colorClasses = isOrigin
                  ? "bg-white text-black border-2 border-white"
                  : "bg-white/20 border border-white/20 text-white hover:bg-white/30";
                break;
              case "black":
                colorClasses = isOrigin
                  ? "bg-gray-900 text-white border-2 border-white"
                  : "bg-white text-black hover:bg-gray-200";
                break;
              case "blue":
                colorClasses = isOrigin
                  ? "bg-blue-400 text-white border-2 border-white"
                  : "bg-blue-500 text-white hover:bg-blue-400";
                break;
            }

            return (
              <button
                key={btn.target}
                onClick={() => handleRedirect(btn.target)}
                className={`${baseClasses} ${colorClasses}`}
              >
                {btn.label} {isOrigin ? "(from here)" : ""}
              </button>
            );
          })}
        </div>

        <p className="text-xs opacity-70 mt-2" aria-live="polite">
          Page active for {seconds} second{seconds !== 1 ? "s" : ""}...
          {from && ` (from: ${from})`}
        </p>
      </motion.div>
    </main>
  );
}