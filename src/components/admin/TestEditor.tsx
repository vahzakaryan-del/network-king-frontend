"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "sonner";

type Difficulty = "bronze" | "silver" | "gold" | "legendary";
type Category = "achievement" | "fun";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

function resolveBadgeIcon(icon?: string | null) {
  if (!icon) return "";
  const s = String(icon).trim();

  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${API_BASE}${s}`;
  return `${API_BASE}/${s}`;
}
function resolveAssetUrl(path?: string | null) {
  if (!path) return "";
  const s = String(path).trim();

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  if (s.startsWith("/")) return `${API_BASE}${s}`;

  return `${API_BASE}/${s}`;
}

/* ------------------------------------------------------------------------ */
/*                            BADGE SELECTOR                                */
/* ------------------------------------------------------------------------ */
function BadgeSelector({
  badgeId,
  setBadgeId,
}: {
  badgeId: number | null;
  setBadgeId: (id: number | null) => void;
}) {
  const [badges, setBadges] = useState<any[]>([]);
  const [preview, setPreview] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  async function safeJson(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return { raw: text };
    }
  }

  const fetchBadges = async () => {
    const res = await fetch(`${API_BASE}/badges`);
    const data = await safeJson(res);

    if (!res.ok) {
      console.error("❌ fetch badges failed:", data);
      alert(data?.error || data?.raw || "Failed to load badges");
      return;
    }

    setBadges(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const found = badges.find((b) => b.id === badgeId);
    setPreview(found || null);
  }, [badgeId, badges]);

  const handleUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Missing token. Please login again.");
      return;
    }

    const name =
      prompt("Enter badge name:", file.name.split(".")[0]) || "New Badge";
    const rarity =
      prompt(
        "Enter badge rarity (bronze/silver/gold/legendary/custom):",
        "custom"
      ) || "custom";

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("rarity", rarity);

      const res = await fetch(`${API_BASE}/admin/badges/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await safeJson(res);

      if (!res.ok) {
        console.error("❌ upload failed:", data);
        alert(data?.error || data?.raw || `Upload failed (${res.status})`);
        return;
      }

      alert("Badge uploaded successfully!");

      // reload list, then auto-select uploaded badge if backend returns it
      await fetchBadges();
      if (data?.id) setBadgeId(Number(data.id));
    } catch (err) {
      console.error("❌ upload network error:", err);
      alert("Network error uploading badge");
    } finally {
      setUploading(false);
      e.target.value = ""; // allow selecting same file again
    }
  };

  // ✅ IMPORTANT: resolve icon + cache-bust so preview never stays “broken”
  const previewSrc =
    preview?.icon
      ? `${resolveBadgeIcon(preview.icon)}?v=${encodeURIComponent(
          String(preview.updatedAt || preview.id || Date.now())
        )}`
      : "";

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-center">
        <select
          value={badgeId ?? ""}
          onChange={(e) =>
            setBadgeId(e.target.value ? Number(e.target.value) : null)
          }
          className="flex-1 rounded-md border border-gray-300 p-2"
        >
          <option value="">No badge</option>
          {badges.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.rarity})
            </option>
          ))}
        </select>

        <label className="cursor-pointer px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-gray-300 text-sm">
          {uploading ? "Uploading..." : "➕ Add"}
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {preview && (
        <div className="mt-2 flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10">
          <img
            src={previewSrc}
            alt={preview.name}
            className="w-10 h-10 rounded-lg object-contain"
            onError={(ev) => {
              console.error("❌ badge image failed:", {
                icon: preview.icon,
                resolved: previewSrc,
              });
              (ev.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <p className="text-sm font-semibold">{preview.name}</p>
            <p className="text-xs text-gray-400 capitalize">{preview.rarity}</p>
            <p className="text-[10px] text-gray-500 break-all">{previewSrc}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/*                           MAIN TEST EDITOR                               */
/* ------------------------------------------------------------------------ */

interface TestEditorProps {
  mode: "create" | "edit";
  testData?: any;
}

export default function TestEditor({ mode, testData }: TestEditorProps) {
  const router = useRouter();

  const [category, setCategory] = useState<Category>("fun");
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("bronze");
  const [badgeId, setBadgeId] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [allowedAttempts, setAllowedAttempts] = useState<number | null>(null);
  const [cooldownDays, setCooldownDays] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [scoringType, setScoringType] = useState<"percentage" | "byPoints">(
    "percentage"
  );

  // NEW FIELDS
  const [testMode, setTestMode] = useState<"internal" | "external">("internal");
  const [externalUrl, setExternalUrl] = useState("");

  const handleTestModeChange = (newMode: "internal" | "external") => {
    if (mode === "edit" && newMode !== testMode) {
      const ok = confirm(
        `Are you sure you want to change this test type to "${newMode}"?\n\n` +
          `⚠️ WARNING: Changing this can break how the test works.`
      );
      if (!ok) return;
    }

    setTestMode(newMode);
  };

  /* ------------------------- PREFILL FOR EDIT MODE ------------------------- */

  useEffect(() => {
    if (mode === "edit" && testData) {
      setCategory(testData.category || "fun");
      setTitle(testData.title || "");
      setIcon(testData.icon || "");
      setDescription(testData.description || "");
      setDifficulty(testData.difficulty || "bronze");
      setBadgeId(testData.badgeId ?? null);
      setTimeLimit(testData.timeLimit ?? null);
      setAllowedAttempts(testData.allowedAttempts ?? null);
      setCooldownDays(testData.cooldownDays ?? null);
      setIsActive(testData.isActive ?? false);

      setScoringType(testData.scoringType || "percentage");

      setTestMode(testData.mode || "internal");
      setExternalUrl(testData.externalUrl || "");
    }
  }, [mode, testData]);

  /* ------------------------------ SAVE TEST ------------------------------ */

  const handleSave = async (goToQuestions = false) => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Not authorized");
      return;
    }

    setIsSaving(true);

    const bodyData = {
      title: title.trim(),
      description: description.trim(),
      category,
      type: "multiple_choice",
      difficulty,
      scoringType,
      timeLimit,
      allowedAttempts,
      cooldownDays,
      isActive,
      badgeId,
      icon: icon.trim() || null,
      mode: testMode,
      externalUrl: testMode === "external" ? externalUrl : null,
    };

    try {
      const url =
  mode === "edit"
    ? `${process.env.NEXT_PUBLIC_API_URL}/admin/tests/${testData.id}`
    : `${process.env.NEXT_PUBLIC_API_URL}/admin/tests`;

      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save test");

      toast.success(`Test ${mode === "edit" ? "updated" : "created"}!`);

      if (goToQuestions) {
        if (testMode === "external") {
          router.push(`/admin/tests/${data.test.id}/external`);
        } else {
          router.push(`/admin/tests/${data.test.id}/questions`);
        }
      } else {
        router.push("/admin/tests");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save test");
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ FIX: Resolve local "/tests/..." to backend URL for preview
const iconPreviewSrc = icon
  ? `${resolveAssetUrl(icon)}?v=${Date.now()}`
  : "";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {mode === "create" ? "🧩 Create New Test" : "✏️ Edit Test"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* CATEGORY */}
          <div>
            <Label className="mb-2 block text-sm font-medium">🎯 Category</Label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCategory("achievement")}
                className={`px-4 py-2 rounded-xl border ${
                  category === "achievement"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                🏆 Achievement
              </button>
              <button
                type="button"
                onClick={() => setCategory("fun")}
                className={`px-4 py-2 rounded-xl border ${
                  category === "fun"
                    ? "bg-pink-500 text-white border-pink-500"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                🎮 Fun
              </button>
            </div>
          </div>

          {/* TITLE */}
          <div>
            <Label className="block text-sm font-medium">🏷️ Title</Label>
            <Input
              placeholder="Enter test title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* ICON */}
          <div>
            <Label className="block text-sm font-medium">🖼️ Test Icon URL</Label>
            <Input
              placeholder="https://example.com/icon.png"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />

            {icon && (
              <div className="mt-3">
                <img
                  src={iconPreviewSrc}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border border-gray-300 shadow"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}
          </div>

          {/* DESCRIPTION */}
          <div>
            <Label className="block text-sm font-medium">📝 Description</Label>
            <Textarea
              placeholder="Describe the test..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* DIFFICULTY */}
          <div>
            <Label className="block text-sm font-medium">💪 Difficulty</Label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="bronze">🥉 Bronze</option>
              <option value="silver">🥈 Silver</option>
              <option value="gold">🥇 Gold</option>
              <option value="legendary">🏆 Legendary</option>
            </select>
          </div>

          {/* TEST MODE */}
          <div>
            <Label className="block text-sm font-medium">🧪 Test Mode</Label>
            <select
              value={testMode}
              onChange={(e) =>
                handleTestModeChange(e.target.value as "internal" | "external")
              }
              className="w-full rounded-md border border-gray-300 p-2 mt-1"
            >
              <option value="internal">Internal (multiple-choice)</option>
              <option value="external">External Test (iframe)</option>
            </select>
          </div>

          {testMode === "external" && (
            <div>
              <Label className="block text-sm font-medium">
                🌐 External Test URL
              </Label>
              <Input
                placeholder="https://external-test.com/embed"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                This page will load in an iframe and return the score.
              </p>
            </div>
          )}

          <div>
            <Label className="block text-sm font-medium">🧮 Scoring Type</Label>
            <select
              value={scoringType}
              onChange={(e) =>
                setScoringType(e.target.value as "percentage" | "byPoints")
              }
              className="w-full rounded-md border border-gray-300 p-2 mt-1"
            >
              <option value="percentage">Percentage (default)</option>
              <option value="byPoints">By points</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Percentage = normal tests. By points = IQ/EQ/etc (points per
              question).
            </p>
          </div>

          {/* BADGE */}
          <div>
            <Label className="block text-sm font-medium">🏅 Badge (optional)</Label>
            <BadgeSelector badgeId={badgeId} setBadgeId={setBadgeId} />
          </div>

          {/* SETTINGS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>⏱️ Time Limit (seconds)</Label>
              <Input
                type="number"
                min={0}
                value={timeLimit ?? ""}
                onChange={(e) =>
                  setTimeLimit(e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div>
              <Label>🧮 Allowed Attempts</Label>
              <Input
                type="number"
                min={0}
                value={allowedAttempts ?? ""}
                onChange={(e) =>
                  setAllowedAttempts(e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div>
              <Label>🧊 Cooldown (days)</Label>
              <Input
                type="number"
                min={0}
                value={cooldownDays ?? ""}
                onChange={(e) =>
                  setCooldownDays(e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
          </div>

          {/* ACTIVE SWITCH */}
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>✅ Active (default OFF)</Label>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-between pt-4">
            <button
              onClick={() => router.push("/admin/tests")}
              className="px-4 py-2 rounded-lg bg-black hover:bg-gray-800 border border-gray-700 text-white transition"
            >
              ← Back to Tests
            </button>

            <Button
              variant="secondary"
              disabled={isSaving}
              onClick={() => handleSave(false)}
            >
              💾 {mode === "edit" ? "Save Changes" : "Save Draft"}
            </Button>

            <Button
              disabled={isSaving || !title.trim()}
              onClick={() => handleSave(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              🚀 Manage Questions
            </Button>
          </div>
        </CardContent>
      </Card>

      <Toaster />
    </div>
  );
}