"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);

  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => {
    media.removeEventListener("change", callback);
    observer.disconnect();
  };
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = () => {
    const nextDark = !isDark;
    if (nextDark) {
      document.documentElement.classList.add("dark");
      try {
        localStorage.setItem("bpti-theme", "dark");
      } catch {
        // Abaikan jika localStorage tidak diizinkan
      }
    } else {
      document.documentElement.classList.remove("dark");
      try {
        localStorage.setItem("bpti-theme", "light");
      } catch {
        // Abaikan jika localStorage tidak diizinkan
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
      aria-label={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
      title={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
    >
      {isDark ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
