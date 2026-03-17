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
      router.replace("/subscription");
    } else {
      router.replace("/dashboard");
    }

    return;
  }

  const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
  return () => clearTimeout(timer);
}, [seconds, router, purchaseId, kind, isSubscription]);

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

        {purchaseId && (
          <p className="text-sm opacity-70 mb-6">Purchase ID: {purchaseId}</p>
        )}

        <p className="text-sm opacity-80 flex items-center gap-1">
  Redirecting
  <span className="flex gap-0.5">
    <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.2s]" />
    <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.1s]" />
    <span className="w-1 h-1 bg-current rounded-full animate-bounce" />
  </span>
</p>
      </motion.div>
    </main>
  );
}