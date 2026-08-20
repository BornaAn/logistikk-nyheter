"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ALL_CATEGORIES, CATEGORY_LABELS, CATEGORY_STYLES } from "@/lib/categories";

interface FilterBarProps {
  sources: string[];
}

const fieldClass =
  "rounded-md border border-card-border bg-card px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";

export function FilterBar({ sources }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const category = searchParams.get("category") ?? "";
  const source = searchParams.get("source") ?? "";

  function updateParams(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    // Any filter change resets pagination back to the default page size.
    params.delete("limit");
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query !== (searchParams.get("q") ?? "")) {
        updateParams({ q: query });
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => updateParams({ category: "" })}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all active:scale-95 ${
            category === ""
              ? "bg-accent border-accent text-accent-foreground"
              : "border-card-border text-muted hover:border-accent hover:text-accent"
          }`}
        >
          Alle
        </button>
        {ALL_CATEGORIES.map((c) => {
          const style = CATEGORY_STYLES[c];
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => updateParams({ category: active ? "" : c })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all active:scale-95 ${
                active
                  ? style.chipActive
                  : "border-card-border text-muted hover:border-accent hover:text-accent"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
              {CATEGORY_LABELS[c]}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk i tittel og sammendrag…"
          className={`w-full sm:w-72 ${fieldClass}`}
        />

        <div className="flex flex-wrap gap-2">
          <select
            value={source}
            onChange={(e) => updateParams({ source: e.target.value })}
            className={fieldClass}
          >
            <option value="">Alle kilder</option>
            {sources.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {(category || source || query) && (
            <button
              onClick={() => {
                setQuery("");
                updateParams({ category: "", source: "", q: "" });
              }}
              className="rounded-md px-3 py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              Nullstill
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
