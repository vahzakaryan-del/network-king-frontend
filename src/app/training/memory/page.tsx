"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ICONS = ["⭐", "🔥", "💡", "💎", "🎧", "🌱", "🚀", "🎯"] as const;

type Difficulty = "Easy" | "Normal" | "Hard";

type Card = {
  id: string;
  icon: string;
  matched: boolean;
};

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createDeck(pairCount: number): Card[] {
  const icons = shuffle(ICONS).slice(0, pairCount);
  const doubled = [...icons, ...icons];
  const shuffled = shuffle(doubled);

  return shuffled.map((icon, idx) => ({
    id: `${icon}-${idx}`, // stable unique id per deck
    icon,
    matched: false,
  }));
}

// Hydration-safe placeholder deck (stable server/client HTML)
function placeholderDeck(size: number): Card[] {
  return Array.from({ length: size }, (_, idx) => ({
    id: `placeholder-${idx}`,
    icon: "❓",
    matched: false,
  }));
}

function pairCountForDifficulty(d: Difficulty) {
  if (d === "Easy") return 6;
  if (d === "Hard") return 8; // limited by ICONS length
  return 8;
}

function gridColsForPairs(pairs: number) {
  // keeps it nice on mobile/desktop without weird stretching
  // 6 pairs -> 4 cols, 8 pairs -> 4 cols
  return 4;
}

export default function MemoryPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  const [difficulty, setDifficulty] = useState<Difficulty>("Normal");
  const pairCount = pairCountForDifficulty(difficulty);
  const deckSize = pairCount * 2;

  const [deck, setDeck] = useState<Card[]>(() => placeholderDeck(deckSize));
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  // Best score per difficulty (lower moves is better)
  const bestKey = useMemo(() => `memory-best-${difficulty}`, [difficulty]);
  const [bestMoves, setBestMoves] = useState<number | null>(null);

  // avoid stray timeouts after unmount/reset
  const timers = useRef<number[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // Build randomized deck on mount + when difficulty changes (client-only)
  useEffect(() => {
    setMounted(true);

    // load best score
    try {
      const raw = window.localStorage.getItem(bestKey);
      setBestMoves(raw ? Number(raw) : null);
    } catch {
      setBestMoves(null);
    }

    clearTimers();
    setDeck(createDeck(pairCount));
    setFlippedIds([]);
    setMoves(0);
    setLocked(false);
  }, [bestKey, clearTimers, pairCount]);

  const byId = useMemo(() => new Map(deck.map((c) => [c.id, c])), [deck]);

  const allMatched = useMemo(() => deck.length > 0 && deck.every((c) => c.matched), [deck]);

  // Update best score when game completes
  useEffect(() => {
    if (!mounted) return;
    if (!allMatched) return;

    setBestMoves((prev) => {
      const nextBest = prev == null ? moves : Math.min(prev, moves);
      try {
        window.localStorage.setItem(bestKey, String(nextBest));
      } catch {
        // ignore
      }
      return nextBest;
    });
  }, [allMatched, bestKey, mounted, moves]);

  const reset = useCallback(() => {
    clearTimers();
    setDeck(createDeck(pairCount));
    setFlippedIds([]);
    setMoves(0);
    setLocked(false);
  }, [clearTimers, pairCount]);

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (!mounted || locked) return;

      setFlippedIds((prev) => {
        if (prev.length >= 2) return prev;
        if (prev.includes(cardId)) return prev;

        const card = byId.get(cardId);
        if (!card || card.matched) return prev;

        return [...prev, cardId];
      });
    },
    [byId, locked, mounted]
  );

  // Resolve turn when exactly 2 cards are flipped
  useEffect(() => {
    if (!mounted) return;
    if (flippedIds.length !== 2) return;

    setLocked(true);
    setMoves((m) => m + 1);

    const [aId, bId] = flippedIds;
    const a = byId.get(aId);
    const b = byId.get(bId);
    const isMatch = !!a && !!b && a.icon === b.icon;

    const t = window.setTimeout(() => {
      if (isMatch) {
        setDeck((prev) =>
          prev.map((c) => (c.id === aId || c.id === bId ? { ...c, matched: true } : c))
        );
      }
      setFlippedIds([]);
      setLocked(false);
    }, isMatch ? 450 : 650);

    timers.current.push(t);
  }, [byId, flippedIds, mounted]);

  const goBackToTraining = useCallback(() => {
    router.push("/training");
  }, [router]);

  const cols = gridColsForPairs(pairCount);

  const statusText = useMemo(() => {
    if (!mounted) return "Loading…";
    if (allMatched) return "All pairs found!";
    return "Flip two cards and find the matching pairs.";
  }, [allMatched, mounted]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-amber-500 text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={goBackToTraining}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
            >
              ← Back
            </button>

            <div className="text-sm text-white/75">
              Moves: <span className="font-semibold text-amber-200">{moves}</span>
              {bestMoves != null && (
                <span className="ml-3 text-white/60">
                  Best: <span className="font-semibold text-white/85">{bestMoves}</span>
                </span>
              )}
            </div>
          </div>

          {/* Difficulty */}
          <div className="grid grid-cols-3 gap-2">
            {(["Easy", "Normal", "Hard"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={[
                  "px-3 py-2 rounded-xl text-sm border transition",
                  d === difficulty
                    ? "bg-white/15 border-white/25"
                    : "bg-white/5 border-white/15 hover:bg-white/10",
                ].join(" ")}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="mt-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">🃏 Memory Match</h1>
          <p className="text-white/75 mt-2 text-sm sm:text-base max-w-2xl">{statusText}</p>
        </div>

        {/* Card */}
        <div className="mt-6 rounded-3xl bg-white/10 border border-white/15 shadow-2xl overflow-hidden">
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-white/70">
              {difficulty === "Easy" && "6 pairs · Great for warm-up"}
              {difficulty === "Normal" && "8 pairs · Classic mode"}
              {difficulty === "Hard" && "8 pairs · Faster animations, higher focus"}
            </div>

            <div className="flex gap-2">
              <button
                onClick={reset}
                disabled={!mounted}
                className={[
                  "px-4 py-2 rounded-xl text-sm border transition",
                  mounted
                    ? "bg-white/5 border-white/15 hover:bg-white/10"
                    : "bg-white/5 border-white/10 text-white/50 cursor-not-allowed",
                ].join(" ")}
              >
                Reset
              </button>

              {allMatched && (
                <span className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-300/30 text-emerald-200 text-sm">
                  🎉 Completed
                </span>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div
              role="grid"
              aria-label="Memory cards"
              className={[
                "grid gap-3 justify-center",
                cols === 4 ? "grid-cols-4" : "grid-cols-4",
              ].join(" ")}
            >
              {deck.map((card) => {
                const isFlipped = flippedIds.includes(card.id) || card.matched;
                const isDisabled = !mounted || locked || card.matched || flippedIds.includes(card.id);

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleCardClick(card.id)}
                    disabled={isDisabled}
                    className={[
                      // responsive sizing: comfortable on mobile
                      "w-16 h-20 sm:w-20 sm:h-24 rounded-2xl",
                      "flex items-center justify-center text-3xl font-bold",
                      "border border-white/15 shadow-md",
                      "transition-transform active:scale-[0.98]",
                      isFlipped
                        ? "bg-amber-300 text-slate-950"
                        : "bg-slate-950/40 hover:bg-slate-950/55",
                      card.matched ? "ring-2 ring-emerald-300/60" : "",
                      !mounted ? "opacity-80" : "",
                    ].join(" ")}
                    aria-pressed={isFlipped}
                    aria-label={isFlipped ? `Card ${card.icon}` : "Hidden card"}
                  >
                    {isFlipped ? card.icon : "?"}
                  </button>
                );
              })}
            </div>

            {/* subtle footer */}
            <div className="mt-5 text-xs text-white/55">
              Tip: try to remember positions as pairs, not single cards.
            </div>

            {/* SR live region for accessibility */}
            <div aria-live="polite" className="sr-only">
              {allMatched ? "All pairs found." : `Moves ${moves}.`}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
