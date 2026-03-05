"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = "deep" | "fun" | "creative";

const PROMPTS: Record<Category, string[]> = {
  deep: [
    "What project are you secretly dreaming of starting?",
    "What belief have you changed your mind about in the last few years?",
    "What motivates you when no one is watching?",
    "What fear has shaped your decisions the most?",
    "What’s something you’re currently struggling with that people wouldn’t expect?",
    "What does success mean to you right now?",
    "What kind of impact do you want to have in 10 years?",
    "What’s a hard truth you’ve recently accepted?",
    "What’s something you wish more people understood about you?",
    "What’s a conversation you’ve been avoiding?",
    "When do you feel most confident?",
    "What’s a pattern in your life you’re trying to break?",
    "What’s something you’ve outgrown?",
    "What would your younger self thank you for?",
    "What kind of people bring out your best thinking?",
  ],
  fun: [
    "If your life had a theme song right now, what would it be?",
    "What’s a completely useless skill you’re oddly proud of?",
    "If you had to give a TED Talk tomorrow, what would it be about?",
    "What fictional world would you move to instantly?",
    "What’s your irrational fear?",
    "If you were a brand, what would your tagline be?",
    "What’s your most controversial harmless opinion?",
    "What’s a weird productivity trick that works for you?",
    "If you could instantly master one hobby, what would it be?",
    "What’s the strangest compliment you’ve ever received?",
    "What’s your comfort food for stressful days?",
    "What’s something you believed as a kid that makes you laugh now?",
    "If you had a personal mascot, what would it be?",
    "What’s a small thing that makes your day better?",
    "What’s your most unnecessary purchase that you love?",
  ],
  creative: [
    "If time and money were no issue, what would you be building?",
    "What’s a recent idea you can’t stop thinking about?",
    "What’s the most underrated habit for good collaboration?",
    "What problem do you notice that nobody is solving well?",
    "What’s a boring industry you’d love to reinvent?",
    "If you had to build something in 48 hours, what would it be?",
    "What’s an app that should exist but doesn’t?",
    "What’s a tool you wish existed for your daily workflow?",
    "If you had to teach a workshop tomorrow, what would it be about?",
    "What’s a creative risk you want to take this year?",
    "What’s a trend you would start?",
    "What’s something overcomplicated that should be simple?",
    "What would you build if you had to charge $0 for it?",
    "What’s an idea you’ve dismissed too quickly?",
    "If you had to collaborate with someone totally opposite to you, what would you create?",
    "What’s a constraint that would make your current work more interesting?",
    "What’s a community you’d love to create?",
    "If you could redesign one daily habit for everyone, what would it be?",
  ],
};

function getRandomPrompt(category: Category, current: string) {
  const options = PROMPTS[category].filter((p) => p !== current);
  return options[Math.floor(Math.random() * options.length)];
}

export default function IcebreakersPage() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>("deep");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("icebreaker-history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("icebreaker-history", JSON.stringify(history));
  }, [history]);

  function nextPrompt() {
    const next = getRandomPrompt(category, prompt);
    if (prompt) setHistory((prev) => [prompt, ...prev]);
    setPrompt(next);
  }

  useEffect(() => {
    nextPrompt();
    // eslint-disable-next-line
  }, [category]);

  function copyPrompt() {
    navigator.clipboard.writeText(prompt);
  }

  function clearHistory() {
    setHistory([]);
  }

  const categories = useMemo(
    () => ["deep", "fun", "creative"] as Category[],
    []
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-indigo-950 to-amber-500 text-white flex flex-col items-center py-12 px-4">
      
      {/* Go Back */}
      <div className="w-full max-w-xl mb-6">
        <button
          onClick={() => router.push("/training")}
          className="text-sm text-white/70 hover:text-white underline"
        >
          ← Go Back
        </button>
      </div>

      <h1 className="text-4xl font-extrabold mb-2">🧊 Icebreakers</h1>
      <p className="text-white/70 mb-6 text-sm text-center max-w-xl">
        Thoughtful prompts for real conversations.
      </p>

      {/* Category Selector */}
      <div className="flex gap-3 mb-8 flex-wrap justify-center">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-full text-xs font-semibold ${
              category === c
                ? "bg-amber-400 text-black"
                : "bg-white/10 border border-white/20 hover:bg-white/20"
            }`}
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Prompt Card */}
      <div className="bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl max-w-xl w-full backdrop-blur text-center">
        <p className="text-xs uppercase text-white/50 mb-3">
          Current Prompt
        </p>
        <p className="text-xl font-semibold leading-relaxed mb-6">
          {prompt}
        </p>

        {/* Buttons moved under prompt */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={nextPrompt}
            className="px-5 py-2 rounded-lg bg-amber-400 text-black font-semibold text-sm hover:bg-amber-300"
          >
            New Prompt
          </button>

          <button
            onClick={copyPrompt}
            className="px-5 py-2 rounded-lg bg-white/10 border border-white/20 text-sm hover:bg-white/20"
          >
            Copy
          </button>
        </div>
      </div>

      {/* History */}
      <div className="max-w-xl w-full mt-8">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs uppercase text-white/50">
            History
          </p>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-red-400 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="max-h-48 overflow-y-auto text-sm border border-white/10 rounded-lg p-3 bg-black/30">
          {history.length === 0 ? (
            <p className="text-white/40 text-xs">
              No previous prompts yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((h, idx) => (
                <li key={idx} className="text-white/80">
                  • {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
