"use client";

import Link from "next/link";
import { useState } from "react";

export default function HelpPage() {
  const faqs = [
    {
      q: "What should I do after I register?",
      a: (
        <p>
          After registering, you’ll land on your dashboard — your command center.
          From there, you can access chats, rooms (level system), tests, and your profile.
          Most users start by exploring chat or checking how to level up in Rooms.
        </p>
      ),
    },
    {
      q: "Why are most chats locked?",
      a: (
        <p>
          All users start at Level 1. You can access General chat and Level 1 chat,
          but higher-level chats are locked. To unlock them, you need to level up
          by completing requirements in Rooms.
        </p>
      ),
    },
    {
      q: "How does leveling up work?",
      a: (
        <p>
          Go to Rooms from your dashboard. You’ll see your current level and the next level door.
          Click “Requirements” on the next level to see what you need to unlock it —
          such as passing tests, gaining friends, or staying active.
        </p>
      ),
    },
    {
      q: "Why are chats similar at every level?",
      a: (
        <p>
          Each level has similar topics (help, business, friends, etc.), but the people change.
          Higher levels are meant to connect you with more committed and active users.
        </p>
      ),
    },
    {
      q: "What are tests and why should I take them?",
      a: (
        <p>
          Tests help you level up and earn badges. Some tests measure things like IQ or consistency,
          and passing them unlocks new levels and features.
        </p>
      ),
    },
    {
      q: "What are badges?",
      a: (
        <p>
          Badges are achievements you earn by completing tests or milestones.
          Each badge has a score and is visible on your profile.
          You can also select up to 3 featured badges to represent yourself.
        </p>
      ),
    },
    {
      q: "Can other users see my profile?",
      a: (
        <p>
          Yes. Other users can click your name to view your profile, including your level,
          badges, languages, countries, and bio. You can customize all of this in “My Profile”.
        </p>
      ),
    },
    {
      q: "How do I unlock more emojis?",
      a: (
        <p>
          Each level unlocks new custom emojis. The higher your level, the more emojis
          you can use in chat.
        </p>
      ),
    },
    {
      q: "What is the daily leaderboard?",
      a: (
        <p>
          Every day there is a new test. You can attempt it twice, and your best result counts.
          Top 3 players receive rewards at midnight based on score, speed, and completion time.
        </p>
      ),
    },
    {
      q: "Why can’t I retake some tests immediately?",
      a: (
        <p>
          Achievement tests have cooldown periods. After completing one, you must wait
          before retrying. You can use cooldown tokens to skip the wait if you want to improve your score.
        </p>
      ),
    },
    {
      q: "How do I connect with other users?",
      a: (
        <p>
          Click on any user’s name to view their profile. From there, you can send a friend request
          or message them directly.
        </p>
      ),
    },
    {
      q: "What are avatars and how do I get more?",
      a: (
        <p>
          You start with free avatars. You can unlock more by completing milestones
          or purchase special ones in the shop, where new avatars are added regularly.
        </p>
      ),
    },
    {
      q: "What are cooldown tokens?",
      a: (
        <p>
          Cooldown tokens let you skip waiting periods for tests or features like renaming.
          You can use them when you want to retry something immediately.
        </p>
      ),
    },
    {
      q: "What makes higher levels better?",
      a: (
        <p>
          Higher levels give access to more advanced users, more emojis, and deeper networking opportunities.
          The system is designed so you earn access by proving your activity and skills.
        </p>
      ),
    },
    // existing ones
    {
      q: "How do I get started?",
      a: (
        <p>
          Create your account, open the dashboard, and follow the onboarding
          steps. If something feels confusing, just message us via Contact.
        </p>
      ),
    },
    {
      q: "I can’t log in — what should I do?",
      a: (
        <p>
          Try refreshing the page, logging out and back in, and double-checking
          your email/provider. If it still fails, send us a message and include
          your browser + device.
        </p>
      ),
    },
    {
      q: "The app is not working correctly.",
      a: (
        <p>
          First try a refresh. If the problem continues, log out and log back in.
          If it’s still broken, contact support with steps to reproduce and a
          screenshot if possible.
        </p>
      ),
    },
    {
      q: "Is this product still in beta?",
      a: (
        <p>
          Yes — we’re actively building. Features, workflows, and some UI may
          change as we improve the platform.
        </p>
      ),
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <div className="space-y-6 sm:space-y-10">
      <header className="space-y-2">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-300 hover:text-zinc-400"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-4 text-2xl sm:text-3xl font-semibold text-zinc-300">
          Help Center
        </h1>

        <p className="text-sm sm:text-base text-zinc-300">
          Quick answers and guidance for using Networ.King.
        </p>
      </header>

      {/* 🔥 Quick tip section */}
      <section className="text-sm text-zinc-300 bg-white/5 rounded-xl p-4">
        <p>
          <strong>Quick tip:</strong> if you are new - check the guide above
        </p>
        <button
  onClick={() => setIsGuideOpen(true)}
  className="mt-2 text-amber-200 hover:text-amber-100 underline underline-offset-4"
>
  Small Guide
</button>
      </section>

      <section className="space-y-3 sm:space-y-4">
        {faqs.map((f, idx) => {
          const isOpen = openIndex === idx;

          return (
            <div
              key={idx}
              className="rounded-xl bg-gradient-to-br from-rose-50 to-amber-50 p-[1px]"
            >
              <div className="rounded-xl bg-gradient-to-br from-stone-800 to-amber-950 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left"
                >
                  <h3 className="font-medium text-zinc-200 text-sm sm:text-base">
                    {f.q}
                  </h3>

                  <span
                    className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full border border-amber-200/30 bg-white/5 text-zinc-200"
                    aria-hidden="true"
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 text-sm text-zinc-300 leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Separator */}
      <div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
      </div>

      <section className="text-sm text-zinc-300">
        Still need help?{" "}
        <Link
          href="/contact"
          className="underline underline-offset-4 text-amber-200 hover:text-amber-100"
        >
          Visit the Contact page
        </Link>{" "}
        and send us a message.
      </section>

      {isGuideOpen && (
  <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-16">
   <div className="w-full max-w-2xl max-h-[60vh] bg-stone-900 rounded-xl shadow-lg overflow-hidden border border-amber-400">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <h2 className="text-zinc-200 font-semibold">Small Guide</h2>
        <button
          onClick={() => setIsGuideOpen(false)}
          className="text-zinc-400 hover:text-zinc-200 text-lg"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="p-5 overflow-y-auto max-h-[70vh] text-sm text-zinc-300 whitespace-pre-line leading-relaxed">

{`🚀 Welcome to Networ.King

If you're new, here’s how everything works:

When you register, you land on your dashboard — this is your command center.  
From here you can access chats, rooms (level system), tests, and your profile.

---

💬 CHAT SYSTEM

At the beginning, you are Level 1.

You have access to:
• General chat (everyone is there)  
• Level 1 chat (with subchannels like help, business, friends, etc.)

Most chats are locked 🔒  
To unlock them, you need to level up.

Each level has similar topics, but different people.  
Higher levels = stronger, more active, more serious users.

---

🚪 LEVELING SYSTEM (Rooms)

To level up, go to “Rooms”.

You will see:
• Your current level door (enter your current chats)  
• The next level door → click “Requirements”

Requirements can include:
• Passing tests (IQ, Emotional IQ, etc.)  
• Gaining friends  
• Staying consistent (login streaks)  
• Other achievements  

There are 36 levels in total.

Progression looks like this:
Chat → Locked → Rooms → Requirements → Tests → Level Up → Unlock new chats

---

🧠 TESTS & BADGES

Tests help you level up and earn badges.

Examples:
• IQ test → gives you an IQ badge (score is visible)  
• Emotional/Financial IQ tests  
• Other achievement-based tests  

Starting from Level 2, people can see your scores (IQ, etc.)

Badges:
• Each badge has a score  
• Visible on your profile  
• You can choose up to 3 Featured Badges to represent yourself  

---

⏳ COOLDOWNS & TOKENS

Achievement tests have cooldowns.

Example:
If you pass an IQ test, you must wait before retrying.

You can skip waiting using “Cooldown Tokens” if you want to improve your score.

Cooldown tokens can also be used for features like renaming your account.

Fun tests → no cooldown, can be played anytime.

---

🏆 DAILY LEADERBOARD

Every day there is a new test.

Rules:
• You can try 2 times to compete
• Only your best attempt counts  
• Ranking: Score → Speed → Finish time  
• Top 3 players receive rewards at midnight  

Daily tests are later saved in Fun Tests.

---

👤 PROFILE & IDENTITY

Your profile is visible to others.

People can see:
• Your level  
• Badges (IQ, etc.)  
• Languages (up to 10)  
• Countries  

You can choose up to 3 countries, but 1 MAIN country will be shown next to your name in chat.

You can also set:
• About me  
• Featured badges (top 3 you want to show)

---

🎭 AVATARS

You start with free avatars.

You can:
• Unlock avatars through achievements  
• Buy special avatars in the shop  

New avatars are added regularly — check often.

---

😄 EMOJIS

Each level unlocks new custom emojis.

You get 4 new emojis per level.  
Higher level = more emojis available.

---

🤝 SOCIAL

You can:
• Click on any user  
• View their profile  
• Send friend requests  
• Message them  

---

Start exploring, level up, and unlock your network 🔓`}
      </div>
    </div>
  </div>
)}
    </div>
  );
}