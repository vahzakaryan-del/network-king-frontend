// frontend/src/lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      autoConnect: false,
      transports: ["websocket"], // faster + avoids long-polling
    });
  }
  return socket;
}