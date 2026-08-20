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
  /** Left accent border on the article card (flat, used as fallback). */
  border: string;
  /** Filled gradient pill style for the active filter chip. */
  chipActive: string;
  /** Raw hex used as the top stop of the card's gradient left-edge accent. */
  gradientFrom: string;
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
      "bg-gradient-to-r from-[#0a4a55]/20 to-[#0a4a55]/5 border-[#0a4a55] text-[#0a4a55] dark:from-[#3fb2c2]/25 dark:to-[#3fb2c2]/5 dark:border-[#3fb2c2] dark:text-[#5fc4d2]",
    gradientFrom: "#3fb2c2",
  },
  trucking: {
    dot: "bg-[#a04a1f] dark:bg-[#e2884f]",
    text: "text-[#a04a1f] dark:text-[#e2884f]",
    border: "border-[#a04a1f] dark:border-[#e2884f]",
    chipActive:
      "bg-gradient-to-r from-[#a04a1f]/20 to-[#a04a1f]/5 border-[#a04a1f] text-[#a04a1f] dark:from-[#e2884f]/25 dark:to-[#e2884f]/5 dark:border-[#e2884f] dark:text-[#e2884f]",
    gradientFrom: "#e2884f",
  },
  lager_forsyningskjede: {
    dot: "bg-[#1f6f4a] dark:bg-[#4fbf8a]",
    text: "text-[#1f6f4a] dark:text-[#4fbf8a]",
    border: "border-[#1f6f4a] dark:border-[#4fbf8a]",
    chipActive:
      "bg-gradient-to-r from-[#1f6f4a]/20 to-[#1f6f4a]/5 border-[#1f6f4a] text-[#1f6f4a] dark:from-[#4fbf8a]/25 dark:to-[#4fbf8a]/5 dark:border-[#4fbf8a] dark:text-[#4fbf8a]",
    gradientFrom: "#4fbf8a",
  },
  norge: {
    dot: "bg-[#a8202f] dark:bg-[#e2596a]",
    text: "text-[#a8202f] dark:text-[#e2596a]",
    border: "border-[#a8202f] dark:border-[#e2596a]",
    chipActive:
      "bg-gradient-to-r from-[#a8202f]/20 to-[#a8202f]/5 border-[#a8202f] text-[#a8202f] dark:from-[#e2596a]/25 dark:to-[#e2596a]/5 dark:border-[#e2596a] dark:text-[#e2596a]",
    gradientFrom: "#e2596a",
  },
  globalt_geopolitikk: {
    dot: "bg-[#5b3f8f] dark:bg-[#a487d6]",
    text: "text-[#5b3f8f] dark:text-[#a487d6]",
    border: "border-[#5b3f8f] dark:border-[#a487d6]",
    chipActive:
      "bg-gradient-to-r from-[#5b3f8f]/20 to-[#5b3f8f]/5 border-[#5b3f8f] text-[#5b3f8f] dark:from-[#a487d6]/25 dark:to-[#a487d6]/5 dark:border-[#a487d6] dark:text-[#a487d6]",
    gradientFrom: "#a487d6",
  },
};

export const ALL_CATEGORIES: Category[] = [
  "shipping",
  "trucking",
  "lager_forsyningskjede",
  "norge",
  "globalt_geopolitikk",
];
