"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

const modules = [
  { title: "➗ Math Quizzler", desc: "Practice with a live board", href: "/training/math" },
  { title: "🧩 Sudoku", desc: "Logic puzzle training", href: "/training/sudoku" },
  
  { title: "🔢 Mastermind", desc: "Crack the code!", href: "/training/mastermind" },
  { title: "🃏 Memory Match", desc: "Improve visual memory", href: "/training/memory" },
  { title: "⌨️ Typing Speed", desc: "Measure your WPM", href: "/training/typing" },
  { title: "🔷 Analyse Patterns", desc: "Focus and logic practice", href: "/training/pattern" },
  { title: "🎵 Sequence Game", desc: "Short-term memory", href: "/training/sequence" },
  { title: "🧠 Maze Solver", desc: "Get the way out", href: "/training/maze" },
  { title: "💬 Icebreakers", desc: "Conversation warm-ups", href: "/training/icebreakers" },
];

export default function TrainingCenter() {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const lastTapRef = useRef(0);

  return (
<main className="relative h-[100dvh] overflow-x-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white px-4 sm:px-6 py-4 sm:py-10">

      {/* Heading */}
      <div className="mb-10 grid grid-cols-[1fr_auto_1fr] items-center">
  {/* Left spacer (keeps symmetry) */}
  <div />

  {/* Center title */}
  <h1 className="text-2xl font-extrabold text-center">
    🧠 Networ.King Training Center
  </h1>

  {/* Right button */}
  <div className="flex justify-end">
    <button
      onClick={() => router.push("/dashboard")}
      className="px-4 py-2 bg-amber-400 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-amber-300 transition"
    >
      ← Back to Dashboard
    </button>
  </div>
</div>


      {/* Desktop Grid */}
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {modules.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-xl hover:shadow-amber-300/30 hover:scale-[1.03] transition cursor-pointer"
          >
            <h2 className="text-2xl font-bold mb-2">{m.title}</h2>
            <p className="text-white/70 mb-4">{m.desc}</p>
            <Link
              href={m.href}
              className="inline-block px-4 py-2 bg-amber-400 text-gray-900 font-bold rounded-lg hover:bg-amber-300 transition"
            >
              Start →
            </Link>
          </motion.div>
        ))}
      </div>

   
{/* MOBILE: left rail only */}
<div className="sm:hidden mx-auto w-full max-w-md">
  <div className="min-h-[100svh] overflow-x-hidden px-1">
    <div className="relative w-[95%] max-w-[360px] overflow-visible">
      <div className="flex flex-col gap-3 py-2 max-h-[calc(100svh-140px)] overflow-y-auto overflow-x-visible pr-1">
        {modules.map((m, i) => {
          const isActive = selectedIndex === i;
          const icon = m.title.split(" ")[0];
          const label = m.title.replace(icon, "").trim();

          const onTap = () => {
            const now = Date.now();
            const isDoubleTap = now - lastTapRef.current < 280;
            lastTapRef.current = now;

            if (isDoubleTap) {
              setSelectedIndex(null);
              return;
            }
            setSelectedIndex(i);
          };

          return (
            <motion.div
  key={m.href}
  layout
  transition={{ type: "spring", stiffness: 260, damping: 26 }}
  className={[
    "relative rounded-3xl border backdrop-blur-xl overflow-hidden",
    "flex items-center",
    isActive
      ? "bg-white/20 border-white/30 shadow-2xl"
      : "bg-white/10 border-white/15",
  ].join(" ")}
  animate={{ width: isActive ? "100%" : "82%", scale: isActive ? 1.02 : 1 }}

>
  <motion.button
    layout="position"
    type="button"
    onClick={onTap}
    whileTap={{ scale: 0.98 }}
    className="flex flex-wrap items-center gap-2 px-3 py-4 w-full"

  >
    {/* icon */}
    <span className="text-2xl leading-none">{icon}</span>

    {/* title */}
    <div className="font-extrabold text-xs whitespace-nowrap">
      {label}
    </div>

    {/* spacer pushes right content */}
    <div className="flex-1" />

    {/* start button — always same row */}
    <motion.div layout="position">
      <Link
        href={m.href}
        className={[
          "px-3 py-1 mt-5 rounded-full font-extrabold text-xs",
         "bg-amber-400 text-gray-900 transition-all duration-200",
          isActive ? "opacity-100" : "opacity-0 pointer-events-none py-1",
        ].join(" ")}
      >
        Start →
      </Link>
    </motion.div>

    {/* description below row (does NOT affect width) */}
<AnimatePresence initial={false}>
  {isActive && (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18 }}
      className="w-full mt-2 text-[11px] text-white/70"
    >
      {m.desc}
    </motion.div>
  )}
</AnimatePresence>

  </motion.button>
</motion.div>

          );
        })}
      </div>
    </div>

    <div className="h-6" />
    <button
      onClick={() => router.push("/tests")}
      className="px-4 py-2 bg-emerald-400 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-amber-300 transition"
    >
      ← Go to try your new skills!
    </button>
  </div>
   <p className="text-center text-xs text-gray-300 mt-4">
              © {new Date().getFullYear()} Networ.King
            </p>
</div>

    </main>
  );
}
