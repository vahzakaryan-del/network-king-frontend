"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:4000";

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
  providerPaymentId: string | null;
  status: string;
  createdAt: string;
};

function euro(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export default function DevPaymentsPage() {
  const router = useRouter();

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const [userId, setUserId] = useState("");
  const [kind, setKind] = useState<"AVATAR" | "COOLDOWN_TOKEN_PACK" | "LEVEL_KEY">("AVATAR");
  const [avatarId, setAvatarId] = useState("");
  const [level, setLevel] = useState("");
  const [quantity, setQuantity] = useState("5");
  const [currency, setCurrency] = useState("EUR");

  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [debouncedUserId, setDebouncedUserId] = useState(userId);


  useEffect(() => {
  const t = setTimeout(() => {
    setDebouncedUserId(userId);
  }, 300);

  return () => clearTimeout(t);
}, [userId]);


  async function loadPurchases() {
    if (!token) {
      showToast("❌ No token, login as admin");
      return;
    }
    const uid = Number(userId);
    if (!Number.isFinite(uid)) {
      showToast("❌ userId invalid");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/dev/purchases?userId=${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setPurchases(data.purchases || []);
    } catch (e: any) {
      showToast(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function createPurchase() {
    if (!token) {
      showToast("❌ No token, login as admin");
      return;
    }
    const uid = Number(userId);
    if (!Number.isFinite(uid)) {
      showToast("❌ userId invalid");
      return;
    }

    const payload: any = {
      userId: uid,
      kind,
      currency,
    };

    if (kind === "AVATAR") payload.avatarId = Number(avatarId);
    if (kind === "LEVEL_KEY") payload.level = Number(level);
    if (kind === "COOLDOWN_TOKEN_PACK") payload.quantity = Number(quantity);

    if (kind === "AVATAR" && !Number.isFinite(payload.avatarId)) {
      showToast("❌ avatarId invalid");
      return;
    }
    if (kind === "LEVEL_KEY" && !Number.isFinite(payload.level)) {
      showToast("❌ level invalid");
      return;
    }
    if (kind === "COOLDOWN_TOKEN_PACK" && (!Number.isFinite(payload.quantity) || payload.quantity <= 0)) {
      showToast("❌ quantity invalid");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/dev/purchases/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Create failed");

      showToast(`✅ Created purchase #${data.purchase.id} (pending)`);
      await loadPurchases();
    } catch (e: any) {
      showToast(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function markPaid(purchaseId: number) {
    if (!token) {
      showToast("❌ No token, login as admin");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/dev/purchases/${purchaseId}/mark-paid`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Mark paid failed");

      showToast(`✅ Purchase #${purchaseId} paid + fulfilled`);
      await loadPurchases();
    } catch (e: any) {
      showToast(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
  const uid = Number(debouncedUserId);
  if (!token) return;
  if (!Number.isFinite(uid)) return;

  loadPurchases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [debouncedUserId, token]);


  return (
    <main className="min-h-screen p-8 bg-gray-950 text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold">🧪 Dev Payments</h1>

        <button
          onClick={() => router.push("http://localhost:3000/admin")}
          className="px-3 py-2 text-sm font-bold rounded-xl bg-white/10 hover:bg-white/20 border border-white/10"
        >
          ← Back to Panel
        </button>
      </div>

      <div className="bg-white/10 border border-white/10 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">User ID</label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-black/40 border border-white/10"
              placeholder="e.g. 1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Kind</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
              className="w-full px-3 py-2 rounded bg-black/40 border border-white/10"
            >
              <option value="AVATAR">AVATAR</option>
              <option value="COOLDOWN_TOKEN_PACK">COOLDOWN_TOKEN_PACK</option>
              <option value="LEVEL_KEY">LEVEL_KEY</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Avatar ID (if AVATAR)</label>
            <input
              value={avatarId}
              onChange={(e) => setAvatarId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-black/40 border border-white/10"
              placeholder="e.g. 12"
              disabled={kind !== "AVATAR"}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Level (if LEVEL_KEY)</label>
            <input
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 rounded bg-black/40 border border-white/10"
              placeholder="e.g. 3"
              disabled={kind !== "LEVEL_KEY"}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Quantity (if TOKENS)</label>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 rounded bg-black/40 border border-white/10"
              placeholder="e.g. 5"
              disabled={kind !== "COOLDOWN_TOKEN_PACK"}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Currency</span>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-24 px-3 py-2 rounded bg-black/40 border border-white/10"
            />
          </div>

          <button
            onClick={createPurchase}
            disabled={loading}
            className="px-4 py-2 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-60"
          >
            Create Pending Purchase
          </button>

          <button
            onClick={loadPurchases}
            disabled={loading}
            className="px-4 py-2 rounded-xl font-bold bg-white/15 hover:bg-white/20 disabled:opacity-60"
          >
            Refresh Purchases
          </button>
        </div>

        <p className="text-xs text-white/70 mt-3">
          Notes: Avatar price is taken from DB. Level key price from RoomLevel. Token pack uses DEV pricing: €0.99 per token.
        </p>
      </div>

      <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Latest Purchases</h2>
          {loading ? <span className="text-sm text-white/70">Loading…</span> : null}
        </div>

        {purchases.length === 0 ? (
          <div className="text-white/70">No purchases loaded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/80">
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-3 text-left">ID</th>
                  <th className="py-2 pr-3 text-left">Kind</th>
                  <th className="py-2 pr-3 text-left">Details</th>
                  <th className="py-2 pr-3 text-left">Amount</th>
                  <th className="py-2 pr-3 text-left">Status</th>
                  <th className="py-2 pr-3 text-left">Created</th>
                  <th className="py-2 pr-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-2 pr-3">{p.id}</td>
                    <td className="py-2 pr-3">{p.kind}</td>
                    <td className="py-2 pr-3">
                      {p.kind === "AVATAR" && `Avatar #${p.avatarId}`}
                      {p.kind === "LEVEL_KEY" && `Level ${p.level}`}
                      {p.kind === "COOLDOWN_TOKEN_PACK" && `${p.quantity} tokens`}
                    </td>
                    <td className="py-2 pr-3">{euro(p.amountCents)}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          p.status === "paid"
                            ? "bg-green-500/20 text-green-200"
                            : p.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-200"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      <button
                        onClick={() => markPaid(p.id)}
                        disabled={loading || p.status !== "pending"}
                        className="px-3 py-1 rounded-lg font-bold bg-blue-500/30 hover:bg-blue-500/40 disabled:opacity-40"
                      >
                        Mark paid
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 bg-white/15 border border-white/10 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
