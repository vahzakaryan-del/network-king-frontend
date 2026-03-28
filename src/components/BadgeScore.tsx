"use client";

type BadgeScoreUnit = "percent" | "points" | "none";

type Props = {
  badgeUrl?: string;
  score: number;
  size?: number;
  overlayOnly?: boolean;
  unit?: BadgeScoreUnit;
};

export default function BadgeScore({
  badgeUrl,
  score,
  size = 90,
  overlayOnly = false,
  unit = "percent", // default to "percent"
}: Props) {
 

  const getColor = () => {
  if (unit === "percent") {
    if (score < 70) return "text-gray-900 border-gray-900/40 bg-gray-900/10";
    if (score < 95) return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
    return "text-gray-200 border-gray-300/40 bg-gray-200/10";
  } else if (unit === "points") {
    if (score < 20) return "text-white border-gray-900/40 bg-gray-900/10";
    if (score < 60) return "text-gray-900 border-gray-900/40 bg-gray-900/10";
    if (score < 100) return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
    return "text-gray-200 border-gray-300/40 bg-gray-200/10";
  }
  return "text-white border-white/25 bg-white/10"; // fallback for "none"
};


  // Determine the suffix to show based on unit type
const suffix = unit === "percent" ? "%" : "";

  // MODE 1: OVERLAY ONLY (no badge image)
  if (overlayOnly) {
    return (
      <div
        className={`absolute bottom-1 right-1 px-1.5 py-[1px] rounded-md text-[10px] font-bold shadow-xl border backdrop-blur-sm ${getColor()}`}
      >
        {score}{suffix}
      </div>
    );
  }

  // MODE 2: FULL BADGE WITH SCORE
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {badgeUrl && (
        <img
          src={badgeUrl}
          alt="badge"
          className="rounded-xl object-contain"
          style={{ width: size, height: size }}
        />
      )}

      <div
        className={`absolute bottom-1 right-1 px-2 py-1 rounded-full text-sm font-bold shadow-xl border backdrop-blur-sm ${getColor()}`}
      >
        {score}{suffix}
      </div>
    </div>
  );
}
