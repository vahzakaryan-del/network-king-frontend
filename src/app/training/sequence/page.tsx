"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const COLORS = ["green", "red", "yellow", "blue"] as const;
type Color = (typeof COLORS)[number];

function randomColor(): Color {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default function SequenceGamePage() {
  const [sequence, setSequence] = useState<Color[]>([]);
  const [userIndex, setUserIndex] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "playing" | "input" | "checking" | "success" | "lost"
  >("idle");
  const [highlight, setHighlight] = useState<Color | null>(null);
  const [level, setLevel] = useState(0);

  const playingRef = useRef(false);

  const router = useRouter();

  /* -------------------------
     PLAY SEQUENCE
  -------------------------- */

  useEffect(() => {
    if (status !== "playing") return;

    async function play() {
      if (playingRef.current) return;
      playingRef.current = true;

      for (const color of sequence) {
        setHighlight(color);
        await sleep(450);
        setHighlight(null);
        await sleep(250);
      }

      playingRef.current = false;
      setStatus("input");
    }

    play();
  }, [status, sequence]);

  /* -------------------------
     START
  -------------------------- */

  function startGame() {
    const first = [randomColor()];
    setSequence(first);
    setLevel(1);
    setUserIndex(0);
    setStatus("playing");
  }

  /* -------------------------
     HANDLE INPUT
  -------------------------- */

  async function handleInput(color: Color) {
    if (status !== "input") return;

    setHighlight(color);
    await sleep(200);
    setHighlight(null);

    if (color !== sequence[userIndex]) {
      setStatus("checking");
      await sleep(500);
      setStatus("lost");
      return;
    }

    if (userIndex + 1 === sequence.length) {
      // finished sequence
      setStatus("checking");
      await sleep(500);
      setStatus("success");

      await sleep(800);

      const next = [...sequence, randomColor()];
      setSequence(next);
      setUserIndex(0);
      setLevel((l) => l + 1);
      setStatus("playing");
    } else {
      setUserIndex((i) => i + 1);
    }
  }

  /* -------------------------
     RESET
  -------------------------- */

  function reset() {
    setSequence([]);
    setUserIndex(0);
    setStatus("idle");
    setHighlight(null);
    setLevel(0);
  }

  /* -------------------------
     TILE STYLE
  -------------------------- */

  const tileClass = (color: Color) => {
    const base =
      "w-32 h-32 sm:w-36 sm:h-36 rounded-3xl border-2 border-white/30 transition-all duration-150 active:scale-95";

    const disabled =
      status === "playing" || status === "checking"
        ? "opacity-60 pointer-events-none"
        : "";

    const glow =
      highlight === color
        ? "scale-110 shadow-[0_0_40px_rgba(255,255,255,0.9)]"
        : "";

    const bg =
      color === "green"
        ? "bg-emerald-500"
        : color === "red"
        ? "bg-red-500"
        : color === "yellow"
        ? "bg-yellow-400"
        : "bg-blue-500";

    return `${base} ${bg} ${glow} ${disabled}`;
  };

  /* -------------------------
     FEEDBACK MESSAGE
  -------------------------- */

  function renderMessage() {
    if (status === "playing") return "Watch the sequence…";
    if (status === "input")
      return `Repeat: Step ${userIndex + 1} / ${sequence.length}`;
    if (status === "checking") return "Checking…";
    if (status === "success") return "✅ Correct!";
    if (status === "lost") return `❌ Wrong! Reached level ${level}`;
    return "Press Start";
  }
  
  

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-700 text-white flex flex-col items-center justify-center px-4 py-10">
  
  {/* Go Back Button in top-left */}
  <button
  onClick={() => router.push("/training")}
  className="
    absolute top-4 left-4
    flex items-center gap-2
    px-4 py-2
    bg-white/10 backdrop-blur-md
    text-white font-semibold
    rounded-lg shadow-md
    hover:bg-white/20 hover:scale-105
    transition-all duration-200
  "
>
  ← Go Back
</button>


  <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 text-center">
    🔔 Sequence Memory
  </h1>

  <div className="mb-4 text-lg">
    Level{" "}
    <span className="font-bold text-amber-300">
      {level}
    </span>
  </div>

  <div className="text-sm sm:text-base mb-6 text-white/80 text-center min-h-[24px]">
    {renderMessage()}
  </div>

  <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
    <button
      className={tileClass("green")}
      onClick={() => handleInput("green")}
    />
    <button
      className={tileClass("red")}
      onClick={() => handleInput("red")}
    />
    <button
      className={tileClass("yellow")}
      onClick={() => handleInput("yellow")}
    />
    <button
      className={tileClass("blue")}
      onClick={() => handleInput("blue")}
    />
  </div>

  {status === "idle" && (
    <button
      onClick={startGame}
      className="px-6 py-3 rounded-xl bg-emerald-400 text-black font-semibold hover:bg-emerald-300 transition"
    >
      Start Game
    </button>
  )}

  {status === "lost" && (
    <button
      onClick={reset}
      className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-400 transition"
    >
      Try Again
    </button>
  )}
</main>

  );
}
