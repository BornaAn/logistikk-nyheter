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
  /** Filled pill style for the active filter chip. */
  chipActive: string;
}

// Hand-picked jewel tones (not the default Tailwind palette) so category
// color-coding reads as a deliberate editorial system rather than generic
// UI-kit swatches.
export const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  shipping: {
    dot: "bg-[#0a4a55] dark:bg-[#3fb2c2]",
    text: "text-[#0a4a55] dark:text-[#5fc4d2]",
    border: "border-[#0a4a55] dark:border-[#3fb2c2]",
    chipActive:
      "bg-[#0a4a55]/10 border-[#0a4a55] text-[#0a4a55] dark:bg-[#3fb2c2]/10 dark:border-[#3fb2c2] dark:text-[#5fc4d2]",
  },
  trucking: {
    dot: "bg-[#a04a1f] dark:bg-[#e2884f]",
    text: "text-[#a04a1f] dark:text-[#e2884f]",
    border: "border-[#a04a1f] dark:border-[#e2884f]",
    chipActive:
      "bg-[#a04a1f]/10 border-[#a04a1f] text-[#a04a1f] dark:bg-[#e2884f]/10 dark:border-[#e2884f] dark:text-[#e2884f]",
  },
  lager_forsyningskjede: {
    dot: "bg-[#1f6f4a] dark:bg-[#4fbf8a]",
    text: "text-[#1f6f4a] dark:text-[#4fbf8a]",
    border: "border-[#1f6f4a] dark:border-[#4fbf8a]",
    chipActive:
      "bg-[#1f6f4a]/10 border-[#1f6f4a] text-[#1f6f4a] dark:bg-[#4fbf8a]/10 dark:border-[#4fbf8a] dark:text-[#4fbf8a]",
  },
  norge: {
    dot: "bg-[#a8202f] dark:bg-[#e2596a]",
    text: "text-[#a8202f] dark:text-[#e2596a]",
    border: "border-[#a8202f] dark:border-[#e2596a]",
    chipActive:
      "bg-[#a8202f]/10 border-[#a8202f] text-[#a8202f] dark:bg-[#e2596a]/10 dark:border-[#e2596a] dark:text-[#e2596a]",
  },
  globalt_geopolitikk: {
    dot: "bg-[#5b3f8f] dark:bg-[#a487d6]",
    text: "text-[#5b3f8f] dark:text-[#a487d6]",
    border: "border-[#5b3f8f] dark:border-[#a487d6]",
    chipActive:
      "bg-[#5b3f8f]/10 border-[#5b3f8f] text-[#5b3f8f] dark:bg-[#a487d6]/10 dark:border-[#a487d6] dark:text-[#a487d6]",
  },
};

export const ALL_CATEGORIES: Category[] = [
  "shipping",
  "trucking",
  "lager_forsyningskjede",
  "norge",
  "globalt_geopolitikk",
];
