//frontend\src\app\chat\global\Sidebar.tsx


"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UnreadMap = Record<string, number>;

function Badge({
  n,
  compactDot = false,
}: {
  n: number;
  compactDot?: boolean;
}) {
  if (!n || n <= 0) return null;

  // Compact/mobile: red dot
  if (compactDot) {
    return (
      <span
  className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold"
  aria-label={`${n} unread`}
  title={`${n} unread`}
>
  {n > 99 ? "99+" : n}
</span>
    );
  }

  // Desktop: numeric pill
  return (
    <span className="ml-auto min-w-[22px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-extrabold flex items-center justify-center">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function Sidebar({
  selected,
  onSelect,
  unreadByChannel = {},
  compact = false,
  currentLevel,
}: {
  selected: string;
  onSelect: (c: string) => void;
  unreadByChannel?: UnreadMap;
  compact?: boolean;
  currentLevel: number | null;
}) {
  

   const router = useRouter();

const [lockedToast, setLockedToast] = useState(false);
const [shakeId, setShakeId] = useState<string | null>(null);

const level = currentLevel ?? 1;

  function handleChannelClick(id: string, unlocked: boolean) {
  if (!unlocked) {
    // 🔥 LOCKED UX

    setShakeId(id);
    setLockedToast(true);

    // mobile vibration
    if (navigator.vibrate) {
      navigator.vibrate(120);
    }

    // remove shake
    setTimeout(() => setShakeId(null), 400);

    // auto hide toast
    setTimeout(() => setLockedToast(false), 4000);

    return;
  }

  // ✅ normal
  onSelect(id);
}


  const baseChannels = [
    { id: "global", name: "global", icon: "🌐" },
    { id: "announcements", name: "announcements", icon: "📢" },
  ];


const mainChannels = [
  { id: "help", name: "Get Help", icon: "🆘" },
  { id: "networking", name: "Networking", icon: "🤝" },
  { id: "general", name: "General", icon: "💬" },
];

const gatedChannels = [
  { id: "lvl-3", name: "Lvl 3", icon: "🔥", level: 3 },
  { id: "lvl-8", name: "Lvl 8", icon: "💎", level: 12 },
  { id: "lvl-15", name: "Lvl 15", icon: "👑", level: 18 },
];

function getMainChannelGlow(id: string) {
  switch (id) {
    case "help":
      return "ring-2 ring-red-400 shadow-[0_0_10px_#f87171]";

    case "networking":
      return "ring-2 ring-green-400 shadow-[0_0_10px_#4ade80]";

    case "general":
      return "ring-2 ring-blue-400 shadow-[0_0_10px_#60a5fa]";

    default:
      return "";
  }
}

  // glow colors based on lvl
function getMobileGlowClasses(level: number) {
  switch (level) {
    case 3:
      return "ring-2 ring-orange-400 shadow-[0_0_8px_#fb923c] shadow-[0_0_16px_#f97316]";

    case 8:
      return "ring-2 ring-cyan-400 shadow-[0_0_8px_#22d3ee] shadow-[0_0_16px_#06b6d4]";

  case 15:
  return "ring-2 ring-purple-500 shadow-[0_0_10px_#a855f7] shadow-[0_0_20px_#7e22ce] animate-pulse";
    default:
      return "";
  }
}

  // ✅ your original: compact widths + stable min/max
  const asideClass = compact
    ? "w-[22vw] min-w-[78px] max-w-[124px]"
    : "w-56";

 function CompactTile({
  id,
  icon,
  label,
  disabled,
  onClick,
}: {
  id: string;
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const isSelected = selected === id;
  const unread = unreadByChannel?.[id] ?? 0;

 const lvlMatch = id.match(/^lvl-(\d+)$/);
const lvlNum = lvlMatch ? parseInt(lvlMatch[1], 10) : null;

let glowClass = "";

if (isSelected) {
  if (lvlNum) {
    glowClass = getMobileGlowClasses(lvlNum);
  } else {
    glowClass = getMainChannelGlow(id);
  }
}
  return (
   <button
  type="button"
  onClick={onClick}
  onMouseEnter={async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  // ✅ DON'T refetch if already cached
  if ((window as any).__chatCache?.[id]) return;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/global/messages?channel=${id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();

    if (!Array.isArray(data?.messages)) return;

    // ✅ STORE globally
    if (!(window as any).__chatCache) {
      (window as any).__chatCache = {};
    }

    (window as any).__chatCache[id] = data.messages;
  } catch {}
}}
      className={[
        "relative w-full rounded-xl border px-2 py-2 flex flex-col items-center justify-center gap-1 transition",
        "min-h-[62px]",
        disabled
  ? "opacity-50 cursor-pointer"
  : "hover:bg-white/10 cursor-pointer",
        shakeId === id ? "animate-[shake_0.35s]" : "",
  isSelected
  ? `bg-white/10 border-white/20 text-white ${glowClass}`
          : "bg-white/0 border-white/10 text-white/90",
      ].join(" ")}
      title={label}
    >
      <span className="text-[24px] leading-none">{icon}</span>
      <span className="text-[11px] leading-tight text-white/80 text-center truncate w-full">
        {label}
      </span>
      <Badge n={unread} compactDot />

      {disabled && (
 <div className="absolute inset-0 rounded-xl bg-black/3.0 flex items-center justify-center">  
 <span className="text-base opacity-80">🔒</span>
  </div>
)}
    </button>
  );
}

  return (
    <aside
      className={`${asideClass} bg-[#1e1f22] border-r border-white/10 p-3 space-y-6 overflow-y-auto shrink-0`}
    >
      {/* PUBLIC */}
      <div>
        {!compact && (
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm uppercase text-gray-400">Public</h2>
          </div>
        )}

        {compact ? (
          <div className="grid grid-cols-1 gap-2">
            {baseChannels.map((ch) => (
              <CompactTile
                key={ch.id}
                id={ch.id}
                icon={ch.icon}
                label={ch.name}
                onClick={() => onSelect(ch.id)}
                
              />
            ))}
          </div>
        ) : (
          baseChannels.map((ch) => (
         <button
  type="button"
  key={ch.id}
  onClick={() => onSelect(ch.id)}
  onMouseEnter={() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/global/messages?channel=${ch.id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }}


              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition
                 ${shakeId === ch.id ? "animate-[shake_0.35s]" : ""}
                ${
                  selected === ch.id
                    ? "bg-amber-500/20 text-amber-300"
                    : "hover:bg-white/10"
                }
          `}
            >
              <span className="text-base">{ch.icon}</span>
              <span className="truncate text-sm">{ch.name}</span>
              <Badge n={unreadByChannel?.[ch.id] ?? 0} />
            </button>
          ))
        )}
      </div>

     
<div>
  {!compact && (
    <h2 className="text-sm uppercase text-gray-400 mb-2">
      Channels
    </h2>
  )}

  {compact ? (
    <div className="grid grid-cols-1 gap-2">
      {mainChannels.map((ch) => (
        <CompactTile
          key={ch.id}
          id={ch.id}
          icon={ch.icon}
          label={ch.name}
          onClick={() => onSelect(ch.id)}
        />
      ))}
    </div>
  ) : (
    mainChannels.map((ch) => (
      <button
        key={ch.id}
        onClick={() => onSelect(ch.id)}
        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition
          ${
            selected === ch.id
              ? "bg-amber-500/20 text-amber-300"
              : "hover:bg-white/10"
          }`}
      >
        <span>{ch.icon}</span>
        <span className="truncate text-sm">{ch.name}</span>
        <Badge n={unreadByChannel?.[ch.id] ?? 0} />
      </button>
    ))
  )}
</div>

{/* LOUNGES */}
<div>
  {!compact && (
    <h2 className="text-sm uppercase text-gray-400 mb-2">
      Lounges
    </h2>
  )}

  {compact ? (
    <div className="grid grid-cols-1 gap-2">
      {gatedChannels.map((ch) => {
        const unlocked = level >= ch.level;

        return (
          <CompactTile
            key={ch.id}
            id={ch.id}
            icon={ch.icon}
            label={ch.name}
            disabled={!unlocked}
            onClick={() => handleChannelClick(ch.id, unlocked)}
          />
        );
      })}
    </div>
  ) : (
    gatedChannels.map((ch) => {
      const unlocked = level >= ch.level;

      return (
        <button
          key={ch.id}
          onClick={() => handleChannelClick(ch.id, unlocked)}
          className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition
            ${
              selected === ch.id
                ? "bg-amber-500/20 text-amber-300"
                : unlocked
                ? "hover:bg-white/10"
                : "opacity-40"
            }`}
        >
          <span>{ch.icon}</span>
          <span className="truncate text-sm">{ch.name}</span>

          {!unlocked ? (
            <span className="ml-auto">🔒</span>
          ) : (
            <Badge n={unreadByChannel?.[ch.id] ?? 0} />
          )}
        </button>
      );
    })
  )}
</div>
      {lockedToast && (
  <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[9999]">
    <div
      onClick={() => router.push("/myrooms")}
   className="px-5 py-2 rounded-lg bg-red-500/90 text-white text-sm shadow-lg cursor-pointer hover:scale-105 transition whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis" >
      🔒 Locked — Go to Level Up 🚀
    </div>
  </div>
)}
    </aside>
  );
}
