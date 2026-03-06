"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import RichQuestionEditor from "./RichQuestionEditor";


// ---------- TYPES ----------
type QuestionMode = "single" | "multiple" | "input" | "picture";

type Choice = {
  id?: number;
  text: string;
  isCorrect?: boolean;
};

type Question = {
  id?: number;
  content: string;
  mode: QuestionMode;
  imageUrl?: string;
  choices: Choice[];
  correctAnswers?: string[];
  points?: number;

};

// ========== PAGE COMPONENT ==========
export default function ManageQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params?.id;
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testTitle, setTestTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const prevLenRef = useRef(0);
  const [scoringType, setScoringType] = useState<"percentage" | "byPoints">("percentage");
  

  const totalPoints = questions.reduce(
  (sum, q) => sum + (q.points ?? 1),
  0
);



const handleChangeToPicture = (qi: number) => {
  setQuestions((prev) =>
    prev.map((q, idx) =>
      idx !== qi
        ? q
        : {
            ...q,
            mode: "picture",
            imageUrl: q.imageUrl ?? "",
          }
    )
  );
};

const handleChangeToSingle = (qi: number) => {
  setQuestions((prev) =>
    prev.map((q, idx) =>
      idx !== qi
        ? q
        : {
            ...q,
            mode: "single",
            imageUrl: undefined, // optional: clear image
          }
    )
  );
};


  // 👇 Prevent localStorage issues by waiting for hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

useEffect(() => {
  const prev = prevLenRef.current;
  const next = questions.length;

  // ✅ only scroll when a question is added (length increases)
  if (next > prev) {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }

  prevLenRef.current = next;
}, [questions.length]);



  // ---------- LOAD QUESTIONS ----------
  useEffect(() => {
    if (!hydrated) return; // wait for browser
    if (!testId) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Missing authentication token");
      setLoading(false);
      return;
    }

    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);

      

      try {
        const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/admin/tests/${testId}/questions`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load questions");
        }

    
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
setTestTitle(data.testTitle ?? "");
setScoringType(data.scoringType ?? "percentage");

      } catch (err: any) {
        console.error("❌ Error loading questions:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [hydrated, testId]);

  // ---------- ADD QUESTION ----------
 const handleAddQuestion = (mode: QuestionMode) => {
  const q: Question = {
    content: "",
    mode,
    choices: [],
    correctAnswers: [],
    points: 1,
    imageUrl: "",
  };

  if (mode === "single" || mode === "multiple" || mode === "picture") {
    // picture still uses text answers like single/multiple
    q.choices = [{ text: "", isCorrect: false }];
  } else if (mode === "input") {
    q.correctAnswers = [""];
  }

  setQuestions((prev) => [...prev, q]);
};


  // ---------- REMOVE QUESTION ----------
  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- CHOICE ADD / REMOVE ----------
  // ✅ FIXED: immutable updates (prevents double-add / weird React state behavior)
  const handleAddChoice = (qi: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx !== qi
          ? q
          : {
              ...q,
              choices: [...(q.choices || []), { text: "", isCorrect: false }],
            }
      )
    );
  };

  // ✅ FIXED: immutable updates (prevents odd removals)
  const handleRemoveChoice = (qi: number, ci: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx !== qi
          ? q
          : {
              ...q,
              choices: q.choices.filter((_, j) => j !== ci),
            }
      )
    );
  };

  // ---------- SAVE ----------
  const handleSaveAll = async () => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Unauthorized – no token found");

    try {
     const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/admin/tests/${testId}/questions/bulk`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ questions }),
  }
);

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save questions");

      alert("✅ Saved successfully!");
      router.push("/admin/tests");
    } catch (err: any) {
      alert(err.message || "Save failed");
    }
  };

  // ---------- UI ----------
  if (loading)
    return (
      <main className="min-h-screen grid place-items-center text-white bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </main>
    );

  return (
    <main className="min-h-screen p-6 text-white bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400">
<div className="max-w-5xl mx-auto pb-28">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-amber-300">🧠 Manage Questions</h1>
            <p className="text-white/70 mt-1">
              {testTitle || `Test #${testId}`}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/admin/tests")}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15"
            >
              ← Back
            </button>

            <button
              onClick={handleSaveAll}
              className="px-4 py-2 rounded-lg bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 transition"
            >
              💾 Save All
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="p-3 mb-4 rounded bg-red-500/20 border border-red-400/40">
            ❌ {error}
          </div>
        )}

       

        {/* NO QUESTIONS */}
        {questions.length === 0 && (
          <div className="text-center text-white/60 py-10">No questions yet.</div>
        )}

        {/* QUESTIONS LIST */}
{questions.map((q, qi) => (
  <motion.div
    key={qi}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-6 rounded-xl bg-white/10 border border-white/15 p-4 shadow-lg"
  >
    {/* TITLE */}
    <div className="flex justify-between items-center mb-3">
      <h2 className="font-semibold text-lg">
        Question #{qi + 1} — {q.mode}
      </h2>
     <div className="flex gap-2 items-center">
  {q.mode !== "picture" && (
    <button
  onClick={() => handleChangeToPicture(qi)}
  className="text-xs rounded-full bg-amber-100 px-3 py-1 text-purple-900 hover:bg-amber-500 transition-colors"
>
      🖼️ Change to Picture
    </button>
  )}

  {q.mode === "picture" && (
    <button
      onClick={() => handleChangeToSingle(qi)}
      className="text-xs text-blue-300 hover:text-blue-200"
    >
      🔁 Change to Single
    </button>
  )}

  <button
    onClick={() => handleRemoveQuestion(qi)}
    className="text-xs rounded-full bg-red-400 px-3 py-1 text-white hover:bg-red-600 transition-colors"
  >
    ✖ Remove
  </button>
</div>
    </div>



    {/* OPTIONAL QUESTION TEXT (for ALL modes, including picture) */}
   <div className="mb-3">
  <RichQuestionEditor
    value={q.content}
    onChange={(html) => {
  setQuestions((prev) =>
    prev.map((qq, idx) => (idx === qi ? { ...qq, content: html } : qq))
  );
}}
    placeholder={
      q.mode === "picture"
        ? "Optional text (you can leave this empty)"
        : "Enter question text"
    }
  />
</div>


            {/* POINTS (optional) */}
{/* POINTS — only for byPoints tests */}
{scoringType === "byPoints" && (
  <div className="mb-3 flex items-center gap-3">
    <label className="text-sm text-white/70">Points</label>
    <input
      type="number"
      min={1}
      value={q.points ?? 1}
      onChange={(e) => {
  const v = Number(e.target.value);

  setQuestions((prev) =>
    prev.map((qq, idx) =>
      idx === qi
        ? { ...qq, points: Number.isFinite(v) && v > 0 ? v : 1 }
        : qq
    )
  );
}}

      className="w-28 px-3 py-2 rounded bg-white/10 border border-white/15 outline-none"
    />
    <span className="text-xs text-white/50">Default 1</span>
  </div>
)}

{q.mode === "picture" && (
  <div className="mb-3 space-y-2">
    <input
      value={q.imageUrl || ""}
      onChange={(e) => {
        setQuestions(prev =>
          prev.map((q, idx) =>
            idx === qi
              ? { ...q, imageUrl: e.target.value }
              : q
          )
        );
      }}
      placeholder="Image URL (paste link to picture)"
      className="w-full px-3 py-2 rounded bg-white/10 border border-white/15 outline-none"
    />

    {/* Prepend the backend URL to the image path */}
   {q.imageUrl && (
  <img
    src={`${process.env.NEXT_PUBLIC_API_URL}${q.imageUrl}`}
    alt="Question preview"
    className="w-48 h-48 object-cover rounded border border-white/20"
  />
)}
  </div>
)}


            {/* MODE-SPECIFIC FIELDS */}
            {/* Input mode */}
            {q.mode === "input" && (
              <input
                value={q.correctAnswers?.[0] || ""}
                onChange={(e) => {
                  const arr = [...questions];
                  arr[qi].correctAnswers = [e.target.value];
                  setQuestions(arr);
                }}
                placeholder="Correct answer"
                className="w-full px-3 py-2 rounded bg-white/10 border-white/15"
              />
            )}

            {/* Cards & multiple-choice */}
            {(q.mode === "single" ||
  q.mode === "multiple" ||
  q.mode === "picture") && (
              <div className="space-y-2">
                {q.choices.map((c, ci) => (
                  <div
                    key={ci}
                    className="flex items-center gap-3 bg-white/5 p-3 rounded"
                  >
                    {/* Choice text */}
                    <input
                      value={c.text}
                      onChange={(e) => {
                        const arr = [...questions];
                        arr[qi].choices[ci].text = e.target.value;
                        setQuestions(arr);
                      }}
                      placeholder={`Choice ${ci + 1}`}
                      className="flex-1 bg-transparent outline-none"
                    />

                                  

                   {/* Correct checkbox */}
{(q.mode === "single" || q.mode === "multiple" || q.mode === "picture") && (
  <input
    type={q.mode === "multiple" ? "checkbox" : "radio"}
name={`correct-${qi}`}

    checked={!!c.isCorrect}
    onChange={(e) => {
      const checked = e.target.checked;
      const arr = [...questions];

     if (q.mode === "single" || q.mode === "picture") {
  // ✅ enforce ONLY ONE correct answer
  arr[qi].choices = arr[qi].choices.map((choice, index) => ({
    ...choice,
    isCorrect: checked ? index === ci : false,
  }));
} else {
  // multiple choice → allow many
  arr[qi].choices[ci].isCorrect = checked;
}


      setQuestions(arr);
    }}
  />
)}


                    <button
                      onClick={() => handleRemoveChoice(qi, ci)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      ✖
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => handleAddChoice(qi)}
                  className="text-xs text-amber-300 hover:text-amber-200"
                >
                  ➕ Add choice
                </button>
              </div>
            )}

            
          </motion.div>
        ))}

           {/* ADD QUESTION (sticky bottom) */}
<div className="sticky bottom-0 mt-8 pt-4 pb-4">
  {/* background/blur layer */}
  <div className="rounded-xl bg-black/30 backdrop-blur border border-white/15 p-4 shadow-lg">

  
  {scoringType === "byPoints" && (
  <div className="mb-3 flex justify-between items-center text-sm">
    <span className="text-white/70">Total Points</span>
    <span className="px-3 py-1 rounded bg-amber-400 text-gray-900 font-semibold">
      {totalPoints}
    </span>
  </div>
)}
    <label className="block text-white/80 mb-2">Add Question:</label>

    <div className="flex flex-wrap gap-3">
      <button
        onClick={() => handleAddQuestion("single")}
        className="px-3 py-2 rounded bg-blue-500/20 border border-blue-300/30 hover:bg-blue-500/30"
      >
        ➕ One Choice
      </button>

      <button
        onClick={() => handleAddQuestion("multiple")}
        className="px-3 py-2 rounded bg-green-500/20 border border-green-300/30 hover:bg-green-500/30"
      >
        ➕ Multiple Choice
      </button>

      <button
        onClick={() => handleAddQuestion("input")}
        className="px-3 py-2 rounded bg-yellow-500/20 border border-yellow-300/30 hover:bg-yellow-500/30"
      >
        ➕ Input
      </button>

      <button
  onClick={() => handleAddQuestion("picture")}
  className="px-3 py-2 rounded bg-purple-500/20 border border-purple-300/30 hover:bg-purple-500/30"
>
  🖼️ Picture
</button>

    </div>
  </div>


</div>


      </div>

      
    </main>
  );
}
