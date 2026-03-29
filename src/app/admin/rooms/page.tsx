"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";



export default function AdminRoomsPage() {
  const [level, setLevel] = useState(1);
  const [description, setDescription] = useState("");
  const [about, setAbout] = useState("");
  const [loading, setLoading] = useState(false);
   const router = useRouter();
   const API = process.env.NEXT_PUBLIC_API_URL!;

  // 🔐 admin state
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  /* =========================
     🔐 CHECK ADMIN
  ========================= */
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsAdmin(false);
      return;
    }

    fetch(`${API}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then((data) => {
        console.log("PROFILE:", data);

        // ✅ FIX: support both formats
        const role = data?.role || data?.user?.role;

        setIsAdmin(role?.toLowerCase() === "admin");
      })
      .catch((err) => {
        console.error("Profile fetch failed:", err);
        setIsAdmin(false);
      });
  }, []);

  /* =========================
     📥 LOAD LEVEL DATA
  ========================= */
  useEffect(() => {
    if (isAdmin !== true) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API}/levels`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const room = data.levels.find((l: any) => l.level === level);
        if (room) {
          setDescription(room.description || "");
          setAbout(room.about || "");
        } else {
          setDescription("");
          setAbout("");
        }
      })
      .catch((err) => {
        console.error("Failed to load levels:", err);
      });
  }, [level, isAdmin]);

  /* =========================
     💾 SAVE
  ========================= */
  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);

    try {
      const res = await fetch(`${API}/admin/rooms/${level}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ description, about }),
      });

      if (!res.ok) {
        throw new Error("Failed");
      }

      alert("Saved ✅");
    } catch (err) {
      console.error(err);
      alert("❌ Save failed");
    }

    setLoading(false);
  };

  /* =========================
     ⛔ BLOCK NON-ADMIN
  ========================= */
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-lg">
        ❌ Access denied
      </div>
    );
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-lg">
        Loading...
      </div>
    );
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="min-h-screen bg-[#0d0b14] text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Admin — Rooms Editor</h1>

      {/* Level selector */}
      <div className="mb-4">
        <label className="block mb-1">Level</label>
        <input
          type="number"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="px-3 py-2 rounded bg-black/40 border border-white/20"
        />
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block mb-2 font-semibold">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full p-3 rounded bg-black/40 border border-white/20"
        />
        <p className="text-xs text-white/60 mt-1">
          Use "-" for bullets, 💡 for highlight
        </p>
      </div>

      {/* About */}
      <div className="mb-6">
        <label className="block mb-2 font-semibold">About</label>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={6}
          className="w-full p-3 rounded bg-black/40 border border-white/20"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="px-6 py-3 rounded bg-amber-400 text-black font-bold"
      >
        {loading ? "Saving..." : "Save"}
      </button>

      <button
          onClick={() => router.push("/admin")}
          className="mt-6 ml-4 bg-green-400/80  px-4 py-2 rounded border border-white/20"
        >
          ← Back to Admin
        </button>
    </div>
  );
}