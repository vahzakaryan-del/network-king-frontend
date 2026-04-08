"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/Portal";
import { getSocket } from "@/lib/socket";
import BadgeScore from "@/components/BadgeScore";
import "@fortawesome/fontawesome-free/css/all.min.css";
import OnboardingOverlay from "@/components/onboarding/OnboardingOverlay";
import { onboardingSteps } from "@/lib/onboardingSteps";
import { apiFetch } from "@/lib/api";
import { useLottery } from "./hooks/useLottery";
import MiniAudioPlayer from "@/components/MiniAudioPlayer";

import { asset } from "@/lib/assets";

/* -------------------------
   Types (adjust if needed)
   ------------------------- */

type SimpleFriend = { id: number; name: string; avatar?: string; online?: boolean };

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  url?: string | null;
  read: boolean;
  createdAt: string;
};

/* =========================================================
   Helpers / Components
   ========================================================= */

// level preview rooms emojis
function levelEmoji(level: number) {
  if (level >= 34) return "👑";
  if (level >= 31) return "🐲";
  if (level >= 28) return "🧙";
  if (level >= 19) return "🏆";
  if (level >= 18) return "🔥";
  if (level >= 16) return "🧠";
  if (level >= 14) return "💎";
  if (level >= 11) return "⚜️";
  if (level >= 8) return "🚀";
  if (level >= 5) return "⚔️";
  if (level >= 3) return "🔰";
  return "🌱";
}

// pick up to 3 badges (optionally by rarity)
function pickTop3Badges(all: any[] = []) {
  if (!Array.isArray(all) || all.length === 0) return [];

  const weight: Record<string, number> = {
    unique: 5,
    legendary: 4,
    gold: 3,
    silver: 2,
    bronze: 1,
  };

  const sorted = [...all].sort((a, b) => {
    const r = (weight[b.rarity] || 0) - (weight[a.rarity] || 0);
    if (r !== 0) return r;
    return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
  });

  return sorted.slice(0, 3);
}

function BadgeMedallion({
  badge,
  size = 56,
  glow = false,
}: {
  badge: {
    icon?: string;
    name?: string;
    rarity?: string;
    badgeScore?: number | null;
    badgeScoreColor?: string | null;
    badgeScoreUnit?: "percent" | "points";
  };
  size?: number;
  glow?: boolean;
}) {
  const ring =
    badge.rarity === "legendary" || badge.rarity === "unique"
      ? "border-amber-300/70 shadow-[0_0_24px_rgba(251,191,36,0.5)]"
      : badge.rarity === "gold"
      ? "border-yellow-300/70 shadow-[0_0_16px_rgba(253,224,71,0.4)]"
      : badge.rarity === "silver"
      ? "border-slate-200/60 shadow-[0_0_12px_rgba(203,213,225,0.25)]"
      : "border-white/25 shadow-[0_0_8px_rgba(255,255,255,0.15)]";

  const glowRing = glow
    ? "after:content-[''] after:absolute after:inset-[-10px] after:rounded-full after:bg-amber-300/25 after:blur-xl after:animate-pulse"
    : "";

  const icon = badge.icon || "🏅";

  return (
    <div className="relative">
      <div
        className={`relative grid place-items-center rounded-full bg-white/10 backdrop-blur-md border ${ring} ${glowRing} transition-transform hover:scale-105`}
        style={{ width: size, height: size }}
        title={badge.name || "Badge"}
      >
        {icon.startsWith("/") || icon.startsWith("http") ? (

          <img
 src={asset(icon)}
  alt={badge.name || "badge"}
  className="w-[90%] h-[90%] object-contain"
  draggable={false}
/>
        ) : (
          <span
            className="select-none"
            style={{
              fontSize: size >= 70 ? "1.75rem" : "1.25rem",
              filter:
                badge.rarity === "legendary"
                  ? "drop-shadow(0 0 6px gold)"
                  : badge.rarity === "gold"
                  ? "drop-shadow(0 0 4px #facc15)"
                  : "none",
            }}
          >
            {icon}
          </span>
        )}
      </div>

      {badge.badgeScore != null && (
        <BadgeScore score={badge.badgeScore} overlayOnly unit={badge?.badgeScoreUnit || "percent"} />
      )}
    </div>
  );
}

// ✅ Badge stack: now supports mobile (compact row) + desktop (big stack)
function BadgeStack({
  badges,
  isFeatured = false,
}: {
  badges: any[];
  isFeatured?: boolean;
}) {
  const top3 = isFeatured ? (badges || []).slice(0, 3) : pickTop3Badges(badges);

  
 const isOnlyDefaultBadge =
  top3.length === 1 && top3[0]?.id === 8;

  if (top3.length === 0) {
    return (
      <>
        {/* Mobile empty */}
        <div className="md:hidden text-xs text-white/60 italic text-right">
          Earn badges ✨
        </div>

        {/* Desktop empty */}
        <div className="hidden md:flex items-center justify-center flex-1">
          <div className="text-xs text-white/60 italic">Earn badges to showcase them here ✨</div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ✅ Mobile compact row */}
    <div className="flex md:hidden flex-col items-end gap-1">
  <div className="flex items-center gap-2">
    {top3.slice(0, 3).map((b, i) => (
      <BadgeMedallion key={i} badge={b} size={70} />
    ))}
  </div>

  {isOnlyDefaultBadge && (
    <div className="text-[10px] text-white/60 italic text-right">
      This is your first badge ✨
    </div>
  )}
</div>

      {/* Desktop big stack */}
      <div className="hidden md:flex relative flex-1 justify-center items-center min-h-[150px]">
        <div className="absolute inset-0 blur-3xl opacity-20 pointer-events-none bg-gradient-to-tr from-amber-300/40 via-purple-500/30 to-transparent" />
        <div className="relative flex flex-col items-center gap-2">
  <div className="flex justify-center items-center gap-8">
    {top3[0] && (
      <div className="scale-110 relative">
        <BadgeMedallion badge={top3[0]} size={88} glow />
      </div>
    )}
    {top3[1] && (
      <div className="scale-100 relative">
        <BadgeMedallion badge={top3[1]} size={74} />
      </div>
    )}
    {top3[2] && (
      <div className="scale-90 relative">
        <BadgeMedallion badge={top3[2]} size={58} />
      </div>
    )}
  </div>

  {isOnlyDefaultBadge && (
    <div className="text-xs text-white/60 italic text-center">
      This is your first badge!  ✨
    </div>
  )}
</div>
      </div>
    </>
  );
}

// ✅ GLOBAL CHAT PREVIEW (now supports limit)
function GlobalChatPreview({ limit = 3, compact = false }: { limit?: number; compact?: boolean }) {

  const [preview, setPreview] = useState<any[]>([]);
  const router = useRouter();
  


  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "just now";
  };

useEffect(() => {
  if (typeof window === "undefined") return;
  apiFetch(`/global/preview`)
    .then((res) => res.json())
    .then((data) => setPreview((data || []).slice(-limit)))
    .catch(console.error);
}, [limit]);


  return (
    <div
  className={[
    "relative flex flex-col justify-center rounded-lg bg-white/5 border border-white/10 overflow-hidden",
    compact ? "p-2 min-h-[64px]" : "p-3 min-h-[110px]",
  ].join(" ")}
>

      {preview.length === 0 ? (
        <p className="text-gray-400 text-center text-sm opacity-80">
          💬 No recent messages yet. Be the first to say hi!
        </p>
      ) : (
        <div className="space-y-2 text-sm text-gray-100">
          <AnimatePresence>
            {preview.map((m) => (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => {
                  localStorage.setItem("lastClickedMessageId", String(m.id));
                  router.push("/chat/global");
                }}
                className="w-full text-left flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-md px-2 py-1 transition"
              >
                <img
                 src={m.user.avatar ? asset(`avatars/${m.user.avatar}`) : asset("avatars/default.webp")}
                  alt={m.user.name}
                  className="w-6 h-6 rounded-full object-cover border border-white/20"
                />
                <span className="font-semibold text-white/90 truncate max-w-[90px]">
                  {m.user.name}
                </span>
                {m.user.mainCountry && (
                  <img
                    src={`https://flagcdn.com/20x15/${m.user.mainCountry.toLowerCase()}.png`}
                    alt={m.user.mainCountry}
                    className="inline-block rounded-sm shadow-sm"
                    style={{ width: "1.1em", height: "0.8em", objectFit: "cover" }}
                  />
                )}
                <span className="text-gray-300 truncate text-xs flex-1">{m.content}</span>
                <span className="text-gray-400 text-[10px]">{formatTimeAgo(m.createdAt)}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ✅ Tests preview (now supports limit)
function TestPreview({ limit = 6 }: { limit?: number }) {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function loadTests() {
    setLoading(true);
    try {
    const res = await apiFetch(`/admin/tests/preview`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const shuffled = data.sort(() => 0.5 - Math.random());
        setTests(shuffled.slice(0, limit));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  
  

  useEffect(() => {
    loadTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const categoryLabel = (cat?: string) => {
    const c = (cat || "").toLowerCase();
    if (c === "achievement") return "🏅 Achievement";
    if (c === "fun") return "🎯 Fun";
    return "🧪 Test";
  };

  const categoryColor = (cat?: string) => {
    const c = (cat || "").toLowerCase();
    if (c === "achievement") return "text-amber-300";
    if (c === "fun") return "text-sky-300";
    return "text-gray-300";
  };

  const goToInfo = (t: any) => {
    if (t?.slug) {
      router.push(`/tests/${t.slug}/info`);
      return;
    }
    console.warn("Test preview item missing slug:", t);
  };

  return (
    <div className="relative flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold text-white">Available Tests</h3>
        <button
          onClick={loadTests}
          disabled={loading}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/20 text-sm transition 
            ${loading ? "bg-white/10 text-gray-400 cursor-wait" : "bg-white/10 hover:bg-white/20 text-white"}`}
        >
          {loading ? "⏳ Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {tests.length === 0 && !loading ? (
        <div className="flex-1 rounded-lg bg-white/5 border border-white/10 grid place-items-center text-gray-300 p-6">
          <p className="opacity-80">No tests available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence>
            {tests.map((t) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => goToInfo(t)}
                className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition"
              >
                <img
                  src={t.icon ? asset(t.icon) : asset("default-test.png")}
                  alt={t.title}
                  className="w-12 h-12 mb-2 rounded-full object-cover border border-white/20 shadow-md"
                />
                <span className="text-sm font-semibold text-white truncate text-center max-w-[120px]">
                  {t.title}
                </span>
                <span className={`text-xs mt-1 ${categoryColor(t.category)}`}>
                  {categoryLabel(t.category)}
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ✅ Friends preview (now supports limit)
function FriendsPreview({ limit = 4 }: { limit?: number }) {
  const [friends, setFriends] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    apiFetch(`/friends/preview`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setFriends(data);
      })
      .catch(console.error);
  }, []);

  const shown = friends.slice(0, limit);

  if (shown.length === 0) {
    return (
      <div className="flex-1 rounded-lg bg-white/5 border border-white/10 grid place-items-center text-gray-300 p-6">
        <p className="opacity-80 text-center">You don’t have any friends yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {shown.map((f) => (
        <button
          key={f.id}
          onClick={() => router.push(`/profile/${f.id}`)}
          className="relative flex items-center gap-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition"
        >
          <div className="relative">
            <img
              src={asset(`avatars/${f.avatar || "default.webp"}`)}
              alt={f.name}
              className="w-10 h-10 rounded-full object-cover border border-white/30"
            />
            <span
              className={`absolute bottom-0 right-0 block w-3 h-3 rounded-full border border-black/40 ${
                f.online ? "bg-green-400" : "bg-gray-500"
              }`}
            />
          </div>
          <span className="font-semibold text-sm text-white truncate max-w-[100px]">{f.name}</span>
        </button>
      ))}

      {/* Empty slots to keep grid look */}
      {Array.from({ length: Math.max(0, limit - shown.length) }).map((_, i) => (
        <div key={`empty-${i}`} className="p-2 rounded-lg bg-transparent" />
      ))}
    </div>
  );
}

//DAILY LEADERBOARD ON MOBILE

function DailyLeaderboardPreview() {
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const API = process.env.NEXT_PUBLIC_API_URL!;

  // fetch today's leaderboard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API}/daily-leaderboard/today`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // countdown (same logic as modal)
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const tomorrowUTC = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1
        )
      );

      const diff = Math.floor((tomorrowUTC.getTime() - Date.now()) / 1000);
      setSecondsLeft(diff > 0 ? diff : 0);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = () => {
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const top3 = data?.leaderboard?.slice(0, 3) || [];

  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-3 flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-amber-300">
          🏆 Today’s Leaderboard
        </h2>

        <span className="text-xs text-white/70">
          ⏳ {formatTime()}
        </span>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="text-center text-white/70 text-sm py-4">
          Loading...
        </div>
      ) : data?.active === false ? (
        <div className="text-center text-white/70 text-sm py-4">
          No challenge today 👑
        </div>
      ) : top3.length === 0 ? (
        <div className="text-center text-white/70 text-sm py-4">
          No entries yet 👑
        </div>
      ) : (
        <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
  {top3.map((entry: any, index: number) => (
    <div
      key={entry.id}
      onClick={() => router.push(`/profile/${entry.user.id}`)}
     className={`flex-1 flex flex-col items-center rounded-lg py-2 border cursor-pointer transition
  ${
    index === 0
      ? "bg-yellow-400/20 border-yellow-300/50 shadow-[0_0_20px_rgba(255,215,0,0.6)]"
      : index === 1
      ? "bg-white/10 border-white"
      : index === 2
      ? "bg-amber-700/20 border-amber-400"
      : "bg-white/5 border-white/10 hover:bg-white/10"
  }`} >
      {/* Rank */}
      <div className="text-lg">
        {index === 0 && "🥇"}
        {index === 1 && "🥈"}
        {index === 2 && "🥉"}
      </div>

      {/* Avatar */}
      <img
        src={
          entry.user.avatar
            ? `${API}/avatars/${entry.user.avatar}`
            : "/placeholder.png"
        }
        onError={(e) => (e.currentTarget.src = "/placeholder.png")}
        className="w-8 h-8 rounded-full object-cover border border-white/20 mt-1"
      />

      {/* Name */}
      <div className="text-[11px] font-semibold mt-1 text-center truncate max-w-[80px]">
        {entry.user.name}
      </div>
    </div>
  ))}
</div>
        </div>
      )}

      {/* BUTTON */}
      <div className="mt-3 flex items-center justify-between gap-2">
  {/* Your rank (if not top 3) */}
  {data?.myRank && data.myRank > 3 ? (
    <div className="text-xs text-white/70">
      Your rank: <span className="font-bold text-amber-300">#{data.myRank}</span>
    </div>
  ) : (
    <div />
  )}

  {/* Button */}
  <button
    onClick={() => router.push("/tests")}
    className="px-3 py-1.5 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition text-xs"
  >
    View →
  </button>
</div>
    </div>
  );
}

/* =========================================================
   Main Page Component
   ========================================================= */

export default function DashboardPage() {
  const router = useRouter();

 const [inventoryExpanded, setInventoryExpanded] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // ✅ Mobile hamburger drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  

  // Core page state
  const [user, setUser] = useState<any>(null);
  const profileId = user?.id;

  const {
  prizes,
  lotteryOpen,
  lotteryCooldownMs,
  lotteryAvailable,
  lotteryInventory,
  spinning,
  wheelRotation,
  lotteryResult,
  spinLottery,
  openLottery,
  closeLottery,
  loadLotteryStatus,
} = useLottery(user?.id);

  const showHelpButton = (() => {
  if (!user?.createdAt) return false;

  const created = new Date(user.createdAt).getTime();
  const now = Date.now();

  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

  return now - created < THREE_DAYS;
})();


  const [showOnboarding, setShowOnboarding] = useState(false);
  const [message, setMessage] = useState("Loading...");
  const [rooms] = useState<any[]>([]);
  const [friends] = useState<SimpleFriend[]>([]);

  // Notifications state
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<"all" | "messages">("all");

  // New notifications that arrived while the dropdown was open
const [newWhileOpenIds, setNewWhileOpenIds] = useState<Set<number>>(new Set());

// Helper (immutable Set update)
const addNewWhileOpenRef = useRef<(id: number) => void>(() => {});

useEffect(() => {
  addNewWhileOpenRef.current = (id: number) => {
    setNewWhileOpenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };
}, []);


const clearNewWhileOpen = useCallback((id: number) => {
  setNewWhileOpenIds((prev) => {
    const next = new Set(prev);
    next.delete(id);
    return next;
  });
}, []);


const clearAllNewWhileOpen = useCallback(() => {
  setNewWhileOpenIds(new Set());
}, []);

useEffect(() => {
  if (dropdownOpen) {
    wasOpenRef.current = true;

    // only initialize ON OPEN, not on every notifications change
    setNewWhileOpenIds(
      new Set(notifications.filter((n) => !n.read).map((n) => n.id))
    );
  }
  // ❌ REMOVE notifications from deps
}, [dropdownOpen]);


  // Rooms preview
  const [levels, setLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);

  const current = levels.find((l) => l.level === currentLevel);
  const next = levels.find((l) => l.level === (currentLevel ?? 1) + 1);

const bellWrapMobileRef = useRef<HTMLDivElement>(null);
const bellWrapDesktopRef = useRef<HTMLDivElement>(null);



  // Fetch levels + my current level
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    apiFetch(`/levels`)
      .then((r) => r.json())
      .then((d) => setLevels(d.levels || []))
      .catch(() => {});

    apiFetch(`/levels/mine`)
      .then((r) => r.json())
      .then((d) => setCurrentLevel(d.level || 1))
      .catch(() => {});
  }, []);

  //onboarding useeffect

  async function completeOnboarding() {
  console.log("🔥 onboarding clicked");

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await apiFetch(`/me/onboarding-complete`, {
  method: "POST",
});

    const data = await res.json();
    console.log("✅ onboarding response:", data);
  } catch (err) {
    console.error("❌ onboarding failed:", err);
  }

  setShowOnboarding(false);
}

  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
  const onDocClick = (e: MouseEvent) => {
    const target = e.target as Node;

    const clickedInsideBell =
      bellWrapMobileRef.current?.contains(target) ||
      bellWrapDesktopRef.current?.contains(target);

    const clickedInsideDropdown = dropdownRef.current?.contains(target);

    if (clickedInsideBell || clickedInsideDropdown) return;

    setDropdownOpen(false);
  };

  document.addEventListener("mousedown", onDocClick);
  return () => document.removeEventListener("mousedown", onDocClick);
}, []);


 const dropdownOpenRef = useRef(false);
useEffect(() => {
  dropdownOpenRef.current = dropdownOpen;
}, [dropdownOpen]);

const wasOpenRef = useRef(false);


  // Premium
  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  apiFetch(`/me/entitlements`)
    .then((r) => r.json())
    .then((data) => {
      const premium = !!data?.isPremium;

      setIsPremium(premium);

      // ✅ STEP 1 — SAVE TO LOCALSTORAGE
      localStorage.setItem("isPremium", premium ? "1" : "0");
    })
    .catch(() => {});
}, []);

  // Motion helper
  const fastFade = useMemo(
    () => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }),
    []
  );
 
  /* ===== Mystic Cookie (once per day) ===== */
  const COOKIE_KEY = useMemo(() => `mystic_cookie_last_open_${user?.id ?? "anon"}`, [user?.id]);

  const fortunes = useMemo(
    () => [
      "A powerful alliance will appear when you least expect it.",
      "Your next message will unlock an opportunity.",
      "A badge you haven’t earned yet is closer than it seems.",
      "Build one small thing today — it will compound fast.",
      "Someone is searching for exactly your kind of mind.",
      "Your consistency will outrank your intensity.",
      "A room you enter soon will change your trajectory.",
      "Ask one brave question. The kingdom rewards courage.",
      "Your calm focus is your rarest advantage.",
      "You will meet a collaborator who feels like a cheat code.",
      "A quiet connection today becomes a powerful alliance tomorrow.",
      "One honest message will open a door you didn’t know existed.",
      "Your next room will reward patience more than speed.",
      "A small skill practiced daily becomes royal influence.",
      "Someone is looking for exactly what you can do—be visible.",
      "A badge you want is earned by consistency, not intensity.",
      "Ask a better question, and the kingdom answers faster.",
      "A collaboration begins the moment you stop pretending you’re ready.",
      "A mentor appears after you share your work in public.",
      "Your calm focus is rarer than talent—use it.",
      "An invitation is coming—say yes before fear speaks.",
      "Today’s effort will pay you back twice in a week.",
      "A rival can become a teammate if you lead with respect.",
      "Share progress, not perfection. Progress attracts allies.",
      "A room you avoid holds the lesson you need.",
      "Your reputation grows when you keep promises to yourself.",
      "The best network is built one sincere conversation at a time.",
      "A strategic retreat now prevents a costly battle later.",
      "You are closer to mastery than your doubts admit.",
      "A new title is earned by finishing what you start.",
      "A tiny improvement today creates a big advantage later.",
      "Your next collaborator will feel like a cheat code—be ready.",
      "Let curiosity lead; pride will slow you down.",
      "A skill test you fear becomes a badge you wear.",
      "Someone will remember your kindness longer than your achievements.",
      "Your next win is hidden inside a boring task—do it anyway.",
      "An overlooked connection will bring the best opportunity.",
      "Lead with clarity, and others will follow without asking.",
      "A message you send today becomes a bridge next month.",
      "You will be rewarded for choosing depth over noise.",
      "Your influence grows when you listen first.",
      "A challenge is arriving to sharpen your edge—welcome it.",
      "Your future ally is watching how you handle setbacks.",
      "A room completed slowly still counts as victory.",
      "A new path opens when you simplify your plan.",
      "A quiet week of work creates a loud result.",
      "Your next breakthrough is one edit away from your current draft.",
      "Choose one quest. Finish it. Then choose another.",
      "A strong alliance begins with a clear boundary.",
      "You will gain respect by asking for feedback early.",
      "Your voice carries farther when you speak less, but better.",
      "A small risk taken today becomes a story tomorrow.",
      "The kingdom rewards builders more than talkers.",
      "A friend request you accept will change your direction.",
      "Your next badge is earned by showing up on the hard days.",
      "One useful comment can earn more trust than ten posts.",
      "A shared struggle creates the strongest teams.",
      "Your attention is your gold—spend it carefully.",
      "A new room awaits; bring your curiosity, not your ego.",
      "A helpful stranger will become a trusted ally.",
      "You will win by playing the long game today.",
      "A project you join soon will reveal your hidden strengths.",
      "Your best connections come from being genuinely interested.",
      "You will be remembered for finishing, not starting.",
      "A bold idea becomes real when you write the first line.",
      "Your next collaboration needs your honesty more than your talent.",
      "A skill you ignore is the one that will unlock your next level.",
      "Your progress will accelerate when you measure it weekly.",
      "A respectful “no” protects your future “yes.”",
      "Your next message will land at the perfect time.",
      "Your crown is built from habits, not luck.",
      "A new alliance forms when you share a clear goal.",
    ],
    []
  );

  const [cookieOpen, setCookieOpen] = useState(false);
  const [cookieFortune, setCookieFortune] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);

  function getRemainingMs(): number {
    if (typeof window === "undefined") return 0;
    const raw = localStorage.getItem(COOKIE_KEY);
    const last = raw ? Number(raw) : 0;
    if (!last) return 0;

    const ms24h = 24 * 60 * 60 * 1000;
    const nextTime = last + ms24h;
    return Math.max(0, nextTime - Date.now());
  }

  useEffect(() => {
    const update = () => setCooldownMs(getRemainingMs());
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [COOKIE_KEY]);

  const cookieAvailable = cooldownMs <= 0;

  function formatCooldown(ms: number) {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function openMysticCookie() {
    if (!cookieAvailable) return;

    const USED_KEY = `mystic_cookie_used_${user?.id ?? "anon"}`;

    let used: number[] = [];
    try {
      used = JSON.parse(localStorage.getItem(USED_KEY) || "[]");
      if (!Array.isArray(used)) used = [];
    } catch {
      used = [];
    }

    if (used.length >= fortunes.length) used = [];

    const remaining = fortunes
      .map((_, i) => i)
      .filter((i) => !used.includes(i));

    const idx = remaining[Math.floor(Math.random() * remaining.length)];
    const pick = fortunes[idx];

    setCookieFortune(pick);
    setCookieOpen(true);

    localStorage.setItem(COOKIE_KEY, String(Date.now()));
    localStorage.setItem(USED_KEY, JSON.stringify([...used, idx]));

    setCooldownMs(getRemainingMs());
  }

  function closeMysticCookie() {
    setCookieOpen(false);
  }

  // ✅ Responsive wheel size
const [wheelSize, setWheelSize] = useState(320);

// ✅ Dynamic sizing helpers
const radius = wheelSize * 0.35;
const pointerSize = wheelSize * 0.04;

useEffect(() => {
  function update() {
    requestAnimationFrame(() => {
      setWheelSize(Math.min(window.innerWidth * 0.72, 320));
    });
  }

  update();
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
}, []);
  



  function formatLotteryCooldown(ms: number) {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

 

  /* -------------------------------------------------------
     Load profile + notifications
     ------------------------------------------------------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("❌ Please log in first.");
      setTimeout(() => router.push("/login"), 1200);
      return;
    }

    apiFetch(`/profile`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load profile");
        }
        return res.json();
      })
      .then((data) => {
  setUser(data.user);
  setMessage("");

  // ✅ Onboarding trigger
  if (!data.user?.hasSeenOnboarding) {
    setTimeout(() => {
      setShowOnboarding(true);
    }, 500); // small delay so UI renders first
  }
})
      .catch((err) => {
  console.error(err);
});

   apiFetch(`/notifications/unread-count`)
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unread ?? 0))
      .catch(() => {});

    apiFetch(`/notifications`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.notifications)) {
          setNotifications(d.notifications as NotificationItem[]);
        }
      })
      .catch(() => {});
  }, [router]);

  
useEffect(() => {
  if (mobileMenuOpen) {
    loadLotteryStatus();
  }
}, [mobileMenuOpen, loadLotteryStatus]);

  /* -------------------------------------------------------
     Socket.IO events
     ------------------------------------------------------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = getSocket();
    if (!socket) return;
  
  

    const onNotification = (note: NotificationItem) => {
  // ✅ prevent duplicates
  setNotifications((prev) => {
    if (prev.some((n) => n.id === note.id)) return prev;
    return [note, ...prev].slice(0, 50);
  });

  setUnreadCount((c) => (note.read ? c : c + 1));

 if (dropdownOpenRef.current) {
  addNewWhileOpenRef.current(note.id);
}else {
    // 🔥 ONLY SHOW TOAST IF DROPDOWN CLOSED
    showToast(note);
  }
};


    const onForceLogout = (payload: any) => {
      console.log("⚠️ force_logout:", payload?.reason || "Session ended");
      localStorage.removeItem("token");
      router.push("/login");
    };

    socket.on("notification", onNotification);
    socket.on("force_logout", onForceLogout);

    return () => {
      socket.off("notification", onNotification);
      socket.off("force_logout", onForceLogout);
    };
 }, []);

  
 const messageNotifications = notifications.filter(
  (n) => n.type === "dm"
);

const systemNotifications = notifications.filter(
  (n) => n.type !== "dm"
);

  /* -------------------------------------------------------
     Notifications helpers
     ------------------------------------------------------- */
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString([], {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };


function showToast(note: NotificationItem) {
  const el = document.createElement("div");

  el.innerText = `${note.title}\n${note.message}`;

  el.className = `
    fixed top-4 right-4 z-[99999]
    bg-[#1e1f22] text-white px-4 py-3 rounded-lg
    border border-white/10 shadow-xl
    cursor-pointer hover:scale-105 transition
    whitespace-pre-line
  `;

  el.onclick = () => {
    router.push(note.url || "/chat");
  };

  document.body.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 4000);
}

  async function markAsRead(id: number) {
    const token = localStorage.getItem("token");
    await apiFetch(`/notifications/${id}/read`, {
  method: "POST",
});
    setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function deleteNotification(id: number) {
  const token = localStorage.getItem("token");


  // find notification BEFORE deleting
  const notif = notifications.find((n) => n.id === id);

  await apiFetch(`/notifications/${id}`, {
    method: "DELETE",
  });

  setNotifications((n) => n.filter((x) => x.id !== id));

  // ✅ FIX: update unread count
  if (notif && !notif.read) {
    setUnreadCount((c) => Math.max(0, c - 1));
  }
}
  async function deleteAllNotifications() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await apiFetch(`/notifications/delete-all`, {
  method: "DELETE",
});
   clearAllNewWhileOpen();
    // even if backend not ready, UI clears:
    setNotifications([]);
    setUnreadCount(0);
  } catch {
    // UI fallback:
    setNotifications([]);
    setUnreadCount(0);
  }
}

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />

      {/* =====================================================
          ✅ MOBILE TOP BAR (phones only)
         ===================================================== */}
      <div className="md:hidden relative z-10 max-w-7xl mx-auto px-4 pt-4 flex items-center justify-between">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 grid place-items-center text-2xl">
            👑
          </div>
          <div className="text-left leading-tight">
            <p className="text-[11px] text-gray-200">Welcome to</p>
            <p className="text-sm font-extrabold text-amber-300">Networ.King</p>
          </div>
        </button>

        <div className="flex items-center gap-2">

  {/* 🔊 AUDIO BUTTON */}
  {showHelpButton && (
    <MiniAudioPlayer src="/audio/onboarding.mp3" />
  )}

  {/* Bell */}
  <div className="relative z-[9999]" ref={bellWrapMobileRef}>
    <button 
     onClick={() => {
  const hasMessageNotifs = notifications.some(
    (n) => n.type === "dm" && !n.read
  );

  setNotifTab(hasMessageNotifs ? "messages" : "all");
  setDropdownOpen((v) => !v);
}}
      className={`relative px-3 py-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition ${
        unreadCount > 0 ? "ring-2 ring-amber-400/60" : ""
      }`}
      title="Notifications"
    >
      🔔
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  </div>

  {/* ✅ Premium crown icon */}
  <button
    onClick={() => router.push("/Subscription")}
    className={[
      "px-3 py-2 rounded-lg border transition",
      isPremium
        ? "border-yellow-400/70 text-yellow-300 bg-white/10 shadow-[0_0_12px_rgba(255,215,0,0.55)] ring-1 ring-yellow-300/40"
        : "border-white/20 text-white bg-white/10 hover:bg-white/15",
    ].join(" ")}
    title="Premium"
    aria-label="Premium"
  >
    🪙
  </button>

  {/* Hamburger */}
  <button
    onClick={() => setMobileMenuOpen(true)}
    className="px-3 py-2 rounded-lg bg-white/10 border border-white/20"
    aria-label="Open menu"
  >
    ☰
  </button>
</div>

      </div>

      {/* =====================================================
          ✅ DESKTOP/TABLET TOP BAR (md+)
         ===================================================== */}
      <div className="hidden md:flex relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-6 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 grid place-items-center text-2xl">
            👑
          </div>
          <button onClick={() => router.push("/dashboard")}>
            <div className="leading-tight">
              <p className="text-gray-200 text-sm">Welcome back to</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-300 drop-shadow-md">
                Networ.King
              </h1>
            </div>
          </button>
        </div>

        {user?.role === "admin" && (
          <button
            onClick={() => router.push("/admin")}
            className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold border border-white/20 transition"
            title="Admin Panel"
          >
            🛠 Admin Panel
          </button>
        )}

        <div className="flex items-center gap-3">

          {showHelpButton && (
  <>
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowOnboarding(true)}
        className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-silver transition"
        title="Quick guide"
      >
        💡❓
      </button>

      {/* 🔊 AUDIO BUTTON */}
      <MiniAudioPlayer src="/audio/onboarding.mp3" />
    </div>

    {/* separator */}
    <div className="h-14 w-[2px] bg-gradient-to-b from-white/10 via-white/60 to-white/10 opacity-70" />
  </>
)}
          <button
            onClick={() => router.push("/Subscription")}
            className={`px-5 py-3 rounded-xl font-bold transition-all ${
              isPremium
                ? "border border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(255,215,0,0.45)]"
                : "border border-white/30 text-white hover:border-white/60"
            }`}
          >
            👑 Premium
          </button>

          <button
            onClick={() => router.push("/settings")}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition"
            title="Settings"
          >
            ⚙️ Settings
          </button>

  

          <div className="relative z-[9999]" ref={bellWrapDesktopRef}>
            <button
              onClick={() => {
  const hasMessageNotifs = notifications.some(
    (n) => n.type === "dm" && !n.read
  );

  setNotifTab(hasMessageNotifs ? "messages" : "all");
  setDropdownOpen((v) => !v);
}}
              className={`relative px-3 py-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition ${
                unreadCount > 0 ? "ring-2 ring-amber-400/60" : ""
              }`}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 font-semibold transition shadow-lg"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* =====================================================
    ✅ Notifications Dropdown (responsive width)
   ===================================================== */}
{dropdownOpen && (
  <Portal>
    <div className="fixed inset-0 z-[9999] flex justify-center sm:justify-end pt-20 sm:pr-6 pointer-events-none px-3">
      <div
        ref={dropdownRef}
        className="
          w-[92vw] sm:w-[340px]
          rounded-xl bg-slate-900/95 border border-white/15 shadow-2xl backdrop-blur-md
          pointer-events-auto overflow-hidden
          flex flex-col
          max-h-[240px] sm:max-h-[60vh]
        "
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 p-3 border-b border-white/10 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
  <button
    onClick={() => setNotifTab("all")}
    className={`px-2 py-1 rounded text-xs ${
      notifTab === "all"
        ? "bg-amber-400/30 text-amber-200"
        : "text-gray-300 hover:bg-white/10"
    }`}
  >
    🔔 All
  </button>

  <button
    onClick={() => setNotifTab("messages")}
    className={`px-2 py-1 rounded text-xs ${
      notifTab === "messages"
        ? "bg-emerald-400/30 text-emerald-200"
        : "text-gray-300 hover:bg-white/10"
    }`}
  >
    💬 Messages
  </button>
</div>

          <button
            onClick={deleteAllNotifications}
            className="text-xs px-2 py-1 rounded bg-red-500/20 border border-red-500/30 text-red-200 hover:bg-red-500/30"
          >
            Delete all
          </button>
        </div>

        

        {/* Body: fills remaining height and scrolls */}
<div className="flex-1 overflow-auto">
  {(() => {
    const visibleNotifications =
      notifTab === "messages"
        ? messageNotifications
        : systemNotifications;

    if (visibleNotifications.length === 0) {
      return (
        <div className="p-4 text-sm text-gray-300">
          No notifications yet.
        </div>
      );
    }

    return (
      <ul className="divide-y divide-white/10">
        {visibleNotifications.map((n) => {
          const isNewWhileOpen = newWhileOpenIds.has(n.id);

          return (
            <li
              key={n.id}
              className={[
                "p-2 sm:p-3 transition relative",
                !n.read ? "bg-amber-400/10" : "hover:bg-white/10",
                isNewWhileOpen
                  ? "ring-2 ring-emerald-400/70 shadow-[0_0_18px_rgba(52,211,153,0.55)]"
                  : "",
              ].join(" ")}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                    n.read
                      ? "bg-transparent border border-white/20"
                      : "bg-amber-400"
                  }`}
                  title={n.read ? "Read" : "Unread"}
                />

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-white text-sm sm:text-base truncate">
                      {n.title}
                    </p>
                    <span className="text-[9px] sm:text-[10px] text-gray-400 flex-shrink-0">
                      {formatTime(n.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-200 mt-0.5 line-clamp-2 sm:line-clamp-none">
                    {n.message}
                  </p>

                  <div className="flex gap-2 mt-2 flex-wrap">
                    {n.url && (
                      <button
                        onClick={async () => {
                          clearNewWhileOpen(n.id);

                          if (!n.read) {
                            await markAsRead(n.id);
                          }

                          const id = localStorage.getItem("userId") || "";
                          const type = (n.type || "").toLowerCase();

                          let finalUrl = n.url || "/dashboard";

                          if (type === "friend_request") {
                            finalUrl = "/friends?tab=requests&sub=incoming";
                          }

                          if (type === "friend_accept") {
                            finalUrl = "/friends";
                          }

                          if (type === "badge" && id) {
                            finalUrl = `/profile/${id}`;
                          }

                          router.push(finalUrl);
                          setDropdownOpen(false);
                        }}
                        className="text-[11px] sm:text-xs px-2 py-1 rounded bg-amber-400/20 border border-amber-400/30 text-amber-200 hover:bg-amber-400/30"
                      >
                        Open
                      </button>
                    )}

                    <button
                      onClick={() => {
                        clearNewWhileOpen(n.id);
                        deleteNotification(n.id);
                      }}
                      className="text-[11px] sm:text-xs px-2 py-1 rounded bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30"
                    >
                      Delete
                    </button>

                    <button
                      onClick={() => {
                        clearNewWhileOpen(n.id);
                        markAsRead(n.id);
                      }}
                      className="text-[11px] sm:text-xs px-2 py-1 rounded bg-gray-500/20 border border-gray-400/30 text-gray-200 hover:bg-gray-500/30"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  })()}
</div>
</div>
</div>
</Portal>
)}



      {/* =====================================================
          ✅ Mobile Drawer Menu
         ===================================================== */}
      {mobileMenuOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-[10000] bg-white/10 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="
  absolute right-0 top-0 h-full w-[86%] max-w-sm p-4
  border-l border-white/10
  bg-gradient-to-br from-blue-700 via-indigo-900 to-amber-400
  shadow-2xl
"

            >
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-amber-300">Menu</p>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/10"
                >
                  ✕
                </button>
              </div>

              <button
                onClick={() => {
                  router.push("/Subscription");
                  setMobileMenuOpen(false);
                }}
                className={`w-full mb-3 px-4 py-3 rounded-xl font-bold border transition ${
                  isPremium
                    ? "border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(255,215,0,0.45)]"
                    : "border-silver text-white hover:border-white/50"
                }`}
              >
                👑 Premium
              </button>

                  {/* Daily widgets  (mobile) */}

             <button
 onClick={() => {
  setMobileMenuOpen(false);
  openLottery();
}}
  className={[
    "w-full py-3 rounded-2xl mb-1",
    "border-2 border-amber-400/80 ring-1 ring-amber-300/50",
    "shadow-xl transition-all text-left px-4",
    lotteryAvailable
      ? "bg-[rgba(169,169,169,0.22)] text-white active:scale-[0.99]"
      : "bg-[rgba(64,63,63,0.22)] text-white active:scale-[0.99]",
  ].join(" ")}
>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span>💎</span>
      <span className="font-semibold">Daily Lottery</span>
    </div>

    <span className="text-[11px] font-medium">
      {lotteryAvailable
        ? "Ready"
        : formatLotteryCooldown(lotteryCooldownMs)}
    </span>
  </div>
</button>

            
           {/* ✅ Mystic Cookie (in menu) */}

<div className="mt-2 bg-black/20 shadow-[0_0_20px_rgba(0,0,0,0.25)]
 rounded-2xl mb-2 overflow-hidden">
  <button
    onClick={() => {
      setMobileMenuOpen(false);
      openMysticCookie();
    }}
    disabled={!cookieAvailable}
    className={[
      "relative w-full px-4 py-3 rounded-2xl font-bold text-left",
      "border-2 border-amber-400/80 ring-1 ring-amber-300/50",
      "bg-gradient-to-br from-white/80 via-amber-50/60 to-stone-100/80",
      "shadow-md transition-all",
      cookieAvailable
        ? "active:scale-[0.99]"
        : "opacity-80 cursor-not-allowed",
    ].join(" ")}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🥠</span>
        <span className="text-gray-900">Mystic Cookie</span>
      </div>
      <span className="text-[11px] font-medium text-gray-700">
        {cookieAvailable ? "Ready" : formatCooldown(cooldownMs)}
      </span>
    </div>
  </button>
</div>


              <button
  onClick={() => {
    router.push("/tests");
    setMobileMenuOpen(false);
  }}
  className="
    w-full mb-3 mt-2 px-4 py-4 rounded-xl
    font-bold text-white
    bg-gradient-to-r from-indigo-500 via-purple-600 to-amber-400
    border border-white/20
    shadow-[0_0_20px_rgba(255,180,0,0.35)]
    animate-pulse
    active:scale-[0.98]
    transition-all
  "
>
  🚀 Go to Tests
</button>



              <button
  onClick={() => {
    router.push("/settings");
    setMobileMenuOpen(false);
  }}
  className="
    w-full mb-8 mt-1 px-4 py-3 rounded-xl
    bg-white/10
    border border-gray-300
    text-gray-200
    hover:border-gray-100
    transition-colors
  "
>
  ⚙️ Settings
</button>

<div className="mb-5">
        <div className="mb-3 h-px w-full bg-gradient-to-r from-transparent via-white to-transparent" />
      </div>

<button
  
  onClick={() => {
    setShowOnboarding(true);
    setDropdownOpen(false); // if inside dropdown
    setMobileMenuOpen(false)
  }}
   className="w-full mt-4 px-4 py-3 rounded-xl bg-amber-400 text-gray-900 font-semibold"
               
>
  
  🧭 Replay onboarding
</button>
 


              {user?.role === "admin" && (
                <button
                  onClick={() => {
                    router.push("/admin");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full mb-3 px-4 py-3 rounded-xl bg-amber-500 text-gray-900 font-semibold"
                >
                  🛠 Admin Panel
                </button>
              )}

              

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLogoutConfirmOpen(true);
                }}
                className="w-full mt-4 px-4 py-3 rounded-xl bg-red-600 font-semibold"
              >
                Log Out
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* =====================================================
          Logout confirmation (unchanged)
         ===================================================== */}
      {logoutConfirmOpen && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center bg-white/30 backdrop-blur-md z-[10000] px-4"
            onClick={() => setLogoutConfirmOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[480px] p-8 md:p-10 rounded-3xl text-center
                 bg-white/30 backdrop-blur-lg border border-white/40
                 shadow-[0_10px_40px_rgba(0,0,0,0.1)]"
            >
              <h2 className="text-2xl md:text-3xl font-light tracking-wide text-gray-900 mb-4">
                Leaving so early?
              </h2>

              <p className="text-gray-700 text-sm mb-8 leading-relaxed">
                Are you sure you want to leave{" "}
                <span className="text-gray-900 font-medium">Networ.King?</span>?
              </p>

              <div className="flex justify-center gap-4 md:gap-5">
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    router.push("/login");
                  }}
                  className="px-6 py-3 rounded-full font-semibold
                     bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900
                     hover:from-gray-200 hover:to-gray-300
                     transition-all duration-200 shadow-lg"
                >
                  Log Out
                </button>

                <button
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="px-6 py-3 rounded-full font-semibold
                     bg-white/50 text-gray-900 border border-white/40
                     hover:bg-white/70 hover:text-gray-900
                     transition-all duration-200 shadow-inner"
                >
                  Cancel
                </button>
              </div>

              <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/30" />
            </div>
          </div>
        </Portal>
      )}

      {/* =====================================================
          MAIN CONTENT
         ===================================================== */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-10 pb-12">
        {/* =========================
            ✅ MOBILE LAYOUT (phones)
           ========================= */}
        <div className="md:hidden mt-5 space-y-4">
          {/* 2) ID Card (mobile) */}
          <motion.div
  id="onboarding-profile"
  {...fastFade}
  transition={{ duration: 0.45 }}
  className="relative overflow-hidden rounded-2xl p-4 bg-white/10 backdrop-blur-md shadow-2xl border border-amber-300/40"
>
            <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent [background:linear-gradient(45deg,#ffd700,#7c3aed,#22d3ee)_border-box] [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude] opacity-50" />

            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-4">
  {/* Avatar (left) */}
  <div
    className="relative"
    onClick={(e) => {
      e.stopPropagation();
      router.push("/avatar");
    }}
    title="Change Avatar"
  >
    <img
  src={user.avatar ? asset(`avatars/${user.avatar}`) : asset("avatars/default.webp")}
  alt="User Avatar"
  className="w-20 h-20 rounded-full border-[4px] border-amber-400 shadow-lg"
/>
  </div>

  {/* Name (top-right) */}
  <div className="flex-1 min-w-0 flex flex-col items-end">
    <p className="text-3xl font-extrabold truncate text-right w-full">{user.name}</p>
    <p className="text-xs text-gray-200 italic mt-1 text-right w-full">“You're remarkable!'”</p>
  </div>
</div>


                {/* Button left + badges right */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/profile/${user.id}`);
                    }}
                    className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 font-semibold shadow-md transition text-xs"
                  >
                    View Profile
                  </button>

                  <div
  onClick={() => router.push(`/profile/${profileId}/badges`)}
  className="cursor-pointer"
  title="View badges"
>
  <BadgeStack
    badges={
      Array.isArray(user?.featuredBadges) && user.featuredBadges.length > 0
        ? user.featuredBadges
        : user.badges || []
    }
    isFeatured={Array.isArray(user?.featuredBadges) && user.featuredBadges.length > 0}
  />
</div>
                </div>
              </div>
            ) : (
              <p className="text-gray-200">Loading your profile…</p>
            )}
          </motion.div>

          {/* 3) My Rooms (thin) */}
          <motion.div
            id="onboarding-rooms"
            {...fastFade}
            transition={{ delay: 0.05, duration: 0.45 }}
            className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-4 flex flex-col"
          >
            <h2 className="text-lg font-bold text-amber-300 mb-1">🏰 My Rooms</h2>
            <p className="text-gray-200 text-sm mb-3"></p>

            {currentLevel && current && (
              <div className="mb-3 rounded-xl bg-gradient-to-r from-amber-400/10 to-purple-500/10 border border-white/10 p-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-300">Current Room</p>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-base font-extrabold text-amber-300 flex items-center gap-2">
                    <span>{levelEmoji(current.level)}</span>
                    Lv. {current.level}
                  </span>

                  {next && (
                    <span className="text-[10px] text-gray-400">
                      Next: {levelEmoji(next.level)} Lv. {next.level}
                    </span>
                  )}
                </div>
              </div>
            )}

          <div className="flex-1">
  {rooms.length > 0 ? (
    <ul className="space-y-3">{/* Room items */}</ul>
  ) : (
    <div className="py-1" />
  )}
</div>


            <button
              onClick={() => router.push("/myrooms")}
              className=" w-full px-4 py-2 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition text-sm"
            >
              See All My Rooms →
            </button>
          </motion.div>

          {/* 4) Global Chat (thin + 1 message preview) */}
          <motion.div
          id="onboarding-chat"
            {...fastFade}
            transition={{ delay: 0.08, duration: 0.45 }}
            className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-4 flex flex-col"
          >
            <h2 className="text-lg font-bold text-amber-300 mb-2">🌐 Global Chat</h2>

            <GlobalChatPreview limit={1} compact />


            <div className="mt-3">
              <button
                onClick={() => router.push("/chat/global")}
                className="w-full px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-sm"
              >
                💬 Open Chat
              </button>
            </div>
          </motion.div>

        

          {/* 5) Tests & Badges (thin + 4 tests) */}
          <motion.div
          id="onboarding-tests"
            {...fastFade}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-4 flex flex-col"
          >
            <h2 className="text-lg font-bold text-amber-300 mb-1">🎖️ Tests & Badges</h2>
            <p className="text-gray-200 text-sm mb-3">
              Take tests and earn badges.
            </p>

            <div className="flex-1">
              <TestPreview limit={4} />
            </div>

            <button
              onClick={() => router.push("/tests")}
              className="mt-3 w-full px-5 py-2.5 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition text-sm"
            >
              Open Tests
            </button>
          </motion.div>

            {/* 5.5) Daily Leaderboard (mobile only) */}
<motion.div
  {...fastFade}
  transition={{ delay: 0.09, duration: 0.45 }}
>
  <DailyLeaderboardPreview />
</motion.div>



 {/* 6) My Friends (thin + 2 preview) */}
          <motion.div
          id="onboarding-friends"
            {...fastFade}
            transition={{ delay: 0.14, duration: 0.45 }}
            className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-4 flex flex-col"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-amber-300 mb-1">🤝 My Friends</h2>
                <p className="text-gray-200 text-sm mb-3">Your network</p>
              </div>
              <button
                onClick={() => router.push("/friends?find=1")}
                className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-xs"
                title="Find Friends"
              >
                Find
              </button>
            </div>

            <div className="flex-1">
              <FriendsPreview limit={2} />
            </div>

            <button
              onClick={() => router.push("/friends")}
              className="mt-3 w-full px-4 py-2 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition text-sm"
            >
              See All Friends →
            </button>
          </motion.div>

          {/* 7) Training */}
          <motion.div
            {...fastFade}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-4 flex flex-col"
          >
            <h2 className="text-lg font-bold text-amber-300 mb-2">🏹 Training</h2>
            <p className="text-gray-200 text-sm mb-3">
              Practice drills and challenges to sharpen teamwork.
            </p>
            <button
              onClick={() => router.push("/training")}
              className="w-full px-5 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 font-semibold transition text-sm"
            >
              Open Training
            </button>
          </motion.div>

         

          {/* 8) Video Library hidden on phones => not rendered here */}

          {/* 9) Footer links smaller grid */}
          <div className="pt-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Help", "/help"],
                ["Contact", "/contact"],
                ["About", "/about"],
                ["Privacy", "/privacy"],
              ].map(([label, href]) => (
                <button
                  key={label}
                  onClick={() => router.push(href)}
                  className="w-full px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm"
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-300 mt-4">
              © {new Date().getFullYear()} Networ.King
            </p>

            
          </div>
        </div>

        {/* =========================
            ✅ TABLET+DESKTOP LAYOUT (md+)
            (your original layout, with small adjustments:
             - video visible from md
            )
           ========================= */}
        <div className="hidden md:block">
          {/* ===== Row 1 ===== */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: ID Card */}
            <motion.div
            id="onboarding-profile"
              {...fastFade}
              transition={{ duration: 0.5 }}
              className="lg:col-span-2 relative overflow-hidden rounded-2xl p-6 bg-white/10 backdrop-blur-md shadow-2xl border border-amber-300/40"
            >
              <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent [background:linear-gradient(45deg,#ffd700,#7c3aed,#22d3ee)_border-box] [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude] opacity-50" />
              {user ? (
                <div className="flex items-center gap-6">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => router.push("/avatar")}
                    title="Change Avatar"
                  >
                   <img
  src={user.avatar ? asset(`avatars/${user.avatar}`) : asset("avatars/default.webp")}
  alt="User Avatar"
  className="w-24 h-24 rounded-full border-[4px] border-amber-400 shadow-lg transition-transform group-hover:scale-105"
/>
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/40 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                      Edit
                    </span>
                  </div>

                  <div className="flex-[1] min-w-0">
                    <p className="text-2xl font-extrabold truncate">{user.name}</p>
                    <p className="text-sm text-gray-200 italic mt-1">“You are awesome!”</p>
                    <button
                      onClick={() => router.push(`/profile/${user.id}`)}
                      className="mt-3 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 font-semibold shadow-md transition"
                    >
                      View My Profile
                    </button>
                  </div>

                  <BadgeStack
                    badges={
                      Array.isArray(user?.featuredBadges) && user.featuredBadges.length > 0
                        ? user.featuredBadges
                        : user.badges || []
                    }
                    isFeatured={Array.isArray(user?.featuredBadges) && user.featuredBadges.length > 0}
                  />
                </div>
              ) : (
                <p className="text-gray-200">Loading your profile…</p>
              )}
            </motion.div>

            {/* Right: Daily widgets (desktop stays) */}
            <motion.div
              {...fastFade}
              transition={{ delay: 0.05, duration: 0.5 }}
              className="flex flex-col gap-4"
            >
              <button
                onClick={openMysticCookie}
                disabled={!cookieAvailable}
                className={[
                  "relative w-full rounded-2xl",
                  "border-2 border-amber-400/80 ring-1 ring-amber-300/50",
                  "bg-gradient-to-br from-white/80 via-amber-50/60 to-stone-100/80",
                  "p-6 shadow-md transition-all",
                  cookieAvailable
                    ? "hover:shadow-lg hover:scale-[1.015]"
                    : "opacity-60 cursor-not-allowed",
                ].join(" ")}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🥠</div>

                  <div>
                    <div className="text-lg font-bold text-gray-900">Mystic Cookie</div>

                    <div className="mt-1 text-xs text-gray-700">
                      {cookieAvailable
                        ? "Available now (once per day)"
                        : `Next available in ${formatCooldown(cooldownMs)}`}
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={openLottery}
                className="
                  w-full py-5 rounded-2xl
                  bg-[rgba(169,169,169,0.22)]
                  border-2 border-amber-400/80 ring-1 ring-amber-300/50
                  text-lg font-semibold text-white
                  shadow-xl
                  hover:bg-[rgba(169,169,169,0.32)]
                  transition-all hover:scale-[1.02]
                "
              >
                💎 Daily Lottery
              </button>
            </motion.div>
          </div>

          <div className="h-4" />

          {/* ===== Row 2 ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              id="onboarding-chat"
              {...fastFade}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-6 min-h-[280px] flex flex-col"
            >
              <h2 className="text-2xl font-bold text-amber-300 mb-2">🌐 Global Chat</h2>
              <GlobalChatPreview limit={3} />
              <div className="mt-auto pt-4">
                <button
                  onClick={() => router.push("/chat/global")}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold"
                >
                  💬 Open Chat
                </button>
              </div>
            </motion.div>

            <motion.div
              id="onboarding-rooms"
              {...fastFade}
              transition={{ delay: 0.12, duration: 0.5 }}
              className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-6 min-h-[280px] flex flex-col"
            >
              <h2 className="text-2xl font-bold text-amber-300 mb-1">🏰 My Rooms</h2>
              <p className="text-gray-200 mb-3">Your current progress</p>

              {currentLevel && current && (
                <div className="mb-4 rounded-xl bg-gradient-to-r from-amber-400/10 to-purple-500/10 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-300">Current Room's Level</p>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xl font-extrabold text-amber-300 flex items-center gap-2">
                      <span>{levelEmoji(current.level)}</span>
                      Lv. {current.level}
                      {current.name && (
                        <span className="text-sm font-medium text-white/80 ml-1">— {current.name}</span>
                      )}
                    </span>

                    {next && (
                      <span className="text-xs text-gray-400">
                        Next: {levelEmoji(next.level)} Lv. {next.level}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto">
                {rooms.length > 0 ? (
                  <ul className="space-y-3">{/* Room items */}</ul>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-xs text-gray-400 italic">
                      Open the next door to start progressing 🚀
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push("/myrooms")}
                className="mt-4 w-full px-4 py-2 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition"
              >
                See All My Rooms →
              </button>
            </motion.div>
          </div>

          <div className="h-4" />

          {/* ===== Row 3 ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <motion.div
               id="onboarding-friends"
                {...fastFade}
                transition={{ delay: 0.16, duration: 0.5 }}
                className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-6 min-h-[180px] flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-amber-300 mb-1">🤝 My Friends</h2>
                    <p className="text-gray-200 mb-3">Your network at a glance</p>
                  </div>
                  <button
                    onClick={() => router.push("/friends")}
                    className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-sm"
                    title="Find Friends"
                  >
                    Find Friends
                  </button>
                </div>

                <div className="flex-1">
                  <FriendsPreview limit={4} />
                </div>

                <button
                  onClick={() => router.push("/friends")}
                  className="mt-4 w-full px-4 py-2 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition"
                >
                  See All Friends →
                </button>
              </motion.div>

              {/* ✅ Video Library visible on tablets+ (md+) */}
              <motion.div
                {...fastFade}
                transition={{ delay: 0.18, duration: 0.5 }}
                className="hidden md:flex rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-6 min-h-[200px] flex-col"
              >
                <h2 className="text-2xl font-bold text-amber-300 mb-4">🎬 Video Library</h2>

                <div className="relative flex flex-col flex-1 p-4 rounded-xl">
                  <p className="text-gray-200 mb-6">
                    Tutorials, talks, and highlights to level up your collaboration skills.
                  </p>

                  <div className="mt-auto">
                    <button
                      disabled
                      className="px-5 py-3 rounded-lg bg-white/20 text-white font-semibold cursor-not-allowed"
                    >
                      Browse Videos
                    </button>
                  </div>

                  <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-xl
                               flex items-center justify-center z-10
                               border-2 border-white/30
                               shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                  >
                    <div
                      className="flex items-center gap-2 bg-black/70 px-5 py-2.5 rounded-full
                                 text-white text-sm font-medium
                                 border-2 border-white/50
                                 shadow-[0_0_18px_rgba(255,255,255,0.25)]"
                    >
                      🔒 <span>Coming Soon</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                {...fastFade}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-6 min-h-[160px] flex flex-col"
              >
                <h2 className="text-2xl font-bold text-amber-300 mb-2">🏹 Training</h2>
                <p className="text-gray-200 mb-4">
                  Practice drills and challenges to sharpen real-world teamwork.
                </p>
                <div className="mt-auto">
                  <button
                    onClick={() => router.push("/training")}
                    className="px-5 py-3 rounded-lg bg-white/20 hover:bg-white/30 font-semibold transition-transform hover:scale-105"
                  >
                    Open Training
                  </button>
                </div>
              </motion.div>
            </div>

            <motion.div
              id="onboarding-tests"
              {...fastFade}
              transition={{ delay: 0.22, duration: 0.5 }}
              className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/15 p-6 min-h-[560px] flex flex-col"
            >
              <h2 className="text-2xl font-bold text-amber-300 mb-2">🎖️ Tests & Badges</h2>
              <p className="text-gray-200 mb-4">
                Take IQ, EQ, and other skill tests. Showcase your results as badges.
              </p>
              <div className="flex-1">
                <TestPreview limit={6} />
              </div>
              <button
                onClick={() => router.push("/tests")}
                className="mt-4 w-full px-5 py-3 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition-transform hover:scale-105"
              >
                Open Tests
              </button>
            </motion.div>

            
          </div>

          



          {/* Footer links row */}
          <div className="mt-10">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ["Help", "/help"],
                ["Contact", "/contact"],
                ["Careers", "/careers"],
                ["About", "/about"],
                ["Privacy", "/privacy"],
              ].map(([label, href]) => (
                <button
                  key={label}
                  onClick={() => router.push(href)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10"
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-300 mt-6">
              © {new Date().getFullYear()} Networ.King
            </p>
          </div>
        </div>
      </div>

      {/* ===== Cookie modal (unchanged) ===== */}
      <AnimatePresence>
        {cookieOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={closeMysticCookie}
          >
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="w-full max-w-xl rounded-3xl bg-gradient-to-b from-white/15 to-white/5 border border-amber-300/40 shadow-2xl p-6 md:p-8 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/70 font-semibold">Networ.King</p>
                  <h2 className="text-2xl md:text-3xl font-extrabold mt-1">Mystic Cookie</h2>
                  <p className="text-white/70 mt-2">
                    Your daily omen for alliances, rooms, and victories.
                  </p>
                </div>

                <button
                  onClick={closeMysticCookie}
                  className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 transition"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-8 flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.9, rotate: -6 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  className="text-7xl md:text-8xl select-none"
                >
                  🥠
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.35 }}
                  className="mt-3 text-white/80 text-sm"
                >
                  *crack*
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="mt-6 w-full rounded-2xl bg-black/20 border border-white/10 p-5 text-center"
                >
                  <p className="text-lg md:text-xl font-semibold leading-relaxed">
                    {cookieFortune ?? "A quiet blessing arrives when you keep moving."}
                  </p>
                </motion.div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={closeMysticCookie}
                    className="px-5 py-3 rounded-2xl bg-amber-400 text-gray-900 font-bold shadow-lg hover:bg-amber-300 transition"
                  >
                    Claim & Close
                  </button>
                </div>

                <p className="mt-4 text-xs text-white/60">
                  Next cookie available in {formatCooldown(cooldownMs)}.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Lottery modal (unchanged) ===== */}
      <AnimatePresence>
        {lotteryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={closeLottery}
          >
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="
  w-full max-w-xl
  rounded-3xl
  bg-gradient-to-b from-white/15 to-white/5
  border border-white/15 shadow-2xl text-white
  p-4 sm:p-6 md:p-8
  max-h-[88vh] overflow-auto
"

onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/70 font-semibold">Networ.King</p>
                  <h2 className="text-2xl md:text-3xl font-extrabold mt-1">Daily Lottery</h2>
                 <p className="text-white/70 mt-2">
  {lotteryAvailable ? (
    "Daily spins available"
  ) : (
    <>
      You used all your attempts for today.
      <span className="block text-amber-300 mt-1 text-xs">
        💡 Tip: Premium users get 2 spins per day
      </span>
    </>
  )}
</p></div>

                <button
                  onClick={closeLottery}
                  className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 transition"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-8 flex flex-col items-center">
                <div className="relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <div
  style={{
    width: 0,
    height: 0,
    borderLeft: `${pointerSize}px solid transparent`,
    borderRight: `${pointerSize}px solid transparent`,
    borderTop: `${pointerSize * 1.6}px solid #fcd34d`,
  }}
/>
                  </div>

                  <motion.div
                    animate={{ rotate: wheelRotation }}
                    transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
                    className="relative rounded-full border border-white/20 shadow-2xl overflow-hidden"
style={{
  width: wheelSize,
  height: wheelSize,
  background: "conic-gradient(" +
    [
      "rgba(255,255,255,0.25) 0deg 45deg",
      "rgba(220,38,38,0.35) 45deg 90deg",
      "rgba(255,255,255,0.25) 90deg 135deg",
      "rgba(220,38,38,0.35) 135deg 180deg",
      "rgba(255,255,255,0.25) 180deg 225deg",
      "rgba(220,38,38,0.35) 225deg 270deg",
      "rgba(255,255,255,0.25) 270deg 315deg",
      "rgba(220,38,38,0.35) 315deg 360deg",
    ].join(",") +
    ")",
}}
                  >
                    {prizes.map((p, i) => {
                      const angle = (360 / prizes.length) * i + 360 / prizes.length / 2;
                      
                                            return (
                        <div
  key={p.label}
  className="absolute left-1/2 top-1/2"
  style={{
    transform: `
      translate(-50%, -50%)
      rotate(${angle}deg)
      translateX(${radius}px)
      rotate(-${angle}deg)
    `,
  }}
>
                         <div
  style={{
    width: wheelSize * 0.15,
    height: wheelSize * 0.15,
    fontSize: wheelSize * 0.065,
  }}
  className="rounded-full bg-black/20 border border-white/10 grid place-items-center"
>                            {p.icon}
                          </div>
                        </div>
                      );
                    })}

                    <div className="absolute inset-0 grid place-items-center">
  <div
    style={{
      width: wheelSize * 0.22,
      height: wheelSize * 0.22,
    }}
    className="rounded-full bg-black/30 border border-white/15 shadow-inner grid place-items-center"
  >
    <span style={{ fontSize: wheelSize * 0.08 }}>🍀</span>
  </div>
</div>
                  </motion.div>
                </div>

                <div className="mt-6 w-full">
                  {lotteryResult ? (
                    <div className="w-full rounded-2xl bg-black/20 border border-white/10 p-4 text-center">
                      <p className="text-sm text-white/70">You won</p>
                      <p className="text-xl font-extrabold mt-1">
                        {lotteryResult.icon} {lotteryResult.label}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full rounded-2xl bg-black/10 border border-white/10 p-4 text-center text-white/70">
                      {spinning ? "Spinning..." : "Spin to reveal today’s prize."}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-col items-center gap-2">
                  <button
                    onClick={spinLottery}
                    disabled={!lotteryAvailable || spinning}
                    className={[
                      "px-6 py-3 rounded-2xl font-bold shadow-lg transition",
                      lotteryAvailable && !spinning
                        ? "bg-white/20 hover:bg-white/30 border border-white/15"
                        : "bg-white/10 text-white/50 cursor-not-allowed border border-white/10",
                    ].join(" ")}
                  >
                    {spinning ? "🎡 Spinning..." : "🎡 Spin"}
                  </button>

                  {/* Mobile toggle button */}
<button
  type="button"
  onClick={() => setInventoryExpanded((v) => !v)}
  className="mt-4 w-full sm:hidden px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-semibold"
>
  {inventoryExpanded ? "Hide Inventory ▲" : "Show Inventory ▼"}
</button>

{/* Inventory panel:
    - always visible on sm+
    - collapsible on mobile
*/}
<div
  className={[
    "mt-3 w-full rounded-2xl bg-black/15 border border-white/10 p-4",
    inventoryExpanded ? "block" : "hidden",
    "sm:block", // always show on sm+
  ].join(" ")}
>
  <p className="text-sm font-semibold text-white/80 mb-2">Your Fruit Inventory</p>

  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-sm">
    {prizes.map((p) => {
      const key = p.label.toUpperCase();
      return (
        <div
          key={p.label}
          className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
        >
          <span className="truncate">
            {p.icon} {p.label}
          </span>
          <span className="font-bold">{lotteryInventory?.[key] ?? 0}</span>
        </div>
      );
    })}
  </div>
</div>

                  {!lotteryAvailable && (
                    <p className="text-xs text-white/60">
                      Next spin available in {formatLotteryCooldown(lotteryCooldownMs)}.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tiny status line */}
      {message && (
        <div className="mt-2 fixed bottom-3 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded text-xs">
          {message}
        </div>
      )}
      <OnboardingOverlay
  steps={onboardingSteps}
  isOpen={showOnboarding}
  onClose={completeOnboarding}
  onFinish={completeOnboarding}
/>
    </main>
  );
}
