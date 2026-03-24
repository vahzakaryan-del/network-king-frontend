"use client";

import StepCurrent from "./StepCurrent";
import StepNext from "./StepNext";
import StepInfoModal from "./StepInfoModal";
import StepPlaceholder from "./StepPlaceholder";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

type NextStatus = {
  hasNext: boolean;
  currentLevel: number;
  nextLevel?: number;
  unlocked?: boolean;
  canUnlock?: boolean;
  progress?: { done: number; total: number };
  details?: any[];

  next?: {
    level: number;
    title: string;
    description?: string | null;
    about?: string | null; 
    key?: {
      enabled: boolean;
      priceCents: number | null;
      currency: string;
      canBuy: boolean;
    };
  };
};

export default function RoomsLayout({
  levels,
  currentLevel,
  unlockLevel,
  buyKey,
   justUnlocked,
   autoScroll,
}: {
  levels: any[];
  currentLevel: number;
  unlockLevel: (level: number) => Promise<boolean>;
  buyKey: (level: number) => Promise<boolean>;
  justUnlocked: boolean; 
  autoScroll?: boolean;
}) {
  const router = useRouter();
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoData, setInfoData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [nextStatus, setNextStatus] = useState<NextStatus | null>(null);

  const current = levels.find((l) => l.level === currentLevel);
  const next = levels.find((l) => l.level === currentLevel + 1);
  const nextNext = levels.find((l) => l.level === currentLevel + 2);

 useEffect(() => {
  if (!autoScroll) return;
  if (!scrollRef.current || !current) return;

  const container = scrollRef.current;

  const timer = setTimeout(() => {
    requestAnimationFrame(() => {
      const currentElement = document.getElementById("current-level") as HTMLElement | null;
      if (!currentElement) return;

      const offset =
        currentElement.offsetTop -
        container.clientHeight / 2 +
        currentElement.clientHeight / 2;

      container.scrollTo({
        top: offset,
        behavior: "smooth",
      });
    });
  }, 500); // slightly longer for mobile stability

  return () => clearTimeout(timer);
}, [autoScroll, current]);

  useEffect(() => {
    let cancelled = false;

    const fetchNextStatus = async (): Promise<NextStatus | null> => {
      const token = localStorage.getItem("token");
      if (!token) return null;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/levels/next-status`, {
  headers: { Authorization: `Bearer ${token}` },
});

      if (!res.ok) {
        throw new Error(`next-status failed: ${res.status}`);
      }

      return (await res.json()) as NextStatus;
    };

    async function loadNextStatus() {
      try {
        const data = await fetchNextStatus();

        if (!cancelled) {
          setNextStatus(data);
          if (data) console.log("nextStatus:", data);
        }
      } catch (e) {
        console.error("next-status failed:", e);
        if (!cancelled) setNextStatus(null);
      }
    }

    loadNextStatus();
    return () => {
      cancelled = true;
    };
  }, [currentLevel]);

  const handleUnlock = async (level: number) => {
    const ok = await unlockLevel(level);
    if (!ok) return false;

    const fetchNextStatus = async (): Promise<NextStatus | null> => {
      const token = localStorage.getItem("token");
      if (!token) return null;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/levels/next-status`, {
  headers: { Authorization: `Bearer ${token}` },
});

      if (!res.ok) {
        throw new Error(`next-status failed: ${res.status}`);
      }

      return (await res.json()) as NextStatus;
    };

    try {
      const data = await fetchNextStatus();
      setNextStatus(data);
    } catch {}

    return true;
  };

  return (
    <main
  ref={scrollRef}
  className="relative w-full h-screen overflow-auto bg-[#0d0b14] text-white"
>
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#1a1628] pointer-events-none" />
      <div
        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen
        bg-[radial-gradient(circle_at_center,_rgba(255,215,100,0.08),_transparent_70%)]"
      />

      {/* INFO BUTTON */}
      <div className="fixed top-4 left-4 z-50 max-sm:top-3 max-sm:left-3">
        <button
          onClick={() => {
            setInfoData({
              level: current?.level,
              title: "What are Rooms?",
              description:
                "Rooms are unlocked according to your level progress. Every door challenges you with its own requirements. Beyond each door awaits a higher society and a better Networking for you. Are you ready to climb the ladder?",
            });
            setInfoOpen(true);
          }}
          className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 backdrop-blur-md"
        >
          ℹ️ Info
        </button>
      </div>

      {/* BACK BUTTON */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-1 rounded-lg bg-amber-400 text-black font-bold border border-amber-300 hover:bg-amber-300 shadow-md"
        >
          ⬅ Back to Dashboard
        </button>
      </div>

      {/* SCROLLABLE LEVELS */}
     <div
  className="relative z-10 w-full flex flex-col items-center gap-24 max-sm:gap-12 pt-0 max-sm:pt-16 pb-32 max-sm:pb-24"
      >
        {nextNext && <StepPlaceholder level={nextNext.level} />}

        {next && (
          <StepNext
            level={next.level}
            title={next.title}
            description={next.description}
            about={next.about}
            unlocked={false}
            canUnlock={!!nextStatus?.canUnlock}
            progress={nextStatus?.progress ?? null}
            details={nextStatus?.details ?? null}
            onUnlock={handleUnlock}
            keyInfo={nextStatus?.next?.key ?? null}
            onBuyKey={buyKey}
            onClickInfo={() => {
              setInfoData(next);
              setInfoOpen(true);
            }}
          justUnlocked={justUnlocked}
          />
        )}

        {current && (
          <div id="current-level" className="w-full">
            <StepCurrent level={current.level} title={current.title} />
          </div>
        )}
      </div>

      {/* MODAL */}
      {infoOpen && infoData && (
        <StepInfoModal
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          level={infoData.level}
          title={infoData.title}
          description={infoData.description}
          about={infoData.about}
          requirement={infoData.requirement}
        />
      )}
    </main>
  );
}
