"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Reads a DOM class set by the inline theme script before hydration —
    // an external-system read, not derived React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Bytt mellom mørkt og lyst tema"
      className="rounded-md border border-card-border px-3 py-1.5 text-sm text-foreground/80 hover:text-foreground hover:border-foreground/30 transition-colors"
    >
      {isDark === null ? "Tema" : isDark ? "☀︎ Lyst" : "☾ Mørkt"}
    </button>
  );
}
