import manifest from "@/data/image-manifest.json";

/**
 * Dish imagery is keyed by the menu slug and ships with the code, rather than
 * living in a database column.
 *
 * That means no migration, no upload pipeline and no broken-image states: if
 * a slug has no picture the UI falls back to a typographic tile. The trade-off
 * is that swapping a photo needs a deploy rather than an admin upload — worth
 * revisiting once there are real photographs to manage.
 */

export interface DishImage {
  slug: string;
  /** 800×800 square, for menu rows and cards. */
  dish?: string;
  /** 1600×900, for category banners and hero panels. */
  wide?: string;
  /** Inline 20px WebP used as the blur placeholder. */
  blur: string;
}

const IMAGES = manifest as Record<string, DishImage>;

export const dishImage = (slug: string): DishImage | undefined => IMAGES[slug];

export const hasDishImage = (slug: string): boolean => Boolean(IMAGES[slug]?.dish);

/**
 * The banner for each menu section. Chosen by hand — the point is one
 * appetising, representative dish per category, not whatever happens to be
 * first in the list.
 */
const CATEGORY_BANNERS: Record<string, string> = {
  "tea-coffee-cookies": "filter-coffee",
  breakfast: "moong-dal-chilla",
  soups: "tomato-soup",
  salads: "peanut-salad",
  "evening-snacks": "basket-chaat",
  "rice-and-meals": "meal-of-the-day-white",
  "juices-shakes": "category-juices-shakes",
};

export function categoryBanner(categorySlug: string): DishImage | undefined {
  const key = CATEGORY_BANNERS[categorySlug];
  const img = key ? IMAGES[key] : undefined;
  return img?.wide ? img : undefined;
}

/**
 * Items that legitimately share a picture.
 *
 * Kept deliberately short. It is tempting to point every salad at the peanut
 * salad photo to fill the grid, but a customer ordering sprouted moong would
 * then be shown a bowl of peanuts — that is a misleading picture, not a
 * placeholder. Only genuine variants of the same dish belong here.
 */
const ALIASES: Record<string, string> = {
  // Empty on purpose. The brown-rice meal used to borrow the white-rice
  // photograph; it now has its own, which actually shows brown rice.
};

export function dishImageWithAlias(slug: string): DishImage | undefined {
  return IMAGES[slug] ?? (ALIASES[slug] ? IMAGES[ALIASES[slug]] : undefined);
}
