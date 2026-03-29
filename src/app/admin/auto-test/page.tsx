"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function AutoTestPage() {
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [difficulty, setDifficulty] = useState("medium");
 const [imageMode, setImageMode] = useState("all");
 const router = useRouter();

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setResult(null);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API}/admin/tests/auto-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic,
          questionsCount: questions,
           difficulty,
  imageMode,
        }),
      });

      const data = await res.json();

      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ error: "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6">
    <div className="w-full max-w-xl bg-gray-900/80 backdrop-blur-lg border border-gray-700 rounded-2xl shadow-xl p-8">
      
      <h1 className="text-3xl font-bold mb-6 text-center text-purple-400">
        🤖 Auto Generate Test
      </h1>

      <div className="space-y-5">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Test topic (e.g. Psychology)"
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <input
          type="number"
          value={questions}
          onChange={(e) => setQuestions(Number(e.target.value))}
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <select
  value={difficulty}
  onChange={(e) => setDifficulty(e.target.value)}
  className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
>
  <option value="easy">Easy</option>
  <option value="medium">Medium</option>
  <option value="hard">Hard</option>
</select>

<select
  value={imageMode}
  onChange={(e) => setImageMode(e.target.value)}
  className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
>
  <option value="all">All images</option>
  <option value="5">First 5 only</option>
  <option value="none">No images</option>
</select>

        <button
          onClick={handleGenerate}
          disabled={loading || !topic}
          className="w-full p-3 rounded-lg bg-purple-600 hover:bg-purple-700 active:scale-[0.98] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Test"}
        </button>

        <button
          onClick={() => router.push("/admin")}
          className="mt-6 bg-white/80  px-4 py-2 rounded border border-white/20"
        >
          ← Back to Admin
        </button>
      </div>
       
      

      {result && (
        <pre className="mt-6 p-4 bg-black/60 border border-gray-700 rounded-lg text-sm text-green-300 overflow-auto max-h-96">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  </div>
);
}