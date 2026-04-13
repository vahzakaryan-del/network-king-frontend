"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { asset } from "@/lib/assets";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import type { Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL!;
const MAX_MESSAGE_LEN = 500;

/* ----------------------------- shared helpers ----------------------------- */

async function resolveMentions(
  content: string,
  mentionCache: Map<string, number>
): Promise<number[]> {
  const matches = [...content.matchAll(/@([a-zA-Z0-9_.\-']+)/g)];

  const ids = new Set<number>();

  for (const m of matches) {
    const username = m[1].toLowerCase().replace(/\s+/g, "_");

    // try cache first
    const cached = mentionCache.get(username);
    if (cached) {
      ids.add(cached);
      continue;
    }

    // fallback → ask backend
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BACKEND_URL}/users/search?q=${username}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      const user = data?.users?.find(
        (u: any) => u.name.toLowerCase() === username
      );

      if (user?.id) {
        ids.add(user.id);
      }
    } catch {}
  }

  return Array.from(ids);
}

function parseLevel(channel: string) {
  const m = /^level-(\d+)$/.exec(channel);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function sanitizeOutgoingMessage(
  content: string,
  emojiMap: Map<string, AvailableEmoji>,
  myLevel: number
) {
  return content.replace(/:([a-zA-Z0-9_]+):/g, (full, code) => {
    const e = emojiMap.get(code);

    // emoji doesn't exist → keep text
    if (!e) return full;

    // user not allowed → keep text
    if (e.unlockLevel > myLevel) return full;

    // allowed → keep (will render as emoji later)
    return full;
  });
}

function extractMentionUserIds(
  content: string,
  mentionCache: Map<string, number>
): number[] {
  const matches = [...content.matchAll(/@([a-zA-Z0-9_.\-']+)/g)];

  const ids = new Set<number>();

  for (const m of matches) {
    const username = m[1].toLowerCase().replace(/\s+/g, "_");
    const id = mentionCache.get(username);
    if (id) ids.add(id);
  }

  return Array.from(ids);
}

const FlagIcon = ({ code }: { code?: string | null }) => {
  if (!code) return null;
  return (
    <img
      src={`https://flagcdn.com/20x15/${code.toLowerCase()}.png`}
      alt={code}
      className="inline-block ml-1 rounded-sm shadow-sm"
      style={{ width: "1.2em", height: "0.9em", objectFit: "cover" }}
    />
  );
};

const OnlineIndicator = ({ online }: { online: boolean }) => (
  <span
    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${
      online
        ? "bg-green-400 shadow-[0_0_6px_2px_rgba(34,197,94,0.6)] animate-pulse"
        : "bg-gray-500"
    }`}
  />
);

const avatarSrc = (a?: string | null) =>
  a ? asset(`avatars/${a}`) : asset("avatars/default.webp");

const formatTs = (iso: string) =>
  new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  

/* ------------------------------- shared types ------------------------------ */

type SubChannel = {
  id: number;
  slug: string;
  name: string;
  emoji?: string | null;
  order: number;
  isLocked: boolean;
};

type LevelMessage = {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    avatar?: string | null;
    mainCountry?: string | null;
    isPremium?: boolean;
    currentLevel?: number | null;
  } | null;
  levelNumber?: number;
   
  subChannelId?: number;
};

type AvailableEmoji = {
  id: number;
  code: string;
  type: "unicode" | "image";
  value: string; // unicode char OR "/emojis/xxx.webp"
  label?: string | null;
  unlockLevel: number;
};


type GlobalMessage = {
  id: number;
  user: {
    id: number;
    name: string;
    avatar?: string | null;
    mainCountry?: string | null;
    currentLevel?: number | null;
     isPremium?: boolean;
  } | null;
  content: string;
  createdAt: string;
  
  channel?: string | null;
};

type TypingUser = { id: number; name: string };

const levelColor = (lvl: number) => {
  const hue = (lvl * 11) % 360;
  return {
    backgroundColor: `hsla(${hue}, 95%, 55%, 0.18)`,
    borderColor: `hsla(${hue}, 90%, 65%, 0.35)`,
    color: `hsla(${hue}, 90%, 85%, 1)`,
    boxShadow: `0 0 12px hsla(${hue}, 90%, 60%, 0.22)`,
  } as React.CSSProperties;
};

const LevelBadge = ({ lvl }: { lvl: number }) => (
  <span
    className="ml-2 text-[11px] px-2 py-0.5 rounded-full border font-extrabold tracking-wide"
    style={levelColor(lvl)}
  >
    lvl {lvl}
  </span>
);

const PremiumBadge = () => (
  <span
    className="ml-1 text-[11px] px-2 py-0.5 rounded-full border font-bold bg-yellow-500/20 border-yellow-400/40 text-yellow-300"
    title="Premium member"
  >
    👑
  </span>
);

// ✅ Level icons (same ones as Sidebar)
const LEVEL_ICONS: Record<number, string> = {
  1: "🪵",
  2: "🪜",
  3: "🧹",
  4: "🔒",
  5: "🛡️",
  6: "⚔️",
  7: "🏹",
  8: "🪄",
  9: "🔥",
  10: "🧠",
  11: "🌙",
  12: "🧪",
  13: "🎭",
  14: "📜",
  15: "💠",
  16: "🌀",
  17: "🗝️",
  18: "💎",
  19: "🛕",
  20: "🌋",
  21: "❄️",
  22: "⚡",
  23: "🐉",
  24: "👁️",
  25: "🪞",
  26: "🧲",
  27: "🔮",
  28: "♟️",
  29: "🧵",
  30: "🪶",
  31: "🕯️",
  32: "🗿",
  33: "👑",
  34: "🛕",
  35: "🌌",
  36: "🏆",
};

/* ------------------------------ Level name map ----------------------------- */
const LEVEL_NAMES: Record<number, string> = {
  1: "Entrance",
  2: "Gate",
  3: "Servant Hall",
  4: "Inner Gate",
  5: "Guard Post",
  6: "Training Yard",
  7: "Archer Loft",
  8: "Magic Room",
  9: "Trial Furnace",
  10: "Mind Chamber",
  11: "Whisper Hall",
  12: "Alchemy Lab",
  13: "Mask Room",
  14: "Library",
  15: "Crystal Passage",
  16: "Spiral Way",
  17: "Hidden Door",
  18: "Gem Chamber",
  19: "Shrine",
  20: "Inferno Gate",
  21: "Frost Vault",
  22: "Storm Hall",
  23: "Dragon Lair",
  24: "Oracle Room",
  25: "Mirror Chamber",
  26: "Gravity Well",
  27: "Divination Room",
  28: "Strategy Hall",
  29: "Fate Loom",
  30: "Ascension Step",
  31: "Silent Hall",
  32: "Ancestor Court",
  33: "King’s Gate",
  34: "Inner Sanctum",
  35: "Star Room",
  36: "Throne Apex",
};

function formatInt(n: number) {
  try {
    return new Intl.NumberFormat().format(n);
  } catch {
    return String(n);
  }
}

function EmojiIcon({ e }: { e: AvailableEmoji }) {
  if (e.type === "image") {
    return (
      <img
        src={asset(e.value)}
        alt={e.label ?? e.code}
        className="w-11 h-11"
        style={{ objectFit: "contain" }}
        draggable={false}
      />
    );
  }

  return <span>{e.value}</span>;
}


/* ------------------------------ Global Chat UI ----------------------------- */
function GlobalChat({ channel, socket, currentLevel }: { channel: string; socket: Socket; currentLevel: number | null }) {
  const router = useRouter();

 const [myId, setMyId] = useState<number | null>(null);
const [myName, setMyName] = useState("You");
const [myAvatar, setMyAvatar] = useState<string | null>(null);
const [myPremium, setMyPremium] = useState(false);

useEffect(() => {
  setMyId(Number(localStorage.getItem("userId")));
  setMyName(localStorage.getItem("userName") || "You");
  setMyAvatar(localStorage.getItem("avatar"));
  setMyPremium(localStorage.getItem("isPremium") === "1");
}, []);

  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [text, setText] = useState("");
 const myLevel = currentLevel ?? 1;
  const [showScroll, setShowScroll] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  const [mentionOpen, setMentionOpen] = useState(false);
const [mentionQuery, setMentionQuery] = useState("");
const [mentionUsers, setMentionUsers] = useState<any[]>([]);
const [mentionIndex, setMentionIndex] = useState(0);



const [mentionCache, setMentionCache] = useState<Map<string, number>>(new Map());

  const [emojiTab, setEmojiTab] = useState<"system" | "custom">("custom");

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
   useEffect(() => {
  const el = textareaRef.current;
  if (!el) return;

  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}, [text]);
  

  const [emojis, setEmojis] = useState<AvailableEmoji[]>([]);
const [emojiOpen, setEmojiOpen] = useState(false);
const [emojiLoading, setEmojiLoading] = useState(false);

const emojiMap = useMemo(() => {
  const m = new Map<string, AvailableEmoji>();
  for (const e of emojis) m.set(e.code, e);
  return m;
}, [emojis]);



const emojisByLevel = useMemo(() => {
  const map: Record<number, AvailableEmoji[]> = {};

  for (const e of emojis) {
    if (!map[e.unlockLevel]) map[e.unlockLevel] = [];
    map[e.unlockLevel].push(e);
  }

  return map;
}, [emojis]);




  const channelRef = useRef(channel);
  useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  const prevChannelRef = useRef<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${BACKEND_URL}/me/role`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setIsAdmin(d?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);
useEffect(() => {
  if (!mentionOpen) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  const q = mentionQuery.trim();

  const t = setTimeout(() => {
    if (!q) {
      setMentionUsers([]);
      return;
    }

    fetch(`${BACKEND_URL}/users/search?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const users = Array.isArray(d?.users) ? d.users : [];
        setMentionUsers(users);

        setMentionCache((prev) => {
          const next = new Map(prev);
          for (const u of users) {
            next.set(
              u.name.toLowerCase().replace(/\s+/g, "_"),
              u.id
            );
          }
          return next;
        });
      })
      .catch(() => setMentionUsers([]));
  }, 250); // 🔥 debounce delay

  return () => clearTimeout(t);
}, [mentionQuery, mentionOpen]);


  const canPost = channel !== "announcements" || isAdmin;

  const fetchMessages = async (
    token: string,
    before?: string,
    channelOverride?: string
  ) => {
    const chan = channelOverride ?? channelRef.current ?? "global";

    const url = new URL(`${BACKEND_URL}/global/messages`);
    if (before) url.searchParams.set("before", before);
    url.searchParams.set("channel", chan);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) return;

    const next = Array.isArray(data?.messages) ? data.messages : [];

    if (before) {
      setMessages((prev) => [...next, ...prev]);
      if (next.length < 50) setHasMore(false);
    } else {
      setMessages(next);
    }
  };
  function insertEmoji(e: AvailableEmoji) {
  const token = e.type === "image" ? `:${e.code}:` : e.value;
  setText((t) => (t ? `${t} ${token}` : token));
}

useEffect(() => {
  if (!emojiOpen) return;

  const onDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      !target.closest("[data-emoji-popover]") &&
      !target.closest("[data-emoji-btn]")
    ) {
      setEmojiOpen(false);
    }
  };

  window.addEventListener("mousedown", onDown);
  return () => window.removeEventListener("mousedown", onDown);
}, [emojiOpen]);



function insertSystemEmoji(emoji: any) {
  const native = emoji.native;
  setText((t) => (t ? t + native : native));
}

function insertMention(name: string, id?: number) {
  const safeName = name.replace(/\s+/g, "_"); // ✅ THIS LINE

  setText((prev) =>
    prev.replace(/@([a-zA-Z0-9_]*)$/, `@${safeName} `)
  );

  if (id) {
    setMentionCache((prev) => {
      const next = new Map(prev);
      next.set(safeName.toLowerCase(), id); // ✅ IMPORTANT
      return next;
    });
  }

  setMentionOpen(false);
}

function renderFormattedContent(
  content: string,
  emojiMap: Map<string, AvailableEmoji>,
  senderLevel?: number | null
) {
  const parts = content.split(/\*\*(.*?)\*\*/g);

  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <strong key={i}>
          {renderContentWithEmojis(part, emojiMap, senderLevel)}
        </strong>
      );
    }
    return (
      <span key={i}>
        {renderContentWithEmojis(part, emojiMap, senderLevel)}
      </span>
    );
  });
}


  async function markGlobalReadOnServer(channelName: string) {
    const token = localStorage.getItem("token");
    if (!token) return;

    await fetch(`${BACKEND_URL}/global/channels/${channelName}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  useEffect(() => {
  let cancelled = false;
  const token = localStorage.getItem("token");
  if (!token) return;

  setEmojiLoading(true);

  fetch(`${BACKEND_URL}/emojis/available`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((d) => {
      if (cancelled) return;
      setEmojis(Array.isArray(d?.emojis) ? d.emojis : []);

      
    })
    .catch(() => {
      if (cancelled) return;
      setEmojis([]);
    })
    .finally(() => {
      if (cancelled) return;
      setEmojiLoading(false);
    });

  return () => {
    cancelled = true;
  };
}, []);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !socket) return;

    const next = channel || "global";
    const prev = prevChannelRef.current;

    if (prev && prev !== next) {
      socket.emit("channel_leave", { channel: prev });
    }

    socket.emit("channel_join", { token, channel: next });
    prevChannelRef.current = next;
  }, [channel, socket]);

  

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setMessages([]);
    setHasMore(true);
    setNewMsgCount(0);
    setTypingUsers([]);

    setLoadingInitial(true);
    fetchMessages(token, undefined, channel).finally(() => {
      setLoadingInitial(false);
      markGlobalReadOnServer(channel || "global");
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: "auto" })
      );
    });
  }, [channel]);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const onScroll = async () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;

      setShowScroll(!nearBottom);
      if (nearBottom) setNewMsgCount(0);

      if (el.scrollTop < 80 && !loadingMore && hasMore) {
        const token = localStorage.getItem("token");
        if (!token || messages.length === 0) return;

        setLoadingMore(true);
        const oldest = messages[0];
        const prevHeight = el.scrollHeight;

        await fetchMessages(token, oldest.createdAt);
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight + el.scrollTop;
        });
        setLoadingMore(false);
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages, loadingMore, hasMore]);

 const sendGlobal = async () => {
  const token = localStorage.getItem("token");
  let content = text.trim();
  if (!token || !socket || !content) return;

  const isAnnouncement = channel === "announcements";
  if (!isAnnouncement && content.length > MAX_MESSAGE_LEN) return;
  if (!canPost) return;

  // ✅ sanitize FIRST
  content = sanitizeOutgoingMessage(content, emojiMap, myLevel);

  // ✅ THEN extract mentions (from final content)
 const mentions = await resolveMentions(content, mentionCache);

  setText("");

  socket.emit("global_message", {
    content,
    channel,
    mentions,
  });
const userId = myId;
  socket.emit("stop_typing", { id: userId, channel });
};

  const handleTyping = () => {
    if (!socket) return;

    const userId = myId;
const userName = myName;

    socket.emit("typing", { id: userId, name: userName, channel });

    clearTimeout((window as any).typingTimeout);
    (window as any).typingTimeout = setTimeout(() => {
      socket.emit("stop_typing", { id: userId, channel });
    }, 2000);
  };

  return (
    <section className="relative flex flex-col flex-1 bg-[#2b2d31] text-white overflow-hidden">
      <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between flex-shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">#</span>
          <h2 className="font-semibold">{channel}</h2>
          {!canPost && (
            <span className="text-xs text-white/60 ml-2">
              Read-only channel
            </span>
          )}
        </div>
      </div>

      <div
        ref={scrollAreaRef}
         className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4 custom-scroll"
      >
        {loadingMore && (
          <p className="text-center text-xs text-gray-400 mb-2">
            Loading older messages...
          </p>
        )}

        {loadingInitial && (
          <div className="text-sm text-white/60">Loading messages…</div>
        )}

       {messages.map((m) => {
  const isAnnouncement = channel === "announcements";

  return (
  <div key={m.id} className="flex items-start gap-3">
            <div className="relative shrink-0">
              <img
  src={isAnnouncement ? asset("logo.png") : avatarSrc(m.user?.avatar)}
                alt={m.user?.name || "User"}
                onClick={() => {
  if (!isAnnouncement && m.user?.id) {
    router.push(`/profile/${m.user.id}`);
  }
}}
                className={`w-8 h-8 rounded-full shrink-0 object-cover ${
  !isAnnouncement && m.user?.isPremium ? "ring-2 ring-yellow-400" : ""
} ${!isAnnouncement && m.user?.id ? "cursor-pointer hover:opacity-80" : ""}`}
                onError={(e) =>
                   ((e.currentTarget as HTMLImageElement).src =
                  asset("avatars/default.webp"))
}
              />
              {!isAnnouncement && m.user?.id ? (
  <OnlineIndicator online={onlineUsers.includes(m.user.id)} />
) : null}
            </div>

             <div className="min-w-0 flex-1">

              <div className="flex flex-col min-w-0 mb-1">
  {/* ROW 1 */}
  <div className="flex items-center gap-2 min-w-0">
    <span className="flex items-center gap-1 font-semibold text-sm min-w-0">
      <span className="truncate">
        {isAnnouncement ? "Networ.King" : (m.user?.name || "User")}
      </span>

      {!isAnnouncement && typeof m.user?.currentLevel === "number" && (
        <LevelBadge lvl={m.user.currentLevel} />
      )}

      {!isAnnouncement && m.user?.isPremium && <PremiumBadge />}
    </span>
  </div>

  {/* ROW 2 */}
  <div className="flex items-center gap-2 text-xs text-gray-400">
    {!isAnnouncement && m.user?.mainCountry && (
      <FlagIcon code={m.user.mainCountry} />
    )}
    <span>{formatTs(m.createdAt)}</span>
  </div>
</div>

{isAnnouncement ? (
  <div className="
    relative rounded-xl p-4
    bg-gradient-to-br from-yellow-500/10 via-amber-400/10 to-yellow-600/10
    border border-yellow-400/30
    shadow-[0_0_20px_rgba(250,204,21,0.15)]
  ">
    {/* Glow */}
    <div className="absolute inset-0 rounded-xl pointer-events-none
      bg-gradient-to-r from-yellow-400/0 via-yellow-400/10 to-yellow-400/0 blur-xl opacity-40" />

    <div className="relative z-10">
      <div className="text-xs uppercase tracking-widest text-yellow-300/80 mb-1">
        ✨ Official Update
      </div>

      <div className="text-sm text-yellow-100 whitespace-pre-wrap leading-relaxed">
        {renderFormattedContent(m.content, emojiMap, m.user?.currentLevel)}
      </div>
    </div>
  </div>
) : (
  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-snug [overflow-wrap:anywhere]">
    {renderContentWithEmojis(
  m.content,
  emojiMap,
  m.user?.currentLevel
)}
  </p>
)}


            </div>
          </div>
           );
})}

        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-200 italic flex items-center gap-1 mt-2 ml-10">
            <span>
              {typingUsers.map((u) => u.name).slice(0, 2).join(", ")}
              {typingUsers.length > 2 ? " and others" : ""}{" "}
              {typingUsers.length === 1 ? "is typing" : "are typing"}
            </span>
            <span className="flex gap-0.5 text-amber-400 animate-pulse">
              • • •
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {canPost ? (
<div className="p-3 border-t border-white/10 flex items-center gap-2 flex-shrink-0 relative min-w-0">
  <button
    type="button"
    data-emoji-btn
    onClick={() => setEmojiOpen((v) => !v)}
    className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg"
    title="Emojis"
  >
    😊
  </button>

  

 {emojiOpen && (
  <div
    data-emoji-popover
className="
  fixed bottom-20 left-1/2 -translate-x-1/2   /* mobile */
  sm:absolute sm:bottom-14 sm:left-1 sm:translate-x-0
  w-[380px]  max-w-[90vw]
  bg-[#1e1f22] border border-white/10 rounded-xl shadow-xl p-3
  z-[999999]
" >
    {/* HEADER */}
    <div className="flex items-center justify-between mb-2">
      <div className="text-sm font-semibold">Emojis</div>

      <button
        type="button"
        onClick={() => setEmojiOpen(false)}
        className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15"
      >
        close
      </button>
    </div>

    {/* TABS */}
    <div className="flex gap-2 mb-3">

      <button
        onClick={() => setEmojiTab("custom")}
        className={`px-2 py-1 text-xs rounded ${
          emojiTab === "custom"
  ? "bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-[0_0_10px_rgba(250,204,21,0.6)]"
  : "bg-white/10"
        }`}
      >
        👑 Level
      </button>
      <button
        onClick={() => setEmojiTab("system")}
        className={`px-2 py-1 text-xs rounded ${
          emojiTab === "system"
            ? "bg-amber-400 text-black"
            : "bg-white/10"
        }`}
      >
        😊 Classic
      </button>

      
    </div>

    {/* CONTENT */}
    {emojiTab === "system" ? (
      <div className="h-[260px] overflow-hidden">
        <Picker
          data={data}
          onEmojiSelect={insertSystemEmoji}
          theme="dark"
        />
      </div>
    ) : emojiLoading ? (
      <div className="text-sm text-white/60">Loading…</div>
    ) : emojis.length === 0 ? (
      <div className="text-sm text-white/60">No emojis yet.</div>
    ) : (
      <div className="space-y-4 max-h-60 overflow-y-auto pr-1">

  {/* CURRENT LEVEL */}
  <div>
    <div className="text-xs text-amber-300 mb-2 font-semibold tracking-wide">
      Your Level ({myLevel})
    </div>

    <div className="flex gap-2 flex-wrap">
      {emojis
  .filter((e) => e.unlockLevel <= myLevel)
  .map((e) => (
        <button
          key={e.id}
          onClick={() => insertEmoji(e)}
          className="
            w-9 h-9 rounded-lg flex items-center justify-center
            bg-gradient-to-br from-amber-400/20 to-yellow-300/10
            border
            hover:scale-110 active:scale-95 hover:shadow-[0_0_12px_rgba(250,204,21,0.6)]
            transition
          "
        >
          <EmojiIcon e={e} />
        </button>
      ))}
    </div>
  </div>

  {/* NEXT LEVEL PREVIEW */}
  <div>
    <div className="text-xs text-white/50 mb-2 flex items-center gap-2">
      <span>Next Level ({myLevel + 1})</span>
      <span className="text-red-400">🔒</span>
    </div>

    <div className="flex gap-2 flex-wrap">
      {(emojisByLevel[myLevel + 1] || []).map((e) => (
  <div
    key={e.id}
    className="relative w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center"
  >
    {/* REAL EMOJI */}
    <div className="opacity-80 blur-[1px] scale-95">
      <EmojiIcon e={e} />
    </div>

    {/* DARK OVERLAY */}
    <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />

    {/* LOCK ICON */}
    <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
      🔒
    </div>
  </div>
))}
    </div>
  </div>

</div>
    )}
  </div>
)}

  <textarea
  ref={textareaRef}
  rows={1}
  maxLength={channel === "announcements" ? 10000 : MAX_MESSAGE_LEN}
  className="flex-1 min-w-0 bg-[#313338] text-white rounded-lg px-3 py-2 text-sm focus:outline-none resize-none overflow-hidden"
  placeholder={`Message #${channel}`}
  value={text}
  onChange={(e) => {
  const value = e.target.value;
  setText(value);

  if (canPost) handleTyping();

  const match = value.match(/@([a-zA-Z0-9_.\-']*)$/);

  if (match) {
  const query = match[1];

  setMentionOpen(true);
  setMentionQuery(query);

  if (query.length === 0) {
    setMentionUsers([]); // empty → shows hint
  }
} else {
  setMentionOpen(false);
}
}}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendGlobal();
    }
  }}
/>

{mentionOpen && (
  <div className="absolute bottom-16 left-3 w-64 bg-[#1e1f22] border border-white/10 rounded-lg shadow-xl z-[9999] max-h-48 overflow-y-auto">

    {mentionUsers.length === 0 ? (
      <div className="px-3 py-2 text-xs text-white/50">
        Type a name to mention someone
      </div>
    ) : (
      mentionUsers.map((u, i) => (
        <button
          key={u.id}
          onClick={() => insertMention(u.name, u.id)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10"
        >
          <img src={avatarSrc(u.avatar)} className="w-6 h-6 rounded-full" />
          <span>{u.name}</span>
        </button>
      ))
    )}
  </div>
)}

  <button
    type="button"
    onClick={sendGlobal}
    className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold rounded-lg"
  >
    Send
  </button>
</div>

      ) : (
  <div className="p-4 border-t border-white/10 flex-shrink-0">
    <div className="w-full rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 px-4 py-4 text-center">
      
      <div className="text-lg mb-1">📢</div>

      <div className="text-sm font-semibold text-white/90">
        Announcements
      </div>

      <div className="text-xs text-white/60 mt-1">
        You can read all our updates here
      </div>

    </div>
  </div>
)}
    </section>
  );
}

function isEmojiOnlyMessage(
  content: string,
  emojiMap: Map<string, AvailableEmoji>
) {
  const parts = content.trim().split(/\s+/);

  if (parts.length === 0) return false;

  return parts.every((part) => {
    // custom emoji
    if (/^:[a-zA-Z0-9_]+:$/.test(part)) {
      const code = part.slice(1, -1);
      return emojiMap.has(code);
    }

    // unicode emoji (basic check)
    return /\p{Extended_Pictographic}/u.test(part);
  });
}
function renderContentWithEmojis(
  content: string,
  emojiMap: Map<string, AvailableEmoji>,
  senderLevel?: number | null
) {
  // split by :code: tokens
  const parts = content.split(/(:[a-zA-Z0-9_]+:)/g);

return parts.map((part, idx) => {
  const m = /^:([a-zA-Z0-9_]+):$/.exec(part);
 if (!m) {
  return part.split(/(@[a-zA-Z0-9_]+)/g).map((chunk, i2) => {
    if (chunk.startsWith("@")) {
      return (
        <span key={`${idx}-${i2}`} className="text-blue-400 font-semibold">
          {chunk}
        </span>
      );
    }
    return <span key={`${idx}-${i2}`}>{chunk}</span>;
  });
}

  const code = m[1];
  const e = emojiMap.get(code);

  // ❌ emoji doesn't exist
  if (!e) return <span key={idx}>{part}</span>;

  // ❌ sender NOT allowed to use it → show raw text
  if (!senderLevel || e.unlockLevel > senderLevel) {
    return <span key={idx}>{part}</span>;
  }

  // ✅ VALID → show emoji FOR EVERYONE
 const isBig = isEmojiOnlyMessage(content, emojiMap);

if (e.type === "image") {
  return (
    <img
      key={idx}
      src={asset(e.value)}
      alt={e.label ?? code}
      className={`inline-block mx-0.5 ${
        isBig
          ? "w-14 h-14 align-middle"
          : "inline-block w-10 h-10 align-[-0.3em] mx-0.5"
      }`}
      draggable={false}
    />
  );
}

  return (
    <span key={idx} className="mx-0.5">
      {e.value}
    </span>
  );
});
}


/* ------------------------------ Level Chat UI ------------------------------ */
function LevelChat({
  channel,
  levelNumber,
  socket,
  onLevelUnreadTotal,
  isMobile,
  currentLevel,
}: {
  channel: string;
  levelNumber: number;
  socket: Socket;
  onLevelUnreadTotal?: (levelChannelId: string, total: number) => void;
  isMobile?: boolean;
  currentLevel: number | null;
}) {
  const router = useRouter();
 const [myId, setMyId] = useState<number | null>(null);
const [myName, setMyName] = useState("You");
const [myAvatar, setMyAvatar] = useState<string | null>(null);
const [myPremium, setMyPremium] = useState(false);

useEffect(() => {
  setMyId(Number(localStorage.getItem("userId")));
  setMyName(localStorage.getItem("userName") || "You");
  setMyAvatar(localStorage.getItem("avatar"));
  setMyPremium(localStorage.getItem("isPremium") === "1");
}, []);

  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [onlineUsersFull, setOnlineUsersFull] = useState<
    { id: number; name: string; avatar?: string | null; mainCountry?: string | null;  }[]
  >([]);
  const [membersOpen, setMembersOpen] = useState(false);

  const levelRoom = `level-${levelNumber}`;

  const [mentionOpen, setMentionOpen] = useState(false);
const [mentionQuery, setMentionQuery] = useState("");
const [mentionUsers, setMentionUsers] = useState<any[]>([]);
const [mentionIndex, setMentionIndex] = useState(0);
const [mentionCache, setMentionCache] = useState<Map<string, number>>(new Map());


  const unreadKey = (lvl: number, subId: number) =>
    `unread:lvl:${lvl}:sub:${subId}`;

  function readUnreadFromStorage(lvl: number, subId: number) {
    const raw = localStorage.getItem(unreadKey(lvl, subId));
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function writeUnreadToStorage(lvl: number, subId: number, n: number) {
    if (n <= 0) localStorage.removeItem(unreadKey(lvl, subId));
    else localStorage.setItem(unreadKey(lvl, subId), String(n));
  }


  async function markSubReadOnServer(lvl: number, subId: number) {
    const token = localStorage.getItem("token");
    if (!token) return;

    await fetch(`${BACKEND_URL}/chat/levels/${lvl}/subchannels/${subId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // ✅ members with access
  const [memberCount, setMemberCount] = useState<number | null>(null);

  const [emojiTab, setEmojiTab] = useState<"system" | "custom">("custom");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(
          `${BACKEND_URL}/levels/${levelNumber}/member-count`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;

        const n = Number(data?.accessCount);
        if (!cancelled) setMemberCount(Number.isFinite(n) ? n : null);
      } catch {
        if (!cancelled) setMemberCount(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [levelNumber]);

  const [unreadBySub, setUnreadBySub] = useState<Record<number, number>>({});
  const totalUnread = Object.values(unreadBySub).reduce((a, b) => a + (b || 0), 0);

  useEffect(() => {
    if (!onLevelUnreadTotal) return;
    onLevelUnreadTotal(`level-${levelNumber}`, totalUnread);
  }, [totalUnread, levelNumber, onLevelUnreadTotal]);

 useEffect(() => {
  if (!mentionOpen) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  const q = mentionQuery.trim();

  const t = setTimeout(() => {
    if (!q) {
      setMentionUsers([]);
      return;
    }

    fetch(
      `${BACKEND_URL}/levels/${levelNumber}/search-users?q=${encodeURIComponent(q)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
      .then((r) => r.json())
      .then((d) => {
        const users = Array.isArray(d?.users) ? d.users : [];
        setMentionUsers(users);

        setMentionCache((prev) => {
          const next = new Map(prev);
          for (const u of users) {
            next.set(
              u.name.toLowerCase().replace(/\s+/g, "_"),
              u.id
            );
          }
          return next;
        });
      })
      .catch(() => setMentionUsers([]));
  }, 250);

  return () => clearTimeout(t);
}, [mentionQuery, mentionOpen, levelNumber]);

  const [subChannels, setSubChannels] = useState<SubChannel[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [activeSub, setActiveSub] = useState<SubChannel | null>(null);

  const [messages, setMessages] = useState<LevelMessage[]>([]);
  const [text, setText] = useState("");
  const myLevel = currentLevel ?? 1;
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [emojis, setEmojis] = useState<AvailableEmoji[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiLoading, setEmojiLoading] = useState(false);

  const emojiMap = useMemo(() => {
  const m = new Map<string, AvailableEmoji>();
  for (const e of emojis) m.set(e.code, e);
  return m;
}, [emojis]);

const emojisByLevel = useMemo(() => {
  const map: Record<number, AvailableEmoji[]> = {};

  for (const e of emojis) {
    if (!map[e.unlockLevel]) map[e.unlockLevel] = [];
    map[e.unlockLevel].push(e);
  }

  return map;
}, [emojis]);



  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSubRef = useRef<SubChannel | null>(activeSub);
  useEffect(() => {
    activeSubRef.current = activeSub;
  }, [activeSub]);

  const levelRef = useRef<number>(levelNumber);
  useEffect(() => {
    levelRef.current = levelNumber;
  }, [levelNumber]);

  const joinedLevelRoomRef = useRef<string | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !socket) return;
    

    const prev = joinedLevelRoomRef.current;
    const next = levelRoom;

    if (prev && prev !== next) {
      socket.emit("channel_leave", { channel: prev });
    }

    socket.emit("channel_join", { token, channel: next });
    joinedLevelRoomRef.current = next;

    return () => {
      if (joinedLevelRoomRef.current === next) {
        socket.emit("channel_leave", { channel: next });
        joinedLevelRoomRef.current = null;
      }
    };
  }, [levelRoom, socket]);

  useEffect(() => {
  const el = textareaRef.current;
  if (!el) return;

  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}, [text]);

  useEffect(() => {
    if (!socket) return;

    const onChannelOnlineUsers = (payload: { channel: string; users: any[] }) => {
      if (payload.channel !== levelRoom) return;

      const list = Array.isArray(payload.users) ? payload.users : [];
      setOnlineUsers(list.map((u) => u.id));
      setOnlineUsersFull(
        list.map((u) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar ?? null,
          mainCountry: u.mainCountry ?? null,
        }))
      );
    };

    socket.on("channel_online_users", onChannelOnlineUsers);
    return () => {
      socket.off("channel_online_users", onChannelOnlineUsers);
    };
  }, [levelRoom]);

  useEffect(() => {
    setActiveSub(null);
    setMessages([]);
    setText("");
    setEmojiOpen(false);
  }, [channel]);

 useEffect(() => {
  let cancelled = false;
  setLoadingSubs(true);

  const token = localStorage.getItem("token");
  if (!token) {
    setSubChannels([]);
    setLoadingSubs(false);
    return;
  }

  fetch(`${BACKEND_URL}/chat/levels/${levelNumber}/subchannels`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((data) => {
      if (cancelled) return;

      const list = Array.isArray(data?.subChannels)
        ? data.subChannels
        : Array.isArray(data)
        ? data
        : [];

      setSubChannels(list);

      const map: Record<number, number> = {};
      for (const sc of list) {
        map[sc.id] = readUnreadFromStorage(levelNumber, sc.id);
      }
      setUnreadBySub(map);

    })
    .catch(() => {
      if (cancelled) return;
      setSubChannels([]);
    })
    .finally(() => {
      if (cancelled) return;
      setLoadingSubs(false);
    });

  return () => {
    cancelled = true;
  };
}, [levelNumber]);

  useEffect(() => {
    if (!activeSub) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    let cancelled = false;
    setLoadingMsgs(true);

    fetch(
      `${BACKEND_URL}/chat/levels/${levelNumber}/subchannels/${activeSub.id}/messages`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setMessages(Array.isArray(data?.messages) ? data.messages : []);
        requestAnimationFrame(() =>
          bottomRef.current?.scrollIntoView({ behavior: "auto" })
        );
        markSubReadOnServer(levelNumber, activeSub.id);
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingMsgs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [levelNumber, activeSub]);

  

  useEffect(() => {
    if (!activeSub) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    if (!socket) return;


    socket.emit("join_level_sub", {
      token,
      levelNumber,
      subChannelId: activeSub.id,
    });

    if (joinedLevelRoomRef.current !== levelRoom) {
      socket.emit("channel_join", { token, channel: levelRoom });
      joinedLevelRoomRef.current = levelRoom;
    }
  }, [levelNumber, activeSub, levelRoom]);

  useEffect(() => {
    if (!socket) return;

    const onMsg = (msg: any) => {
      const lvl = levelRef.current;
      const sub = activeSubRef.current;

      if (msg.levelNumber !== lvl) return;

    
      const isMine = !!(msg.user?.id && myId && msg.user.id === myId);

      if (!sub) {
        if (isMine) return;

        setUnreadBySub((prev) => {
          const current =
            prev[msg.subChannelId] ??
            readUnreadFromStorage(lvl, msg.subChannelId);
          const nextCount = current + 1;

          const next = { ...prev, [msg.subChannelId]: nextCount };
          writeUnreadToStorage(lvl, msg.subChannelId, nextCount);
          return next;
        });
        return;
      }

     if (msg.subChannelId !== sub.id) {
  if (!isMine) {
    setUnreadBySub((prev) => {
      const current =
        prev[msg.subChannelId] ??
        readUnreadFromStorage(lvl, msg.subChannelId);
      const nextCount = current + 1;

      const next = { ...prev, [msg.subChannelId]: nextCount };
      writeUnreadToStorage(lvl, msg.subChannelId, nextCount);
      return next;
    });
  }
  return;
}

      setMessages((prev) => [...prev, msg]);
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      );
      markSubReadOnServer(lvl, sub.id);
    };

    socket.on("level_sub_message", onMsg);
    return () => {
      socket.off("level_sub_message", onMsg);
    };
    }, [socket]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let cancelled = false;
    setEmojiLoading(true);

    fetch(`${BACKEND_URL}/emojis/available`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setEmojis(Array.isArray(d?.emojis) ? d.emojis : []);

    
      })
      .catch(() => {
        if (cancelled) return;
        setEmojis([]);
      })
      .finally(() => {
        if (cancelled) return;
        setEmojiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [levelNumber]);

  useEffect(() => {
    if (!emojiOpen) return;

    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("[data-emoji-popover]") &&
        !target.closest("[data-emoji-btn]")
      ) {
        setEmojiOpen(false);
      }
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [emojiOpen]);
async function sendLevelMessage() {
  if (!activeSub) return;

  const token = localStorage.getItem("token");
  let content = text.trim();
  if (!token || !socket || !content) return;
  if (content.length > MAX_MESSAGE_LEN) return;

  // ✅ sanitize FIRST
  content = sanitizeOutgoingMessage(content, emojiMap, myLevel);

  // ✅ THEN extract mentions
 const mentions = await resolveMentions(content, mentionCache);

  setText("");
  setEmojiOpen(false);


  socket.emit("level_sub_message", {
    token,
    levelNumber,
    subChannelId: activeSub.id,
    content,
    mentions,
  });
}

function insertEmoji(e: AvailableEmoji) {
  const token = e.type === "unicode" ? e.value : `:${e.code}:`;
  setText((t) => (t ? `${t} ${token}` : token));
}


function insertSystemEmoji(emoji: any) {
  const native = emoji.native;
  setText((t) => (t ? t + native : native));
}


  /* -------------------------- search UI -------------------------- */
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchUsers, setSearchUsers] = useState<
    { id: number; name: string; avatar?: string | null; mainCountry?: string | null }[]
  >([]);

  async function runSearch(q: string) {
    const token = localStorage.getItem("token");
    if (!token) return;

    const query = q.trim();
    if (!query) {
      setSearchUsers([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/levels/${levelNumber}/search-users?q=${encodeURIComponent(
          query
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSearchUsers([]);
        return;
      }
      setSearchUsers(Array.isArray(data?.users) ? data.users : []);
    } finally {
      setSearchLoading(false);
    }
  }

 function insertMention(name: string, id?: number) {
  const safeName = name.replace(/\s+/g, "_"); // ✅ THIS LINE

  setText((prev) =>
    prev.replace(/@([a-zA-Z0-9_]*)$/, `@${safeName} `)
  );

  if (id) {
    setMentionCache((prev) => {
      const next = new Map(prev);
      next.set(safeName.toLowerCase(), id); // ✅ IMPORTANT
      return next;
    });
  }

  setMentionOpen(false);
}

  useEffect(() => {
    if (!searchOpen && !membersOpen) return;
    const t = setTimeout(() => runSearch(searchQ), 250);
    return () => clearTimeout(t);
  }, [searchQ, searchOpen, membersOpen]);

  const levelTitle = LEVEL_NAMES[levelNumber] || `Level ${levelNumber}`;
  const showSubsFullscreen = !!isMobile && !!activeSub; // ✅ fullscreen only when inside a sub

  const SubPickerContent = (
    <div className="p-4 space-y-2 overflow-y-auto">
      {loadingSubs && <div className="text-sm text-white/60">Loading…</div>}

      {!loadingSubs &&
        subChannels.map((sc) => (
          <button
            type="button"
            key={sc.id}
            onClick={() => {
              setActiveSub(sc);
              setUnreadBySub((prev) => {
                const next = { ...prev, [sc.id]: 0 };
                writeUnreadToStorage(levelNumber, sc.id, 0);
                return next;
              });

              markSubReadOnServer(levelNumber, sc.id);
            }}
            className="w-full text-left px-3 py-3 rounded-lg hover:bg-white/10 flex items-center gap-2 border-b border-white/30"
          >
            <span className="font-semibold truncate">#</span>
            <span className="text-lg">{sc.emoji || "💬"}</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-semibold truncate">{sc.name}</span>

              {(unreadBySub[sc.id] ?? 0) > 0 && (
                <span className="ml-auto min-w-[22px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-extrabold flex items-center justify-center">
                  {(unreadBySub[sc.id] ?? 0) > 99
                    ? "99+"
                    : unreadBySub[sc.id] ?? 0}
                </span>
              )}
            </div>
          </button>
        ))}

      {!loadingSubs && subChannels.length === 0 && (
        <div className="text-sm text-white/60">
          No subchannels found for this level.
        </div>
      )}
    </div>
  );

  return (
    <section className="flex flex-col flex-1 bg-black/30 text-white overflow-hidden min-w-0">
      {/* Level top bar */}
      <div className="border-b border-white/10 px-4 py-2 flex flex-col gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">
            {/* ✅ point (3): icon in title */}
            <span className="mr-1">{LEVEL_ICONS[levelNumber] || "🏰"}</span>
            Castle Level {levelNumber} —{" "}
            <span className="text-white/85">{levelTitle}</span>
            {activeSub ? (
              <span className="ml-2 text-white/60 text-sm">
                / {activeSub.emoji || "💬"} #{activeSub.name}
              </span>
            ) : null}
          </div>

          {/* ✅ point (6): show info row (members + online) */}
          <div className="flex items-center gap-2 text-xs text-white/55 mt-0.5">
            <span>
              {memberCount == null ? "…" : `${formatInt(memberCount)} members`}
            </span>
            <span className="text-white/25">•</span>
            <span>{onlineUsersFull.length} online</span>

            {!activeSub && totalUnread > 0 && (
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-300 font-extrabold">
                {totalUnread > 99 ? "99+" : totalUnread} new
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full justify-end">
          

          <button
            type="button"
            onClick={() => {
              setMembersOpen(true);
              setSearchQ("");
              setSearchUsers([]);
            }}
            className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-xs"
            title="Members"
          >
            Search 🔍
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-xs px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
          >
            ← Dashboard
          </button>

          {activeSub ? (
            <button
              type="button"
              onClick={() => {
                setActiveSub(null);
                setEmojiOpen(false);

              }}
              className="text-xs px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/20"
            >
              ← Back
            </button>
          ) : null}
        </div>
      </div>

      {/* ✅ Members Drawer (online + search) */}
      {membersOpen && (
        <>
          <button
            className="fixed inset-0 z-[9998] bg-black/60"
            onClick={() => setMembersOpen(false)}
            aria-label="Close members"
          />
          <div className="fixed right-0 top-0 h-full w-[86vw] max-w-[360px] z-[9999] bg-[#1e1f22] border-l border-white/10 flex flex-col">
            <div className="h-12 px-3 flex items-center justify-between border-b border-white/10">
              <div className="text-sm font-semibold text-white/80">
                Members — lvl {levelNumber}
              </div>
              <button
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs"
                onClick={() => setMembersOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-white/10">
              <div className="text-xs text-white/60 mb-2">
                Search users in this level (username)
              </div>
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Type a username…"
                className="w-full rounded-xl bg-[#313338] border border-white/10 px-3 py-2 text-sm outline-none"
              />

              <div className="mt-3 max-h-56 overflow-y-auto space-y-2">
                {searchUsers.length === 30 && (
  <div className="text-xs text-white/40 mt-1">
    Showing first 30 results — refine your search
  </div>
)}

                {searchLoading ? (
                  <div className="text-sm text-white/60">Searching…</div>
                ) : searchQ.trim() && searchUsers.length === 0 ? (
                  <div className="text-sm text-white/60">No users found.</div>
                ) : (
                  searchUsers.map((u) => {
                    const isOnline = onlineUsers.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setMembersOpen(false);
                          router.push(`/profile/${u.id}`);
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
                      >
                        <img
                          src={avatarSrc(u.avatar)}
                          className="w-9 h-9 rounded-full object-cover"
                          onError={(e) =>
                   ((e.currentTarget as HTMLImageElement).src =
                  asset("avatars/default.webp"))
                       }
                        />
                        <div className="text-left min-w-0 flex-1">
                          <div className="font-semibold truncate flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isOnline ? "bg-green-400" : "bg-white/20"
                              }`}
                              title={isOnline ? "Online" : "Offline"}
                            />
                            <span className="truncate">{u.name}</span>
                            {u.mainCountry && <FlagIcon code={u.mainCountry} />}
                          </div>
                          <div className="text-xs text-white/60">Open profile</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Online list */}
            <div className="p-3 flex-1 overflow-y-auto">
              <div className="text-xs uppercase text-white/50 mb-2">
                Online — {onlineUsersFull.length}
              </div>
              <div className="space-y-2">
                {onlineUsersFull.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setMembersOpen(false);
                      router.push(`/profile/${u.id}`);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
                  >
                    <img
                      src={avatarSrc(u.avatar)}
                      className="w-9 h-9 rounded-full object-cover"
                      onError={(e) =>
                   ((e.currentTarget as HTMLImageElement).src =
                  asset("avatars/default.webp"))
                       }
                    />
                    <div className="min-w-0 text-left flex-1">
                      <div className="font-semibold truncate flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        <span className="truncate">{u.name}</span>
                        {u.mainCountry && <FlagIcon code={u.mainCountry} />}
                      </div>
                      <div className="text-xs text-white/60">Online now</div>
                    </div>
                  </button>
                ))}
                {onlineUsersFull.length === 0 && (
                  <div className="text-sm text-white/60">No online users yet.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ✅ Mobile fullscreen subchat (ONLY when activeSub on mobile) */}
      {showSubsFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-[#2b2d31] flex flex-col">
       <div className="border-b border-white/10 px-3 py-2 flex flex-col">

  {/* ROW 1 */}
  <div className="relative flex items-center justify-center">

       <button  className="absolute right-0 px-3 py-1 mt-2 rounded-md bg-white/10 hover:bg-white/15 text-sm"
>
      About
    </button>

    <div className="text-l mt-2 font-semibold text-white/80 truncate">
      {activeSub
        ? `lvl ${levelNumber} • ${activeSub.emoji || "💬"} #${activeSub.name}`
        : `lvl ${levelNumber}`}
    </div>

    <button
      type="button"
      onClick={() => {
        setActiveSub(null);
        setEmojiOpen(false);
      }}
      className="absolute left-0 px-3 py-1 mt-2 rounded-md bg-white/10 hover:bg-white/15 text-sm"
    >
      ← Back
    </button>

  </div>

  {/* SEPARATOR */}
  <div className="h-px bg-white/10 my-2 mt-4 mb-2" />

  {/* ROW 2 */}
  <div className="flex mt-4 items-center justify-center gap-4">

  </div>

</div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4">

              {loadingMsgs && (
                <div className="text-sm text-white/60">Loading messages…</div>
              )}

              {messages.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={avatarSrc(m.user?.avatar)}
                      alt={m.user?.name || "System"}
                      onClick={() =>
                        m.user?.id && router.push(`/profile/${m.user.id}`)
                      }
                      className={`w-8 h-8 rounded-full shrink-0 object-cover ${
  m.user?.isPremium ? "ring-2 ring-yellow-400" : ""
} ${m.user?.id ? "cursor-pointer hover:opacity-80" : ""}`}
                      onError={(e) =>
                   ((e.currentTarget as HTMLImageElement).src =
                  asset("avatars/default.webp"))
                       }
                    />
                    {m.user?.id ? (
                      <OnlineIndicator online={onlineUsers.includes(m.user.id)} />
                    ) : null}
                  </div>

                    <div className="min-w-0 flex-1">

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-semibold text-sm">
  {m.user?.name || "System"}

  {typeof m.user?.currentLevel === "number" && (
    <LevelBadge lvl={m.user.currentLevel} />
  )}

  {m.user?.isPremium && <PremiumBadge />}

  {m.user?.mainCountry && <FlagIcon code={m.user.mainCountry} />}
</span>
                      <span className="text-xs text-gray-400">
                        {formatTs(m.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-200 whitespace-pre-wrap leading-snug [overflow-wrap:anywhere]">
  {renderContentWithEmojis(
  m.content,
  emojiMap,
  m.user?.currentLevel
)}
</p>

                  </div>
                </div>
              ))}

              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t border-white/10 flex items-center gap-2 relative">
              <button
                type="button"
                data-emoji-btn
                onClick={() => setEmojiOpen((v) => !v)}
                className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg"
                title="Emojis"
              >
                😊
              </button>

             {emojiOpen && (
  <div
    data-emoji-popover
    className="absolute bottom-14 left-3 w-[320px] max-w-[80vw] bg-[#1e1f22] border border-white/10 rounded-xl shadow-xl p-3 z-[10000]"
  >
    {/* HEADER */}
    <div className="flex items-center justify-between mb-2">
      <div className="text-sm font-semibold">Emojis</div>

      <button
        type="button"
        onClick={() => setEmojiOpen(false)}
        className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15"
      >
        close
      </button>
    </div>

    {/* TABS */}
    <div className="flex gap-2 mb-3">
      

      <button
        onClick={() => setEmojiTab("custom")}
        className={`px-2 py-1 text-xs rounded ${
          emojiTab === "custom"
  ? "bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-[0_0_10px_rgba(250,204,21,0.6)]"
  : "bg-white/10"
        }`}
      >
        👑 Level
      </button>

      <button
        onClick={() => setEmojiTab("system")}
        className={`px-2 py-1 text-xs rounded ${
          emojiTab === "system"
            ? "bg-amber-400 text-black"
            : "bg-white/10"
        }`}
      >
        😊 Classic
      </button>
    </div>

    {/* CONTENT */}
    {emojiTab === "system" ? (
      <div className="h-[260px] overflow-hidden">
        <Picker
          data={data}
          onEmojiSelect={insertSystemEmoji}
          theme="dark"
        />
      </div>
    ) : emojiLoading ? (
      <div className="text-sm text-white/60">Loading…</div>
    ) : emojis.length === 0 ? (
      <div className="text-sm text-white/60">No emojis yet.</div>
    ) : (
     <div className="space-y-4 max-h-60 overflow-y-auto pr-1">

  {/* CURRENT LEVEL */}
  <div>
    <div className="text-xs text-amber-300 mb-2 font-semibold tracking-wide">
      Your Level ({myLevel})
    </div>

    <div className="flex gap-2 flex-wrap">
      {emojis
  .filter((e) => e.unlockLevel <= myLevel)
  .map((e) => (
        <button
          key={e.id}
          onClick={() => insertEmoji(e)}
          className="
            w-12 h-12 rounded-lg flex items-center justify-center
            bg-gradient-to-br from-amber-400/20 to-yellow-300/10
            border border-amber-400/30
            hover:scale-110 active:scale-95 hover:shadow-[0_0_12px_rgba(250,204,21,0.6)]
            transition
          "
        >
          <EmojiIcon e={e} />
        </button>
      ))}
    </div>
  </div>

  {/* NEXT LEVEL PREVIEW */}
  <div>
    <div className="text-xs text-white/50 mb-2 flex items-center gap-2">
      <span>Next Level ({myLevel + 1})</span>
      <span className="text-red-400">🔒</span>
    </div>

    <div className="flex gap-2 flex-wrap">
      {(emojisByLevel[myLevel + 1] || []).map((e) => (
  <div
    key={e.id}
    className="relative w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
  >
    {/* REAL EMOJI */}
    <div className="opacity-40 blur-[1px] scale-95">
      <EmojiIcon e={e} />
    </div>

    {/* DARK OVERLAY */}
    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

    {/* LOCK ICON */}
    <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
      🔒
    </div>
  </div>
))}
    </div>
  </div>

</div>
    )}
  </div>
)}


              <textarea
  ref={textareaRef}
  rows={1}
  maxLength={MAX_MESSAGE_LEN}
  className="flex-1 min-w-0 bg-[#313338] text-white rounded-lg px-3 py-2 text-sm focus:outline-none resize-none overflow-hidden"
  placeholder={`Message #${activeSub?.name ?? ""}`}
  value={text}
 onChange={(e) => {
  const value = e.target.value;
  setText(value);

  const match = value.match(/@([a-zA-Z0-9_.\-']*)$/);

  if (match) {
  const query = match[1];

  setMentionOpen(true);
  setMentionQuery(query);

  
  if (query.length === 0) {
    setMentionUsers([]); // empty → shows hint
  }
} else {
  setMentionOpen(false);
}
}}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendLevelMessage();
    }
  }}
/>

{mentionOpen && (
  <div className="absolute bottom-16 left-3 w-64 bg-[#1e1f22] border border-white/10 rounded-lg shadow-xl z-[9999] max-h-48 overflow-y-auto">

    {mentionUsers.length === 0 ? (
      <div className="px-3 py-2 text-xs text-white/50">
        Type a name to mention someone
      </div>
    ) : (
      mentionUsers.map((u, i) => (
        <button
          key={u.id}
          onClick={() => insertMention(u.name, u.id)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10"
        >
          <img src={avatarSrc(u.avatar)} className="w-6 h-6 rounded-full" />
          <span>{u.name}</span>
        </button>
      ))
    )}
  </div>
)}

              <button
                type="button"
                onClick={sendLevelMessage}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold rounded-lg"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content (animated like the new version) */}
      <div className="relative flex-1 min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          {!activeSub ? (
            <motion.div
              key="sub-list"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 overflow-y-auto"
            >
              {SubPickerContent}
            </motion.div>
          ) : (
            <motion.div
              key="sub-chat"
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 flex flex-col min-h-0"
            >
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4">

                {loadingMsgs && (
                  <div className="text-sm text-white/60">Loading messages…</div>
                )}

                {messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={avatarSrc(m.user?.avatar)}
                        alt={m.user?.name || "System"}
                        onClick={() =>
                          m.user?.id && router.push(`/profile/${m.user.id}`)
                        }
                        className={`w-8 h-8 rounded-full shrink-0 object-cover ${
  m.user?.isPremium ? "ring-2 ring-yellow-400" : ""
} ${m.user?.id ? "cursor-pointer hover:opacity-80" : ""}`}
                        onError={(e) =>
                   ((e.currentTarget as HTMLImageElement).src =
                  asset("avatars/default.webp"))
                       }
                      />
                      {m.user?.id ? (
                        <OnlineIndicator online={onlineUsers.includes(m.user.id)} />
                      ) : null}
                    </div>

                     <div className="min-w-0 flex-1">

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-semibold text-sm">
  {m.user?.name || "System"}

  {typeof m.user?.currentLevel === "number" && (
    <LevelBadge lvl={m.user.currentLevel} />
  )}

  {m.user?.isPremium && <PremiumBadge />}

  {m.user?.mainCountry && <FlagIcon code={m.user.mainCountry} />}
</span>

                        <span className="text-xs text-gray-400">
                          {formatTs(m.createdAt)}
                        </span>
                      </div>

                     <p className="text-sm text-gray-200 whitespace-pre-wrap leading-snug [overflow-wrap:anywhere]">
  {renderContentWithEmojis(
  m.content,
  emojiMap,
  m.user?.currentLevel
)}
</p>

                    </div>
                  </div>
                ))}

                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-white/10 flex items-center gap-2 relative">
                <button
                  type="button"
                  data-emoji-btn
                  onClick={() => setEmojiOpen((v) => !v)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg"
                  title="Emojis"
                >
                  😊
                </button>

                {emojiOpen && (
  <div
    data-emoji-popover
    className="absolute bottom-14 left-3 w-[320px] max-w-[80vw] bg-[#1e1f22] border border-white/10 rounded-xl shadow-xl p-3 z-[10000]"
  >
    {/* HEADER */}
    <div className="flex items-center justify-between mb-2">
      <div className="text-sm font-semibold">Emojis</div>

      <button
        type="button"
        onClick={() => setEmojiOpen(false)}
        className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15"
      >
        close
      </button>
    </div>

    {/* TABS */}
    <div className="flex gap-2 mb-3">
      

      <button
        onClick={() => setEmojiTab("custom")}
        className={`px-2 py-1 text-xs rounded ${
          emojiTab === "custom"
  ? "bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-[0_0_10px_rgba(250,204,21,0.6)]"
  : "bg-white/10"
        }`}
      >
        👑 Level
      </button>

      <button
        onClick={() => setEmojiTab("system")}
        className={`px-2 py-1 text-xs rounded ${
          emojiTab === "system"
            ? "bg-amber-400 text-black"
            : "bg-white/10"
        }`}
      >
        😊 Classic
      </button>
    </div>

    {/* CONTENT */}
    {emojiTab === "system" ? (
      <div className="h-[260px] overflow-hidden">
        <Picker
          data={data}
          onEmojiSelect={insertSystemEmoji}
          theme="dark"
        />
      </div>
    ) : emojiLoading ? (
      <div className="text-sm text-white/60">Loading…</div>
    ) : emojis.length === 0 ? (
      <div className="text-sm text-white/60">No emojis yet.</div>
    ) : (
     <div className="space-y-4 max-h-60 overflow-y-auto pr-1">

  {/* CURRENT LEVEL */}
  <div>
    <div className="text-xs text-amber-300 mb-2 font-semibold tracking-wide">
      Your Level ({myLevel})
    </div>

    <div className="flex gap-2 flex-wrap">
      {emojis
  .filter((e) => e.unlockLevel <= myLevel)
  .map((e) => (
        <button
          key={e.id}
          onClick={() => insertEmoji(e)}
          className="
            w-9 h-9 rounded-lg flex items-center justify-center
            bg-gradient-to-br from-amber-400/20 to-yellow-300/10
            border border-amber-400/30
            hover:scale-110 active:scale-95 hover:shadow-[0_0_12px_rgba(250,204,21,0.6)]
            transition
          "
        >
          <EmojiIcon e={e} />
        </button>
      ))}
    </div>
  </div>

  {/* NEXT LEVEL PREVIEW */}
  <div>
    <div className="text-xs text-white/50 mb-2 flex items-center gap-2">
      <span>Next Level ({myLevel + 1})</span>
      <span className="text-red-400">🔒</span>
    </div>

    <div className="flex gap-2 flex-wrap">
      {(emojisByLevel[myLevel + 1] || []).map((e) => (
  <div
    key={e.id}
    className="relative w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center"
  >
    {/* REAL EMOJI */}
    <div className="opacity-40 blur-[1px] scale-95">
      <EmojiIcon e={e} />
    </div>

    {/* DARK OVERLAY */}
    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

    {/* LOCK ICON */}
    <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
      🔒
    </div>
  </div>
))}
    </div>
  </div>

</div>
    )}
  </div>
)}

                <textarea
  ref={textareaRef}
  rows={1}
  maxLength={MAX_MESSAGE_LEN}
  className="flex-1 min-w-0 bg-[#313338] text-white rounded-lg px-3 py-2 text-sm focus:outline-none resize-none overflow-hidden"
  placeholder={`Message #${activeSub?.name ?? ""}`}
  value={text}
  onChange={(e) => {
  const value = e.target.value;
  setText(value);

  const match = value.match(/@([a-zA-Z0-9_.\-']*)$/);

  if (match) {
  const query = match[1];

  setMentionOpen(true);
  setMentionQuery(query);

  if (query.length === 0) {
    setMentionUsers([]); // empty → shows hint
  }
} else {
  setMentionOpen(false);
}
}}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
     sendLevelMessage();
    }
  }}
/>

                <button
                  type="button"
                  onClick={sendLevelMessage}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold rounded-lg"
                >
                  Send
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Modal (kept as-is; you can still use it later) */}
      {searchOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-[#1e1f22] border border-white/10 shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-white">
                  🔍 Search users (lvl {levelNumber} only)
                </div>
                <div className="text-xs text-white/60">
                  Searches by username only (case-insensitive).
                </div>
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10"
              >
                ✕
              </button>
            </div>

            <input
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Type a username…"
              className="w-full rounded-xl bg-[#313338] border border-white/10 px-3 py-2 text-sm outline-none"
            />

            <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
              {searchLoading ? (
                <div className="text-sm text-white/60">Searching…</div>
              ) : searchQ.trim() && searchUsers.length === 0 ? (
                <div className="text-sm text-white/60">No users found.</div>
              ) : (
                searchUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSearchOpen(false);
                      router.push(`/profile/${u.id}`);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
                  >
                    <img
                      src={avatarSrc(u.avatar)}
                      className="w-9 h-9 rounded-full object-cover"
                      onError={(e) =>
                   ((e.currentTarget as HTMLImageElement).src =
                  asset("avatars/default.webp"))
                       }
                    />
                    <div className="text-left min-w-0">
                      <div className="font-semibold truncate">
                        {u.name}
                        {u.mainCountry && <FlagIcon code={u.mainCountry} />}
                      </div>
                      <div className="text-xs text-white/60">Open profile</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}



/* --------------------------------- wrapper -------------------------------- */

export default function ChatWindow({
  channel,
  socket,
  onLevelUnreadTotal,
  isMobile = false,
  currentLevel,
}: {
  channel: string;
  socket: Socket;
  onLevelUnreadTotal?: (levelChannelId: string, total: number) => void;
  isMobile?: boolean;
  currentLevel: number | null;
}) {
  const levelNumber = useMemo(() => parseLevel(channel), [channel]);

  if (levelNumber == null) {
    return <GlobalChat channel={channel} socket={socket} currentLevel={currentLevel} />;
  }

  return (
  <LevelChat
    channel={channel}
    levelNumber={levelNumber}
    socket={socket}
    onLevelUnreadTotal={onLevelUnreadTotal}
    isMobile={isMobile}
     currentLevel={currentLevel}
  />
);
}
