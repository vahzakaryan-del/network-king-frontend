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

  // 🔍 Find target position
  useEffect(() => {
    if (!isOpen || !step) return;

    const el =
  document.getElementById(step.targetId) ||
  document.querySelector(`[id^="${step.targetId}"]`);
   
  if (!el || !(el instanceof HTMLElement)) {
  console.warn("Onboarding target not found:", step.targetId);
  return;
}

el.scrollIntoView({
  behavior: "smooth",
  block: "nearest",
});

    const update = () => {
      const r = el.getBoundingClientRect();
      setRect(r);
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [step, isOpen]);

  if (!isOpen || !step || !rect) return null;

  const isBottomOverflow = rect.bottom + 160 > window.innerHeight;

  const padding = 8;

  return (
    <>
      {/* 🔲 Dark overlay */}
     <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm" />

      {/* 🔆 Highlight box */}
      <div
  className="fixed z-[10001] pointer-events-none border-2 border-amber-300 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.7)] animate-pulse"
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
  top: isBottomOverflow ? rect.top - 160 : rect.bottom + 12,
  left: Math.max(12, Math.min(rect.left, window.innerWidth - 340)),
}}
      >
        <h3 className="font-bold text-lg mb-1">{step.title}</h3>
        <p className="text-sm text-gray-200 mb-3">{step.description}</p>

        <div className="flex justify-between items-center">

          <p className="text-xs text-gray-400 mb-2">
  Step {currentStep + 1} of {steps.length}
</p>
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:underline"
          >
            Skip
          </button>

          <div className="flex gap-2">
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