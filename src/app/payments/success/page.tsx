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

  const kind = params.get("kind");
const isSubscription = params.get("subscription") === "1";

  const [seconds, setSeconds] = useState(2);

  useEffect(() => {
  if (seconds <= 0) {
    const hasPurchase = !!purchaseId && !!kind;
    

   if (hasPurchase) {
  if (kind === "LEVEL_KEY") {
    router.replace(`/myrooms?purchase=success&kind=LEVEL_KEY`);
  } else if (kind === "AVATAR") {
    router.replace(`/avatar?purchase=success`);
  } else if (kind === "COOLDOWN_TOKEN_PACK") {
    router.replace(`/dashboard?purchase=success`);
  } else {
    router.replace("/dashboard");
  }
} else if (isSubscription) {
      router.replace("/Subscription");
    } else {
      router.replace("/dashboard");
    }

    return;
  }

  const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
  return () => clearTimeout(timer);
}, [seconds, router, purchaseId, kind, isSubscription]);

 return (
  <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 px-4">
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
      className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-10 text-center border border-white/20"
    >
      {/* Emoji */}
      <motion.div
        initial={{ y: -10 }}
        animate={{ y: 10 }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 0.8,
        }}
        className="text-6xl mb-6"
      >
        🎉
      </motion.div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
        Payment Successful
      </h1>

      {/* Description */}
      <p className="text-base sm:text-lg opacity-90 mb-4 leading-relaxed">
        {kind === "LEVEL_KEY"
          ? "🔑 Your key is being activated..."
          : kind === "AVATAR"
          ? "🧑‍🎨 Your avatar is being unlocked..."
          : kind === "COOLDOWN_TOKEN_PACK"
          ? "⚡ Your tokens are being added..."
          : isSubscription
          ? "⭐ Your premium is being activated..."
          : "Your purchase has been completed successfully."}
      </p>

      {/* Purchase ID */}
      {purchaseId && (
        <p className="text-xs opacity-60 mb-6 break-all">
          Purchase ID: {purchaseId}
        </p>
      )}

      {/* Divider */}
      <div className="h-px bg-white/20 my-6" />

      {/* Redirect */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm opacity-80">Redirecting</p>

        <div className="flex gap-1">
          <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.2s]" />
          <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.1s]" />
          <span className="w-2 h-2 bg-white rounded-full animate-bounce" />
        </div>
      </div>
    </motion.div>
  </main>
); }