import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("token");

  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      autoConnect: false,
      transports: ["websocket"],
      auth: {
        token, // ✅ THIS IS THE KEY
      },
    });
  } else {
    // ✅ update token if socket already exists
    socket.auth = { token };
  }

  return socket;
}