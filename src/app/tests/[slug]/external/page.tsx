"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

export default function ExternalTestPage() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // -------------------------------------------------------
  // Load Test
  // -------------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    fetch(`http://localhost:4000/tests/${slug}/info`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.test) throw new Error();
        setTest(data.test);
      })
      .catch(() => router.push("/tests"))
      .finally(() => setLoading(false));
  }, [slug]);

  // -------------------------------------------------------
  // Handle psychtoolkit “?score=xxx”
  // -------------------------------------------------------
  useEffect(() => {
    const score = searchParams.get("score");
    if (!score || !test) return;

    const send = async () => {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:4000/tests/${test.slug}/submit-external`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ score }),
      });

      router.push(`/tests/${test.slug}/result`);
    };

    send();
  }, [searchParams, test]);

  // -------------------------------------------------------
  // Handle postMessage results
  // -------------------------------------------------------
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data?.type !== "test_score") return;
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:4000/tests/${test.slug}/submit-external`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ score: event.data.score }),
      });
      router.push(`/tests/${test.slug}/result`);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [test]);

  // -------------------------------------------------------
  if (loading)
    return (
      <main className="min-h-screen grid place-items-center bg-black text-white">
        Loading test…
      </main>
    );

  if (!test)
    return (
      <main className="min-h-screen grid place-items-center text-red-400">
        Test not found.
      </main>
    );

  // -------------------------------------------------------
  // MAIN UI
  // -------------------------------------------------------
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white relative p-6">

      {/* soft overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

      {/* TOP BAR */}
      <div className="relative z-10 max-w-6xl mx-auto pb-4 mb-4 border-b border-white/10 flex items-center justify-between">
        <div
          className="cursor-pointer"
          onClick={() => setShowLeaveModal(true)}
        >
          <h1 className="text-3xl font-extrabold text-amber-300 drop-shadow-md">
            {test.title}
          </h1>
          <p className="text-xs text-white/70 mt-1">{test.description}</p>
        </div>

        <button
          onClick={() => setShowLeaveModal(true)}
          className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 border border-white/20 transition font-semibold"
        >
          ← Back to Tests
        </button>
      </div>

      {/* IFRAME */}
      <div className="relative z-10 max-w-6xl mx-auto border border-white/20 rounded-xl shadow-2xl overflow-hidden h-[75vh] bg-black/40">
        <iframe
          src={test.externalUrl}
          className="w-full h-full"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      <p className="text-center text-white/70 text-sm mt-3">
        Finish the test. Your result will be submitted automatically.
      </p>

      {/* LEAVE CONFIRMATION MODAL */}
      {showLeaveModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/10 border border-white/20 p-6 rounded-2xl max-w-sm text-center shadow-xl"
          >
            <h2 className="text-xl font-bold text-amber-300 mb-3">
              Leave the Test?
            </h2>
            <p className="text-white/80 text-sm mb-6">
              If you leave without finishing, the test may go on cooldown or
              become unavailable.  
              <br />
              Are you sure?
            </p>

            <div className="flex justify-center gap-4">
              <button
                className="px-4 py-2 rounded-lg bg-white/20 border border-white/20 hover:bg-white/30 transition"
                onClick={() => setShowLeaveModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-400 text-black font-semibold hover:bg-red-300 transition"
                onClick={() => router.push("/tests")}
              >
                Leave Anyway
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </main>
  );
}
