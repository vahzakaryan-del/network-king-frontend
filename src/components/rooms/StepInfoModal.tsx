"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function StepInfoModal({
  open,
  onClose,
  level,
  title,
  description,
  requirement,
  about, // <-- Added about here
}: {
  open: boolean;
  onClose: () => void;
  level?: number;
  title: string;
  description?: string | null;
  requirement?: string | null;
  about?: string | null; // <-- Added about here
}) {

  const formattedDescription = description
  ? description.split("\n").map((l) => l.trim()).filter(Boolean)
  : [];

const formattedAbout = about
  ? about.split("\n").map((l) => l.trim()).filter(Boolean)
  : [];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="
            fixed inset-0 z-[9999]
            bg-black/60    /* Variant B: partially see pyramid */
            backdrop-blur-sm
            flex items-center justify-center
            px-4
          "
          onClick={onClose}
        >
          {/* MODAL CARD */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
            className="
              relative w-full max-w-md p-8 rounded-2xl
              bg-gradient-to-b from-[#18131f] to-[#0c0a11]
              border-[3px] border-amber-400/70
              shadow-[0_0_60px_rgba(255,200,80,0.25)]
              text-white
            "
          >
            {/* GOLDEN SHIMMER BORDER */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl 
              border border-amber-300/30
              animate-pulse opacity-30
            " />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-amber-300
                hover:text-amber-200 text-xl"
            >
              ✕
            </button>

            {/* HEADER */}
            <div className="text-center mb-4">
              {level !== undefined && (
                <h2 className="text-3xl font-extrabold text-amber-300 drop-shadow">
                  Level {level}
                </h2>
              )}
              <p className="text-lg text-gray-200 mt-1">{title}</p>
            </div>

            <div className="w-full h-[2px] bg-amber-300/40 rounded-full mb-6" />
            {/* 🔐 Requirements */}
{formattedDescription.length > 0 && (
  <div className="mb-6">
    <h3 className="text-lg font-bold text-amber-300  mb-3 uppercase tracking-widest">
      Requirements
    </h3>

    <div className="space-y-2">
      {formattedDescription.map((line, idx) => {
        const isBullet = line.startsWith("-");
        const isNote = line.startsWith("💡");

        return (
          <p
            key={idx}
            className={`text-sm ${
              isNote
                ? "text-black bg-amber-300 rounded px-2 py-1 font-semibold"
                : isBullet
                ? "text-gray-200"
                : "text-gray-300"
            }`}
          >
            {isBullet ? "• " + line.replace("-", "").trim() : line}
          </p>
        );
      })}
    </div>
  </div>
)}

            {/* 🧠 Why this level exists */}
{formattedAbout.length > 0 && (
  <div className="mb-6">
    <h3 className="text-lg font-bold text-amber-300 mb-3 uppercase tracking-widest">
      Why this level exists
    </h3>

    <div className="space-y-2">
      {formattedAbout.map((line, idx) => (
        <p key={idx} className="text-sm text-gray-300 leading-relaxed">
          {line}
        </p>
      ))}
    </div>
  </div>
)}

            {/* CLOSE BUTTON BOTTOM */}
            <button
              onClick={onClose}
              className="mt-2 w-full py-3 rounded-lg 
                bg-amber-400 text-black font-bold
                hover:bg-amber-300 transition shadow-lg"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}