"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import io from "socket.io-client";
import { asset } from "@/lib/assets";

const socket = io(process.env.NEXT_PUBLIC_API_URL!);

export default function DirectMessagePage() {
  const { id } = useParams(); // friend’s ID
  const router = useRouter();
  const [friend, setFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    // Identify socket
    socket.emit("auth", token);

    // Load friend info
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
})
      .then((res) => res.json())
      .then((data) => setFriend(data.user));

    // Load previous messages
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/dm/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
})
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []));

      // Mark all messages from this friend as read
fetch(`${process.env.NEXT_PUBLIC_API_URL}/dm/${id}/read`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});

    // Listen for new messages
    socket.on("private_message", (msg) => {
      if (msg.from === Number(id)) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.off("private_message");
    };
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!newMsg.trim()) return;
    const token = localStorage.getItem("token");
    socket.emit("private_message", { token, toUserId: Number(id), content: newMsg });
    setMessages((prev) => [
      ...prev,
      { from: "me", content: newMsg, createdAt: new Date().toISOString() },
    ]);
    setNewMsg("");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white flex flex-col">
      <header className="p-4 bg-white/10 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <img
            src={friend?.avatar ? asset(`avatars/${friend.avatar}`) : asset("avatars/default.webp")}
            alt="friend"
            className="w-10 h-10 rounded-full border border-amber-300"
          />
          <h1 className="font-bold text-lg">{friend?.name || "Loading..."}</h1>
        </div>
        <button
          onClick={() => router.push("/friends")}
          className="px-3 py-2 rounded bg-white/20 hover:bg-white/30 text-sm"
        >
          ← Back
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`px-4 py-2 rounded-xl max-w-[60%] ${
                m.from === "me"
                  ? "bg-amber-400 text-gray-900 rounded-br-none"
                  : "bg-white/20 rounded-bl-none"
              }`}
            >
              <p>{m.content}</p>
              <p className="text-xs text-gray-300 mt-1 text-right">
                {new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </div>

      <footer className="p-4 flex items-center gap-3 bg-white/10 backdrop-blur-md">
        <input
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-3 rounded-lg bg-white/20 text-white outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={sendMessage}
          className="px-5 py-3 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition"
        >
          Send
        </button>
      </footer>
    </main>
  );
}
