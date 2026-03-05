"use client";

import { useState, useEffect } from "react";
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

/* --------------------------- BADGE SELECTOR --------------------------- */
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


  const fetchBadges = async () => {
    const res = await fetch("http://localhost:4000/badges");
    const data = await res.json();
    setBadges(data);
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  useEffect(() => {
    const found = badges.find((b) => b.id === badgeId);
    setPreview(found || null);
  }, [badgeId, badges]);

  const handleUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name =
      prompt("Enter badge name:", file.name.split(".")[0]) || "New Badge";
    const rarity =
      prompt(
        "Enter badge rarity (bronze/silver/gold/legendary/custom):",
        "custom"
      ) || "custom";

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("rarity", rarity);

  const token = localStorage.getItem("token");

const res = await fetch("http://localhost:4000/admin/badges/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});


    const data = await res.json();
    if (res.ok) {
      alert("Badge uploaded successfully!");
      fetchBadges();
    } else {
      alert(data.error || "Failed to upload badge");
    }
    setUploading(false);
  };

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
            src={preview.icon}
            alt={preview.name}
            className="w-10 h-10 rounded-lg object-contain"
          />
          <div>
            <p className="text-sm font-semibold">{preview.name}</p>
            <p className="text-xs text-gray-400 capitalize">{preview.rarity}</p>
          </div>
        </div>
      )}
    </div>
  );
}



/* ------------------------------ MAIN PAGE ------------------------------ */

export default function NewTestPage() {
  const router = useRouter();

  // Existing state
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
  const [scoringType, setScoringType] = useState<"percentage" | "byPoints">("percentage");


  // ⭐️ NEW: External test support
  const [mode, setMode] = useState<"internal" | "external">("internal");
  const [externalUrl, setExternalUrl] = useState("");

  /* ------------------------ CREATE TEST FOR QUESTIONS ------------------------ */
 const handleManageQuestions = async () => {
  if (!title.trim()) {
    alert("Please enter a test title first!");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You are not authorized.");
      return;
    }

    const bodyData = {
      title: title.trim(),
      description: description.trim(),
      category,
      difficulty,
      timeLimit: timeLimit ?? null,
      allowedAttempts: allowedAttempts ?? null,
      cooldownDays: cooldownDays ?? null,
      isActive,
      badgeId,
      scoringType,

      icon: icon.trim() || null,
      mode,
      externalUrl: mode === "external" ? externalUrl : null,
    };

    const res = await fetch("http://localhost:4000/admin/tests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bodyData),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to create test");

    toast.success("Test created successfully!");

    // ⭐ THE IMPORTANT FIX
    if (mode === "external") {
      router.push(`/admin/tests/${data.test.id}/external`);
    } else {
      router.push(`/admin/tests/${data.test.id}/questions`);
    }

  } catch (err: any) {
    console.error(err);
    alert(err.message || "Error while managing questions");
  }
};


  /* ------------------------------ SAVE TEST DRAFT ------------------------------ */
 const handleSave = async () => {
  if (!title.trim()) {
    toast.error("Title is required");
    return;
  }

  try {
    setIsSaving(true);
    const token = localStorage.getItem("token");
    if (!token) return alert("Not authorized");

    const res = await fetch("http://localhost:4000/admin/tests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description,
        category,
        difficulty,
        timeLimit,
        allowedAttempts,
        cooldownDays,
        isActive,
        badgeId,
        scoringType,
        mode,
        externalUrl: mode === "external" ? externalUrl : null,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save test");

    toast.success("Test saved successfully!");

    // ⭐ THE IMPORTANT FIX
    if (mode === "external") {
      router.push(`/admin/tests/${data.test.id}/external`);
    } else {
      router.push(`/admin/tests/${data.test.id}/questions`);
    }

  } catch (err: any) {
    console.error(err);
    toast.error(err.message || "Failed to save test");
  } finally {
    setIsSaving(false);
  }
};


  /* ---------------------------- RENDER PAGE ---------------------------- */

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">🧩 Create New Test</CardTitle>
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

          {/* ICON URL */}
          <div>
            <Label className="block text-sm font-medium">🖼️ Test Icon (URL)</Label>
            <Input
              placeholder="https://example.com/icon.png"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />
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

          {/* MODE */}
          <div>
  <Label className="block text-sm font-medium">🧮 Scoring Type</Label>
  <select
    value={scoringType}
    onChange={(e) => setScoringType(e.target.value as "percentage" | "byPoints")}
    className="w-full rounded-md border border-gray-300 p-2 mt-1"
  >
    <option value="percentage">Percentage (default)</option>
    <option value="byPoints">By points</option>
  </select>
  <p className="text-xs text-gray-400 mt-1">
    Percentage = normal tests. By points = IQ/EQ/etc (points per question).
  </p>
</div>

          
          <div>
              

            <Label className="block text-sm font-medium">🧪 Test Mode</Label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "internal" | "external")}
              className="w-full rounded-md border border-gray-300 p-2 mt-1"
            >
              <option value="internal">Internal (created inside site)</option>
              <option value="external">External Test (iframe)</option>
            </select>
          </div>

          {/* EXTERNAL URL */}
          {mode === "external" && (
            <div>
              <Label className="block text-sm font-medium">🌐 External Test URL</Label>
              <Input
                placeholder="https://external-iq-test.com/embed?id=123"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                This page will load inside an iframe and return a score.
              </p>
            </div>
          )}

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
                  setAllowedAttempts(
                    e.target.value ? Number(e.target.value) : null
                  )
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
                  setCooldownDays(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
              />
            </div>
          </div>

          {/* ACTIVE SWITCH */}
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>✅ Active (default OFF)</Label>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-between pt-4">
            <button
              onClick={() => router.push("/admin/tests")}
              className="px-4 py-2 rounded-lg bg-black hover:bg-gray-800 border border-gray-700 text-white transition"
            >
              ← Go Back to Tests
            </button>

            <Button
              variant="secondary"
              disabled={isSaving}
              onClick={handleSave}
            >
              💾 Save as Draft
            </Button>

            <Button
              disabled={isSaving || !title.trim()}
              onClick={handleManageQuestions}
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
