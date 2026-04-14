"use client";

import Link from "next/link";
import { useState } from "react";

export default function PrivacyPage() {
  const lastUpdated = "2026-04-14";

  const sections: Array<{ title: string; content: React.ReactNode }> = [
    {
      title: "1. Information We Collect",
      content: (
        <div className="space-y-3">
          <p>
            We collect information necessary to operate the platform and provide
            core functionality.
          </p>

          <div className="space-y-2">
            <p className="font-medium text-zinc-200">Information you provide directly</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account information (such as name and email address)</li>
              <li>Profile information you choose to add</li>
              <li>Test and assessment results</li>
              <li>Badge and level data</li>
              <li>Messages you send through contact forms</li>
              <li>Any other content you submit within the platform</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-zinc-200">Information generated through platform use</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account activity and feature usage</li>
              <li>Progress, scores, and badge achievements</li>
              <li>Platform interaction data necessary for system operation</li>
            </ul>
          </div>
        </div>
      ),
    },

    // NEW
    {
      title: "2. Legal Basis for Processing",
      content: (
        <div className="space-y-3">
          <p>We process personal data only where necessary and in accordance with applicable laws.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To perform our contract with you (providing the platform)</li>
            <li>To comply with legal obligations</li>
            <li>For legitimate interests such as maintaining security and improving the service</li>
          </ul>
        </div>
      ),
    },

    {
      title: "3. Authentication and Session Data",
      content: (
        <div className="space-y-3">
          <p>
            To keep you logged in and maintain secure sessions, we use browser
            storage technologies (such as localStorage or similar mechanisms).
          </p>
          <p>These are required for authentication and platform functionality.</p>
          <p>
            We may introduce cookie-based session handling in the future as the
            platform evolves.
          </p>
        </div>
      ),
    },

    {
      title: "4. How We Use Your Information",
      content: (
        <div className="space-y-3">
          <p>We use collected information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide and operate the platform</li>
            <li>Create and manage user accounts</li>
            <li>Store badge, test, and level results</li>
            <li>Enable networking and matching features</li>
            <li>Maintain platform security</li>
            <li>Respond to support requests</li>
            <li>Improve product features and reliability</li>
          </ul>
          <p className="font-medium text-zinc-200">We do not sell personal data.</p>
        </div>
      ),
    },

    {
      title: "5. Data Storage",
      content: (
        <div className="space-y-3">
          <p>
            User data is stored in our application database infrastructure.
          </p>
          <p>We take reasonable technical and organizational measures to protect stored data.</p>
          <p>Access to production data is restricted to authorized personnel only.</p>
        </div>
      ),
    },

    {
      title: "6. Email Communications",
      content: (
        <div className="space-y-3">
          <p>Currently, we do not send regular user emails.</p>
          <p>In the future, we may send:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account-related notifications</li>
            <li>Security messages</li>
            <li>Important service updates</li>
            <li>Transactional emails (such as verification or password reset)</li>
          </ul>
          <p>
            If introduced, such emails will be strictly service-related unless
            you explicitly opt into optional communications.
          </p>
        </div>
      ),
    },

    {
      title: "7. Analytics",
      content: (
        <div className="space-y-3">
          <p>We do not currently use third-party analytics or tracking systems.</p>
          <p>
            We may introduce privacy-respecting analytics tools in the future.
          </p>
        </div>
      ),
    },

    // UPDATED
    {
      title: "8. Third-Party Service Providers",
      content: (
        <div className="space-y-3">
          <p>We may use trusted third-party providers to operate the platform, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Hosting and infrastructure providers</li>
            <li>Authentication providers (such as Google)</li>
            <li>Payment processors (such as Stripe)</li>
            <li>Email delivery services</li>
          </ul>
          <p>
            These providers process data only as necessary to deliver their
            services and are not permitted to use it for unrelated purposes.
          </p>
        </div>
      ),
    },

    {
      title: "9. Data Sharing",
      content: (
        <div className="space-y-3">
          <p>We do not sell or rent personal information.</p>
          <p>We may share limited data only when necessary:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To operate required infrastructure services</li>
            <li>To comply with legal obligations</li>
            <li>To protect platform security and integrity</li>
            <li>To enforce our terms and policies</li>
          </ul>
        </div>
      ),
    },

    {
      title: "10. Data Retention",
      content: (
        <div className="space-y-3">
          <p>
            We retain user data while accounts remain active and as long as
            necessary to provide platform services.
          </p>
          <p>
            Users may delete their account, which removes associated personal data.
          </p>
          <p>
            Some minimal records may be retained where legally required or
            necessary for security and fraud prevention.
          </p>
        </div>
      ),
    },

    {
      title: "11. Security Measures",
      content: (
        <div className="space-y-3">
          <p>We implement reasonable safeguards to protect user data.</p>
          <p>No system can guarantee absolute security.</p>
        </div>
      ),
    },

    {
      title: "12. Children’s Privacy",
      content: (
        <div className="space-y-3">
          <p>The platform is not intended for users under 16 years of age.</p>
        </div>
      ),
    },

    // UPDATED (important)
    {
      title: "13. Your Rights",
      content: (
        <div className="space-y-3">
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Request a copy of your data</li>
            <li>Object to certain types of processing</li>
          </ul>
          <p>
            You may exercise these rights by contacting us through the Contact page.
          </p>
        </div>
      ),
    },

    {
      title: "14. International Processing",
      content: (
        <div className="space-y-3">
          <p>
            Data may be processed by infrastructure providers in different countries.
            We select reputable providers with appropriate safeguards.
          </p>
        </div>
      ),
    },

    {
      title: "15. Changes to This Policy",
      content: (
        <div className="space-y-3">
          <p>
            We may update this Privacy Policy. Updates will be posted with a revised date.
          </p>
        </div>
      ),
    },

    // NEW (important)
    {
      title: "16. Data Controller",
      content: (
        <div className="space-y-3">
          <p>
            Networ.King is operated by its owner based in Belgium and acts as the data controller
            for personal data processed through the platform.
          </p>
        </div>
      ),
    },

    {
      title: "17. Contact",
      content: (
        <div className="space-y-3">
          <p>
            For privacy questions or data requests, please use our{" "}
            <Link href="/contact" className="underline">
              Contact page
            </Link>.
          </p>
        </div>
      ),
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-6 sm:space-y-10">
      <header className="space-y-3">
        <Link href="/dashboard" className="text-sm text-zinc-300 hover:text-zinc-400">
          ← Back to dashboard
        </Link>

        <h1 className="mt-4 text-2xl sm:text-3xl font-semibold text-zinc-300">
          Privacy Policy
        </h1>

        <div className="rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50 to-amber-50 p-4 sm:p-5">
          <p className="text-sm sm:text-base text-zinc-900 font-medium">
            This Privacy Policy explains how Networ.King collects, uses, and protects your data.
          </p>
          <p className="mt-1 text-xs sm:text-sm text-zinc-700">
            Last updated: <span className="font-medium">{lastUpdated}</span>
          </p>
        </div>
      </header>

      <section className="space-y-3 sm:space-y-4">
        {sections.map((s, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className="border border-amber-200/30 rounded-xl bg-white/5 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left"
              >
                <h2 className="font-medium text-zinc-200 text-sm sm:text-base">
                  {s.title}
                </h2>

                <span className="h-8 w-8 rounded-full border border-amber-200/30 bg-white/5 flex items-center justify-center text-zinc-200">
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 text-sm text-zinc-300 leading-relaxed">
                  {s.content}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="text-sm text-zinc-300">
        Questions?{" "}
        <Link
          href="/contact"
          className="underline underline-offset-4 text-amber-200 hover:text-amber-100"
        >
          Contact us
        </Link>
        .
      </div>
    </div>
  );
}