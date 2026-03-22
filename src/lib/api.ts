// frontend/src/lib/api.ts
// frontend/src/lib/api.ts

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let isLoggingOut = false;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
    credentials: "omit",
  });

  // 🔥 GLOBAL 401 HANDLING (THIS FIXES YOUR ISSUE)
  if (res.status === 401) {
    if (!isLoggingOut) {
      isLoggingOut = true;

      console.warn("🔒 Session expired — logging out");

      // remove token
      localStorage.removeItem("token");

      // disconnect socket (important for your app)
      try {
        const { getSocket } = await import("@/lib/socket");
        const socket = getSocket();
        socket?.disconnect();
      } catch {}

      // redirect immediately
      window.location.href = "/login?reason=session_expired";
    }

    // stop further execution everywhere
    throw new Error("Unauthorized");
  }

  return res;
}