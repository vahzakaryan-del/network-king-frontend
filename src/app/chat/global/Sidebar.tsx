"use client";

import { useEffect, useState } from "react";

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
}: {
  selected: string;
  onSelect: (c: string) => void;
  unreadByChannel?: UnreadMap;
  compact?: boolean;
}) {
  const [currentLevel, setCurrentLevel] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/levels/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!cancelled && data?.level) setCurrentLevel(data.level);
      } catch {}
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  

  const baseChannels = [
    { id: "global", name: "global", icon: "🌐" },
    { id: "announcements", name: "announcements", icon: "📢" },
  ];

  // ✅ Keep your original custom level names + icons
  const levelChannels = [
    { level: 1, name: "Entrance", icon: "🪵" },
    { level: 2, name: "Gate", icon: "🪜" },
    { level: 3, name: "Servant Hall", icon: "🧹" },
    { level: 4, name: "Inner Gate", icon: "🔒" },
    { level: 5, name: "Guard Post", icon: "🛡️" },
    { level: 6, name: "Training Yard", icon: "⚔️" },
    { level: 7, name: "Archer Loft", icon: "🏹" },
    { level: 8, name: "Magic Room", icon: "🪄" },
    { level: 9, name: "Trial Furnace", icon: "🔥" },
    { level: 10, name: "Mind Chamber", icon: "🧠" },
    { level: 11, name: "Whisper Hall", icon: "🌙" },
    { level: 12, name: "Alchemy Lab", icon: "🧪" },
    { level: 13, name: "Mask Room", icon: "🎭" },
    { level: 14, name: "Library", icon: "📜" },
    { level: 15, name: "Crystal Passage", icon: "💠" },
    { level: 16, name: "Spiral Way", icon: "🌀" },
    { level: 17, name: "Hidden Door", icon: "🗝️" },
    { level: 18, name: "Gem Chamber", icon: "💎" },
    { level: 19, name: "Shrine", icon: "🛕" },
    { level: 20, name: "Inferno Gate", icon: "🌋" },
    { level: 21, name: "Frost Vault", icon: "❄️" },
    { level: 22, name: "Storm Hall", icon: "⚡" },
    { level: 23, name: "Dragon Lair", icon: "🐉" },
    { level: 24, name: "Oracle Room", icon: "👁️" },
    { level: 25, name: "Mirror Chamber", icon: "🪞" },
    { level: 26, name: "Gravity Well", icon: "🧲" },
    { level: 27, name: "Divination Room", icon: "🔮" },
    { level: 28, name: "Strategy Hall", icon: "♟️" },
    { level: 29, name: "Fate Loom", icon: "🧵" },
    { level: 30, name: "Ascension Step", icon: "🪶" },
    { level: 31, name: "Silent Hall", icon: "🕯️" },
    { level: 32, name: "Ancestor Court", icon: "🗿" },
    { level: 33, name: "King’s Gate", icon: "👑" },
    { level: 34, name: "Inner Sanctum", icon: "🛕" },
    { level: 35, name: "Star Room", icon: "🌌" },
    { level: 36, name: "Throne Apex", icon: "🏆" },
  ];

  

  // glow colors based on level group (every 6 levels)
function getMobileGlowClasses(level: number) {
  // 0–35
  const idx = (level - 1) % 36;
  const group = Math.floor(idx / 6);

  switch (group) {
    case 0: // Copper
      return "ring-2 ring-amber-600 shadow-[0_0_8px_#c96a2f] shadow-[0_0_14px_#f59e0b]";
    case 1: // Silver
      return "ring-2 ring-gray-300 shadow-[0_0_8px_#e5e7eb] shadow-[0_0_14px_#f3f4f6]";
    case 2: // Golden
      return "ring-2 ring-yellow-400 shadow-[0_0_8px_#facc15] shadow-[0_0_14px_#fbbf24]";
    case 3: // Emerald
      return "ring-2 ring-emerald-400 shadow-[0_0_8px_#34d399] shadow-[0_0_14px_#10b981]";
    case 4: // Diamond Blue
      return "ring-2 ring-sky-400 shadow-[0_0_8px_#7dd3fc] shadow-[0_0_14px_#38bdf8]";
    case 5: // White
      return "ring-2 ring-white shadow-[0_0_8px_#ffffff] shadow-[0_0_14px_#f9fafb]";
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

  // extract level number
  const lvlMatch = id.match(/^level-(\d+)$/);
  const lvlNum = lvlMatch ? parseInt(lvlMatch[1], 10) : null;

  // glow only if selected and is a level
  const glowClass = isSelected && lvlNum ? getMobileGlowClasses(lvlNum) : "";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "relative w-full rounded-xl border px-2 py-2 flex flex-col items-center justify-center gap-1 transition",
        "min-h-[62px]",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10",
        isSelected
          ? `bg-amber-500/15 border-amber-400/30 text-amber-200 ${glowClass}`
          : "bg-white/0 border-white/10 text-white/90",
      ].join(" ")}
      title={label}
    >
      <span className="text-[18px] leading-none">{icon}</span>
      <span className="text-[11px] leading-tight text-white/80 text-center truncate w-full">
        {label}
      </span>
      <Badge n={unread} compactDot />
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
                // ✅ point (2): name under icon
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
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition
                ${
                  selected === ch.id
                    ? "bg-amber-500/20 text-amber-300"
                    : "hover:bg-white/10"
                }`}
            >
              <span className="text-base">{ch.icon}</span>
              <span className="truncate text-sm">{ch.name}</span>
              <Badge n={unreadByChannel?.[ch.id] ?? 0} />
            </button>
          ))
        )}
      </div>

      {/* LEVELS */}
      <div>
        {!compact && (
          <h2 className="text-sm uppercase text-gray-400 mb-2">
            Castle Levels
          </h2>
        )}

        {compact ? (
          <div className="grid grid-cols-1 gap-2">
            {levelChannels.map((lvl) => {
              const unlocked = currentLevel >= lvl.level;
              const id = `level-${lvl.level}`;

              return (
                <CompactTile
                  key={lvl.level}
                  id={id}
                  icon={lvl.icon}
                  // ✅ point (1): tile layout + border + unread dot
                  label={`lvl ${lvl.level}`}
                  disabled={!unlocked}
                  onClick={() => unlocked && onSelect(id)}
                />
              );
            })}
          </div>
        ) : (
          levelChannels.map((lvl) => {
            const unlocked = currentLevel >= lvl.level;
            const id = `level-${lvl.level}`;

            return (
              <button
                type="button"
                key={lvl.level}
                disabled={!unlocked}
                onClick={() => unlocked && onSelect(id)}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition
                  ${
                    selected === id
                      ? "bg-amber-500/20 text-amber-300"
                      : unlocked
                      ? "hover:bg-white/10"
                      : "opacity-40 cursor-not-allowed"
                  }`}
              >
                <span className="text-base">{lvl.icon}</span>
                <span className="truncate text-sm">
                  level-{lvl.level} {lvl.name}
                </span>
                {!unlocked ? (
                  <span className="ml-auto">🔒</span>
                ) : (
                  <Badge n={unreadByChannel?.[id] ?? 0} />
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
