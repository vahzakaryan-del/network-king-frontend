"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function FriendsPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);

  const [invitedOpen, setInvitedOpen] = useState(false);
const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
const [invitedLoading, setInvitedLoading] = useState(false);
const [invitedError, setInvitedError] = useState("");


  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [requestsSub, setRequestsSub] = useState<"incoming" | "outgoing">(
    "incoming"
  );
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});
  const [sentRequests, setSentRequests] = useState<number[]>([]);
  const [findQuery, setFindQuery] = useState("");

  const [findResults, setFindResults] = useState<any[]>([]);
  const [findMessage, setFindMessage] = useState("");
  const [findLoading, setFindLoading] = useState(false);

  const [findOpen, setFindOpen] = useState(false);

  const [friendsQuery, setFriendsQuery] = useState("");
  const [friendsSort, setFriendsSort] = useState<"default" | "online">(
    "default"
  );

  const [inviteCode, setInviteCode] = useState<string>("");
const [invitedCount, setInvitedCount] = useState<number>(0);
const [inviteLoading, setInviteLoading] = useState(false);
const [inviteMsg, setInviteMsg] = useState<string>("");


  // Mobile-only: recommended accordion
  const [recommendedOpen, setRecommendedOpen] = useState(false);
  // Mobile invite dropdown
const [mobileInviteOpen, setMobileInviteOpen] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  function setUrlState(
    nextTab: "friends" | "requests",
    nextSub?: "incoming" | "outgoing"
  ) {
    const params = new URLSearchParams(searchParams?.toString());

    params.set("tab", nextTab);

    if (nextTab === "requests") {
      params.set("sub", nextSub || "incoming");
    } else {
      params.delete("sub");
    }

    router.replace(`/friends?${params.toString()}`);
  }

  function getLastSeen(u: any) {
    return u.lastLoginAt || u.lastLoginDay || null;
  }

  function refreshAll() {
    loadFriends();
    loadRequests();
    loadRecommended();
  }

  // Sync state from URL (so notifications can deep-link you)
  useEffect(() => {
    const urlTab =
      (searchParams.get("tab") as "friends" | "requests" | null) || "friends";
    const urlSub =
      (searchParams.get("sub") as "incoming" | "outgoing" | null) || "incoming";

    setTab(urlTab);
    if (urlTab === "requests") setRequestsSub(urlSub);
  }, [searchParams]);

  // Load friends, requests, recommended
  useEffect(() => {
    if (!token) return;

    // first load instantly
    refreshAll();

    // then refresh regularly (online dots + last seen)
    const id = setInterval(() => {
      refreshAll();
    }, 15000); // 15s

    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
  if (!token) return;

  refreshAll();
  loadInviteInfo(); // ✅ add this

  const id = setInterval(() => {
    refreshAll();
    // optional: refresh invite count periodically
    loadInviteInfo();
  }, 15000);

  return () => clearInterval(id);
}, [token]);


  // Find friends drawer search (global search)
  useEffect(() => {
    if (!token) return;
    if (!findOpen) return;

    if (!findQuery.trim()) {
      setFindResults([]);
      setFindMessage("");
      return;
    }

    const controller = new AbortController();
    setFindLoading(true);

    fetch(
      `http://localhost:4000/users/search?q=${encodeURIComponent(findQuery)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }
    )
      .then((res) => res.json())
      .then((data) => setFindResults(data.users || []))
      .catch(() => {})
      .finally(() => setFindLoading(false));

    return () => controller.abort();
  }, [findQuery, findOpen, token]);

  // Unread DM count
  useEffect(() => {
    if (!token) return;

    const loadUnread = () => {
      fetch("http://localhost:4000/dm/unread", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          const map: Record<number, number> = {};
          (data.unread || []).forEach((u: any) => {
            map[u.senderId] = u._count._all;
          });
          setUnreadMap(map);
        })
        .catch(() => {});
    };

    loadUnread(); // immediately
    const id = setInterval(loadUnread, 15000); // same interval

    return () => clearInterval(id);
  }, [token]);

  async function loadFriends() {
    const res = await fetch("http://localhost:4000/friends", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setFriends(data.friends || []);
  }

  async function loadInvitedUsers() {
  if (!token) return;
  setInvitedLoading(true);
  setInvitedError("");

  try {
    const res = await fetch("http://localhost:4000/auth/invited?limit=200", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setInvitedError(data?.error || "Failed to load invited users.");
      setInvitedUsers([]);
      return;
    }
    setInvitedUsers(data.invited || []);
  } catch {
    setInvitedError("Network error while loading invited users.");
    setInvitedUsers([]);
  } finally {
    setInvitedLoading(false);
  }
}


  async function loadInviteInfo() {
  if (!token) return;
  setInviteLoading(true);
  try {
    const res = await fetch("http://localhost:4000/auth/invite", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      setInviteCode(data.inviteCode || "");
      setInvitedCount(data.invitedCount || 0);
    }
  } catch {
  } finally {
    setInviteLoading(false);
  }
}

async function handleCopyInviteLink() {
  setInviteMsg("");

  // if not loaded yet, load first
  if (!inviteCode) {
    await loadInviteInfo();
  }
  if (!inviteCode) {
    setInviteMsg("Could not load invite code.");
    return;
  }

  const link = `${window.location.origin}/register?ref=${inviteCode}`;

  try {
    await navigator.clipboard.writeText(link);
    setInviteMsg("Copied successfully ✓");
setTimeout(() => setInviteMsg(""), 2000);
  } catch {
    // fallback for older browsers / insecure contexts
    try {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setInviteMsg("Copied successfully ✓");
setTimeout(() => setInviteMsg(""), 2000);
    } catch {
      setInviteMsg("Copy failed. Please copy manually.");
    }
  }
}

async function handleShareInviteLink() {
  if (!inviteCode) {
    await loadInviteInfo();
  }
  if (!inviteCode) {
    setInviteMsg("Could not load invite code.");
    return;
  }

  const link = `${window.location.origin}/register?ref=${inviteCode}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Join me!",
        text: "Join this platform using my invite link:",
        url: link,
      });
    } catch {
      // user cancelled
    }
  } else {
    setInviteMsg("Sharing not supported on this device.");
  }
}

async function loadRequests() {
  const res = await fetch("http://localhost:4000/friends/requests", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  setIncoming(data.incoming || []);
  setOutgoing(data.outgoing || []);

  // 🔥 Sync sentRequests with outgoing requests
  const outgoingIds = (data.outgoing || []).map((r: any) => r.to.id);
  setSentRequests(outgoingIds);
}

  async function loadRecommended() {
  try {
    const res = await fetch("http://localhost:4000/friends/recommended", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      setRecommended([]);
      return;
    }

    const data = await res.json();
    setRecommended(data.users || []);
  } catch {
    setRecommended([]);
  }
}

  async function handleAddFriend(targetId: number) {
    // instant UI update
    setSentRequests((prev) => [...prev, targetId]);

    await fetch("http://localhost:4000/friends/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetId }),
    });

    loadRequests();
    loadRecommended();
  }

  async function handleAccept(id: number) {
    await fetch("http://localhost:4000/friends/accept", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestId: id }),
    });
    loadFriends();
    loadRequests();
  }

  async function handleDecline(id: number) {
    await fetch("http://localhost:4000/friends/decline", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestId: id }),
    });
    loadRequests();
  }

  async function handleRemoveFriend(friendId: number) {
    if (!confirm("Remove this friend?")) return;

    await fetch(`http://localhost:4000/friends/${friendId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadFriends();
  }

  function timeAgo(input?: string | Date | null) {
    if (!input) return null;
    const d = typeof input === "string" ? new Date(input) : input;
    const diff = Date.now() - d.getTime();
    if (Number.isNaN(diff)) return null;

    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
  }

  const filteredFriends = friends.filter((f) => {
    const q = friendsQuery.trim().toLowerCase();
    if (!q) return true;
    return (f.name || "").toLowerCase().includes(q);
  });

  const sortedFriends =
    friendsSort === "online"
      ? [...filteredFriends].sort((a, b) => {
          const ao = a.online ? 1 : 0;
          const bo = b.online ? 1 : 0;
          // online first
          if (bo !== ao) return bo - ao;
          // fallback
          return (a.name || "").localeCompare(b.name || "");
        })
      : filteredFriends;

  const FriendRow = ({ f }: { f: any }) => (
    <li className="flex items-center justify-between bg-white/5 rounded-xl p-3 hover:bg-white/10 transition">
      <button
        onClick={() => router.push(`/profile/${f.id}`)}
        className="flex items-center gap-3 text-left group min-w-0"
      >
        <div className="relative shrink-0">
          <img
            src={f.avatar ? `/avatars/${f.avatar}` : "/avatars/default.png"}
            alt={f.name}
            className="w-10 h-10 rounded-full border border-amber-400/40 group-hover:border-amber-300/70 transition"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
              f.online ? "bg-green-400" : "bg-gray-500"
            }`}
            title={f.online ? "Online" : "Offline"}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{f.name}</span>

            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-100">
              Lv {f.currentLevel ?? "—"}
            </span>

            {unreadMap[f.id] > 0 && (
              <span className="bg-amber-400 text-gray-900 text-xs font-bold rounded-full px-2 py-0.5 shadow-md">
                {unreadMap[f.id]}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-300 mt-0.5">
            {f.online
              ? "Online now"
              : timeAgo(getLastSeen(f))
              ? `Last seen ${timeAgo(getLastSeen(f))}`
              : "Last seen —"}
          </div>
        </div>
      </button>

      <div className="flex gap-2 shrink-0">
  <button
    onClick={() => router.push(`/dm/${f.id}`)}
    className="px-3 py-1 rounded bg-gray-500 hover:bg-gray-400 text-sm"
  >
    Message
  </button>

 <button
  onClick={() => handleRemoveFriend(f.id)}
  className="px-1.5 py-1 rounded bg-red-500 hover:bg-red-400 text-sm"
  aria-label="Remove friend"
  title="Remove"
>
  🗑️
</button>

</div>

    </li>
  );

  const IncomingRow = ({ r }: { r: any }) => (
    <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 hover:bg-white/10 transition">
      <button
        onClick={() => router.push(`/profile/${r.from.id}`)}
        className="flex items-center gap-3 text-left group min-w-0"
      >
        <div className="relative shrink-0">
          <img
            src={
              r.from.avatar ? `/avatars/${r.from.avatar}` : "/avatars/default.png"
            }
            alt={r.from.name}
            className="w-10 h-10 rounded-full border border-amber-400/40 group-hover:border-amber-300/70 transition"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
              r.from.online ? "bg-green-400" : "bg-gray-500"
            }`}
            title={r.from.online ? "Online" : "Offline"}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{r.from.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-100">
              Lv {r.from.currentLevel ?? "—"}
            </span>
          </div>

          <div className="text-xs text-gray-300 mt-0.5">
            Received {timeAgo(r.createdAt) ?? "—"}
          </div>
        </div>
      </button>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => handleAccept(r.id)}
          className="px-3 py-1 rounded bg-green-500 hover:bg-green-400 text-sm"
        >
          Accept
        </button>
        <button
          onClick={() => handleDecline(r.id)}
          className="px-3 py-1 rounded bg-red-500 hover:bg-red-400 text-sm"
        >
          Decline
        </button>
      </div>
    </div>
  );

  const OutgoingRow = ({ r }: { r: any }) => (
    <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 hover:bg-white/10 transition">
      <button
        onClick={() => router.push(`/profile/${r.to.id}`)}
        className="flex items-center gap-3 text-left group min-w-0"
      >
        <div className="relative shrink-0">
          <img
            src={r.to.avatar ? `/avatars/${r.to.avatar}` : "/avatars/default.png"}
            alt={r.to.name}
            className="w-10 h-10 rounded-full border border-amber-400/40 group-hover:border-amber-300/70 transition"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
              r.to.online ? "bg-green-400" : "bg-gray-500"
            }`}
            title={r.to.online ? "Online" : "Offline"}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{r.to.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-100">
              Lv {r.to.currentLevel ?? "—"}
            </span>
          </div>

          <div className="text-xs text-gray-300 mt-0.5">
            Sent {timeAgo(r.createdAt) ?? "—"}
          </div>
        </div>
      </button>

      <button
        onClick={() => handleDecline(r.id)}
        className="px-3 py-1 rounded bg-gray-500 hover:bg-gray-400 text-sm shrink-0"
      >
        Cancel
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white">
      {/* =========================
          MOBILE LAYOUT (NEW)
          ========================= */}
      <div
  className="lg:hidden px-4 pt-6 pb-8"
  
>

  {mobileInviteOpen && (
  <div
    className="fixed inset-0 z-20"
    onClick={() => setMobileInviteOpen(false)}
  />
)}
        {/* 1. Title */}
      <div className="flex items-center justify-between relative">
  <Link
    href="/dashboard"
    className="text-3xl font-extrabold tracking-tight inline-block"
  >
    Friends 🤝
  </Link>

  <div className="flex items-center gap-2">
    <button
      onClick={() => setFindOpen(true)}
      className="px-4 py-2 rounded-lg bg-blue-300 text-gray-900 font-semibold hover:bg-amber-300 transition"
    >
      Search
    </button>

    {/* Tiny Invite Button */}
    <button
  onClick={(e) => {
    e.stopPropagation();
    setMobileInviteOpen((v) => !v);
  }}
  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 border border-white/20 hover:bg-white/25 transition"
  title="Invite new people"
>
  👤➕
</button>
  </div>

  {/* Invite Dropdown */}
  {mobileInviteOpen && (
    <div onClick={(e) => e.stopPropagation()}
  className="absolute right-0 top-full mt-3 w-64 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-xl p-4 z-30">
      <div className="flex flex-col gap-3">
        <button
          onClick={() => {
            handleCopyInviteLink();
            setMobileInviteOpen(false);
          }}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-semibold transition"
        >
          📋 Copy Invite Link
        </button>

        <button
          onClick={() => {
            handleShareInviteLink();
            setMobileInviteOpen(false);
          }}
          className="px-4 py-2 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition"
        >
          📤 Share Link
        </button>

        <div className="text-xs text-white/70 mt-2">
          You can see invited people count in
          <br />
          <span className="font-semibold">
            Settings &gt; Referrals
          </span>
        </div>
      </div>
    </div>
  )}
</div>

        {/* 2. Thin divider + buttons row */}
        <div className="mt-3 rounded-xl bg-white/10 border border-white/10">
          
        </div>

        {/* 3. Friends/Requests toggle (Requests left, Friends right) */}
        <div className="mt-4 relative w-full max-w-sm rounded-2xl bg-white/10 border border-white/10 p-1">
  {/* Sliding indicator */}
  <div
    className={`absolute top-1 left-1 h-[calc(100%-0.5rem)] w-1/2 rounded-xl transition-[transform,background-color] duration-300 ease-out
      ${tab === "friends" ? "translate-x-0 bg-sky-400" : "translate-x-full bg-amber-400"}`}
  />

  <div className="relative grid grid-cols-2">
    <button
      onClick={() => setUrlState("friends")}
      className={`z-10 py-2 font-semibold transition-colors
        ${tab === "friends" ? "text-gray-900" : "text-white/80"}`}
    >
      Friends
    </button>

    <button
      onClick={() => setUrlState("requests", requestsSub)}
      className={`z-10 py-2 font-semibold transition-colors
        ${tab === "requests" ? "text-gray-900" : "text-white/80"}`}
    >
      Requests
    </button>
  </div>
</div>


        {/* 4. Friends area or Requests area */}
        {tab === "friends" ? (
          <div className="mt-4">
            {/* Friends search */}
            <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
              <input
                type="text"
                value={friendsQuery}
                onChange={(e) => setFriendsQuery(e.target.value)}
                placeholder="Search inside your friends..."
                className="w-full px-4 py-2 rounded-xl bg-white/15 border border-white/10 placeholder-gray-200 text-white outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Friends list: show ~4 items and scroll */}
            <div className="mt-3 rounded-2xl bg-white/10 border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <div className="font-bold">Friends</div>
                <div className="text-xs text-white/70">{sortedFriends.length}</div>
              </div>

              <div className="mt-3">
                {sortedFriends.length === 0 ? (
                  <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl p-4">
                    You have no friends yet.
                  </div>
                ) : (
                  <ul
                    className="space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                    style={{ maxHeight: "22rem" }} // ~4 rows visible on most phones
                  >
                    {sortedFriends.map((f) => (
                      <FriendRow key={f.id} f={f} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {/* Requests sub-toggle */}
            <div className="relative rounded-2xl bg-white/10 border border-white/10 p-1">
  {/* Sliding indicator */}
  <div
    className={`absolute top-1 left-1 h-[calc(100%-0.5rem)] w-1/2 rounded-xl
      transition-[transform,background-color] duration-300 ease-out
      ${
        requestsSub === "incoming"
          ? "translate-x-0 bg-emerald-400"
          : "translate-x-full bg-fuchsia-400"
      }`}
  />

  <div className="relative grid grid-cols-2">
    <button
      onClick={() => {
        setRequestsSub("incoming");
        setUrlState("requests", "incoming");
      }}
      className={`z-10 py-2 font-semibold transition-colors
        ${
          requestsSub === "incoming"
            ? "text-gray-900"
            : "text-white/80"
        }`}
    >
      Incoming
    </button>

    <button
      onClick={() => {
        setRequestsSub("outgoing");
        setUrlState("requests", "outgoing");
      }}
      className={`z-10 py-2 font-semibold transition-colors
        ${
          requestsSub === "outgoing"
            ? "text-gray-900"
            : "text-white/80"
        }`}
    >
      Outgoing
    </button>
  </div>
</div>


            <div className="mt-3 rounded-2xl bg-white/10 border border-white/10 p-3">
              {requestsSub === "incoming" ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-amber-200">Incoming</div>
                    <div className="text-xs text-white/70">{incoming.length}</div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {incoming.length === 0 ? (
                      <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl p-4">
                        No incoming requests.
                      </div>
                    ) : (
                      incoming.map((r) => <IncomingRow key={r.id} r={r} />)
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-amber-200">Outgoing</div>
                    <div className="text-xs text-white/70">{outgoing.length}</div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {outgoing.length === 0 ? (
                      <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl p-4">
                        No outgoing requests.
                      </div>
                    ) : (
                      outgoing.map((r) => <OutgoingRow key={r.id} r={r} />)
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 5. Recommended friends accordion (closed by default) */}
        <div className="mt-5 rounded-2xl bg-white/10 border border-white/10">
          <button
            onClick={() => setRecommendedOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="font-bold text-amber-300">Recommended friends</div>
            <div className="text-sm font-semibold px-3 py-1 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 transition">
              {recommendedOpen ? "Hide" : "Show"}
            </div>
          </button>

          {recommendedOpen && (
            <div className="px-4 pb-4">
              {recommended.length === 0 ? (
                <p className="text-sm text-gray-300">No suggestions yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recommended.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <button
                        onClick={() => router.push(`/profile/${u.id}`)}
                        className="flex items-center gap-3 text-left min-w-0"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={
                              u.avatar
                                ? `/avatars/${u.avatar}`
                                : "/avatars/default.png"
                            }
                            alt={u.name}
                            className="w-10 h-10 rounded-full border border-white/20"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                              u.online ? "bg-green-400" : "bg-gray-500"
                            }`}
                            title={u.online ? "Online" : "Offline"}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{u.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-100">
                              Lv {u.currentLevel ?? "—"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-300 mt-0.5">
                            {u.online
                              ? "Online now"
                              : timeAgo(getLastSeen(u))
                              ? `Last seen ${timeAgo(getLastSeen(u))}`
                              : "Last seen —"}
                          </div>
                        </div>
                      </button>

                      <button
                        disabled={sentRequests.includes(u.id)}
                        onClick={() => handleAddFriend(u.id)}
                        className={`shrink-0 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                          sentRequests.includes(u.id)
                            ? "bg-green-500 cursor-default"
                            : "bg-blue-500 hover:bg-blue-400"
                        }`}
                      >
                        {sentRequests.includes(u.id) ? "Sent ✓" : "Add"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================
          DESKTOP LAYOUT (KEEP)
          ========================= */}
      <div className="hidden lg:block p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: MAIN SECTION */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-amber-300">Friends</h1>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold transition"
              >
                ← Back
              </button>
            </div>

            {/* FRIENDS SEARCH + SORT */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                value={friendsQuery}
                onChange={(e) => setFriendsQuery(e.target.value)}
                placeholder="Search inside your friends..."
                className="flex-1 px-4 py-2 rounded-lg bg-white/15 border border-white/10 placeholder-gray-200 text-white outline-none focus:ring-2 focus:ring-amber-400"
              />

              <select
                value={friendsSort}
                onChange={(e) => setFriendsSort(e.target.value as any)}
                className="px-4 py-2 rounded-lg bg-white/15 border border-white/10 text-white outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="default" className="text-black">
                  Default
                </option>
                <option value="online" className="text-black">
                  Online first
                </option>
              </select>
            </div>

            {/* TABS */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => setUrlState("friends")}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  tab === "friends"
                    ? "bg-amber-400 text-gray-900"
                    : "bg-white/20 hover:bg-white/30"
                }`}
              >
                My Friends
              </button>

              <button
                onClick={() => setUrlState("requests", requestsSub)}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  tab === "requests"
                    ? "bg-amber-400 text-gray-900"
                    : "bg-white/20 hover:bg-white/30"
                }`}
              >
                Requests
              </button>
            </div>

            {/* FRIENDS LIST */}
            {tab === "friends" && (
              <ul className="space-y-4">
                {sortedFriends.length === 0 ? (
                  <p className="text-center text-gray-300">
                    You have no friends yet.
                  </p>
                ) : (
                  sortedFriends.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between bg-white/5 rounded-lg p-3 hover:bg-white/10 transition"
                    >
                      <button
                        onClick={() => router.push(`/profile/${f.id}`)}
                        className="flex items-center gap-3 text-left group"
                      >
                        <div className="relative">
                          <img
                            src={
                              f.avatar
                                ? `/avatars/${f.avatar}`
                                : "/avatars/default.png"
                            }
                            alt={f.name}
                            className="w-10 h-10 rounded-full border border-amber-400/40 group-hover:border-amber-300/70 transition"
                          />

                          {/* Online dot (expects f.online boolean) */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                              f.online ? "bg-green-400" : "bg-gray-500"
                            }`}
                            title={f.online ? "Online" : "Offline"}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold truncate">{f.name}</span>

                            {/* Level badge */}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-100">
                              Lv {f.currentLevel ?? "—"}
                            </span>

                            {unreadMap[f.id] > 0 && (
                              <span className="bg-amber-400 text-gray-900 text-xs font-bold rounded-full px-2 py-0.5 shadow-md">
                                {unreadMap[f.id]}
                              </span>
                            )}
                          </div>

                          {/* Last seen */}
                          <div className="text-xs text-gray-300 mt-0.5">
                            {f.online
                              ? "Online now"
                              : timeAgo(getLastSeen(f))
                              ? `Last seen ${timeAgo(getLastSeen(f))}`
                              : "Last seen —"}
                          </div>
                        </div>
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/profile/${f.id}`)}
                          className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-400 text-sm"
                        >
                          See Profile
                        </button>

                        <button
                          onClick={() => router.push(`/dm/${f.id}`)}
                          className="px-3 py-1 rounded bg-gray-500 hover:bg-gray-400 text-sm"
                        >
                          Message
                        </button>

                        <button
                          onClick={() => handleRemoveFriend(f.id)}
                          className="px-3 py-1 rounded bg-red-500 hover:bg-red-400 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}

            {/* REQUESTS */}
            {tab === "requests" && (
              <div className="space-y-6">
                {/* Requests sub-tabs */}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setRequestsSub("incoming");
                      setUrlState("requests", "incoming");
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      requestsSub === "incoming"
                        ? "bg-amber-400 text-gray-900"
                        : "bg-white/20 hover:bg-white/30"
                    }`}
                  >
                    Incoming
                  </button>

                  <button
                    onClick={() => {
                      setRequestsSub("outgoing");
                      setUrlState("requests", "outgoing");
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      requestsSub === "outgoing"
                        ? "bg-amber-400 text-gray-900"
                        : "bg-white/20 hover:bg-white/30"
                    }`}
                  >
                    Outgoing
                  </button>
                </div>

                {/* Incoming panel */}
                {requestsSub === "incoming" && (
                  <div className="bg-white/5 rounded-2xl p-4 shadow-inner">
                    <h2 className="text-xl font-bold mb-3 text-amber-300">
                      Incoming
                    </h2>

                    {incoming.length === 0 ? (
                      <p className="text-sm text-gray-300">
                        No incoming requests.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {incoming.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between bg-white/5 rounded-lg p-3 hover:bg-white/10 transition"
                          >
                            <button
                              onClick={() => router.push(`/profile/${r.from.id}`)}
                              className="flex items-center gap-3 text-left group"
                            >
                              <div className="relative">
                                <img
                                  src={
                                    r.from.avatar
                                      ? `/avatars/${r.from.avatar}`
                                      : "/avatars/default.png"
                                  }
                                  alt={r.from.name}
                                  className="w-10 h-10 rounded-full border border-amber-400/40 group-hover:border-amber-300/70 transition"
                                />
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                                    r.from.online
                                      ? "bg-green-400"
                                      : "bg-gray-500"
                                  }`}
                                  title={r.from.online ? "Online" : "Offline"}
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold truncate">
                                    {r.from.name}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-100">
                                    Lv {r.from.currentLevel ?? "—"}
                                  </span>
                                </div>

                                <div className="text-xs text-gray-300 mt-0.5">
                                  Received {timeAgo(r.createdAt) ?? "—"}
                                </div>
                              </div>
                            </button>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAccept(r.id)}
                                className="px-3 py-1 rounded bg-green-500 hover:bg-green-400"
                              >
                                Accept
                              </button>

                              <button
                                onClick={() => handleDecline(r.id)}
                                className="px-3 py-1 rounded bg-red-500 hover:bg-red-400"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Outgoing panel */}
                {requestsSub === "outgoing" && (
                  <div className="bg-white/5 rounded-2xl p-4 shadow-inner">
                    <h2 className="text-xl font-bold mb-3 text-amber-300">
                      Outgoing
                    </h2>

                    {outgoing.length === 0 ? (
                      <p className="text-sm text-gray-300">
                        No outgoing requests.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {outgoing.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between bg-white/5 rounded-lg p-3 hover:bg-white/10 transition"
                          >
                            <button
                              onClick={() => router.push(`/profile/${r.to.id}`)}
                              className="flex items-center gap-3 text-left group"
                            >
                              <div className="relative">
                                <img
                                  src={
                                    r.to.avatar
                                      ? `/avatars/${r.to.avatar}`
                                      : "/avatars/default.png"
                                  }
                                  alt={r.to.name}
                                  className="w-10 h-10 rounded-full border border-amber-400/40 group-hover:border-amber-300/70 transition"
                                />
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                                    r.to.online
                                      ? "bg-green-400"
                                      : "bg-gray-500"
                                  }`}
                                  title={r.to.online ? "Online" : "Offline"}
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold truncate">
                                    {r.to.name}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-100">
                                    Lv {r.to.currentLevel ?? "—"}
                                  </span>
                                </div>

                                <div className="text-xs text-gray-300 mt-0.5">
                                  Sent {timeAgo(r.createdAt) ?? "—"}
                                </div>
                              </div>
                            </button>

                            <button
                              onClick={() => handleDecline(r.id)}
                              className="px-3 py-1 rounded bg-gray-500 hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Find friends card */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-amber-300">
                    Find Friends
                  </h2>
                  <button
                    onClick={() => setFindOpen(true)}
                    className="px-3 py-1 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 text-sm"
                  >
                    Search
                  </button>
                </div>

              

                <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-gray-200">
                             <p className="text-sm text-gray-200">
                  Search among all users to send friend requests!
                </p>      
                </div>
              </div>

              {/* Invite friends card */}
<div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 shadow-xl">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-bold text-amber-300">Invite a Friend</h2>
    <button
  type="button"
  onClick={async () => {
    setInvitedOpen(true);
    await loadInvitedUsers();
  }}
  className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:bg-white/15 transition"
  title="View invited people"
>
  {inviteLoading ? "…" : `${invitedCount} invited`}
</button>

  </div>

  <p className="text-sm text-gray-200 mt-2">
    Share your invite link with new friends.
  </p>

  <div className="mt-4 flex gap-2">
    <button
      onClick={handleCopyInviteLink}
      disabled={!token || inviteLoading}
      className="flex-1 px-4 py-2 rounded-xl bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition disabled:opacity-60"
    >
      Copy invite link
    </button>

    <button
      onClick={loadInviteInfo}
      disabled={!token || inviteLoading}
      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold transition disabled:opacity-60"
      title="Refresh"
      aria-label="Refresh invite info"
    >
      ↻
    </button>
  </div>

  {inviteCode && (
    <div className="mt-3 text-xs text-white/80 bg-white/5 border border-white/10 rounded-xl p-3 break-all">
      <div className="font-semibold text-white/90 mb-1">Your link:</div>
      {typeof window !== "undefined"
        ? `${window.location.origin}/register?ref=${inviteCode}`
        : ""}
    </div>
  )}

  {inviteMsg && (
    <div className="mt-3 text-sm text-gray-200 bg-white/5 border border-white/10 rounded-xl p-3">
      {inviteMsg}
    </div>
  )}
</div>


              {/* Recommended friends card */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-amber-300 mb-4">
                  Recommended Friends
                </h2>

                {recommended.length === 0 ? (
                  <p className="text-sm text-gray-300">No suggestions yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {recommended.map((u) => (
                      <li key={u.id} className="flex items-center justify-between">
                        <button
                          onClick={() => router.push(`/profile/${u.id}`)}
                          className="flex items-center gap-3 text-left"
                        >
                          <div className="relative">
                            <img
                              src={
                                u.avatar
                                  ? `/avatars/${u.avatar}`
                                  : "/avatars/default.png"
                              }
                              alt={u.name}
                              className="w-10 h-10 rounded-full border border-white/20"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                                u.online ? "bg-green-400" : "bg-gray-500"
                              }`}
                              title={u.online ? "Online" : "Offline"}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold truncate">
                                {u.name}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-100">
                                Lv {u.currentLevel ?? "—"}
                              </span>
                            </div>

                            <div className="text-xs text-gray-300 mt-0.5">
                              {u.online
                                ? "Online now"
                                : timeAgo(getLastSeen(u))
                                ? `Last seen ${timeAgo(getLastSeen(u))}`
                                : "Last seen —"}
                            </div>
                          </div>
                        </button>

                        <button
                          disabled={sentRequests.includes(u.id)}
                          onClick={() => handleAddFriend(u.id)}
                          className={`px-3 py-1 rounded text-sm transition ${
                            sentRequests.includes(u.id)
                              ? "bg-green-500 cursor-default"
                              : "bg-blue-500 hover:bg-blue-400"
                          }`}
                        >
                          {sentRequests.includes(u.id) ? "Sent ✓" : "Add"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FIND FRIENDS DRAWER (shared) */}
      {findOpen && (
        <>
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close find friends"
            onClick={() => setFindOpen(false)}
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.aside
            className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-slate-950/90 backdrop-blur-xl z-50 border-l border-white/10 shadow-2xl"
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="h-full flex flex-col p-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-bold text-amber-300">
                    Find Friends
                  </h3>
                  <p className="text-sm text-gray-200">
                    Search all users and send requests
                  </p>
                </div>

                <button
                  onClick={() => setFindOpen(false)}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold"
                >
                  ✕
                </button>
              </div>

              {/* Search input */}
              <div className="pt-4">
                <input
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-amber-400"
                />

                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-gray-300">
                    {findLoading
                      ? "Searching..."
                      : findQuery.trim()
                      ? `${findResults.length} results`
                      : "Type to search"}
                  </div>

                  {findQuery && (
                    <button
                      onClick={() => setFindQuery("")}
                      className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {findMessage && (
                  <div className="mt-3 text-sm text-gray-200 bg-white/5 border border-white/10 rounded-xl p-3">
                    {findMessage}
                  </div>
                )}
              </div>

              {/* Results */}
              <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {!findQuery.trim() ? (
                  <div className="text-sm text-gray-300 bg-white/5 border border-white/10 rounded-2xl p-4">
                    Tip: Try to be precise in spelling
                  </div>
                ) : findResults.length === 0 && !findLoading ? (
                  <div className="text-sm text-gray-300 bg-white/5 border border-white/10 rounded-2xl p-4">
                    No users found.
                  </div>
                ) : (
                  findResults.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3 hover:bg-white/10 transition"
                    >
                      <button
                        onClick={() => router.push(`/profile/${u.id}`)}
                        className="flex items-center gap-3 text-left min-w-0"
                      >
                        <img
                          src={
                            u.avatar
                              ? `/avatars/${u.avatar}`
                              : "/avatars/default.png"
                          }
                          alt={u.name}
                          className="w-10 h-10 rounded-full border border-white/20 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{u.name}</div>
                          
                        </div>
                      </button>

                      <button
                        disabled={sentRequests.includes(u.id)}
                        onClick={async () => {
                          setFindMessage("");
                          setSentRequests((prev) => [...prev, u.id]);
                          setFindMessage("Sending request...");

                          await fetch("http://localhost:4000/friends/request", {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ targetId: u.id }),
                          });

                          setFindMessage("Friend request sent ✓");
                          loadRequests();
                          loadRecommended();
                        }}
                        className={`px-3 py-2 rounded-xl text-sm font-semibold transition shrink-0 ${
                          sentRequests.includes(u.id)
                            ? "bg-green-500 text-white cursor-default"
                            : "bg-amber-400 text-gray-900 hover:bg-amber-300"
                        }`}
                      >
                        {sentRequests.includes(u.id) ? "Sent ✓" : "Add"}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={() => setFindOpen(false)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}

      {/* INVITED PEOPLE MODAL */}
{invitedOpen && (
  <>
    {/* Backdrop */}
    <motion.button
      type="button"
      aria-label="Close invited people"
      onClick={() => setInvitedOpen(false)}
      className="fixed inset-0 bg-black/50 z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />

    {/* Modal */}
    <motion.div
      className="fixed left-1/2 top-1/2 z-50 w-full px-4 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-white/10 shadow-2xl"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="text-lg font-bold text-amber-300">
              Invited people
            </div>
            <div className="text-xs text-white/70">
              Newest on top • {invitedCount} total
            </div>
          </div>

          <button
            onClick={() => setInvitedOpen(false)}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="mt-3">
          {invitedLoading ? (
            <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl p-4">
              Loading...
            </div>
          ) : invitedError ? (
            <div className="text-sm text-red-200 bg-white/5 border border-white/10 rounded-xl p-4">
              {invitedError}
            </div>
          ) : invitedUsers.length === 0 ? (
            <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl p-4">
              You haven’t invited anyone yet.
            </div>
          ) : (
            <div
              className="mt-2 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
              style={{ maxHeight: "18rem" }} // ~4 rows visible, scrollable
            >
              {invitedUsers.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition"
                >
                  <button
                    onClick={() => {
                      setInvitedOpen(false);
                      router.push(`/profile/${u.id}`);
                    }}
                    className="flex items-center gap-3 min-w-0 text-left"
                  >
                    <img
                      src={u.avatar ? `/avatars/${u.avatar}` : "/avatars/default.png"}
                      alt={u.name}
                      className="w-10 h-10 rounded-full border border-white/20 shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="font-semibold truncate">{u.name}</div>
                      <div className="text-xs text-white/60">
                        {u.createdAt ? `Invited ${timeAgo(u.createdAt) ?? ""}` : ""}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setInvitedOpen(false);
                      router.push(`/profile/${u.id}`);
                    }}
                    className="shrink-0 px-3 py-2 rounded-xl bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition text-sm"
                  >
                    Go to profile
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-4 border-t border-white/10 flex justify-between gap-2">
          <button
            onClick={loadInvitedUsers}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold transition text-sm"
          >
            Refresh
          </button>

          <button
            onClick={() => setInvitedOpen(false)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold transition text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </motion.div>
  </>
)}

{inviteMsg && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md text-white text-sm px-4 py-2 rounded-xl border border-white/10 shadow-xl z-[999]"
  >
    {inviteMsg}
  </motion.div>
)}

    </main>
  );
}
