"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Problem = { q: string; a: number };

const TOTAL = 100;
const ROUND_SECONDS = 15;
const BEST_KEY = "mental-math-duel-best-score";

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateProblems(): Problem[] {
  const problems: Problem[] = [];
  const push = (q: string, a: number) => problems.push({ q, a });

  const cleanSquares = [144, 169, 196, 225, 256, 289, 324, 361, 400];

  for (let i = 0; i < TOTAL; i++) {
    const type = Math.floor(Math.random() * 6);

    switch (type) {
      case 0: {
        const a = Math.floor(12 + Math.random() * 88);
        const b = Math.floor(5 + Math.random() * 25);
        push(`${a} × ${b}`, a * b);
        break;
      }
      case 1: {
        const b = Math.floor(3 + Math.random() * 12);
        const a = b * Math.floor(5 + Math.random() * 20);
        push(`${a} ÷ ${b}`, a / b);
        break;
      }
      case 2: {
        const a = Math.floor(400 + Math.random() * 500);
        const b = Math.floor(200 + Math.random() * 400);
        push(`${a} + ${b}`, a + b);
        break;
      }
      case 3: {
        const a = Math.floor(500 + Math.random() * 500);
        const b = Math.floor(100 + Math.random() * 400);
        push(`${a} - ${b}`, a - b);
        break;
      }
      case 4: {
        const n = cleanSquares[Math.floor(Math.random() * cleanSquares.length)];
        push(`√${n}`, Math.sqrt(n));
        break;
      }
      case 5: {
        const a = Math.floor(10 + Math.random() * 30);
        const b = Math.floor(3 + Math.random() * 10);
        const c = Math.floor(5 + Math.random() * 15);
        push(`${a} × ${b} - ${c}`, a * b - c);
        break;
      }
    }
  }

  return shuffle(problems);
}

function clampNumericString(s: string) {
  // digits only (no minus/decimals)
  return s.replace(/[^\d]/g, "");
}

// Hydration-safe placeholder
const PLACEHOLDER_PROBLEMS: Problem[] = Array.from({ length: TOTAL }, () => ({ q: "…", a: 0 }));

function readBestScore(): number {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeBestScore(score: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // ignore
  }
}

export default function MathDuelPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  const [problems, setProblems] = useState<Problem[]>(PLACEHOLDER_PROBLEMS);
  const [index, setIndex] = useState(0);

  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const [bestScore, setBestScore] = useState(0);

  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [message, setMessage] = useState("");

  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutRef = useRef<HTMLDivElement | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const gameOver = index >= problems.length;
  const current = gameOver ? null : problems[index];

  // Generate real problems + load best score on mount (prevents hydration mismatch)
  useEffect(() => {
    setMounted(true);
    setProblems(generateProblems());
    setBestScore(readBestScore());
  }, []);

  // Focus input when question changes (best-effort; mobile may require tap)
  useEffect(() => {
    if (!mounted || gameOver) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [index, mounted, gameOver]);

  const progress = useMemo(() => {
    const done = Math.min(index, TOTAL);
    return Math.round((done / TOTAL) * 100);
  }, [index]);

  const statusPill = useMemo(() => {
    if (!mounted) return { text: "Loading…", cls: "bg-white/5 border-white/15 text-white/70" };
    if (gameOver) return { text: "Finished", cls: "bg-emerald-500/15 border-emerald-300/30 text-emerald-200" };
    if (timeLeft <= 5) return { text: `${timeLeft}s`, cls: "bg-rose-500/15 border-rose-300/30 text-rose-200" };
    return { text: `${timeLeft}s`, cls: "bg-white/5 border-white/15 text-white/80" };
  }, [gameOver, mounted, timeLeft]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const nextProblem = useCallback(
    (opts?: { autoMiss?: boolean; reveal?: number }) => {
      setInput("");

      if (opts?.autoMiss && typeof opts.reveal === "number") {
        setStreak(0);
        setMessage(`⏳ Time’s up! (Correct: ${opts.reveal})`);
      }

      setTimeLeft(ROUND_SECONDS);

      setIndex((i) => {
        const next = i + 1;
        if (next >= problems.length) {
          setMessage("🏁 All problems completed!");
          return problems.length;
        }
        return next;
      });
    },
    [problems.length]
  );

  const submit = useCallback(() => {
    if (!mounted || !current || gameOver) return;

    const trimmed = input.trim();
    if (trimmed === "") {
      setMessage("Type an answer 🙂");
      focusInput();
      return;
    }

    const answer = Number(trimmed);
    const correct = current.a;

    if (Number.isFinite(answer) && answer === correct) {
      setStreak((s) => {
        const newStreak = s + 1;
        const added = 10 + newStreak;
        setScore((sc) => sc + added);
        setMessage(`✅ Correct! +${added} points`);
        return newStreak;
      });
    } else {
      setStreak(0);
      setMessage(`❌ Wrong (Correct: ${correct})`);
    }

    nextProblem();
  }, [current, focusInput, gameOver, input, mounted, nextProblem]);

  // Timer (uses ref to avoid stale current in interval)
  const currentAnswerRef = useRef<number>(0);
  useEffect(() => {
    currentAnswerRef.current = current?.a ?? 0;
  }, [current]);

  useEffect(() => {
    if (!mounted || gameOver) return;

    const timer = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          nextProblem({ autoMiss: true, reveal: currentAnswerRef.current });
          return ROUND_SECONDS;
        }
        return t - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mounted, gameOver, nextProblem]);

  // Save best score when game ends (and update live if surpassed)
  useEffect(() => {
    if (!mounted) return;

    if (score > bestScore) {
      setBestScore(score);
      writeBestScore(score);
    }
  }, [bestScore, mounted, score]);

  const resetGame = useCallback(() => {
    setProblems(generateProblems());
    setIndex(0);
    setInput("");
    setScore(0);
    setStreak(0);
    setTimeLeft(ROUND_SECONDS);
    setMessage("");
    setAboutOpen(false);
    window.setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  // About modal: close on outside click + ESC
  useEffect(() => {
    if (!aboutOpen) return;

    function onDown(e: MouseEvent) {
      const el = aboutRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setAboutOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAboutOpen(false);
    }

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [aboutOpen]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-amber-500 text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* TOP BAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => router.push("/training")}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
            >
              ← Back
            </button>

            <span className={`px-3 py-1.5 rounded-full border text-xs ${statusPill.cls}`}>
              {statusPill.text}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAboutOpen(true)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
            >
              About
            </button>
            <button
              onClick={resetGame}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition text-sm"
              disabled={!mounted}
            >
              Reset
            </button>
          </div>
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
              aria-label="About Mental Math Duel"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold">About Mental Math Duel</h2>
                <button
                  onClick={() => setAboutOpen(false)}
                  className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="mt-3 text-sm text-white/80 leading-relaxed">
                Solve {TOTAL} randomized mental math problems. Each correct answer gives points plus a streak bonus.
                Try to stay calm when the timer drops.
              </p>

              <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-white/80">
                <div>✅ Correct: +10 points + streak bonus</div>
                <div>⏳ Time limit: {ROUND_SECONDS}s per problem</div>
                <div>🏆 Best score is saved on this device</div>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="mt-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">🔢 Mental Math Duel</h1>
          <p className="text-white/75 mt-2 text-sm sm:text-base max-w-2xl">
            Solve fast. The longer your streak, the higher your score.
          </p>
        </div>

        {/* MAIN CARD */}
        <div
          className="mt-6 rounded-3xl bg-white/10 border border-white/15 shadow-2xl overflow-hidden"
          // Tap anywhere here to focus input (helps open mobile keyboard)
          onClick={focusInput}
        >
          {/* Progress bar */}
          <div className="h-2 w-full bg-white/5">
            <div
              className="h-2 bg-amber-300/70 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-white/70">
              Problem <span className="font-semibold text-white/90">{Math.min(index + 1, TOTAL)}</span> / {TOTAL}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80">
                🔥 Score <span className="font-semibold text-amber-200">{score}</span>
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80">
                ⚡ Streak <span className="font-semibold text-white/90">{streak}</span>
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80">
                🏆 Best <span className="font-semibold text-white/90">{bestScore}</span>
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {gameOver ? (
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl mb-3 font-bold">🏁 Finished!</h2>
                <p className="text-lg sm:text-xl mb-2">
                  Final Score: <span className="font-semibold text-amber-200">{score}</span>
                </p>
                <p className="text-sm text-white/70 mb-5">
                  Best Score: <span className="font-semibold text-white/90">{bestScore}</span>
                </p>

                <button
                  onClick={resetGame}
                  className="px-5 py-2.5 rounded-xl bg-amber-300 text-slate-950 font-semibold hover:bg-amber-200 transition"
                >
                  Play again
                </button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-xs text-white/60 uppercase tracking-widest">Solve</p>
                  <div className="mt-2 inline-flex items-center justify-center rounded-2xl bg-slate-950/40 border border-white/10 px-5 py-4">
                    <div className="text-3xl sm:text-5xl font-extrabold tracking-wide">
                      {current?.q}
                    </div>
                  </div>
                </div>

                {/* INPUT */}
                <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(clampNumericString(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    className="w-full sm:flex-1 px-4 py-3 rounded-2xl bg-white text-slate-950 text-center text-2xl font-extrabold outline-none border border-white/20 focus:ring-2 focus:ring-amber-400"
                    placeholder="Answer…"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    enterKeyHint="done"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />

                  <button
                    onClick={submit}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300 transition"
                  >
                    Submit
                  </button>
                </div>

                {message && (
                  <div
                    className={`mt-4 rounded-2xl px-4 py-3 border ${
                      message.includes("✅")
                        ? "bg-emerald-400/10 border-emerald-300/20"
                        : message.includes("❌") || message.includes("⏳")
                        ? "bg-rose-400/10 border-rose-300/20"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <p className="text-center text-sm sm:text-base text-white/90">{message}</p>
                  </div>
                )}

                <p className="mt-4 text-xs text-white/55 text-center">
                  Tip: tap the card area to bring up your phone keyboard instantly.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
