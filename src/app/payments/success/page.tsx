"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<p className="text-white text-center mt-20">Loading...</p>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const purchaseId = params.get("purchaseId");

  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (seconds <= 0) {
      router.push("/dashboard");
      return;
    }

    const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-white bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 px-6">
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
          🎉
        </motion.div>

        <h1 className="text-4xl font-extrabold mb-4">Payment Successful</h1>

        <p className="text-lg opacity-90 mb-3">
          Your purchase has been completed successfully.
        </p>

        {purchaseId && (
          <p className="text-sm opacity-70 mb-6">Purchase ID: {purchaseId}</p>
        )}

        <p className="text-sm opacity-80">
          Redirecting to Networ.King in {seconds}s...
        </p>
      </motion.div>
    </main>
  );
}