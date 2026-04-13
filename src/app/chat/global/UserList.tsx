//frontend\src\app\chat\global\UserList.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket"; 
import { useRouter } from "next/navigation";
import { asset } from "@/lib/assets";
import type { Socket } from "socket.io-client";

// CDN-based flag renderer
const FlagIcon = ({ code }: { code?: string | null }) => {
  if (!code) return <span>🌍</span>;
  return (
    <img
      src={`https://flagcdn.com/20x15/${code.toLowerCase()}.png`}
      alt={code}
      className="inline-block rounded-sm shadow-sm"
      style={{ width: "1.2em", height: "0.9em", objectFit: "cover" }}
    />
  );
};

type User = {
  id: number;
  name: string;
  avatar?: string | null;
  mainCountry?: string | null;
};

export default function UserList({ channel, socket }: { channel: string; socket: Socket }) {
  const [users, setUsers] = useState<User[]>([]);
  const router = useRouter();

  const channelRef = useRef(channel);

  useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  // ✅ REQUEST USERS
 useEffect(() => {
  if (!socket) return;

  const requestUsers = () => {
    const active = channelRef.current || "global";

    if (active === "global") {
      socket.emit("get_global_online_users");
    } else {
      socket.emit("get_channel_online_users", { channel: active });
    }
  };

  // ✅ RUN ON CONNECT (THIS FIXES YOUR ISSUE)
  socket.on("connect", requestUsers);

  // also run immediately
  requestUsers();

  return () => {
    socket.off("connect", requestUsers);
  };
}, [socket]);

  // ✅ LISTENERS (SAFE)
  useEffect(() => {
  if (!socket) return;

  const handleChannelUsers = (payload: {
      channel: string;
      users: User[];
    }) => {
      const active = channelRef.current || "global";
      if ((payload.channel || "global") !== active) return;
      setUsers(payload.users);
    };

    const handleGlobalUsers = (payload: any) => {
      const active = channelRef.current || "global";
      if (active !== "global") return;

      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.users)
        ? payload.users
        : [];

      setUsers(list);
    };

    const handleReconnect = () => {
      const active = channelRef.current || "global";

      socket.emit(
        active === "global"
          ? "get_global_online_users"
          : "get_channel_online_users",
        active === "global" ? undefined : { channel: active }
      );
    };

    socket.on("channel_online_users", handleChannelUsers);
    socket.on("global_online_users", handleGlobalUsers);
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("channel_online_users", handleChannelUsers);
      socket.off("global_online_users", handleGlobalUsers);
      socket.off("connect", handleReconnect);
    };
  }, [socket]);

  const avatarSrc = (a?: string | null) =>
    a ? asset(`avatars/${a}`) : asset("avatars/default.webp");

  return (
    <aside className="w-56 bg-[#1e1f22] border-l border-white/10 p-3 flex flex-col">
      <h2 className="text-sm uppercase text-gray-400 mb-2">
        Online — {users.length}
      </h2>

      <ul className="space-y-2 overflow-y-auto">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-2">
            <div className="relative">
              <img
                src={avatarSrc(u.avatar)}
                alt={u.name}
                onClick={() => router.push(`/profile/${u.id}`)}
                className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80"
                onError={(e) =>
                  ((e.currentTarget as HTMLImageElement).src =
                    asset("avatars/default.webp"))
                }
              />
              <span
                className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1e1f22] animate-pulse"
                title="Online"
              />
            </div>

            <span className="flex items-center gap-1 text-sm truncate">
              {u.name}
              {u.mainCountry && <FlagIcon code={u.mainCountry} />}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}