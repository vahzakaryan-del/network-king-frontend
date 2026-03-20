export default function FooterPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen text-amber-50 relative overflow-hidden">
      {/* Dark creamy base */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-800 via-neutral-900 to-amber-950" />

      {/* Warm golden glow accents */}
      <div className="absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-amber-600/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-rose-500/20 blur-3xl" />

      {/* Content */}
      <div className="relative max-w-3xl mx-auto px-3 sm:px-6 py-10 sm:py-14">
        <div className="rounded-3xl bg-gradient-to-br from-stone-800/90 to-amber-900/60 backdrop-blur border border-amber-700/40 shadow-2xl shadow-amber-900/40 p-4 sm:p-8 md:p-10">
          {children}
        </div>
      </div>
    </main>
  );
}
