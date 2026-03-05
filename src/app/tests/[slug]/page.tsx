"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

type TimerProps = {
  endTime: number;
  onExpire: () => void;
};

export function Timer({ endTime, onExpire }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.floor((endTime - Date.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return <div className="mb-4 text-lg">⏳ Time left: <b>{formatTime(timeLeft)}</b></div>;
}


// TYPES
type Question = {
  id: number;
  content: string;
  mode: "single" | "multiple" | "input" | "picture";
  imageUrl?: string | null;
  videoUrl?: string | null;
  choices?: { id: number; text: string; imageUrl?: string | null }[];
};

export default function TestPage() {
  const router = useRouter();
  const { slug } = useParams();
   // Create a ref to store the interval ID so we can clear it later
  const endTimeRef = useRef<number | null>(null);


  const API = "http://localhost:4000";

const assetUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API}${path.startsWith("/") ? "" : "/"}${path}`;
};

  // GLOBAL TEST FIELDS
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isTabInactive, setIsTabInactive] = useState(false);

  // INTERNAL TEST VARIABLES
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: any }>({});

  const [testTitle, setTestTitle] = useState("");

  const [submittingExternal, setSubmittingExternal] = useState(false);

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [submitting, setSubmitting] = useState(false);


  const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const [showExitWarning, setShowExitWarning] = useState(false);


  // -------------------------------------------------------
  // 1) LOAD TEST INFO (internal or external)  – FIXED
  // -------------------------------------------------------
  useEffect(() => {
    const fn = async () => {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");

      try {
        const res = await fetch(`http://localhost:4000/tests/${slug}/info`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed loading test");

        setTest(data.test);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fn();
  }, [slug, router]);

  // -------------------------------------------------------
  // 2) EXTERNAL TEST → LISTEN FOR SCORE  – FIXED
  // -------------------------------------------------------
  useEffect(() => {
    if (!test || test.mode !== "external") return;

    const handler = async (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      if (!("score" in event.data)) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      setSubmittingExternal(true);

      try {
        const res = await fetch(
          `http://localhost:4000/tests/${slug}/submit-external`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              score: event.data.score,
              metadata: event.data.metadata ?? null,
            }),
          }
        );

        const data = await res.json();
        if (res.ok) router.push(`/tests/${slug}/result?attempt=${data.attemptId}`);

      } catch (_) {}

      setSubmittingExternal(false);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [test, slug]);

  // -------------------------------------------------------
  // 3) INTERNAL TEST → START TEST  – FIXED
  // -------------------------------------------------------

  useEffect(() => {
    if (!test || test.mode !== "internal") return;

    const fn = async () => {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");

      try {
        const res = await fetch(
          `http://localhost:4000/tests/${slug}/start`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setAttemptId(data.attemptId);
        setTestTitle(data.title);
        if (data.timeLimit) {
  const end = Date.now() + data.timeLimit * 1000;
  endTimeRef.current = end;

}


        fetchQuestion(data.attemptId, 0);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fn();
  }, [test, slug]);

  const preloadImage = (url: string) => {
  const img = new Image();
  img.src = url;
};

const preloadNextQuestion = async (aId: number, nextIndex: number) => {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(
      `http://localhost:4000/tests/${aId}/question/${nextIndex}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return;

    const data = await res.json();

    if (data.question?.imageUrl) {
      const fullUrl = assetUrl(data.question.imageUrl);
      if (fullUrl) preloadImage(fullUrl);
    }

    // Preload choice images too (if picture mode)
    data.question?.choices?.forEach((c: any) => {
      if (c.imageUrl) {
        const fullUrl = assetUrl(c.imageUrl);
        if (fullUrl) preloadImage(fullUrl);
      }
    });

  } catch {
    // silently fail
  }
};

  // -------------------------------------------------------
  // 4) INTERNAL TEST → FETCH QUESTION  – FIXED
  // -------------------------------------------------------
  const fetchQuestion = async (aId: number, index: number) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `http://localhost:4000/tests/${aId}/question/${index}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setQuestion(data.question);
      setTotalQuestions(data.totalQuestions);
      setQuestionIndex(index);

      // Preload next question
if (index + 1 < data.totalQuestions) {
  preloadNextQuestion(aId, index + 1);
}

      const saved =
        userAnswers[data.question.id] ??
        data.savedAnswer ??
        (data.question.mode === "multiple" ? [] : "");

      setAnswer(saved);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // -------------------------------------------------------
  // 5) INTERNAL TEST → TIMER  – FIXED
  // -------------------------------------------------------

  useEffect(() => {
  const handler = () => {
    if (attemptId && !hasSubmitted) {
      navigator.sendBeacon(
        `http://localhost:4000/tests/${slug}/abandon`,
        JSON.stringify({ attemptId })
      );
    }
  };

  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [attemptId, hasSubmitted]);

// -------------------------------------------------------
// BEFORE UNLOAD CONFIRMATION
// -------------------------------------------------------
// Handle page reload
useEffect(() => {
  const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
    if (attemptId && !hasSubmitted) {
      e.preventDefault();  // Prevent immediate reload
      // Wait for the test to finish before the page reloads
      await finishTest();
      e.returnValue = ''; // Most browsers require this to show confirmation
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  
  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, [attemptId, hasSubmitted]);

// Handling popstate for Exit Warning
useEffect(() => {
  if (!attemptId || hasSubmitted) return;

  // Push a dummy state so Back triggers popstate
  window.history.pushState(null, "", window.location.href);

  const onPopState = () => {
    setShowExitWarning(true);
    // Re-push state so user can't escape without a choice
    window.history.pushState(null, "", window.location.href);
  };

  window.addEventListener("popstate", onPopState);
  return () => window.removeEventListener("popstate", onPopState);
}, [attemptId, hasSubmitted]);

  // -------------------------------------------------------
  // SAVE ANSWER (internal)
  // -------------------------------------------------------
  const saveAnswer = async (value: any) => {
    setAnswer(value);
    if (!attemptId || !question) return;

    setUserAnswers((prev) => ({ ...prev, [question.id]: value }));

    const token = localStorage.getItem("token");

    await fetch(`http://localhost:4000/tests/${attemptId}/answer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId: question.id,
        value,
      }),
    });
  };

  // -------------------------------------------------------
  // FINISH TEST (internal)
  // -------------------------------------------------------
  const finishTest = async () => {
  // Prevent multiple submissions or navigating before the test is submitted
  if (!attemptId || hasSubmitted || submitting) return;

  setSubmitting(true);  // Lock the button, preventing double-clicks
  setHasSubmitted(true); // Mark that the test has been submitted

  const token = localStorage.getItem("token");
  const formattedAnswers = Object.keys(userAnswers).map((qId) => ({
    questionId: Number(qId),
    value: userAnswers[Number(qId)],
  }));

  try {
    // 1. Send the answers to the backend
    const res = await fetch(
      `http://localhost:4000/tests/${slug}/submit`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attemptId, answers: formattedAnswers }),
      }
    );

    if (res.ok) {
      // 2. After the submission is successful, navigate to the result page
      const data = await res.json();
      router.push(`/tests/${slug}/result?attempt=${data.attemptId}`);
    } else {
      console.error("Failed to submit the test");
    }
  } catch (e) {
    console.error("Error submitting test", e);
  }

  // 3. Once everything is done, allow further submissions (if needed)
  setSubmitting(false);
};

//block copy paste text

useEffect(() => {
  const handleCopy = (e: ClipboardEvent) => {
    e.preventDefault();
  };

  document.addEventListener("copy", handleCopy);

  return () => {
    document.removeEventListener("copy", handleCopy);
  };
}, []);

//visibility listener

useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      setIsTabInactive(true);
    } else {
      setIsTabInactive(false);
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, []);

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
  if (loading) {
    return <div className="min-h-screen text-white grid place-items-center">Loading…</div>;
  }

  if (!test) {
    return <div className="min-h-screen text-white grid place-items-center">{error || "Not found"}</div>;
  }

  // --------- EXTERNAL TEST UI ----------
  if (test.mode === "external") {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center">
        <h1 className="text-3xl font-bold mt-8">{test.title}</h1>
        <p className="opacity-70 mb-4">{test.description}</p>

        <div className="w-full max-w-4xl h-[700px] border rounded-xl overflow-hidden shadow-xl">
          <iframe
            src={test.externalUrl}
            className="w-full h-full border-none"
            allow="fullscreen; clipboard-read; clipboard-write"
          />
        </div>

        {submittingExternal && (
          <div className="mt-4 text-amber-300">Submitting your result…</div>
        )}
      </main>
    );
  }

  // --------- INTERNAL TEST UI ----------
  if (!question) {
    return <div className="min-h-screen grid place-items-center text-white">Loading question…</div>;
  }

return (
  <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400 text-white p-6 relative">
    
    <div className="max-w-3xl mx-auto bg-white/10 p-6 rounded-2xl border border-white/20 shadow-lg">
      {/* Header Section with Exit Test Button on the Right */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{testTitle}</h1>

        {/* The "Exit Test" button */}
        <button
          onClick={() => setShowExitWarning(true)}
          disabled={submitting}
          className="px-4 py-2 bg-red-500 text-black border-black rounded-lg disabled:opacity-40"
        >
          Exit Test
        </button>
      </div>

{endTimeRef.current && (
  <Timer endTime={endTimeRef.current} onExpire={finishTest} />
)}


      <p className="text-lg mb-4">
        <b>Question {questionIndex + 1}</b> / {totalQuestions}
      </p>

     
  

        <div
  className="mb-4 prose prose-invert max-w-none select-none"
  dangerouslySetInnerHTML={{ __html: question.content }}
/>


        {question.imageUrl && (
  <img
    src={assetUrl(question.imageUrl) ?? undefined}
    alt="Question"
    className="mb-4 rounded-lg max-h-64 w-full object-contain bg-black/20 border border-white/20"
    loading="lazy"
    onError={(e) => {
      e.currentTarget.style.display = "none";
    }}
  />
)}
        {/* MULTIPLE / SINGLE */}
       {/* MULTIPLE / SINGLE / PICTURE */}
{question.mode !== "input" &&
  question.choices?.map((c) => {
    const checked =
      question.mode === "multiple"
        ? answer.includes(c.id)
        : answer === c.id;

    return (
      <label
  key={c.id}
  className="flex items-center gap-3 bg-white/5 p-2 rounded-lg cursor-pointer mb-2 select-none"
>
        {/* Handle single choice or picture mode */}
        <input
          type={question.mode === "multiple" ? "checkbox" : "radio"}
          checked={checked}
          onChange={() => {
            if (question.mode === "single" || question.mode === "picture") {
              // For single and picture questions, select only one answer
              saveAnswer(c.id);
            } else {
              // For multiple choice, allow multiple selections
              const newVal = checked
                ? answer.filter((x: any) => x !== c.id)
                : [...answer, c.id];
              saveAnswer(newVal);
            }
          }}
        />
        {/* For picture questions, display an image (if available) */}
        <div className="flex items-center gap-3">
  {c.imageUrl && (
    <img
      src={assetUrl(c.imageUrl) ?? undefined}
      alt={c.text}
      className="w-16 h-16 object-cover rounded-lg border border-white/20 bg-black/20"
    />
  )}
  <span className="text-sm">{c.text}</span>
</div>
      </label>
    );
  })}


        {/* INPUT MODE */}
        {question.mode === "input" && (
          <textarea
            className="w-full mt-3 p-3 bg-white/20 rounded-lg"
            value={answer}
            onChange={(e) => saveAnswer(e.target.value)}
          />
        )}

        <div className="flex justify-between mt-6">
          <button
  onClick={() => fetchQuestion(attemptId!, questionIndex - 1)}
  disabled={questionIndex === 0 || submitting}
  className="px-4 py-2 bg-white/20 rounded-lg disabled:opacity-40"
>
  ← Previous
</button>

{questionIndex + 1 === totalQuestions ? (
  <button
    onClick={finishTest}
    disabled={submitting}
    className="px-4 py-2 bg-green-500 text-black rounded-lg disabled:opacity-40"
  >
    Finish Test
  </button>
) : (
  <button
    onClick={() => fetchQuestion(attemptId!, questionIndex + 1)}
    disabled={submitting}
    className="px-4 py-2 bg-amber-400 text-black rounded-lg disabled:opacity-40"
  >
    Next →
  </button>
)}


        


        </div>
      </div>

      {isTabInactive && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
    <div className="text-white text-xl font-bold">
      Tab switching detected.
      <br />
      Please return to the test.
    </div>
  </div>
)}
{submitting && (
  <div className="absolute inset-0 flex justify-center items-center bg-black/50 z-50">
    <div className="text-white">Submitting your answers...</div>
  </div>
)}

      {showExitWarning && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white text-black p-6 rounded-xl max-w-sm shadow-lg">
      <h2 className="text-xl font-bold mb-4">Are you sure?</h2>
      <p className="mb-4">
        Leaving now may end your test. You might have a cooldown or limited attempts left.
      </p>
      <div className="flex justify-end gap-3">
        <button
  onClick={() => setShowExitWarning(false)}
  className="px-4 py-2 bg-gray-300 rounded-lg"
>
  Cancel
</button>

        <button
  onClick={async () => {
    setShowExitWarning(false);
    await finishTest();
    router.push(`/tests/${slug}/result?attempt=${attemptId}`); // Or any other route where you want to go after leaving
  }}
  className="px-4 py-2 bg-red-500 text-white rounded-lg"
>
  Submit & Leave
</button>


      </div>
    </div>
  </div>
)}

    </main>
  );
}
