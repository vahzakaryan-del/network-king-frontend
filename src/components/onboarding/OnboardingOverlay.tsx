"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Step = {
  id: string;
  title: string;
  description: string;
  targetId: string;
};

export default function OnboardingOverlay({
  steps,
  isOpen,
  onClose,
  onFinish,
}: {
  steps: Step[];
  isOpen: boolean;
  onClose: () => void;
  onFinish: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  
  

  const step = steps[currentStep];

  useEffect(() => {
  if (isOpen) setCurrentStep(0);
}, [isOpen]);

useEffect(() => {
  setRect(null);
}, [step]);

  // 🔍 Find target position
  useEffect(() => {
  if (!isOpen || !step) return;

  let attempts = 0;
let hasScrolled = false;

  const findAndMeasure = () => {
   const candidates = Array.from(
  document.querySelectorAll(`[id^="${step.targetId}"]`)
) as HTMLElement[];

const el = candidates.find(
  (el) => el.offsetWidth > 0 && el.offsetHeight > 0
);

    if (!el || !(el instanceof HTMLElement)) {
      console.warn("Onboarding target not found:", step.targetId);
      return false;
    }

    const r = el.getBoundingClientRect();

    // ❗ Ignore invalid rects
    if (r.width === 0 || r.height === 0) return false;

    setRect(r);


    // 👇 scroll AFTER valid rect
    if (!hasScrolled) {
  el.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
  hasScrolled = true;
}

    return true;
  };

  const tryMeasure = () => {
    const success = findAndMeasure();

    if (!success && attempts < 10) {
      attempts++;
      setTimeout(tryMeasure, 80); // retry
    }
  };

  tryMeasure();

  window.addEventListener("resize", tryMeasure);
  window.addEventListener("scroll", tryMeasure);

  return () => {
    window.removeEventListener("resize", tryMeasure);
    window.removeEventListener("scroll", tryMeasure);
  };
}, [step, isOpen]);

  if (!isOpen || !step || !rect) return null;

  const isBottomOverflow = rect.bottom + 160 > window.innerHeight;

  const padding = 8;

  return (
    <>
      {/* 🔲 Dark overlay */}
     <div
  className="fixed inset-0 z-[10000] pointer-events-none"
  style={{
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    background: "rgba(0,0,0,0.6)",
    maskImage: `radial-gradient(
      circle at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px,
      transparent ${Math.max(rect.width, rect.height) / 1.5}px,
      black ${Math.max(rect.width, rect.height) / 1.2}px
    )`,
    WebkitMaskImage: `radial-gradient(
      circle at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px,
      transparent ${Math.max(rect.width, rect.height) / 1.5}px,
      black ${Math.max(rect.width, rect.height) / 1.2}px
    )`,
  }}
/>

      {/* 🔆 Highlight box */}
      <div
  className="fixed z-[10001] pointer-events-none border-2 border-amber-300 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.7)] animate-[pulse_3s_ease-in-out_infinite]"
  style={{
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }}
/>

      {/* 💬 Tooltip */}
      <motion.div
  initial={{ opacity: 0, y: 10, scale: 0.98 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.25 }}
       className="
fixed z-[10002] max-w-xs w-[90vw] sm:w-80
rounded-2xl
bg-gradient-to-b from-white/15 to-white/5
backdrop-blur-xl
border border-amber-300/40
shadow-[0_10px_40px_rgba(0,0,0,0.4)]
text-white
p-5
"
 style={{
  position: "fixed",
  top: Math.max(
  12,
  isBottomOverflow ? rect.top - 160 : rect.bottom + 12
),
  left: Math.max(
  12,
  Math.min(rect.left, window.innerWidth - 320)
),
}}
      >
        <h3 className="font-bold text-lg mb-1">{step.title}</h3>
        <p className="text-sm text-gray-200 mb-3">{step.description}</p>

        <div className="flex flex-col gap-2">
  <div className="flex justify-between items-center">
    <p className="text-xs text-gray-400">
      Step {currentStep + 1} of {steps.length}
    </p>

    <button
      onClick={onClose}
      className="text-xs text-gray-500 hover:underline"
    >
      Skip
    </button>
  </div>

  <div className="flex justify-end gap-2">
    {currentStep > 0 && (
      <button
        onClick={() => setCurrentStep((s) => s - 1)}
        className="px-3 py-1 text-sm rounded bg-white/10 border border-white/20 text-white"
      >
        Back
      </button>
    )}

    {currentStep < steps.length - 1 ? (
      <button
        onClick={() => setCurrentStep((s) => s + 1)}
        className="px-3 py-1 text-sm rounded bg-amber-400 hover:bg-amber-300 text-gray-900 font-semibold shadow-lg"
      >
        Next
      </button>
    ) : (
      <button
        onClick={onFinish}
        className="px-3 py-1 text-sm rounded bg-gradient-to-r from-amber-400 to-yellow-300 text-gray-900 shadow-lg font-semibold"
      >
        Finish
      </button>
    )}
  </div>
</div>
      </motion.div>
    </>
  );
}