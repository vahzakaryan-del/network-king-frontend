"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import React, { useMemo, useState, useEffect  } from "react";

type KeyInfo = {
  enabled: boolean;
  priceCents: number | null;
  currency: string;
  canBuy: boolean;
};

type ProgressLine = {
  text: string;
  done: boolean;
  kind?: "label" | "sep";
};

export default function StepNext({
  level,
  title,
  description,
  about,
  onClickInfo,
  unlocked = false,
   justUnlocked = false,

  // requirements path
  canUnlock = false,
  progress,
  details,
  onUnlock,

  // 🔑 key info
  keyInfo = null,
  onBuyKey,
}: {
  level: number;
  title: string;
    description?: string | null;
  about?: string | null;
  onClickInfo: () => void;
  unlocked?: boolean;
  justUnlocked?: boolean;

  canUnlock?: boolean;
  progress?: { done: number; total: number } | null;
  details?: any[] | null;
  onUnlock?: (level: number) => Promise<boolean>;

  keyInfo?: KeyInfo | null;
  onBuyKey?: (level: number) => Promise<boolean>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [keyAnim, setKeyAnim] = useState(false);

 useEffect(() => {
  if (!justUnlocked) return;

  setKeyAnim(true);

  // 🔑 play animation, then enter room
  const t1 = setTimeout(() => {
    setKeyAnim(false);
    enterRoom(); // 🚪 auto-enter
  }, 1200);

  return () => clearTimeout(t1);
}, [justUnlocked]);

  
  const [enterAnim, setEnterAnim] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [lockedAnim, setLockedAnim] = useState(false);

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  const canBuyKey =
    !!keyInfo?.canBuy && !unlocked && typeof onBuyKey === "function";

    const formattedDescription = useMemo(() => {
  if (!description) return [];

  return description.split("\n").map((line) => line.trim()).filter(Boolean);
}, [description]);

  const priceLabel = useMemo(() => {
    if (!keyInfo || keyInfo.priceCents == null) return "";
    const value = (keyInfo.priceCents / 100).toFixed(2);
    const cur = keyInfo.currency || "EUR";
    return cur === "EUR" ? `€${value}` : `${value} ${cur}`;
  }, [keyInfo]);

  /** 🔁 Animated enter */
  const enterRoom = () => {
    setEnterAnim(true);
    setTimeout(() => {
      router.push(`/chat/global?channel=level-${level}`);
    }, 2200);
  };

  

 const handleEnterRoom = async () => {
  if (busy || enterAnim) return;

  if (unlocked) {
    enterRoom();
    return;
  }

  if (!canUnlock) {
    setLockedAnim(true);
    navigator.vibrate?.(100);

    setTimeout(() => setLockedAnim(false), 500);
    return;
  }

  if (onUnlock) {
    setBusy(true);
    const ok = await onUnlock(level);
    setBusy(false);
    if (!ok) return;
  }

  enterRoom();
};


    const handleBuyKey = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canBuyKey || busy || enterAnim) return;

    setShowConfirm(true);
  };



  // ✅ Render pretty per-rule progress lines from "details" (with OR grouping)
  const progressLines = useMemo((): ProgressLine[] => {
    const raw: any[] = Array.isArray(details) ? details : [];
    if (!raw.length) return [];

    const lines: ProgressLine[] = [];

    const pushLeaf = (d: any) => {
      const type = d?.rule?.type;

      if (type === "global_messages_count_min") {
        const count = typeof d?.meta?.count === "number" ? d.meta.count : null;
        const min = typeof d?.rule?.min === "number" ? d.rule.min : null;
        if (count != null && min != null) {
          const done = count >= min;
          lines.push({
            done,
            text: `${done ? "✅ Completed:" : "Progress:"} Global messages (${count}/${min})`,
          });
          return;
        }
      }

      if (type === "fruit_count_min") {
  const count = typeof d?.meta?.count === "number" ? d.meta.count : null;
  const min = typeof d?.rule?.min === "number" ? d.rule.min : null;
  const fruit = typeof d?.rule?.fruit === "string" ? d.rule.fruit : "FRUIT";

  if (count != null && min != null) {
    const done = count >= min;
    const label = fruit.toLowerCase();
    lines.push({
      done,
      text: `${done ? "✅ Completed:" : "Progress:"} ${label} (${count}/${min})`,
    });
    return;
  }
}
  

if (type === "profile_countries_filled") {
  const count = typeof d?.meta?.count === "number" ? d.meta.count : null;
  const done = !!d.ok;
  lines.push({
    done,
    text: `${done ? "✅ Completed:" : "Progress:"} Countries selected (${count ?? 0}/1)`,
  });
  return;
}


      if (type === "badges_owned_count_min") {
        const count = typeof d?.meta?.count === "number" ? d.meta.count : null;
        const min = typeof d?.rule?.min === "number" ? d.rule.min : null;
        if (count != null && min != null) {
          const done = count >= min;
          lines.push({
            done,
            text: `${done ? "✅ Completed:" : "Progress:"} Badges owned (${count}/${min})`,
          });
          return;
        }
      }

      if (type === "invites_count_min") {
  const count = typeof d?.meta?.count === "number" ? d.meta.count : 0;
  const min = typeof d?.rule?.min === "number" ? d.rule.min : null;
  if (min != null) {
    const done = count >= min;
    lines.push({
      done,
      text: `${done ? "✅ Completed:" : "Progress:"} Invites (${count}/${min})`,
    });
    return;
  }
}
if (type === "referrals_level_min_count") {
  const count = typeof d?.meta?.count === "number" ? d.meta.count : 0;
  const min = typeof d?.rule?.min === "number" ? d.rule.min : null;
  const lvl = typeof d?.rule?.level === "number" ? d.rule.level : null;

  if (min != null && lvl != null) {
    const done = count >= min;
    lines.push({
      done,
      text: `${done ? "✅ Completed:" : "Progress:"} Referred friends at level ${lvl}+ (${count}/${min})`,
    });
    return;
  }
}


            if (type === "spend_total_min") {
        const spentCents =
          typeof d?.meta?.spentCents === "number" ? d.meta.spentCents : null;
        const minCents =
          typeof d?.rule?.minCents === "number" ? d.rule.minCents : null;
        const currency =
          typeof d?.rule?.currency === "string"
            ? d.rule.currency
            : typeof d?.meta?.currency === "string"
              ? d.meta.currency
              : "USD";

        if (spentCents != null && minCents != null) {
          const done = spentCents >= minCents;

          const fmt = (cents: number) => `${currency} ${(cents / 100).toFixed(2)}`;

          lines.push({
            done,
            text: `${done ? "✅ Completed:" : "Progress:"} Spending (${fmt(spentCents)}/${fmt(minCents)})`,
          });
          return;
        }
      }
      

      // tests completed
if (type === "tests_completed_count") {
  const count = typeof d?.meta?.count === "number" ? d.meta.count : null;
  const min = typeof d?.rule?.min === "number" ? d.rule.min : null;
  if (count != null && min != null) {
    const done = count >= min;
    lines.push({
      done,
      text: `${done ? "✅ Completed:" : "Progress:"} Tests completed (${count}/${min})`,
    });
    return;
  }
}

// login days
if (type === "login_days_total_min") {
  const count = typeof d?.meta?.count === "number" ? d.meta.count : null;
  const min = typeof d?.rule?.min === "number" ? d.rule.min : null;
  if (count != null && min != null) {
    const done = count >= min;
    lines.push({
      done,
      text: `${done ? "✅ Completed:" : "Progress:"} Login days (${count}/${min})`,
    });
    return;
  }
}

// avatars owned
if (type === "paid_avatars_owned_count") {
  const count = typeof d?.meta?.count === "number" ? d.meta.count : null;
  const min = typeof d?.rule?.min === "number" ? d.rule.min : null;
  if (count != null && min != null) {
    const done = count >= min;
    lines.push({
      done,
      text: `${done ? "✅ Completed:" : "Progress:"} Avatars unlocked (${count}/${min})`,
    });
    return;
  }
}

// friends count
if (type === "friends_count_min") {
  const count = typeof d?.meta?.count === "number" ? d.meta.count : null;
  const min = typeof d?.rule?.min === "number" ? d.rule.min : null;
  if (count != null && min != null) {
    const done = count >= min;
    lines.push({
      done,
      text: `${done ? "✅ Completed:" : "Progress:"} Friends (${count}/${min})`,
    });
    return;
  }
}


      if (type === "badge_score_min") {
        const score = typeof d?.meta?.score === "number" ? d.meta.score : null;
        const minScore =
          typeof d?.rule?.minScore === "number" ? d.rule.minScore : null;

        const badgeLabel =
          typeof d?.meta?.label === "string" && d.meta.label.trim()
            ? d.meta.label
            : typeof d?.rule?.badgeSlug === "string"
              ? d.rule.badgeSlug
              : typeof d?.rule?.badgeId === "number"
                ? `#${d.rule.badgeId}`
                : "badge";

        if (minScore != null) {
          const current = score ?? 0;
          const done = score != null && score >= minScore;
          lines.push({
            done,
            text: `${done ? "✅ Completed:" : "Progress:"} ${badgeLabel} score (${current}/${minScore})`,
          });
          return;
        }
      }

      if (type === "member_days_min") {
        const days = typeof d?.meta?.days === "number" ? d.meta.days : null;
        const min = typeof d?.rule?.min === "number" ? d.rule.min : null;
        if (days != null && min != null) {
          const done = days >= min;
          lines.push({
            done,
            text: `${done ? "✅ Completed:" : "Progress:"} Member days (${days}/${min})`,
          });
          return;
        }
      }

      // fallback: your backend already provides nice "reason" strings
      if (typeof d?.reason === "string" && d.reason.trim()) {
        lines.push({ done: !!d.ok, text: d.reason });
        return;
      }

     const prettyLabel = (rule: any) => {
  const t = rule?.type;
  switch (t) {
    case "badge_owned":
      return `Own badge: ${rule.badgeSlug ?? `#${rule.badgeId ?? "?"}`}`;

    case "avatar_is":
      return `Equip avatar: ${rule.fileName ?? "required avatar"}`;

    case "avatar_is_premium":
      return `Equip a paid avatar`;

    case "premium_subscription_active":
      return `Have Premium subscription`;

    case "test_score_min":
      return `Reach test score ≥ ${rule.min ?? "?"}`;

    case "iq_min":
      return `Reach IQ ≥ ${rule.min ?? "?"}`;

    default:
      return null;
  }
};

const label = prettyLabel(d?.rule);
if (label) {
  lines.push({
    done: !!d.ok,
    text: `${d.ok ? "✅ Completed:" : "Progress:"} ${label}`,
  });
  return;
}

// absolute last fallback (never show robotic type)
lines.push({
  done: !!d.ok,
  text: d.ok ? "✅ Requirement completed" : "Progress: Requirement not met",
});

    };

    

    // Detect groups: items with meta.results are usually an "ALL" branch inside an "ANY"
    const groupItems = raw.filter((d) => Array.isArray(d?.meta?.results));
    const leafItems = raw.filter((d) => !Array.isArray(d?.meta?.results));

    if (groupItems.length > 0 && leafItems.length > 0) {
      lines.push({
        text: "Option 1 (ALL of these):",
        done: false,
        kind: "label",
      });

      for (const g of groupItems) {
        for (const child of g.meta.results) pushLeaf(child);
      }

      lines.push({ text: "— OR —", done: false, kind: "sep" });

      lines.push({ text: "Option 2:", done: false, kind: "label" });
      for (const d of leafItems) pushLeaf(d);
    } else {
      // fallback: just flatten and render
      const flat: any[] = [];
      for (const d of raw) {
        if (Array.isArray(d?.meta?.results)) flat.push(...d.meta.results);
        else flat.push(d);
      }
      for (const d of flat) pushLeaf(d);
    }

    // 🧹 remove duplicate lines by text
    const seen = new Set<string>();
    return lines.filter((l) =>
      seen.has(l.text) ? false : (seen.add(l.text), true)
    );
  }, [details]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      whileHover={unlocked ? { rotate: [-0.3, 0.3, -0.3] } : undefined}
      onClick={handleEnterRoom}
      className={`
        relative w-[55%] md:w-[45%] max-sm:w-[78%]
mx-auto py-8 max-sm:py-6 rounded-xl

        bg-gradient-to-b from-yellow-400/80 to-yellow-600/80
        border-[3px] border-yellow-300
        shadow-[0_0_20px_rgba(255,200,0,0.35)]
        flex flex-col items-center select-none
        ${
          unlocked
            ? "cursor-pointer"
            : canUnlock
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-80"
        }
      `}
    >
      <h2 className="text-lg md:text-xl font-extrabold text-black mb-1">
        Level {level}
      </h2>

      <p className="text-sm md:text-base text-black/80 mb-4 text-center">
        {title}
      </p>


      {/* Door */}
      <div className="relative perspective-[800px]">
  <motion.div
    className="
      w-28 md:w-32 h-44 md:h-48 rounded-md overflow-hidden
      border-[3px] border-black/40 shadow-lg
      bg-[url('/rooms/door-wood.webp')] bg-cover bg-center
    "
    style={{
      opacity: unlocked ? 1 : 0.6,
      transformOrigin: "left center",
      filter: lockedAnim ? "drop-shadow(0 0 8px red)" : "none",
    }}
    animate={
      enterAnim
        ? { rotateY: -80, opacity: 0.15 }
        : lockedAnim
        ? { x: [-8, 8, -8, 8, 0] }
        : {}
    }
    transition={{
      duration: lockedAnim ? 0.3 : 1.1,
      ease: "easeInOut",
    }}
  />

  {/* 🔒 Locked text */}
  {lockedAnim && (
    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-black animate-pulse">
  🔒 Locked
</div>
  )}

  {!unlocked && (
    <motion.img
      src="/rooms/padlock-red.webp"
      alt="Locked"
      className="
        absolute -top-4 left-1/2 -translate-x-1/2 w-10 md:w-12
        drop-shadow-[0_0_15px_rgba(255,0,0,0.7)]
      "
      animate={
        enterAnim
          ? { rotate: [0, -20, 20, 0], opacity: 0, y: -10 }
          : { opacity: 1 }
      }
      transition={{ duration: 0.6 }}
    />
  )}
</div>

      {/* ✅ Progress UI */}
      {!unlocked && (
        <div className="w-[85%] mt-3">
          {progress && progress.total > 0 && (
            <>
              <div className="flex justify-between text-xs text-black/80 font-semibold mb-1">
                <span>Progress</span>
                <span>
                  {progress.done}/{progress.total} ({pct}%)
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden border border-black/20">
                <div
                  className="h-full bg-black/60"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          )}

          {progressLines.length > 0 && (
            <div className="mt-2 mb-4 space-y-1">
              {progressLines.map((l, idx) => (
                <p
                  key={idx}
                  className={`text-[12px] font-extrabold ${
                    l.kind === "sep"
                      ? "text-black/60 text-center"
                      : l.kind === "label"
                        ? "text-black underline"
                        : l.done
                          ? "text-black"
                          : "text-black/90"
                  }`}
                >
                  {l.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unlock Button */}
      {!unlocked && canUnlock && onUnlock && (
        <button
          disabled={busy || enterAnim}
          onClick={async (e) => {
            e.stopPropagation();
            setBusy(true);
            const ok = await onUnlock(level);
            setBusy(false);
            if (ok) enterRoom();
          }}
          className="mt-4 px-4 py-2 rounded-lg bg-black/70 text-white font-bold"
        >
          {busy ? "Unlocking..." : "Unlock & Enter"}
        </button>
      )}

      {/* Buy Key */}
      {!unlocked && canBuyKey && (
        <button
          disabled={busy || enterAnim}
          onClick={handleBuyKey}
          className="
            mt-2 px-4 py-2 rounded-lg bg-amber-300
            text-black font-extrabold flex gap-2
          "
        >
          🔑 {priceLabel ? `OR buy The key (${priceLabel})` : "Buy key"}
        </button>
      )}

      {/* Info */}

       <button
  onClick={(e) => {
    e.stopPropagation();
    onClickInfo();
  }}
  className="
     overflow-hidden
    absolute bottom-3 right-3 px-3 py-1 text-xs
    text-white rounded-md bg-black/40 backdrop-blur-sm

    transition
    active:scale-95 active:translate-y-[1px]
    hover:scale-[1.03]
  "
>
  <span className="relative z-10">View Requirements</span>

  <span
    className="
      pointer-events-none absolute inset-0
      bg-gradient-to-r from-transparent via-white/30 to-transparent
      translate-x-[-150%]
      animate-[shine_8s_linear_infinite]
    "
  />
</button>

      {/* Key overlay */}
      {keyAnim && (
        <motion.div className="absolute inset-0 bg-black/55 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360, scale: 1.2 }}
            transition={{ duration: 0.6 }}
            className="text-5xl"
          >
            🔑
          </motion.div>
        </motion.div>
      )}

      {/* Fade out */}
      {enterAnim && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="absolute inset-0 bg-black z-50 rounded-xl"
        />
      )}
      {showConfirm && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-[#111] border border-white/20 rounded-2xl p-6 w-[90%] max-w-sm text-center">
      <h2 className="text-lg font-bold mb-3 text-white">
        Confirm Purchase
      </h2>

      <p className="text-sm text-white/80 mb-6">
        Buy key for {priceLabel} and unlock this room?
      </p>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => setShowConfirm(false)}
          className="px-4 py-2 rounded-lg bg-white/10 text-white"
        >
          Cancel
        </button>

        <button
  disabled={busy}
  onClick={async () => {
    if (busy) return;
            setShowConfirm(false);
            setBusy(true);
            const ok = await onBuyKey!(level);
            setBusy(false);

            
          }}
          className="px-4 py-2 rounded-lg bg-green-500 text-white font-bold"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}

    </motion.div>
  );
}
