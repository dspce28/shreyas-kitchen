/**
 * Canonical menu for Shreya's Kitchen, transcribed from the printed menu
 * (Fortune Business Hub, Ahmedabad).
 *
 * The printed menu carries no prices — every `price` below is a SEED value,
 * not a quoted price. The database is the runtime source of truth: this file
 * only populates it on first run via `npm run seed`. Correct prices in
 * Admin → Menu; re-seeding never overwrites a price you have edited.
 */

export type Slot =
  | { kind: "fixed"; item: string }
  | { kind: "choose"; label: string; fromCategory?: string; fromItems?: string[] };

export interface MenuItem {
  slug: string;
  name: string;
  description: string;
  /** Seed price in rupees. Editable in the admin panel. */
  price: number;
  /** Small uppercase qualifier printed under the name, e.g. "NO MILK/SUGAR". */
  note?: string;
  /** Customer-selectable variants that do not change the price. */
  options?: string[];
  /** Highlighted on the menu as a signature dish. */
  favourite?: boolean;
}

export interface Category {
  slug: string;
  name: string;
  /** Serving window printed on the menu, e.g. "8:00 AM – 11:00 AM". */
  window?: string;
  /** Minutes from midnight. Orders outside the window are blocked. */
  availableFrom?: number;
  availableTo?: number;
  blurb: string;
  items: MenuItem[];
}

export interface Combo {
  code: string;
  slug: string;
  name: string;
  price: number;
  window: string;
  availableFrom?: number;
  availableTo?: number;
  slots: Slot[];
}

export const STORE = {
  name: "Shreya's Kitchen",
  tagline: "Wholesome · Fresh · Everyday",
  promise:
    "Fresh, wholesome food made for the way you work — light, clean and quick, without the guilt.",
  location: "Fortune Business Hub, Ahmedabad",
  owner: "Shreya Patel",
  phone: "+919601050241",
  phoneDisplay: "9601050241",
} as const;

const h = (hour: number, min = 0) => hour * 60 + min;

export const CATEGORIES: Category[] = [
  {
    slug: "tea-coffee-cookies",
    name: "Tea, Coffee & Cookies",
    window: "Available all day",
    blurb: "Brewed to order, from robust Assam leaves to slow-drip South Indian filter.",
    items: [
      {
        slug: "plain-black-tea",
        name: "Plain Black Tea",
        description: "Robust Assam leaves, brewed strong and simple",
        price: 25,
      },
      {
        slug: "masala-tea",
        name: "Masala Tea",
        description: "A classic blend of aromatic spices in creamy chai",
        price: 30,
      },
      {
        slug: "ginger-tea",
        name: "Ginger Tea",
        description: "Freshly pounded ginger for a warming, zesty brew",
        price: 30,
      },
      {
        slug: "lemon-tea",
        name: "Lemon Tea",
        description: "Light black tea finished with fresh lemon",
        price: 30,
      },
      {
        slug: "tulsi-tea",
        name: "Tulsi Tea",
        description: "Holy basil leaves steeped for calm and comfort",
        price: 30,
      },
      {
        slug: "plain-green-tea",
        name: "Plain Green Tea",
        description: "Delicate green tea, light and antioxidant-rich",
        price: 40,
      },
      {
        slug: "lemon-green-tea",
        name: "Lemon Green Tea",
        description: "Green tea brightened with a splash of fresh lemon",
        price: 45,
      },
      {
        slug: "ginger-green-tea",
        name: "Ginger Green Tea",
        description: "Green tea infused with fresh ginger warmth",
        price: 45,
      },
      {
        slug: "tulsi-green-tea",
        name: "Tulsi Green Tea",
        description: "Green tea layered with fragrant tulsi leaves",
        price: 45,
      },
      {
        slug: "mint-green-tea",
        name: "Mint Green Tea",
        description: "Cooling mint leaves steeped into green tea",
        price: 45,
      },
      {
        slug: "black-coffee",
        name: "Black Coffee",
        description: "Pure roasted coffee, served plain and strong",
        note: "No milk / sugar",
        price: 40,
      },
      {
        slug: "filter-coffee",
        name: "Filter Coffee",
        description: "South Indian filter coffee, slow-brewed and frothy",
        price: 50,
      },
      {
        slug: "cold-coffee",
        name: "Cold Coffee",
        description: "Chilled, blended coffee for a quick lift",
        price: 90,
      },
      {
        slug: "cinnamon-coffee",
        name: "Cinnamon Coffee",
        description: "Coffee gently spiced with warm cinnamon",
        price: 60,
      },
      {
        slug: "whole-wheat-cookies",
        name: "Whole Wheat Cookies",
        description: "Wholesome wheat cookies, lightly sweetened",
        note: "2 pcs",
        price: 40,
      },
      {
        slug: "multigrain-cookies",
        name: "Multigrain Cookies",
        description: "Oats, millets and grains baked into a crisp bite",
        note: "2 pcs",
        price: 50,
      },
    ],
  },
  {
    slug: "breakfast",
    name: "Breakfast",
    window: "8:00 AM – 11:00 AM",
    availableFrom: h(8),
    availableTo: h(11),
    blurb: "The first plate of the day — warm, light and on the table in minutes.",
    items: [
      {
        slug: "moong-dal-chilla",
        name: "Moong Dal Chilla",
        description: "Savoury lentil pancake, light and protein-rich",
        price: 80,
        favourite: true,
      },
      {
        slug: "suji-dhokla",
        name: "Suji Dhokla",
        description: "Steamed semolina cake, soft, fluffy and tangy",
        price: 70,
      },
      {
        slug: "poha",
        name: "Poha",
        description: "Flattened rice tossed with peanuts and spices",
        price: 60,
      },
      {
        slug: "veg-upma",
        name: "Veg Upma",
        description: "Semolina simmered with vegetables and curry leaves",
        price: 60,
      },
      {
        slug: "suji-veg-uttapam",
        name: "Suji Veg Uttapam",
        description: "Thick semolina pancake loaded with fresh vegetables",
        price: 90,
      },
      {
        slug: "veg-chilla",
        name: "Veg Chilla",
        description: "Savoury gram-flour pancake studded with vegetables",
        price: 80,
      },
    ],
  },
  {
    slug: "soups",
    name: "Soups",
    window: "Available all day",
    blurb: "Simmered slowly, poured hot — the quiet start to a proper meal.",
    items: [
      {
        slug: "veg-hot-and-sour-soup",
        name: "Veg Hot & Sour Soup",
        description: "Peppery vegetable broth with a tangy kick",
        price: 90,
      },
      {
        slug: "tomato-soup",
        name: "Tomato Soup",
        description: "Slow-simmered tomatoes, smooth and comforting",
        price: 90,
      },
      {
        slug: "carrot-coriander-soup",
        name: "Carrot & Coriander Soup",
        description: "Sweet carrots blended with fresh coriander",
        price: 100,
      },
      {
        slug: "veg-sweet-corn-soup",
        name: "Veg Sweet Corn Soup",
        description: "Silky corn broth with finely diced vegetables",
        price: 100,
      },
    ],
  },
  {
    slug: "salads",
    name: "Salads",
    window: "Available all day",
    blurb: "Cut fresh to order, dressed lightly, never sitting in a fridge.",
    items: [
      {
        slug: "peanut-salad",
        name: "Peanut Salad",
        description: "Crunchy peanuts tossed with onion, tomato and lime",
        price: 80,
      },
      {
        slug: "sprouted-moong-salad",
        name: "Sprouted Moong Salad",
        description: "Sprouted moong with fresh vegetables and lemon",
        price: 90,
      },
      {
        slug: "boiled-chana-salad",
        name: "Boiled Chana Salad",
        description: "Boiled chickpeas in a light, tangy dressing",
        price: 90,
      },
      {
        slug: "veg-salad",
        name: "Veg Salad",
        description: "Crisp seasonal vegetables, simply dressed",
        price: 80,
      },
      {
        slug: "sweet-corn-salad",
        name: "Sweet Corn Salad",
        description: "Golden corn kernels with peppers, lime and herbs",
        price: 90,
      },
    ],
  },
  {
    slug: "evening-snacks",
    name: "Evening Snacks",
    window: "3:00 PM – 6:00 PM",
    availableFrom: h(15),
    availableTo: h(18),
    blurb: "The three hours the whole building waits for.",
    items: [
      {
        slug: "samosa",
        name: "Samosa",
        description: "Crisp pastry filled with spiced potato",
        note: "2 pcs",
        price: 40,
      },
      {
        slug: "kachori",
        name: "Kachori",
        description: "Flaky pastry stuffed with spiced lentils",
        note: "2 pcs",
        price: 40,
      },
      {
        slug: "veg-pasta",
        name: "Veg Pasta",
        description: "Pasta tossed in your choice of tomato or creamy sauce",
        options: ["Red sauce", "White sauce"],
        price: 130,
      },
      {
        slug: "bhel",
        name: "Bhel",
        description: "Puffed rice tossed with tangy chutneys and crunch",
        price: 60,
      },
      {
        slug: "basket-chaat",
        name: "Basket Chaat",
        description: "Crisp edible basket piled high with tangy chaat",
        price: 110,
        favourite: true,
      },
      {
        slug: "veg-masala-oats",
        name: "Veg Masala Oats",
        description: "Savoury oats simmered with vegetables and spices",
        price: 90,
      },
      {
        slug: "veg-handvo",
        name: "Veg Handvo",
        description: "Baked Gujarati lentil-rice cake, crisp-topped and wholesome",
        price: 80,
      },
    ],
  },
  {
    slug: "rice-and-meals",
    name: "Rice & Meal of the Day",
    window: "Available all day",
    blurb: "A full plate, cooked the way it is cooked at home.",
    items: [
      {
        slug: "brown-rice-pulav",
        name: "Brown Rice Pulav",
        description: "Fragrant brown rice tossed with garden vegetables",
        price: 140,
      },
      {
        slug: "quinoa-pulav",
        name: "Quinoa Pulav",
        description: "Protein-rich quinoa cooked with mixed vegetables",
        price: 180,
        favourite: true,
      },
      {
        slug: "veg-pulav",
        name: "Veg Pulav",
        description: "Aromatic rice simmered with mixed vegetables",
        price: 120,
      },
      {
        slug: "meal-of-the-day-white",
        name: "Meal of the Day",
        description: "Two seasonal sabzis, four fulka roti, dal and rice",
        note: "White rice",
        price: 160,
      },
      {
        slug: "meal-of-the-day-brown",
        name: "Meal of the Day",
        description: "Two seasonal sabzis, four fulka roti, dal and brown rice",
        note: "Brown rice",
        price: 180,
      },
    ],
  },
  {
    slug: "juices-shakes",
    name: "Juices, Smoothies & Milkshakes",
    window: "Available all day",
    blurb: "Pressed and blended when you order — nothing sits, nothing separates.",
    items: [
      {
        slug: "beet-carrot-juice",
        name: "Beet & Carrot Juice",
        description: "Earthy beetroot and carrot, cold-pressed fresh",
        price: 110,
      },
      {
        slug: "green-detox-juice",
        name: "Green Detox Juice",
        description: "Leafy greens and cucumber for a clean reset",
        price: 130,
        favourite: true,
      },
      {
        slug: "banana-date-milkshake",
        name: "Banana Date Milkshake",
        description: "Creamy banana blended with natural date sweetness",
        price: 130,
      },
      {
        slug: "lassi",
        name: "Lassi",
        description: "Churned yogurt, sweetened just the way you like",
        options: ["Sugar-free", "Honey"],
        price: 90,
      },
      {
        slug: "masala-chaas",
        name: "Masala Chaas",
        description: "Spiced buttermilk, light and refreshing",
        price: 50,
      },
      {
        slug: "protein-shake",
        name: "Protein Shake",
        description: "A post-workout blend to fuel the rest of your day",
        price: 160,
      },
    ],
  },
];

/**
 * "Thoughtful pairings for a working day — a little more, for a little less."
 * Each combo is priced below the sum of its parts; the saving is computed live
 * from current item prices, so it stays honest when prices change.
 */
export const COMBOS: Combo[] = [
  {
    code: "COMBO 01",
    slug: "morning-start",
    name: "Morning Start",
    price: 99,
    window: "8:00 AM – 11:00 AM",
    availableFrom: h(8),
    availableTo: h(11),
    slots: [
      { kind: "choose", label: "Any breakfast item", fromCategory: "breakfast" },
      {
        kind: "choose",
        label: "Masala Tea or Filter Coffee",
        fromItems: ["masala-tea", "filter-coffee"],
      },
    ],
  },
  {
    code: "COMBO 02",
    slug: "power-breakfast",
    name: "Power Breakfast",
    price: 189,
    window: "8:00 AM – 11:00 AM",
    availableFrom: h(8),
    availableTo: h(11),
    slots: [
      { kind: "fixed", item: "moong-dal-chilla" },
      { kind: "fixed", item: "green-detox-juice" },
    ],
  },
  {
    code: "COMBO 03",
    slug: "light-lunch",
    name: "Light Lunch",
    price: 159,
    window: "All day",
    slots: [
      { kind: "choose", label: "Any soup", fromCategory: "soups" },
      { kind: "choose", label: "Any salad", fromCategory: "salads" },
    ],
  },
  {
    code: "COMBO 04",
    slug: "tea-time",
    name: "Tea-Time",
    price: 60,
    window: "3:00 PM – 6:00 PM",
    availableFrom: h(15),
    availableTo: h(18),
    slots: [
      {
        kind: "choose",
        label: "Samosa or Kachori (2 pcs)",
        fromItems: ["samosa", "kachori"],
      },
      { kind: "fixed", item: "masala-tea" },
    ],
  },
  {
    code: "COMBO 05",
    slug: "healthy-evening",
    name: "Healthy Evening",
    price: 119,
    window: "3:00 PM – 6:00 PM",
    availableFrom: h(15),
    availableTo: h(18),
    slots: [
      {
        kind: "choose",
        label: "Veg Masala Oats or Veg Handvo",
        fromItems: ["veg-masala-oats", "veg-handvo"],
      },
      { kind: "fixed", item: "lemon-green-tea" },
    ],
  },
  {
    code: "COMBO 06",
    slug: "chaat-hour",
    name: "Chaat Hour",
    price: 179,
    window: "3:00 PM – 6:00 PM",
    availableFrom: h(15),
    availableTo: h(18),
    slots: [
      { kind: "fixed", item: "basket-chaat" },
      { kind: "fixed", item: "cold-coffee" },
    ],
  },
];

export const ALL_ITEMS: MenuItem[] = CATEGORIES.flatMap((c) => c.items);

export function findItem(slug: string): MenuItem | undefined {
  return ALL_ITEMS.find((i) => i.slug === slug);
}
