"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white font-sans flex flex-col items-center justify-center relative overflow-hidden p-8">
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

      <motion.div
        className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-3xl w-full relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-4xl font-extrabold text-amber-300 text-center mb-4">
          👑 Terms & Conditions
        </h1>

        <p className="text-gray-200 text-sm text-center mb-8">
          Last updated:{" "}
          <span suppressHydrationWarning>
            {new Date().toLocaleDateString()}
          </span>
        </p>

        <div className="space-y-6 text-gray-100 leading-relaxed max-h-[60vh] overflow-y-auto pr-4">

          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By creating an account or using Networ.King, you agree to be bound
              by these Terms & Conditions. If you do not agree with any part of
              these Terms, you must not use the platform. Your continued use of
              the service confirms your acceptance of the current version of the Terms.
            </p>
          </section>

          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              2. Platform Description
            </h2>
            <p>
              Networ.King is a networking and relationship-building platform
              designed to help users connect based on assessments, badges, and
              profile characteristics. Platform features, scoring systems, and
              access levels may change over time as the product evolves.
              We do not guarantee specific outcomes, matches, or results from use
              of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              3. Account Responsibilities
            </h2>
            <p>
              You are responsible for maintaining accurate account information and
              for safeguarding your login credentials. You are responsible for all
              activity that occurs under your account. You agree not to share your
              access credentials or allow unauthorized use of your account.
              We may suspend or restrict accounts that appear compromised or misused.
            </p>
          </section>

          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              4. Acceptable Use
            </h2>
            <p>
              You agree to use the platform respectfully and lawfully. Harassment,
              hate speech, threats, impersonation, manipulation of test systems,
              attempts to bypass platform restrictions, automated abuse, scraping,
              or illegal activity are strictly prohibited. Violations may result in
              account suspension or permanent removal without notice.
            </p>
          </section>

          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              5. Tests, Scores, Badges, and Levels
            </h2>
            <p>
              Assessments, scores, badges, and levels are provided for platform
              functionality and community structuring purposes only. They are not
              professional, psychological, financial, or medical evaluations.
              We reserve the right to modify scoring methods, badge criteria,
              thresholds, and level access rules at any time.
            </p>
          </section>

          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              6. User Content
            </h2>
            <p>
              You retain ownership of the content you submit to the platform.
              By submitting content, you grant us a limited license to store,
              display, and process it solely for operating and improving the service.
              You are responsible for ensuring you have the right to submit any content you provide.
              We are not responsible for user-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              7. Privacy
            </h2>
            <p>
              Your use of the platform is also governed by our Privacy Policy,
              which explains how we collect and process data. By using the service,
              you acknowledge that you have reviewed the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              8. Service Availability
            </h2>
            <p>
              The platform is under active development. Features may change,
              be added, removed, or interrupted at any time. We do not guarantee
              continuous availability, uptime, or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              9. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Networ.King and its operators
              are not liable for indirect, incidental, or consequential damages,
              loss of opportunities, user disputes, or outcomes resulting from
              platform interactions. Use of the platform and user-to-user
              interactions occur at your own risk.
            </p>
          </section>

          {/* NEW: User interactions */}
          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              9.1 User Interactions
            </h2>
            <p>
              Networ.King enables interactions between users. We do not control,
              verify, or guarantee the identity, intentions, or behavior of any user.
              Any interactions, communications, or transactions with other users
              are at your own risk. We are not responsible for disputes, losses,
              scams, fraud, or misleading behavior between users.
            </p>
          </section>

          {/* NEW: External links */}
          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              9.2 External Links
            </h2>
            <p>
              The platform may contain links to third-party websites or services.
              We are not responsible for the content, accuracy, or practices of
              these external sites. Accessing third-party links is done at your own risk.
            </p>
          </section>

          {/* NEW: Content moderation */}
          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              9.3 Platform Control
            </h2>
            <p>
              We reserve the right (but are not obligated) to monitor, review,
              remove, or restrict content or accounts at our sole discretion,
              especially if they violate these Terms or pose risks to users or the platform.
            </p>
          </section>

          {/* NEW: Payments */}
          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              9.4 Purchases and Payments
            </h2>
            <p>
              Certain features of the platform may require payment. Payments are
              processed through third-party providers such as Stripe. We do not
              store full payment details. All purchases are final unless otherwise
              required by law. We reserve the right to modify pricing at any time.
            </p>
          </section>

          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              10. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate
              these Terms or that pose a risk to the platform or other users.
              We may terminate accounts at our sole discretion.
              You may stop using the platform at any time by discontinuing access.
            </p>
          </section>

          {/* NEW: Age */}
          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              11. Minimum Age
            </h2>
            <p>
              You must be at least 16 years old to use this platform.
              By creating an account, you confirm that you meet this requirement.
            </p>
          </section>

          {/* Renumbered */}
          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              12. Changes to Terms
            </h2>
            <p>
              We may update these Terms periodically. Updated versions will be
              posted on this page with a revised date. Continued use of the
              platform after updates constitutes acceptance of the revised Terms.
            </p>
          </section>

          {/* NEW: Governing law */}
          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              13. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of Belgium. Any disputes shall
              be subject to the jurisdiction of Belgian courts.
            </p>
          </section>

          {/* NEW: Contact */}
          <section>
            <h2 className="text-amber-300 text-xl font-semibold mb-2">
              14. Contact
            </h2>
            <p>
              For any questions regarding these Terms, please contact us via our{" "}
              <Link href="/contact" className="text-amber-300 underline">
                Contact page
              </Link>.
            </p>
          </section>

        </div>

        <div className="text-center mt-8">
          <Link
            href="/register"
            className="inline-block px-6 py-3 bg-amber-400 text-gray-900 font-semibold rounded-lg hover:bg-amber-300 transition-transform transform hover:scale-105"
          >
            Back to Registration
          </Link>
        </div>
      </motion.div>

      <footer className="absolute bottom-6 text-sm text-gray-300">
        © {new Date().getFullYear()} Networ.King
      </footer>
    </main>
  );
}