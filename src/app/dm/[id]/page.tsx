"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { asset } from "@/lib/assets";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

const MAX_LEN = 500;

export default function DirectMessagePage() {
  const { id } = useParams();
  const router = useRouter();

  const [friend, setFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);
  const [myLevel, setMyLevel] = useState<number>(1);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [emojiTab, setEmojiTab] = useState<"system" | "custom">("custom");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isOnline, setIsOnline] = useState(false);

  const [isTyping, setIsTyping] = useState(false);

  const [emojis, setEmojis] = useState<AvailableEmoji[]>([]);

  const [isAuthReady, setIsAuthReady] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
const payloadIdRef = useRef<number | null>(null);
  /* ================= INIT ================= */
function isVisible() {
  return document.visibilityState === "visible";
}

const emojisByLevel = useMemo(() => {
  const map: Record<number, AvailableEmoji[]> = {};

  for (const e of emojis) {
    if (!map[e.unlockLevel]) map[e.unlockLevel] = [];
    map[e.unlockLevel].push(e);
  }

  return map;
}, [emojis]);

function insertEmoji(e: AvailableEmoji) {
  const token = e.type === "image" ? `:${e.code}:` : e.value;
  setNewMsg((t) => (t ? `${t} ${token}` : token));
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

type AvailableEmoji = {
  id: number;
  code: string;
  type: "unicode" | "image";
  value: string;
  label?: string | null;
  unlockLevel: number;
};

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    const socket = getSocket();
    if (!socket) return;

    

    if (socket.connected) {
  socket.emit("dm_join", { withUserId: Number(id) });
} else {
  socket.on("connect", () => {
    socket.emit("dm_join", { withUserId: Number(id) });
  });
}

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setMyId(payload.id);
payloadIdRef.current = payload.id;
    } catch {}

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setFriend(data.user));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/dm/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
     .then((data) =>
  setMessages(
    (data.messages || []).map((m: any) => ({
      id: m.id,
      from: m.senderId,
      to: m.receiverId,
      content: m.content,
      createdAt: m.createdAt,
       seen: m.read,
    }))
  )
);

fetch(`${process.env.NEXT_PUBLIC_API_URL}/dm/${id}/read`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
}).then(() => {
  socket.emit("dm_seen_ack", {
    fromUserId: Number(id),
  });
});

socket.on("auth_ready", () => {
  setIsAuthReady(true);
});
    
//user is online?

socket.on("user_online", ({ userId }) => {
  if (userId === Number(id)) {
    setIsOnline(true);
  }
});

socket.on("user_offline", ({ userId }) => {
  if (userId === Number(id)) {
    setIsOnline(false);
  }
});

socket.emit("get_online_users");

socket.on("online_users", (users) => {
  if (users.includes(Number(id))) {
    setIsOnline(true);
  } else {
    setIsOnline(false);
  }
});

// private message

   socket.on("private_message", (msg) => {
  setMessages((prev) => {
    if (prev.some((m) => m.id === msg.id)) return prev;

    return [
      ...prev,
      {
        ...msg,
        seen: msg.seen ?? false, // 🔥 FIX
      },
    ];
  });

  if (msg.from === Number(id)) {
  socket.emit("dm_seen_ack", {
    fromUserId: Number(id),
  });
}
});

    socket.on("dm_typing", (data) => {
  if (data.from === Number(id)) {
    setIsTyping(true);
  }
});

socket.on("dm_stop_typing", (data) => {
  if (data.from === Number(id)) {
    setIsTyping(false);
  }
});

socket.on("dm_seen", ({ from }) => {
  console.log("🔥 dm_seen received from:", from, "| current chat id:", Number(id));

  if (from !== Number(id)) return;

  const myUserId = payloadIdRef.current;

  setMessages((prev) => {
    const updated = prev.map((m) =>
      m.from === myUserId && m.to === from
        ? { ...m, seen: true }
        : m
    );

    return [...updated];
  });
});

return () => {
  socket.emit("dm_leave");
  socket.emit("dm_stop_typing", { toUserId: Number(id) });
  socket.off("private_message");
  socket.off("dm_typing");
  socket.off("dm_stop_typing");
  socket.off("dm_seen");
  socket.off("user_online");
  socket.off("user_offline");
  socket.off("auth_ready");
};
  }, [id]);



  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  fetch(`${process.env.NEXT_PUBLIC_API_URL}/emojis/available`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((d) => {
  setEmojis(Array.isArray(d?.emojis) ? d.emojis : []);
  
  if (typeof d?.level === "number") {
    setMyLevel(d.level);
  }
});
    
}, []);

const emojiMap = useMemo(() => {
  const m = new Map<string, AvailableEmoji>();
  for (const e of emojis) m.set(e.code, e);
  return m;
}, [emojis]);

  useEffect(() => {
  const el = textareaRef.current;
  if (!el) return;

  el.style.height = "auto";

  const max = 120; // SAME as max-h
  el.style.height = Math.min(el.scrollHeight, max) + "px";
}, [newMsg]);

  /* ================= AUTO SCROLL ================= */

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ================= SEND ================= */

  function sendMessage() {
    const socket = getSocket();
    if (!socket) return;

    if (!newMsg.trim()) return;
    if (newMsg.length > MAX_LEN) return;

    socket.emit("private_message", {
      toUserId: Number(id),
      content: newMsg,
    });

    socket.emit("dm_stop_typing", { toUserId: Number(id) });

    setNewMsg("");
  }

  /* ================= UI ================= */

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 flex justify-center text-white">

      {/* CHAT CONTAINER */}
      <div className="w-full max-w-[600px] h-full flex flex-col">

        {/* HEADER */}
        <div className="flex items-center justify-between px-3 py-2 bg-white/10 backdrop-blur shrink-0">
          <div
            onClick={() => router.push(`/profile/${friend?.id}`)}
            className="flex items-center gap-2 cursor-pointer min-w-0"
          >

            <div className="relative">
            <img
              src={
                friend?.avatar
                  ? asset(`avatars/${friend.avatar}`)
                  : asset("avatars/default.webp")
              }
              className="w-9 h-9 rounded-full border border-amber-300 shrink-0"
            /> 
            <span
    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${
      isOnline ? "bg-green-400" : "bg-gray-500"
    }`}
  />
            </div>
            <div className="flex flex-col">
  <span className="truncate text-sm font-semibold">
    {friend?.name || "Loading..."}
  </span>

  <span className="text-xs text-white/60">
    {isOnline ? "🟢 Online" : "⚫ Offline"}
  </span>
</div>
          </div>

          <button
            onClick={() => router.push("/friends")}
            className="text-xs px-2 py-1 bg-white/20 rounded"
          >
            ← Back
          </button>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-2">

          {messages.map((m, i) => {
            const isMe = m.from === myId;

            return (
              <div
                key={i}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl break-words ${
                    isMe
                      ? "bg-emerald-400 text-black rounded-br-none"
                      : "bg-white/20 rounded-bl-none"
                  }`}
                >
                <p className="text-sm break-words">
  {renderContentWithEmojis(m.content, emojiMap)}
</p>

                  <p
  className={`text-[10px] text-right mt-1 ${
    isMe ? "text-gray-800" : "text-amber-300"
  }`}
>
  {new Date(m.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}

   {isMe && (
    <span className="ml-1">
      {m.seen ? "✓✓" : "✓"}
    </span>
  )}
</p>
                </div>
              </div>
            );
          })}
         
          <div ref={chatEndRef} />
        </div>
 {isTyping && (
  <div className="text-xs mb-2 text-white/60 px-2">
    💬 typing...
  </div>
)}
        {/* FOOTER */}
        <div className="px-2 py-2 bg-white/10 backdrop-blur flex items-center gap-2 shrink-0 relative">

          {/* EMOJI */}
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="text-lg shrink-0"
          >
            😊
          </button>


          {/* INPUT */}
          <textarea

           ref={textareaRef}
  value={newMsg}
  onChange={(e) => {
  setNewMsg(e.target.value);

  const socket = getSocket();
  if (!socket || !socket.connected) return; // ✅ KEY FIX

  if (!typingTimeoutRef.current) {
    socket.emit("dm_typing", { toUserId: Number(id) });
  }

  clearTimeout(typingTimeoutRef.current);

  typingTimeoutRef.current = setTimeout(() => {
    socket.emit("dm_stop_typing", { toUserId: Number(id) });
  }, 3000);
}}
  placeholder="Message..."
  rows={1}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }}
className="flex-1 min-w-0 px-3 py-2 bg-white/20 rounded-lg outline-none text-sm resize-none overflow-y-auto max-h-[120px] scrollbar-thin scrollbar-thumb-white/20"/>

          {/* SEND */}
          <button
            onClick={sendMessage}
            className="px-3 py-2 bg-amber-400 text-black rounded-lg text-sm shrink-0"
          >
            Send
          </button>

          {/* EMOJI PICKER */}
        
                      {showEmoji && (
  <div className="absolute bottom-14 left-0 w-[380px] bg-[#1e1f22] border border-white/10 rounded-xl shadow-xl p-3 z-50">

    {/* HEADER */}
    <div className="flex justify-between items-center mb-2">
      <div className="text-sm font-semibold">Emojis</div>
      <button
        onClick={() => setShowEmoji(false)}
        className="text-xs px-2 py-1 bg-white/10 rounded"
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
            ? "bg-amber-400 text-black"
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
      <div className="h-[240px] overflow-hidden">
        <Picker
          data={data}
          onEmojiSelect={(e: any) =>
            setNewMsg((prev) => prev + e.native)
          }
          theme="dark"
         
        />
      </div>
    ) : (
      <div className="max-h-60 overflow-y-auto flex flex-wrap gap-2">
       {emojis
  .filter((e) => e.unlockLevel <= myLevel)
  .map((e) => (
          <button
            key={e.id}
            onClick={() => insertEmoji(e)}
            className="w-12 h-12 flex items-center justify-center rounded-lg bg-white/10 hover:scale-110 transition"
          >
            {e.type === "image" ? (
              <img
                src={asset(e.value)}
                className="w-10 h-10"
              />
            ) : (
              <span>{e.value}</span>
            )}
          </button>
        ))}

        <div className="mt-3">
  <div className="text-xs text-white/50 mb-2 flex items-center gap-2">
    <span>Next Level ({myLevel + 1})</span>
    <span className="text-red-400">🔒</span>
  </div>

  <div className="flex gap-2 flex-wrap">
    {(emojisByLevel[myLevel + 1] || []).map((e) => (
      <div
        key={e.id}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg overflow-hidden"
      >
        <div className="opacity-40 blur-[1px] scale-95">
          <img src={asset(e.value)} className="w-7 h-7" />
        </div>

        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center text-xs">
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
            
          
        </div>
      </div>
    </div>
  );
}