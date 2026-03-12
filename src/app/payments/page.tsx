"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const purchaseId = params.get("purchaseId");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-white bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600">
      <h1 className="text-4xl font-bold mb-6">✅ Payment Successful</h1>

      <p className="text-lg mb-4">
        Your purchase has been completed.
      </p>

      {purchaseId && (
        <p className="text-sm opacity-80 mb-8">
          Purchase ID: {purchaseId}
        </p>
      )}

      <Link
        href="/avatars"
        className="px-6 py-3 bg-white text-black rounded-xl font-bold"
      >
        Back to Avatars
      </Link>
    </main>
  );
}
