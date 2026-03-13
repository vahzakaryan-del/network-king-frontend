"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import type React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { asset } from "@/lib/assets";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL!;
const MAX_MESSAGE_LEN = 500;

/* ----------------------------- shared helpers ----------------------------- */

function parseLevel(channel: string) {
  const m = /^level-(\d+)$/.exec(channel);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
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
    backgroundColor: `hsla(${hue}, 85%, 55%, 0.18)`,
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
        className="w-5 h-5"
        style={{ objectFit: "contain" }}
        draggable={false}
      />
    );
  }

  return <span>{e.value}</span>;
}


/* ------------------------------ Global Chat UI ----------------------------- */
function GlobalChat({ channel }: { channel: string }) {
  const router = useRouter();

  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [text, setText] = useState("");
  const [showScroll, setShowScroll] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [emojis, setEmojis] = useState<AvailableEmoji[]>([]);
const [emojiOpen, setEmojiOpen] = useState(false);
const [emojiLoading, setEmojiLoading] = useState(false);

const emojiMap = useMemo(() => {
  const m = new Map<string, AvailableEmoji>();
  for (const e of emojis) m.set(e.code, e);
  return m;
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
    if (!token) return;

    const socket = getSocket();
    if (!socket) return;

    if (!socket.connected) socket.connect();
    socket.emit("auth", token);

    socket.emit("channel_join", {
      token,
      channel: channelRef.current || "global",
    });
    prevChannelRef.current = channelRef.current || "global";

    const onMessage = (msg: GlobalMessage) => {
      const msgChannel = msg.channel || "global";
      const activeChannel = channelRef.current || "global";
      if (msgChannel !== activeChannel) return;

      setMessages((prev) => [...prev, msg]);

      const el = scrollAreaRef.current;
      if (!el) return;

      const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
      if (distance < 400) {
        requestAnimationFrame(() =>
          bottomRef.current?.scrollIntoView({ behavior: "smooth" })
        );
        setNewMsgCount(0);
        markGlobalReadOnServer(activeChannel);
      } else {
        setNewMsgCount((c) => c + 1);
      }
    };

    const onTyping = (user: TypingUser & { channel?: string }) => {
      const active = channelRef.current || "global";
      if ((user.channel || "global") !== active) return;

      setTypingUsers((prev) => {
        if (prev.find((u) => u.id === user.id)) return prev;
        return [...prev, { id: user.id, name: user.name }];
      });
    };

    const onStopTyping = ({
      id,
      channel: ch,
    }: {
      id: number;
      channel: string;
    }) => {
      if ((ch || "global") !== (channelRef.current || "global")) return;
      setTypingUsers((prev) => prev.filter((u) => u.id !== id));
    };

    const onChannelOnlineUsers = (payload: { channel: string; users: any[] }) => {
      const active = channelRef.current || "global";
      if ((payload.channel || "global") !== active) return;
      setOnlineUsers(
        Array.isArray(payload.users) ? payload.users.map((u) => u.id) : []
      );
    };

    const onGlobalOnlineUsers = (users: any[]) => {
      const active = channelRef.current || "global";
      if (active !== "global") return;
      setOnlineUsers(Array.isArray(users) ? users.map((u) => u.id) : []);
    };

    socket.on("global_message", onMessage);
    socket.on("user_typing", onTyping);
    socket.on("user_stopped_typing", onStopTyping);
    socket.on("channel_online_users", onChannelOnlineUsers);
    socket.on("global_online_users", onGlobalOnlineUsers);

    return () => {
      socket.off("global_message", onMessage);
      socket.off("user_typing", onTyping);
      socket.off("user_stopped_typing", onStopTyping);
      socket.off("channel_online_users", onChannelOnlineUsers);
      socket.off("global_online_users", onGlobalOnlineUsers);
    };
  }, []);

  

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = getSocket();
    if (!token || !socket) return;

    const next = channel || "global";
    const prev = prevChannelRef.current;

    if (prev && prev !== next) {
      socket.emit("channel_leave", { channel: prev });
    }

    socket.emit("channel_join", { token, channel: next });
    prevChannelRef.current = next;
  }, [channel]);

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

  const sendGlobal = () => {
    const token = localStorage.getItem("token");
    const socket = getSocket();
    const content = text.trim();

    if (!token || !socket || !content) return;
    if (content.length > MAX_MESSAGE_LEN) return;
    if (!canPost) return;

    setText("");

    if (!socket.connected) socket.connect();
    socket.emit("auth", token);

    socket.emit("global_message", { token, content, channel });

    const userId = Number(localStorage.getItem("userId"));
    socket.emit("stop_typing", { id: userId, channel });
  };

  const handleTyping = () => {
    const socket = getSocket();
    if (!socket) return;

    const userId = Number(localStorage.getItem("userId"));
    const userName = localStorage.getItem("userName") || "Someone";

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
              Read-only (admins only)
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

        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-3">
            <div className="relative shrink-0">
              <img
                src={avatarSrc(m.user?.avatar)}
                alt={m.user?.name || "User"}
                onClick={() => m.user?.id && router.push(`/profile/${m.user.id}`)}
                className={`w-8 h-8 rounded-full shrink-0 object-cover ${
                  m.user?.id ? "cursor-pointer hover:opacity-80" : ""
                }`}
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
  {m.user?.name || "User"}

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
 {renderContentWithEmojis(m.content, emojiMap)}

</p>


            </div>
          </div>
        ))}

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
      className="absolute bottom-14 left-3 w-[320px] max-w-[80vw] bg-[#1e1f22] border border-white/10 rounded-xl shadow-xl p-3 z-[10000]"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Unlocked emojis</div>
        <button
          type="button"
          onClick={() => setEmojiOpen(false)}
          className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15"
        >
          close
        </button>
      </div>

      {emojiLoading ? (
        <div className="text-sm text-white/60">Loading…</div>
      ) : emojis.length === 0 ? (
        <div className="text-sm text-white/60">No emojis yet.</div>
      ) : (
        <div className="grid grid-cols-10 gap-2 max-h-48 overflow-y-auto pr-1">
          {emojis.map((e) => (
            <button
              type="button"
              key={e.id}
              onClick={() => insertEmoji(e)}
              className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center"
              title={`Unlock lvl ${e.unlockLevel}`}
            >
              <span className={e.type === "unicode" ? "text-lg" : ""}>
                <EmojiIcon e={e} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )}

  <input
    maxLength={MAX_MESSAGE_LEN}
    className="flex-1 min-w-0 bg-[#313338] text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
    placeholder={`Message #${channel}`}
    value={text}
    onChange={(e) => {
      setText(e.target.value);
      handleTyping();
    }}
    onKeyDown={(e) => e.key === "Enter" && sendGlobal()}
  />

  <button
    type="button"
    onClick={sendGlobal}
    className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold rounded-lg"
  >
    Send
  </button>
</div>

      ) : (
        <div className="p-3 border-t border-white/10 text-xs text-white/50 flex-shrink-0">
          Only admins can post in announcements.
        </div>
      )}
    </section>
  );
}

function renderContentWithEmojis(
  content: string,
  emojiMap: Map<string, AvailableEmoji>
) {
  // split by :code: tokens
  const parts = content.split(/(:[a-zA-Z0-9_]+:)/g);

  return parts.map((part, idx) => {
    const m = /^:([a-zA-Z0-9_]+):$/.exec(part);
    if (!m) return <span key={idx}>{part}</span>;

    const code = m[1]; // without colons
    const e = emojiMap.get(code);
    if (!e) return <span key={idx}>{part}</span>;

    if (e.type === "image") {
      return (
        <img
          key={idx}
          src={asset(e.value)}
          alt={e.label ?? code}
          className="inline-block w-5 h-5 align-[-0.2em] mx-0.5"
          style={{ objectFit: "contain" }}
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
  onLevelUnreadTotal,
  isMobile,
}: {
  channel: string;
  levelNumber: number;
  onLevelUnreadTotal?: (levelChannelId: string, total: number) => void;
  isMobile?: boolean;
}) {
  const router = useRouter();

  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [onlineUsersFull, setOnlineUsersFull] = useState<
    { id: number; name: string; avatar?: string | null; mainCountry?: string | null;  }[]
  >([]);
  const [membersOpen, setMembersOpen] = useState(false);

  const levelRoom = `level-${levelNumber}`;

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

  async function fetchUnreadCountsFromServer(lvl: number) {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const res = await fetch(`${BACKEND_URL}/chat/levels/${lvl}/unread-counts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;
    return (await res.json()) as { bySub: Record<string, number>; total: number };
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
    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => {
      fetchUnreadCountsFromServer(levelNumber).then((data) => {
        if (!data?.bySub) return;

        setUnreadBySub((prev) => {
          const next: Record<number, number> = { ...prev };
          for (const [subIdStr, count] of Object.entries(data.bySub)) {
            const subId = Number(subIdStr);
            if (Number.isFinite(subId)) {
              next[subId] = Number(count) || 0;
              writeUnreadToStorage(levelNumber, subId, next[subId]);
            }
          }
          return next;
        });
      });
    };

    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [levelNumber]);

  const [subChannels, setSubChannels] = useState<SubChannel[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [activeSub, setActiveSub] = useState<SubChannel | null>(null);

  const [messages, setMessages] = useState<LevelMessage[]>([]);
  const [text, setText] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [emojis, setEmojis] = useState<AvailableEmoji[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiLoading, setEmojiLoading] = useState(false);

  const emojiMap = useMemo(() => {
  const m = new Map<string, AvailableEmoji>();
  for (const e of emojis) m.set(e.code, e);
  return m;
}, [emojis]);


  const bottomRef = useRef<HTMLDivElement>(null);

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
    const socket = getSocket();
    if (!token || !socket) return;

    if (!socket.connected) socket.connect();
    socket.emit("auth", token);

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
  }, [levelRoom]);

  useEffect(() => {
    const socket = getSocket();
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

    fetch(`${BACKEND_URL}/chat/levels/${levelNumber}/subchannels`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setSubChannels(list);

        const map: Record<number, number> = {};
        for (const sc of list) {
          map[sc.id] = readUnreadFromStorage(levelNumber, sc.id);
        }
        setUnreadBySub(map);

        fetchUnreadCountsFromServer(levelNumber).then((data2) => {
          if (!data2?.bySub) return;

          const next: Record<number, number> = { ...map };
          for (const [subIdStr, count] of Object.entries(data2.bySub)) {
            const subId = Number(subIdStr);
            if (Number.isFinite(subId)) {
              next[subId] = Number(count) || 0;
              writeUnreadToStorage(levelNumber, subId, next[subId]);
            }
          }
          setUnreadBySub(next);
        });
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

    const socket = getSocket();
    if (!socket) return;

    if (!socket.connected) socket.connect();
    socket.emit("auth", token);

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
    const socket = getSocket();
    if (!socket) return;

    const onMsg = (msg: any) => {
      const lvl = levelRef.current;
      const sub = activeSubRef.current;

      if (msg.levelNumber !== lvl) return;

      const myId = Number(localStorage.getItem("userId"));
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
  }, []);

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
    const socket = getSocket();
    const content = text.trim();

    if (!token || !socket || !content) return;
    if (content.length > MAX_MESSAGE_LEN) return;

    setText("");
    setEmojiOpen(false);

    if (!socket.connected) socket.connect();
    socket.emit("auth", token);

    socket.emit("level_sub_message", {
      token,
      levelNumber,
      subChannelId: activeSub.id,
      content,
    });
  }

function insertEmoji(e: AvailableEmoji) {
  const token = e.type === "unicode" ? e.value : `:${e.code}:`;
  setText((t) => (t ? `${t} ${token}` : token));
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
            className="w-full text-left px-3 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2"
          >
            <span className="text-lg">{sc.emoji || "💬"}</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-semibold truncate">#{sc.name}</span>

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
    <section className="flex flex-col flex-1 bg-[#2b2d31] text-white overflow-hidden min-w-0">
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
            🔍🤝
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

                fetchUnreadCountsFromServer(levelNumber).then((data) => {
                  if (!data?.bySub) return;

                  setUnreadBySub((prev) => {
                    const next: Record<number, number> = { ...prev };
                    for (const [subIdStr, count] of Object.entries(data.bySub)) {
                      const subId = Number(subIdStr);
                      if (Number.isFinite(subId)) {
                        next[subId] = Number(count) || 0;
                        writeUnreadToStorage(levelNumber, subId, next[subId]);
                      }
                    }
                    return next;
                  });
                });
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
          <div className="h-12 border-b border-white/10 px-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setActiveSub(null);
                setEmojiOpen(false);
              }}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/15 text-sm"
            >
              ← Back
            </button>

            <div className="text-sm font-semibold text-white/80 truncate">
              {activeSub
                ? `lvl ${levelNumber} • ${activeSub.emoji || "💬"} #${activeSub.name}`
                : `lvl ${levelNumber}`}
            </div>

            <div className="w-[64px]" />
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
                        m.user?.id ? "cursor-pointer hover:opacity-80" : ""
                      }`}
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
  {renderContentWithEmojis(m.content, emojiMap)}
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
    <div className="flex items-center justify-between mb-2">
      <div className="text-sm font-semibold">Unlocked emojis</div>
      <button
        type="button"
        onClick={() => setEmojiOpen(false)}
        className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15"
      >
        close
      </button>
    </div>

    {emojiLoading ? (
      <div className="text-sm text-white/60">Loading…</div>
    ) : emojis.length === 0 ? (
      <div className="text-sm text-white/60">No emojis yet.</div>
    ) : (
      <div className="grid grid-cols-10 gap-2 max-h-48 overflow-y-auto pr-1">
        {emojis.map((e) => (
          <button
            type="button"
            key={e.id}
            onClick={() => insertEmoji(e)}
            className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center"
            title={`Unlock lvl ${e.unlockLevel}`}
          >
            <span className={e.type === "unicode" ? "text-lg" : ""}>
              <EmojiIcon e={e} />
            </span>
          </button>
        ))}
      </div>
    )}
  </div>
)}


              <input
              maxLength={MAX_MESSAGE_LEN}
                className="flex-1 min-w-0 bg-[#313338] text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder={`Message #${activeSub?.name ?? ""}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendLevelMessage()}
              />

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
                          m.user?.id ? "cursor-pointer hover:opacity-80" : ""
                        }`}
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
  {renderContentWithEmojis(m.content, emojiMap)}
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
                    className="absolute bottom-14 left-3 w-[320px] max-w-[80vw] bg-[#1e1f22] border border-white/10 rounded-xl shadow-xl p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold">Unlocked emojis</div>
                      <button
                        type="button"
                        onClick={() => setEmojiOpen(false)}
                        className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15"
                      >
                        close
                      </button>
                    </div>

                    {emojiLoading ? (
                      <div className="text-sm text-white/60">Loading…</div>
                    ) : emojis.length === 0 ? (
                      <div className="text-sm text-white/60">No emojis yet.</div>
                    ) : (
                      <div className="grid grid-cols-10 gap-2 max-h-48 overflow-y-auto pr-1">
                        {emojis.map((e) => (
  <button
    type="button"
    key={e.id}
    onClick={() => insertEmoji(e)}
    className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center"
    title={`Unlock lvl ${e.unlockLevel}`}
  >
    <span className={e.type === "unicode" ? "text-lg" : ""}>
      <EmojiIcon e={e} />
    </span>
  </button>
))}

                      </div>
                    )}
                  </div>
                )}

                <input
                maxLength={MAX_MESSAGE_LEN}
                  className="flex-1 bg-[#313338] text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder={`Message #${activeSub.name}`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendLevelMessage()}
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
  onLevelUnreadTotal,
  isMobile = false,
}: {
  channel: string;
  onLevelUnreadTotal?: (levelChannelId: string, total: number) => void;
  isMobile?: boolean;
}) {
  const levelNumber = useMemo(() => parseLevel(channel), [channel]);

  if (levelNumber == null) {
    return <GlobalChat channel={channel} />;
  }

  return (
    <LevelChat
      channel={channel}
      levelNumber={levelNumber}
      onLevelUnreadTotal={onLevelUnreadTotal}
      isMobile={isMobile}
    />
  );
}
