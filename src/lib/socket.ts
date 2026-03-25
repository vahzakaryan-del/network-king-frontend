import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("token");
  if (!token) return null;

  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      transports: ["websocket"],
      autoConnect: true, // ✅ IMPORTANT
    });

    // ✅ AUTH IMMEDIATELY ON FIRST CONNECT
    socket.on("connect", () => {
  socket!.emit("auth", token);
});

socket.on("auth_success", () => {
  console.log("🟢 Socket READY");
});
  }

  return socket;
}