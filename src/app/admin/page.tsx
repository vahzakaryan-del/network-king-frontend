// frontend/src/app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Admin landing page
 * Includes avatars + badges management
 */

type Profile = {
  id: number;
  email: string;
  name: string;
  avatar?: string | null;
  role?: string;
};

type SectionKey = "home" | "tests" | "badges" | "avatars" | "emojis" | "settings";


const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

// Small helper: consistent auth header
function authHeaders(token: string | null, extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${token || ""}`,
    ...(extra || {}),
  };
}

// Small helper: image fallback so broken URLs show a visible placeholder
function withImgFallback(e: React.SyntheticEvent<HTMLImageElement, Event>, kind: "avatar" | "badge") {
  const el = e.currentTarget;
  // prevent infinite loop
  if (el.dataset.fallbackApplied === "1") return;
  el.dataset.fallbackApplied = "1";

  // Use a simple local SVG-ish placeholder by switching to a data URL
  // (no dependency on Next public folder)
  const label = kind === "avatar" ? "AVATAR" : "BADGE";
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <rect width="100%" height="100%" fill="#111827"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="#FBBF24" font-family="Arial" font-size="14" font-weight="700">
        ${label} MISSING
      </text>
    </svg>
  `);
  el.src = `data:image/svg+xml;charset=utf-8,${svg}`;
}

export default function AdminPage() {
  const router = useRouter();

  const [me, setMe] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SectionKey>("home");

  const fade = useMemo(
    () => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }),
    []
  );

  // 🔔 Notification bubble
  const [notify, setNotify] = useState<string | null>(null);
  function pushNotify(msg: string) {
    setNotify(msg);
    setTimeout(() => setNotify(null), 2200);
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // AUTH
  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/profile`, {
          headers: authHeaders(token),
        });
        const data = await res.json();

        if (!res.ok || !data?.user) throw new Error(data?.error || "Profile fetch failed");

        if (data.user.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        setMe(data.user);
      } catch (err) {
        console.error("Admin auth failed:", err);
        router.replace("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white">
        <div className="text-center">
          <div className="animate-pulse text-2xl font-bold">Loading Admin…</div>
          <div className="mt-2 text-white/80 text-sm">Verifying access</div>
        </div>
      </main>
    );
  }

  const NavBtn = ({
    id,
    label,
    emoji,
  }: {
    id: SectionKey;
    label: string;
    emoji: string;
  }) => {
    const isActive = active === id;
    return (
      <button
        onClick={() => setActive(id)}
        className={`w-full text-left px-4 py-3 rounded-xl transition border ${
          isActive
            ? "bg-amber-400 text-gray-900 border-amber-300 shadow-lg"
            : "bg-white/10 text-white border-white/15 hover:bg-white/20"
        }`}
      >
        <span className="mr-2">{emoji}</span>
        {label}
      </button>
    );
  };

  // -----------------------------
  // SECTIONS
  // -----------------------------
  const SectionHome = () => (
    <motion.div {...fade} transition={{ duration: 0.35 }}>
      <h2 className="text-2xl font-bold text-amber-300">Welcome, {me?.name}</h2>
      <p className="text-white/90 mt-2">
        This is your royal control room 👑. From here you can manage badges and avatars.
      </p>
    </motion.div>
  );

  const SectionTests = () => (
    <motion.div {...fade} transition={{ duration: 0.35 }}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-amber-300">Manage Tests</h2>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/admin/tests/create")}
            className="px-4 py-2 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition"
          >
            ➕ New Test
          </button>
          <button
            onClick={() => router.push("/admin/tests")}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/20 transition"
          >
            View All
          </button>
        </div>
      </div>

      <p className="text-white/90 mt-2">Create and curate assessments...</p>
    </motion.div>
  );

  // ---------------------------------
  // 🏅 BADGES SECTION (ADMIN)
  // ---------------------------------
  type DBBadge = {
    id: number;
    name: string;
    slug: string;
    rarity: string;
    description?: string | null;
    icon: string; // "/badges/xxx.png"
  };

  const SectionBadges = () => {
    const [dbBadges, setDbBadges] = useState<DBBadge[]>([]);
    const [files, setFiles] = useState<string[]>([]);
    const [loadingBadges, setLoadingBadges] = useState(true);

    const [editing, setEditing] = useState<DBBadge | null>(null);
    const [creatingFileName, setCreatingFileName] = useState<string | null>(null);

    // upload form
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadName, setUploadName] = useState("");
    const [uploadRarity, setUploadRarity] = useState("bronze");
    const [uploadDescription, setUploadDescription] = useState("");

    useEffect(() => {
      loadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadAll() {
      setLoadingBadges(true);
      await Promise.all([loadDB(), loadFiles()]);
      setLoadingBadges(false);
    }

    async function loadDB() {
      try {
        const res = await fetch(`${API_BASE}/admin/badges`, {
          headers: authHeaders(token),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("loadDB badges failed:", data);
          return;
        }
        setDbBadges(data.badges || []);
      } catch (err) {
        console.error("loadDB badges error:", err);
      }
    }

    // ✅ matches your backend: GET /badges/list (admin-only) => { badges: string[] }
    async function loadFiles() {
      try {
        const res = await fetch(`${API_BASE}/badges/list`, {
          headers: authHeaders(token),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("loadFiles badges failed:", data);
          return;
        }
        setFiles(data.badges || []);
      } catch (err) {
        console.error("loadFiles badges error:", err);
      }
    }

    async function handleUpload(e: any) {
      e.preventDefault();

      if (!uploadFile) {
        alert("Choose a file");
        return;
      }

      const form = new FormData();
      form.append("file", uploadFile);
      form.append("name", uploadName);
      form.append("rarity", uploadRarity);
      form.append("description", uploadDescription);

      const res = await fetch(`${API_BASE}/admin/badges/upload`, {
        method: "POST",
        headers: authHeaders(token),
        body: form,
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || "Upload failed");

      alert("Badge uploaded");
      setUploadFile(null);
      setUploadName("");
      setUploadRarity("bronze");
      setUploadDescription("");
      await loadAll();
    }

    async function registerExisting() {
      if (!creatingFileName || !uploadName) {
        alert("Name is required");
        return;
      }

      const res = await fetch(`${API_BASE}/admin/badges/register-existing`, {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          fileName: creatingFileName,
          name: uploadName,
          rarity: uploadRarity,
          description: uploadDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || "Failed");

      setCreatingFileName(null);
      setUploadName("");
      setUploadDescription("");
      setUploadRarity("bronze");
      await loadAll();
    }

    async function updateBadge(badge: DBBadge) {
      const res = await fetch(`${API_BASE}/admin/badges/${badge.id}`, {
        method: "PATCH",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: badge.name,
          rarity: badge.rarity,
          description: badge.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || "Update failed");

      await loadDB();
    }

    async function handleDelete(id: number, name: string) {
      if (!confirm(`Delete badge "${name}"?`)) return;

      const res = await fetch(`${API_BASE}/admin/badges/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || "Delete failed");
      await loadAll();
    }

    // files = list of all badge files in /public/badges
    const unregistered = files.filter((f) => !dbBadges.some((b) => b.icon === `/badges/${f}`));

    return (
      <motion.div {...fade} transition={{ duration: 0.35 }}>
        <h2 className="text-2xl font-bold text-amber-300 mb-4">Manage Badges</h2>

        {/* UPLOAD */}
        <form onSubmit={handleUpload} className="p-4 mb-6 rounded-xl bg-white/10 border border-white/15">
          <h3 className="font-semibold mb-2">Upload new badge</h3>

          <div className="grid md:grid-cols-5 gap-2">
            <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />

            <input
              placeholder="Name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              className="px-2 py-1 bg-white/10 border border-white/20 rounded-lg"
            />

            <select
              value={uploadRarity}
              onChange={(e) => setUploadRarity(e.target.value)}
              className="px-2 py-1 bg-white/10 border border-white/20 rounded-lg"
            >
              <option value="bronze">🥉 Bronze</option>
              <option value="silver">🥈 Silver</option>
              <option value="gold">🥇 Gold</option>
              <option value="legendary">🏆 Legendary</option>
              <option value="unique">✨ Unique</option>
            </select>

            <input
              placeholder="Description (optional)"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              className="px-2 py-1 bg-white/10 border border-white/20 rounded-lg"
            />

            <button type="submit" className="bg-amber-400 text-gray-900 rounded-lg font-semibold">
              Upload
            </button>
          </div>
        </form>

        {loadingBadges ? (
          <div>Loading badges…</div>
        ) : (
          <>
            {/* REGISTERED */}
            <h3 className="text-xl font-semibold mb-2">Registered badges</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dbBadges.map((b) => (
                <div key={b.id} className="p-3 rounded-xl bg-white/10 border border-white/15">
                  <img
                    src={`${API_BASE}${b.icon}`}
                    className="w-20 h-20 mx-auto mb-2 object-contain"
                    alt={b.name}
                    onError={(e) => withImgFallback(e, "badge")}
                  />

                  <div className="text-sm text-center font-semibold">{b.name}</div>
                  <div className="text-xs text-center text-white/70 capitalize">{b.rarity}</div>

                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setEditing(b)} className="flex-1 bg-blue-500 rounded-lg text-xs py-1">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(b.id, b.name)}
                      className="flex-1 bg-red-500 rounded-lg text-xs py-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* UNREGISTERED */}
            <h3 className="text-xl font-semibold my-4">Unregistered images</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {unregistered.map((f) => (
                <div key={f} className="p-3 rounded-xl bg-white/10 border border-white/15">
                  <img
                    src={`${API_BASE}/badges/${f}`}
                    className="w-20 h-20 mx-auto mb-2 object-contain"
                    alt={f}
                    onError={(e) => withImgFallback(e, "badge")}
                  />

                  <button
                    onClick={() => {
                      setCreatingFileName(f);
                      setUploadName("");
                      setUploadDescription("");
                      setUploadRarity("bronze");
                    }}
                    className="w-full bg-amber-400 text-gray-900 rounded-lg text-xs py-1 font-semibold"
                  >
                    Register
                  </button>

                  <button
  onClick={async () => {
    if (!confirm(`Delete ${f}?`)) return;

    const res = await fetch(`${API_BASE}/admin/avatars/${f}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || "Delete failed");

    pushNotify("Avatar deleted");
    await loadAll(); // reload list
  }}
  className="w-full mt-2 bg-red-500 text-white rounded-lg text-xs py-1"
>
  Delete from system too
</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* REGISTER MODAL */}
        {creatingFileName && (
          <div className="fixed inset-0 bg-black/60 grid place-items-center z-50">
            <div className="bg-white/10 p-6 rounded-xl w-[350px]">
              <h3 className="text-xl font-bold mb-3">Register Badge</h3>

              <img
                src={`${API_BASE}/badges/${creatingFileName}`}
                className="w-20 h-20 mx-auto mb-4 object-contain"
                alt={creatingFileName}
                onError={(e) => withImgFallback(e, "badge")}
              />

              <input
                placeholder="Name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                className="w-full mb-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
              />

              <select
                value={uploadRarity}
                onChange={(e) => setUploadRarity(e.target.value)}
                className="w-full mb-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
              >
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="legendary">Legendary</option>
                <option value="unique">Unique</option>
              </select>

              <input
                placeholder="Description"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                className="w-full mb-3 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
              />

              <div className="flex justify-between">
                <button onClick={() => setCreatingFileName(null)} className="px-3 py-1 bg-gray-500 rounded-lg">
                  Cancel
                </button>

                <button
                  onClick={registerExisting}
                  className="px-3 py-1 bg-amber-400 text-gray-900 rounded-lg font-semibold"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {editing && (
          <div className="fixed inset-0 bg-black/60 grid place-items-center z-50">
            <div className="bg-white/10 p-6 rounded-xl w-[350px]">
              <h3 className="text-xl font-bold mb-3">Edit Badge</h3>

              <img
                src={`${API_BASE}${editing.icon}`}
                className="w-20 h-20 mx-auto mb-4 object-contain"
                alt={editing.name}
                onError={(e) => withImgFallback(e, "badge")}
              />

              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full mb-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
              />

              <select
                value={editing.rarity}
                onChange={(e) => setEditing({ ...editing, rarity: e.target.value })}
                className="w-full mb-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
              >
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="legendary">Legendary</option>
                <option value="unique">Unique</option>
              </select>

              <input
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full mb-3 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
              />

              <div className="flex justify-between">
                <button onClick={() => setEditing(null)} className="px-3 py-1 bg-gray-500 rounded-lg">
                  Cancel
                </button>

                <button
                  onClick={() => {
                    updateBadge(editing);
                    setEditing(null);
                  }}
                  className="px-3 py-1 bg-blue-500 rounded-lg font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };


  // ---------------------------------
  // EMOJIS SECTION (ADMIN)
  // ---------------------------------

  type DBEmoji = {
  id: number;
  code: string;
  type: "unicode" | "image";
  value: string; // "🔥" or "/emojis/file.webp"
  label?: string | null;
  unlockLevel: number;
};

const SectionEmojis = () => {
  const [dbEmojis, setDbEmojis] = useState<DBEmoji[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [loadingEmojis, setLoadingEmojis] = useState(true);

  const [creatingFileName, setCreatingFileName] = useState<string | null>(null);

  // register form
  const [regCode, setRegCode] = useState("");
  const [regLabel, setRegLabel] = useState("");
  const [regLevel, setRegLevel] = useState("1");

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoadingEmojis(true);
    await Promise.all([loadDB(), loadFiles()]);
    setLoadingEmojis(false);
  }

  async function loadDB() {
    try {
      const res = await fetch(`${API_BASE}/admin/emojis`, {
        headers: authHeaders(token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("loadDB emojis failed:", data);
        return;
      }
      setDbEmojis(Array.isArray(data?.emojis) ? data.emojis : []);
    } catch (err) {
      console.error("loadDB emojis error:", err);
    }
  }

  async function loadFiles() {
    try {
      const res = await fetch(`${API_BASE}/admin/emojis/list`, {
        headers: authHeaders(token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("loadFiles emojis failed:", data);
        return;
      }
      setFiles(Array.isArray(data?.files) ? data.files : []);
    } catch (err) {
      console.error("loadFiles emojis error:", err);
    }
  }

  async function registerExisting() {
    if (!creatingFileName) return;

    const code = regCode.trim().replace(/^:+|:+$/g, "");
    const unlockLevel = Number(regLevel);

    if (!code) return alert("Code is required (example: lvl2_3)");
    if (!Number.isFinite(unlockLevel) || unlockLevel < 1) return alert("Unlock level must be >= 1");

    const res = await fetch(`${API_BASE}/admin/emojis/register-existing`, {
      method: "POST",
      headers: authHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        fileName: creatingFileName,
        code,
        label: regLabel || null,
        unlockLevel,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || "Register failed");

    pushNotify("Emoji registered!");
    setCreatingFileName(null);
    setRegCode("");
    setRegLabel("");
    setRegLevel("1");
    await loadAll();
  }

  async function deleteEmoji(id: number) {
    if (!confirm("Delete emoji from DB? (file stays)")) return;

    const res = await fetch(`${API_BASE}/admin/emojis/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || "Delete failed");

    pushNotify("Emoji deleted!");
    await loadDB();
  }

  // only image-type emojis map to files
  const registeredImage = dbEmojis.filter((e) => e.type === "image");
  const registeredUnicode = dbEmojis.filter((e) => e.type === "unicode");

  const unregistered = files.filter(
    (f) => !registeredImage.some((e) => e.value === `/emojis/${f}`)
  );

  return (
    <motion.div {...fade} transition={{ duration: 0.35 }}>
      <h2 className="text-2xl font-bold text-amber-300 mb-4">Manage Emojis</h2>

      {loadingEmojis ? (
        <div className="text-white/80">Loading emojis…</div>
      ) : (
        <>
          {/* REGISTERED IMAGE EMOJIS */}
          <h3 className="text-xl font-semibold mb-2">Registered image emojis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {registeredImage.map((e) => (
              <div key={e.id} className="p-3 rounded-xl bg-white/10 border border-white/15">
                <img
                  src={`${API_BASE}${e.value}`}
                  className="w-16 h-16 mx-auto mb-2 object-contain"
                  alt={e.label ?? e.code}
                  onError={(ev) => withImgFallback(ev as any, "badge")}
                />

                <div className="text-xs text-center font-semibold">{e.label ?? "—"}</div>
                <div className="text-[11px] text-center text-white/70">
                  code: <span className="font-mono">:{e.code}:</span>
                </div>
                <div className="text-[11px] text-center text-white/70">
                  unlock lvl: <span className="font-bold">{e.unlockLevel}</span>
                </div>

                <button
                  onClick={() => deleteEmoji(e.id)}
                  className="w-full mt-3 bg-red-500 rounded-lg text-xs py-1"
                >
                  Delete from DB
                </button>
              </div>
            ))}
          </div>

          {registeredImage.length === 0 && (
            <div className="text-sm text-white/60 mt-2">No image emojis registered yet.</div>
          )}

          {/* UNREGISTERED FILES */}
          <h3 className="text-xl font-semibold my-4">Unregistered emoji files</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {unregistered.map((f) => (
              <div key={f} className="p-3 rounded-xl bg-white/10 border border-white/15">
                <img
                  src={`${API_BASE}/emojis/${f}`}
                  className="w-16 h-16 mx-auto mb-2 object-contain"
                  alt={f}
                  onError={(ev) => withImgFallback(ev as any, "badge")}
                />

                <div className="text-xs text-center text-white/70 truncate">{f}</div>

                <button
                  onClick={() => {
                    setCreatingFileName(f);
                    setRegCode("");
                    setRegLabel("");
                    setRegLevel("1");
                  }}
                  className="w-full mt-2 bg-amber-400 text-gray-900 rounded-lg text-xs py-1 font-semibold"
                >
                  Register
                </button>
              </div>
            ))}
          </div>

          {unregistered.length === 0 && (
            <div className="text-sm text-white/60 mt-2">No unregistered emoji files.</div>
          )}

          {/* OPTIONAL: Unicode list (your seeded ones) */}
          <h3 className="text-xl font-semibold my-4">Unicode emojis (seeded)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {registeredUnicode.slice(0, 24).map((e) => (
              <div key={e.id} className="p-3 rounded-xl bg-white/10 border border-white/15">
                <div className="text-3xl text-center">{e.value}</div>
                <div className="text-[11px] text-center text-white/70 mt-1">
                  <span className="font-mono">:{e.code}:</span> • lvl {e.unlockLevel}
                </div>
              </div>
            ))}
          </div>
          {registeredUnicode.length > 24 && (
            <div className="text-xs text-white/50 mt-2">
              Showing first 24 unicode emojis (you have {registeredUnicode.length}).
            </div>
          )}
        </>
      )}

      {/* REGISTER MODAL */}
      {creatingFileName && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center z-50">
          <div className="bg-white/10 border border-white/20 p-6 rounded-xl w-[380px]">
            <h3 className="text-xl font-bold mb-3">Register Emoji</h3>

            <img
              src={`${API_BASE}/emojis/${creatingFileName}`}
              className="w-16 h-16 mx-auto mb-4 object-contain"
              alt={creatingFileName}
              onError={(ev) => withImgFallback(ev as any, "badge")}
            />

            <div className="text-xs text-white/70 mb-2">
              File: <span className="font-mono">{creatingFileName}</span>
            </div>

            <input
              placeholder="Code (example: lvl2_3)"
              value={regCode}
              onChange={(e) => setRegCode(e.target.value)}
              className="w-full mb-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
            />

            <input
              placeholder="Name/Label (optional)"
              value={regLabel}
              onChange={(e) => setRegLabel(e.target.value)}
              className="w-full mb-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
            />

            <input
              type="number"
              min={1}
              placeholder="Unlock level (1,2,3...)"
              value={regLevel}
              onChange={(e) => setRegLevel(e.target.value)}
              className="w-full mb-3 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
            />

            <div className="flex justify-between">
              <button
                onClick={() => setCreatingFileName(null)}
                className="px-3 py-1 bg-gray-500 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={registerExisting}
                className="px-3 py-1 bg-amber-400 text-gray-900 rounded-lg font-semibold"
              >
                Register to DB
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};



  // ---------------------------------
  // 🖼️ AVATARS SECTION (ADMIN)
  // ---------------------------------
  type DBAvatar = {
    id: number;
    fileName: string;
    visible: boolean;
    isFree: boolean;
    priceCents: number | null;
  };

  const SectionAvatars = () => {
    const [dbAvatars, setDbAvatars] = useState<DBAvatar[]>([]);
    const [unregisteredFiles, setUnregisteredFiles] = useState<string[]>([]);
    const [loadingAvatars, setLoadingAvatars] = useState(true);

    const [editing, setEditing] = useState<DBAvatar | null>(null);
    const [creatingFileName, setCreatingFileName] = useState<string | null>(null);

    // Upload form state
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadIsFree, setUploadIsFree] = useState(true);
    const [uploadPriceCents, setUploadPriceCents] = useState<string>("");

    useEffect(() => {
      loadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadAll() {
      setLoadingAvatars(true);
      await Promise.all([loadDB(), loadUnregistered()]);
      setLoadingAvatars(false);
    }

    async function loadDB() {
      try {
        const res = await fetch(`${API_BASE}/admin/avatars`, {
          headers: authHeaders(token),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("loadDB avatars failed:", data);
          return;
        }
        setDbAvatars(data.avatars || []);
      } catch (err) {
        console.error("loadDB avatars error:", err);
      }
    }

    async function loadUnregistered() {
      try {
        const res = await fetch(`${API_BASE}/admin/avatars/unregistered`, {
          headers: authHeaders(token),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("loadUnregistered avatars failed:", data);
          return;
        }
        setUnregisteredFiles(data.files || []);
      } catch (err) {
        console.error("loadUnregistered avatars error:", err);
      }
    }

    async function registerExisting(fileName: string, visible: boolean, isFree: boolean, priceCents: number | null) {
      try {
        const res = await fetch(`${API_BASE}/admin/avatars/register-existing`, {
          method: "POST",
          headers: authHeaders(token, { "Content-Type": "application/json" }),
          body: JSON.stringify({
            fileName,
            visible,
            isFree,
            priceCents: isFree ? null : priceCents,
          }),
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error || "Failed");

        alert("Avatar registered");
        setCreatingFileName(null);
        await loadAll();
      } catch (e) {
        console.error(e);
        alert("Error");
      }
    }

    async function updateAvatar(id: number, updates: Partial<DBAvatar>) {
      try {
        const res = await fetch(`${API_BASE}/admin/avatars/${id}`, {
          method: "PATCH",
          headers: authHeaders(token, { "Content-Type": "application/json" }),
          body: JSON.stringify({
            visible: updates.visible,
            isFree: updates.isFree,
            priceCents: updates.isFree ? null : updates.priceCents,
          }),
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error || "Failed");

        alert("Avatar updated");
        await loadAll();
      } catch (e) {
        console.error(e);
        alert("Failed");
      }
    }

    async function handleDeleteAvatar(id: number, filename: string) {
      if (!confirm(`Delete avatar "${filename}" from DB? (file stays)`)) return;

      try {
        const res = await fetch(`${API_BASE}/admin/avatars/${id}`, {
          method: "DELETE",
          headers: authHeaders(token),
        });

        const data = await res.json();
        if (res.ok) {
          pushNotify("Avatar deleted!");
          await loadAll();
        } else {
          pushNotify(data.error || "Delete failed");
        }
      } catch (err) {
        console.error(err);
        pushNotify("Network error deleting avatar");
      }
    }

    async function handleUpload(e: any) {
      e.preventDefault();

      if (!uploadFile) {
        alert("Choose file");
        return;
      }

      const form = new FormData();
      form.append("file", uploadFile);
      form.append("isFree", uploadIsFree ? "true" : "false");
      if (!uploadIsFree && uploadPriceCents) {
        form.append("priceCents", uploadPriceCents);
      }

      const res = await fetch(`${API_BASE}/admin/avatars/upload`, {
        method: "POST",
        headers: authHeaders(token),
        body: form,
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || "Upload failed");

      alert("Avatar uploaded");
      setUploadFile(null);
      setUploadIsFree(true);
      setUploadPriceCents("");
      await loadAll();
    }

    return (
      <motion.div {...fade} transition={{ duration: 0.35 }}>
        <h2 className="text-2xl font-bold text-amber-300 mb-4">Manage Avatars</h2>

        {/* UPLOAD NEW AVATAR */}
        <form onSubmit={handleUpload} className="p-4 mb-6 rounded-xl bg-white/10 border border-white/15">
          <h3 className="text-lg font-semibold mb-2">Upload new avatar</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
            <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={uploadIsFree} onChange={(e) => setUploadIsFree(e.target.checked)} />
              Free
            </label>

            {!uploadIsFree && (
              <input
                type="number"
                placeholder="Price cents (e.g. 199)"
                value={uploadPriceCents}
                onChange={(e) => setUploadPriceCents(e.target.value)}
                className="px-2 py-1 bg-white/10 border border-white/20 rounded-lg"
              />
            )}

            <button type="submit" className="px-4 py-2 bg-amber-400 text-gray-900 rounded-lg font-semibold">
              Upload & Register
            </button>
          </div>
        </form>

        {loadingAvatars ? (
          <div className="text-white/80">Loading avatars…</div>
        ) : (
          <>
            {/* REGISTERED AVATARS */}
            <h3 className="text-xl font-semibold mb-2">Registered avatars</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dbAvatars.map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-white/10 border border-white/15">
                  <img
                    src={`${API_BASE}/avatars/${a.fileName}`}
                    className="w-20 h-20 rounded-full mb-2 object-cover"
                    alt={a.fileName}
                    onError={(e) => withImgFallback(e, "avatar")}
                  />

                  <div className="text-xs text-center">{a.fileName}</div>

                  <div className="text-xs text-white/60 mt-1">{a.visible ? "Visible" : "Hidden"}</div>

                  {a.isFree ? (
                    <div className="text-xs text-green-300">FREE</div>
                  ) : (
                    <div className="text-xs text-yellow-300">
                      PAID {a.priceCents != null ? `(${a.priceCents} cents)` : ""}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setEditing(a)}
                      className="px-3 py-1 rounded-lg bg-blue-500 text-white text-xs hover:bg-blue-400"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteAvatar(a.id, a.fileName)}
                      className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs hover:bg-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* UNREGISTERED FILES */}
            <h3 className="text-xl font-semibold my-4">Unregistered images</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {unregisteredFiles.map((f) => (
                <div key={f} className="p-3 rounded-xl bg-white/10 border border-white/15">
                  <img
                    src={`${API_BASE}/avatars/${f}`}
                    className="w-20 h-20 rounded-full mb-2 object-cover"
                    alt={f}
                    onError={(e) => withImgFallback(e, "avatar")}
                  />
                  <div className="text-xs text-center mb-2">{f}</div>

                  <button
                    onClick={() => {
                      setCreatingFileName(f);
                      setUploadIsFree(true);
                      setUploadPriceCents("");
                    }}
                    className="px-3 py-1 bg-amber-400 text-xs text-gray-900 rounded-lg font-semibold"
                  >
                    Register
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* REGISTER EXISTING MODAL */}
        {creatingFileName && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white/10 border border-white/20 p-6 rounded-xl w-[350px]">
              <h3 className="text-xl font-bold mb-3">Register Avatar</h3>

              <img
                src={`${API_BASE}/avatars/${creatingFileName}`}
                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                alt={creatingFileName}
                onError={(e) => withImgFallback(e, "avatar")}
              />

              <label className="flex items-center gap-2 text-sm mb-2">
                <input type="checkbox" checked={uploadIsFree} onChange={(e) => setUploadIsFree(e.target.checked)} />
                Free
              </label>

              {!uploadIsFree && (
                <input
                  type="number"
                  placeholder="price cents"
                  value={uploadPriceCents}
                  onChange={(e) => setUploadPriceCents(e.target.value)}
                  className="w-full mb-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
                />
              )}

              <div className="flex justify-between mt-3">
                <button onClick={() => setCreatingFileName(null)} className="px-3 py-1 bg-gray-500 rounded-lg">
                  Cancel
                </button>

                <button
                  onClick={() =>
                    registerExisting(
                      creatingFileName,
                      true,
                      uploadIsFree,
                      !uploadIsFree && uploadPriceCents ? Number(uploadPriceCents) : null
                    )
                  }
                  className="px-3 py-1 bg-amber-400 text-gray-900 rounded-lg font-semibold"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {editing && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white/10 border border-white/15 p-6 rounded-xl w-[350px]">
              <h3 className="text-xl font-bold mb-3">Edit Avatar</h3>

              <img
                src={`${API_BASE}/avatars/${editing.fileName}`}
                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                alt={editing.fileName}
                onError={(e) => withImgFallback(e, "avatar")}
              />

              <label className="flex items-center gap-2 mb-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.visible}
                  onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
                />
                Visible
              </label>

              <label className="flex items-center gap-2 mb-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.isFree}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      isFree: e.target.checked,
                      priceCents: e.target.checked ? null : editing.priceCents,
                    })
                  }
                />
                Free
              </label>

              {!editing.isFree && (
                <input
                  type="number"
                  placeholder="price cents"
                  value={editing.priceCents ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      priceCents: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full mb-3 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
                />
              )}

              <div className="flex justify-between">
                <button onClick={() => setEditing(null)} className="px-3 py-1 bg-gray-500 rounded-lg">
                  Cancel
                </button>

                <button
                  onClick={() => {
                    updateAvatar(editing.id, editing);
                    setEditing(null);
                  }}
                  className="px-3 py-1 bg-blue-500 rounded-lg font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const SectionSettings = () => (
    <motion.div {...fade} transition={{ duration: 0.35 }}>
      <h2 className="text-2xl font-bold text-amber-300">Admin Settings</h2>
      <p className="text-white/90 mt-2">Future space for tools…</p>
    </motion.div>
  );

  const renderSection = () => {
    switch (active) {
      case "tests":
        return <SectionTests />;
      case "emojis":
        return <SectionEmojis />;
      case "badges":
        return <SectionBadges />;
      case "avatars":
        return <SectionAvatars />;
      case "settings":
        return <SectionSettings />;
      default:
        return <SectionHome />;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white font-sans">
      {notify && (
        <div className="fixed top-6 right-6 z-50 bg-black/60 text-white px-4 py-2 rounded-xl shadow-xl">
          {notify}
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 grid place-items-center text-2xl">
            👑
          </div>
          <div className="leading-tight">
            <p className="text-gray-200 text-sm">Royal Control Center</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-amber-300 drop-shadow-md">
              Admin Panel
            </h1>
          </div>
        </div>

        {/* Dev Payments Button */}
        <button
          onClick={() => router.push("/admin/payments")}
          className="hidden md:flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-3 py-2"
        >
          PAYMENTS - FINANCIAL DATA
        </button>

        <div className="flex items-center gap-3">
          {me && (
            <div className="hidden md:flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
              <img
                src={me.avatar ? `${API_BASE}/avatars/${me.avatar}` : `${API_BASE}/avatars/default.webp`}
                className="w-8 h-8 rounded-full border border-white/20"
                alt="me"
                onError={(e) => withImgFallback(e, "avatar")}
              />
              <div className="leading-tight">
                <p className="font-semibold">{me.name}</p>
                <p className="text-xs text-white/70 uppercase tracking-wider">{me.role}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-10 mt-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-4 lg:col-span-3">
          <div className="rounded-2xl p-4 bg-white/10 border border-white/15 shadow-2xl">
            <div className="text-sm text-white/80 mb-3">Navigation</div>
            <div className="flex flex-col gap-2">
              <NavBtn id="badges" label="Manage Badges" emoji="🎖️" />
              <NavBtn id="avatars" label="Manage Avatars" emoji="🖼️" />
              <NavBtn id="emojis" label="Manage Emojis" emoji="😄" />

            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="text-sm text-white/70">Quick Links</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => router.push("/admin/tests")}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/20 text-sm"
                >
                  All Tests
                </button>
                <button
                  onClick={() => router.push("/admin/purchases")}
                  className="px-4 py-2 rounded bg-yellow-400 text-black font-bold hover:bg-yellow-300"
                >
                  💳 Purchases
                </button>

                <button
  onClick={() => router.push("/admin/daily-tests")}
  className="px-4 py-2 rounded bg-white/25 border border-white/15  hover:bg-white/20 text-sm"
>
  🏆 Daily Test
</button>
              </div>
            </div>
          </div>
        </aside>

        <section className="col-span-12 md:col-span-8 lg:col-span-9">
          <div className="rounded-2xl p-6 bg-white/10 border border-white/15 shadow-2xl min-h-[480px]">
            {renderSection()}
          </div>
        </section>
      </div>
    </main>
  );
}
