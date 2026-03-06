"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

type TestInfoApi = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  category: "achievement" | "fun";
  timeLimit?: number | null;
  scoringType?: string | null;
  mode: "internal" | "external";
  externalUrl?: string | null;
};

type TestListRow = {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  category: "achievement" | "fun";
  difficulty: "bronze" | "silver" | "gold" | "legendary";
  timeLimit?: number | null;
  allowedAttempts?: number | null;
  cooldownDays?: number | null;
  isActive: boolean;
  icon?: string | null;
  badge?: { id: number; name: string; rarity: string } | null;

  questionsCount?: number | null;
  maxScore?: number | null;
};

type TestMerged = TestListRow & {
  mode: "internal" | "external";
  externalUrl?: string | null;
  scoringType?: string | null;
};

type Attempt = {
  id: number;
  testId: number;
  startedAt: string;
  finishedAt?: string | null;
  score?: number | null;
  correctCount?: number | null;
  totalCount?: number | null;
  passed?: boolean | null;
};

type Entitlements = {
  isPremium: boolean;
  premiumUntil: string | null;
  cooldownSkipTokens: number;
  tombolaDailyLimit: number;
};

const API = process.env.NEXT_PUBLIC_API_URL!;

const formatMinutes = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return "∞";
  return `${Math.ceil(seconds / 60)}m`;
};

const formatDifficulty = (d?: string) => {
  switch (d) {
    case "legendary":
      return "👑 Legendary";
    case "gold":
      return "🥇 Gold";
    case "silver":
      return "🥈 Silver";
    case "bronze":
      return "🥉 Bronze";
    default:
      return "—";
  }
};

export default function TestInfoPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<TestMerged | null>(null);
  const [others, setOthers] = useState<TestListRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ✅ ADDED: cooldown + entitlements state
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [bypassActive, setBypassActive] = useState<Record<number, boolean>>({});
  const [cooldownBypassed, setCooldownBypassed] = useState<Record<number, boolean>>({});
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [buyingPack, setBuyingPack] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  // ✅ ADDED: helpers (same endpoints as index page)
  const refreshAttempts = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const r = await fetch(`${API}/me/attempts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(d.attempts)) setAttempts(d.attempts);
      else setAttempts([]);
    } catch {
      setAttempts([]);
    }
  };

  const refreshCooldownOverrides = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const r = await fetch(`${API}/me/cooldown-overrides`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));

      if (r.ok && Array.isArray(d.activeTestIds)) {
        const map: Record<number, boolean> = {};
        for (const id of d.activeTestIds) map[Number(id)] = true;
        setBypassActive(map);
      } else {
        setBypassActive({});
      }
    } catch {
      setBypassActive({});
    }
  };

  const refreshEntitlements = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const r = await fetch(`${API}/me/entitlements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setEntitlements(d as Entitlements);
      else setEntitlements(null);
    } catch {
      setEntitlements(null);
    }
  };

  // ✅ ADDED: nice token pack purchase (same as index page)
  const createTokenPackPurchase = async (quantity = 5) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setBuyingPack(true);

      const checkout = await fetch(`${API}/payments/checkout/token-pack`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity }),
      });

      const cData = await checkout.json().catch(() => ({}));

      if (!checkout.ok) {
        showToast(cData?.error || "Failed to create token pack purchase");
        return;
      }

      showToast("🧾 Token pack purchase created (pending). Mark it PAID in /dev/payments.");
      setBuyModalOpen(false);

      // refresh entitlements after purchase is marked paid (optional)
      await refreshEntitlements();
    } finally {
      setBuyingPack(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!slug) return;

    (async () => {
      try {
        setLoading(true);

        // 1) Fetch info (mode/externalUrl/scoringType)
        const infoRes = await fetch(`${API}/tests/${slug}/info`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const infoData = await infoRes.json().catch(() => ({}));
        if (!infoRes.ok) throw new Error(infoData?.error || "Failed to load test info");

        const info: TestInfoApi = infoData.test;

        // 2) Fetch tests list (icon/questionsCount/maxScore/etc.)
        const listRes = await fetch(`${API}/tests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const listData = await listRes.json().catch(() => ({}));
        if (!listRes.ok) throw new Error(listData?.error || "Failed to load tests list");

        const list: TestListRow[] = Array.isArray(listData.tests) ? listData.tests : [];
        const fromList = list.find((t) => t.slug === slug);

        // Merge (prefer list fields for visuals/stats, prefer info for mode/external)
        const merged: TestMerged = {
          ...(fromList as any),
          id: info.id,
          slug: info.slug,
          title: fromList?.title ?? info.title,
          description: fromList?.description ?? info.description,
          category: fromList?.category ?? info.category,
          timeLimit: fromList?.timeLimit ?? info.timeLimit,
          mode: info.mode,
          externalUrl: info.externalUrl ?? undefined,
          scoringType: info.scoringType ?? undefined,
        };

        setTest(merged);

        // ✅ ADDED: load attempts + overrides + entitlements for cooldown logic
        await Promise.all([refreshAttempts(), refreshCooldownOverrides(), refreshEntitlements()]);

        // Pick 1–2 random alternatives (same category, active, not current)
        const candidates = list
          .filter((t) => t.slug !== slug)
          .filter((t) => t.isActive)
          .filter((t) => (merged.category ? t.category === merged.category : true));

        // Shuffle and pick 2
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        setOthers(shuffled.slice(0, 2));

        setError(null);
      } catch (e: any) {
        setError(e?.message || "Failed to load test info");
        setTest(null);
        setOthers([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, router]);

  // ✅ ADDED: cooldown computation helpers (same logic as index page)
  const lastFinishedAttemptFor = (testId: number): Attempt | undefined => {
    const mine = attempts.filter((a) => a.testId === testId && a.finishedAt);
    if (mine.length === 0) return undefined;
    return [...mine].sort((a, b) => {
      const at = new Date(a.finishedAt!).getTime();
      const bt = new Date(b.finishedAt!).getTime();
      return bt - at;
    })[0];
  };

  const cooldownRemainingDays = (t: TestMerged): number => {
    if (bypassActive[t.id]) return 0;
    if (cooldownBypassed[t.id]) return 0;

    if (!t.cooldownDays || t.cooldownDays <= 0) return 0;

    const last = lastFinishedAttemptFor(t.id);
    if (!last?.finishedAt) return 0;

    const finished = new Date(last.finishedAt).getTime();
    const now = Date.now();
    const diffDays = Math.floor((now - finished) / (1000 * 60 * 60 * 24));
    const remain = (t.cooldownDays ?? 0) - diffDays;
    return remain > 0 ? remain : 0;
  };

  const startHref = useMemo(() => {
    if (!test) return "/tests";
    if (test.mode === "external") return `/tests/${test.slug}/external`;
    return `/tests/${test.slug}`;
  }, [test]);

  // ✅ ADDED: start handler that blocks on cooldown and optionally offers tokens
  const handleStartFromInfo = async () => {
    if (!test) return;

    const token = localStorage.getItem("token");
    if (!token) return router.replace("/login");

    const remainDays = cooldownRemainingDays(test);
    const bypassNow = !!bypassActive[test.id] || !!cooldownBypassed[test.id];
    const isCooldownActive = remainDays > 0 && !bypassNow;

    // block starting here
    if (isCooldownActive) {
      showToast(`❄️ On cooldown — ${remainDays} day(s) remaining.`);
      // if no tokens, open buy modal; if tokens, user can tap Accelerate
      const tokenCount = entitlements?.cooldownSkipTokens ?? 0;
      if (tokenCount <= 0) setBuyModalOpen(true);
      return;
    }

    // server-truth start
    try {
      const res = await fetch(`${API}/tests/${test.slug}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.error === "Test on cooldown" && data?.nextAttemptAt) {
          const d = new Date(data.nextAttemptAt);
          showToast(`Retake available on ${d.toLocaleString()}`);
        } else {
          showToast(data?.error || "Failed to start test");
        }
        return;
      }

      await Promise.all([refreshAttempts(), refreshCooldownOverrides(), refreshEntitlements()]);

      router.push(test.mode === "external" ? `/tests/${test.slug}/external` : `/tests/${test.slug}`);
    } catch {
      showToast("Network error starting test");
    }
  };

  // ✅ ADDED: skip cooldown handler (tokens / modal gate)
  const handleSkipCooldownFromInfo = async () => {
    if (!test) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const remainDays = cooldownRemainingDays(test);
    const bypassNow = !!bypassActive[test.id] || !!cooldownBypassed[test.id];
    const isCooldownActive = remainDays > 0 && !bypassNow;

    if (!isCooldownActive) return;

    const tokenCount = entitlements?.cooldownSkipTokens ?? 0;
    if (tokenCount <= 0) {
      setBuyModalOpen(true);
      return;
    }

    try {
      setSkipping(true);

      const res = await fetch(`${API}/tests/${test.slug}/skip-cooldown`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || "Failed to skip cooldown");
        return;
      }

      setCooldownBypassed((prev) => ({ ...prev, [test.id]: true }));

      await Promise.all([refreshAttempts(), refreshCooldownOverrides(), refreshEntitlements()]);

      showToast("✅ Cooldown removed (1 token used). You can retake now.");
    } finally {
      setSkipping(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center text-white bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400">
        <div className="text-center">
          <div className="text-2xl font-extrabold animate-pulse">Loading Test…</div>
          <div className="mt-2 text-white/70 text-sm">Preparing your challenge</div>
        </div>
      </main>
    );
  }

  if (error || !test) {
    return (
      <main className="min-h-screen grid place-items-center text-white bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="rounded-2xl bg-black/30 border border-white/15 p-5 shadow-2xl">
            <div className="text-red-200 font-semibold">❌ {error || "Test not found"}</div>
            <button
              onClick={() => router.push("/tests")}
              className="mt-4 w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition font-semibold"
            >
              ← Back to Tests
            </button>
          </div>
        </div>
      </main>
    );
  }

  const timeLabel = formatMinutes(test.timeLimit);
  const questionsLabel = typeof test.questionsCount === "number" ? `${test.questionsCount}` : "—";
  const maxScoreLabel = typeof test.maxScore === "number" ? `${test.maxScore}` : "—";
  const cooldownLabel = test.cooldownDays && test.cooldownDays > 0 ? `${test.cooldownDays}d` : "—";

  // ✅ ADDED: derived cooldown display for THIS test
  const remainDays = cooldownRemainingDays(test);
  const bypassNow = !!bypassActive[test.id] || !!cooldownBypassed[test.id];
  const isCooldownActive = remainDays > 0 && !bypassNow;
  const tokenCount = entitlements?.cooldownSkipTokens ?? 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white relative">
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 py-10">
        {/* Top back row */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={() => router.push("/tests")}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition font-semibold"
          >
            ← Back
          </button>

          <div className="text-xs text-white/70">
            {test.category === "achievement" ? "🏅 Achievement" : "🎯 Fun"} •{" "}
            {test.scoringType ? `Scoring: ${test.scoringType}` : "Scoring: —"}
          </div>
        </div>

        {/* Main hero card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl bg-white/10 border border-white/15 shadow-2xl overflow-hidden"
        >
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 md:items-center">
              <div className="flex items-center gap-4">
                <img
  src={test.icon ? `${API}${test.icon}` : "/placeholder.png"}
                  alt={test.title}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border border-white/20 object-cover bg-white/10"
                  onError={(e) => ((e.currentTarget.src = "/placeholder.png"))}
                />
                <div className="md:hidden">
                  <div className="text-2xl font-extrabold text-amber-300 drop-shadow">
                    {test.title}
                  </div>
                  <div className="text-white/80 text-sm mt-1">
                    {test.description || "No description available."}
                  </div>
                </div>
              </div>

              <div className="hidden md:block flex-1">
                <div className="text-3xl font-extrabold text-amber-300 drop-shadow">
                  {test.title}
                </div>
                <div className="text-white/80 mt-2 max-w-2xl">
                  {test.description || "No description available."}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">
                    {formatDifficulty(test.difficulty)}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">
                    {test.mode === "external" ? "🌐 External" : "🧠 Internal"}
                  </span>
                  {test.badge?.name ? (
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-amber-200">
                      🏵 {test.badge.name}
                    </span>
                  ) : null}

                  {/* ✅ ADDED: cooldown chip */}
                  {isCooldownActive ? (
                    <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-100">
                      ❄️ Cooldown: {remainDays}d
                    </span>
                  ) : null}
                </div>
              </div>

              {/* CTAs */}
             <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto md:items-stretch md:min-w-[220px]">

                {/* ✅ CHANGED: Start now uses cooldown-aware handler */}
                <button
                  onClick={handleStartFromInfo}
                  className={`flex-1 md:flex-none px-5 py-3 rounded-2xl font-extrabold transition shadow-lg border
                    ${
                      isCooldownActive
                        ? "bg-white/10 border-white/20 text-white/60 cursor-not-allowed"
                        : "bg-amber-400 text-gray-900 hover:bg-amber-300 border-amber-200/60"
                    }`}
                >
                  🚀 {isCooldownActive ? `Cooldown (${remainDays}d)` : "Start Test"}
                </button>

                {/* ✅ ADDED: Accelerate/buy button shown only when cooldown is active */}
                {isCooldownActive ? (
                  <button
                    onClick={handleSkipCooldownFromInfo}
                    disabled={skipping}
                    className={`flex-1 md:flex-none px-5 py-3 rounded-2xl font-extrabold border transition
                      ${
                        tokenCount > 0
                          ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/30"
                          : "bg-yellow-400/20 border-yellow-300/40 text-yellow-200 hover:bg-yellow-400/30"
                      }`}
                    title={tokenCount > 0 ? "Consumes one cooldown token 🔶" : "Buy cooldown tokens"}
                  >
                    {skipping
                      ? "Processing…"
                      : tokenCount > 0
                        ? `⚡ Accelerate (use 1 token) • 🔶 ${tokenCount}`
                        : "🔶 Buy tokens to accelerate"}
                  </button>
                ) : (
                  <button
                    onClick={() => router.push("/tests")}
                    className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 transition font-semibold"
                  >
                    Browse more
                  </button>
                )}

                {/* keep Browse more when cooldown active too (so user still has it) */}
                {isCooldownActive ? (
                  <button
                    onClick={() => router.push("/tests")}
                    className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 transition font-semibold"
                  >
                    Browse more
                  </button>
                ) : null}
              </div>
            </div>

            {/* Stats tiles */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                <div className="text-xs text-white/70">Time</div>
                <div className="mt-1 text-lg font-extrabold">⏱ {timeLabel}</div>
              </div>

              <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                <div className="text-xs text-white/70">Questions</div>
                <div className="mt-1 text-lg font-extrabold">❓ {questionsLabel}</div>
              </div>

              <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                <div className="text-xs text-white/70">Max score</div>
                <div className="mt-1 text-lg font-extrabold">🏆 {maxScoreLabel}</div>
              </div>

              <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                <div className="text-xs text-white/70">Cooldown</div>
                <div className="mt-1 text-lg font-extrabold">
                  ❄️ {cooldownLabel}
                  {isCooldownActive ? (
                    <span className="ml-2 text-sm text-red-100/90">({remainDays})</span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Try instead */}
        {others.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg md:text-xl font-extrabold">✨ Try instead</h2>
              <button
                onClick={() => router.push("/tests")}
                className="text-xs text-white/70 hover:text-white transition"
              >
                See all →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {others.map((o) => {
                const oTime = formatMinutes(o.timeLimit);
                const oQ = typeof o.questionsCount === "number" ? o.questionsCount : null;
                const oMax = typeof o.maxScore === "number" ? o.maxScore : null;

                return (
                  <div
                    key={o.slug}
                    className="rounded-2xl bg-white/10 border border-white/15 shadow-lg p-4 flex gap-4"
                  >
                    <img
  src={o.icon ? `${API}${o.icon}` : "/placeholder.png"}
                      alt={o.title}
                      className="w-14 h-14 rounded-xl border border-white/20 object-cover bg-white/10"
                      onError={(e) => ((e.currentTarget.src = "/placeholder.png"))}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold line-clamp-1">{o.title}</div>
                      <div className="text-xs text-white/70 line-clamp-2 mt-1">
                        {o.description || "—"}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/80">
                        <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20">
                          ⏱ {oTime}
                        </span>
                        {oQ !== null ? (
                          <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20">
                            ❓ {oQ} Q
                          </span>
                        ) : null}
                        {oMax !== null ? (
                          <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20">
                            🏆 {oMax}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => router.push(`/tests/${o.slug}/info`)}
                        className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition text-sm font-semibold"
                      >
                        Info
                      </button>
                      <button
                        onClick={() => router.push(`/tests/${o.slug}`)}
                        className="px-3 py-2 rounded-xl bg-amber-400 text-gray-900 hover:bg-amber-300 transition text-sm font-extrabold border border-amber-200/60"
                      >
                        Start
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* ✅ ADDED: Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-black/70 border border-white/20 text-white text-sm shadow-2xl">
          {toast}
        </div>
      )}

      {/* ✅ ADDED: Buy modal (same UI as your index page, but controlled by buyModalOpen) */}
      {buyModalOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-yellow-200/40 bg-gradient-to-br from-yellow-200 via-amber-200 to-yellow-100 text-gray-900 shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden">
            {/* header */}
            <div className="px-5 pt-5 pb-4 relative">
              <button
                onClick={() => setBuyModalOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/10 hover:bg-black/15 border border-black/10 grid place-items-center transition"
                aria-label="Close"
              >
                ✕
              </button>

              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/60 border border-white/70 grid place-items-center shadow-sm">
                  🔶
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-extrabold tracking-tight">Boost your cooldown ⚡</h3>
                  <p className="text-sm text-gray-800/80 mt-1">
                    You’re out of tokens. Grab a pack and retake tests instantly.
                  </p>
                </div>
              </div>
            </div>

            {/* deal card */}
            <div className="px-5 pb-5">
              <div className="rounded-2xl bg-white/60 border border-white/70 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-700">Cooldown Token Pack</div>
                    <div className="text-2xl font-extrabold mt-0.5">5 tokens</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm line-through text-gray-600/70">$9.99</span>
                      <span className="text-2xl font-extrabold text-emerald-700">$4.99</span>
                      <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-sm">
                        -50% DEAL
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-gradient-to-br from-emerald-200 to-emerald-100 border border-emerald-300/60 px-3 py-2 text-center shadow-sm">
                    <div className="text-[11px] font-semibold text-emerald-800/80">Best value</div>
                    <div className="text-lg font-extrabold text-emerald-800">$0.99</div>
                    <div className="text-[11px] font-semibold text-emerald-800/80">per token</div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-700/80">
                  Dev mode: purchase will be created as <span className="font-semibold">pending</span>{" "}
                  and you’ll mark it <span className="font-semibold">PAID</span> in{" "}
                  <span className="font-semibold">/dev/payments</span>.
                </div>
              </div>

              {/* actions */}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => createTokenPackPurchase(5)}
                  disabled={buyingPack}
                  className="w-full py-3.5 rounded-2xl text-base font-extrabold tracking-tight
                    bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-600
                    text-white shadow-lg border border-emerald-300/40
                    hover:brightness-110 active:scale-[0.99] transition"
                >
                  {buyingPack ? "Processing…" : "Buy 5 tokens — $4.99"}
                </button>

                <button
                  onClick={() => setBuyModalOpen(false)}
                  disabled={buyingPack}
                  className="w-full py-2.5 rounded-2xl text-sm font-semibold
                    bg-black/10 hover:bg-black/15 border border-black/10 transition"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
