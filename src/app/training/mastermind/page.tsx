"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GuessResult = {
  guess: number[];
  correctPos: number;
  correctNum: number;
};

const MAX_TURNS = 10;
const DIGITS = [1, 2, 3, 4, 5, 6] as const;
const CODE_LEN = 4;

function generateSecret(): number[] {
  return Array.from({ length: CODE_LEN }, () => Math.floor(Math.random() * 6) + 1);
}

/**
 * Returns:
 * - correctPos: correct digit & correct position (🔴)
 * - correctNum: correct digit & wrong position (⚪)
 * Handles duplicates safely.
 */
function evaluateGuess(secret: number[], guess: number[]): { correctPos: number; correctNum: number } {
  let correctPos = 0;
  let correctNum = 0;

  const s = [...secret];
  const g = [...guess];

  // First pass: exact matches
  for (let i = 0; i < CODE_LEN; i++) {
    if (g[i] === s[i]) {
      correctPos++;
      s[i] = -1; // mark used
      g[i] = -2; // mark used
    }
  }

  // Second pass: correct digit, wrong spot
  for (let i = 0; i < CODE_LEN; i++) {
    const idx = s.indexOf(g[i]);
    if (idx !== -1) {
      correctNum++;
      s[idx] = -1;
    }
  }

  return { correctPos, correctNum };
}

export default function MastermindPage() {
  const router = useRouter();

  // Hydration-safe: start with placeholder, generate real secret on mount
  const [mounted, setMounted] = useState(false);
  const [secret, setSecret] = useState<number[]>(() => Array(CODE_LEN).fill(1));

  const [currentGuess, setCurrentGuess] = useState<number[]>([]);
  const [history, setHistory] = useState<GuessResult[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);

  const aboutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setSecret(generateSecret());
  }, []);

  const turnsLeft = useMemo(() => MAX_TURNS - history.length, [history.length]);
  const solved = useMemo(() => history.at(-1)?.correctPos === CODE_LEN, [history]);

  const reset = useCallback(() => {
    setSecret(generateSecret());
    setCurrentGuess([]);
    setHistory([]);
    setMessage("");
    setGameOver(false);
    setAboutOpen(false);
  }, []);

  const addDigit = useCallback((d: number) => {
    setMessage("");
    setCurrentGuess((prev) => {
      if (!mounted || gameOver) return prev;
      if (prev.length >= CODE_LEN) return prev;
      return [...prev, d];
    });
  }, [gameOver, mounted]);

  const removeLast = useCallback(() => {
    setMessage("");
    setCurrentGuess((prev) => prev.slice(0, -1));
  }, []);

  const clearGuess = useCallback(() => {
    setMessage("");
    setCurrentGuess([]);
  }, []);

  const submitGuess = useCallback(() => {
    if (!mounted || gameOver) return;

    if (currentGuess.length < CODE_LEN) {
      setMessage(`Enter ${CODE_LEN} digits.`);
      return;
    }

    const { correctPos, correctNum } = evaluateGuess(secret, currentGuess);

    const result: GuessResult = {
      guess: currentGuess,
      correctPos,
      correctNum,
    };

    setHistory((prev) => {
      const nextHistory = [...prev, result];

      if (correctPos === CODE_LEN) {
        setMessage("🎉 You cracked the code!");
        setGameOver(true);
      } else if (nextHistory.length >= MAX_TURNS) {
        setMessage(`💀 Out of attempts! Code was: ${secret.join("")}`);
        setGameOver(true);
      } else {
        setMessage("");
      }

      return nextHistory;
    });

    setCurrentGuess([]);
  }, [currentGuess, gameOver, mounted, secret]);

  // Keyboard controls: 1–6 add, Backspace remove, Enter submit, Esc closes about
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (aboutOpen && e.key === "Escape") {
        setAboutOpen(false);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        submitGuess();
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        removeLast();
        return;
      }

      const asNum = Number(e.key);
      if (DIGITS.includes(asNum as any)) {
        e.preventDefault();
        addDigit(asNum);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aboutOpen, addDigit, removeLast, submitGuess]);

  // Close About on outside click
  useEffect(() => {
    if (!aboutOpen) return;

    function onDown(e: MouseEvent) {
      const el = aboutRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setAboutOpen(false);
      }
    }

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [aboutOpen]);

  const statusPill = useMemo(() => {
    if (!mounted) return { text: "Loading…", cls: "bg-white/5 border-white/15 text-white/70" };
    if (gameOver && solved) return { text: "Completed", cls: "bg-emerald-500/15 border-emerald-300/30 text-emerald-200" };
    if (gameOver) return { text: "Game Over", cls: "bg-rose-500/15 border-rose-300/30 text-rose-200" };
    return { text: `${turnsLeft} turns left`, cls: "bg-white/5 border-white/15 text-white/75" };
  }, [gameOver, mounted, solved, turnsLeft]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-amber-500 text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* TOP BAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          

          
        </div>

        {/* ABOUT MODAL */}
        {aboutOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24">
            <div className="absolute inset-0 bg-black/40" />
            <div
              ref={aboutRef}
              className="relative z-10 w-full max-w-md rounded-2xl bg-slate-950/70 border border-white/15 shadow-2xl backdrop-blur-xl p-5"
              role="dialog"
              aria-modal="true"
              aria-label="About Mastermind"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold">About Mastermind</h2>
                <button
                  onClick={() => setAboutOpen(false)}
                  className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="mt-3 text-sm text-white/80 leading-relaxed">
                The computer picks a {CODE_LEN}-digit code (digits {DIGITS[0]}–{DIGITS[DIGITS.length - 1]}).
                After each guess you get feedback:
              </p>

              <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-white/80">
                <div>🔴 = correct digit in the correct position</div>
                <div>⚪ = correct digit in the wrong position</div>
              </div>

              <p className="mt-3 text-sm text-white/80">
                You have {MAX_TURNS} attempts. Keyboard: <span className="text-white/90 font-semibold">1–6</span> to enter,
                <span className="text-white/90 font-semibold"> Backspace</span> to delete, <span className="text-white/90 font-semibold">Enter</span> to submit.
              </p>
            </div>
          </div>
        )}

       {/* HEADER */}
<div className="mt-6">

  {/* Title + Buttons Row */}
  <div className="flex items-center justify-between">
    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
      🧠 Mastermind
    </h1>

    <div className="hidden sm:flex gap-2">
      <button
        onClick={() => setAboutOpen((s) => !s)}
        className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
      >
        About
      </button>

      <button
        onClick={reset}
        className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
        disabled={!mounted}
        title={!mounted ? "Loading…" : undefined}
      >
        Reset
      </button>

      <button
        onClick={() => router.push("/training")}
        className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
      >
        ← Back
      </button>
    </div>
  </div>

  {/* Subtitle */}
  <p className="text-white/75 mt-2 text-sm sm:text-base max-w-2xl">
    Crack the {CODE_LEN}-digit code using digits {DIGITS[0]}–{DIGITS[DIGITS.length - 1]}.
  </p>
</div>


        {/* GAME PANEL */}
        <div className="mt-6 rounded-3xl bg-white/10 border border-white/15 shadow-2xl overflow-hidden">
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-white/70">
              Attempts used: <span className="font-semibold text-amber-200">{history.length}</span> / {MAX_TURNS}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">

                {/* MOBILE ONLY */}
  <button
    onClick={() => setAboutOpen((s) => !s)}
    className="sm:hidden px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
  >
    About
  </button>

  <button
    onClick={reset}
    className="sm:hidden px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
    disabled={!mounted}
  >
    Reset
  </button>
              <button
                onClick={removeLast}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
                disabled={!mounted || gameOver || currentGuess.length === 0}
              >
                Delete
              </button>
              <button
                onClick={clearGuess}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
                disabled={!mounted || gameOver || currentGuess.length === 0}
              >
                Clear
              </button>
              <button
                onClick={submitGuess}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  !mounted || gameOver
                    ? "bg-white/10 border border-white/10 text-white/60 cursor-not-allowed"
                    : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                }`}
                disabled={!mounted || gameOver}
              >
                Submit
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {/* CURRENT GUESS */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {Array.from({ length: CODE_LEN }, (_, i) => (
                <div
                  key={i}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-950/40 border border-white/10 flex items-center justify-center text-2xl font-bold"
                >
                  {currentGuess[i] ?? ""}
                </div>
              ))}
            </div>

            {/* DIGIT BUTTONS */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
              {DIGITS.map((n) => (
                <button
                  key={n}
                  onClick={() => addDigit(n)}
                  className={`px-4 py-3 rounded-2xl text-lg font-bold transition active:scale-[0.99]
                    ${
                      !mounted || gameOver || currentGuess.length >= CODE_LEN
                        ? "bg-white/10 border border-white/10 text-white/60 cursor-not-allowed"
                        : "bg-amber-300 text-slate-950 hover:bg-amber-200"
                    }`}
                  disabled={!mounted || gameOver || currentGuess.length >= CODE_LEN}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* MESSAGE */}
            {message && (
              <div
                className={`mb-4 rounded-2xl px-4 py-3 border ${
                  message.includes("🎉")
                    ? "bg-emerald-400/10 border-emerald-300/20"
                    : message.includes("💀")
                    ? "bg-rose-400/10 border-rose-300/20"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <p className="text-center text-sm sm:text-base text-white/90">{message}</p>
              </div>
            )}

            {/* HISTORY */}
            <div className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 max-h-80 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-white/60">No guesses yet. Start with any 4 digits.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {history.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/30 border border-white/10 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50 w-8">#{i + 1}</span>
                        <span className="font-bold text-lg sm:text-xl tracking-wide">
                          {h.guess.join(" ")}
                        </span>
                      </div>

                      <div className="text-sm sm:text-base text-white/90 whitespace-nowrap">
                        🔴 <span className="font-semibold">{h.correctPos}</span>{" "}
                        <span className="text-white/50">|</span>{" "}
                        ⚪ <span className="font-semibold">{h.correctNum}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint (only if still playing) */}
            {!gameOver && (
              <p className="mt-4 text-xs text-white/55">
                Tip: 🔴 is counted first, then ⚪ is counted from the remaining digits.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
