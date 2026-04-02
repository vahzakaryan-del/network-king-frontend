//frontend\src\lib\socket.ts


import { io, Socket } from "socket.io-client";

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("token");
  if (!token) return null;

  if ((window as any).__socket) {
    console.log("♻️ Returning existing socket:", (window as any).__socket.id);
    return (window as any).__socket;
  }

  console.log("🆕 Creating NEW socket — called from:", new Error().stack);

  const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
    transports: ["websocket"],
    auth: { token },
  });

  socket.on("connect", () => {
    console.log("🟢 Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", reason);
    // ✅ Only clear singleton on intentional disconnect, not on transport errors
    if (reason === "io client disconnect") {
      delete (window as any).__socket;
    }
  });

  (window as any).__socket = socket;
  return socket;
}

export function disconnectSocket() {
  if (typeof window === "undefined") return;
  const socket = (window as any).__socket;
  if (socket) {
    socket.disconnect();
    delete (window as any).__socket;
  }
}