"use client";

import { motion } from "framer-motion";

export default function StepPlaceholder({
  level,
}: {
  level: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 0.6, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="
        relative w-[65%] md:w-[55%] mx-auto py-8 rounded-xl
        bg-gradient-to-b from-yellow-500/40 to-yellow-700/40
        border-[3px] border-yellow-300/30
        shadow-[0_0_25px_rgba(255,215,0,0.3)]
        flex flex-col items-center
        backdrop-blur-sm
        pointer-events-none
        select-none
      "
    >
      <h2 className="text-lg font-extrabold text-black/60 drop-shadow mb-2">
        Level {level}
      </h2>

      <p className="text-xs text-black/50">Coming soon...</p>
    </motion.div>
  );
}
