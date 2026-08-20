import type { Category } from "@prisma/client";

export const CATEGORY_LABELS: Record<Category, string> = {
  shipping: "Shipping/maritim",
  trucking: "Trucking/vei",
  lager_forsyningskjede: "Lager & forsyningskjede",
  norge: "Norge",
  globalt_geopolitikk: "Globalt/geopolitikk & handel",
};

interface CategoryStyle {
  /** Small dot marker next to the label. */
  dot: string;
  /** Label text color. */
  text: string;
  /** Left accent border on the article card. */
  border: string;
}

export const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  shipping: {
    dot: "bg-teal-600 dark:bg-teal-400",
    text: "text-teal-800 dark:text-teal-300",
    border: "border-teal-500 dark:border-teal-400",
  },
  trucking: {
    dot: "bg-amber-600 dark:bg-amber-400",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-500 dark:border-amber-400",
  },
  lager_forsyningskjede: {
    dot: "bg-emerald-700 dark:bg-emerald-400",
    text: "text-emerald-800 dark:text-emerald-300",
    border: "border-emerald-600 dark:border-emerald-400",
  },
  norge: {
    dot: "bg-red-700 dark:bg-red-400",
    text: "text-red-800 dark:text-red-300",
    border: "border-red-600 dark:border-red-400",
  },
  globalt_geopolitikk: {
    dot: "bg-violet-700 dark:bg-violet-400",
    text: "text-violet-800 dark:text-violet-300",
    border: "border-violet-600 dark:border-violet-400",
  },
};

export const ALL_CATEGORIES: Category[] = [
  "shipping",
  "trucking",
  "lager_forsyningskjede",
  "norge",
  "globalt_geopolitikk",
];
