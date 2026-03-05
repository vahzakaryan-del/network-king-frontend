"use client";

import { useEffect, useState } from "react";

type TimerProps = {
  endTime: number;
  onExpire: () => void;
};

export function Timer({ endTime, onExpire }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.floor((endTime - Date.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return <div className="mb-4 text-lg">⏳ Time left: <b>{formatTime(timeLeft)}</b></div>;
}