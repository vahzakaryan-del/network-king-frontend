"use client";

import { useEffect, useRef, useState } from "react";

export default function MiniAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const update = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    audio.addEventListener("timeupdate", update);
    audio.addEventListener("loadedmetadata", update);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("loadedmetadata", update);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
  audio.play();
  setPlaying(true);
  setExpanded(true); // open on play
} else {
  audio.pause();
  setPlaying(false);
  setExpanded(false); // ✅ collapse on pause
}
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const value = Number(e.target.value);
    audio.currentTime = value;
    setProgress(value);
  };

  const changeRate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const next = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1;
    audio.playbackRate = next;
    setRate(next);
  };

  return (
    <div
      className={`
        transition-all duration-300
        ${expanded ? "w-52" : "w-10"}
      `}
    >
      {/* COLLAPSED */}
      {!expanded && (
        <button
          onClick={togglePlay}
          className="
            w-10 h-10
            rounded-full
            bg-white/10
            border border-white/20
            flex items-center justify-center
            hover:bg-white/20
            transition
          "
        >
          <span className="text-white/80 text-sm">
            ▶︎
          </span>
        </button>
      )}

      {/* EXPANDED */}
      {expanded && (
        <div
          className="
            flex items-center gap-2
            px-3 py-2
            rounded-full
            bg-white/10
            border border-white/20
            backdrop-blur-md
          "
        >
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="text-white/80 text-sm hover:text-white transition"
          >
            {playing ? "⏸" : "▶︎"}
          </button>

          {/* Progress */}
          <input
            type="range"
            min={0}
            max={duration || 1}
            value={progress}
            onChange={seek}
            className="
              w-full h-[2px]
              bg-white/20
              appearance-none
              cursor-pointer
            "
          />

          {/* Speed */}
          <button
            onClick={changeRate}
            className="
              text-[10px]
              px-2 py-0.5
              rounded-md
              bg-white/10
              border border-white/20
              text-white/70
              hover:text-white
            "
          >
            {rate}x
          </button>
        </div>
      )}
    </div>
  );
}