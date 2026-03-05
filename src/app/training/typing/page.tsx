"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const SENTENCES = [
  "Networking is just curiosity plus courage.",
  "Small consistent actions lead to big results.",
  "Clear communication beats clever communication.",
  "Ideas grow faster when shared with others.",
  "Done is better than perfect in most projects.",
  "Focus on outcomes, then design the process.",
  "Momentum is built one small win at a time.",
  "Write it down, break it up, then ship it.",
    "Progress beats perfection every single day.",
  "Discipline is choosing what matters most now.",
  "Consistency turns small skills into mastery.",
  "Simple plans executed well outperform complex ones.",
  "Ask better questions to get better answers.",
  "Feedback is fuel for real improvement.",
  "Habits decide results more than motivation.",
  "Clarity saves time and prevents mistakes.",
  "Preparation creates confidence under pressure.",
  "Action removes more doubt than thinking.",
  "Learning compounds when you review often.",
  "Strong teams are built on trust and clarity.",
  "Make it useful before you make it fancy.",
  "Measure what matters and ignore the noise.",
  "Write clearly so others can act quickly.",
  "Good systems make success repeatable.",
  "Start small but start today.",
  "Energy grows when you use it well.",
  "Constraints often lead to better ideas.",
  "Practice daily even when it feels slow.",
  "Direction matters more than speed at first.",
  "Curiosity opens more doors than talent.",
  "Finish what you start whenever possible.",
  "Structure helps creativity move faster.",
  "Momentum loves visible progress.",
  "Remove friction from your main workflow.",
  "Teach others to understand things deeper.",
  "Short notes prevent long confusion.",
  "Plan the work, then work the plan.",
  "Useful beats impressive every time.",
  "Break hard tasks into tiny steps.",
  "Attention is your most valuable resource.",
  "Document decisions for your future self.",
  "Iteration is smarter than hesitation.",
  "Make the next step obvious.",
  "Reduce complexity before adding features.",
  "Clear goals create focused effort.",
  "Test early and adjust quickly.",
  "Ownership creates better outcomes.",
  "Effort counts most when repeated.",
  "Focus is saying no to distractions.",
  "Reliable beats brilliant in teams.",
  "Sharpen the basics again and again.",
  "Think in systems, not shortcuts.",
  "Small wins create big confidence.",
  "Make progress visible and measurable.",
  "Slow is smooth and smooth is fast.",
  "Good questions unlock hidden insight.",
  "Write less but say more.",
  "Execution is the real differentiator.",

];

function pickRandomSentence() {
  return SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
}

// Stable placeholder to avoid hydration mismatch
const PLACEHOLDER = "Loading sentence…";

export default function TypingTrainerPage() {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState<string>(PLACEHOLDER);

  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);

  // Client-only sentence selection (prevents hydration error)
  useEffect(() => {
    setMounted(true);
    setText(pickRandomSentence());
  }, []);

  // Best-effort autofocus: works on desktop; on mobile may require a tap gesture
  useEffect(() => {
    if (!mounted) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [mounted, text]);

  useEffect(() => {
    if (!input && !completed) {
      setStartTime(null);
      setEndTime(null);
    }
  }, [input, completed]);

  const accuracy = useMemo(() => {
    if (!input.length) return 100;
    let correct = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === text[i]) correct++;
    }
    return Math.round((correct / input.length) * 100);
  }, [input, text]);

  const wpm = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const minutes = (endTime - startTime) / 1000 / 60;
    const words = text.trim().split(/\s+/).length;
    return minutes > 0 ? Math.round(words / minutes) : 0;
  }, [startTime, endTime, text]);

  const progress = useMemo(() => {
    if (!text || text === PLACEHOLDER) return 0;
    const p = Math.round((Math.min(input.length, text.length) / text.length) * 100);
    return Math.max(0, Math.min(100, p));
  }, [input.length, text]);

  const remaining = useMemo(() => {
    if (!text || text === PLACEHOLDER) return 0;
    return Math.max(0, text.length - input.length);
  }, [input.length, text]);

  function handleChange(val: string) {
    if (!mounted) return;
    if (completed) return;

    // start timer on first character
    if (!startTime && val.length === 1) setStartTime(Date.now());

    setInput(val);

    if (val === text) {
      setCompleted(true);
      setEndTime(Date.now());
    }
  }

  function handleReset() {
    setText(pickRandomSentence());
    setInput("");
    setStartTime(null);
    setEndTime(null);
    setCompleted(false);

    // refocus after changing sentence
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  /** Anti-cheat handlers */
  function block(e: React.SyntheticEvent) {
    e.preventDefault();
  }

  function blockPasteShortcuts(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Block common paste/cut/copy shortcuts (Windows/Linux + Mac)
    if ((e.ctrlKey || e.metaKey) && ["v", "c", "x"].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-amber-500 text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              ⌨️ Typing Trainer
            </h1>
            <p className="text-white/75 mt-4 text-sm sm:text-base max-w-xl">
              Type the sentence as quickly and accurately as you can. 
            </p>
          </div>

            <a
  href="http://localhost:3000/training"
  className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 border border-amber-200 hover:bg-white/10 transition text-sm"
>
   Go Back
</a>

        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
            <p className="text-xs text-white/60">Accuracy</p>
            <p className="text-xl font-bold">{accuracy}%</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
            <p className="text-xs text-white/60">Speed</p>
            <p className="text-xl font-bold">{wpm ? `${wpm} WPM` : "—"}</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
            <p className="text-xs text-white/60">Progress</p>
            <p className="text-xl font-bold">{progress}%</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
            <p className="text-xs text-white/60">Remaining</p>
            <p className="text-xl font-bold">{remaining}</p>
          </div>
        </div>

        {/* Card */}
        <div
          className="mt-6 rounded-3xl bg-white/10 border border-white/15 shadow-2xl overflow-hidden"
          // Tap anywhere on the card to focus (helps on mobile)
          onClick={() => inputRef.current?.focus()}
        >
          {/* Progress bar */}
          <div className="h-2 w-full bg-white/5">
            <div
              className="h-2 bg-amber-300/70 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-5 sm:p-6">
            {/* Sentence */}
            <div className="mb-4">
              <p className="text-xs text-white uppercase tracking-widest">Sentence</p>

              {/* “Pro” display: show target and lightly highlight typed range */}
              <div className="mt-2 rounded-2xl bg-slate-950/40 border border-white/10 p-4">
                <p className="text-base sm:text-lg leading-relaxed break-words font-mono">
  {text.split("").map((char, index) => {
    let color = "text-gray-300";

    if (index < input.length) {
      color =
        input[index] === char
          ? "text-emerald-400"
          : "text-red-400";
    }

    return (
      <span key={index} className={color}>
        {char}
      </span>
    );
  })}
</p>

              </div>

              <p className="mt-2 text-xs text-white/60">
                Anti-cheat measures: copy/paste is disabled.
              </p>
            </div>

            {/* Input */}
            <textarea
              ref={inputRef}
              rows={4}
              value={input}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={blockPasteShortcuts}
              placeholder={mounted ? "Start typing here…" : "Loading…"}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950/50 border border-white/15 text-base outline-none focus:ring-2 focus:ring-amber-400"
              disabled={!mounted || completed}
              // Mobile keyboard hints
              autoCapitalize="sentences"
              autoCorrect="off"
              spellCheck={false}
              // Anti-cheat: block clipboard + drag/drop + context menu
              onPaste={block}
              onCopy={block}
              onCut={block}
              onDrop={block}
              onContextMenu={block}
            />

            {/* Footer actions + completion */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-white/70">
                {completed ? (
                  <span className="text-emerald-300 font-semibold">
                    🎉 Completed! Pick a new sentence to continue.
                  </span>
                ) : (
                  <span>
                    Tip: keep your eyes on the sentence, not your fingers.
                  </span>
                )}
              </div>

              <div className="flex gap-2">
               
                 <button
            onClick={handleReset}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/5 border border-amber-300 hover:bg-white/10 transition text-sm"
            disabled={!mounted}
          >
            New sentence
          </button>

           <button
                  onClick={() => {
                    setInput("");
                    setStartTime(null);
                    setEndTime(null);
                    setCompleted(false);
                    window.setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/5 border border-emerald-400 hover:bg-white/10 transition text-sm"
                  disabled={!mounted}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          Note: some mobile browsers only open the keyboard after a tap. Tap the card to focus instantly.
        </p>
      </div>
    </main>
  );
}
