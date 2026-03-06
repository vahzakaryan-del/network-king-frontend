"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Choice = {
  id: number;
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
};

type Question = {
  id: number;
  content: string;
  mode: string; // "single" | "multiple" | "input" | etc.
  imageUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  points?: number | null;
  choices?: Choice[];
  correctAnswers?: any; // Prisma Json (can be string/array/etc.)
};

type Test = {
  id: number;
  title: string;
  slug?: string | null;
  description?: string | null;
  category: string; // "achievement" | "fun"
  difficulty: string;
  timeLimit?: number | null;
  allowedAttempts?: number | null;
  cooldownDays?: number | null;
  scoringType?: string | null;
  mode?: "internal" | "external" | string;
  externalUrl?: string | null;
  isActive: boolean;
  icon?: string | null;
  badge?: { id: number; name: string; rarity: string; icon?: string | null } | null;
  questions?: Question[];
};

export default function AdminTestPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const testId = Number((params as any)?.id);

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fade = useMemo(
    () => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }),
    []
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !testId) {
      router.replace("/admin/tests");
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API}/admin/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.test) throw new Error(data?.error || "Test not found");

        setTest(data.test);
      } catch (err: any) {
        setError(err?.message || "Failed to load test");
        setTest(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [testId, router]);

  const questionsCount = test?.questions?.length ?? 0;

  const maxScore = useMemo(() => {
    const qs = test?.questions ?? [];
    return qs.reduce((sum, q) => sum + (typeof q.points === "number" ? q.points : 0), 0);
  }, [test?.questions]);

  const timeLabel = useMemo(() => {
    const seconds = test?.timeLimit ?? null;
    if (!seconds || seconds <= 0) return "∞";
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  }, [test?.timeLimit]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white">
        <div className="text-center">
          <p className="text-2xl font-extrabold animate-pulse">Loading preview…</p>
          <p className="mt-2 text-sm text-white/70">Fetching test #{testId}</p>
        </div>
      </main>
    );
  }

  if (error || !test) {
    return (
      <main className="min-h-screen grid place-items-center bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white">
        <div className="text-center">
          <p className="text-xl">❌ {error || "Test not found"}</p>
          <button
            onClick={() => router.push("/admin/tests")}
            className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg"
          >
            ← Back to Admin Tests
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400" />

      <main className="min-h-screen text-white relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 py-8">
          {/* top bar */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <button
              onClick={() => router.push("/admin/tests")}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition"
            >
              ← Back to Admin Tests
            </button>

            <div className="flex items-center gap-2">
              {test.mode === "external" && test.externalUrl ? (
                <a
                  href={test.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition"
                  title="Open external URL"
                >
                  🔗 Open external
                </a>
              ) : null}

              <button
                onClick={() => {
                  // if you have a user-facing route by slug, prefer it; otherwise keep id
                  if (test.slug) router.push(`/tests/${test.slug}?preview=true`);
                  else router.push(`/tests/${test.id}?preview=true`);
                }}
                className="px-4 py-2 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition"
              >
                🎮 View as User
              </button>
            </div>
          </div>

          <motion.div
            {...fade}
            transition={{ duration: 0.35 }}
            className="rounded-3xl bg-white/10 border border-white/15 shadow-2xl overflow-hidden"
          >
            {/* header */}
            <div className="p-6 md:p-8 border-b border-white/10">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div className="shrink-0">
                  <img
                    src={test.icon || "/placeholder.png"}
                    alt={test.title}
                    className="w-28 h-28 object-cover rounded-2xl border border-white/20 bg-white/10"
                    onError={(e) => ((e.currentTarget.src = "/placeholder.png"))}
                  />
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-xs text-white/70">Admin Preview</p>
                      <h1 className="text-3xl md:text-4xl font-extrabold text-amber-300 drop-shadow">
                        {test.title}
                      </h1>
                      <p className="mt-2 text-white/80">
                        {test.description || "No description"}
                      </p>
                    </div>

                    <div className="flex items-center justify-center md:justify-end gap-2">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                          test.isActive
                            ? "bg-emerald-400/15 text-emerald-200 border-emerald-300/30"
                            : "bg-red-400/15 text-red-200 border-red-300/30"
                        }`}
                      >
                        {test.isActive ? "● Active" : "○ Inactive"}
                      </span>

                      {test.badge?.name ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-gray-900">
                          🏅 {test.badge.name}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* meta */}
                  <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-2 text-sm">
                    <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                      📁 Category: <strong>{test.category}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                      🧩 Mode: <strong>{test.mode || "internal"}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                      🥇 Difficulty: <strong>{test.difficulty}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                      ⏱ Time: <strong>{timeLabel}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                      ❓ Questions: <strong>{questionsCount}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                      🏆 Max score: <strong>{maxScore}</strong>
                    </span>
                    {typeof test.allowedAttempts === "number" ? (
                      <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                        🎟 Attempts: <strong>{test.allowedAttempts}</strong>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60">
                        🎟 Attempts: <strong>∞</strong>
                      </span>
                    )}
                    {typeof test.cooldownDays === "number" ? (
                      <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                        🧊 Cooldown: <strong>{test.cooldownDays}d</strong>
                      </span>
                    ) : null}
                    {test.scoringType ? (
                      <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                        📈 Scoring: <strong>{test.scoringType}</strong>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* questions */}
            <div className="p-6 md:p-8">
              <div className="flex items-end justify-between gap-4 mb-4">
                <h2 className="text-2xl font-extrabold">Questions</h2>
                <span className="text-xs text-white/60">
                  Correct choices are highlighted
                </span>
              </div>

              {questionsCount === 0 ? (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-white/70">
                  No questions found for this test.
                </div>
              ) : (
                <div className="space-y-5">
                  {(test.questions || []).map((q, index) => {
                    const correctAnswersList = Array.isArray(q.correctAnswers)
                      ? q.correctAnswers
                      : q.correctAnswers
                        ? [q.correctAnswers]
                        : [];

                    return (
                      <div
                        key={q.id}
                        className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                          <h3 className="font-semibold text-lg">
                            <span className="text-white/70 mr-2">{index + 1}.</span>
                            {q.content}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-white/70">
                            <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/15">
                              Mode: <strong>{q.mode}</strong>
                            </span>
                            <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/15">
                              Points:{" "}
                              <strong>{typeof q.points === "number" ? q.points : 0}</strong>
                            </span>
                          </div>
                        </div>

                        {/* media */}
                        {q.imageUrl ? (
                          <img
                            src={q.imageUrl}
                            alt=""
                            className="mt-4 rounded-2xl border border-white/10 max-h-[360px] object-contain bg-black/10"
                          />
                        ) : null}

                        {q.videoUrl ? (
                          <video
                            controls
                            className="mt-4 rounded-2xl border border-white/10 w-full bg-black/10"
                          >
                            <source src={q.videoUrl} />
                          </video>
                        ) : null}

                        {q.audioUrl ? (
                          <audio
                            controls
                            className="mt-4 w-full rounded-xl border border-white/10 bg-black/10"
                          >
                            <source src={q.audioUrl} />
                          </audio>
                        ) : null}

                        {/* answers */}
                        <div className="mt-4">
                          {q.mode !== "input" ? (
                            <ul className="space-y-2">
                              {(q.choices || []).map((c) => (
                                <li
                                  key={c.id}
                                  className={`p-3 rounded-xl border transition ${
                                    c.isCorrect
                                      ? "bg-emerald-500/15 border-emerald-400/30"
                                      : "bg-white/10 border-white/10"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    {c.imageUrl ? (
                                      <img
                                        src={c.imageUrl}
                                        alt=""
                                        className="w-14 h-14 rounded-lg object-cover border border-white/10 bg-black/10"
                                      />
                                    ) : null}

                                    <div className="flex-1">
                                      <div className="text-sm">{c.text}</div>
                                    </div>

                                    {c.isCorrect ? (
                                      <span className="text-emerald-200 font-extrabold">✔</span>
                                    ) : null}
                                  </div>
                                </li>
                              ))}
                              {(q.choices || []).length === 0 ? (
                                <div className="text-sm text-white/60">
                                  No choices found for this question.
                                </div>
                              ) : null}
                            </ul>
                          ) : (
                            <div className="text-sm text-white/80">
                              <div className="text-white/60 mb-2">Accepted answers</div>
                              {correctAnswersList.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {correctAnswersList.map((ans, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-1 rounded-lg bg-white/10 border border-white/15"
                                    >
                                      {String(ans)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-white/60">—</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* bottom actions */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    if (test.slug) router.push(`/tests/${test.slug}?preview=true`);
                    else router.push(`/tests/${test.id}?preview=true`);
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition"
                >
                  🎮 View as User
                </button>

                <button
                  onClick={() => router.push("/admin/tests")}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 font-semibold"
                >
                  ← Back to Admin
                </button>
              </div>
            </div>
          </motion.div>

          <div className="mt-6 text-center text-xs text-white/60">
            Admin preview · Test #{test.id}
          </div>
        </div>
      </main>
    </>
  );
}
