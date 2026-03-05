"use client";

import { useEffect, useState } from "react";

export default function PyramidIntro({ onFinish }: { onFinish: () => void }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 2300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!done) return;
    const fadeTimer = setTimeout(onFinish, 600);
    return () => clearTimeout(fadeTimer);
  }, [done, onFinish]);

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center 
        bg-[#0a0a0f] transition-opacity duration-700
        ${done ? "opacity-0" : "opacity-100"}`}
    >
      {/* Glowing triangle */}
      <div className="triangle" />

      <style jsx>{`
        .triangle {
          width: 0;
          height: 0;
          border-left: 90px solid transparent;
          border-right: 90px solid transparent;
          border-bottom: 150px solid rgba(255, 220, 120, 0.9);
          filter: drop-shadow(0 0 25px rgba(255, 220, 120, 0.8));
          animation: glow 2s ease-out forwards;
        }

        @keyframes glow {
          0% {
            opacity: 0;
            transform: scale(0.4) translateY(20px);
            filter: drop-shadow(0 0 5px rgba(255, 220, 120, 0.1));
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: drop-shadow(0 0 25px rgba(255, 220, 120, 0.9));
          }
        }
      `}</style>
    </div>
  );
}
