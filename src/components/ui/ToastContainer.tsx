"use client";

import { useEffect, useState } from "react";
import { subscribeToToasts } from "@/lib/toast";
import { motion, AnimatePresence } from "framer-motion";

type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return subscribeToToasts(setToasts);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`
              px-4 py-3 rounded-xl shadow-xl text-sm font-semibold
              backdrop-blur-md border
              ${
                t.type === "success"
                  ? "bg-green-500/20 border-green-400 text-green-200"
                  : t.type === "error"
                  ? "bg-red-500/20 border-red-400 text-red-200"
                  : "bg-white/10 border-white/20 text-white"
              }
            `}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}