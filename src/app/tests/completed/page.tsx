"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL!;

type CompletedStats = {
  passedCount: number;
  attemptsCount: number;
  bestScore: number | null;
  avgScore: number | null;
};

type PassedItem = {
  passedAt: string;
  test: {
    id: number;
    slug: string | null;
    title: string;
    icon?: string | null;
    category: string;
    difficulty: string;
    createdAt: string;
  };
};

type BestAttempt = {
  testId: number;
  score: number | null;
  correctCount: number | null;
  totalCount: number | null;
  finishedAt: string | null;
  test: {
    id: number;
    slug: string | null;
    title: string;
    icon?: string | null;
    category: string;
    difficulty: string;
  };
};

export default function CompletedTestsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<CompletedStats | null>(null);
  const [passed, setPassed] = useState<PassedItem[]>([]);
  const [bestAttempts, setBestAttempts] = useState<BestAttempt[]>([]);

  const [tab, setTab] = useState<"history" | "best">("history");

  // Client-only "show more" (renders in chunks, without touching backend)
  const PAGE_SIZE = 10;
  const [visibleHistory, setVisibleHistory] = useState(PAGE_SIZE);
  const [visibleBest, setVisibleBest] = useState(PAGE_SIZE);

  const fade = useMemo(
    () => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }),
    []
  );

  const fmtPct = (n: number | null) => {
    if (n === null || Number.isNaN(n)) return "—";
    return `${Math.round(n)}%`;
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleString();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        setLoading(true);

        const r = await fetch(`${API}/me/tests/completed`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || "Failed to load completed tests");

        setStats(data.stats || null);
        setPassed(Array.isArray(data.passed) ? data.passed : []);
        setBestAttempts(Array.isArray(data.bestAttempts) ? data.bestAttempts : []);

        // Reset visible counts on fresh load
        setVisibleHistory(PAGE_SIZE);
        setVisibleBest(PAGE_SIZE);

        setError(null);
      } catch (e: any) {
        setError(e?.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Keep best list nice: achievements first, then score desc
  const bestSorted = useMemo(() => {
    const arr = [...bestAttempts];
    arr.sort((a, b) => {
      const ac = a.test?.category === "achievement";
      const bc = b.test?.category === "achievement";
      if (ac !== bc) return ac ? -1 : 1;

      const as = typeof a.score === "number" ? a.score : -1;
      const bs = typeof b.score === "number" ? b.score : -1;
      if (as !== bs) return bs - as;

      const at = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
      const bt = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
      return bt - at;
    });
    return arr;
  }, [bestAttempts]);

  // Combine passed tests + fun test attempts into one history list
const historyCombined = useMemo(() => {
  // Convert fun best attempts into history-like items
  const funAsHistory = bestAttempts
    .filter((a) => a.test?.category === "fun")
    .map((a) => ({
      passedAt: a.finishedAt || new Date().toISOString(),
      test: {
        ...a.test,
      },
      isFun: true,
    }));

  // Mark real passed items
  const passedWithFlag = passed.map((p) => ({
    ...p,
    isFun: false,
  }));

  const combined = [...passedWithFlag, ...funAsHistory];

  // Sort newest first
  combined.sort(
    (a, b) =>
      new Date(b.passedAt).getTime() -
      new Date(a.passedAt).getTime()
  );

  return combined;
}, [passed, bestAttempts]);

  // Derived visible lists
const visiblePassed = useMemo(
  () => historyCombined.slice(0, visibleHistory),
  [historyCombined, visibleHistory]
);
  const visibleBestList = useMemo(
    () => bestSorted.slice(0, visibleBest),
    [bestSorted, visibleBest]
  );

  const historyHasMore = visibleHistory < historyCombined.length;
  const bestHasMore = visibleBest < bestSorted.length;

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white">
        <div className="text-center px-4">
          <div className="animate-pulse text-xl md:text-2xl font-bold">
            Loading Completed Tests…
          </div>
          <div className="mt-2 text-white/80 text-sm">Please wait</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white relative">
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-6 md:pt-8 pb-4 border-b border-white/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
          <div
            onClick={() => router.push("/tests")}
            className="cursor-pointer text-center md:text-left w-full md:w-auto"
          >
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight flex items-center justify-center md:justify-start gap-2">
              <span>🏅</span>
              <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                My Completed Tests
              </span>
            </h1>
            <p className="text-xs text-white/70 mt-1 font-medium">
              Progress recap + best scores
            </p>
          </div>

          <button
            onClick={() => router.push("/tests")}
            className="w-full md:w-auto px-5 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold transition"
          >
            ← Back to Tests
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/20 border border-red-400/40 px-4 py-3 text-sm">
            ❌ {error}
          </div>
        )}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pb-20 md:pb-24 mt-5 md:mt-6">
        {/* Stats cards */}
        <motion.div
          {...fade}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        >
          <div className="rounded-2xl p-3 md:p-4 bg-white/10 border border-white/15 shadow-xl">
            <div className="text-[11px] md:text-xs text-white/70">Passed</div>
            <div className="mt-1 text-xl md:text-2xl font-extrabold text-amber-300">
              {stats?.passedCount ?? 0}
            </div>
          </div>

          <div className="rounded-2xl p-3 md:p-4 bg-white/10 border border-white/15 shadow-xl">
            <div className="text-[11px] md:text-xs text-white/70">Attempts</div>
            <div className="mt-1 text-xl md:text-2xl font-extrabold">
              {stats?.attemptsCount ?? 0}
            </div>
          </div>

          <div className="rounded-2xl p-3 md:p-4 bg-white/10 border border-white/15 shadow-xl">
            <div className="text-[11px] md:text-xs text-white/70">Best score</div>
            <div className="mt-1 text-xl md:text-2xl font-extrabold text-emerald-300">
              {fmtPct(stats?.bestScore ?? null)}
            </div>
          </div>

          <div className="rounded-2xl p-3 md:p-4 bg-white/10 border border-white/15 shadow-xl">
            <div className="text-[11px] md:text-xs text-white/70">Average score</div>
            <div className="mt-1 text-xl md:text-2xl font-extrabold text-sky-300">
              {fmtPct(stats?.avgScore ?? null)}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mt-5 md:mt-6 flex items-center gap-2 overflow-x-auto -mx-1 px-1">
          <button
            onClick={() => setTab("history")}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition
              ${
                tab === "history"
                  ? "bg-white/20 border-white/30"
                  : "bg-white/10 border-white/15 hover:bg-white/15"
              }`}
          >
            🗓 History
          </button>
          <button
            onClick={() => setTab("best")}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition
              ${
                tab === "best"
                  ? "bg-white/20 border-white/30"
                  : "bg-white/10 border-white/15 hover:bg-white/15"
              }`}
          >
            🏆 Best Scores
          </button>
        </div>

        {/* Content */}
        <motion.section
          {...fade}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mt-4 rounded-2xl p-4 md:p-5 bg-white/10 border border-white/15 shadow-2xl"
        >
          {tab === "history" ? (
            historyCombined.length === 0 ? (
              <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl p-4">
                No passed tests yet. Go crush some achievements 👑
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-xs text-white/70">
                    Showing <span className="font-semibold text-white">{Math.min(visibleHistory, historyCombined.length)}</span>{" "}
                    of <span className="font-semibold text-white"> {historyCombined.length}</span>
                  </div>
                  {(historyHasMore || visibleHistory > PAGE_SIZE) && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {visibleHistory > PAGE_SIZE && (
                        <button
                          onClick={() => setVisibleHistory(PAGE_SIZE)}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20 transition"
                        >
                          Show less
                        </button>
                      )}
                      {historyHasMore && (
                        <button
                          onClick={() =>
                            setVisibleHistory((v) => Math.min(v + PAGE_SIZE, passed.length))
                          }
                          className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white/20 border border-white/30 hover:bg-white/30 transition"
                        >
                          Show more (+{PAGE_SIZE})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {visiblePassed.map((p, idx) => (
                    <div
                      key={`${p.test.id}-${idx}`}
                      className="rounded-2xl p-3 md:p-4 bg-white/10 border border-white/15 shadow-lg hover:bg-white/15 transition"
                    >
                      <div className="flex items-start gap-3">
                        <img
  src={p.test.icon ? `${API}${p.test.icon}` : "/placeholder.png"}
                          alt={p.test.title}
                          className="w-11 h-11 md:w-12 md:h-12 rounded-lg object-cover border border-white/20 bg-white/10"
                          onError={(e) => ((e.currentTarget.src = "/placeholder.png"))}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold leading-tight break-words">
                            {p.test.title}
                          </div>
                          <div className="mt-1 text-xs text-white/70">
                            ✅ Passed: {fmtDate(p.passedAt)}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/70">
                            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20">
                              {p.isFun ? "🎯 fun attempt" : "🏅 achievement"}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20">
                              {p.test.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/tests/${p.test.slug}/info`)}
                          className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20 transition"
                        >
                          Info
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {(historyHasMore || visibleHistory > PAGE_SIZE) && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 w-full sm:justify-end">
                    {visibleHistory > PAGE_SIZE && (
                      <button
                        onClick={() => setVisibleHistory(PAGE_SIZE)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20 transition"
                      >
                        Show less
                      </button>
                    )}
                    {historyHasMore && (
                      <button
                        onClick={() =>
                          setVisibleHistory((v) => Math.min(v + PAGE_SIZE, passed.length))
                        }
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white/20 border border-white/30 hover:bg-white/30 transition"
                      >
                        Show more (+{PAGE_SIZE})
                      </button>
                    )}
                  </div>
                )}
              </>
            )
          ) : bestSorted.length === 0 ? (
            <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl p-4">
              No attempts yet.
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs text-white/70">
                  Showing <span className="font-semibold text-white">{Math.min(visibleBest, bestSorted.length)}</span>{" "}
                  of <span className="font-semibold text-white">{bestSorted.length}</span>
                </div>
                {(bestHasMore || visibleBest > PAGE_SIZE) && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {visibleBest > PAGE_SIZE && (
                      <button
                        onClick={() => setVisibleBest(PAGE_SIZE)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20 transition"
                      >
                        Show less
                      </button>
                    )}
                    {bestHasMore && (
                      <button
                        onClick={() =>
                          setVisibleBest((v) => Math.min(v + PAGE_SIZE, bestSorted.length))
                        }
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white/20 border border-white/30 hover:bg-white/30 transition"
                      >
                        Show more (+{PAGE_SIZE})
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {visibleBestList.map((a) => {
                  const pct = typeof a.score === "number" ? Math.round(a.score) : null;
                  const ratio =
                    typeof a.correctCount === "number" && typeof a.totalCount === "number"
                      ? `${a.correctCount}/${a.totalCount}`
                      : null;

                  return (
                    <div
                      key={a.testId}
                      className="rounded-2xl p-3 md:p-4 bg-white/10 border border-white/15 shadow-lg hover:bg-white/15 transition"
                    >
                      <div className="flex items-start gap-3">
                        <img
  src={a.test.icon ? `${API}${a.test.icon}` : "/placeholder.png"}
                          alt={a.test.title}
                          className="w-11 h-11 md:w-12 md:h-12 rounded-lg object-cover border border-white/20 bg-white/10"
                          onError={(e) => ((e.currentTarget.src = "/placeholder.png"))}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold leading-tight break-words">
                            {a.test.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-lg md:text-xl font-extrabold text-emerald-300">
                              {pct === null ? "—" : `${pct}%`}
                            </span>
                            {ratio ? (
                              <span className="text-xs text-white/70">({ratio})</span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-white/70">
                            {a.finishedAt ? `📅 ${fmtDate(a.finishedAt)}` : null}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/70">
                            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20">
                              {a.test.category === "achievement" ? "🏅 achievement" : "🎯 fun"}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20">
                              {a.test.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/tests/${a.test.slug}/info`)}
                          className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20 transition"
                        >
                          Info
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(bestHasMore || visibleBest > PAGE_SIZE) && (
                <div className="mt-4 flex flex-col sm:flex-row gap-2 w-full sm:justify-end">
                  {visibleBest > PAGE_SIZE && (
                    <button
                      onClick={() => setVisibleBest(PAGE_SIZE)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20 transition"
                    >
                      Show less
                    </button>
                  )}
                  {bestHasMore && (
                    <button
                      onClick={() =>
                        setVisibleBest((v) => Math.min(v + PAGE_SIZE, bestSorted.length))
                      }
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white/20 border border-white/30 hover:bg-white/30 transition"
                    >
                      Show more (+{PAGE_SIZE})
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </motion.section>
      </div>
    </main>
  );
}
