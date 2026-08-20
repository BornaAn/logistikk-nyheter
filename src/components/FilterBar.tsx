"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ALL_CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

interface FilterBarProps {
  sources: string[];
}

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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Søk i tittel og sammendrag…"
        className="w-full sm:w-72 rounded-md border border-card-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
      />

      <div className="flex flex-wrap gap-2">
        <select
          value={category}
          onChange={(e) => updateParams({ category: e.target.value })}
          className="rounded-md border border-card-border bg-card px-3 py-2 text-sm"
        >
          <option value="">Alle kategorier</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <select
          value={source}
          onChange={(e) => updateParams({ source: e.target.value })}
          className="rounded-md border border-card-border bg-card px-3 py-2 text-sm"
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
            className="rounded-md px-3 py-2 text-sm text-muted hover:text-foreground"
          >
            Nullstill
          </button>
        )}
      </div>
    </div>
  );
}
