"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export default function AdminDailyTestsPage() {
  const router = useRouter();
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const [tests, setTests] = useState<any[]>([]);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [todayBoard, setTodayBoard] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);

  
  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        // load tests
        const testsRes = await fetch(`${API_BASE}/admin/tests`, {
  headers: { Authorization: `Bearer ${token}` },
});

const testsData = await testsRes.json();

if (!testsRes.ok) {
  throw new Error(testsData?.error || "Failed to load tests");
}

setTests(testsData.tests || []);

// 🔥 load schedule
const schedRes = await fetch(`${API_BASE}/admin/daily-test-schedule`, {
  headers: { Authorization: `Bearer ${token}` },
});
const schedData = await schedRes.json();
setSchedule(schedData.schedules || []);

        // load today's leaderboard
        const boardRes = await fetch(
          `${API_BASE}/debug/leaderboard`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const boardData = await boardRes.json();
        setTodayBoard(boardData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();    
  }, [token]);



  async function scheduleTest() {
    if (!date || !selectedTestId) {
      alert("Select date and test");
      return;
    }

    const res = await fetch(
      `${API_BASE}/admin/daily-test-schedule`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date,
          testId: Number(selectedTestId),
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) return alert(data.error || "Failed");

    alert("Daily test scheduled 👑");
  }

  async function resetToday() {
    if (!confirm("Reset today's leaderboard?")) return;
    
    

    await fetch(
      `${API_BASE}/admin/debug/reset-today-leaderboard`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    alert("Today's leaderboard reset.");
    window.location.reload();
  }

  

  if (loading) {
    return <div className="p-10 text-white">Loading...</div>;
  }

 

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white p-10">
      <div className="max-w-4xl mx-auto bg-white/10 border border-white/20 rounded-2xl p-6">

        <h1 className="text-3xl font-bold text-amber-300 mb-6">
          🏆 Daily Test Manager
        </h1>

        {/* SCHEDULE NEW */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">
            Schedule Daily Test
          </h2>

          <div className="grid md:grid-cols-3 gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded bg-white/10 border border-white/20"
            />

            <select
              value={selectedTestId}
              onChange={(e) =>
                setSelectedTestId(e.target.value)
              }
              className="px-3 py-2 rounded bg-pink-400 border border-white/20"
            >
              <option value="">Select Test</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>

            <button
              onClick={scheduleTest}
              className="bg-amber-400 text-black font-bold rounded px-4"
            >
              Schedule
            </button>
          </div>
        </div>

        {/* TODAY STATUS */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">
            Today Status
          </h2>

          {todayBoard ? (
            <div className="bg-white/10 p-4 rounded-lg">
              <div>
                <strong>Test ID:</strong> {todayBoard.testId}
              </div>
              <div>
                <strong>Participants:</strong>{" "}
                {todayBoard.entries?.length || 0}
              </div>
              <div>
                <strong>Locked:</strong>{" "}
                {todayBoard.locked ? "Yes" : "No"}
              </div>

              <button
                onClick={resetToday}
                className="mt-4 bg-red-500 px-3 py-1 rounded text-sm"
              >
                Reset Today Leaderboard
              </button>
            </div>
          ) : (
            <div>No leaderboard created yet.</div>
          )}

          <div className="mb-6">
  <h2 className="text-xl mt-5 font-semibold mb-3">
    Upcoming Schedule
  </h2>

  {schedule.length > 0 ? (
    <div className="space-y-2">
      {schedule.map((s) => (
        <div key={s.date} className="bg-white/10 p-3 rounded">
          <strong>{new Date(s.date).toISOString().slice(0, 10)}</strong>
          {" → "}
          {s.test?.title || "Unknown"}
        </div>
      ))}
    </div>
  ) : (
    <div>No scheduled tests</div>
  )}
</div>

        </div>

        

        <button
          onClick={() => router.push("/admin")}
          className="mt-6 bg-white/10 px-4 py-2 rounded border border-white/20"
        >
          ← Back to Admin
        </button>
      </div>
    </main>
  );
}