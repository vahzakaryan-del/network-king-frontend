const API = process.env.NEXT_PUBLIC_API_URL || "";

export function asset(path?: string | null): string {
  if (!path) return `${API}/avatars/default.png`;

  if (path.startsWith("http")) return path;

  return `${API}/${path.replace(/^\/+/, "")}`;
}