"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Admin › Tests (Listing)
 */

type TestRow = {
  id: number;
  mode: "internal" | "external";
  externalUrl?: string | null;
  title: string;
  description?: string | null;
  category: "achievement" | "fun";
  timeLimit?: number | null;
  allowedAttempts?: number | null;
  cooldownDays?: number | null;
  maxScore?: number | null;
  questionsCount?: number | null;
  isActive: boolean;
  createdAt: string;
  badge?: { id: number; name: string; rarity: string } | null;
};

type Profile = {
  id: number;
  name: string;
  role?: string;
  avatar?: string | null;
};

export default function AdminTestsPage() {
  const router = useRouter();

  // --- auth/profile
  const [me, setMe] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // --- data
  const [tests, setTests] = useState<TestRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- filters
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<"all" | "achievement" | "fun">("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const [showArchived, setShowArchived] = useState(false);

  // small animation helper
  const fade = useMemo(
    () => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }),
    []
  );

  // --------- verify admin ----------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.replace("/login");

    (async () => {
      try {
        const res = await fetch("http://localhost:4000/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data?.user) throw new Error("Profile fetch failed");
        if (data.user.role !== "admin") {
          router.replace("/dashboard");
          return;
        }
        setMe(data.user);
      } catch {
        router.replace("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // --------- load tests ----------
  useEffect(() => {
    if (!me) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    setFetching(true);
    setError(null);

    fetch("http://localhost:4000/admin/tests", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data?.error || "Failed to load tests");
        }

        const items: TestRow[] = (data?.tests || []).map((t: any) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  category: t.category,
  timeLimit: t.timeLimit,
  allowedAttempts: t.allowedAttempts,
  cooldownDays: t.cooldownDays,
  maxScore: t.maxScore ?? null,
  questionsCount: typeof t.questionsCount === "number" ? t.questionsCount : 0,
  isActive: t.isActive,
  createdAt: t.createdAt,
  badge: t.badge,
  mode: t.mode,
  externalUrl: t.externalUrl,
}));


        setTests(items);
      })
      .catch((e) => setError(e.message || "Failed to load tests"))
      .finally(() => setFetching(false));
  }, [me]);

  // --------- filtered view ----------
  const filtered = useMemo(() => {
  // 🚨 Only active tests in main section
  let arr = tests.filter((t) => t.isActive);

  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    arr = arr.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        (t.description || "").toLowerCase().includes(needle) ||
        (t.badge?.name || "").toLowerCase().includes(needle)
    );
  }

  if (category !== "all") {
    arr = arr.filter((t) => t.category === category);
  }

  return arr;
}, [tests, q, category]);



  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white">
        <div className="text-center">
          <div className="animate-pulse text-2xl font-bold">Loading Admin…</div>
          <div className="mt-2 text-white/80 text-sm">Verifying access</div>
        </div>
      </main>
    );
  }

  // ----- helpers -----
  const CategoryPill = ({ v }: { v: TestRow["category"] }) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold
      ${
        v === "achievement"
          ? "bg-amber-400/15 text-amber-300 border border-amber-300/30"
          : "bg-sky-400/15 text-sky-300 border border-sky-300/30"
      }`}
    >
      {v === "achievement" ? "🏅 Achievement" : "🎯 Fun"}
    </span>
  );

  const StatusPill = ({ active }: { active: boolean }) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold
        ${
          active
            ? "bg-emerald-400/15 text-emerald-300 border border-emerald-300/30"
            : "bg-red-400/15 text-red-300 border border-red-300/30"
        }`}
    >
      {active ? "● Active" : "○ Inactive"}
    </span>
  );

  // ------------------------------------------------------
  // FIXED FUNCTIONS (now inside component)
  // ------------------------------------------------------

  const archiveTest = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return alert("No token");
    if (!confirm("Archive this test? It will no longer appear to users.")) return;

    const res = await fetch(`http://localhost:4000/admin/tests/${id}/archive`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (res.ok) {
      alert("Archived successfully");
      setTests((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: false } : t)));
    } else alert(data.error || "Failed");
  };

  const restoreTest = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return alert("No token");
    if (!confirm("Restore this test to active status?")) return;

    const res = await fetch(`http://localhost:4000/admin/tests/${id}/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (res.ok) {
      alert("Restored successfully");
      setTests((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: true } : t)));
    } else alert(data.error || "Failed");
  };

  const deleteTest = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return alert("No token");
    if (!confirm("This will permanently delete the test and all related data. Are you 100% sure?"))
      return;

    const res = await fetch(`http://localhost:4000/admin/tests/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (res.ok) {
      alert("Deleted permanently");
      setTests((prev) => prev.filter((t) => t.id !== id));
    } else alert(data.error || "Failed");
  };

  // ------------------------------------------------------

  return (
    <>
      {/* FIXED BACKGROUND GRADIENT */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400" />

      <main className="min-h-screen text-white relative">
        {/* soft overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

        {/* top bar */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 grid place-items-center text-2xl">
              🧪
            </div>
            <div className="leading-tight">
              <p className="text-gray-200 text-sm">Admin</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-300 drop-shadow-md">
                Manage Tests
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/admin")}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition"
            >
              ← Admin Home
            </button>
            <button
              onClick={() => router.push("/admin/tests/create")}
              className="px-4 py-2 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition"
              title="Create a new test"
            >
              ➕ New Test
            </button>
          </div>
        </div>

        {/* ALL YOUR REMAINING CONTENT BELOW HERE */}
        {/* (I did not touch anything else in your page) */}

        {/* content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-10 mt-6">
          {/* Filters */}
          <motion.div
            {...fade}
            transition={{ duration: 0.3 }}
            className="rounded-2xl p-4 bg-white/10 border border-white/15 shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

              {/* search */}
              <div className="md:col-span-2">
                <label className="text-xs text-white/70">Search</label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Title, description, badge…"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 outline-none placeholder-white/50"
                />
              </div>

              {/* category */}
              <div>
                <label className="text-xs text-white/70">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 outline-none"
                >
                  <option className="bg-slate-900" value="all">All</option>
                  <option className="bg-slate-900" value="achievement">Achievement</option>
                  <option className="bg-slate-900" value="fun">Fun</option>
                </select>
              </div>

              

              {/* status */}
              <div>
                <label className="text-xs text-white/70">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 outline-none"
                >
                  <option className="bg-slate-900" value="all">All</option>
                  <option className="bg-slate-900" value="active">Active</option>
                  <option className="bg-slate-900" value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl bg-red-500/20 border border-red-400/40 px-4 py-3 text-sm">
              ❌ {error}
            </div>
          )}

          {/* Table/List */}
          <motion.div
            {...fade}
            transition={{ duration: 0.35 }}
            className="mt-6 rounded-2xl bg-white/10 border border-white/15 shadow-2xl overflow-hidden"
          >
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 text-s text-white/70 border-b border-white/10">
              <div className="col-span-4">Title</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Maximum score</div>
              <div className="col-span-1 text-center">Questions N</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {fetching ? (
              <div className="px-4 py-8 text-center text-white/80">Loading tests…</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/80">No tests found.</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {filtered.map((t) => (
                  <li key={t.id} className="px-4 py-4 hover:bg-white/5 transition">
                    {/* desktop row */}
                    <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                      {/* Title & Info */}
                      <div className="col-span-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl pt-0.5">
                            {t.category === "achievement" ? "🏅" : "🎯"}
                          </div>
                          <div>
                            <div className="font-semibold">{t.title}</div>
                            <div className="text-xs text-white/70 line-clamp-1">
                              {t.description || "No description"}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                          
                              {t.timeLimit && (
                                <span className="text-[11px] text-white/60">⏱ {t.timeLimit}s</span>
                              )}

                              {typeof t.maxScore === "number" && (
  <span className="text-[11px] text-amber-200">🏆 {t.maxScore}</span>
)}

                              {t.badge?.name && (
                                <span className="text-[11px] text-amber-300">🏵 {t.badge.name}</span>
                              )}
                            
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="col-span-2 flex justify-center">
                        <CategoryPill v={t.category} />

                         {/* Max score*/}
                      </div>
<div className="col-span-2 flex justify-center">
  {typeof t.maxScore === "number" ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border bg-white/20 text-amber-300 border-amber-300/30">
      🏆 {t.maxScore}
    </span>
  ) : (
    <span className="text-xs text-white/50">—</span>
  )}
</div>


                      {/* Questions Count */}
                      <div className="col-span-1 text-center">
                        <span className="text-sm text-white">❔</span>
                       <span className="text-sm">{t.questionsCount ?? 0}</span>


                      </div>

                      {/* Status */}
                      <div className="col-span-1 text-center">
                        <StatusPill active={t.isActive} />
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 text-right flex justify-end gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => router.push(`/admin/tests/${t.id}`)}
                          className={`px-2 py-1 rounded text-xs border border-white/15 ${
                            t.isActive
                              ? "bg-white/10 hover:bg-white/20"
                              : "bg-white/5 text-white/40 cursor-not-allowed"
                          }`}
                          disabled={!t.isActive}
                          title={t.isActive ? "Edit test" : "Cannot edit archived test"}
                        >
                          ✏️ Edit
                        </button>

                        {/* Preview */}
                        <button
                          onClick={() => router.push(`/admin/tests/preview/${t.id}`)}

                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs border border-white/15"
                          title="Preview as user"
                        >
                          👁 Prev.
                        </button>

                        {/* Archive / Restore / Delete */}
                        {t.isActive ? (
                          <button
                            onClick={() => archiveTest(t.id)}
                            className="px-2 py-1 rounded bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-300/40 text-xs"
                            title="Archive test"
                          >
                            📦 Archive
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => restoreTest(t.id)}
                              className="px-2 py-1 rounded bg-green-500/20 hover:bg-green-500/30 border border-green-300/40 text-xs"
                              title="Restore test"
                            >
                              🔄
                            </button>
                           

                          </>
                        )}
                      </div>
                    </div>

                    {/* mobile card */}
                    <div className="md:hidden">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">
                          {t.category === "achievement" ? "🏅" : "🎯"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">{t.title}</div>
                            <StatusPill active={t.isActive} />
                          </div>

                          <div className="text-xs text-white/70 mt-0.5 line-clamp-2">
                            {t.description || "No description"}
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2">
                            <CategoryPill v={t.category} />
                            <span className="text-[11px] text-white/70">
                              Q: {t.questionsCount ?? 0}

                            </span>

                            {typeof t.maxScore === "number" && (
  <span className="text-[11px] text-amber-200">🏆 {t.maxScore}</span>
)}

                            {t.badge?.name && (
                              <span className="text-[11px] text-amber-300">🏵 {t.badge.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>

        {/* ================= Archived Tests Section ================= */}
        <motion.div
          {...fade}
          transition={{ duration: 0.35 }}
          className="mt-10 rounded-2xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Toggle Header */}
          <div
            onClick={() => setShowArchived((prev) => !prev)}
            className="cursor-pointer px-4 py-3 flex items-center justify-between bg-white/10 hover:bg-white/15 transition"
          >
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              📦 Archived Tests{" "}
              <span className="text-xs text-white/60">
                ({tests.filter((t) => !t.isActive).length})
              </span>
            </div>
            <div className="text-white">{showArchived ? "▲ Hide" : "▼ Show"}</div>
          </div>

          {/* Archived List */}
          {showArchived && (
            <ul className="divide-y divide-white/10">
              {tests.filter((t) => !t.isActive).length === 0 ? (
                <div className="px-4 py-8 text-center text-white/60">
                  No archived tests.
                </div>
              ) : (
                tests
                  .filter((t) => !t.isActive)
                  .map((t) => (
                    <li key={t.id} className="px-4 py-4 hover:bg-white/5 transition">
                      <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl pt-0.5">
                              {t.category === "achievement" ? "🏅" : "🎯"}
                            </div>
                            <div>
                              <div className="font-semibold text-white line-clamp-1">
                                {t.title}
                              </div>
                              <div className="text-xs text-white/60 line-clamp-1">
                                {t.description || "No description"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <CategoryPill v={t.category} />
                        </div>
 <div className="col-span-2 text-center">
  <span className="text-sm">🏆{t.questionsCount ?? 0}</span>
</div>

                        

                        <div className="col-span-2 text-center">
                         <span className="text-sm">❔{t.questionsCount ?? 0}</span>

                        </div>

                        <div className="col-span-1 text-center">
                          <StatusPill active={t.isActive} />
                        </div>

                        <div className="col-span-1 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => restoreTest(t.id)}
                              className="px-2 py-1 rounded bg-green-500/20 hover:bg-green-500/30 border border-green-400/40 text-xs"
                            >
                              🔄 Restore
                            </button>
                            <button
                              onClick={() => deleteTest(t.id)}
                              className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-xs"
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
              )}
            </ul>
          )}
        </motion.div>
      </main>
    </>
  );
}
