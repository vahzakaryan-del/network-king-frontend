"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

// ⭐ NEW: unified badge score overlay
import BadgeScore from "@/components/BadgeScore";

export default function TestResultPage() {
  const router = useRouter();
  const { slug } = useParams();
  const searchParams = useSearchParams();

  

  // INTERNAL test uses attemptId explicitly (?attempt=)
  const attemptId = searchParams.get("attempt");

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [badge, setBadge] = useState<any>(null);
  const [nextAttemptAt, setNextAttemptAt] = useState<any>(null);

  const badgeUrl = badge?.icon
  ? `${process.env.NEXT_PUBLIC_API_URL}${badge.icon}`
  : `${process.env.NEXT_PUBLIC_API_URL}/badges/default.png`;


  // -----------------------------------------------------
  // FETCH RESULT
  // -----------------------------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return router.push("/login");

       const url = attemptId
  ? `${process.env.NEXT_PUBLIC_API_URL}/tests/${slug}/result?attempt=${attemptId}`
  : `${process.env.NEXT_PUBLIC_API_URL}/tests/${slug}/result`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setTest(data.test);
        setAttempt(data.attempt || null);
        setBadge(data.badge || null);
        setNextAttemptAt(data.nextAttemptAt || null);
      } catch (err) {
        console.error(err);
        router.push("/tests");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug, attemptId, router]);

  // -----------------------------------------------------
  // LOADING UI
  // -----------------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center text-xl">
        Loading results…
      </main>
    );
  }

  if (!test) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center text-xl">
        Failed to load test.
      </main>
    );
  }

  const score = attempt?.score ?? 0;
  const correctCount = attempt?.correctCount ?? null;
  const totalCount = attempt?.totalCount ?? null;

  const isAchievement = test.category === "achievement";
  const isFun = test.category === "fun";

  const passed = attempt?.passed === true;
  const failed = attempt?.passed === false;

  // -----------------------------------------------------
  // UI
  // -----------------------------------------------------
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#001F3F] via-[#0A1330] to-[#C0A060] text-white p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold"
        >
          {test.title} — Results
        </motion.h1>

        {/* Score Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-xl"
        >
          {/* Breakdown */}
          {correctCount !== null && totalCount !== null && (
            <p className="text-md opacity-80 mb-2">
              📊 {correctCount} / {totalCount} correct
            </p>
          )}

          <p className="text-xl opacity-80 mb-2">Your Score</p>

          <p className="text-6xl font-extrabold text-amber-300 drop-shadow-lg">
           {test?.scoringType === "percentage"
  ? `${score}%`
  : (attempt?.badgeScore ?? score)}

          </p>

          {/* Achievement status */}
          {isAchievement && passed && (
            <div className="mt-4 p-3 rounded-xl bg-green-500/30 border border-green-400">
              🎉 <b>You passed the achievement test!</b>
            </div>
          )}

          {isAchievement && failed && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/30 border border-red-400">
              ❌ <b>You did not pass.</b>
            </div>
          )}

          {/* Fun Test */}
          {isFun && (
            <div className="mt-4 p-3 rounded-xl bg-blue-500/30 border border-blue-400">
              🎮 <b>Fun test completed! Replay anytime.</b>
            </div>
          )}

          {/* ⭐ UNIFIED BADGE + SCORE OVERLAY ⭐ */}
         {badge && attempt?.badgeScore != null && (

            <div className="mt-10 flex flex-col items-center">
              
              <BadgeScore
  badgeUrl={badgeUrl}
  score={attempt.badgeScore}
  size={120}
  unit={test?.scoringType === "percentage" ? "percent" : "none"}
/>


              <p className="mt-3 text-xl font-semibold">{badge.name}</p>
            </div>
          )}
        </motion.div>

        {/* Cooldown */}
        {nextAttemptAt && (
          <div className="text-white/80 text-sm">
            Next retake available:
            <br />
            <span className="text-emerald-300 font-semibold text-lg">
              {new Date(nextAttemptAt).toLocaleString()}
            </span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => router.push("/tests")}
            className="px-6 py-3 rounded-xl bg-amber-400 text-gray-900 font-bold hover:bg-amber-300"
          >
            Back to Tests
          </button>

          {/* Retake button only if no cooldown */}
          {!nextAttemptAt && (
            <button
              onClick={() => router.push(`/tests/${test.slug}`)}
              className="px-6 py-3 rounded-xl bg-white/10 font-bold border border-white/20 hover:bg-white/20"
            >
              Retake Test
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
