"use client";

import { useEffect, useState } from "react";
import RoomsLayout from "@/components/rooms/RoomsLayout";
import PyramidIntro from "@/components/rooms/PyramidIntro";
import { startStripeCheckout } from "@/lib/startStripeCheckout";
import { useSearchParams } from "next/navigation";
import ToastContainer from "@/components/ui/ToastContainer";
import { showToast } from "@/lib/toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function MyRoomsPage() {
  const [levels, setLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);

  const searchParams = useSearchParams();
  

  const [justUnlocked, setJustUnlocked] = useState(false);

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
  void loadData();
}, []);

useEffect(() => {
  const purchase = searchParams.get("purchase");
  const kind = searchParams.get("kind");

  if (purchase === "success") {
  if (kind === "LEVEL_KEY") {
    setJustUnlocked(true);
    showToast("🔑 Key unlocked! Welcome to the next level.", "success");
  } 
}
}, [searchParams]);

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
        showToast("You already own this key.", "info");
        return true;
      }

     if (data?.purchase?.id) {
  await startStripeCheckout(data.purchase.id, token);
  return true;
}
    }

    showToast(data?.error || "Key checkout failed", "error");
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

      
      showToast(`🔒 Level locked`, "error");
      return false;
    }

    // Other errors
    showToast(data?.error || "Cannot unlock this level", "error");
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
  <>
    <ToastContainer />

    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0f]">
      {showIntro ? (
        <PyramidIntro onFinish={() => setShowIntro(false)} />
      ) : (
        <RoomsLayout
          levels={levels}
          currentLevel={currentLevel ?? 1}
          unlockLevel={unlockLevel}
          buyKey={buyKey}
          justUnlocked={justUnlocked}
        />
      )}
    </div>
  </>
);
}
