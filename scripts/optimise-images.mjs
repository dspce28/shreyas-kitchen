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
  { file: "Gemini_Generated_Image_ytmxfytmxfytmxfy.png", slug: "veg-sweet-corn-soup" },

  // ── Salads ─────────────────────────────────────────────────────────
  {
    file: "Gemini_Generated_Image_k6k95yk6k95yk6k9.png",
    slug: "peanut-salad",
    banner: true,
    // Card repeats "PEANUT SALAD" and invents "PROANUT SALAD".
    crop: { l: 0, t: 0.3, w: 0.86, h: 0.7 },
  },
  { file: "Gemini_Generated_Image_2dnxos2dnxos2dnx.png", slug: "sweet-corn-salad" },
  { file: "Gemini_Generated_Image_w6v1o5w6v1o5w6v1.png", slug: "boiled-chana-salad" },

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
  // The brown-rice meal gets its own photograph rather than borrowing the
  // white-rice one — this spread actually shows brown rice, so the alias it
  // used to rely on can go.
  {
    file: "Gemini_Generated_Image_uy2jn8uy2jn8uy2j.png",
    slug: "meal-of-the-day-brown",
    banner: true,
  },
  // A second full spread, banner only. The widest, most generous shot in the
  // set — kept available for hero and section use.
  {
    file: "Gemini_Generated_Image_yr2vfcyr2vfcyr2v.png",
    slug: "thali-spread",
    banner: true,
    bannerOnly: true,
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

  // ── Batch two: the remaining dishes and the combos ─────────────────
  // Tea and coffee, shot on the dark counter.
  { file: "Gemini_Generated_Image_nje14knje14knje1.png", slug: "plain-black-tea" },
  { file: "Gemini_Generated_Image_cegnddcegnddcegn.png", slug: "masala-tea", banner: true },
  { file: "Gemini_Generated_Image_nz4zxgnz4zxgnz4z.png", slug: "ginger-tea" },
  { file: "Gemini_Generated_Image_p1bvesp1bvesp1bv.png", slug: "tulsi-tea" },
  { file: "Gemini_Generated_Image_jeybkujeybkujeyb.png", slug: "plain-green-tea" },
  { file: "Gemini_Generated_Image_kb3gchkb3gchkb3g.png", slug: "lemon-green-tea" },
  { file: "Gemini_Generated_Image_y72vsiy72vsiy72v.png", slug: "ginger-green-tea" },
  { file: "Gemini_Generated_Image_88fxhx88fxhx88fx.png", slug: "mint-green-tea" },
  { file: "Gemini_Generated_Image_q1fhdbq1fhdbq1fh.png", slug: "tulsi-green-tea" },
  { file: "Gemini_Generated_Image_mdnfp2mdnfp2mdnf.png", slug: "cold-coffee" },
  { file: "Gemini_Generated_Image_yahziiyahziiyahz.png", slug: "cinnamon-coffee" },
  { file: "Gemini_Generated_Image_cpmxo4cpmxo4cpmx.png", slug: "whole-wheat-cookies" },
  { file: "Gemini_Generated_Image_ammpgzammpgzammp.png", slug: "multigrain-cookies" },

  // Breakfast.
  { file: "Gemini_Generated_Image_fku8t2fku8t2fku8.png", slug: "suji-dhokla" },
  { file: "Gemini_Generated_Image_i8emjxi8emjxi8em.png", slug: "poha" },
  { file: "Gemini_Generated_Image_j679i3j679i3j679.png", slug: "veg-upma" },
  { file: "Gemini_Generated_Image_eya2xseya2xseya2.png", slug: "suji-veg-uttapam" },

  // Soup, salads, snacks, rice.
  { file: "Gemini_Generated_Image_ehk50iehk50iehk5.png", slug: "carrot-coriander-soup" },
  { file: "Gemini_Generated_Image_o3tpujo3tpujo3tp.png", slug: "sprouted-moong-salad" },
  { file: "Gemini_Generated_Image_5a0m7m5a0m7m5a0m.png", slug: "veg-salad" },
  { file: "Gemini_Generated_Image_e1dw00e1dw00e1dw.png", slug: "veg-pasta" },
  { file: "Gemini_Generated_Image_4h6ria4h6ria4h6r.png", slug: "brown-rice-pulav" },

  // Juices and shakes.
  { file: "Gemini_Generated_Image_ze7upcze7upcze7u.png", slug: "beet-carrot-juice" },
  { file: "Gemini_Generated_Image_64ud1g64ud1g64ud.png", slug: "lassi" },
  { file: "Gemini_Generated_Image_jlgf1rjlgf1rjlgf.png", slug: "protein-shake" },

  // ── Combos ─────────────────────────────────────────────────────────
  // Landscape flat lays, so these carry a banner as well as a square.
  { file: "Gemini_Generated_Image_b6dwvdb6dwvdb6dw.png", slug: "morning-start", banner: true },
  { file: "Gemini_Generated_Image_kw2g1ykw2g1ykw2g.png", slug: "power-breakfast", banner: true },
  { file: "Gemini_Generated_Image_eiuv5keiuv5keiuv.png", slug: "light-lunch", banner: true },
  { file: "Gemini_Generated_Image_5ukphs5ukphs5ukp.png", slug: "tea-time", banner: true },
  { file: "Gemini_Generated_Image_vxojdqvxojdqvxoj.png", slug: "healthy-evening", banner: true },

  // ── Atmosphere ─────────────────────────────────────────────────────
  // Not menu items. Wide, dark, overhead shots used as section grounds
  // and parallax plates.
  { file: "Gemini_Generated_Image_8ch1nw8ch1nw8ch1.png", slug: "scene-thali-spread", banner: true, bannerOnly: true },
  { file: "Gemini_Generated_Image_p40x7qp40x7qp40x.png", slug: "scene-chaat", banner: true, bannerOnly: true },
  { file: "Gemini_Generated_Image_mpfp4kmpfp4kmpfp.png", slug: "scene-soup", banner: true, bannerOnly: true },
  { file: "Gemini_Generated_Image_ffrkqyffrkqyffrk.png", slug: "scene-pasta", banner: true, bannerOnly: true },
  { file: "Gemini_Generated_Image_kjh1r5kjh1r5kjh1.png", slug: "scene-oats", banner: true, bannerOnly: true },
  { file: "Gemini_Generated_Image_hovyixhovyixhovy.png", slug: "scene-coffee", banner: true, bannerOnly: true },
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
