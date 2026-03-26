"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useEffect } from "react";



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

 const [loading, setLoading] = useState(false);

const handleSurprise = () => {
  setLoading(true);

  const randomIndex = Math.floor(Math.random() * modules.length);
  router.push(modules[randomIndex].href);
};



useEffect(() => {
  modules.forEach((m) => {
    router.prefetch(m.href);
  });
}, []);

  return (
<main className="relative h-[100dvh] overflow-x-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white px-4 sm:px-6 py-4 sm:py-10">

     {/* Heading */}
<div className="mb-8 px-4 max-w-5xl mx-auto flex items-center justify-between">
  {/* Title */}
  <Link
    href="/dashboard"
    className="text-2xl sm:text-3xl font-extrabold tracking-tight whitespace-nowrap"
  >
    🧠 Training Center
  </Link>

  {/* Button */}
  <button
    onClick={() => router.push("/dashboard")}
    className="ml-4 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-400 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-amber-300 transition text-l sm:text-base whitespace-nowrap"
  >
    ← Back
  </button>
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
    <div className="relative w-[95%] max-w-[360px] overflow-visible ">
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
  transition={{ type: "spring", stiffness: 180, damping: 22, mass: 0.8 }}
  style={{ x: 8 }}
  className={[
    "relative rounded-3xl border backdrop-blur-xl overflow-hidden",
    "flex flex-col",
    isActive
      ? "bg-white/20 border-white/30 shadow-2xl"
      : "bg-white/10 border-white/15",
  ].join(" ")}
  animate={{
    width: isActive ? "96%" : "77%",
    scale: isActive ? 1.015 : 1,
  }}
>
  <motion.button
    layout="position"
    type="button"
    onClick={onTap}
    whileTap={{ scale: 0.98 }}
    className="flex flex-col w-full px-3 py-4"
  >
    {/* top row: icon + title + button */}
    <div className="flex items-center gap-2">
      {/* icon */}
      <span className="text-2xl leading-none">{icon}</span>

      {/* title */}
      <div className="font-extrabold text-base whitespace-nowrap">{label}</div>

      <div className="flex-1" />

      {/* start button */}
      <motion.div layout="position">
        <Link
          href={m.href}
          className={[
            "px-3 py-1 rounded-full font-extrabold text-xs",
            "bg-amber-400 text-gray-900 transition-all duration-200",
            isActive ? "opacity-100" : "opacity-0 pointer-events-none py-1",
          ].join(" ")}
        >
          Start →
        </Link>
      </motion.div>
    </div>

    
    {/* reserved space for description */}
<div className="mt-1 min-h-[48px] h-auto"> {/* increase height */}
  <AnimatePresence initial={false}>
    {isActive && (
      <motion.div
  initial={{ opacity: 0, y: 2 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 2 }}
  transition={{ duration: 0.18 }}
  className="text-[11px] text-white/70 -mt-1"
>
  {m.desc}
</motion.div>
    )}
  </AnimatePresence>
</div>
  </motion.button>
</motion.div>

          );
        })}
      </div>

       <div className="mt-8 flex justify-center">
  <button
    onClick={handleSurprise}
    className="
      group relative overflow-hidden
      px-5 py-2.5
      text-sm font-bold
      text-gray-900
      bg-amber-400
      rounded-full
      shadow-md shadow-amber-300/40
      hover:bg-amber-300
      active:scale-95
      transition-all duration-200
    "
  >
    {/* shine layer */}
    <span className="absolute inset-0 overflow-hidden rounded-full">
      <span className="absolute -left-full top-0 h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:left-full transition-all duration-700" />
    </span>

    <span className="relative z-10">
  {loading ? "Loading..." : "🎲 Surprise me"}
</span>
  </button>
</div>
    </div>

  
  </div>
   <p className="text-center text-xs text-gray-300 mt-4">
              © {new Date().getFullYear()} Networ.King
            </p>
</div>

    </main>
  );
}
