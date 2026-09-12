/**
 * Turns the raw generated images into web-ready assets.
 *
 *   node scripts/optimise-images.mjs "C:/Users/logic/Downloads/images"
 *
 * The sources are 1–2.4 MB PNGs (45 MB for 22 files), which is far too heavy
 * to ship. This produces:
 *
 *   public/menu/dish/<slug>.webp   800×800  — menu row thumbnails
 *   public/menu/wide/<slug>.webp  1600×900  — category banners and hero
 *   src/data/image-manifest.json            — sizes + blur placeholders
 *
 * Several sources have a menu card or blackboard in frame carrying
 * AI-garbled text ("made made made", "PROANUT SALAD") or an invented price
 * that contradicts the real one. Those get an explicit `crop` below to put
 * the card outside the frame. Crops are fractions of the source, so they
 * survive a change of source resolution.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const SRC = process.argv[2] ?? "C:/Users/logic/Downloads/images";
const ROOT = resolve(import.meta.dirname, "..");
const DISH_DIR = join(ROOT, "public/menu/dish");
const WIDE_DIR = join(ROOT, "public/menu/wide");

/** crop: fractions of the source { l, t, w, h }. Omit to use the full frame. */
const IMAGES = [
  // ── Tea, coffee ────────────────────────────────────────────────────
  { file: "Gemini_Generated_Image_4zwcy94zwcy94zwc.png", slug: "lemon-tea", banner: true },
  { file: "Gemini_Generated_Image_edp7hpedp7hpedp7.png", slug: "black-coffee", banner: true },
  { file: "Gemini_Generated_Image_jny11ojny11ojny1 (1).png", slug: "filter-coffee", banner: true },

  // ── Breakfast ──────────────────────────────────────────────────────
  {
    file: "Gemini_Generated_Image_t63b52t63b52t63b.png",
    slug: "moong-dal-chilla",
    banner: true,
    // Trims the Gemini glyph out of the bottom-right corner.
    crop: { l: 0, t: 0, w: 0.93, h: 0.95 },
  },
  { file: "Gemini_Generated_Image_jny11ojny11ojny1.png", slug: "veg-chilla" },

  // ── Soups ──────────────────────────────────────────────────────────
  { file: "Gemini_Generated_Image_w2wxf5w2wxf5w2wx.png", slug: "tomato-soup", banner: true },
  {
    file: "Gemini_Generated_Image_10qpde10qpde10qp.png",
    slug: "veg-hot-and-sour-soup",
    // In-frame menu card prints "40", which contradicts the real price.
    crop: { l: 0.05, t: 0, w: 0.95, h: 0.78 },
  },

  // ── Salads ─────────────────────────────────────────────────────────
  {
    file: "Gemini_Generated_Image_k6k95yk6k95yk6k9.png",
    slug: "peanut-salad",
    banner: true,
    // Card repeats "PEANUT SALAD" and invents "PROANUT SALAD".
    crop: { l: 0, t: 0.3, w: 0.86, h: 0.7 },
  },

  // ── Evening snacks ─────────────────────────────────────────────────
  {
    file: "Gemini_Generated_Image_vm8ye0vm8ye0vm8y.png",
    slug: "basket-chaat",
    banner: true,
    crop: { l: 0, t: 0, w: 0.93, h: 1 },
  },
  {
    file: "Gemini_Generated_Image_jny11ojny11ojny1 (3).png",
    slug: "samosa",
    crop: { l: 0.1, t: 0.2, w: 0.9, h: 0.8 },
  },
  { file: "Gemini_Generated_Image_k5nifik5nifik5ni.png", slug: "kachori" },
  { file: "Gemini_Generated_Image_tsezeltsezeltsez.png", slug: "bhel", banner: true },
  { file: "Gemini_Generated_Image_m6h456m6h456m6h4.png", slug: "veg-masala-oats" },
  { file: "Gemini_Generated_Image_m6h456m6h456m6h4 (1).png", slug: "veg-handvo" },

  // ── Rice & meals ───────────────────────────────────────────────────
  {
    file: "Gemini_Generated_Image_t63b52t63b52t63b (1).png",
    slug: "quinoa-pulav",
    banner: true,
    // Printed menu in frame reads "MERE CHTIME" / "WHOLESOME MADE TO ORDE".
    crop: { l: 0.22, t: 0, w: 0.78, h: 1 },
  },
  {
    file: "Gemini_Generated_Image_gmhakhgmhakhgmha.png",
    slug: "veg-pulav",
    // Card claims "& paneer", which the real description does not.
    crop: { l: 0, t: 0, w: 0.8, h: 0.82 },
  },
  {
    file: "Gemini_Generated_Image_m6h456m6h456m6h4 (3).png",
    slug: "meal-of-the-day-white",
    banner: true,
    crop: { l: 0, t: 0.22, w: 0.92, h: 0.78 },
  },

  // ── Juices, shakes ─────────────────────────────────────────────────
  { file: "Gemini_Generated_Image_jny11ojny11ojny1 (2).png", slug: "green-detox-juice", banner: true },
  {
    file: "Gemini_Generated_Image_mz6hh8mz6hh8mz6h.png",
    slug: "banana-date-milkshake",
    // Card shows the Lassi description and "made made made".
    crop: { l: 0.32, t: 0, w: 0.68, h: 1 },
  },
  {
    file: "Gemini_Generated_Image_hrlub9hrlub9hrlu.png",
    slug: "masala-chaas",
    crop: { l: 0.33, t: 0, w: 0.67, h: 1 },
  },

  // ── Extra: a second basket chaat, and the drinks trio ──────────────
  {
    file: "Gemini_Generated_Image_m6h456m6h456m6h4 (2).png",
    slug: "chaat-hour",
    crop: { l: 0, t: 0.12, w: 0.82, h: 0.88 },
  },
  {
    file: "Gemini_Generated_Image_t63b52t63b52t63b (2).png",
    slug: "category-juices-shakes",
    banner: true,
    bannerOnly: true,
  },
];

async function run() {
  await mkdir(DISH_DIR, { recursive: true });
  await mkdir(WIDE_DIR, { recursive: true });

  const manifest = {};
  let sourceBytes = 0;
  let outBytes = 0;

  for (const spec of IMAGES) {
    const path = join(SRC, spec.file);

    let base;
    try {
      base = sharp(path, { failOn: "none" });
    } catch {
      console.warn(`  ! missing ${spec.file}`);
      continue;
    }

    const meta = await base.metadata();
    sourceBytes += meta.size ?? 0;

    /** Applies the manifest crop, if any, in source pixels. */
    const cropped = () => {
      const img = sharp(path, { failOn: "none" });
      if (!spec.crop) return img;
      const { l, t, w, h } = spec.crop;
      return img.extract({
        left: Math.round(meta.width * l),
        top: Math.round(meta.height * t),
        width: Math.round(meta.width * w),
        height: Math.round(meta.height * h),
      });
    };

    const entry = { slug: spec.slug };

    if (!spec.bannerOnly) {
      const out = join(DISH_DIR, `${spec.slug}.webp`);
      const info = await cropped()
        // `attention` picks the highest-entropy region, which on a food
        // photo is the food — better than a blind centre crop.
        .resize(800, 800, { fit: "cover", position: sharp.strategy.attention })
        .webp({ quality: 80, effort: 5 })
        .toFile(out);
      outBytes += info.size;
      entry.dish = `/menu/dish/${spec.slug}.webp`;
    }

    if (spec.banner) {
      const out = join(WIDE_DIR, `${spec.slug}.webp`);
      const info = await cropped()
        .resize(1600, 900, { fit: "cover", position: sharp.strategy.attention })
        .webp({ quality: 78, effort: 5 })
        .toFile(out);
      outBytes += info.size;
      entry.wide = `/menu/wide/${spec.slug}.webp`;
    }

    // A 20px WebP inlined as a data URI. Next uses it as the blur placeholder,
    // so a slow connection sees the dish's colours immediately.
    const blur = await cropped().resize(20, 20, { fit: "cover" }).webp({ quality: 40 }).toBuffer();
    entry.blur = `data:image/webp;base64,${blur.toString("base64")}`;

    manifest[spec.slug] = entry;
    console.log(`  ${spec.slug.padEnd(26)} ${spec.crop ? "cropped" : "full   "} ${spec.banner ? "+ banner" : ""}`);
  }

  await writeFile(
    join(ROOT, "src/data/image-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  const mb = (b) => (b / 1024 / 1024).toFixed(1);
  console.log(
    `\n  ${Object.keys(manifest).length} images.` +
      `\n  ${mb(sourceBytes)} MB source -> ${mb(outBytes)} MB webp` +
      ` (${Math.round((1 - outBytes / sourceBytes) * 100)}% smaller)\n`,
  );
}

run().catch((err) => {
  console.error("\n  Failed:", err.message, "\n");
  process.exit(1);
});
