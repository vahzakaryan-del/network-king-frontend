"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type Entitlements = {
  isPremium: boolean;
  premiumUntil: string | null;
  cooldownSkipTokens: number;
  tombolaDailyLimit: number;
};

const API = "http://localhost:4000";

// ✅ Change these if your dev endpoints are named differently
const DEV_ACTIVATE_ENDPOINT = `${API}/dev/premium/activate`;
const DEV_CANCEL_ENDPOINT = `${API}/dev/premium/cancel`;


export default function PremiumPage() {
  const router = useRouter();

  const [ent, setEnt] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ✅ set your price here for now (later fetch from server/Stripe)
  const premiumPriceLabel = useMemo(() => "€X / month", []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchEntitlements = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return { ok: false as const };
    }

    try {
      const res = await fetch(`${API}/me/entitlements`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(`❌ ${data?.error || "Failed to load entitlements"}`);
        return { ok: false as const };
      }

      setEnt(data);
      return { ok: true as const, data };
    } catch {
      showToast("❌ Failed to load entitlements");
      return { ok: false as const };
    }
  }, [router, showToast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchEntitlements();
      setLoading(false);
    })();
  }, [fetchEntitlements]);

  const fmtDateTime = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  // ✅ DEV activate premium (temporary)
  const devActivate = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.replace("/login");

    setBusy(true);
    try {
      const res = await fetch(DEV_ACTIVATE_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(`❌ ${data?.error || "Activate failed"}`);
        return;
      }

      showToast("✅ Premium activated (dev)");
      await fetchEntitlements();
    } catch {
      showToast("❌ Network error");
    } finally {
      setBusy(false);
    }
  }, [router, fetchEntitlements, showToast]);

  // ✅ DEV cancel premium (temporary)
  const devCancel = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.replace("/login");

    setBusy(true);
    try {
      const res = await fetch(DEV_CANCEL_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(`❌ ${data?.error || "Cancel failed"}`);
        return;
      }

      showToast("✅ Premium canceled (dev)");
      await fetchEntitlements();
    } catch {
      showToast("❌ Network error");
    } finally {
      setBusy(false);
    }
  }, [router, fetchEntitlements, showToast]);

  // Later: replace with Stripe checkout
  const startRealCheckout = useCallback(async () => {
    showToast("🧪 Later: Stripe checkout session");
  }, [showToast]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white relative">
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 pt-10 pb-20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              ⭐ Premium Membership
            </h1>
            <p className="text-white/75 mt-2">
              Unlock monthly avatar, extra tombola turn, and cooldown skips.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition"
          >
            ← Back
          </button>
        </div>

        {/* Status Card */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white/10 border border-white/15 shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-3">Your status</h2>

            {loading ? (
              <div className="text-white/80">Loading…</div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold border ${
                      ent?.isPremium
                        ? "bg-emerald-500/25 border-emerald-300/40 text-emerald-100"
                        : "bg-white/10 border-white/20 text-white/80"
                    }`}
                  >
                    {ent?.isPremium ? "PREMIUM ACTIVE" : "FREE"}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-white/85">
                  <div>
                    <span className="text-white/60">Premium until:</span>{" "}
                    <span className="font-semibold">{fmtDateTime(ent?.premiumUntil ?? null)}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Cooldown skip tokens:</span>{" "}
                    <span className="font-semibold">{ent?.cooldownSkipTokens ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Tombola turns/day:</span>{" "}
                    <span className="font-semibold">{ent?.tombolaDailyLimit ?? 1}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Offer Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl bg-gradient-to-b from-yellow-300/25 to-yellow-600/20 border border-yellow-300/30 shadow-2xl p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-amber-200">
                  Premium — {premiumPriceLabel}
                </h2>
                <p className="text-white/80 text-sm mt-1">
                  Monthly subscription. Cancel anytime (later with Stripe).
                </p>
              </div>

              <div className="px-3 py-1 rounded-full bg-black/25 border border-white/15 text-xs">
                DEV UI
              </div>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-white/90">
              <li>✅ 2 free cooldown skips / month (tokens)</li>
              <li>✅ Premium badge</li>
              <li>✅ 1 monthly premium avatar unlock (current month only)</li>
              <li>✅ +1 tombola turn per day</li>
            </ul>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {/* Real checkout later */}
              <button
                onClick={startRealCheckout}
                disabled={busy}
                className={`px-5 py-3 rounded-xl font-bold shadow-lg border transition ${
                  busy
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-yellow-400 text-gray-900 border-yellow-300 hover:bg-yellow-300"
                }`}
              >
                Buy Premium (coming soon)
              </button>

              {/* Dev activate */}
              <button
                onClick={devActivate}
                disabled={busy}
                className={`px-5 py-3 rounded-xl font-bold shadow-lg border transition ${
                  busy
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-emerald-400 text-gray-900 border-emerald-300 hover:bg-emerald-300"
                }`}
                title="DEV only: sets your premium on for testing"
              >
                Activate (dev)
              </button>

              {/* Dev cancel */}
              <button
                onClick={devCancel}
                disabled={busy}
                className={`px-5 py-3 rounded-xl font-bold shadow-lg border transition ${
                  busy
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                }`}
                title="DEV only: cancel premium for testing"
              >
                Cancel (dev)
              </button>
            </div>

            <p className="mt-4 text-xs text-white/70">
              Later, “Activate (dev)” becomes “Stripe Checkout”, and “Cancel (dev)”
              becomes “Manage subscription”.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="fixed bottom-6 right-6 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 shadow-lg z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
