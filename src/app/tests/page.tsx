"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { startStripeCheckout } from "@/lib/startStripeCheckout";


/**
 * Tests (User)
 *
 * Endpoints used:
 *   GET  /profile
 *   GET  /tests
 *   GET  /me/attempts
 *   GET  /me/cooldown-overrides
 *   GET  /me/entitlements
 *   POST /tests/:slug/start
 *   POST /tests/:slug/skip-cooldown
 *   POST /payments/checkout/token-pack
 */

type TestRow = {
  id: number;
  mode: "internal" | "external";
  externalUrl?: string | null;
  slug: string;
  title: string;
  description?: string | null;
  category: "achievement" | "fun";
  type: "multiple_choice" | "image_choice" | "video" | "open_input";
  timeLimit?: number | null; // seconds
  allowedAttempts?: number | null; // null = unlimited
  cooldownDays?: number | null; // e.g. 90
  difficulty: "bronze" | "silver" | "gold" | "legendary";
  isActive: boolean;
  createdAt: string;
  badge?: { id: number; name: string; rarity: string } | null;
  icon?: string;
  questionsCount?: number | null;
  maxScore?: number | null;
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

type Profile = {
  id: number;
  name: string;
  avatar?: string | null;
};

type Entitlements = {
  isPremium: boolean;
  premiumUntil: string | null;
  cooldownSkipTokens: number;
  tombolaDailyLimit: number;
};

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function TestsIndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const [tests, setTests] = useState<TestRow[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [initialOrderById, setInitialOrderById] = useState<Record<number, number>>({});


  const [skippingSlug, setSkippingSlug] = useState<string | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  const [cooldownBypassed, setCooldownBypassed] = useState<Record<number, boolean>>({});
  const [bypassActive, setBypassActive] = useState<Record<number, boolean>>({});

  // MOBILE STATES
  const [mobileCategory, setMobileCategory] = useState<"fun" | "achievement">("fun");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const [mobileLimit, setMobileLimit] = useState(10);
  const [mobileFlipped, setMobileFlipped] = useState<Record<string, boolean>>({});

  // ✅ NEW: nice modal for buying token pack (instead of window.confirm)
  const [buyModalTest, setBuyModalTest] = useState<TestRow | null>(null);
  const [buyingPack, setBuyingPack] = useState(false);

  const [showRules, setShowRules] = useState(false);

  const fade = useMemo(
    () => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }),
    []
  );

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  // ✅ NEW helper: creates pending purchase for token pack
  const createTokenPackPurchase = async (quantity = 5) => {
  if (buyingPack) return;

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

    } finally {
      setBuyingPack(false);
    }
  };

  // ------------------------------
  // Fetch helpers
  // ------------------------------
  const refreshAttempts = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const a = await fetch(`${API}/me/attempts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const aData = await a.json().catch(() => ({}));
      if (a.ok && Array.isArray(aData.attempts)) setAttempts(aData.attempts);
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
      const data = await r.json().catch(() => ({}));

      if (r.ok && Array.isArray(data.activeTestIds)) {
        const map: Record<number, boolean> = {};
        for (const id of data.activeTestIds) map[Number(id)] = true;
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
      const data = await r.json().catch(() => ({}));
      if (r.ok) setEntitlements(data as Entitlements);
      else setEntitlements(null);
    } catch {
      setEntitlements(null);
    }
  };

  // ------------------------------
  // Initial load
  // ------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const p = await fetch(`${API}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pData = await p.json().catch(() => ({}));
        if (!p.ok || !pData?.user) throw new Error("Profile fetch failed");
      

        const t = await fetch(`${API}/tests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tData = await t.json().catch(() => ({}));
        if (!t.ok) throw new Error(tData?.error || "Failed to load tests");
        const loadedTests: TestRow[] = Array.isArray(tData.tests) ? (tData.tests as TestRow[]) : [];

setTests(loadedTests);

setInitialOrderById((prev) => {
  // if already set, keep it
  if (Object.keys(prev).length > 0) return prev;

  const order: Record<number, number> = {};
  loadedTests.forEach((t, idx) => (order[t.id] = idx));
  return order;
});



        await Promise.all([refreshAttempts(), refreshCooldownOverrides(), refreshEntitlements()]);
        setFetchError(null);
      } catch (e: any) {
        setFetchError(e?.message || "Failed to load tests.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ------------------------------
  // Attempts helpers
  // ------------------------------
  const attemptsFor = (testId: number) => attempts.filter((a) => a.testId === testId);

  const lastAttemptFor = (testId: number): Attempt | undefined => {
    const mine = attemptsFor(testId);
    if (mine.length === 0) return undefined;
    return [...mine].sort((a, b) => {
      const at = new Date(a.finishedAt || a.startedAt).getTime();
      const bt = new Date(b.finishedAt || b.startedAt).getTime();
      return bt - at;
    })[0];
  };

  const lastFinishedAttemptFor = (testId: number): Attempt | undefined => {
    const mine = attemptsFor(testId).filter((a) => a.finishedAt);
    if (mine.length === 0) return undefined;
    return [...mine].sort((a, b) => {
      const at = new Date(a.finishedAt!).getTime();
      const bt = new Date(b.finishedAt!).getTime();
      return bt - at;
    })[0];
  };

  // ------------------------------
  // Cooldown + passed
  // ------------------------------
  const isLocked = (t: TestRow): boolean => !t.isActive;
  const isStartDisabled = (t: TestRow): boolean => isLocked(t);

  const cooldownRemainingDays = (t: TestRow): number => {
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

  const passedBefore = (t: TestRow): boolean => {
    if (t.category !== "achievement") return false;
    const last = lastFinishedAttemptFor(t.id);
    return !!last?.passed;
  };

  // ------------------------------
  // Display helpers
  // ------------------------------
  const formatTimeLimit = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return null;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  };

  // ------------------------------
  // Sorting (stable, non-mutating)
  // ------------------------------
 const sortForDisplay = (arr: TestRow[]) => {
  return [...arr].sort((a, b) => {
    const ai = initialOrderById[a.id] ?? Number.MAX_SAFE_INTEGER;
    const bi = initialOrderById[b.id] ?? Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
};

  const achievements = useMemo(
    () => sortForDisplay(tests.filter((t) => t.category === "achievement")),
  [tests, initialOrderById]

  );

const funTests = useMemo(
  () => sortForDisplay(tests.filter((t) => t.category === "fun")),
  [tests, initialOrderById]
);


  // ------------------------------
  // Actions
  // ------------------------------
  const handleStart = async (t: TestRow) => {
    if (isLocked(t)) return;

    const token = localStorage.getItem("token");
    if (!token) return router.replace("/login");

    try {
      const res = await fetch(`${API}/tests/${t.slug}/start`, {
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

      if (t.mode === "external") router.push(`/tests/${t.slug}/external`);
      else router.push(`/tests/${t.slug}`);
    } catch {
      showToast("Network error starting test");
    }
  };

  const handleInfo = (t: TestRow) => {
    router.push(`/tests/${t.slug}/info`);
  };

  const handleSkipCooldown = async (t: TestRow) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const remain = cooldownRemainingDays(t);
    if (remain <= 0) return;

    const tokens = entitlements?.cooldownSkipTokens ?? 0;

    try {
      setSkippingSlug(t.slug);

      // ✅ No tokens -> open the nice in-app modal (no browser confirm)
      if (tokens <= 0) {
        setBuyModalTest(t);
        return;
      }

      const res = await fetch(`${API}/tests/${t.slug}/skip-cooldown`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || "Failed to skip cooldown");
        return;
      }

      setCooldownBypassed((prev) => ({ ...prev, [t.id]: true }));

      await Promise.all([refreshAttempts(), refreshCooldownOverrides(), refreshEntitlements()]);

      showToast("✅ Cooldown removed (1 token used). You can retake now.");
    } finally {
      setSkippingSlug(null);
    }
  };

  // ------------------------------
  // MOBILE LAYOUT LOGIC
  // ------------------------------
  const tokenCount = entitlements?.cooldownSkipTokens ?? 0;

  const filteredMobileTests = (mobileCategory === "fun" ? funTests : achievements).filter((t) =>
    t.title.toLowerCase().includes(mobileSearch.toLowerCase())
  );

  const mobileShownTests = filteredMobileTests.slice(0, mobileLimit);

  const toggleFlip = (slug: string) => {
    setMobileFlipped((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  // ------------------------------
  // Render
  // ------------------------------
  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white">
        <div className="text-center">
          <div className="animate-pulse text-2xl font-bold">Loading Tests…</div>
          <div className="mt-2 text-white/80 text-sm">Please wait</div>
        </div>
      </main>
    );
  }

  // ------------------------------
  // MOBILE ONLY VIEW
  // ------------------------------
  const MobileView = (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white relative lg:hidden">
      <div className="w-full max-w-full overflow-x-hidden">

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 pb-2 border-b border-white/10">
        {fetchError && (
  <div className="mt-3 rounded-xl bg-red-500/20 border border-red-400/40 px-4 py-3 text-sm">
    ❌ {fetchError}
  </div>
)}
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center">
            <div
              onClick={() => router.push("/dashboard")}
              className="cursor-pointer text-left"
            >
              <h1 className="text-3xl font-extrabold text-amber-400 tracking-tight flex items-center gap-2">
                <span>👑</span>
                <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  Networ.King
                </span>
              </h1>
              <p className="text-xs mb-2 ml-6 text-white/70 mt-1 font-medium justify-center text-center">   Grow your legacy</p>
            </div>

            
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (tokenCount <= 0 && tests.length > 0) {
                  setBuyModalTest(tests[0]);
                }
              }}
              title={tokenCount > 0 ? "You have cooldown tokens" : "Buy cooldown tokens"}
              className={`flex-1 px-3 py-2 rounded-xl border text-xs font-semibold transition
                ${
                  tokenCount > 0
                    ? "bg-white/10 border-white/20 text-white/90 cursor-default"
                    : "bg-yellow-400/20 border-yellow-300/40 text-yellow-200 hover:bg-yellow-400/30 hover:border-yellow-300/70"
                }`}
            >
              Cooldown tokens : 🔶 <span className="font-extrabold">{tokenCount}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/tests/completed")}
                className="px-3 py-2 rounded-xl border bg-white/10 border-white/20 text-xs font-semibold"
              >
                  🏅
              </button>

              <button
  onClick={() => setLeaderboardOpen(true)}
  className="px-3 py-2 rounded-xl border bg-white/10 border-white/20 text-xs font-semibold"
>
  🏆
</button>

              <button
                onClick={() => setMobileSearchOpen((s) => !s)}
                className="px-3 py-2 rounded-xl border bg-white/10 border-white/20 text-xs font-semibold"
              >
                🔍 Search
              </button>
              
              

              <button
                onClick={() => router.push("/dashboard")}
                className="px-3 py-2 rounded-xl border bg-white/10 border-white/20 text-xs font-semibold"
              >
                ← Back
              </button>
            </div>
          </div>

          {mobileSearchOpen && (
            <div className="mt-2">
              <input
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder="Search tests..."
                className="w-full rounded-xl px-3 py-2 bg-white/10 border border-white/20 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Toggle */}
      <div className="relative z-10 max-w-xl mx-auto px-4 pt-4 pb-4">
        <div className="flex rounded-xl overflow-hidden border border-white/20">
          <button
            className={`flex-1 py-3 text-sm font-bold ${
              mobileCategory === "fun" ? "bg-sky-500 text-gray-900" : "bg-white/10 text-white/80"
            }`}
            onClick={() => setMobileCategory("fun")}
          >
            Fun Tests
          </button>
          <button
            className={`flex-1 py-3 text-sm font-bold ${
              mobileCategory === "achievement"
                ? "bg-amber-400 text-gray-900"
                : "bg-white/10 text-white/80"
            }`}
            onClick={() => setMobileCategory("achievement")}
          >
            Achievement Tests
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 pb-10 grid grid-cols-2 gap-4">
        {mobileShownTests.map((t) => {
          const locked = isLocked(t);
          const remain = cooldownRemainingDays(t);
          const bypassNow = !!bypassActive[t.id] || !!cooldownBypassed[t.id];
          const timeLabel = formatTimeLimit(t.timeLimit);

          return (
  <div key={t.slug} className="relative w-full aspect-square perspective">

              <div
  className={`relative w-full h-full transition-transform duration-500 preserve-3d ${
    mobileFlipped[t.slug] ? "rotate-y-180" : ""
  }`}
>

                
                {/* FRONT */}
<div className="absolute inset-0 backface-hidden rounded-xl bg-white/10 border border-white/15 flex flex-col">

  {/* Title */}
  <div className="px-2 pt-2 text-center">
    <div className="text-sm font-extrabold leading-tight line-clamp-2">
      {t.title}
    </div>
    
  </div>

  {/* Logo */}
  <div className="flex-1 flex items-center justify-center px-3">
    <img
      src={t.icon ? `${API}${t.icon}` : "/placeholder.png"}
      alt={t.title}
      className="w-[79%] h-[79%] object-contain"
      onError={(e) => ((e.currentTarget.src = "/placeholder.png"))}
    />
  </div>

  {/* Show more */}
<button
  onClick={(e) => {
    e.stopPropagation();
    toggleFlip(t.slug);
  }}
  className="
    mx-3 mb-3 px-4 py-1
    rounded-full text-xs font-medium tracking-wide
    text-white
    bg-gradient-to-r from-purple-500/80 to-yellow-400/80
    backdrop-blur-md
    border border-white/20
    shadow-sm
    hover:from-purple-500 hover:to-yellow-400
    hover:shadow-md
    active:scale-95
    transition-all duration-200
  "
>
  Show more
</button>

</div>



                {/* BACK */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-xl bg-white/10 border border-white/15 p-3 flex flex-col">
 {/* Title */}
  <div className="text-center mb-3">
    <div className="text-sm font-extrabold leading-tight line-clamp-2">
      {t.title}
    </div>
    
  </div>
 
  {/* Info row */}
  <div className="text-xs text-white/80 mb-3">
    {timeLabel ? `⏱ ${timeLabel}` : "⏱ ∞"}
    {typeof t.questionsCount === "number" && ` • ❓ ${t.questionsCount}`}
    {typeof t.maxScore === "number" && ` • 🏆 ${t.maxScore}`}
  </div>

  {/* Accelerate */}
  {remain > 0 && !locked && !bypassNow && (
 <button
  onClick={(e) => {
    e.stopPropagation();
    handleSkipCooldown(t);
  }}
  disabled={skippingSlug === t.slug}
  className={`mb-2 py-1 rounded-lg text-xs font-semibold border transition
    ${
      tokenCount > 0
        ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/30"
        : "bg-red-500/20 border-red-400/40 text-red-200 hover:bg-red-500/30"
    } ${skippingSlug === t.slug ? "opacity-60 cursor-not-allowed" : ""}`}
>
    {tokenCount > 0 ? "Accelerate" : "Get tokens"}
  </button>
)}


  {/* Actions */}
  <div className="mt-auto flex gap-2">
    <button
  onClick={(e) => {
    e.stopPropagation();
    handleStart(t);
  }}
  className={`relative flex-1 py-2 rounded-lg text-sm font-semibold transition
    ${
      locked
        ? "bg-white/10 text-white/60"
        : "bg-amber-300 text-gray-900"
    }`}
>
  Start

  {remain > 0 && !locked && !bypassNow && (
    <span
      className="pointer-events-none absolute -top-2 -right-2
        px-2 py-0.5 rounded-md
        bg-red-500/20 border border-red-400/40
        text-[11px] font-extrabold text-gray-900"
    >
      {remain}d
    </span>
  )}
</button>


    <button
      onClick={(e) => {
        e.stopPropagation();
        handleInfo(t);
      }}
      className="flex-1 py-2 rounded-lg text-sm font-semibold
        bg-white/10 border border-white/20"
    >
      Info
    </button>
  </div>

  {/* Flip back */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      toggleFlip(t.slug);
    }}
    className="mt-3 py-2 text-xs rounded-lg bg-black/20 border border-white/20"
  >
    ← Back
  </button>
</div>

              </div>
            </div>
          );
        })}
      </div>

      


      {mobileShownTests.length < filteredMobileTests.length && (
        <div className="relative z-10 max-w-xl mx-auto px-4 pb-6">
          <button
            onClick={() => setMobileLimit((l) => l + 10)}
            className="w-full py-3 rounded-xl bg-white/10 border border-white/20 text-sm font-bold"
          >
            Show more tests
          </button>
        </div>
      )}

      <div className="relative z-10 max-w-xl mx-auto px-4 pb-6 text-center text-xs text-white/60">
        2026 Networ.King
      </div> </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-black/70 border border-white/20 text-white text-sm shadow-2xl">
          {toast}
        </div>
      )}

      

      {buyModalTest && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-yellow-200/40 bg-gradient-to-br from-yellow-200 via-amber-200 to-yellow-100 text-gray-900 shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden">
            {/* header */}
            <div className="px-5 pt-5 pb-4 relative">
              <button
                onClick={() => setBuyModalTest(null)}
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
                  <h3 className="text-xl font-extrabold tracking-tight">
                    Boost your cooldown ⚡
                  </h3>
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
                    <div className="text-sm font-semibold text-gray-700">
                      Cooldown Token Pack
                    </div>
                    <div className="text-2xl font-extrabold mt-0.5">
                      5 tokens
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm line-through text-gray-600/70">
                        €9.99
                      </span>
                      <span className="text-2xl font-extrabold text-emerald-700">
                        €4.99
                      </span>
                      <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-sm">
                        -50% DEAL
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-gradient-to-br from-emerald-200 to-emerald-100 border border-emerald-300/60 px-3 py-2 text-center shadow-sm">
                    <div className="text-[11px] font-semibold text-emerald-800/80">
                      Best value
                    </div>
                    <div className="text-lg font-extrabold text-emerald-800">
                      €0.99
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-800/80">
                      per token
                    </div>
                  </div>
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
                  onClick={() => setBuyModalTest(null)}
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

  // ------------------------------
  // DESKTOP VIEW (unchanged)
  // ------------------------------
  const DesktopView = (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white relative">
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-2 border-b border-white/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div onClick={() => router.push("/dashboard")} className="cursor-pointer text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold text-amber-400 drop-shadow-lg tracking-tight flex items-center justify-center md:justify-start gap-2">
              <span>👑</span>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Networ.King
              </span>
            </h1>
            <p className="text-xs text-white/70 mt-1 font-medium">Grow your legacy</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (tokenCount <= 0 && tests.length > 0) {
                  setBuyModalTest(tests[0]); // opens the same modal
                }
              }}
              title={tokenCount > 0 ? "You have cooldown tokens" : "Buy cooldown tokens"}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold transition
                ${
                  tokenCount > 0
                    ? "bg-white/10 border-white/20 text-white/90 cursor-default"
                    : "bg-yellow-400/20 border-yellow-300/40 text-yellow-200 hover:bg-yellow-400/30 hover:border-yellow-300/70"
                }`}
            >
              Cooldown tokens : 🔶 <span className="font-extrabold">{tokenCount}</span>
            </button>

            <button
  onClick={() => setLeaderboardOpen(true)}
  className="px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-gray-900 font-semibold shadow-lg border border-white/20 hover:scale-[1.02] hover:brightness-110 transition-all duration-200"
>
  🏆 Daily Leaderboard
</button>

            <button
              onClick={() => router.push("/training")}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-500 text-gray-900 font-semibold shadow-lg border border-white/20 hover:scale-[1.02] hover:brightness-110 transition-all duration-200"
            >
              🏋️ Go to Trainings
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="mt-4 rounded-xl bg-red-500/20 border border-red-400/40 px-4 py-3 text-sm">
            ❌ {fetchError}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-14 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Achievement */}
        <motion.section
          {...fade}
          transition={{ duration: 0.35 }}
          className="rounded-2xl p-5 bg-white/10 border border-white/15 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold">🏅 Achievement & Badges</h2>
          </div>

          {achievements.length === 0 ? (
            <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl p-4">
              No achievement tests available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((t) => {
                const locked = isLocked(t);
                const passed = passedBefore(t);
                const remain = cooldownRemainingDays(t);
                const bypassNow = !!bypassActive[t.id] || !!cooldownBypassed[t.id];
                const timeLabel = formatTimeLimit(t.timeLimit);

                return (
                  <div
                    key={t.slug}
                    className="relative rounded-2xl p-4 bg-white/10 border border-white/15 shadow-lg hover:bg-white/15 transition flex flex-col min-h-[210px]"
                  >
                    {locked && (
                      <div className="absolute inset-0 rounded-2xl bg-black/40 grid place-items-center">
                        <div className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-sm">
                          🔒 Locked
                        </div>
                      </div>
                    )}

                    {passed && (
                      <div className="absolute -top-2 -left-2 rotate-[-10deg]">
                        <span className="px-2 py-1 rounded bg-emerald-500 text-xs font-bold text-white shadow">
                          PASSED
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col flex-1">
                      {/* Row 1: icon + title */}
                      <div className="flex items-start gap-3">
                        <img
                          src={t.icon ? `${API}${t.icon}` : "/placeholder.png"}
                          alt={t.title}
                          className="w-12 h-12 rounded-lg object-cover border border-white/20 bg-white/10"
                          onError={(e) => ((e.currentTarget.src = "/placeholder.png"))}
                        />

                        <div className="flex-1">
                          <div className="font-semibold leading-tight line-clamp-2 min-h-[40px]">{t.title}</div>
                          <div className="text-xs text-white/70 line-clamp-2">{/* intentionally blank */}</div>
                        </div>
                      </div>

                      {/* Row 2: chips */}
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-white/70 min-h-[48px]">
                        {timeLabel ? (
                          <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20">
                            ⏱ {timeLabel}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">
                            ⏱ ∞
                          </span>
                        )}

                        {typeof t.questionsCount === "number" ? (
                          <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20">
                            ❓ {t.questionsCount} Q
                          </span>
                        ) : null}

                        {typeof t.maxScore === "number" ? (
                          <div className="col-start-1">
                            <span className="inline-flex px-2 py-0.5 rounded bg-white/10 border border-white/20">
                              🏆 {t.maxScore}
                            </span>
                          </div>
                        ) : null}

                        {remain > 0 && !locked && !bypassNow && (
                          <button
                            onClick={() => handleSkipCooldown(t)}
                            disabled={skippingSlug === t.slug}
                            title={
                              skippingSlug === t.slug
                                ? "Processing…"
                                : tokenCount > 0
                                  ? "Consumes one Token 🔶"
                                  : "Buy cooldown tokens"
                            }
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition leading-tight
                              ${
                                skippingSlug === t.slug
                                  ? "bg-white/10 border-white/20 text-white/60 cursor-not-allowed"
                                  : tokenCount > 0
                                    ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/25 hover:border-emerald-400/50"
                                    : "bg-orange-500/20 border-orange-400/40 text-orange-200 hover:bg-orange-500/25 hover:border-orange-400/50"
                              }`}
                          >
                            {skippingSlug === t.slug
                              ? "…"
                              : tokenCount > 0
                                ? "Accelerate"
                                : "Accelerate"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <button
                        onClick={() => handleStart(t)}
                        disabled={isStartDisabled(t)}
                        title={
                          remain > 0 && !locked && !bypassNow
                            ? "On cooldown — click Start to see next attempt time"
                            : undefined
                        }
                        className={`relative px-3 py-2 rounded-lg text-sm font-semibold transition border
                          ${
                            isStartDisabled(t)
                              ? "bg-white/10 border-white/20 text-white/60 cursor-not-allowed"
                              : "bg-amber-300 text-gray-900 border-amber-300 hover:bg-amber-300"
                          }`}
                      >
                        <span>Start</span>

                        {remain > 0 && !locked && !bypassNow && (
                          <span
                            className="pointer-events-none absolute -top-2 -right-2 px-2 py-0.5
                              rounded-md bg-red-500/15 border border-red-400/40
                              text-[11px] font-semibold text-gray-900"
                          >
                            {remain}d
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handleInfo(t)}
                        className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20 transition"
                      >
                        Info
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* RIGHT: Fun */}
        <motion.section
          {...fade}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl p-5 bg-white/10 border border-white/15 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold">🎯 Tests for Fun</h2>
            <span className="text-xs text-white/70">Replay anytime</span>
          </div>

          {funTests.length === 0 ? (
            <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl p-4">
              No fun tests available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {funTests.map((t) => {
                const locked = isLocked(t);
                const remain = cooldownRemainingDays(t);
                const bypassNow = !!bypassActive[t.id] || !!cooldownBypassed[t.id];
                const disabled = isLocked(t);
                const timeLabel = formatTimeLimit(t.timeLimit);

                return (
                  <div
                    key={t.slug}
                    className="relative rounded-2xl p-4 bg-white/10 border border-white/15 shadow-lg hover:bg-white/15 transition flex flex-col min-h-[210px]"
                  >
                    {locked && (
                      <div className="absolute inset-0 rounded-2xl bg-black/40 grid place-items-center">
                        <div className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-sm">
                          🔒 Locked
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col flex-1">
  {/* ROW 1: avatar + stacked chips */}
  <div className="flex items-stretch gap-3">
    <img
      src={t.icon ? `${API}${t.icon}` : "/placeholder.png"}
      alt={t.title}
      className="w-12 h-12 rounded-lg object-cover border border-white/20 bg-white/10"
      onError={(e) => ((e.currentTarget.src = "/placeholder.png"))}
    />

    <div className="flex flex-col justify-between text-[11px] text-white/70">
      {/* time */}
      {timeLabel ? (
        <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 whitespace-nowrap">
          ⏱ Time {timeLabel}
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50 whitespace-nowrap">
          Time ⏱ ∞ 
        </span>
      )}

      {/* questions */}
      {typeof t.questionsCount === "number" ? (
        <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 whitespace-nowrap">
          ❓ {t.questionsCount} Q
        </span>
      ) : (
        <span className="opacity-0">placeholder</span>
      )}
    </div>
  </div>

  {/* ROW 2: title (1 line only) */}
  <div className="mt-3 font-semibold truncate">
    {t.title}
  </div>

  {/* ROW 3: description (1 line only) */}
  <div className="text-xs mt-1 text-white/70 truncate">
    {t.description}
  </div>

  {/* ROW 4: cooldown / accelerate area */}
  <div className=" mb-2 min-h-[20px] flex items-center">
   {remain > 0 && !locked && !bypassNow && (
  <div className="mt-3 flex items-center">
    <button
      onClick={() => handleSkipCooldown(t)}
      disabled={skippingSlug === t.slug}
      className={`px-3 py-1 rounded-md text-xs font-semibold border transition
        ${
          skippingSlug === t.slug
            ? "bg-white/10 border-white/20 text-white/60 cursor-not-allowed"
            : tokenCount > 0
              ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/25"
              : "bg-orange-500/20 border-orange-400/40 text-orange-200 hover:bg-orange-500/25"
        }`}
    >
      {skippingSlug === t.slug ? "Processing…" : "Accelerate"}
    </button>
  </div>
)}
  </div>
</div>

                    <div className=" flex items-center justify-between gap-2 mt-auto">
                      <button
                        onClick={() => handleStart(t)}
                        disabled={disabled}
                        title={
                          remain > 0 && !locked && !bypassNow
                            ? "On cooldown — click Start to see next attempt time"
                            : undefined
                        }
                        className={`relative px-3 py-2 rounded-lg text-sm font-semibold transition border
                          ${
                            disabled
                              ? "bg-white/10 border-white/20 text-white/60 cursor-not-allowed"
                              : "bg-sky-400 text-gray-900 border-sky-300 hover:bg-sky-300"
                          }`}
                      >
                        <span>Start</span>

                        {remain > 0 && !locked && !bypassNow && (
                          <span
                            className="pointer-events-none absolute -top-2 -right-2 px-2 py-0.5
                              rounded-md bg-red-500/15 border border-red-400/40
                              text-[11px] font-semibold text-gray-900"
                          >
                            {remain}d
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handleInfo(t)}
                        className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20 transition"
                      >
                        Info
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>

      <div className="flex justify-center mb-6">
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="px-5 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold transition"
        >
          ← Back to Dashboard
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-black/70 border border-white/20 text-white text-sm shadow-2xl">
          {toast}
        </div>
      )}

      {buyModalTest && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-yellow-200/40 bg-gradient-to-br from-yellow-200 via-amber-200 to-yellow-100 text-gray-900 shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden">
            {/* header */}
            <div className="px-5 pt-5 pb-4 relative">
              <button
                onClick={() => setBuyModalTest(null)}
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
                  <h3 className="text-xl font-extrabold tracking-tight">
                    Boost your cooldown ⚡
                  </h3>
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
                    <div className="text-sm font-semibold text-gray-700">
                      Cooldown Token Pack
                    </div>
                    <div className="text-2xl font-extrabold mt-0.5">
                      5 tokens
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm line-through text-gray-600/70">
                        $9.99
                      </span>
                      <span className="text-2xl font-extrabold text-emerald-700">
                        $4.99
                      </span>
                      <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-sm">
                        -50% DEAL
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-gradient-to-br from-emerald-200 to-emerald-100 border border-emerald-300/60 px-3 py-2 text-center shadow-sm">
                    <div className="text-[11px] font-semibold text-emerald-800/80">
                      Best value
                    </div>
                    <div className="text-lg font-extrabold text-emerald-800">
                      $0.99
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-800/80">
                      per token
                    </div>
                  </div>
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
                  onClick={() => setBuyModalTest(null)}
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

 return (
  <>
    <div className="block lg:hidden">{MobileView}</div>
    <div className="hidden lg:block">{DesktopView}</div>

    {leaderboardOpen && (
  <DailyLeaderboardModal onClose={() => setLeaderboardOpen(false)} />
)}

    {/* FLOATING BUTTON — OUTSIDE ALL TRANSFORM CONTEXTS */}
    <button
      onClick={() => router.push("/tests/completed")}
      className="fixed bottom-6 right-6 z-[999] inline-flex items-center gap-2 px-4 py-3 rounded-full bg-yellow-400 text-gray-900 font-semibold hover:bg-yellow-300 shadow-2xl border border-yellow-300/70 transition"
    >
      🏅 My Completed Tests
    </button>
  </>
);



function DailyLeaderboardModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"today" | "yesterday" | "history">("today");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
 const API = process.env.NEXT_PUBLIC_API_URL!;



useEffect(() => {
  const id = localStorage.getItem("userId");
  if (id) setMyUserId(Number(id));
}, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const endpoint =
      tab === "today"
        ? "/daily-leaderboard/today"
        : tab === "yesterday"
        ? "/daily-leaderboard/yesterday"
        : "/daily-leaderboard/history";

    setLoading(true);

    fetch(`${API}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
  if (tab !== "today") return;

  const update = () => {
    const now = new Date();
    const tomorrowUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1
    ));

    const diff = Math.floor((tomorrowUTC.getTime() - Date.now()) / 1000);
    setSecondsLeft(diff > 0 ? diff : 0);
  };

  update();
  const interval = setInterval(update, 1000);
  return () => clearInterval(interval);
}, [tab]);

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-3xl rounded-3xl border border-white/20 bg-gradient-to-br from-indigo-900 via-blue-900 to-amber-400 text-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
          <div>
  <h2 className="text-xl font-bold">🏆 Daily Challenge</h2> 
  {tab === "today" && secondsLeft !== null && (
    <div className="text-xs text-white/70 mt-1">
      ⏳ Ends in {Math.floor(secondsLeft / 3600)}h{" "}
      {Math.floor((secondsLeft % 3600) / 60)}m{" "}
      {secondsLeft % 60}s
    </div>
  )}

  
</div>
<button
  onClick={() => setShowRules(true)}
  className="px-3 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 transition"
>
  📜 Rules
</button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 text-sm">
          {["today", "yesterday", "history"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`flex-1 py-3 font-semibold ${
                tab === t ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {t === "today"
                ? "Today"
                : t === "yesterday"
                ? "Yesterday"
                : "Last 7 Days"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading && <div className="text-center">Loading...</div>}

         {/* No leaderboard created at all */}
{!loading && tab === "today" && data?.active === false && (
  <div className="text-center py-10">
    <div className="text-5xl mb-4">📭</div>
    <h3 className="text-lg font-bold text-amber-300">
      No Daily Leaderboard Today
    </h3>
    <p className="text-sm text-white/70 mt-2">
      Come back tomorrow at 00:00 UTC for a new challenge 👑
    </p>
  </div>
)}

{/* Leaderboard exists but no entries yet */}
{!loading &&
  tab === "today" &&
  data?.active !== false &&
  data?.leaderboard?.length === 0 && (
    <div className="text-center text-white/70">
      No entries yet. Be the first 👑
    </div>
)}

          {tab === "today" && data?.totalParticipants && (
  <div className="text-xs text-white/60 text-center mb-4">
    {data.totalParticipants} competitors today
  </div>
)}

          {!loading &&
            tab === "today" &&
            data?.leaderboard?.map((entry: any, index: number) => (
              <div
  key={entry.id}
  onClick={() => window.location.href = `/profile/${entry.user.id}`}
  className={`flex items-center justify-between py-3 border-b border-white/10 
    cursor-pointer rounded-lg px-3 transition
    ${
      index === 0
        ? "bg-yellow-400/20 border border-yellow-300/40 shadow-lg"
        : index === 1
        ? "bg-white/10"
        : index === 2
        ? "bg-amber-700/20"
        : "hover:bg-white/10"

        
    } ${entry.user.id === myUserId
  ? " ring-2 ring-amber-400" 
  : ""}
  `}

    
>
                <div className="flex items-center gap-3">
                 <span
  className={`w-10 text-center ${
    index === 0
      ? "text-2xl"
      : index === 1
      ? "text-xl"
      : index === 2
      ? "text-xl"
      : "text-sm font-bold"
  }`}
>
  {index === 0 && "🥇"}
  {index === 1 && "🥈"}
  {index === 2 && "🥉"}
  {index > 2 && index + 1}
</span>

                  <img
  src={
    entry.user.avatar
      ? `${API}/avatars/${entry.user.avatar}`
      : "/placeholder.png"
  }
  onError={(e) => (e.currentTarget.src = "/placeholder.png")}
  className="w-8 h-8 rounded-full object-cover border border-white/20"
/>
                </div>

                <span className="font-semibold">
  {entry.user.name}
</span>

                <div className="text-sm">
                  {entry.score}% • {(entry.timeSpentMs / 1000).toFixed(1)}s
                </div>
              </div>
            ))}

            {!loading &&
  tab === "today" &&
  data?.myRank &&
  data.myRank > 10 &&
  data?.myEntry && (
    <div className="mt-6 pt-4 border-t border-white/20">

      <div className="text-sm text-white/70 mb-2 text-center">
        Your Position
      </div>

      <div
        onClick={() => window.location.href = `/profile/${data.myEntry.user.id}`}
        className="flex items-center justify-between py-3 rounded-lg px-3 
          bg-amber-400/10 border border-amber-400/30 
          hover:scale-[1.01] transition cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold w-10 text-center">
            #{data.myRank}
          </span>

          <img
            src={
              data.myEntry.user.avatar
                ? `${API}/avatars/${data.myEntry.user.avatar}`
                : "/placeholder.png"
            }
            onError={(e) => (e.currentTarget.src = "/placeholder.png")}
            className="w-8 h-8 rounded-full object-cover border border-white/20"
          />

          <span className="font-semibold">
            {data.myEntry.user.name}
          </span>
        </div>

        <div className="text-sm">
          {data.myEntry.score}% • {(data.myEntry.timeSpentMs / 1000).toFixed(1)}s
        </div>
      </div>
    </div>
)}

{!loading &&
  tab === "yesterday" &&
  data?.leaderboard?.map((entry: any, index: number) => (
    <div
      key={entry.id}
      onClick={() => window.location.href = `/profile/${entry.user.id}`}
      className="flex items-center justify-between py-3 border-b border-white/10 cursor-pointer rounded-lg px-3 hover:bg-white/10 transition"
    >
      <div className="flex items-center gap-3">
        <span className="w-10 text-center font-bold">
          {index === 0 && "🥇"}
          {index === 1 && "🥈"}
          {index === 2 && "🥉"}
        </span>

        <img
          src={
            entry.user.avatar
              ? `${API}/avatars/${entry.user.avatar}`
              : "/placeholder.png"
          }
          onError={(e) => (e.currentTarget.src = "/placeholder.png")}
          className="w-8 h-8 rounded-full object-cover border border-white/20"
        />

        <span className="font-semibold">{entry.user.name}</span>
      </div>

      <div className="text-sm">
        {entry.score}% • {(entry.timeSpentMs / 1000).toFixed(1)}s
      </div>
    </div>
))}

{!loading && tab === "history" && data?.history?.length === 0 && (
  <div className="text-center py-10 text-white/70">
    No leaderboard history yet.
  </div>
)}

{!loading &&
  tab === "history" &&
  data?.history?.map((day: any) => (
    <div
      key={day.date}
      className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20"
    >
      <div className="text-sm text-amber-300 font-bold mb-1">
        {new Date(day.date).toLocaleDateString()}
      </div>

      <div className="text-xs text-white/60 mb-3">
        {day.test.title}
      </div>

      {day.champions.map((entry: any, index: number) => (
        <div
          key={entry.id}
          className="flex items-center justify-between py-2 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="w-6">
              {index === 0 && "🥇"}
              {index === 1 && "🥈"}
              {index === 2 && "🥉"}
            </span>

            <span>{entry.user.name}</span>
          </div>

          <span>
            {entry.score}% • {(entry.timeSpentMs / 1000).toFixed(1)}s
          </span>
        </div>
      ))}
    </div>
))}

           {tab === "today" && data?.active !== false && data?.test && (
  <div className="mt-6 text-center">
    <button
      onClick={() => window.location.href = `/tests/${data.test.slug}`}
      className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-gray-900 font-bold shadow-lg hover:scale-105 transition"
    >
      🚀 Compete Now
    </button>
  </div>
)}

{showRules && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-gray-900 w-full max-w-md rounded-2xl p-6 relative shadow-2xl border border-gray-700">
      
      <button
        onClick={() => setShowRules(false)}
        className="absolute top-3 right-3 text-gray-400 hover:text-white"
      >
        ✖
      </button>

      <h2 className="text-xl font-bold mb-4 text-yellow-400">
        📜 Daily Challenge Rules
      </h2>

      <ul className="text-sm space-y-3 text-gray-300">
        <li>• A new Daily Test appears every 24 hours (UTC).</li>
        <li>• You can compete only twice per day.</li>
        <li>• Only your best score from the first 2 attempts counts.</li>
        <li>• Ranking priority: Higher score → Faster time → Earlier finish.</li>
        <li>• Top 3 players receive tokens at midnight.</li>
        <li>• The Daily Test will later be available in normal Tests section.</li>
        <li>• Leaderboard history is saved.</li>
      </ul>

      <div className="mt-6 text-center text-xs text-gray-500">
        Fair play only 👑
      </div>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
}



}
