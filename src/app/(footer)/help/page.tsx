"use client";

import Link from "next/link";
import { useState } from "react";

export default function HelpPage() {
  const faqs = [
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

      <section className="space-y-3 sm:space-y-4">
        {faqs.map((f, idx) => {
          const isOpen = openIndex === idx;

          return (
            <div
  key={idx}
  className="rounded-xl bg-gradient-to-br from-rose-50 to-amber-50 p-[1px]"
>      <div className="rounded-xl bg-gradient-to-br from-stone-800  to-amber-950 overflow-hidden">
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
            </div> </div>
          );
        })}
      </section>
      {/* Separator */}
      <div className="">
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
    </div>
  );
}
