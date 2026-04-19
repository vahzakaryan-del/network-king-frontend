"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export default function CapacitorFix() {
  useEffect(() => {
    // ✅ ONLY run on native (Android / iOS)
    if (Capacitor.getPlatform() === "web") return;

    StatusBar.setOverlaysWebView({ overlay: true });
    StatusBar.setStyle({ style: Style.Dark });
  }, []);

  return null;
}