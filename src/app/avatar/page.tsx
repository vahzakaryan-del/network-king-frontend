"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { asset } from "@/lib/assets";

type AvatarRow = {
  id: number;
  fileName: string;
  visible: boolean;
  isFree: boolean;
  priceCents: number | null;
  createdAt: string;
  unlockedAt?: string | null;

  unlockTestsMin?: number;
  milestoneReached?: boolean;
  userCount?: number;
};

type AvatarsResponse = {
  available: AvatarRow[];
  locked: AvatarRow[];
  achievements?: AvatarRow[];
  counts?: {
    available: number;
    locked: number;
    achievements: number;
    unlockedPaid: number;
  };
  error?: string;
};

type Entitlements = {
  isPremium: boolean;
  premiumUntil: string | null;
  cooldownSkipTokens: number;
  tombolaDailyLimit: number;
};

type CheckoutResponse = {
  ok?: boolean;
  alreadyOwned?: boolean;
  reused?: boolean;
  purchase?: {
    id: number;
    status: string;
    kind: string;
    amountCents: number;
    currency: string;
    createdAt?: string;
  };
  error?: string;
};

const API = process.env.NEXT_PUBLIC_API_URL!;

function getMonthKeyUTC() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function AvatarSelectionPage() {
  const router = useRouter();

  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

    const [previewAvatar, setPreviewAvatar] = useState<AvatarRow | null>(null);

  const openPreview = useCallback((a: AvatarRow) => setPreviewAvatar(a), []);
  const closePreview = useCallback(() => setPreviewAvatar(null), []);

  const [achievements, setAchievements] = useState<AvatarRow[]>([]);
const [showAchievements, setShowAchievements] = useState(false);


  const [available, setAvailable] = useState<AvatarRow[]>([]);
  const [locked, setLocked] = useState<AvatarRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buyingId, setBuyingId] = useState<number | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [premiumUnlocking, setPremiumUnlocking] = useState(false);

  const [pendingAvatarIds, setPendingAvatarIds] = useState<Set<number>>(new Set());

  // ✅ Show more limits
  const [availableLimit, setAvailableLimit] = useState(15);
  const [lockedLimit, setLockedLimit] = useState(15);
  const AVAILABLE_STEP = 15;
  const LOCKED_STEP = 15;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const formatPrice = useCallback((priceCents: number | null) => {
    if (priceCents == null) return "";
    return `€${(priceCents / 100).toFixed(2)}`;
  }, []);

  // ✅ sorting helpers
  const sortLockedNewest = useCallback((arr: AvatarRow[]) => {
    return [...arr].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, []);

  // AVAILABLE: unlockedAt desc (paid unlocks), free fallback by createdAt desc
  const sortAvailableByUnlockRecency = useCallback((arr: AvatarRow[]) => {
    return [...arr].sort((a, b) => {
      const au = a.unlockedAt ? new Date(a.unlockedAt).getTime() : -1;
      const bu = b.unlockedAt ? new Date(b.unlockedAt).getTime() : -1;

      // paid/unlocked first by unlockedAt desc
      if (au !== bu) return bu - au;

      // fallback: newest avatar createdAt desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, []);

  const fetchAvatars = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return { ok: false as const };
    }

    try {
      const res = await fetch(`${API}/me/avatars`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data: AvatarsResponse = await res.json();

      if (!res.ok) {
        showToast(`❌ ${data.error || "Failed to load avatars"}`);
        return { ok: false as const };
      }

      // ✅ frontend safety-net sorting (even if backend changes)
      const sortedAvailable = sortAvailableByUnlockRecency(data.available || []);
      const sortedLocked = sortLockedNewest(data.locked || []);

      setAvailable(sortedAvailable);
      setLocked(sortedLocked);

      setAchievements(data.achievements || []);

      // reset show-more on refresh
      setAvailableLimit(15);
      setLockedLimit(15);

      return { ok: true as const, data: { ...data, available: sortedAvailable, locked: sortedLocked } };
    } catch {
      showToast("❌ Failed to load avatars");
      return { ok: false as const };
    }
  }, [router, showToast, sortAvailableByUnlockRecency, sortLockedNewest]);

  const fetchEntitlements = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return { ok: false as const };
    }

    try {
      const res = await fetch(`${API}/me/entitlements`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(`❌ ${data.error || "Failed to load entitlements"}`);
        return { ok: false as const };
      }

      setEntitlements(data);
      return { ok: true as const, data };
    } catch {
      showToast("❌ Failed to load entitlements");
      return { ok: false as const };
    }
  }, [router, showToast]);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return { ok: false as const };
    }

    try {
      const r = await fetch(`${API}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (data.user?.avatar) {
  setSelectedAvatar(data.user.avatar);
} else {
  setSelectedAvatar(null);
}
      return { ok: true as const, avatarFileName: data.user?.avatar ?? null };
    } catch {
      return { ok: false as const };
    }
  }, [router]);

 const normalizeSelection = useCallback((currentSelected: string | null, nextAvailable: AvatarRow[]) => {
  if (!nextAvailable || nextAvailable.length === 0) return null;

  const set = new Set(nextAvailable.map(a => a.fileName));

  if (currentSelected && set.has(currentSelected)) return currentSelected;

  return nextAvailable[0].fileName;
}, []);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      setLoading(true);

      await fetchProfile();
      const result = await fetchAvatars();
      await fetchEntitlements();

      setLoading(false);

      if (result.ok) {
        setSelectedAvatar((prev) => normalizeSelection(prev, result.data.available || []));
      }
    })();
  }, [router, fetchProfile, fetchAvatars, fetchEntitlements, normalizeSelection]);


  const handleSave = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!selectedAvatar) {
      showToast("⚠️ Please choose an avatar first");
      return;
    }

    if (!available.some(a => a.fileName === selectedAvatar)) {
  showToast("⚠️ This avatar is locked. Choose an available one.");
  return;
}

    setSaving(true);

    const avatarFile = selectedAvatar;

    try {
      const res = await fetch(`${API}/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ avatar: avatarFile }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast("🎉 Avatar updated!");
        setTimeout(() => router.push("/dashboard"), 1200);
      } else {
        showToast(`❌ ${data.error || "Update failed"}`);
      }
    } catch {
      showToast("❌ Network error");
    }

    setSaving(false);
  }, [router, selectedAvatar, showToast]);

  const handleBuy = useCallback(
    async (avatarId: number) => {
      const token = localStorage.getItem("token");
      if (!token) return;

      setBuyingId(avatarId);

      try {
        const res = await fetch(`${API}/payments/checkout/avatar`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ avatarId }),
        });

        const data: CheckoutResponse = await res.json();

        if (!res.ok) {
          showToast(`❌ ${data.error || "Failed to create purchase"}`);
          return;
        }

        if (data.alreadyOwned) {
          showToast("✅ You already own this avatar!");
          const result = await fetchAvatars();
          if (result.ok) {
            setSelectedAvatar((prev) => normalizeSelection(prev, result.data.available || []));
          }
          return;
        }

        setPendingAvatarIds((prev) => new Set(prev).add(avatarId));

        const status = data.purchase?.status || "pending";
        showToast(
          status === "pending"
            ? "🧾 Purchase created (pending). Mark it PAID in /dev/payments."
            : "🧾 Purchase created."
        );

        const result = await fetchAvatars();
        if (result.ok) {
          setSelectedAvatar((prev) => normalizeSelection(prev, result.data.available || []));
        }
      } catch {
        showToast("❌ Network error");
      } finally {
        setBuyingId(null);
      }
    },
    [fetchAvatars, normalizeSelection, showToast]
  );

  const handleUnlockMonthly = useCallback(
    async (fileName: string) => {
      const token = localStorage.getItem("token");
      if (!token) return;

      if (!entitlements?.isPremium) {
        showToast("⭐ Premium required. (Later: open subscribe page)");
        return;
      }

      setPremiumUnlocking(true);

      try {
        const res = await fetch(`${API}/premium/avatars/unlock`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileName }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data?.error === "premium_required") {
            showToast("⭐ Premium required. (Later: open subscribe page)");
            return;
          }
          showToast(`❌ ${data.error || "Unlock failed"}`);
          return;
        }

        showToast("✅ Monthly avatar unlocked!");
        const result = await fetchAvatars();
        if (result.ok) {
          setSelectedAvatar((prev) => normalizeSelection(prev, result.data.available || []));
        }
      } catch {
        showToast("❌ Network error");
      } finally {
        setPremiumUnlocking(false);
      }
    },
    [entitlements?.isPremium, fetchAvatars, normalizeSelection, showToast]
  );
  const AvatarBubble = useCallback(
    ({
      a,
      clickable,
      selected,
      onClick,
      badgeText,
      previewable,
      onPreview,
    }: {
      a: AvatarRow;
      clickable: boolean; // selectable (available)
      selected: boolean;
      onClick?: () => void;
      badgeText?: string;
      previewable?: boolean; // NEW
      onPreview?: () => void; // NEW
    }) => {
      const imgPath = asset(`avatars/${a.fileName}`);
      const canInteract = clickable || previewable;

      return (
        <motion.div
          whileHover={canInteract ? { scale: 1.08 } : undefined}
          whileTap={canInteract ? { scale: 0.95 } : undefined}
          className={[
            "rounded-full border-4 transition select-none",
            canInteract ? "cursor-pointer" : "cursor-default opacity-70",
            selected ? "border-yellow-400" : "border-transparent",
            "p-1 sm:p-0",
          ].join(" ")}
          onClick={() => {
            if (clickable && onClick) onClick();       // select (available)
            else if (previewable && onPreview) onPreview(); // preview (locked/monthly)
          }}
          role={canInteract ? "button" : undefined}
          tabIndex={canInteract ? 0 : -1}
          onKeyDown={(e) => {
            if (!canInteract) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (clickable && onClick) onClick();
              else if (previewable && onPreview) onPreview();
            }
          }}
        >
          <div className="relative">
            <img
              src={imgPath}
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover"
              alt={a.fileName}
              draggable={false}
            />

            {selected ? (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded-full bg-yellow-400 text-gray-900 font-extrabold shadow">
                Selected
              </div>
            ) : null}

            {badgeText ? (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs px-2 py-1 rounded-full bg-black/40 border border-white/20 backdrop-blur-md whitespace-nowrap">
                {badgeText}
              </div>
            ) : null}
          </div>
        </motion.div>
      );
    },
    []
  );


  // Monthly avatar helpers
  const monthKey = useMemo(() => getMonthKeyUTC(), []);
  const monthlyCandidates = useMemo(() => [`premium_${monthKey}.png`,`premium_${monthKey}.webp`, `premium_${monthKey}.jpg`], [monthKey]);
  const isMonthlyPreview =
  !!previewAvatar && monthlyCandidates.includes(previewAvatar.fileName);


  const monthlyAvatar =
    available.find((a) => monthlyCandidates.includes(a.fileName)) ||
    locked.find((a) => monthlyCandidates.includes(a.fileName)) ||
    null;

  const monthlyOwned = !!available.find((a) => monthlyCandidates.includes(a.fileName));
 const lockedWithoutMonthly = locked.filter((a) => !a.fileName.startsWith("premium_"));


  // Show more slices
  const visibleAvailable = useMemo(() => available.slice(0, availableLimit), [available, availableLimit]);
  const visibleLocked = useMemo(() => lockedWithoutMonthly.slice(0, lockedLimit), [lockedWithoutMonthly, lockedLimit]);

  const hasMoreAvailable = available.length > availableLimit;
  const hasMoreLocked = lockedWithoutMonthly.length > lockedLimit;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-700 via-purple-700 to-pink-500 text-white flex flex-col items-center justify-center px-4 py-6 sm:p-6 relative">
      <h1 className="text-2xl sm:text-4xl font-extrabold mb-4 sm:mb-6 z-10 text-center">
        🎨 Choose Your Avatar
      </h1>

      {loading ? (
        <div className="z-10 text-white/90">Loading avatars...</div>
      ) : (
        <>
          {/* AVAILABLE */}
          <div className="w-full max-w-5xl z-10">
            <h2 className="text-xl sm:text-2xl font-bold mb-3">✅ Available</h2>

            {available.length === 0 ? (
              <div className="text-white/80">No available avatars yet.</div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-5">
                  {visibleAvailable.map((a) => {
                    return (
  <AvatarBubble
    key={a.id}
    a={a}
    clickable={true}
    selected={selectedAvatar === a.fileName}
    onClick={() => setSelectedAvatar(a.fileName)}
    badgeText={a.isFree ? "FREE" : "UNLOCKED"}
  />
);
                  })}
                </div>

                {hasMoreAvailable && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setAvailableLimit((n) => n + AVAILABLE_STEP)}
                      className="px-5 py-2 rounded-xl bg-white/15 hover:bg-white/20 border border-white/15 font-semibold"
                    >
                      Show more ({Math.min(availableLimit, available.length)}/{available.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* LOCKED */}
          <div className="w-full max-w-5xl z-10 mt-8 sm:mt-10">
            <h2 className="text-xl sm:text-2xl font-bold mb-3">🔒 Locked (for purchase)</h2>

            {locked.length === 0 ? (
              <div className="text-white/80">No locked avatars.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
                  {/* Monthly pinned */}
                  <div className="flex flex-col items-center gap-3">
                    {monthlyAvatar ? (
                      <>
                        <motion.div
  className="rounded-full border-4 border-yellow-300 shadow-[0_0_25px_rgba(255,215,0,0.55)] cursor-pointer"
  animate={{ scale: [1, 1.04, 1] }}
  transition={{ duration: 2.2, repeat: Infinity }}
  onClick={() => openPreview(monthlyAvatar)}
>

                          <div className="relative">
                           <img
                              src={asset(`avatars/${monthlyAvatar.fileName}`)}
                              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover"
                              alt={monthlyAvatar.fileName}
                              draggable={false}
                            />
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs px-2 py-1 rounded-full bg-black/50 border border-white/20 backdrop-blur-md whitespace-nowrap">
                              Monthly
                            </div>
                          </div>
                        </motion.div>

                        {monthlyOwned ? (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl font-bold shadow-lg bg-emerald-500/80 text-white cursor-default"
                          >
                            Owned ✅
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnlockMonthly(monthlyAvatar.fileName)}
                            disabled={premiumUnlocking}
                            className={`px-4 py-2 rounded-xl font-bold shadow-lg ${
                              premiumUnlocking
                                ? "bg-gray-400"
                                : entitlements?.isPremium
                                ? "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                                : "bg-white/20 text-white hover:bg-white/30"
                            }`}
                          >
                            {premiumUnlocking
                              ? "Unlocking..."
                              : entitlements?.isPremium
                              ? "Unlock (Premium)"
                              : "Need Premium"}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white/20 flex items-center justify-center text-[10px] sm:text-xs text-white/80 text-center px-3">
                          Monthly avatar not found in DB:
                          <br />
                          {monthlyCandidates[0]}
                        </div>
                        <button
                          disabled
                          className="px-4 py-2 rounded-xl font-bold shadow-lg bg-gray-400 cursor-default"
                        >
                          Not available
                        </button>
                      </>
                    )}
                  </div>

                  {/* Locked list */}
                  {visibleLocked.map((a) => {
                    const isPending = pendingAvatarIds.has(a.id);
                   const buttonLabel =
  buyingId === a.id
    ? "Creating..."
    : isPending
    ? "Pending..."
    : "View";
                    return (
                      <div key={a.id} className="flex flex-col items-center gap-3">
                      <AvatarBubble
  a={a}
  clickable={false}
  selected={false}
  previewable={true}
  onPreview={() => openPreview(a)}
  badgeText={formatPrice(a.priceCents) || "PAID"}
/>


                        <button
                           onClick={() => openPreview(a)}
                          disabled={isPending}
                          className={`px-4 py-2 rounded-xl font-bold shadow-lg ${
                            buyingId === a.id
                              ? "bg-gray-400"
                              : isPending
                              ? "bg-white/20 text-white cursor-default"
                              : "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                          }`}
                          title={
                            isPending
                              ? "Purchase is pending. Mark it paid in /dev/payments (dev mode)."
                              : undefined
                          }
                        >
                          {buttonLabel}
                        </button>

                        {isPending ? (
                          <div className="text-[11px] text-white/80 text-center max-w-[10rem] leading-snug">
                            Waiting for payment…
                            <br />
                            (dev: mark paid in <span className="underline">/dev/payments</span>)
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {hasMoreLocked && (
                  <div className="mt-5 flex justify-center">
                    <button
                      onClick={() => setLockedLimit((n) => n + LOCKED_STEP)}
                      className="px-5 py-2 rounded-xl bg-white/15 hover:bg-white/20 border border-white/15 font-semibold"
                    >
                      Show more ({Math.min(lockedLimit, lockedWithoutMonthly.length)}/{lockedWithoutMonthly.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ACHIEVEMENTS */}
<div className="w-full max-w-5xl z-10 mt-10">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-xl sm:text-2xl font-bold">
      🏆 Achievement Avatars
    </h2>

    <button
      onClick={() => setShowAchievements((s) => !s)}
      className="px-4 py-2 rounded-xl bg-white/15 border border-white/15"
    >
      {showAchievements ? "Hide" : "Show"}
    </button>
  </div>

  {showAchievements && (
    <>
      {achievements.length === 0 ? (
        <div className="text-white/70">
          All achievement avatars are owned 🎉
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[...achievements]
  .sort((a, b) => (a.unlockTestsMin ?? 0) - (b.unlockTestsMin ?? 0))
  .map((a) => {
            const progress = `${a.userCount}/${a.unlockTestsMin}`;

            return (
              <div key={a.id} className="flex flex-col items-center gap-2">
                <img
                 src={asset(`avatars/${a.fileName}`)}
                  className="w-24 h-24 rounded-full opacity-80"
                />

                <div className="text-xs text-center">
                  Unlock when passed {a.unlockTestsMin} tests
                </div>

                <div className="text-sm font-bold">
                  {progress}
                </div>

                {a.milestoneReached ? (
                  <button
                   onClick={async () => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/me/avatars/unlock-milestone`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ avatarId: a.id }),
  });

  const data = await res.json();

  if (!res.ok) {
    showToast(`❌ ${data.error || "Unlock failed"}`);
    return;
  }

  showToast("🎉 Achievement avatar unlocked!");

  const result = await fetchAvatars();

  if (result.ok && result.data.achievements?.length === 0) {
    setShowAchievements(false);
  }
}}
                    className="px-4 py-2 rounded-xl bg-emerald-500 font-bold"
                  >
                    Unlock
                  </button>
                ) : (
                  <div className="text-white/60 text-xs">
                    Keep going 💪
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  )}
</div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`mt-8 sm:mt-10 w-full max-w-md px-8 py-3 rounded-xl font-bold text-lg shadow-lg z-10 ${
              saving ? "bg-gray-400" : "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
            }`}
          >
            {saving ? "Saving..." : "Save Avatar"}
          </button>

          <button onClick={() => router.push("/dashboard")} className="mt-4 underline z-10">
            ← Go Back
          </button>
        </>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 shadow-lg z-[9999]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

            <AnimatePresence>
        {previewAvatar && (
          <motion.div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePreview}
          >
            <motion.div
              className="w-full max-w-md sm:max-w-lg rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl p-4 sm:p-6"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold">Avatar preview</div>
                  <div className="text-white/80 text-sm break-all">
                    Exceptional purchase!
                  </div>
                </div>

                <button
                  onClick={closePreview}
                  className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/20 border border-white/15"
                  aria-label="Close preview"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 flex justify-center">
                <motion.img
                  src={asset(`avatars/${previewAvatar.fileName}`)}
                  alt={previewAvatar.fileName}
                  className="w-56 h-56 sm:w-72 sm:h-72 rounded-full object-cover border-4 border-white/20 shadow-xl"
                  initial={{ scale: 0.98 }}
                  animate={{ scale: 1 }}
                />
              </div>
<div className="mt-4">
  {isMonthlyPreview ? (
    <div className="flex flex-col gap-3">
      <div className="text-sm text-white/90">
        Will be available for free after you become a Premium Member
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={closePreview}
          className="px-4 py-2 rounded-xl font-bold bg-white/15 hover:bg-white/20 border border-white/15"
        >
          Close
        </button>

        <a href="/Subscription"
          className="px-4 py-2 rounded-xl font-bold shadow-lg bg-yellow-400 text-gray-900 hover:bg-yellow-300"
        >
          Go Premium
        </a>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold">
        {previewAvatar.isFree ? (
          <span className="text-emerald-200">FREE</span>
        ) : previewAvatar.priceCents ? (
          <span className="text-yellow-200">{formatPrice(previewAvatar.priceCents)}</span>
        ) : (
          <span className="text-yellow-200">PAID</span>
        )}
      </div>

      {!previewAvatar.isFree && previewAvatar.priceCents ? (
        <button
          onClick={() => {
            closePreview();
            handleBuy(previewAvatar.id);
          }}
          className="px-4 py-2 rounded-xl font-bold shadow-lg bg-yellow-400 text-gray-900 hover:bg-yellow-300"
        >
          Buy
        </button>
      ) : (
        <button
          onClick={closePreview}
          className="px-4 py-2 rounded-xl font-bold bg-white/15 hover:bg-white/20 border border-white/15"
        >
          Close
        </button>
      )}
    </div>
  )}
</div>


           
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
