"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminActivatePage() {
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("❌ You must be logged in!");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/api/make-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Success! Redirecting...");
        setTimeout(() => router.push("/dashboard"), 1200);
      } else {
        setMessage(`❌ ${data.error || "Something went wrong"}`);
      }
    } catch (err) {
      setMessage("❌ Network error");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-amber-400 flex items-center justify-center text-white px-4">
      <div className="bg-black/40 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/20 max-w-md w-full">
        <h1 className="text-3xl font-bold text-amber-300 mb-4 text-center">
          👑 Admin Activation
        </h1>
        <p className="text-sm text-gray-300 mb-6 text-center">
          Enter secret code to upgrade your account.
        </p>

        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Enter admin code"
          className="w-full mb-4 px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none text-white"
        />

        <button
          onClick={handleSubmit}
          className="w-full py-3 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition"
        >
          Activate Admin
        </button>

        {message && (
          <p className="mt-4 text-center text-sm">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
