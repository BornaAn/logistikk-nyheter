"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { sectors } from "@/lib/sectors";

// Deliberately its own always-visible row, not folded into FilterBar/
// CollapsibleFilters — the point (per the idea this shipped from) is that
// a sector is a one-click shortcut to "show me what matters to my
// business", not just another filter buried in an expandable panel.
export function SectorBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeSector = searchParams.get("sector") ?? "";

  function setSector(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("limit");
    if (slug) params.set("sector", slug);
    else params.delete("sector");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted mr-1">
        Sektorer
      </span>
      <button
        onClick={() => setSector("")}
        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all active:scale-95 ${
          activeSector === ""
            ? "bg-gold border-gold text-accent-foreground"
            : "border-card-border text-muted hover:border-gold hover:text-gold"
        }`}
      >
        Alle
      </button>
      {sectors.map((s) => {
        const active = activeSector === s.slug;
        return (
          <button
            key={s.slug}
            onClick={() => setSector(active ? "" : s.slug)}
            title={s.description}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all active:scale-95 ${
              active
                ? "bg-gold border-gold text-accent-foreground"
                : "border-card-border text-muted hover:border-gold hover:text-gold"
            }`}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
