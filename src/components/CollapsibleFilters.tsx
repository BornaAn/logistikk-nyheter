"use client";

import { useState, type ReactNode } from "react";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

/** Wraps the filter bar (category pills, search, source select) with a
 * mobile-only collapse toggle — that section takes up real vertical space
 * on a phone, and most of the time you're just scrolling articles, not
 * changing filters. Always shown on sm+ regardless of state, so desktop is
 * unaffected. */
export function CollapsibleFilters({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <div className="flex justify-end sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Skjul filter" : "Vis filter"}
          className="flex items-center justify-center -mt-1 mb-1 h-7 w-7 rounded-md text-muted hover:text-accent hover:bg-accent/5 transition-colors active:scale-95"
        >
          <ChevronIcon open={open} />
        </button>
      </div>
      <div className={`${open ? "block" : "hidden"} sm:block`}>{children}</div>
    </div>
  );
}
