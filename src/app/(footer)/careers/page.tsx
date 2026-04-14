import Link from "next/link";

export default function CareersPage() {
  const jobsEmail = "contact@networkking.app"; // you will replace later

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-300 hover:text-zinc-400"
      >
        ← Back to dashboard
      </Link>

      <h1 className="text-3xl font-semibold text-zinc-300">Careers</h1>

      <p className="text-zinc-300 leading-relaxed">
        We’re building Networ.King with a small, focused team. Craft, ownership,
        and speed matter here.
      </p>

         {/* Separator */}
        <div className="pt-2">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
        </div>

      <div className="border border-amber-200/30 rounded-xl p-5 bg-white/5">
        <h3 className="font-medium text-zinc-200">Open roles</h3>
        <p className="mt-2 text-sm text-zinc-300">
          Unfortunately we have no open roles right now — but we’re always interested in meeting
          talented people!
        </p>
      </div>

      <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-amber-50 to-rose-50 p-5">
        <h3 className="font-medium mb-1 text-zinc-900">How to apply</h3>

        <p className="text-base mb-1 text-black leading-relaxed">
          Send your CV and the role you&apos;re interested in to{" "}
          <a
            href={`mailto:${jobsEmail}?subject=${encodeURIComponent(
              "Application - [Role Name]"
            )}&body=${encodeURIComponent(
              "Hi,\n\nI’d like to apply for: [Role Name]\n\nHere is my CV:\n[Attach CV]\n\nBest,\n[Your Name]"
            )}`}
            className="underline underline-offset-4 text-red-700 hover:text-black"
          >
            {jobsEmail}
          </a>
          .
        </p>

        <p className="text-xs text-black">
          Tip: Replace <span className="text-green-700">[Role Name]</span> in the
          subject before sending.
        </p>
      </div>

         {/* Separator */}
        <div className="pt-2">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
        </div>
    </div>
  );
}
