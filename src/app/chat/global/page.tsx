"use client";

import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import UserList from "./UserList";
import { getSocket } from "@/lib/socket";
import Link from "next/link";

const BACKEND_URL = "http://localhost:4000";

function parseLevelChannel(channelId: string) {
  const m = /^level-(\d+)$/.exec(channelId);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

type UnreadMap = Record<string, number>;

function GlobalChatPageContent() {
  const router = useRouter();
  const params = useSearchParams();

  const initial = params.get("channel") || "global";
  const [channel, setChannel] = useState(initial);

  const [currentLevel, setCurrentLevel] = useState<number | null>(null);

  const [unreadByChannel, setUnreadByChannel] = useState<UnreadMap>({});

  const [membersOpen, setMembersOpen] = useState(false);

  const handleLevelUnreadTotal = useCallback(
    (levelChannelId: string, total: number) => {
      setUnreadByChannel((prev) => ({
        ...prev,
        [levelChannelId]: total,
      }));
    },
    []
  );

  useEffect(() => {
    const urlChannel = params.get("channel") || "global";
    setChannel(urlChannel);
  }, [params]);

  // -----------------------------------------------------------
  // Fetch my currentLevel (GET /levels/mine)
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
  // fetch unread counts
  // -----------------------------------------------------------
  const refreshUnread = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const next: UnreadMap = {};

    const g = await fetch(
      `${BACKEND_URL}/global/unread-counts?channels=global,announcements,random`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (g.ok) {
      const data = await g.json();
      const by = data?.byChannel || {};
      for (const k of Object.keys(by)) next[k] = Number(by[k]) || 0;
    }

    if (typeof currentLevel === "number" && currentLevel > 0) {
      const results = await Promise.all(
        Array.from({ length: currentLevel }, (_, i) => i + 1).map(async (lvl) => {
          const res = await fetch(
            `${BACKEND_URL}/chat/levels/${lvl}/unread-counts`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) return [lvl, 0] as const;
          const data = await res.json();
          return [lvl, Number(data?.total) || 0] as const;
        })
      );

      for (const [lvl, total] of results) {
        next[`level-${lvl}`] = total;
      }
    }

    setUnreadByChannel(next);
  }, [currentLevel]);

  useEffect(() => {
    if (currentLevel == null) return;
    refreshUnread();
  }, [currentLevel, refreshUnread]);

  useEffect(() => {
    refreshUnread();
  }, [channel, refreshUnread]);

  // -----------------------------------------------------------
  // Enforce level access
  // -----------------------------------------------------------
  useEffect(() => {
    if (currentLevel == null) return;

    const requested = parseLevelChannel(channel);
    if (requested == null) return;

    if (requested > currentLevel) {
      const safe = `level-${currentLevel}`;
      setChannel(safe);
      router.replace(`/chat/global?channel=${safe}`);
    }
  }, [channel, currentLevel, router]);

  // -----------------------------------------------------------
  // Sync URL
  // -----------------------------------------------------------
  useEffect(() => {
    router.replace(`/chat/global?channel=${channel}`);
  }, [channel, router]);

  // -----------------------------------------------------------
  // realtime refresh
  // -----------------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = getSocket();
    if (!token || !socket) return;

    if (!socket.connected) socket.connect();
    socket.emit("auth", token);

    const onGlobal = () => refreshUnread();
    const onLevel = () => refreshUnread();

    socket.on("global_message", onGlobal);
    socket.on("level_sub_message", onLevel);

    return () => {
      socket.off("global_message", onGlobal);
      socket.off("level_sub_message", onLevel);
    };
  }, [refreshUnread]);

  function prettyName(id: string) {
    if (id === "global") return "Global Chat";
    if (id === "announcements") return "Announcements";
    if (id === "random") return "Random";

    if (id.startsWith("level-")) {
      const lvl = id.replace("level-", "");
      return `Castle Level ${lvl}`;
    }

    return `#${id}`;
  }

  const headerName = useMemo(() => prettyName(channel), [channel]);
  const isLevel = channel.startsWith("level-");

  return (
    <>
      <main className="hidden md:flex h-screen bg-[#2b2d31] text-white overflow-hidden">
        <Sidebar
          selected={channel}
          onSelect={setChannel}
          unreadByChannel={unreadByChannel}
        />

        <div className="flex-1 flex flex-col border-x border-white/10 min-w-0">
          {!isLevel && (
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
          )}

          <ChatWindow
            channel={channel}
            onLevelUnreadTotal={handleLevelUnreadTotal}
            isMobile={false}
          />
        </div>

        <UserList channel={channel} />
      </main>

      <main className="md:hidden flex h-screen bg-[#2b2d31] text-white overflow-hidden">
        <Sidebar
          compact
          selected={channel}
          onSelect={(c) => {
            setChannel(c);
            setMembersOpen(false);
          }}
          unreadByChannel={unreadByChannel}
        />

        <div className="flex-1 flex flex-col border-l border-white/10 min-w-0">
          {!isLevel && (
            <div className="h-12 border-b border-white/10 px-3 flex items-center justify-between">
              <div className="text-sm text-white/80 font-semibold truncate pr-2">
                {headerName}
              </div>

              <div className="flex items-center gap-2">
                {channel === "global" && (
                  <button
                    type="button"
                    onClick={() => setMembersOpen(true)}
                    className="px-2 py-1 rounded-md bg-blue-200 hover:bg-white/15 border border-white/10 text-xs"
                  >
                    👥
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-xs"
                >
                  Back to 👑
                </button>
              </div>
            </div>
          )}

          <ChatWindow
            channel={channel}
            onLevelUnreadTotal={handleLevelUnreadTotal}
            isMobile
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
                <div className="text-sm font-semibold text-white/80">Online</div>
                <button
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs"
                  onClick={() => setMembersOpen(false)}
                >
                  ✕
                </button>
              </div>

              <UserList channel={channel} />
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