"use client";

import { useState } from "react";

type Subscription = {
  id: number;
  provider: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
} | null;

type PremiumGrant = {
  id: number;
  periodStart: string;
  periodEnd: string;
  cooldownTokensGranted: number;
  createdAt: string;
};

type Purchase = {
  id: number;
  kind: string;
  avatarId: number | null;
  level: number | null;
  quantity: number | null;
  amountCents: number;
  currency: string;
  provider: string;
  status: string;
  providerPaymentId: string | null;
  createdAt: string;
};

type BillingResponse = {
  userId: number;
  isPremiumNow: boolean;
  premiumUntil: string | null;
  subscription: Subscription;
  premiumGrants: PremiumGrant[];
  purchases: Purchase[];
  totals: { totalSpentCents: number };
};

const API = process.env.NEXT_PUBLIC_API_URL!;

function euro(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function fmtDate(x: string | null) {
  if (!x) return "—";
  return new Date(x).toLocaleString();
}

export default function AdminPurchasesPage() {
  const [userId, setUserId] = useState("");
  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not logged in");
      return;
    }

    const uid = Number(userId);
    if (!Number.isFinite(uid)) {
      setError("Invalid userId");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`${API}/admin/users/${uid}/billing`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load billing");

      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-6">💳 User Billing (Admin)</h1>

      <div className="flex gap-4 items-end mb-6">
        <div>
          <label className="block text-sm font-semibold mb-1">User ID</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="px-3 py-2 border rounded w-40"
            placeholder="e.g. 12"
          />
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white font-bold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load Billing"}
        </button>
      </div>

      {error && <div className="mb-4 text-red-600">❌ {error}</div>}

      {!data ? (
        <div className="text-gray-600">Enter a userId to view billing.</div>
      ) : (
        <div className="space-y-8">
          {/* PREMIUM SUMMARY */}
          <section className="bg-white border rounded p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Premium status</h2>
              <div
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  data.isPremiumNow ? "bg-green-200 text-green-900" : "bg-gray-200 text-gray-800"
                }`}
              >
                {data.isPremiumNow ? "PREMIUM ACTIVE" : "NOT PREMIUM"}
              </div>
            </div>

            <div className="mt-2 text-sm">
              <div>
                <span className="font-semibold">Premium until:</span>{" "}
                {data.premiumUntil ? fmtDate(data.premiumUntil) : "—"}
              </div>
              <div className="mt-1">
                <span className="font-semibold">Total spent (paid purchases):</span>{" "}
                {euro(data.totals.totalSpentCents || 0)}
              </div>
            </div>
          </section>

          {/* SUBSCRIPTION */}
          <section className="bg-white border rounded p-4">
            <h2 className="text-xl font-bold mb-3">Subscription</h2>

            {!data.subscription ? (
              <div className="text-gray-600">No subscription row.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-semibold">Provider:</span> {data.subscription.provider}
                </div>
                <div>
                  <span className="font-semibold">Status:</span> {data.subscription.status}
                </div>
                <div>
                  <span className="font-semibold">Period start:</span>{" "}
                  {fmtDate(data.subscription.currentPeriodStart)}
                </div>
                <div>
                  <span className="font-semibold">Period end:</span>{" "}
                  {fmtDate(data.subscription.currentPeriodEnd)}
                </div>
                <div>
                  <span className="font-semibold">providerCustomerId:</span>{" "}
                  {data.subscription.providerCustomerId || "—"}
                </div>
                <div>
                  <span className="font-semibold">providerSubscriptionId:</span>{" "}
                  {data.subscription.providerSubscriptionId || "—"}
                </div>
              </div>
            )}
          </section>

          {/* PREMIUM GRANTS */}
          <section className="bg-white border rounded p-4">
            <h2 className="text-xl font-bold mb-3">Premium Grants</h2>

            {data.premiumGrants.length === 0 ? (
              <div className="text-gray-600">No premium grants found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border bg-white">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="p-2 border">ID</th>
                      <th className="p-2 border">Period</th>
                      <th className="p-2 border">Tokens Granted</th>
                      <th className="p-2 border">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.premiumGrants.map((g) => (
                      <tr key={g.id} className="text-sm">
                        <td className="p-2 border">{g.id}</td>
                        <td className="p-2 border">
                          {fmtDate(g.periodStart)} → {fmtDate(g.periodEnd)}
                        </td>
                        <td className="p-2 border">{g.cooldownTokensGranted}</td>
                        <td className="p-2 border">{fmtDate(g.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* PURCHASES */}
          <section className="bg-white border rounded p-4">
            <h2 className="text-xl font-bold mb-3">Purchases</h2>

            {data.purchases.length === 0 ? (
              <div className="text-gray-600">No purchases found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border bg-white">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="p-2 border">ID</th>
                      <th className="p-2 border">Kind</th>
                      <th className="p-2 border">Details</th>
                      <th className="p-2 border">Amount</th>
                      <th className="p-2 border">Status</th>
                      <th className="p-2 border">Provider</th>
                      <th className="p-2 border">PaymentId</th>
                      <th className="p-2 border">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchases.map((p) => (
                      <tr key={p.id} className="text-sm">
                        <td className="p-2 border">{p.id}</td>
                        <td className="p-2 border">{p.kind}</td>
                        <td className="p-2 border">
                          {p.kind === "AVATAR" && `Avatar #${p.avatarId}`}
                          {p.kind === "LEVEL_KEY" && `Level ${p.level}`}
                          {p.kind === "COOLDOWN_TOKEN_PACK" && `${p.quantity} tokens`}
                          {!["AVATAR", "LEVEL_KEY", "COOLDOWN_TOKEN_PACK"].includes(p.kind) && "—"}
                        </td>
                        <td className="p-2 border">{euro(p.amountCents)}</td>
                        <td className="p-2 border">{p.status}</td>
                        <td className="p-2 border">{p.provider}</td>
                        <td className="p-2 border">{p.providerPaymentId || "—"}</td>
                        <td className="p-2 border">{fmtDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
