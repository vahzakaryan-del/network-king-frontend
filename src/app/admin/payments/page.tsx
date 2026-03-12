"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Purchase = {
  id: number;
  userId: number;
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

function euro(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function fmtDate(x: string) {
  return new Date(x).toLocaleString();
}

export default function AdminPaymentsPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("24h");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  async function load() {
    if (!token) return;

    setLoading(true);

    try {
      const res = await fetch(`${API}/admin/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (res.ok) {
        setPurchases(json.purchases || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function filterByTime(list: Purchase[]) {
    const now = Date.now();

    const ranges: any = {
      "5m": 5 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      all: Infinity,
    };

    const limit = ranges[timeFilter];

    return list.filter(
      (p) => now - new Date(p.createdAt).getTime() <= limit
    );
  }

  let filtered = filterByTime(purchases);

  if (statusFilter !== "all") {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  if (kindFilter !== "all") {
    filtered = filtered.filter((p) => p.kind === kindFilter);
  }

  filtered = [...filtered].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const revenue = filtered
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amountCents, 0);

  const stats = {
    paid: filtered.filter((p) => p.status === "paid").length,
    pending: filtered.filter((p) => p.status === "pending").length,
    expired: filtered.filter((p) => p.status === "expired").length,
  };

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-6">💳 Payments Dashboard</h1>

      {/* Filters */}

      <div className="flex flex-wrap gap-4 mb-6">

        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="5m">Last 5 min</option>
          <option value="1h">Last hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="all">All time</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
        </select>

        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="all">All types</option>
          <option value="AVATAR">Avatar</option>
          <option value="LEVEL_KEY">Level key</option>
          <option value="COOLDOWN_TOKEN_PACK">Token pack</option>
        </select>

        <button
          onClick={load}
          className="px-4 py-2 bg-black text-white rounded font-bold"
        >
          Refresh
        </button>
      </div>

      {/* Stats */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600">Revenue</div>
          <div className="text-2xl font-bold">{euro(revenue)}</div>
        </div>

        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600">Paid</div>
          <div className="text-2xl font-bold">{stats.paid}</div>
        </div>

        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold">{stats.pending}</div>
        </div>

        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600">Expired</div>
          <div className="text-2xl font-bold">{stats.expired}</div>
        </div>

      </div>

      {/* Table */}

      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">ID</th>
              <th className="p-2 border">User</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Details</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Provider</th>
              <th className="p-2 border">Payment</th>
              <th className="p-2 border">Date</th>
            </tr>
          </thead>

          <tbody>

            {loading && (
              <tr>
                <td colSpan={9} className="p-6 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center">
                  No purchases found
                </td>
              </tr>
            )}

            {filtered.map((p) => (
              <tr key={p.id} className="border-t">

                <td className="p-2 border">{p.id}</td>

                <td className="p-2 border">{p.userId}</td>

                <td className="p-2 border">{p.kind}</td>

                <td className="p-2 border">
                  {p.kind === "AVATAR" && `Avatar #${p.avatarId}`}
                  {p.kind === "LEVEL_KEY" && `Level ${p.level}`}
                  {p.kind === "COOLDOWN_TOKEN_PACK" && `${p.quantity} tokens`}
                </td>

                <td className="p-2 border">{euro(p.amountCents)}</td>

                <td className="p-2 border">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      p.status === "paid"
                        ? "bg-green-200 text-green-900"
                        : p.status === "pending"
                        ? "bg-yellow-200 text-yellow-900"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>

                <td className="p-2 border">{p.provider}</td>

                <td className="p-2 border">
                  {p.provider === "stripe" && p.providerPaymentId ? (
                    <a
                      href={`https://dashboard.stripe.com/payments/${p.providerPaymentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      {p.providerPaymentId}
                    </a>
                  ) : (
                    p.providerPaymentId || "—"
                  )}
                </td>

                <td className="p-2 border">{fmtDate(p.createdAt)}</td>

              </tr>
            ))}

          </tbody>
        </table>
      </div>
    </main>
  );
}