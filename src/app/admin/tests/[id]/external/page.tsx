"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function ExternalTestAdminPage() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [test, setTest] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [cooldownDays, setCooldownDays] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  // -----------------------------
  // Load test (admin)
  // -----------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    (async () => {
      try {
        const res = await fetch(`http://localhost:4000/admin/tests/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setTest(data.test);
        setTitle(data.test.title);
        setDescription(data.test.description || "");
        setExternalUrl(data.test.externalUrl || "");
        setCooldownDays(data.test.cooldownDays ?? null);
        setIsActive(data.test.isActive);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // -----------------------------
  // Save changes
  // -----------------------------
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Not authorized");

      const res = await fetch(`http://localhost:4000/admin/tests/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          externalUrl,
          mode: "external",
          cooldownDays,
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("External test updated!");
      router.push("/admin/tests");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  if (loading) {
    return (
      <main className="min-h-screen text-white grid place-items-center">
        Loading external test…
      </main>
    );
  }

  if (error || !test) {
    return (
      <main className="min-h-screen text-white grid place-items-center">
        {error || "Test not found"}
      </main>
    );
  }

  return (
    <main className="min-h-screen text-white p-6 bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400">
      <div className="max-w-3xl mx-auto bg-white/10 border border-white/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold mb-4 text-amber-300">
          🌐 Manage External Test
        </h1>

        <p className="text-white/70 mb-6">
          This test loads an external website inside an iframe.  
          No questions are created in the system.
        </p>

        {/* TITLE */}
        <div className="mb-4">
          <label className="block mb-1">Title</label>
          <Input
            className="bg-white/10 border-white/20"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* DESCRIPTION */}
        <div className="mb-4">
          <label className="block mb-1">Description</label>
          <Textarea
            className="bg-white/10 border-white/20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* EXTERNAL URL */}
        <div className="mb-4">
          <label className="block mb-1">External Test URL</label>
          <Input
            className="bg-white/10 border-white/20"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://your-iq-test-provider.com/start?id=123"
          />
          <p className="text-xs text-white/60 mt-1">
            This URL will load inside an iframe.
          </p>
        </div>

        {/* COOLDOWN */}
        <div className="mb-4">
          <label className="block mb-1">Cooldown Days</label>
          <Input
            type="number"
            className="bg-white/10 border-white/20"
            value={cooldownDays ?? ""}
            onChange={(e) =>
              setCooldownDays(e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>

        {/* ACTIVE */}
        <div className="flex items-center gap-3 mb-6">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <span className="text-sm">Active Test</span>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-between">
          <button
            onClick={() => router.push("/admin/tests")}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
          >
            ← Back
          </button>

          <Button
            className="bg-amber-400 text-black font-semibold px-6"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </main>
  );
}
