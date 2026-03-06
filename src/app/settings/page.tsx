// frontend/src/app/settings/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/Portal";
import {
  Shield,
  Crown,
  Receipt,
  Gift,
  SlidersHorizontal,
  Ban,
  ChevronRight,
  Copy as CopyIcon,
  RefreshCcw,
  LogOut,
  Trash2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

type MeUser = {
  id: number;
  name: string;
  email: string;
  role?: string;
  lastLoginAt?: string | null;
  createdAt?: string | null;
};

type Entitlements = {
  isPremium: boolean;
  premiumUntil?: string | null;
  cooldownSkipTokens?: number;
  tombolaDailyLimit?: number;
};

type InviteInfo = {
  inviteCode: string;
  invitedCount: number;
  invitePath?: string;
};

type InvitedRow = {
  id: number;
  name: string;
  avatar?: string | null;
  createdAt: string;
  currentLevel?: number | null;
};

type PurchaseItem = {
  id: number;
  kind: string;
  amountCents: number;
  currency: string;
  status: string;
  provider?: string;
  createdAt: string;

  avatarId?: number | null;
  level?: number | null;
  quantity?: number | null;
};

type TabKey =
  | "account"
  | "premium"
  | "purchases"
  | "referrals"
  | "preferences"
  | "blocked";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function fmtDateTime(iso?: string | null, use24h?: boolean) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: !use24h,
    });
  } catch {
    return "—";
  }
}

function fmtMoney(cents: number, currency: string) {
  const value = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "EUR",
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency || "EUR"}`;
  }
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : null;
}

function Card({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {description ? (
            <div className="mt-0.5 text-xs text-slate-500">{description}</div>
          ) : null}
        </div>
        {right ? <div className="flex-shrink-0">{right}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-700">{label}</div>
      <div className="mt-1.5">{children}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900",
        "placeholder:text-slate-400",
        "outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300",
        props.className
      )}
    />
  );
}

function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800 border border-slate-900"
      : variant === "secondary"
      ? "bg-white text-slate-900 hover:bg-slate-50 border border-slate-200"
      : variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-500 border border-red-600"
      : "bg-transparent text-slate-700 hover:bg-slate-100 border border-transparent";

  const disabledStyles =
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-inherit";

  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
        styles,
        disabledStyles,
        className
      )}
    />
  );
}

function RowAction({
  title,
  subtitle,
  right,
  onClick,
  tone = "normal",
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  tone?: "normal" | "danger";
}) {
  const clickable = typeof onClick === "function";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={cx(
        "w-full text-left flex items-center justify-between gap-4 rounded-xl px-3 py-3",
        "border border-slate-200 hover:bg-slate-50 transition",
        "disabled:opacity-60 disabled:hover:bg-transparent disabled:cursor-default",
        tone === "danger" ? "border-red-200 hover:bg-red-50" : ""
      )}
    >
      <div className="min-w-0">
        <div
          className={cx(
            "text-sm font-semibold truncate",
            tone === "danger" ? "text-red-700" : "text-slate-900"
          )}
        >
          {title}
        </div>
        {subtitle ? (
          <div className="mt-0.5 text-xs text-slate-500 truncate">{subtitle}</div>
        ) : null}
      </div>
      {right ? <div className="flex-shrink-0">{right}</div> : null}
    </button>
  );
}

function SidebarTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-700 hover:bg-slate-100"
      )}
    >
      <span className={cx("shrink-0", active ? "text-white" : "text-slate-500")}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold border",
        ok
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-50 text-slate-700 border-slate-200"
      )}
    >
      {label}
    </span>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const tabs: Array<{
    key: TabKey;
    label: string;
    icon: React.ReactNode;
  }> = useMemo(
    () => [
      { key: "account", label: "Account & Security", icon: <Shield size={16} /> },
      { key: "premium", label: "Premium", icon: <Crown size={16} /> },
      { key: "referrals", label: "Referrals", icon: <Gift size={16} /> },
      { key: "preferences", label: "Preferences", icon: <SlidersHorizontal size={16} /> },
      { key: "purchases", label: "Purchases", icon: <Receipt size={16} /> },
      { key: "blocked", label: "Blocked", icon: <Ban size={16} /> },
    ],
    []
  );

  const [tab, setTab] = useState<TabKey>("account");

  const [me, setMe] = useState<MeUser | null>(null);
  const [ent, setEnt] = useState<Entitlements | null>(null);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [invited, setInvited] = useState<InvitedRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Preferences (local only)
  const [use24h, setUse24h] = useState(false);

  // Modals
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Change password
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwNext2, setPwNext2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string>("");

  // Delete account
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");

  const premiumLabel = ent?.isPremium ? "Active" : "Inactive";

  useEffect(() => {
    try {
      setUse24h(localStorage.getItem("pref_use24h") === "1");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("pref_use24h", use24h ? "1" : "0");
    } catch {}
  }, [use24h]);

  async function loadAll() {
    const headers = getAuthHeaders();
    if (!headers) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const [rProfile, rEnt, rInvite] = await Promise.all([
        fetch(`${API_BASE}/profile`, { headers }),
        fetch(`${API_BASE}/me/entitlements`, { headers }),
        fetch(`${API_BASE}/auth/invite`, { headers }),
      ]);

      if (!rProfile.ok) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }

      const dProfile = await rProfile.json().catch(() => ({}));
      const dEnt = await rEnt.json().catch(() => ({}));
      const dInvite = await rInvite.json().catch(() => ({}));

      setMe(dProfile?.user ?? null);
      setEnt(dEnt ?? null);
      setInvite(dInvite ?? null);

      const [rInvited, rPurchases] = await Promise.all([
        fetch(`${API_BASE}/auth/invited?limit=50`, { headers }),
        fetch(`${API_BASE}/me/purchases?limit=50`, { headers }),
      ]);

      const dInvited = await rInvited.json().catch(() => ({}));
      const dPurch = await rPurchases.json().catch(() => ({}));

      setInvited(Array.isArray(dInvited?.invited) ? dInvited.invited : []);
      setPurchases(Array.isArray(dPurch?.purchases) ? dPurch.purchases : []);
    } catch {
      // keep whatever we have
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changePassword() {
    setPwMsg("");
    if (!pwCurrent || !pwNext || !pwNext2) return setPwMsg("Please fill all fields.");
    if (pwNext !== pwNext2) return setPwMsg("New passwords do not match.");

    const headers = getAuthHeaders();
    if (!headers) return;

    setPwBusy(true);
    try {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNext }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setPwMsg(data?.error || "Failed to change password.");

      setPwMsg("Password updated.");
      setPwCurrent("");
      setPwNext("");
      setPwNext2("");
    } catch {
      setPwMsg("Network error.");
    } finally {
      setPwBusy(false);
    }
  }

  async function logoutAllDevices() {
    const headers = getAuthHeaders();
    try {
      if (headers) await fetch(`${API_BASE}/auth/logout-all`, { method: "POST", headers });
    } catch {}
    localStorage.removeItem("token");
    router.push("/login");
  }

  async function deleteAccount() {
    setDeleteMsg("");
    if (!deletePassword) return setDeleteMsg("Password required.");
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      const res = await fetch(`${API_BASE}/auth/delete`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setDeleteMsg(data?.error || "Failed to delete account.");

      localStorage.removeItem("token");
      router.push("/login");
    } catch {
      setDeleteMsg("Network error.");
    }
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  const tabAnim = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
  };

  return (
    <main className="min-h-screen bg-slate-200 text-slate-900">
      {/* Top header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 md:px-10 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => router.push("/dashboard")}>
              ← Back
            </Button>
          </div>

          <div className="min-w-0 text-center">
            <div className="text-[11px] text-slate-500">Networ.King</div>
            <div className="text-lg md:text-xl font-extrabold tracking-tight">Settings</div>
          </div>

          <Button
            variant="secondary"
            onClick={() => router.push("/Subscription")}
            title="Premium"
            className="gap-2"
          >
            <Crown size={16} />
            <span className="hidden sm:inline">Premium</span>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-10 py-8">
        {/* Account summary */}
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Signed in as</div>
              <div className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight truncate">
                {me?.name || (loading ? "Loading…" : "—")}
              </div>
              <div className="mt-1 text-sm text-slate-600 truncate">{me?.email || ""}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill ok={!!ent?.isPremium} label={`Premium: ${premiumLabel}`} />
                <Badge>Tokens: {ent?.cooldownSkipTokens ?? 0}</Badge>
                <Badge>Member since: {fmtDate(me?.createdAt ?? null)}</Badge>

              </div>
            </div>

            <div className="flex items-center gap-2 md:justify-end">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">User ID</div>
                <div className="text-sm font-extrabold text-slate-900">{me?.id ?? "—"}</div>
              </div>
              <Button
                variant="secondary"
                onClick={() => me?.id && copy(String(me.id))}
                disabled={!me?.id}
                className="px-3"
                title="Copy your ID for support"
              >
                <CopyIcon size={16} />
                <span className="hidden sm:inline">Copy</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Layout: sidebar + content */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Sidebar (desktop) */}
          <div className="hidden md:block">
            <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm p-2">
              <div className="px-2 py-2 text-xs font-semibold text-slate-500">
                SETTINGS
              </div>
              <div className="space-y-1 p-1">
                {tabs.map((t) => (
                  <SidebarTab
                    key={t.key}
                    active={tab === t.key}
                    icon={t.icon}
                    label={t.label}
                    onClick={() => setTab(t.key)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white shadow-sm p-4">
              <div className="text-xs font-semibold text-slate-500">QUICK ACTIONS</div>
              <div className="mt-3 space-y-2">
                <Button variant="secondary" className="w-full justify-start" onClick={loadAll}>
                  <RefreshCcw size={16} />
                  Refresh data
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => {
                    localStorage.removeItem("token");
                    router.push("/login");
                  }}
                >
                  <LogOut size={16} />
                  Log out
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="md:hidden -mt-1">
            <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm p-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar p-1">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cx(
                      "shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition border",
                      tab === t.key
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {t.icon}
                    {t.label.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:hidden text-[12px] text-slate-400 text-center mt-1">
  swipe to see more→
</div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {/* ACCOUNT */}
              {tab === "account" && (
                <motion.div key="account" {...tabAnim} transition={{ duration: 0.18 }}>
                  <div className="space-y-6">
                    <Card
                      title="Account & Security"
                      description="Manage password, sessions, and your account."
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="text-sm font-semibold text-slate-900">
                            Change password
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <Field label="Current password">
                              <Input
                                type="password"
                                value={pwCurrent}
                                onChange={(e) => setPwCurrent(e.target.value)}
                                placeholder="••••••••"
                              />
                            </Field>
                            <Field label="New password">
                              <Input
                                type="password"
                                value={pwNext}
                                onChange={(e) => setPwNext(e.target.value)}
                                placeholder="At least 8 characters"
                              />
                            </Field>
                            <Field label="Confirm new password">
                              <Input
                                type="password"
                                value={pwNext2}
                                onChange={(e) => setPwNext2(e.target.value)}
                                placeholder="Repeat the new password"
                              />
                            </Field>
                          </div>

                          <div className="flex items-center gap-3">
                            <Button onClick={changePassword} disabled={pwBusy}>
                              {pwBusy ? "Saving…" : "Update password"}
                            </Button>
                            <div
                              className={cx(
                                "text-sm",
                                pwMsg ? "text-slate-700" : "text-transparent"
                              )}
                            >
                              {pwMsg || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="text-sm font-semibold text-slate-900">
                            Sessions
                          </div>

                          <div className="space-y-2">
                            <RowAction
                              title="Log out all devices"
                              subtitle="Invalidates your active session token."
                              right={<ChevronRight size={16} className="text-slate-400" />}
                              onClick={() => setLogoutAllOpen(true)}
                            />
                            <RowAction
                              title="Log out (this device)"
                              subtitle="Returns you to the login screen."
                              right={<ChevronRight size={16} className="text-slate-400" />}
                              onClick={() => {
                                localStorage.removeItem("token");
                                router.push("/login");
                              }}
                            />
                          </div>

                          <div className="pt-2">
                            <RowAction
                              tone="danger"
                              title="Delete account"
                              subtitle="Permanent. Requires password confirmation."
                              right={<ChevronRight size={16} className="text-red-400" />}
                              onClick={() => setDeleteOpen(true)}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* PREMIUM */}
              {tab === "premium" && (
                <motion.div key="premium" {...tabAnim} transition={{ duration: 0.18 }}>
                  <div className="space-y-6">
                    <Card
                      title="Premium"
                      description="Your subscription and premium benefits."
                      right={<StatusPill ok={!!ent?.isPremium} label={premiumLabel} />}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs font-semibold text-slate-500">SUBSCRIPTION</div>
                            <div className="mt-2 text-sm text-slate-700">
                              {ent?.isPremium
                                ? "You are currently premium."
                                : "You are currently not premium."}
                            </div>
                            <div className="mt-2 text-sm">
                              <span className="text-slate-500">Premium until:</span>{" "}
                              <span className="font-semibold text-slate-900">
                                {fmtDate(ent?.premiumUntil ?? null)}
                              </span>
                            </div>

                            <div className="mt-4">
                              <Button onClick={() => router.push("/Subscription")}>
                                Manage subscription
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="text-xs font-semibold text-slate-500">PERKS (LIVE)</div>
                            <div className="mt-3 grid grid-cols-1 gap-2">
                              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                                <div className="text-sm font-semibold text-slate-900">
                                  Cooldown skip tokens
                                </div>
                                <Badge>{ent?.cooldownSkipTokens ?? 0}</Badge>
                              </div>
                              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                                <div className="text-sm font-semibold text-slate-900">
                                  Daily lottery spins limit
                                </div>
                                <Badge>{ent?.tombolaDailyLimit ?? 1}</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* PURCHASES */}
              {tab === "purchases" && (
                <motion.div key="purchases" {...tabAnim} transition={{ duration: 0.18 }}>
                  <div className="space-y-6">
                    <Card
                      title="Purchases"
                      description="Your recent purchases (latest first)."
                      right={
                        <Button variant="secondary" onClick={loadAll}>
                          <RefreshCcw size={16} />
                          Refresh
                        </Button>
                      }
                    >
                      {loading ? (
                        <div className="text-sm text-slate-600">Loading…</div>
                      ) : purchases.length === 0 ? (
                        <div className="text-sm text-slate-600 italic">No purchases yet.</div>
                      ) : (
                        <div className="max-h-[460px] overflow-auto rounded-2xl border border-slate-200">
                          {purchases.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-start justify-between gap-4 px-4 py-3 border-b border-slate-200 last:border-b-0"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">
                                  {p.kind}
                                  {p.level != null ? ` • Lv.${p.level}` : ""}
                                  {p.quantity != null ? ` • x${p.quantity}` : ""}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {fmtDateTime(p.createdAt, use24h)} • {p.status}
                                </div>
                              </div>
                              <div className="text-sm font-extrabold text-slate-900">
                                {fmtMoney(p.amountCents, p.currency)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* REFERRALS */}
              {tab === "referrals" && (
                <motion.div key="referrals" {...tabAnim} transition={{ duration: 0.18 }}>
                  <div className="space-y-6">
                    <Card
                      title="Referrals"
                      description="Invite friends and track who joined."
                      right={
                        <Button variant="secondary" onClick={loadAll}>
                          <RefreshCcw size={16} />
                          Refresh
                        </Button>
                      }
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold text-slate-500">YOUR INVITE</div>

                          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-xs text-slate-500">Invite code</div>
                              <div className="text-sm font-extrabold text-slate-900 truncate">
                                {invite?.inviteCode || "—"}
                              </div>
                            </div>
                            <Button
                              variant="secondary"
                              className="px-3"
                              disabled={!invite?.inviteCode}
                              onClick={() => invite?.inviteCode && copy(invite.inviteCode)}
                            >
                              <CopyIcon size={16} />
                              Copy
                            </Button>
                          </div>

                          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <div className="text-sm font-semibold text-slate-900">Invited count</div>
                            <Badge>{invite?.invitedCount ?? 0}</Badge>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="text-xs font-semibold text-slate-500">INVITED USERS</div>

                          {loading ? (
                            <div className="mt-3 text-sm text-slate-600">Loading…</div>
                          ) : invited.length === 0 ? (
                            <div className="mt-3 text-sm text-slate-600 italic">
                              No invited users yet.
                            </div>
                          ) : (
                            <div className="mt-3 space-y-2 max-h-[320px] overflow-auto pr-1">
                              {invited.map((u) => (
                                <button
                                  key={u.id}
                                  onClick={() => router.push(`/profile/${u.id}`)}
                                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 transition text-left"
                                >
                                  <img
                                    src={u.avatar ? `/avatars/${u.avatar}` : "/avatars/default.png"}
                                    alt={u.name}
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-900 truncate">
                                      {u.name}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      Joined: {fmtDate(u.createdAt)}
                                      {u.currentLevel != null ? ` • Lv.${u.currentLevel}` : ""}
                                    </div>
                                  </div>
                                  <ChevronRight size={16} className="text-slate-400" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* PREFERENCES */}
              {tab === "preferences" && (
                <motion.div key="preferences" {...tabAnim} transition={{ duration: 0.18 }}>
                  <div className="space-y-6">
                    <Card
                      title="Preferences"
                      description="Saved on this device only."
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">24-hour time</div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              Preview: {fmtDateTime(new Date().toISOString(), use24h)}
                            </div>
                          </div>
                          <Button
                            variant={use24h ? "primary" : "secondary"}
                            onClick={() => setUse24h((v) => !v)}
                            aria-pressed={use24h}
                            className="min-w-[96px]"
                          >
                            {use24h ? "On" : "Off"}
                          </Button>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-sm font-semibold text-slate-900">Appearance</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Theme switching is not enabled (your pages have custom styles).
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* BLOCKED */}
              {tab === "blocked" && (
                <motion.div key="blocked" {...tabAnim} transition={{ duration: 0.18 }}>
                  <div className="space-y-6">
                    <Card
                      title="Blocked users"
                      description="Coming soon."
                      right={<Badge>Planned</Badge>}
                    >
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm text-slate-700">
                          You don’t currently have blocked users added.
                        </div>
                        <Button
                          variant="secondary"
                          disabled
                          className="mt-3"
                        >
                          Manage blocked users (coming soon)
                        </Button>
                      </div>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="pt-2">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  ["Help", "/help"],
                  ["Contact", "/contact"],
                  ["Careers", "/careers"],
                  ["About", "/about"],
                  ["Privacy", "/privacy"],
                ].map(([label, href]) => (
                  <Button
                    key={label}
                    variant="secondary"
                    className="w-full"
                    onClick={() => router.push(href)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <p className="text-center text-xs text-slate-500 mt-6">
                © {new Date().getFullYear()} Networ.King
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout all modal */}
      <AnimatePresence>
        {logoutAllOpen && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
              onClick={() => setLogoutAllOpen(false)}
            >
              <motion.div
                initial={{ y: 14, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 10, opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-5"
              >
                <div className="text-lg font-extrabold text-slate-900">Log out all devices?</div>
                <p className="text-sm text-slate-600 mt-2">
                  This invalidates your active session token.
                </p>

                <div className="mt-5 flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => setLogoutAllOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={logoutAllDevices}>
                    <LogOut size={16} />
                    Log out
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Delete modal */}
      <AnimatePresence>
        {deleteOpen && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteMsg("");
                setDeletePassword("");
              }}
            >
              <motion.div
                initial={{ y: 14, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 10, opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-5"
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={18} className="text-red-600" />
                  <div className="text-lg font-extrabold text-slate-900">Delete account</div>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  This is permanent. Enter your password to confirm.
                </p>

                <div className="mt-4">
                  <Field label="Password">
                    <Input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </Field>
                  {deleteMsg ? (
                    <div className="mt-2 text-xs font-semibold text-red-600">
                      {deleteMsg}
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDeleteOpen(false);
                      setDeleteMsg("");
                      setDeletePassword("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={deleteAccount}>
                    Delete
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </main>
  );
}
