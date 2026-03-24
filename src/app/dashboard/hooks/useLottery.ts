"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export function useLottery(userId?: number) {

  const prizes = useMemo(
    () => [
      { label: "Cherry", icon: "🍒" },
      { label: "Lemon", icon: "🍋" },
      { label: "Grapes", icon: "🍇" },
      { label: "Apple", icon: "🍎" },
      { label: "Peach", icon: "🍑" },
      { label: "Melon", icon: "🍈" },
      { label: "Kiwi", icon: "🥝" },
      { label: "Banana", icon: "🍌" },
    ],
    []
  );

  // STATES
  const [lotteryOpen, setLotteryOpen] = useState(false);
  const [lotteryCooldownMs, setLotteryCooldownMs] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [lotteryResult, setLotteryResult] = useState<{ label: string; icon: string } | null>(null);
  const [lotteryInventory, setLotteryInventory] = useState<Record<string, number>>({});
  const [lotteryAvailable, setLotteryAvailable] = useState(false);
  const loadLotteryStatus = useCallback(async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await apiFetch(`/lottery/status`);
    const data = await res.json();

    setLotteryInventory(data.inventory || {});
    setLotteryCooldownMs(data.remainingMs || 0);
    setLotteryAvailable(!!data.available);
  } catch (e) {
    console.error("lottery status error", e);
  }
}, [apiFetch]);

    async function spinLottery() {
    if (!lotteryAvailable || spinning) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setSpinning(true);
    setLotteryResult(null);

    try {
      const res = await apiFetch(`/lottery/spin`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "COOLDOWN") {
          setLotteryCooldownMs(data.remainingMs || 0);
          setLotteryInventory(data.inventory || {});
          setLotteryAvailable(false);
        }
        setSpinning(false);
        return;
      }

      const index = Math.max(
        0,
        prizes.findIndex((p) => p.label === data.prize.label)
      );

      const slices = prizes.length;
      const sliceDeg = 360 / slices;
      const targetCenterDeg = index * sliceDeg + sliceDeg / 2;
      const extraSpins = 6 * 360;
      const delta = 360 - targetCenterDeg - 90;

      setWheelRotation((prev) => {
  const base = prev % 360; // normalize (prevents drift)
  return base + extraSpins + delta;
});

      setTimeout(() => {
        setLotteryResult(data.prize);
        setLotteryInventory(data.inventory || {});
        setLotteryCooldownMs(data.remainingMs || 0);
        setLotteryAvailable(!!data.available);
        setSpinning(false);
      }, 2400);
    } catch (e) {
      console.error("spin error", e);
      setSpinning(false);
    }
  }

    function openLottery() {
    setLotteryOpen(true);
    setSpinning(false);
    setLotteryResult(null);
    loadLotteryStatus();
  }

  function closeLottery() {
    setLotteryOpen(false);
    setSpinning(false);
  }

    useEffect(() => {
    const t = setInterval(() => {
      setLotteryCooldownMs((ms) => Math.max(0, ms - 1000));
    }, 1000);

    return () => clearInterval(t);
  }, []);

    useEffect(() => {
  if (!userId) return;
  loadLotteryStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [userId]);

    return {
    prizes,
    lotteryOpen,
    setLotteryOpen,
    lotteryCooldownMs,
    lotteryAvailable,
    lotteryInventory,
    spinning,
    wheelRotation,
    lotteryResult,
    spinLottery,
    openLottery,
    closeLottery,
    loadLotteryStatus,
  };
}