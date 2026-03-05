"use client";
import { useEffect, useMemo, useState } from "react";
import { countryList } from "./countryList"; // [{ code, name }]

// ✅ Fallback component that uses flagcdn.com for consistent flags
const FlagIcon = ({ code }: { code: string }) => (
  <img
    src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`}
    alt={code}
    className="inline-block rounded-sm shadow-sm"
    style={{ width: "1.3em", height: "1em", objectFit: "cover" }}
  />
);

type Props = {
  initialCountries: string[] | string | null;
  initialMain?: string | null;
  onSave: (payload: { countries: string[]; mainCountry: string | null }) => Promise<void>;
};

export default function CountryPicker({ initialCountries, initialMain, onSave }: Props) {
  // ✅ Normalize to array
  const normalizeCountries = (input: any): string[] => {
    if (Array.isArray(input)) return input;
    if (typeof input === "string") {
      try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) return parsed;
        return input.split(",").map((x) => x.trim());
      } catch {
        return input.split(",").map((x) => x.trim());
      }
    }
    return [];
  };

  const [countries, setCountries] = useState<string[]>(normalizeCountries(initialCountries));
  const [mainCountry, setMainCountry] = useState<string | null>(initialMain || null);
  const [search, setSearch] = useState("");

  // ✅ ensure mainCountry always valid
  useEffect(() => {
    if (countries.length > 0 && (!mainCountry || !countries.includes(mainCountry))) {
      setMainCountry(countries[0]);
    }
  }, [countries]);

  // ✅ filtering
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return countryList;
    return countryList.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.code.toLowerCase().includes(s)
    );
  }, [search]);

  const toggleCountry = (code: string) => {
    if (countries.includes(code)) {
      const next = countries.filter((c) => c !== code);
      setCountries(next);
      if (mainCountry === code) setMainCountry(next[0] ?? null);
    } else {
      if (countries.length >= 3)
        return alert("Max 3 countries (upgrade coming soon 😉)");
      setCountries([...countries, code]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">🌍 Countries (max 3)</h3>
        <small className="text-white/60">{countries.length}/3 selected</small>
      </div>

      {/* Search input */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search countries…"
        className="w-full bg-white/10 border border-white/15 rounded-md px-3 py-2"
      />

      {/* Country list */}
      <div className="max-h-52 overflow-y-auto border border-white/10 rounded-md p-2 custom-scroll">
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((c) => {
            const active = countries.includes(c.code);
            return (
              <button
                key={c.code}
                onClick={() => toggleCountry(c.code)}
                className={`flex items-center gap-2 px-2 py-1 rounded-md border transition ${
                  active
                    ? "bg-amber-400/20 border-amber-400/40"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <FlagIcon code={c.code} />
                <span className="text-sm truncate">{c.name}</span>
                {active && (
                  <span className="ml-auto text-xs text-amber-300">Selected</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main country selector */}
      <div>
        <label className="block text-sm mb-1">⭐ Main country</label>
        <select
          value={mainCountry ?? ""}
          onChange={(e) => setMainCountry(e.target.value || null)}
          className="w-full bg-white/10 border border-white/15 rounded-md px-3 py-2"
        >
          <option value="">(none)</option>
          {countries.map((c) => {
            const item = countryList.find((x) => x.code === c);
            return (
              <option key={c} value={c}>
                {item?.name}
              </option>
            );
          })}
        </select>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSave({ countries, mainCountry })}
          className="px-4 py-2 rounded-lg bg-amber-400 text-black font-semibold hover:bg-amber-300 transition"
        >
          Save
        </button>
      </div>
    </div>
  );
}
