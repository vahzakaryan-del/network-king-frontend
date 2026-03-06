"use client";

import { useEffect, useState } from "react";
import RoomsLayout from "@/components/rooms/RoomsLayout";
import PyramidIntro from "@/components/rooms/PyramidIntro";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function MyRoomsPage() {
  const [levels, setLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  async function loadData() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const [levelsRes, mineRes] = await Promise.all([
        fetch(`${API}/levels`),
        fetch(`${API}/levels/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const levelsData = await levelsRes.json();
      const mineData = await mineRes.json();

      setLevels(levelsData.levels || []);
      setCurrentLevel(mineData.level || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ✅ NEW: create pending purchase for a level key
  async function buyKey(level: number) {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const res = await fetch(`${API}/payments/checkout/level-key`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ level }),
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (res.ok) {
      if (data?.alreadyOwned) {
        alert("✅ You already own this key.");
        return true;
      }

      // Purchase created, but still pending until you mark paid in /dev/payments
      alert(
        "🧾 Key purchase created (pending).\n\nDev: go to /dev/payments and mark it PAID.\nThen come back and unlock the level."
      );
      return true;
    }

    alert(data?.error || "Key checkout failed");
    return false;
  }

  // ✅ Unlock logic (handles 403 requirements-not-met cleanly)
  async function unlockLevel(level: number) {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const res = await fetch(`${API}/levels/unlock/${level}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    // Success
    if (res.ok && data?.success) {
      setCurrentLevel(level);
      return true;
    }

    // Requirements not met (403 + reasons/progress)
    if (res.status === 403) {
      const reasons: string[] = Array.isArray(data?.reasons) ? data.reasons : [];
      const progress = data?.progress;

      const progressText =
        progress && typeof progress.done === "number" && typeof progress.total === "number"
          ? `\nProgress: ${progress.done}/${progress.total}`
          : "";

      const reasonText = reasons.length ? `\n\nMissing:\n- ${reasons.join("\n- ")}` : "";
      alert(`🔒 Level locked.${progressText}${reasonText}`);
      return false;
    }

    // Other errors
    alert(data?.error || "Cannot unlock this level");
    return false;
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-white text-xl">
        Loading…
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0f]">
      {showIntro ? (
        <PyramidIntro onFinish={() => setShowIntro(false)} />
      ) : (
        <RoomsLayout
          levels={levels}
          currentLevel={currentLevel!}
          unlockLevel={unlockLevel}
          buyKey={buyKey}
        />
      )}
    </div>
  );
}
