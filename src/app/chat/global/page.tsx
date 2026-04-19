"use client";

import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import UserList from "./UserList";
import { getSocket } from "@/lib/socket";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL!;

type UnreadMap = Record<string, number>;

function GlobalChatPageContent() {
  const router = useRouter();
  const params = useSearchParams();

  const initial = params.get("channel") || "global";
  const [channel, setChannel] = useState(initial);

  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [unreadByChannel, setUnreadByChannel] = useState<UnreadMap>({});
  const [membersOpen, setMembersOpen] = useState(false);

  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    setSocket(s);
  }, []);

  // still used (safe to keep)
  const handleLevelUnreadTotal = useCallback(
    (channelId: string, total: number) => {
      setUnreadByChannel((prev) => ({
        ...prev,
        [channelId]: total,
      }));
    },
    []
  );

  useEffect(() => {
    const urlChannel = params.get("channel") || "global";
    setChannel(urlChannel);
  }, [params]);

  // -----------------------------------------------------------
  // Fetch my currentLevel
  // -----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadMyLevel() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          if (!cancelled) setCurrentLevel(null);
          return;
        }

        const res = await fetch(`${BACKEND_URL}/levels/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          localStorage.removeItem("token");
          if (!cancelled) setCurrentLevel(null);
          return;
        }

        const data = await res.json();
        const lvl = typeof data?.level === "number" ? data.level : null;

        if (!cancelled) setCurrentLevel(lvl);
      } catch {
        if (!cancelled) setCurrentLevel(null);
      }
    }

    loadMyLevel();
    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------------
  // ✅ NEW ACCESS CONTROL (GOOD)
  // -----------------------------------------------------------
  const restrictedChannels: Record<string, number> = {
    "lvl-3": 3,
    "lvl-8": 8,
    "lvl-15": 15,
  };

  useEffect(() => {
    if (currentLevel == null) return;

    const required = restrictedChannels[channel];
    if (!required) return;

    if (currentLevel < required) {
      setChannel("global");
      router.replace(`/chat/global?channel=global`);
    }
  }, [channel, currentLevel, router]);

  // -----------------------------------------------------------
  // Sync URL
  // -----------------------------------------------------------
  useEffect(() => {
    const currentUrlChannel = params.get("channel") || "global";

    if (currentUrlChannel !== channel) {
      router.replace(`/chat/global?channel=${channel}`);
    }

    setUnreadByChannel((prev) => ({
      ...prev,
      [channel]: 0,
    }));
  }, [channel, router, params]);

  // -----------------------------------------------------------
  // ✅ REALTIME (FIXED)
  // -----------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const onGlobal = (msg: any) => {
      const key = msg.channel || "global";

      if (key !== channel) {
        setUnreadByChannel((prev) => ({
          ...prev,
          [key]: (prev[key] || 0) + 1,
        }));
      }
    };

    socket.on("global_message", onGlobal);

    return () => {
      socket.off("global_message", onGlobal);
    };
  }, [socket, channel]);

  // -----------------------------------------------------------
  // CLEAN channel names
  // -----------------------------------------------------------
  function prettyName(id: string) {
    const map: Record<string, string> = {
      global: "Global Chat",
      announcements: "Announcements",
      help: "Get Help",
      networking: "Networking",
      general: "General",
      "lvl-3": "Rising Minds",
      "lvl-8": "Builders Circle",
      "lvl-15": "Inner Circle",
    };

    return map[id] || id;
  }

  const headerName = useMemo(() => prettyName(channel), [channel]);

  return (
    <>
      {/* ================= DESKTOP ================= */}
      <main className="hidden md:flex h-screen bg-[#2b2d31] text-white overflow-hidden">
        <Sidebar
          selected={channel}
          onSelect={setChannel}
          unreadByChannel={unreadByChannel}
          currentLevel={currentLevel}
        />

        <div className="flex-1 flex flex-col border-x border-white/10 min-w-0">
          <div className="h-12 border-b border-white/10 px-4 flex items-center">
            <div className="flex items-center gap-4">
              <div className="text-sm text-white/70 font-semibold tracking-wide">
                {headerName}
              </div>

              <Link
                href="/dashboard"
                className="text-xs px-2 py-1 rounded-md text-gray-300 border border-white/30 hover:bg-white/10 transition"
              >
                ← Go to Dashboard 🧠
              </Link>
            </div>
          </div>

          <ChatWindow
            channel={channel}
            socket={socket}
            onLevelUnreadTotal={handleLevelUnreadTotal}
            isMobile
            currentLevel={currentLevel}
          />
        </div>

        <UserList channel={channel} socket={socket} />
      </main>

      {/* ================= MOBILE ================= */}
      <main className="md:hidden flex h-screen bg-[#2b2d31] text-white overflow-hidden">
        <Sidebar
          compact
          selected={channel}
          onSelect={(c) => {
            setChannel(c);
            setMembersOpen(false);
          }}
          unreadByChannel={unreadByChannel}
          currentLevel={currentLevel}
        />

        <div className="flex-1 flex flex-col border-l border-white/10 min-w-0">
          <div className="h-12 border-b border-white/10 px-3 flex items-center justify-between">
            <div className="text-sm text-white/80 font-semibold truncate pr-2">
              {headerName}
            </div>

            <div className="h-12 w-px bg-gradient-to-b from-white/10 via-white/60 to-white/10 opacity-70" />

            <div className="flex items-center gap-2">
              {channel === "global" && (
                <button
                  type="button"
                  onClick={() => setMembersOpen(true)}
                  className="px-2 ml-1 mr-1 py-1 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-xs animate-pulse"
                >
                  Online 🙏
                </button>
              )}

              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-xs"
              >
                👑 Go back
              </button>
            </div>
          </div>

          <ChatWindow
            channel={channel}
            socket={socket}
            onLevelUnreadTotal={handleLevelUnreadTotal}
            isMobile
            currentLevel={currentLevel}
          />
        </div>

        {membersOpen && (
          <>
            <button
              className="fixed inset-0 z-[9998] bg-black/60"
              onClick={() => setMembersOpen(false)}
            />
            <div className="fixed right-0 top-0 h-full w-[82vw] max-w-[340px] z-[9999] bg-[#1e1f22] border-l border-white/10">
              <div className="h-12 px-3 flex items-center justify-between border-b border-white/10">
                <div className="text-sm font-semibold text-white/80">
                  Online users
                </div>
                <button
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs"
                  onClick={() => setMembersOpen(false)}
                >
                  ✕
                </button>
              </div>

              <UserList channel={channel} socket={socket} />
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default function GlobalChatPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#2b2d31]" />}>
      <GlobalChatPageContent />
    </Suspense>
  );
}