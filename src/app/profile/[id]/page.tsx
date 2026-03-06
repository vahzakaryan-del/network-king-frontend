"use client";

// ---------------------------------------------
// Imports
// ---------------------------------------------
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

import BadgeScore from "@/components/BadgeScore";
import CountryPicker from "@/components/CountryPicker";

// ---------------------------------------------
// Small helper to render a flag via CDN
// ---------------------------------------------
const FlagIcon = ({ code }: { code: string }) => (
  <img
    src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`}
    alt={code}
    className="inline-block rounded-sm shadow-sm"
    style={{ width: "1.35em", height: "1em", objectFit: "cover" }}
  />
);

// ---------------------------------------------
// Types
// ---------------------------------------------
type ProfileBadge = {
  id: number;
  name: string;
  rarity: string;
  icon: string;
  earnedAt?: string | Date;
  badgeScore?: number | null;
  badgeScoreColor?: string | null;
  badgeScoreUnit?: "percent" | "points" | null;
};

type MockProfile = {
  id: number;
  name: string;
  avatar: string;
  country: string;
  countries?: string[];
  mainCountry?: string | null;
  level: number;
  badges: ProfileBadge[];
  proBadges: { id: number; label: string; score: number; icon: string }[];
  externalLinks?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };
  selectedTalisman?: string | null;
  representation: { emoji: string; label: string };
  about?: string | null;
  languages?: string[];
  featuredBadges?: ProfileBadge[]; // ✅ selected badges (max 3)
};

type Entitlements = {
  cooldownSkipTokens: number;
  isPremium?: boolean;
  premiumUntil?: string | null;
  tombolaDailyLimit?: number;
};


// ---------------------------------------------
// Mock data
// ---------------------------------------------
const mockProfile: MockProfile = {
  id: 1,
  name: "Alex Mercer",
  avatar: "/avatar-placeholder.png",
  country: "🌍",
  level: 7,
  about: "",
  selectedTalisman: null,
  languages: [],
  featuredBadges: [],

  badges: [
    { id: 1, name: "Early Supporter", rarity: "gold", icon: "🏵️" },
    { id: 2, name: "Network Builder", rarity: "silver", icon: "🤝" },
    { id: 3, name: "Master Connector", rarity: "legendary", icon: "👑" },
  ],
  proBadges: [
    { id: 10, label: "IQ", score: 128, icon: "🧠" },
    { id: 11, label: "EQ", score: 95, icon: "💞" },
    { id: 12, label: "Social", score: 89, icon: "📣" },
  ],
  externalLinks: {
    linkedin: "",
    facebook: "",
    instagram: "",
    website: "",
  },
  representation: { emoji: "🧠", label: "Mind" },
};

// ---------------------------------------------
// Components
// ---------------------------------------------
function IdCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 bg-white/10 backdrop-blur-md shadow-2xl border border-amber-300/40">
      {/* Animated frame */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent [background:linear-gradient(45deg,#ffd700,#7c3aed,#22d3ee)_border-box] [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude] opacity-50" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ---------------------------------------------
// ✅ Connect Popover: Portal + fixed positioning (to escape transforms/overflow)
// ---------------------------------------------
function ConnectPopover({
  open,
  onClose,
  anchorRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;

    const el = anchorRef.current;
    if (!el) return;

    const MENU_W = 320;

    const update = () => {
      const r = el.getBoundingClientRect();

      // top always follows the button (works for both)
      const top = r.bottom + 12;

      // on desktop, compute anchored left
      let left = r.right - MENU_W;
      left = Math.max(12, Math.min(left, window.innerWidth - MENU_W - 12));

      setPos({ top, left });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef]);

  if (!mounted || !open || !pos) return null;

  return createPortal(
    <>
      {/* click-away overlay */}
      <button
        className="fixed inset-0 z-[9998] bg-transparent"
        onClick={onClose}
        aria-label="Close connect popover"
      />

      {/* ✅ popover: full width on mobile, anchored on desktop */}
      <div
        className="
          fixed z-[9999]
          w-[92vw] sm:w-[320px]
          left-1/2 sm:left-auto
          -translate-x-1/2 sm:translate-x-0
          rounded-2xl bg-slate-950/80 border border-white/15 shadow-2xl backdrop-blur p-4
        "
        style={{
          top: pos.top,
          // on desktop we use computed left, on mobile we center with left-1/2
          left: typeof window !== "undefined" && window.innerWidth >= 640 ? pos.left : undefined,
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}


// ---------------------------------------------
// Page
// ---------------------------------------------
export default function ProfilePage() {

  const API_BASE = process.env.NEXT_PUBLIC_API_URL!;
  // ----------------------------
  // Router / Params
  // ----------------------------
  const router = useRouter();
  const params = useParams();
  const profileId = String(params?.id || "");

  //buying
  const [pendingPurchase, setPendingPurchase] = useState<{
  id: number;
  quantity: number;
  amountCents: number;
  currency: string;
} | null>(null);

const [confirmBusy, setConfirmBusy] = useState(false);

const [selectedPack, setSelectedPack] = useState<number | null>(null);

const PACK_PRICES: Record<number, { amountCents: number; currency: string }> = {
  3: { amountCents: 399, currency: "EUR" },
  5: { amountCents: 599, currency: "EUR" },
  10: { amountCents: 999, currency: "EUR" },
};

const selectedPrice = selectedPack ? PACK_PRICES[selectedPack] : null;


  // ----------------------------
  // Core UI state
  // ----------------------------
  const [isSelf, setIsSelf] = useState(false);
  const [profile, setProfile] = useState<MockProfile>(mockProfile);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // ----------------------------
  // Countries
  // ----------------------------
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySaving, setCountrySaving] = useState(false);
  const [countryError, setCountryError] = useState<string | null>(null);

  //// scroll to talisman (mobile arrow)
const talismanRef = useRef<HTMLDivElement>(null);

// About collapse (mobile)
const [aboutExpanded, setAboutExpanded] = useState(false);

// simple heuristic to decide if we show "Show more"
const aboutText = (profile.about ?? "").trim();
const aboutLong = aboutText.length > 140; // adjust if you want

//rename tokens

const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
const refreshEntitlements = async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/entitlements`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) setEntitlements(data as Entitlements);
  } catch {
    // ignore
  }
};
 
const tokenCount = entitlements?.cooldownSkipTokens ?? 0;
// ✅ Buy tokens modal
const [buyTokensOpen, setBuyTokensOpen] = useState(false);
const [buyTokensBusy, setBuyTokensBusy] = useState(false);
const [buyTokensError, setBuyTokensError] = useState<string | null>(null);



//RENAME feature

  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // for cooldown UX:
const [nameCooldown, setNameCooldown] = useState<{
  remainingDays: number;
  nextNameChangeAt?: string;
} | null>(null);
// ✅ shows a green success message after token use (without closing the rename UI)
const [nameCooldownCleared, setNameCooldownCleared] = useState(false);


 const openNameEdit = () => {
  setNameDraft(profile.name || "");
  setNameError(null);
  setNameCooldown(null);
  setNameCooldownCleared(false);
  setNameEditing(true);
};


  const cancelNameEdit = () => {
  setNameEditing(false);
  setNameError(null);
  setNameCooldown(null);
  setNameCooldownCleared(false);
  setNameDraft("");
};


  const saveName = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setNameError("Not logged in.");
      return;
    }

    setNameSaving(true);
    setNameError(null);
    setNameCooldown(null);
    setNameCooldownCleared(false);


    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/name`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: nameDraft.trim() }),

      });
const data = await res.json().catch(() => ({}));

if (!res.ok) {
  if (data?.error === "Name change on cooldown") {
    setNameCooldown({
      remainingDays: Number(data.remainingDays) || 0,
      nextNameChangeAt: data.nextNameChangeAt
        ? new Date(data.nextNameChangeAt).toLocaleString()
        : undefined,
    });
    return;
  }

  if (data?.error === "New name must be different.") {
  setNameError("New name must be different.");
  return;
}
if (data?.error === "Name is unchanged.") {
  setNameError("Name is unchanged.");
  return;
}



  throw new Error(data?.error || "Failed to update name.");
}


      setProfile((prev) => ({ ...prev, name: data.user?.name ?? nameDraft.trim() }));
      setNameEditing(false);
    } catch (e: any) {
      setNameError(e?.message || "Failed to update name.");
    } finally {
      setNameSaving(false);
    }
  };



  // ----------------------------
  // Friends / Connection UI
  // ----------------------------
  type FriendUIStatus = "loading" | "friends" | "incoming" | "outgoing" | "none";

  const [connectOpen, setConnectOpen] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendUIStatus>("none");
  const [friendBusy, setFriendBusy] = useState(false);

  const connectBtnRef = useRef<HTMLButtonElement>(null);

  const refreshFriendStatus = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setFriendStatus("loading");

    try {
      // 1) friends list
      const fRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fData = await fRes.json().catch(() => ({}));
      const friends = fData.friends || [];

      if (friends.some((f: any) => String(f.id) === String(profileId))) {
        setFriendStatus("friends");
        return;
      }

      // 2) requests
      const rRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rData = await rRes.json().catch(() => ({}));

      const incoming = rData.incoming || [];
      const outgoing = rData.outgoing || [];

      // incoming: someone sent you request
      if (incoming.some((r: any) => String(r.from?.id) === String(profileId))) {
        setFriendStatus("incoming");
        return;
      }

      // outgoing: you sent request already
      if (outgoing.some((r: any) => String(r.to?.id) === String(profileId))) {
        setFriendStatus("outgoing");
        return;
      }

      setFriendStatus("none");
    } catch {
      setFriendStatus("none");
    }
  };

  //RENAME TOKENS CONSUME


const nameInputRef = useRef<HTMLInputElement | null>(null);
useEffect(() => {
  if (nameEditing && nameInputRef.current) {
    nameInputRef.current.focus();
    nameInputRef.current.select();
  }
}, [nameEditing]);

useEffect(() => {
  if (!editMode) {
    setNameEditing(false);
    setNameError(null);
    setNameCooldown(null);
    setNameCooldownCleared(false);

  }
}, [editMode]);

const skipNameCooldown = async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  setNameSaving(true);
  setNameError(null);

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/name/skip-cooldown`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNameError(data?.error || "Failed to accelerate name change.");
      return;
    }

    // ✅ Update tokens immediately
    await refreshEntitlements();

    // ✅ Clear cooldown UI and show success message (no auto-save, no closing)
    setNameCooldown(null);
    setNameCooldownCleared(true);

    // optional: keep focus on the input so user can immediately type
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  } finally {
    setNameSaving(false);
  }
};

const createTokenPurchase = async (quantity: number) => {
  const token = localStorage.getItem("token");
  if (!token) {
    setBuyTokensError("Not logged in.");
    return;
  }

  setBuyTokensBusy(true);
  setBuyTokensError(null);

  try {
   const checkoutRes = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/payments/checkout/token-pack`,
  {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity }),
      }
    );

    const checkoutData = await checkoutRes.json().catch(() => ({}));
    if (!checkoutRes.ok) {
      setBuyTokensError(checkoutData?.error || "Checkout failed.");
      return;
    }

    const p = checkoutData?.purchase;
    if (!p?.id) {
      setBuyTokensError("Checkout did not return purchase id.");
      return;
    }

    // ✅ now we have a pending purchase to validate
    setPendingPurchase({
      id: p.id,
      quantity: p.quantity,
      amountCents: p.amountCents,
      currency: p.currency || "EUR",
    });
  } finally {
    setBuyTokensBusy(false);
  }
};

const confirmDevPayment = async () => {
  const token = localStorage.getItem("token");
  if (!token || !pendingPurchase) return;

  setConfirmBusy(true);
  setBuyTokensError(null);

  try {
    const fulfillRes = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/dev/purchases/${pendingPurchase.id}/mark-paid`,
  {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const fulfillData = await fulfillRes.json().catch(() => ({}));
    if (!fulfillRes.ok) {
      setBuyTokensError(fulfillData?.error || "Failed to confirm payment (dev).");
      return;
    }

    await refreshEntitlements();
    setBuyTokensOpen(false);
setSelectedPack(null);
setPendingPurchase(null);
setBuyTokensError(null);

  } finally {
    setConfirmBusy(false);
  }
};
const fmtMoney = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    (cents || 0) / 100
  );


  // ----------------------------
  // About
  // ----------------------------
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutDraft, setAboutDraft] = useState("");
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutError, setAboutError] = useState<string | null>(null);

  // ----------------------------
  // External Links (socials)
  // ----------------------------
  type ExternalLinks = {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };

  const [linksOpen, setLinksOpen] = useState(false);
  const [linksDraft, setLinksDraft] = useState<ExternalLinks>({
    linkedin: "",
    facebook: "",
    instagram: "",
    website: "",
  });
  const [linksSaving, setLinksSaving] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);

  const openLinks = () => {
    const cur = profile.externalLinks || {};
    setLinksDraft({
      linkedin: cur.linkedin || "",
      facebook: cur.facebook || "",
      instagram: cur.instagram || "",
      website: cur.website || "",
    });
    setLinksError(null);
    setLinksOpen(true);
  };

  const normalizeUrl = (raw: string) => {
    const s = (raw || "").trim();
    if (!s) return "";
    // allow user to paste without https://
    if (/^https?:\/\//i.test(s)) return s;
    return `https://${s}`;
  };

  const saveLinks = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLinksError("Not logged in.");
      return;
    }

    setLinksSaving(true);
    setLinksError(null);

    try {
      const payload: ExternalLinks = {
        linkedin: normalizeUrl(linksDraft.linkedin || ""),
        facebook: normalizeUrl(linksDraft.facebook || ""),
        instagram: normalizeUrl(linksDraft.instagram || ""),
        website: normalizeUrl(linksDraft.website || ""),
      };

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ externalLinks: payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save links.");

      setProfile((prev) => ({ ...prev, externalLinks: payload }));
      setLinksOpen(false);
    } catch (e: any) {
      setLinksError(e?.message || "Failed to save links.");
    } finally {
      setLinksSaving(false);
    }
  };

  // ----------------------------
  // Visitor warning modal
  // ----------------------------
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveUrl, setLeaveUrl] = useState("");
  const [leaveLabel, setLeaveLabel] = useState("");

  const requestLeave = (label: string, url: string) => {
    setLeaveLabel(label);
    setLeaveUrl(url);
    setLeaveOpen(true);
  };

  const confirmLeave = () => {
    if (leaveUrl) window.open(leaveUrl, "_blank", "noopener,noreferrer");
    setLeaveOpen(false);
  };

  // ----------------------------
  // Featured Badges (max 3)
  // ----------------------------
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [featuredDraft, setFeaturedDraft] = useState<number[]>([]);
  const [featuredSaving, setFeaturedSaving] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [myAllBadges, setMyAllBadges] = useState<ProfileBadge[]>([]);

  const openFeatured = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setFeaturedError("Not logged in.");
      return;
    }

    setFeaturedError(null);

    try {
      // fetch "me" to get full badge list + existing featured selection
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load badges.");

      const user = data.user || data;

      const all: ProfileBadge[] = Array.isArray(user.badges) ? user.badges : [];
      setMyAllBadges(all);

      // featured can come as objects or ids, normalize to ids
      const featuredIds: number[] = Array.isArray(user.featuredBadges)
        ? user.featuredBadges.map((b: any) =>
            typeof b === "object" ? b.id : b
          )
        : [];

      setFeaturedDraft(featuredIds.slice(0, 3));
      setFeaturedOpen(true);
    } catch (e: any) {
      setFeaturedError(e?.message || "Failed to load featured badges.");
      setFeaturedOpen(true); // still open modal to show error
    }
  };

  const toggleFeatured = (id: number) => {
    setFeaturedDraft((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const saveFeatured = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setFeaturedError("Not logged in.");
      return;
    }

    setFeaturedSaving(true);
    setFeaturedError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/featured-badges`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selected: featuredDraft }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error || "Failed to save featured badges.");

      // Update local profile.featuredBadges immediately (so UI updates without refresh)
      const featuredObjects = myAllBadges.filter((b) =>
        featuredDraft.includes(b.id)
      );
      // preserve order of featuredDraft
      const ordered = featuredDraft
        .map((id) => featuredObjects.find((b) => b.id === id))
        .filter(Boolean) as ProfileBadge[];

      setProfile((prev) => ({ ...prev, featuredBadges: ordered }));
      setFeaturedOpen(false);
    } catch (e: any) {
      setFeaturedError(e?.message || "Failed to save featured badges.");
    } finally {
      setFeaturedSaving(false);
    }
  };

  // ----------------------------
  // Talismans
  // ----------------------------

  const rarityGlow: Record<string, string> = {
  common: "drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]",
  rare: "drop-shadow-[0_0_35px_rgba(59,130,246,0.5)]",
  epic: "drop-shadow-[0_0_45px_rgba(168,85,247,0.6)]",
  legendary: "drop-shadow-[0_0_55px_rgba(251,191,36,0.7)]",
};
  const TALISMANS = [
  {
    key: "mind",
    label: "Mind",
    image: `${API_BASE}/talismans/mind.webp`,
    desc: "Strategy, Logic, Focus",
    rarity: "legendary",
  },
  {
    key: "heart",
    label: "Heart",
    image: `${API_BASE}/talismans/heart.webp`,
    desc: "Empathy, Kindness, Trust",
    rarity: "epic",
  },
  {
    key: "crown",
    label: "Crown",
    image: `${API_BASE}/talismans/crown.webp`,
    desc: "Status, Achievement, Recognition",
    rarity: "epic",
  },
  {
    key: "shield",
    label: "Shield",
    image: `${API_BASE}/talismans/shield.webp`,
    desc: "Loyalty, Reliability, Defense",
    rarity: "legendary",
  },
   {
    key: "magnet",
    label: "Magnet",
    image: `${API_BASE}/talismans/magnet.webp`,
    desc: "Luck, Attraction, Communication",
    rarity: "rare",
  },
  {
    key: "flame",
    label: "Flame",
    image: `${API_BASE}/talismans/flame.webp`,
    desc: "Ambition, Energy, Passion",
    rarity: "common",
  },
];

  const [talismanOpen, setTalismanOpen] = useState(false);
  const [talismanSaving, setTalismanSaving] = useState(false);
  const [talismanError, setTalismanError] = useState<string | null>(null);
  const [talismanDraft, setTalismanDraft] = useState<string>("");

  const openTalisman = () => {
    setTalismanDraft(profile.selectedTalisman || "");
    setTalismanError(null);
    setTalismanOpen(true);
  };

  const saveTalisman = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setTalismanError("Not logged in.");
      return;
    }

    setTalismanSaving(true);
    setTalismanError(null);

    try {
      const payload = talismanDraft.trim() ? talismanDraft.trim() : null;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedTalisman: payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save talisman.");

      setProfile((prev) => ({ ...prev, selectedTalisman: payload }));
      setTalismanOpen(false);
    } catch (e: any) {
      setTalismanError(e?.message || "Failed to save talisman.");
    } finally {
      setTalismanSaving(false);
    }
  };

  const activeTalisman =
    TALISMANS.find((t) => t.key === (profile.selectedTalisman || "")) || null;

  // ----------------------------
  // Languages (max 10)
  // ----------------------------
  const ALL_LANGUAGES = [
    "Arabic",
    "Bulgarian",
    "Chinese",
    "Croatian",
    "Czech",
    "Danish",
    "Dutch",
    "English",
    "Estonian",
    "Finnish",
    "French",
    "German",
    "Greek",
    "Hebrew",
    "Hindi",
    "Hungarian",
    "Indonesian",
    "Italian",
    "Japanese",
    "Korean",
    "Latvian",
    "Lithuanian",
    "Norwegian",
    "Polish",
    "Portuguese",
    "Romanian",
    "Russian",
    "Serbian",
    "Slovak",
    "Slovenian",
    "Spanish",
    "Swedish",
    "Thai",
    "Turkish",
    "Ukrainian",
    "Vietnamese",
  ];

  const [langOpen, setLangOpen] = useState(false);
  const [langQuery, setLangQuery] = useState("");
  const [langDraft, setLangDraft] = useState<string[]>([]);
  const [langSaving, setLangSaving] = useState(false);
  const [langError, setLangError] = useState<string | null>(null);

  const openLanguages = () => {
    setLangDraft(Array.isArray(profile.languages) ? profile.languages : []);
    setLangQuery("");
    setLangError(null);
    setLangOpen(true);
  };

  const toggleLanguage = (lang: string) => {
    setLangDraft((prev) => {
      const exists = prev.includes(lang);
      if (exists) return prev.filter((x) => x !== lang);
      if (prev.length >= 10) return prev; // enforce max 10
      return [...prev, lang];
    });
  };

  const saveLanguages = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLangError("Not logged in.");
      return;
    }

    setLangSaving(true);
    setLangError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ languages: langDraft }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save languages.");

      setProfile((prev) => ({ ...prev, languages: langDraft }));
      setLangOpen(false);
    } catch (e: any) {
      setLangError(e?.message || "Failed to save languages.");
    } finally {
      setLangSaving(false);
    }
  };

  // ----------------------------
  // About actions
  // ----------------------------
  const openAbout = () => {
    setAboutDraft(profile.about ?? "");
    setAboutError(null);
    setAboutOpen(true);
  };

  const saveAbout = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAboutError("Not logged in.");
      return;
    }

    setAboutSaving(true);
    setAboutError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ about: aboutDraft.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save About.");

      setProfile((prev) => ({ ...prev, about: aboutDraft.trim() }));
      setAboutOpen(false);
    } catch (e: any) {
      setAboutError(e?.message || "Failed to save About.");
    } finally {
      setAboutSaving(false);
    }
  };

  // ----------------------------
  // Profile load / merge backend data into mock profile
  // ----------------------------
  useEffect(() => {
    const myId = localStorage.getItem("userId");
    setIsSelf(myId === profileId);

    

    const token = localStorage.getItem("token");

    
    if (!token) {
      // still show mock but with correct id
      setProfile((prev) => ({ ...prev, id: Number(profileId) || prev.id }));
      setLoading(false);
      return;
    }

    (async () => {
      try {
       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/${profileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        

        await refreshEntitlements();

        // If backend returns an error or no id, keep mock but set id
        if (!res.ok || !data?.id) {
          setProfile((prev) => ({ ...prev, id: Number(profileId) || prev.id }));
          setLoading(false);
          return;
        }

        // Map backend badges → your badge shape (use emoji fallback if icon missing)
        const mappedBadges =
          Array.isArray(data.badges) && data.badges.length > 0
            ? data.badges.map((b: any) => ({
                id: b.id,
                name: b.name,
                rarity: b.rarity,
                icon: b.icon || "🏅",
                earnedAt: b.earnedAt,
                badgeScore: b.badgeScore ?? null,
                badgeScoreColor: b.badgeScoreColor ?? "white",
                badgeScoreUnit: b.badgeScoreUnit ?? "percent",
              }))
            : [];

        const mappedFeaturedBadges =
          Array.isArray(data.featuredBadges) && data.featuredBadges.length > 0
            ? data.featuredBadges.map((b: any) => ({
                id: b.id,
                name: b.name,
                rarity: b.rarity,
                icon: b.icon || "🏅",
                earnedAt: b.earnedAt,
                badgeScore: b.badgeScore ?? null,
                badgeScoreColor: b.badgeScoreColor ?? "white",
                badgeScoreUnit: b.badgeScoreUnit ?? "percent",
              }))
            : [];

        // 🧠 Normalize countries data (string or array)
        let parsedCountries: string[] = [];
        if (data.countries) {
          try {
            const maybeArr = JSON.parse(data.countries);
            if (Array.isArray(maybeArr)) parsedCountries = maybeArr;
            else if (typeof data.countries === "string")
              parsedCountries = data.countries
                .split(",")
                .map((x: string) => x.trim());
          } catch {
            if (typeof data.countries === "string")
              parsedCountries = data.countries
                .split(",")
                .map((x: string) => x.trim());
          }
        }

        // 🗣️ Normalize languages (string JSON or array)
        let parsedLanguages: string[] = [];
        if (data.languages) {
          try {
            const maybeArr =
              typeof data.languages === "string"
                ? JSON.parse(data.languages)
                : data.languages;

            if (Array.isArray(maybeArr))
              parsedLanguages = maybeArr.filter(Boolean).map(String);
            else if (typeof data.languages === "string") {
              parsedLanguages = data.languages
                .split(",")
                .map((x: string) => x.trim())
                .filter(Boolean);
            }
          } catch {
            if (typeof data.languages === "string") {
              parsedLanguages = data.languages
                .split(",")
                .map((x: string) => x.trim())
                .filter(Boolean);
            }
          }
        }

        setProfile((prev) => ({
          ...prev,
          id: data.id ?? prev.id,
          name: data.name ?? prev.name,
          avatar: data.avatar || "/avatar-placeholder.png",
          countries: parsedCountries,
          mainCountry: data.mainCountry || parsedCountries[0] || null,
          country: parsedCountries.join(", "),
          badges: mappedBadges,
          about: data.about ?? prev.about ?? "",
          languages: parsedLanguages,
          externalLinks: data.externalLinks ?? prev.externalLinks ?? {},
          selectedTalisman: data.selectedTalisman ?? prev.selectedTalisman ?? null,
          featuredBadges: mappedFeaturedBadges,
        }));
      } catch (e) {
        // On error, keep mock but correct id
        setProfile((prev) => ({ ...prev, id: Number(profileId) || prev.id }));
      } finally {
        setLoading(false);
      }
    })();
  }, [profileId]);

  // ----------------------------
  // Animations / computed
  // ----------------------------
  const fade = useMemo(
    () => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }),
    []
  );

  // ----------------------------
  // Loading state
  // ----------------------------
  if (loading) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center">
        Loading profile...
      </main>
    );
  }

  // ----------------------------
  // Render (Part 1 ends mid-render)
  // ----------------------------
  return (
    <main className="min-h-screen text-white bg-gradient-to-br from-blue-950 via-indigo-900 to-amber-500/40 relative overflow-hidden">
      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-6 flex items-center justify-between">
        <ConnectPopover
  open={connectOpen && !isSelf}
  onClose={() => setConnectOpen(false)}
  anchorRef={connectBtnRef}
>
  {/* --- YOUR EXISTING POPUP CONTENT (UNCHANGED) START --- */}
  <div className="flex items-center justify-between mb-3">
    <div className="text-sm font-bold text-white/90">Connection</div>
    <button
      onClick={() => setConnectOpen(false)}
      className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/10"
    >
      ✕
    </button>
  </div>

  <div className="grid grid-cols-2 gap-3">


    {/* LEFT HALF: friend status */}
<div className="rounded-xl bg-white/5 border border-white/10 p-3">
  <div className="text-xs text-white/60 mb-2">Friend status</div>

  {friendStatus === "loading" ? (
    <div className="text-sm text-white/80">Checking…</div>
  ) : friendStatus === "friends" ? (
    <div className="text-sm text-emerald-200 font-semibold">✅ You are friends</div>
  ) : friendStatus === "outgoing" ? (
    <button
      disabled
      className="w-full px-3 py-2 rounded-lg bg-emerald-500/25 border border-emerald-500/30 text-emerald-100 text-sm font-semibold cursor-default"
    >
      Invitation sent ✓
    </button>
  ) : friendStatus === "incoming" ? (
    <>
      <div className="text-sm text-amber-200 font-semibold">
        ✅ This user already sent you a friend request.
      </div>

      <button
        onClick={() => {
          setConnectOpen(false);
          router.push("/friends?tab=requests&sub=incoming");
        }}
        className="mt-3 w-full px-2 py-2 rounded-lg bg-green-700 hover:bg-amber-400/30 border border-amber-400/30 text-amber-100 text-sm font-semibold"
      >
        Requests →
      </button>
    </>
  ) : (
    <button
      disabled={friendBusy}
      onClick={async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setFriendBusy(true);
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/requests`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ targetId: Number(profileId) }),
          });

          // OPTIONAL: if backend responds with “auto-accepted”, reflect it
          if (res.ok) {
            await refreshFriendStatus();
          }
        } finally {
          setFriendBusy(false);
        }
      }}
      className="w-full px-3 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
    >
      Add friend
    </button>
  )}
</div>


    {/* RIGHT HALF: message */}
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col justify-between">
      <div>
        <div className="text-xs text-white/60 mb-2">Chat</div>
        <div className="text-sm text-white/80">Send a message 📧 DM</div>
      </div>

      <button
        onClick={() => router.push(`/dm/${profileId}`)}
        className="mt-3 w-full px-3 py-2 rounded-lg bg-white/15 hover:bg-white/20 border border-white/10 text-blue-400 text-sm font-semibold"
      >
       💬 Message 
      </button>
    </div>
  </div>
  {/* --- YOUR EXISTING POPUP CONTENT (UNCHANGED) END --- */}
</ConnectPopover>


        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 text-3xl font-extrabold text-amber-300 hover:text-amber-200 transition"
        >
          👑 <span>Networ.King</span>
        </button>

        {isSelf ? (
          <button
            onClick={() => setEditMode((v) => !v)}
            className="px-2 py-2 ml-1 text-sm rounded-xl border border-amber-300/50 bg-amber-300/20 hover:bg-amber-300/30 text-amber-100 font-semibold transition"
          >
            {editMode ? "✅ End modifying" : "✏️ Modify Profile"}
          </button>
        ) : (
          <button
  ref={connectBtnRef}
  onClick={async () => {
    setConnectOpen((v) => !v);
    // load status when opening
    if (!connectOpen) await refreshFriendStatus();
  }}
 className="
  pl-2 pr-3 py-1.5
  sm:px-4 sm:py-2
  text-sm sm:text-base
  rounded-lg sm:rounded-xl
  border border-emerald-300/50
  bg-emerald-300/20 hover:bg-emerald-300/30
  text-emerald-100 font-semibold transition
"

>
  🤝 Connect
</button>

        )}
      </header>

      {/* Body */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-10">
        <motion.div
          {...fade}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* LEFT PANEL — Identity */}
          <div className="order-1 lg:order-none rounded-2xl p-6 bg-white/10 border border-white/15 shadow-xl backdrop-blur">

            <div className="relative flex flex-col items-center">
  {/* mobile scroll-to-talisman arrow */}
  <button
    type="button"
    onClick={() => talismanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
    className="md:hidden absolute top-0 right-0 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 grid place-items-center transition"
    title="Jump to Talisman"
    aria-label="Jump to Talisman"
  >
    ↓
  </button>

              <img
                src={profile.avatar}
                alt={profile.name}
                className={`w-28 h-28 rounded-full border-4 border-amber-300 object-cover
    ${isSelf ? "cursor-pointer hover:scale-[1.03] transition" : ""}`}
                onClick={() => {
                  if (isSelf) router.push("/avatar");
                }}
                onError={(e) => {
                  e.currentTarget.src = "/avatar-placeholder.png";
                }}
              />

              <div className="mt-4 w-full">
  {!nameEditing ? (
    <div className="flex items-center justify-center gap-2">
      <h1 className="text-2xl font-bold">{profile.name}</h1>

      {isSelf && editMode && (
        <button
          onClick={openNameEdit}
          className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition"
          title="Edit name"
          aria-label="Edit name"
        >
          ✏️
        </button>
      )}
    </div>
  ) : (
    <div className="w-full">
      {/* token indicator */}
      <div className="flex items-center justify-center gap-2 mb-2 text-xs text-white/80">
        <button
  type="button"
  onClick={() => {
    setSelectedPack(null);
setPendingPurchase(null);
setBuyTokensError(null);
setBuyTokensOpen(true);

  }}
  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition"
  title="Buy cooldown skip tokens"
>
  🔶 Tokens: <span className="font-extrabold">{tokenCount}</span> · Buy
</button>


        {!nameCooldownCleared && nameCooldown?.remainingDays ? (
  <span className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-400/30 text-red-100">
    Cooldown active
  </span>
) : null}

        
        
      </div>
 
      <div className="flex items-center gap-2">
        <input
          ref={nameInputRef}
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveName();
            if (e.key === "Escape") cancelNameEdit();
          }}
          maxLength={16}
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300/40"
        />

        <button
          onClick={cancelNameEdit}
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
          disabled={nameSaving}
        >
          Cancel
        </button>

        <button
          onClick={saveName}
          className="px-3 py-2 rounded-xl bg-amber-300/20 hover:bg-amber-300/30 border border-amber-300/40 text-amber-100 font-semibold text-sm"
          disabled={nameSaving}
        >
          {nameSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {nameError && <div className="mt-2 text-xs text-red-300">{nameError}</div>}

      {/* ✅ Success banner after token use */}
{nameCooldownCleared && (
  <div className="mt-2 rounded-xl bg-emerald-500/10 border border-emerald-400/25 p-3 text-xs text-white/90">
    <div className="font-semibold text-emerald-200">
      ✅ Token used successfully — now you can rename.
    </div>
    <div className="mt-1 text-white/70">
      Press <span className="font-semibold">Save</span> to confirm your new name.
    </div>
  </div>
)}

{/* ✅ Cooldown banner (only if cooldown is active AND not cleared) */}
{!nameCooldownCleared && nameCooldown && nameCooldown.remainingDays > 0 && (
  <div className="mt-2 rounded-xl bg-red-500/10 border border-red-400/20 p-3 text-xs text-white/85">
    <div className="font-semibold">
      Name change available in {nameCooldown.remainingDays} day(s).
    </div>

    {nameCooldown.nextNameChangeAt && (
      <div className="mt-1 text-white/70">Next: {nameCooldown.nextNameChangeAt}</div>
    )}

    <button
      onClick={skipNameCooldown}
      disabled={nameSaving || tokenCount <= 0}
      className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold border transition
        ${
          tokenCount > 0
            ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/30"
            : "bg-white/10 border-white/20 text-white/60 cursor-not-allowed"
        }`}
      title={tokenCount > 0 ? "Consumes 1 token" : "You need tokens"}
    >
      {tokenCount > 0 ? "Accelerate (use 1 🔶)" : "No tokens available"}
    </button>
  </div>
)}


      <div className="mt-1 text-[11px] text-white/60">{nameDraft.length}/16</div>
    </div>
  )}
</div>


              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  {Array.isArray(profile.countries) &&
                  profile.countries.length > 0 ? (
                    profile.countries.map((code) => (
                      <span
                        key={code}
                        className={
                          code.toUpperCase() ===
                          (profile.mainCountry || "").toUpperCase()
                            ? "p-0.5 rounded bg-amber-400/30 border border-amber-400/50"
                            : "p-0.5 rounded bg-white/10 border border-white/20"
                        }
                        title={code.toUpperCase()}
                      >
                        <FlagIcon code={code} />
                      </span>
                    ))
                  ) : (
                    <span className="text-xl">🌍</span>
                  )}
                </div>

                {isSelf && editMode && (
                  <button
                    onClick={() => {
                      setCountryError(null);
                      setCountryOpen(true);
                    }}
                    className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition"
                  >
                    Modify
                  </button>
                )}
              </div>

              {/* About me */}
              <div className="mt-5 w-full rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-wide text-white/90">
                    About me
                  </h3>

                  {isSelf && editMode && (
                    <button
                      onClick={openAbout}
                      className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition"
                    >
                      Modify
                    </button>
                  )}
                </div>

                <p
  className={[
    "mt-2 text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words",
    // mobile collapse
    "md:line-clamp-none",
    aboutExpanded ? "" : "line-clamp-2",
  ].join(" ")}
>
  {aboutText
    ? aboutText
    : isSelf
    ? "Write a short bio so people understand you quickly."
    : "This user hasn’t added an about section yet."}
</p>

{/* show more/less (mobile only) */}
{aboutText && aboutLong && (
  <button
    type="button"
    onClick={() => setAboutExpanded((v) => !v)}
    className="md:hidden mt-2 text-xs text-amber-200 hover:text-amber-100 underline underline-offset-2"
  >
    {aboutExpanded ? "Show less" : "Show more"}
  </button>
)}

              </div>

              {/* Languages */}
              <div className="mt-4 w-full rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-wide text-white/90">
                    Languages
                  </h3>

                  {isSelf && editMode && (
                    <button
                      onClick={openLanguages}
                      className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition"
                    >
                      Modify
                    </button>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.languages && profile.languages.length > 0 ? (
                    profile.languages.map((l) => (
                      <span
                        key={l}
                        className="px-3 py-1 rounded-lg text-xs bg-white/10 border border-white/10"
                      >
                        {l}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-white/60">
                      {isSelf ? "Add up to 10 languages." : "No languages added."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

                  {/* CENTER PANEL — Representation (unchanged from your original) */}
          {/* CENTER PANEL — Talisman Showcase */}
          <div
  ref={talismanRef}
  className="order-3 lg:order-none rounded-2xl p-4 bg-white/5 border border-white/10 shadow-2xl backdrop-blur relative overflow-hidden"
>

            {/* soft glow */}
            <div
              className="pointer-events-none absolute -inset-24 opacity-35 blur-3xl"
              style={{
                background:
                  "conic-gradient(from 180deg at 50% 50%, rgba(255,215,128,0.28), rgba(255,255,255,0.06), rgba(255,215,128,0.28))",
              }}
            />

            <div className="relative h-[420px] md:h-[520px] flex flex-col items-center justify-between">

              {/* Title */}
              <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-300/15 border border-amber-300/30 text-amber-200 text-xs font-semibold">
                Talisman Showcase
              </div>

              {/* Tall Pedestal Area */}
              <div className="relative w-full flex-1 flex items-end justify-center lg:items-center ">

                {/* Floor shadow */}
                <div className="absolute inset-x-0 bottom-6 h-16 rounded-[40px] bg-black/40 blur-2xl" />

                {/* Pedestal base */}
                <div className="absolute inset-x-10 bottom-10 h-10 rounded-2xl bg-gradient-to-t from-amber-500/45 to-white/10 border border-white/20 shadow-inner lg:translate-y-6" />
                <div className="absolute inset-x-14 bottom-20 h-7 rounded-xl bg-gradient-to-t from-amber-400/35 to-white/10 border border-white/20 shadow-inner lg:translate-y-6" />

                {/* The Talisman “statue” */}
                <motion.div
                  initial={{ y: 0, opacity: 0, rotateX: 10, rotateY: -10 }}
                  animate={{ y: -14, opacity: 1, rotateX: 10, rotateY: -10 }}

                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative w-[280px] h-[320px] rounded-[32px]"
                >
                  <div className="relative w-full h-full rounded-[32px] bg-gradient-to-br from-white/18 to-amber-300/25 border border-white/25 shadow-[0_30px_70px_-18px_rgba(251,191,36,0.35)] backdrop-blur overflow-hidden lg:-translate-y-11">
                    {/* highlight streak */}
                    <div className="absolute -left-16 -top-10 h-56 w-40 rotate-12 bg-white/25 blur-2xl rounded-3xl" />

                    {/* content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                      <motion.div
                        animate={{ y: [0, -6, 0], rotate: [0, 4, -4, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 6,
                          ease: "easeInOut",
                        }}
                        className="text-[110px] drop-shadow-[0_12px_22px_rgba(0,0,0,0.35)]"
                      >
                        {activeTalisman ? (
  <img
    src={activeTalisman.image}
    alt={activeTalisman.label}
    className={`w-48 h-48 object-contain select-none pointer-events-none transition-all duration-500 ${
  activeTalisman?.rarity
    ? rarityGlow[activeTalisman.rarity] || ""
    : ""
}`}   draggable={false}
  />
) : (
  "✨"
)}
                      </motion.div>

                      <div className="mt-3 text-base font-bold text-amber-400 drop-shadow-md">
                        {activeTalisman
                          ? activeTalisman.label
                          : isSelf
                          ? "Choose your talisman"
                          : "No talisman selected"}
                      </div>

                      <div className="mt-1 text-xs text-white/65">
                        {activeTalisman
                          ? activeTalisman.desc
                          : isSelf
                          ? "Visitors will see it here."
                          : ""}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Bottom button / hint */}
              <div className="mb-0">
                {isSelf ? (
                  <button
                    onClick={openTalisman}
                    className="px-5 py-2 rounded-xl border border-amber-300/40 bg-amber-300/20 hover:bg-amber-300/30 text-amber-100 font-semibold transition"
                  >
                    ✨ Choose Talisman
                  </button>
                ) : (
                  <div className="text-xs text-white/60">
                    {activeTalisman ? "This is the user’s chosen talisman." : ""}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — Achievements & Identity */}
          <div className="order-2 lg:order-none rounded-2xl p-6 bg-white/10 border border-white/15 shadow-xl backdrop-blur space-y-6">

            {/* 🏅 Featured Badges */}
            <div className="relative overflow-hidden rounded-2xl px-4 py-4 bg-white/20 backdrop-blur-md shadow-xl border border-amber-300/40">
              {/* subtle ID-card frame */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent
  [background:linear-gradient(45deg,#ffd700,#7c3aed,#22d3ee)_border-box]
  [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)]
  [mask-composite:exclude]
  opacity-50"
              />

              <div className="relative flex items-center justify-between">
                <div className="text-m font-semibold text-white/90">
                  🏅 Featured Badges
                </div>

                {isSelf && editMode && (
                  <button
                    onClick={openFeatured}
                    className="text-xs px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 border border-white/15 transition font-semibold"
                  >
                    Modify Profile
                  </button>
                )}
              </div>

              <div className="relative mt-3 flex items-center gap-3">
                {profile.featuredBadges?.length ? (
                  profile.featuredBadges.slice(0, 3).map((b: any) => (
                    <div key={b.id} className="relative">
                      {/* circular badge */}
                      <div className="relative w-16 h-16 rounded-full bg-white/10 border border-amber-300/40 shadow-lg grid place-items-center overflow-hidden">
                        <img
                          src={
                            b.icon?.startsWith("/badges/")
                              ? b.icon
                              : `/badges/${b.icon}`
                          }
                          alt=""
                          className="w-12 h-12 object-contain"
                          draggable={false}
                        />
                      </div>

                      {/* score overlay (your BadgeScore style) */}
                      {b.badgeScore != null && (
                        <BadgeScore
                          score={b.badgeScore}
                          unit={b.badgeScoreUnit || "percent"}
                          overlayOnly
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-white/60">
                    {isSelf
                      ? "Pick up to 3 badges to feature."
                      : "No featured badges."}
                  </div>
                )}
              </div>
            </div>

               {/* My Completed Tests (only visible to owner) */}
{isSelf && (
  <div className="mt-6 rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      
      <div>
        <div className="text-sm font-semibold text-white/90">
          🏆 My Completed Tests
        </div>
       
      </div>

      <button
        onClick={() => router.push("/tests/completed")}
        className="
          w-full sm:w-auto
          px-4 py-2
          rounded-xl
          text-sm font-semibold
          bg-amber-300/20 hover:bg-amber-300/30
          border border-amber-300/40
          text-amber-100
          transition
        "
      >
        View →
      </button>
    </div>
  </div>
)}


            {/* ✅ PATCHED BADGES PREVIEW */}
            <div>
              <div className="flex items-center justify-between mb-3 mt-6">
                <h3 className="font-bold text-lg">🌟 Recent Badges</h3>

                {isSelf && (
                  <button
                    onClick={() => router.push(`/profile/${profileId}/badges`)}
                    className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15"
                  >
                    View all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                {profile.badges?.length ? (
                  [...profile.badges]
                    .sort(
                      (a, b) =>
                        new Date(b.earnedAt || 0).getTime() -
                        new Date(a.earnedAt || 0).getTime()
                    )
                    .slice(0, 3)
                    .map((b) => (
                      <div
                        key={b.id}
                        className="relative rounded-xl p-3 text-center bg-white/5 border border-white/10"
                      >
                        {/* Badge Icon */}
                        <img
                          src={
                            b.icon?.startsWith("/badges/")
                              ? b.icon
                              : `/badges/${b.icon}`
                          }
                          className="w-12 h-12 mx-auto object-contain drop-shadow-lg"
                        />


                        <div className="mt-1 text-xs text-white/80 truncate">
                          {b.name}
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-sm opacity-60 col-span-3 text-center">
                    No badges yet
                  </p>
                )}
              </div>
            </div>

         
            {/* Real Identity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">Real Identity</h3>

                {isSelf && editMode && (
                  <button
                    onClick={openLinks}
                    className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15"
                  >
                    Modify
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-6">
                {[
                  { key: "linkedin", label: "LinkedIn", icon: "in" },
                  { key: "facebook", label: "Facebook", icon: "f" },
                  { key: "instagram", label: "Instagram", icon: "IG" },
                  { key: "website", label: "Website", icon: "🌐" },
                ].map((item) => {
                  const links = profile.externalLinks || {};
                  const url = (links as any)[item.key] || "";
                  const hasUrl = !!url;

                  const base =
                    "flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition";
                  const enabled = "bg-white/5 hover:bg-white/10 border-white/10";
                  const disabled =
                    "bg-white/5 border-white/5 opacity-50 cursor-not-allowed";

                  // green glow when set (visitor mode)
                  const glow =
                    !isSelf && hasUrl
                      ? "shadow-[0_0_28px_rgba(0,255,128,0.6)] border-emerald-500/70"
                      : "";

                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        if (isSelf) {
                          openLinks();
                          return;
                        }
                        if (!hasUrl) return;
                        requestLeave(item.label, url);
                      }}
                      title={
                        isSelf
                          ? "Manage your links"
                          : hasUrl
                          ? "Open link"
                          : "User didn’t add a link"
                      }
                      className={`${base} ${
                        hasUrl || isSelf ? enabled : disabled
                      } ${glow}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-7 h-7 grid place-items-center rounded-lg bg-white/10 border border-white/10 text-xs font-bold">
                          {item.icon}
                        </span>
                        {item.label}
                      </span>
                      <span className="text-white/60">{hasUrl ? "↗" : "—"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Back to Dashboard */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-gray-900 font-semibold border border-yellow-300 hover:from-amber-300 hover:to-yellow-200 shadow-[0_8px_30px_rgba(251,191,36,0.35)] transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      </section>

      {/* About Modal */}
      {aboutOpen && isSelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setAboutOpen(false)}
            aria-label="Close about modal"
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-br from-blue-950/90 via-indigo-900/85 to-amber-500/25 border border-white/15 shadow-2xl backdrop-blur p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Edit About</h2>
                <p className="text-xs text-white/60 mt-1">
                  Keep it short & clear (you can use line breaks).
                </p>
              </div>

              <button
                onClick={() => setAboutOpen(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
              >
                ✕
              </button>
            </div>

            <textarea
              value={aboutDraft}
              onChange={(e) => setAboutDraft(e.target.value)}
              rows={6}
              maxLength={200}
              className="mt-4 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300/40"
              placeholder="Tell people who you are, what you do, what you’re looking for..."
            />

            <div className="mt-2 flex items-center justify-between text-xs text-white/60">
              <span>
                {aboutError ? (
                  <span className="text-red-300">{aboutError}</span>
                ) : (
                  " "
                )}
              </span>
              <span>{aboutDraft.length}/200</span>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setAboutOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
                disabled={aboutSaving}
              >
                Cancel
              </button>

              <button
                onClick={saveAbout}
                className="px-4 py-2 rounded-xl bg-amber-300/20 hover:bg-amber-300/30 border border-amber-300/40 text-amber-100 font-semibold text-sm"
                disabled={aboutSaving}
              >
                {aboutSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Languages Modal */}
      {langOpen && isSelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setLangOpen(false)}
            aria-label="Close languages modal"
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-br from-blue-950/90 via-indigo-900/85 to-amber-500/25 border border-white/15 shadow-2xl backdrop-blur p-5"
>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Edit Languages</h2>
                <p className="text-xs text-white/60 mt-1">
                  Choose up to 10. Click to add/remove.
                </p>
              </div>

              <button
                onClick={() => setLangOpen(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
              >
                ✕
              </button>
            </div>

            <input
              value={langQuery}
              onChange={(e) => setLangQuery(e.target.value)}
              placeholder="Search a language…"
              className="mt-4 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300/40"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {langDraft.map((l) => (
                <button
                  key={l}
                  onClick={() => toggleLanguage(l)}
                  className="px-3 py-1 rounded-lg text-xs bg-amber-300/20 border border-amber-300/30 hover:bg-amber-300/25"
                  title="Remove"
                >
                  {l} ✕
                </button>
              ))}

              {langDraft.length === 0 && (
                <p className="text-sm text-white/60">
                  No languages selected yet.
                </p>
              )}
            </div>

            <div className="mt-4 h-px bg-white/10" />

            <div className="mt-4 max-h-56 overflow-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                {ALL_LANGUAGES.filter((l) =>
                  l.toLowerCase().includes(langQuery.trim().toLowerCase())
                ).map((l) => {
                  const selected = langDraft.includes(l);
                  const disabled = !selected && langDraft.length >= 10;

                  return (
                    <button
                      key={l}
                      onClick={() => toggleLanguage(l)}
                      disabled={disabled}
                      className={`px-3 py-2 rounded-xl border text-sm text-left transition
                    ${
                      selected
                        ? "bg-amber-300/20 border-amber-300/30"
                        : disabled
                        ? "bg-white/5 border-white/10 opacity-40 cursor-not-allowed"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-white/60">
              <span>
                {langError ? (
                  <span className="text-red-300">{langError}</span>
                ) : (
                  " "
                )}
              </span>
              <span>{langDraft.length}/10 selected</span>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setLangOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
                disabled={langSaving}
              >
                Cancel
              </button>

              <button
                onClick={saveLanguages}
                className="px-4 py-2 rounded-xl bg-amber-300/20 hover:bg-amber-300/30 border border-amber-300/40 text-amber-100 font-semibold text-sm"
                disabled={langSaving}
              >
                {langSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Links Modal (owner) */}
      {linksOpen && isSelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setLinksOpen(false)}
            aria-label="Close links modal"
          />

          <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-br from-blue-950/90 via-indigo-900/85 to-amber-500/25 border border-white/15 shadow-2xl backdrop-blur p-5"
>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Manage Social Links</h2>
                <p className="text-xs text-white/60 mt-1">
                  Add your links. Leave empty to hide for visitors.
                </p>
              </div>

              <button
                onClick={() => setLinksOpen(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  key: "linkedin",
                  label: "LinkedIn",
                  placeholder: "https://linkedin.com/in/...",
                },
                {
                  key: "facebook",
                  label: "Facebook",
                  placeholder: "https://facebook.com/...",
                },
                {
                  key: "instagram",
                  label: "Instagram",
                  placeholder: "https://instagram.com/...",
                },
                {
                  key: "website",
                  label: "Website",
                  placeholder: "https://your-site.com",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-white/70">{f.label}</label>
                  <input
                    value={(linksDraft as any)[f.key] || ""}
                    onChange={(e) =>
                      setLinksDraft((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300/40"
                  />
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs text-white/60">
              {linksError ? (
                <span className="text-red-300">{linksError}</span>
              ) : (
                " "
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setLinksOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
                disabled={linksSaving}
              >
                Cancel
              </button>

              <button
                onClick={saveLinks}
                className="px-4 py-2 rounded-xl bg-amber-300/20 hover:bg-amber-300/30 border border-amber-300/40 text-amber-100 font-semibold text-sm"
                disabled={linksSaving}
              >
                {linksSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaving Platform Warning (visitor) */}
      {leaveOpen && !isSelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setLeaveOpen(false)}
            aria-label="Close warning"
          />

          {/* Modal */}
          <div className="relative w-full max-w-md rounded-2xl bg-slate-950/85 border border-white/15 shadow-2xl backdrop-blur p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <svg
                className="h-6 w-6 text-red-400 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2L1 21h22L12 2zm0 14a1 1 0 110 2 1 1 0 010-2zm-1-6h2v5h-2V10z" />
              </svg>

              <h2 className="text-lg font-bold">You’re leaving Networ.King</h2>
            </div>

            {/* Content */}
            <div className="space-y-2 text-sm text-white/75 leading-relaxed">
              <p>
                You’re about to open the current user’s link for their{" "}
                <span className="font-semibold text-white">{leaveLabel}</span>{" "}
                in a new tab.
              </p>

              <p>Only continue if you trust this user.</p>

              <p>
                We can’t guarantee the authenticity of the site you’re about to
                visit. Don’t share sensitive information if a page looks
                suspicious.
              </p>
            </div>

            {/* URL */}
            <div className="text-xs text-white/60 break-words">{leaveUrl}</div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setLeaveOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={confirmLeave}
                className="px-4 py-2 rounded-xl border border-emerald-300/40 bg-emerald-300/15 hover:bg-emerald-300/25 text-emerald-100 font-semibold text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Talisman Modal */}
      {talismanOpen && isSelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setTalismanOpen(false)}
            aria-label="Close talisman modal"
          />

          <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-br from-blue-950/90 via-indigo-900/85 to-amber-500/25 border border-white/15 shadow-2xl backdrop-blur p-5"
>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Choose your Talisman</h2>
                <p className="text-xs text-white/60 mt-1">
                  Pick one. Visitors will see it on your profile.
                </p>
              </div>

              <button
                onClick={() => setTalismanOpen(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {TALISMANS.map((t) => {
                const selected = talismanDraft === t.key;

                return (
                  <button
                    key={t.key}
                    onClick={() => setTalismanDraft(t.key)}
                    className={`p-3 rounded-2xl border text-left transition
                ${
                  selected
                    ? "bg-amber-300/20 border-amber-300/30"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 border border-white/10 text-2xl">
                        <img
    src={t.image}
    alt={t.label}
    className="w-8 h-8 object-contain"
    draggable={false}
  />
                      </div>
                      <div>
                        <div className="font-semibold">{t.label}</div>
                        <div className="text-xs text-white/60">{t.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-xs text-white/60">
              {talismanError ? (
                <span className="text-red-300">{talismanError}</span>
              ) : (
                " "
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setTalismanOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
                disabled={talismanSaving}
              >
                Cancel
              </button>

              <button
                onClick={saveTalisman}
                className="px-4 py-2 rounded-xl bg-amber-300/20 hover:bg-amber-300/30 border border-amber-300/40 text-amber-100 font-semibold text-sm"
                disabled={talismanSaving}
              >
                {talismanSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Featured Badges Modal */}
      {featuredOpen && isSelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setFeaturedOpen(false)}
            aria-label="Close featured badges modal"
          />

          <div className="relative w-full max-w-2xl rounded-2xl bg-gray-500/80 border border-white/15 shadow-2xl backdrop-blur p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">🏅 Featured Badges</h2>
                <p className="text-xs text-white/60 mt-1">
                  Choose up to 3. Shown to visitors.
                </p>
              </div>

              <button
                onClick={() => setFeaturedOpen(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
              {myAllBadges.map((b: any) => {
                const index = featuredDraft.indexOf(b.id); // 0,1,2 or -1
                const selected = index !== -1;

                return (
                  <button
                    key={b.id}
                    onClick={() => toggleFeatured(b.id)}
                    className={`relative rounded-xl p-2 pt-6 text-center bg-white/5 border transition-all
        ${
          selected
            ? "border-amber-400 shadow-lg scale-[1.03]"
            : "border-white/10 hover:border-white/20"
        }`}
                  >
                    {/* ✅ ORDER BADGE (top-right) */}
                    {selected && (
                      <span className="absolute top-1 right-1 w-6 h-6 rounded-full grid place-items-center text-xs font-extrabold bg-amber-300 text-gray-900 shadow-lg">
                        {index + 1}
                      </span>
                    )}

                    <img
                      src={
                        b.icon?.startsWith("/badges/")
                          ? b.icon
                          : `/badges/${b.icon}`
                      }
                      alt={b.name}
                      className="w-12 h-12 mx-auto object-contain"
                    />

                    {b.badgeScore != null && (
                      <div
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-bold"
                        style={{
                          background: "rgba(0,0,0,0.55)",
                          color: b.badgeScoreColor || "white",
                        }}
                      >
                        {b.badgeScore}
                        {b.badgeScoreUnit === "percent" ? "%" : ""}
                      </div>
                    )}

                    <div className="text-xs mt-1 truncate">{b.name}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-white/60">
              <span>
                {featuredError ? (
                  <span className="text-red-300">{featuredError}</span>
                ) : (
                  " "
                )}
              </span>
              <span>{featuredDraft.length}/3 selected</span>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setFeaturedOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
                disabled={featuredSaving}
              >
                Cancel
              </button>

              <button
                onClick={saveFeatured}
                className="px-4 py-2 rounded-xl bg-amber-300/20 hover:bg-amber-300/30 border border-amber-300/40 text-amber-100 font-semibold text-sm"
                disabled={featuredSaving}
              >
                {featuredSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {buyTokensOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
    {/* Backdrop */}
    <button
      className="absolute inset-0 bg-black/70"
      onClick={() => {
        setBuyTokensOpen(false);
        setSelectedPack(null);
        setPendingPurchase(null);
        setBuyTokensError(null);
      }}
      aria-label="Close buy tokens modal"
    />

    {/* Modal */}
    <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-amber-300/30 shadow-2xl">
  {/* Top gradient header */}
  <div className="bg-gradient-to-r from-emerald-600/35 via-amber-400/25 to-yellow-300/20 p-5 backdrop-blur">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-extrabold text-amber-100 drop-shadow">
          🔶 Cooldown Tokens Shop
        </h2>
        <p className="text-xs text-white/80 mt-1">
          Use tokens to instantly skip rename cooldown.
        </p>
      </div>

      <button
        onClick={() => {
          setBuyTokensOpen(false);
          setSelectedPack(null);
          setPendingPurchase(null);
          setBuyTokensError(null);
        }}
        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm text-white"
      >
        ✕
      </button>
    </div>

    <div className="mt-3 text-xs text-white/85">
      Current balance:{" "}
      <span className="font-extrabold text-amber-200">{tokenCount}</span>
    </div>
  </div>

  {/* Body */}
  <div className="bg-gradient-to-br from-blue-950/90 via-indigo-900/85 to-amber-500/20 p-5">
    <div className="relative rounded-2xl p-4 bg-white/10 border border-white/15 backdrop-blur shadow-xl overflow-hidden">
      
      {/* subtle glow */}
      <div
        className="pointer-events-none absolute -inset-24 opacity-30 blur-3xl"
        style={{
          background:
            "conic-gradient(from 180deg at 50% 50%, rgba(16,185,129,0.35), rgba(251,191,36,0.25), rgba(255,255,255,0.08), rgba(16,185,129,0.35))",
        }}
      />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm font-bold text-white/90">
            Pack:{" "}
            <span className="text-amber-200">
              {selectedPack ?? "Choose"} tokens
            </span>
          </div>

          <div className="mt-1 text-xs text-white/70">
            Price:{" "}
            <span className="font-semibold text-amber-100">
              {selectedPrice
                ? fmtMoney(selectedPrice.amountCents, selectedPrice.currency)
                : "—"}
            </span>
          </div>

          {/* Smaller BUY button */}
          <button
            type="button"
            onClick={() => {
              if (!selectedPack) {
                setBuyTokensError("Choose a pack first.");
                return;
              }
              createTokenPurchase(selectedPack);
            }}
            disabled={!selectedPack || buyTokensBusy || !!pendingPurchase}
            className="mt-4 w-full py-1.5 text-sm rounded-lg font-bold
                       bg-emerald-400/20 border border-emerald-300/40
                       hover:bg-emerald-400/30 text-emerald-100
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            {buyTokensBusy ? "Creating purchase..." : "Buy"}
          </button>

          <div className="mt-3 inline-flex items-center gap-2 text-xs px-2 py-1 rounded-lg bg-emerald-400/15 border border-emerald-300/25 text-emerald-100">
            ⚡ Skip rename cooldown instantly
          </div>
        </div>

        {/* Bigger 3 / 5 / 10 buttons */}
        <div className="flex gap-3 mt-3">
          {[3, 5, 10].map((qty) => {
            const selected = selectedPack === qty;
            return (
              <button
                key={qty}
                type="button"
                onClick={() => {
                  setSelectedPack(qty);
                  setBuyTokensError(null);
                  setPendingPurchase(null);
                }}
                className={`flex-1 px-4 py-3 rounded-2xl border text-base font-extrabold
                  transition-all duration-200 transform
                  ${
                    selected
                      ? "bg-green-500 border-green-400 text-white scale-105 shadow-lg shadow-green-500/30"
                      : "bg-white/10 border-white/15 text-white/80 hover:bg-white/15"
                  }`}
              >
                {qty}
              </button>
            );
          })}
        </div>
      </div>

      {pendingPurchase && (
        <div className="mt-4 rounded-2xl p-4 bg-emerald-500/10 border border-emerald-400/20">
          <div className="text-sm font-bold text-emerald-200">
            ✅ Pending purchase created
          </div>
          <div className="mt-1 text-xs text-white/80">
            Purchase #{pendingPurchase.id} · {pendingPurchase.quantity} tokens ·{" "}
            <span className="font-semibold text-amber-200">
              {fmtMoney(pendingPurchase.amountCents, pendingPurchase.currency)}
            </span>
          </div>

          <button
            onClick={confirmDevPayment}
            disabled={confirmBusy}
            className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-emerald-400/30 to-amber-300/25
                       border border-emerald-300/30 hover:from-emerald-400/40 hover:to-amber-300/35
                       text-white font-extrabold disabled:opacity-60 transition"
          >
            {confirmBusy ? "Confirming..." : "Confirm payment (DEV) ✅"}
          </button>
        </div>
      )}

      {buyTokensError && (
        <div className="relative mt-3 text-xs text-red-200 bg-red-500/10 border border-red-400/20 rounded-xl p-3">
          {buyTokensError}
        </div>
      )}
    </div>

    <div className="mt-4 text-[11px] text-white/60">
      No Stripe yet? This button can call your mock “store” route for now.
    </div>
  </div>
</div>

  </div>
)}



      {/* Countries Modal */}
      {countryOpen && isSelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setCountryOpen(false)}
            aria-label="Close countries modal"
          />

          <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-br from-blue-950/90 via-indigo-900/85 to-amber-500/25 border border-white/15 shadow-2xl backdrop-blur p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">🌍 Countries</h2>
                <p className="text-xs text-white/60 mt-1">
                  Select up to 3 and pick your main country.
                </p>
              </div>

              <button
                onClick={() => setCountryOpen(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <CountryPicker
                initialCountries={profile.countries || []}
                initialMain={profile.mainCountry || null}
                onSave={async ({ countries, mainCountry }) => {
                  const token = localStorage.getItem("token");
                  if (!token) return;

                  setCountrySaving(true);
                  setCountryError(null);

                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ countries, mainCountry }),
                    });

                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data?.error || "Failed to save");

                    // update UI instantly
                    setProfile((prev) => ({
                      ...prev,
                      countries,
                      mainCountry,
                      country: (countries || []).join(", "),
                    }));

                    setCountryOpen(false);
                  } catch (e: any) {
                    setCountryError(e?.message || "Failed to save");
                  } finally {
                    setCountrySaving(false);
                  }
                }}
              />
            </div>

            {countryError && (
              <div className="mt-3 text-xs text-red-300">{countryError}</div>
            )}

            {countrySaving && (
              <div className="mt-2 text-xs text-white/60">Saving…</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
