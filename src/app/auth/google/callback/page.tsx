"use client";

import { useEffect } from "react";

export default function GoogleCallback() {
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const idToken = params.get("id_token");

    if (!idToken) {
      alert("Google login failed");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: idToken }),
    })
      .then(res => res.json())
      .then(data => {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", String(data.user?.id ?? ""));
        localStorage.setItem("userName", String(data.user?.name ?? ""));
        localStorage.setItem("avatar", String(data.user?.avatar ?? ""));

        window.location.href = "/dashboard";
      })
      .catch(() => {
        alert("Login failed");
      });
  }, []);

  return <div style={{ color: "white" }}>Logging you in...</div>;
}