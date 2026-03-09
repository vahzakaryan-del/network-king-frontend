"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { asset } from "@/lib/assets";

type BadgeItem = {
  id: number;
  name: string;
  rarity: string;
  icon: string;
  earnedAt?: string;
  badgeScore?: number | null;
  badgeScoreColor?: string | null;
  badgeScoreUnit?: "percent" | "points" | null;
  description?: string; // ✅ ADD THIS
};

export default function AllBadgesPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = String(params?.id || "");

  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // filter + search + sort
 const [viewMode, setViewMode] = useState<"earned" | "all">("earned");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"rarity" | "newest" | "name">("rarity");

  const [allBadges, setAllBadges] = useState<BadgeItem[]>([]);

  // (optional) modal
  const [openBadge, setOpenBadge] = useState<BadgeItem | null>(null);

  const handleBadgeClick = (badge: BadgeItem) => {
  const fullIconUrl = badge.icon?.startsWith("/badges/")
    ? `${process.env.NEXT_PUBLIC_API_URL}${badge.icon}`  // Prepend backend URL
    : `${process.env.NEXT_PUBLIC_API_URL}/badges/${badge.icon || "default.png"}`;  // Fallback to default image

  // Set the openBadge state with the full URL
  setOpenBadge({
    ...badge,
    icon: fullIconUrl,  // Update the icon with the full URL
  });
};

  const rarityWeight: Record<string, number> = {
    unique: 5,
    legendary: 4,
    gold: 3,
    silver: 2,
    bronze: 1,
  };

  const rarityGlow: Record<string, string> = {
    legendary: "shadow-[0_0_15px_4px_rgba(255,215,0,0.55)] border-amber-300/60",
    gold: "shadow-[0_0_10px_3px_rgba(255,215,128,0.35)] border-yellow-300/40",
    silver: "shadow-[0_0_8px_2px_rgba(200,200,255,0.22)] border-blue-200/35",
    bronze: "shadow-[0_0_6px_2px_rgba(205,127,50,0.22)] border-orange-300/35",
    unique: "shadow-[0_0_15px_4px_rgba(128,255,220,0.35)] border-emerald-300/35",
  };

  const rarityPill: Record<string, string> = {
    unique: "bg-emerald-300/15 border-emerald-300/25 text-emerald-100",
    legendary: "bg-amber-300/15 border-amber-300/25 text-amber-100",
    gold: "bg-yellow-300/15 border-yellow-300/25 text-yellow-100",
    silver: "bg-slate-200/10 border-slate-200/20 text-slate-100",
    bronze: "bg-orange-300/10 border-orange-300/20 text-orange-100",
  };


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/${profileId}`, {
  headers: { Authorization: `Bearer ${token}` },
});

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load badges");

        const mapped: BadgeItem[] =
          data.badges?.map((b: any) => ({
            id: b.id,
            name: b.name,
            rarity: (b.rarity || "bronze").toLowerCase(),
            icon: b.icon?.startsWith("/badges/")
  ? b.icon
  : `badges/${b.icon || "default.png"}`,
            earnedAt: b.earnedAt,
            badgeScore: b.badgeScore ?? null,
            badgeScoreColor: b.badgeScoreColor ?? "white",
            badgeScoreUnit: b.badgeScoreUnit ?? "percent",
          })) || [];

        setBadges(mapped);
        setUserName(data.name || "");
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profileId]);

  useEffect(() => {
  if (viewMode !== "all") return;

  const token = localStorage.getItem("token");
  if (!token) return;

  (async () => {
    try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/badges`, {
  headers: { Authorization: `Bearer ${token}` },
});

     const data = await res.json();
if (!res.ok) throw new Error(data.error || "Failed to load badges");

// ✅ backend returns array directly
const source = Array.isArray(data) ? data : [];

const mapped: BadgeItem[] = source.map((b: any) => ({
  id: b.id,
  name: b.name,
  rarity: (b.rarity || "bronze").toLowerCase(),
  icon: b.icon?.startsWith("/badges/")
    ? b.icon
    : `badges/${b.icon || "default.png"}`,
  description: b.description ?? null,
}));

      setAllBadges(mapped);
    } catch (e) {
      console.error(e);
    }
  })();
}, [viewMode]);

const displayedBadges = useMemo(() => {
  const source = viewMode === "earned" ? badges : allBadges;

  let list = [...source];

  const q = query.trim().toLowerCase();
  if (q) list = list.filter((b) => (b.name || "").toLowerCase().includes(q));

  if (sort === "rarity") {
  list.sort(
    (a, b) =>
      (rarityWeight[b.rarity] || 0) -
      (rarityWeight[a.rarity] || 0)
  );
}

  if (sort === "name") {
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  if (sort === "newest" && viewMode === "earned") {
    list.sort(
      (a, b) =>
        new Date(b.earnedAt || 0).getTime() -
        new Date(a.earnedAt || 0).getTime()
    );
  }

  return list;
}, [badges, allBadges, viewMode, query, sort]);

  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return "";
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center">
        Loading badges...
      </main>
    );
  }

  return (
    <main className="min-h-screen text-white bg-gradient-to-br from-blue-950 via-indigo-900 to-amber-500/40 relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-10">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-amber-300">
              🏆 {userName ? `${userName}'s Badges` : "Badges"}
            </h1>
            <p className="text-xs text-white/60 mt-1">
              {displayedBadges.length} shown{badges.length ? ` • ${badges.length} total` : ""}
            </p>
          </div>

          <button
            onClick={() => router.push(`/profile/${profileId}`)}
            className="shrink-0 px-3 py-2 md:px-4 md:py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition text-sm"
          >
            ← Back
          </button>
        </div>

        {/* Sticky controls */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 md:mx-0 px-4 sm:px-6 md:px-0 py-3 bg-gradient-to-br from-blue-950/70 via-indigo-900/55 to-amber-500/10 backdrop-blur border-b border-white/10">
          {/* Search + Sort */}
          <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search badges…"
              className="w-full md:max-w-md rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300/40"
            />

            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none"
              >
                <option className="bg-slate-900" value="rarity">Rarity</option>
                <option className="bg-slate-900" value="newest">Newest</option>
                <option className="bg-slate-900" value="name">Name A→Z</option>
              </select>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="mt-3 flex gap-2">
  <button
    onClick={() => setViewMode("earned")}
    className={`px-4 py-2 rounded-xl text-sm border transition ${
      viewMode === "earned"
        ? "bg-amber-400 text-gray-900 border-amber-400"
        : "bg-white/10 border-white/20 hover:bg-white/20"
    }`}
  >
    🏆 My Earned Badges
  </button>

  <button
    onClick={() => setViewMode("all")}
    className={`px-4 py-2 rounded-xl text-sm border transition ${
      viewMode === "all"
        ? "bg-amber-400 text-gray-900 border-amber-400"
        : "bg-white/10 border-white/20 hover:bg-white/20"
    }`}
  >
    📚 See All Available Badges
  </button>
</div>
        </div>

        {/* No badges */}
        {displayedBadges.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-gray-300 italic">No badges found.</p>
            <p className="text-xs text-white/60 mt-2">
              Try another filter or search term.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            <AnimatePresence>
              {displayedBadges.map((b) => (
                <motion.button
                  type="button"
                  key={b.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => handleBadgeClick(b)}
                  className={`relative rounded-2xl bg-white/10 border ${
                    rarityGlow[b.rarity] || "border-white/10"
                  } p-3 md:p-4 flex flex-col items-center justify-between text-center hover:bg-white/15 transition outline-none`}
                >
                  {/* rarity pill */}
                  <div
                    className={`absolute left-2 top-2 px-2 py-0.5 rounded-lg text-[10px] border ${
                      rarityPill[b.rarity] || "bg-white/5 border-white/10 text-white/70"
                    }`}
                  >
                    {b.rarity.charAt(0).toUpperCase() + b.rarity.slice(1)}
                  </div>

                  {/* score */}
                  {b.badgeScore != null && (
                    <div
                      className="absolute right-2 top-2 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-white/10"
                      style={{
                        background: "rgba(0,0,0,0.45)",
                        color: b.badgeScoreColor || "white",
                      }}
                    >
                      {b.badgeScore}
                      {b.badgeScoreUnit === "percent" ? "%" : ""}
                    </div>
                  )}

                  {/* icon */}
                  <img
                      src={asset(b.icon)}
                    alt={b.name}
                    className="w-14 h-14 md:w-16 md:h-16 object-contain drop-shadow-lg mt-5"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = asset("badges/default.png");
                    }}
                  />

                  <div className="mt-3 font-semibold text-sm leading-tight line-clamp-2">
                    {b.name}
                  </div>

                  <div className="mt-2 text-[10px] text-white/60">
                    {fmtDate(b.earnedAt)}
                  </div>

                  {/* subtle stand */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-2 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm opacity-70" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal (optional) */}
      <AnimatePresence>
        {openBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <button
              className="absolute inset-0 bg-black/70"
              onClick={() => setOpenBadge(null)}
              aria-label="Close badge details"
            />

            <motion.div
              initial={{ y: 18, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 10, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-blue-950/90 via-indigo-900/85 to-amber-500/25 border border-white/15 shadow-2xl backdrop-blur p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-white/70">Badge</div>
                  <h2 className="text-lg font-extrabold">{openBadge.name}</h2>
                </div>

                <button
                  onClick={() => setOpenBadge(null)}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className={`shrink-0 w-20 h-20 rounded-2xl bg-white/10 border border-white/15 grid place-items-center`}>
                  <img
                    src={openBadge.icon}
                    alt={openBadge.name}
                    className="w-16 h-16 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = asset("badges/default.png");
                    }}
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="inline-flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg text-xs border ${rarityPill[openBadge.rarity] || "bg-white/5 border-white/10 text-white/70"}`}>
                      {openBadge.rarity.charAt(0).toUpperCase() + openBadge.rarity.slice(1)}
                    </span>

                    {openBadge.badgeScore != null && (
                      <span
                        className="px-2 py-1 rounded-lg text-xs font-bold border border-white/10"
                        style={{
                          background: "rgba(0,0,0,0.45)",
                          color: openBadge.badgeScoreColor || "white",
                        }}
                      >
                        {openBadge.badgeScore}
                        {openBadge.badgeScoreUnit === "percent" ? "%" : ""}
                      </span>
                    )}
                  </div>

                  {openBadge.earnedAt && (
  <div className="text-xs text-white/70">
    Earned: <span className="text-white/90">{fmtDate(openBadge.earnedAt)}</span>
  </div>
)}
                </div>
              </div>

              
                {openBadge?.description && (
  <div className="mt-3 text-sm text-white/80">
    {openBadge.description}
  </div>
)}


              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setOpenBadge(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
