"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function Home() {
  const router = useRouter();

  const [showToast, setShowToast] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          setShowToast(true);
          setTimeout(() => router.push("/dashboard"), 1500);
        } else {
          localStorage.removeItem("token");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
      });
  }, [router]);

  // Delay video playback for 1.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowVideo(true);
      videoRef.current?.play();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white font-sans">
      {/* soft light overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14 text-center">
        {/* 🔔 Toast */}
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed left-1/2 top-4 z-50 w-[92%] -translate-x-1/2 rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-sm shadow-lg backdrop-blur-xl sm:left-auto sm:right-6 sm:top-6 sm:w-auto sm:translate-x-0"
          >
            <p className="font-semibold text-white">
              You are already logged in • Redirecting…
            </p>
            <div className="mt-1 flex justify-center space-x-1 sm:justify-start">
              <span className="h-2 w-2 animate-bounce rounded-full bg-white/90" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-white/70 [animation-delay:0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:0.3s]" />
            </div>
          </motion.div>
        )}

        {/* Heading */}
        <motion.h1
          className="mb-3 text-3xl font-extrabold drop-shadow-lg sm:text-4xl md:text-6xl"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          👑 Welcome to <span className="text-amber-300">Networ.King</span>
        </motion.h1>

        <motion.p
          className="mb-6 max-w-xl text-base text-gray-100 sm:text-lg md:text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.8 }}
        >
          Meet driven people, share ideas, and build projects that matter.
        </motion.p>

        {/* Video Section */}
        <motion.div
          className="mb-7 w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm sm:mb-10 sm:max-w-2xl relative"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.8 }}
        >
          {/* Thumbnail + shimmer effect */}
          {!showVideo && (
            <>
              <img
                src="/thumbnail.webp"
                alt="Video thumbnail"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                <div className="absolute top-0 left-full h-full w-32 bg-white/20 blur-xl animate-shimmer" />
              </div>
            </>
          )}

          <video
            ref={videoRef}
            className={`h-auto w-full transition-opacity duration-500 ${showVideo ? "opacity-100" : "opacity-0"}`}
            controls
            muted
            loop
            playsInline
            poster="/thumbnail.webp"
          >
            <source src="/intro.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </motion.div>

        {/* Buttons */}
        <div className="z-10 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-6">
          <Link
            href="/register"
            className="w-full rounded-full bg-amber-400 px-6 py-3 font-semibold text-gray-900 shadow-lg transition-transform hover:scale-105 hover:bg-amber-300 sm:w-auto"
          >
            Register
          </Link>

          <Link
            href="/login"
            className="w-full rounded-full border-2 border-white px-6 py-3 font-semibold text-white transition-transform hover:scale-105 hover:bg-white hover:text-blue-900 sm:w-auto"
          >
            Log In
          </Link>
        </div>

        {/* Footer */}
        <motion.footer
          className="mt-10 text-xs text-gray-200/90 sm:mt-14 sm:text-sm md:absolute md:bottom-6 md:mt-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95 }}
        >
          © {new Date().getFullYear()} Networ.King – Connect. Collaborate. Grow.
        </motion.footer>
      </div>

      {/* Shimmer animation keyframes */}
      <style jsx>{`
        @keyframes shimmer {
          0% { left: 100%; }
          100% { left: -40%; }
        }
        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}