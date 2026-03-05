"use client";

import React, { useEffect, useMemo, useState } from "react";

type Difficulty = "Easy" | "Medium" | "Hard";

type Pattern = {
  id: string;
  sequence: number[];
  next: number;
  hint: string;
  difficulty: Difficulty;
  category: string;
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickOne<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function formatSeq(seq: number[]) {
  return seq.join(" , ");
}

/** -------- Pattern generators -------- */
function genArithmetic(): Pattern {
  const start = randInt(-10, 20);
  const step = randInt(1, 9) * pickOne([1, 1, 1, -1]);
  const len = pickOne([4, 5]);
  const sequence = Array.from({ length: len }, (_, i) => start + i * step);
  const next = start + len * step;

  return {
    id: `arith-${start}-${step}-${len}`,
    sequence,
    next,
    hint: `Add ${step} each step`,
    difficulty: Math.abs(step) <= 3 ? "Easy" : "Medium",
    category: "Arithmetic",
  };
}

function genMultiples(): Pattern {
  const k = randInt(2, 12);
  const startN = randInt(1, 4);
  const len = pickOne([4, 5]);
  const sequence = Array.from({ length: len }, (_, i) => (startN + i) * k);
  const next = (startN + len) * k;

  return {
    id: `mult-${k}-${startN}-${len}`,
    sequence,
    next,
    hint: `Multiples of ${k}`,
    difficulty: k <= 6 ? "Easy" : "Medium",
    category: "Multiples",
  };
}

function genGeometric(): Pattern {
  const start = randInt(1, 6);
  const ratio = pickOne([2, 2, 3, 4]);
  const len = pickOne([4, 5]);
  const sequence = Array.from({ length: len }, (_, i) => start * ratio ** i);
  const next = start * ratio ** len;

  return {
    id: `geo-${start}-${ratio}-${len}`,
    sequence,
    next,
    hint: `×${ratio} each time`,
    difficulty: ratio === 2 ? "Easy" : ratio === 3 ? "Medium" : "Hard",
    category: "Geometric",
  };
}

function genFibonacciLike(): Pattern {
  const a = randInt(0, 4);
  const b = randInt(1, 6);
  const len = 5;
  const sequence = [a, b];
  for (let i = 2; i < len; i++) sequence.push(sequence[i - 1] + sequence[i - 2]);
  const next = sequence[len - 1] + sequence[len - 2];

  return {
    id: `fib-${a}-${b}`,
    sequence,
    next,
    hint: "Each equals sum of previous two",
    difficulty: "Medium",
    category: "Fibonacci",
  };
}

function genAlternating(): Pattern {
  const start = randInt(0, 20);
  const a = randInt(2, 8);
  const b = randInt(1, 7);
  const len = 5;
  const sequence = [start];
  for (let i = 1; i < len; i++) {
    const prev = sequence[i - 1];
    sequence.push(prev + (i % 2 === 1 ? a : -b));
  }
  const next = sequence[len - 1] + (len % 2 === 1 ? a : -b);

  return {
    id: `alt-${start}-${a}-${b}`,
    sequence,
    next,
    hint: `Alternating: +${a}, -${b}, +${a}, -${b}...`,
    difficulty: "Medium",
    category: "Alternating",
  };
}

function genSquares(): Pattern {
  const c = randInt(-5, 10);
  const startN = randInt(1, 4);
  const len = 5;
  const sequence = Array.from({ length: len }, (_, i) => {
    const n = startN + i;
    return n * n + c;
  });
  const nNext = startN + len;
  const next = nNext * nNext + c;

  return {
    id: `sq-${c}-${startN}`,
    sequence,
    next,
    hint: c === 0 ? "Perfect squares" : `Squares with an offset (${c >= 0 ? "+" : ""}${c})`,
    difficulty: "Medium",
    category: "Squares",
  };
}

function genTriangular(): Pattern {
  const startN = randInt(1, 3);
  const len = 5;
  const triangular = (n: number) => (n * (n + 1)) / 2;
  const sequence = Array.from({ length: len }, (_, i) => triangular(startN + i));
  const next = triangular(startN + len);

  return {
    id: `tri-${startN}`,
    sequence,
    next,
    hint: "Triangular numbers (adds 2,3,4,5...)",
    difficulty: "Medium",
    category: "Figurate",
  };
}

function genPrimeNext(): Pattern {
  const primes: number[] = [];
  let n = 2;
  while (primes.length < 20) {
    let isPrime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) isPrime = false;
    if (isPrime) primes.push(n);
    n++;
  }
  const startIdx = randInt(0, 10);
  const len = 5;
  const sequence = primes.slice(startIdx, startIdx + len);
  const next = primes[startIdx + len];

  return {
    id: `prime-${startIdx}`,
    sequence,
    next,
    hint: "Prime numbers",
    difficulty: "Hard",
    category: "Primes",
  };
}

function genDigitsSum(): Pattern {
  const start = randInt(10, 49);
  const len = 5;
  const sdig = (x: number) =>
    Math.abs(x)
      .toString()
      .split("")
      .reduce((a, c) => a + Number(c), 0);

  const sequence = [start];
  for (let i = 1; i < len; i++) sequence.push(sequence[i - 1] + sdig(sequence[i - 1]));
  const next = sequence[len - 1] + sdig(sequence[len - 1]);

  return {
    id: `sdig-${start}`,
    sequence,
    next,
    hint: "Add the sum of digits each step",
    difficulty: "Hard",
    category: "Digit rule",
  };
}

function genDoubleMinusOne(): Pattern {
  const start = randInt(1, 8);
  const len = 5;
  const sequence = [start];
  for (let i = 1; i < len; i++) sequence.push(sequence[i - 1] * 2 - 1);
  const next = sequence[len - 1] * 2 - 1;

  return {
    id: `dblm1-${start}`,
    sequence,
    next,
    hint: "Multiply by 2, then subtract 1",
    difficulty: "Medium",
    category: "Mixed ops",
  };
}

function genPattern(): Pattern {
  // Weighted selection: easier ones appear more often
  const weighted = [
    genArithmetic,
    genArithmetic,
    genMultiples,
    genMultiples,
    genGeometric,
    genFibonacciLike,
    genAlternating,
    genSquares,
    genTriangular,
    genDoubleMinusOne,
    pickOne([genPrimeNext, genDigitsSum]),
  ];
  return pickOne(weighted)();
}

/**
 * IMPORTANT: Stable placeholder used for the *server render* to avoid hydration mismatch.
 * We'll replace it with a random pattern only after the component mounts on the client.
 */
const PLACEHOLDER_PATTERN: Pattern = {
  id: "placeholder",
  sequence: [2, 4, 6, 8],
  next: 10,
  hint: "Loading…",
  difficulty: "Easy",
  category: "Loading",
};

export default function PatternsPage() {
  const [mounted, setMounted] = useState(false);

  // Start with placeholder to match server/client HTML.
  const [current, setCurrent] = useState<Pattern>(PLACEHOLDER_PATTERN);

  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  // game layer
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [solved, setSolved] = useState(false);

  // On mount: generate first real random pattern (client-only)
  useEffect(() => {
    setMounted(true);
    setCurrent(genPattern());
  }, []);

  const difficultyBadge = useMemo(() => {
    const d = current.difficulty;
    return d === "Easy"
      ? "bg-emerald-400/20 text-emerald-200 border-emerald-400/30"
      : d === "Medium"
      ? "bg-amber-400/20 text-amber-200 border-amber-400/30"
      : "bg-rose-400/20 text-rose-200 border-rose-400/30";
  }, [current.difficulty]);

  const difficultyPoints = useMemo(() => {
    return current.difficulty === "Easy" ? 10 : current.difficulty === "Medium" ? 20 : 35;
  }, [current.difficulty]);

  function resetRound(next: Pattern) {
    setCurrent(next);
    setInput("");
    setFeedback(null);
    setShowHint(false);
    setSolved(false);
  }

  function nextPattern() {
    resetRound(genPattern());
  }

  function restart() {
    setScore(0);
    setStreak(0);
    setLives(3);
    resetRound(genPattern());
  }

  function checkAnswer() {
    if (!mounted) return; // just in case
    if (solved || lives <= 0) return;
    if (!input.trim()) return;

    const guess = Number(input);
    if (Number.isNaN(guess)) {
      setFeedback("Please enter a valid number.");
      return;
    }

    if (guess === current.next) {
      const bonus = showHint ? 0 : 5;
      const streakBonus = Math.min(streak, 10) * 2;
      const points = difficultyPoints + bonus + streakBonus;

      setScore((s) => s + points);
      setStreak((s) => s + 1);
      setFeedback(`✅ Correct! +${points} points`);
      setSolved(true);

      window.setTimeout(() => {
        if (lives > 0) nextPattern();
      }, 900);
    } else {
      setLives((l) => clamp(l - 1, 0, 999));
      setStreak(0);
      setFeedback("❌ Not quite. Try again (or reveal the hint).");
    }
  }

  // Game over handling
  useEffect(() => {
    if (lives > 0) return;
    setFeedback("💀 Game over. Tap “Restart” to play again.");
    setSolved(true);
  }, [lives]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-amber-500 text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              🧮 Pattern Arena
            </h1>
            <p className="text-white/75 mt-1 text-sm sm:text-base max-w-xl">
              Spot the rule behind each sequence and enter the next number. Build a streak.
              Don’t run out of lives.
            </p>
          </div>

          <button
            onClick={restart}
            className="px-4 py-2 rounded-xl bg-white/5 border border-green-500 hover:bg-white/10 transition text-sm w-full sm:w-auto"
          >
            Restart
          </button>

          <a
  href="http://localhost:3000/training"
  className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 border border-amber-200 hover:bg-white/10 transition text-sm"
>
   Back
</a>


          
        </div>

        {/* Stats bar */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
            <p className="text-xs text-white/60">Score</p>
            <p className="text-xl font-bold">{score}</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
            <p className="text-xs text-white/60">Streak</p>
            <p className="text-xl font-bold">{streak}🔥</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
            <p className="text-xs text-white/60">Lives</p>
            <p className="text-xl font-bold">{"❤️".repeat(lives) || "—"}</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
            <p className="text-xs text-white/60">Category</p>
            <p className="text-xl font-bold">{current.category}</p>
          </div>
        </div>

        {/* Card */}
        <div className="mt-6 rounded-3xl bg-white/10 border border-white/15 shadow-2xl overflow-hidden">
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full border text-xs ${difficultyBadge}`}>
                {current.difficulty}
              </span>
              <span className="px-2.5 py-1 rounded-full border text-xs bg-white/5 border-white/15 text-white/80">
                {showHint ? "Hint used" : "No hint bonus"}
              </span>
            </div>

            <button
              onClick={nextPattern}
              className="px-4 py-2 rounded-xl bg-white/5 border border-purple-500 hover:bg-white/10 transition text-sm w-full sm:w-auto"
              disabled={!mounted}
              title={!mounted ? "Loading..." : undefined}
            >
              New sequence
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {/* Sequence */}
            <div className="text-center">
              <p className="text-xs text-white/60 uppercase tracking-widest">Sequence</p>
              <div className="mt-2 inline-flex items-center justify-center rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-3">
                <p className="text-lg sm:text-2xl font-semibold">
                  {formatSeq(current.sequence)} <span className="text-amber-300">, ?</span>
                </p>
              </div>
              <p className="mt-3 text-sm text-white/70">
                Enter the next number to keep your streak alive.
              </p>
            </div>

            {/* Controls */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                type="number"
                inputMode="numeric"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") checkAnswer();
                }}
                placeholder={mounted ? "Your guess…" : "Loading…"}
                className="w-full sm:flex-1 px-4 py-3 rounded-2xl bg-slate-950/50 border border-white/15 text-base outline-none focus:ring-2 focus:ring-amber-400"
                disabled={!mounted || lives <= 0}
              />
              <button
                onClick={checkAnswer}
                className={`w-full sm:w-auto px-5 py-3 rounded-2xl text-sm font-semibold transition active:scale-[0.99]
                  ${
                    !mounted || solved || lives <= 0
                      ? "bg-white/10 border border-white/10 text-white/60 cursor-not-allowed"
                      : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  }`}
                disabled={!mounted || solved || lives <= 0}
              >
                Check
              </button>
            </div>

            {/* Hint / feedback */}
            <div className="mt-4 flex items-center justify-between text-sm text-white/70">
              <button
                onClick={() => setShowHint((s) => !s)}
                className="underline hover:text-white"
                disabled={!mounted}
              >
                {showHint ? "Hide hint" : "Show hint"}
              </button>

             
            </div>

            {showHint && (
              <div className="mt-3 rounded-2xl bg-amber-300/10 border border-amber-300/20 px-4 py-3">
                <p className="text-sm text-amber-100">💡 Hint: {current.hint}</p>
              </div>
            )}

            {feedback && (
              <div
                className={`mt-4 rounded-2xl px-4 py-3 border ${
                  feedback.includes("✅")
                    ? "bg-emerald-400/10 border-emerald-300/20"
                    : feedback.includes("💀")
                    ? "bg-rose-400/10 border-rose-300/20"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <p className="text-sm text-center text-white/90">{feedback}</p>
              </div>
            )}

            {/* Footer tips */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-white/65">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <p className="font-semibold text-white/80 mb-1">Scoring</p>
                <p>Easy 10 · Medium 20 · Hard 35 (+ streak bonus).</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <p className="font-semibold text-white/80 mb-1">Bonus</p>
                <p>No hint gives +5 points.</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <p className="font-semibold text-white/80 mb-1">Tip</p>
                <p>Hard patterns are worth more — keep calm and compute.</p>
              </div>
            </div>
          </div>
        </div>

       
      </div>
    </main>
  );
}
