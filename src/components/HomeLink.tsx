"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Wraps the logo/title. Always jumps to the top of the page on click,
 * unconditionally — a plain `<Link href="/">` only resets scroll on an
 * actual navigation, so clicking it while already on "/" with no filters
 * (the same URL, no navigation happens) does nothing on its own.
 */
export function HomeLink({ children }: { children: ReactNode }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-3"
      onClick={() => window.scrollTo(0, 0)}
    >
      {children}
    </Link>
  );
}
