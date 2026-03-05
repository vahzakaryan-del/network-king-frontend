import Link from "next/link";

function BadgeCard({
  emoji,
  title,
  value,
  hint,
  short,
}: {
  emoji: string;
  title: string;
  value: string;
  hint?: string;
  short?: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-200/70 bg-white/60 backdrop-blur px-4 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-rose-200 to-amber-200 ring-1 ring-amber-200 flex items-center justify-center text-lg">
          {emoji}
        </div>
        <div className="leading-tight">
          <div className="text-sm font-medium text-zinc-700">{title}</div>
          <div className="text-lg font-semibold text-zinc-900">{value}</div>
        </div>
      </div>
      {hint ? <p className="mt-2 text-xs text-zinc-900">{hint}</p> : null}
    </div>
  );
}

function BadgeMini({
  emoji,
  short,
  value,
}: {
  emoji: string;
  short: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200/70 bg-white/60 backdrop-blur px-3 py-2 shadow-sm">
      <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-rose-200 to-amber-200 ring-1 ring-amber-200 flex items-center justify-center text-sm">
        {emoji}
      </div>
      <div className="flex items-baseline gap-2 leading-none">
        <div className="text-sm font-medium text-zinc-700">{short}</div>
        <div className="text-sm font-semibold text-zinc-900">{value}</div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <Link
          href="/dashboard"
          className="inline-flex text-sm text-zinc-300 hover:text-zinc-400"
        >
          ← Back to dashboard
        </Link>

        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-300">
            About Networ.King
          </h1>
         <p className="mt-2 text-zinc-300 hidden sm:block">
            A premium space to meet the right people — not just more people.
          </p>
        </div>
      </header>

      {/* Separator */}
      <div className="">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
      </div>

      <section className="space-y-5 text-zinc-300 leading-relaxed">
        <p>
          Networ.King is a growing platform built to help people expand their
          network and connect with people who truly match their level.
        </p>

        <p>
          With our unique system, users can prove their personal and professional
          qualities by passing different tests and earning badges.
        </p>
       

        {/* Badge examples */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-400"></p>

          {/* Mobile: compact badges side-by-side */}
          <div className="grid grid-cols-3 gap-2 sm:hidden">
            <BadgeMini emoji="🧠" short="IQ" value="175" />
            <BadgeMini emoji="💜" short="EQ" value="117" />
            <BadgeMini emoji="💰" short="FQ" value="99" />
          </div>

          {/* Desktop/tablet: original cards */}
          <div className="hidden sm:grid gap-3 sm:grid-cols-3 ">
            <BadgeCard
              emoji="🧠"
              title="IQ Badge"
              value="IQ 175"
              hint="Analytical strength"
            />
            <BadgeCard
              emoji="💜"
              title="EQ Badge"
              value="EQ 117"
              hint="Emotional intelligence"
            />
            <BadgeCard
              emoji="💰"
              title="FQ Badge"
              value="FQ 99"
              hint="Financial intelligence"
            />
          </div>

          <p className="text-sm font-medium text-zinc-400"></p>

          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs text-black max-w-full flex-wrap">

            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Badges shown are examples — real badges are earned through tests.
          </div>
        </div>

        <p>
          Based on your results, you can move up through platform levels. Higher
          levels unlock access to more advanced communities and opportunities,
          including spaces reserved for users with higher IQ, emotional
          intelligence, and financial intelligence scores.
        </p>

        {/* Highlighted statement */}
        <div className="rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50 to-amber-50 p-5">
          <p className="font-medium text-zinc-900">
            You can find anything from professional connections to real long-term
            friendships here, and build stronger relationships with less
            friction.
          </p>
        </div>

        {/* Separator */}
        <div className="pt-2">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
        </div>

        <p className="text-zinc-300">
          We’re currently in active development. Features and workflows may
          change as we improve the platform based on user feedback. Stay tuned
          to not miss new features and daily updates.
        </p>
      </section>
    </div>
  );
}
