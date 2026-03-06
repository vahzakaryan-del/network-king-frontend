"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function ExternalFinishPage() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleSubmit = async () => {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");

      const scoreStr = searchParams.get("score");
      const score = scoreStr ? Number(scoreStr) : NaN;

      // Validate score
      if (isNaN(score)) {
        return router.push(`/tests/${slug}`);
      }

      try {
      const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/tests/${slug}/submit-external`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ score }),
  }
);

        if (!res.ok) throw new Error("Submit failed");

        router.push(`/tests/${slug}/result`);
      } catch (err) {
        router.push(`/tests/${slug}`);
      }
    };

    handleSubmit();
  }, [slug, router, searchParams]);

  return (
    <main className="min-h-screen bg-black text-white grid place-items-center text-xl">
      Processing your score…
    </main>
  );
}
