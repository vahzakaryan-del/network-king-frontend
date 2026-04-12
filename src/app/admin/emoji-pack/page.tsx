"use client";

import { useState } from "react";

export default function EmojiPackPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const generate = async () => {
  setLoading(true);
  setDone(false);

  try {
    // 👇 ADD THIS LINE HERE
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/generate-emoji-pack`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // 👈 AND ADD THIS
        },
      }
    );

    const data = await res.json();
    console.log(data);

    setDone(true);
  } catch (err) {
    console.error(err);
    alert("Failed");
  }

  setLoading(false);
};

  return (
    <div className="p-10">
      <h1 className="text-xl font-bold mb-4">Emoji Pack Generator</h1>

      <button
        onClick={generate}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded"
      >
        {loading ? "Generating..." : "Generate Emoji Pack"}
      </button>

      {done && <p className="mt-4 text-green-500">Done ✅</p>}
    </div>
  );
}