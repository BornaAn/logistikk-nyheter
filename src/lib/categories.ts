import type { Category } from "@prisma/client";

export const CATEGORY_LABELS: Record<Category, string> = {
  shipping: "Shipping/maritim",
  trucking: "Trucking/vei",
  lager_forsyningskjede: "Lager & forsyningskjede",
  norge: "Norge",
  globalt_geopolitikk: "Globalt/geopolitikk & handel",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  shipping:
    "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  trucking:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  lager_forsyningskjede:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  norge:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  globalt_geopolitikk:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
};

export const ALL_CATEGORIES: Category[] = [
  "shipping",
  "trucking",
  "lager_forsyningskjede",
  "norge",
  "globalt_geopolitikk",
];
