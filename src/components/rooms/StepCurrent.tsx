"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function StepCurrent({
  level,
  title,
}: {
  level: number;
  title: string;
}) {
  const router = useRouter();

  const handleEnterRoom = () => {
    router.push(`/chat/global?channel=level-${level}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 80, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="
  relative w-[75%] md:w-[60%] max-sm:w-[92%]
  mx-auto py-10 md:py-12 max-sm:py-7
  rounded-xl
  bg-gradient-to-b from-yellow-500/90 to-yellow-700/90
  border-[3px] border-yellow-300
  shadow-[0_0_45px_rgba(255,215,0,0.45)]
  flex flex-col items-center
  backdrop-blur-sm
"

    >
      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-extrabold text-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)] mb-4 md:mb-5 max-sm:mb-3">
        Level {level}
      </h2>

      <p className="text-base md:text-lg font-medium text-black/80 mb-4 md:mb-6 text-center">
        {title}
      </p>

      {/* Wooden Door (CLICKABLE) */}
      <motion.button
        type="button"
        onClick={handleEnterRoom}
        whileHover={{ scale: 1.03, rotate: -1 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="
          w-36 md:w-44 h-56 md:h-64 rounded-md overflow-hidden
          border-[3px] border-black/40 shadow-xl
          bg-[url('/rooms/door-wood.png')] bg-cover bg-center
          cursor-pointer
        "
        aria-label={`Enter Level ${level} chat`}
      />

      {/* UNLOCKED badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="
          absolute top-4 right-4 px-3 py-1
          bg-green-400 text-black font-bold text-xs
          rounded-md shadow-[0_0_8px_rgba(0,0,0,0.3)]
          border border-black/30
        "
      >
        UNLOCKED
      </motion.div>

      {/* Light rays */}
      <div
        className="
          absolute inset-0 pointer-events-none mix-blend-screen
          bg-[radial-gradient(circle_at_center,rgba(255,255,220,0.30),transparent_70%)]
          animate-pulse
        "
      />
    </motion.div>
  );
}
