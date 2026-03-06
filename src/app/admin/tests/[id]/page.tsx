"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import TestEditor from "@/components/admin/TestEditor";

export default function EditTestPage() {
  const params = useParams();
  const id = params?.id;
  const [test, setTest] = useState<any | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !id) return;

    (async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tests/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
      const data = await res.json();
      if (res.ok) setTest(data.test);
    })();
  }, [id]);

  if (!test)
    return (
      <div className="min-h-screen grid place-items-center text-white bg-gradient-to-br from-blue-900 via-indigo-900 to-amber-400">
        Loading test...
      </div>
    );

  return <TestEditor mode="edit" testData={test} />;
}
