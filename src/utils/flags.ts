export function countryToFlag(code?: string | null): string {
  if (!code) return "";
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0)));
}
