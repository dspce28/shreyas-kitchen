/**
 * Turns fake "transparent" renders into genuinely transparent assets, and
 * cuts the scatter render into individual particle sprites.
 *
 *   node scripts/key-cutouts.mjs
 *
 * The generator drew a transparency checkerboard as OPAQUE PIXELS instead of
 * writing an alpha channel. Composited over a 3D scene those would show as
 * grey squares, so the pattern has to be keyed out and a real alpha built.
 *
 * Outputs:
 *   public/menu/cutout/<slug>.webp        — midground hero assets
 *   public/menu/particle/<name>.webp      — foreground sprite atlas members
 */
import sharp from "sharp";
import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const SRC = process.argv[2] ?? "C:/Users/logic/Downloads/images";
const ROOT = resolve(import.meta.dirname, "..");
const CUTOUT = join(ROOT, "public/menu/cutout");
const PARTICLE = join(ROOT, "public/menu/particle");

const JOBS = [
  // These two arrived already background-removed, with a genuine alpha
  // channel. They skip the keyer entirely — a hand-cut matte beats anything
  // this script can infer, particularly around the glass bowl's rim and the
  // thali's thin steel edge, where our key left residue.
  {
    // Shot straight down, so the plate is a true circle with no perspective
    // on the katori walls. That is what makes a turntable spin work — the
    // earlier plate was photographed at ~35 degrees, an ellipse, and
    // rotating it in plane read as tumbling rather than turning.
    file: "Gemini_Generated_Image_8b60c08b60c08b60-removebg-preview.png",
    slug: "thali-plate",
    preKeyed: true,
    max: 1000,
  },
  {
    // The stoneware variant. Kept for still use, not rotation: the folded
    // napkin sits outside the plate, so it would orbit with it.
    file: "Gemini_Generated_Image_gml3b9gml3b9gml3-removebg-preview.png",
    slug: "thali-plate-stoneware",
    preKeyed: true,
    max: 1000,
  },
  {
    file: "Gemini_Generated_Image_kqaaphkqaaphkqaa-removebg-preview.png",
    slug: "quinoa-bowl",
    preKeyed: true,
    max: 900,
  },
  {
    // Also pre-keyed. Our own key of the raw file left speckles of surviving
    // background around each bean — the dark checker and roasted coffee sit
    // too close in value to separate cleanly. A hand-cut matte is worth more
    // here than the extra resolution of the original.
    file: "Gemini_Generated_Image_ewzp35ewzp35ewzp-removebg-preview.png",
    slug: "scatter",
    preKeyed: true,
    max: 1200,
    // Split into individual sprites for the particle layer.
    explode: { count: 14, minPx: 240, pad: 4 },
  },
  // Engraved botanicals for the decorative parallax layer. White line art on
  // a dark checker is the easiest case in the set — the two are at opposite
  // ends of the range, so a generous tolerance is safe, and the gaps between
  // strokes are connected to the border and key out correctly.
  {
    file: "Gemini_Generated_Image_wdptn1wdptn1wdpt.png",
    slug: "engraving-spices",
    tol: 34,
    // 640 is ample for a decoration that never renders above ~28rem wide.
    max: 640,
    lineArt: true,
  },
  {
    file: "Gemini_Generated_Image_ms5svmms5svmms5s.png",
    slug: "engraving-berries",
    tol: 34,
    max: 640,
    lineArt: true,
  },

  // ── Batch two: supplied background-removed ─────────────────────────
  // All pre-keyed. Our own key of the white-background originals dropped
  // every red chilli — chilli red is far from white, but the thin dried
  // stalks fell under the blob-size floor and took the pod with them.
  // The hand-cut mattes keep them.
  {
    file: "Gemini_Generated_Image_jxbd7ajxbd7ajxbd-removebg-preview.png",
    slug: "spice-scatter",
    preKeyed: true,
    max: 1200,
    // Chilli, bay leaf, star anise, cumin, peppercorn — each its own blob.
    explode: { count: 16, minPx: 260, pad: 4, prefix: "s", allowEdge: true },
  },
  {
    file: "Gemini_Generated_Image_o6eb8bo6eb8bo6eb-removebg-preview.png",
    slug: "samosa-pair",
    preKeyed: true,
    max: 700,
  },
  {
    file: "Gemini_Generated_Image_k0rlvtk0rlvtk0rl-removebg-preview.png",
    slug: "samosa-pair-alt",
    preKeyed: true,
    max: 700,
  },
  {
    file: "Gemini_Generated_Image_n7dn3cn7dn3cn7dn-removebg-preview.png",
    slug: "chai-cup",
    preKeyed: true,
    max: 700,
  },
  {
    file: "Gemini_Generated_Image_9hjk7c9hjk7c9hjk-removebg-preview.png",
    slug: "chai-cup-clay",
    preKeyed: true,
    max: 700,
  },
];

const near = (d, i, c, tol) =>
  Math.abs(d[i] - c[0]) <= tol && Math.abs(d[i + 1] - c[1]) <= tol && Math.abs(d[i + 2] - c[2]) <= tol;

/**
 * Loads a file that already carries a real alpha channel, in the same shape
 * keyImage returns — so pre-keyed art flows through the identical bounding
 * box, resize and sprite-explode pipeline rather than a parallel one.
 */
async function loadPreKeyed(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const alpha = Buffer.alloc(W * H);
  for (let k = 0; k < W * H; k++) alpha[k] = data[k * 4 + 3];
  return { rgba: data, W, H, alpha, checks: null };
}

/** Keys the checkerboard and returns { rgba, W, H, alpha }. */
async function keyImage(path, tol, lineArt = false) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (x, y) => (y * W + x) * 4;

  // Learn the checker's two greys from corner samples a few pixels apart,
  // so the two squares of the pattern are both represented.
  const samples = [
    [2, 2], [10, 2], [2, 10], [W - 3, 2], [W - 11, 2], [2, H - 3], [W - 3, H - 3],
  ].map(([x, y]) => {
    const i = px(x, y);
    return [data[i], data[i + 1], data[i + 2]];
  });
  const checks = [];
  for (const s of samples) {
    if (!checks.some((c) => Math.abs(c[0] - s[0]) <= 12)) checks.push(s);
    if (checks.length === 2) break;
  }

  const candidate = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = px(x, y);
      if (checks.some((c) => near(data, i, c, tol))) candidate[y * W + x] = 1;
    }
  }

  const bg = new Uint8Array(W * H);

  // Line art is white on a dark checker — the two cannot be confused, so a
  // direct colour key is both safe and necessary. A border flood fill cannot
  // reach the pockets enclosed by strokes (inside a cardamom pod, along a
  // cinnamon quill), and leaves checkerboard trapped in every one of them.
  if (lineArt) {
    for (let k = 0; k < W * H; k++) bg[k] = candidate[k];
  } else {
  // Otherwise flood fill inward from the border. Only background CONNECTED
  // TO THE EDGE is removed — white rice or a steel rim can match the checker
  // exactly, and a naive colour key punches holes through the subject.
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = y * W + x;
    if (bg[k] || !candidate[k]) return;
    bg[k] = 1;
    stack.push(k);
  };
  for (let x = 0; x < W; x++) {
    push(x, 0);
    push(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    push(0, y);
    push(W - 1, y);
  }
  while (stack.length) {
    const k = stack.pop();
    const x = k % W;
    const y = (k / W) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // Second pass for pockets the fill could not reach — checker seen THROUGH
  // a transparent glass bowl is enclosed by its rim, so the border fill
  // leaves it behind. Only near-neutral greys are removed here: quinoa and
  // rice sit in the same brightness range but are warm, so requiring
  // r≈g≈b keys the background without eating the food.
  for (let k = 0; k < W * H; k++) {
    if (bg[k] || !candidate[k]) continue;
    const i = k * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // 14 rather than a tighter figure: glass tints what is behind it, so the
    // trapped checker is never perfectly neutral. Quinoa and rice are warm
    // enough (r well above b) to stay clear of this.
    if (Math.abs(r - g) <= 14 && Math.abs(g - b) <= 14 && Math.abs(r - b) <= 14) bg[k] = 1;
  }
  }

  const hard = Buffer.alloc(W * H);
  for (let k = 0; k < W * H; k++) hard[k] = bg[k] ? 0 : 255;

  // ── Morphological cleanup ──────────────────────────────────────────
  // The dark checker sits close in value to roasted coffee, so the key
  // leaves two artefacts: isolated opaque specks of surviving background,
  // and small bitten-out holes along a subject's edge. Blurring the mask
  // and re-thresholding closes both — small features of either polarity
  // are averaged away, larger shapes keep their outline.
  //
  // Skipped for line art: those strokes are one or two pixels wide and are
  // exactly the "small feature" this step is designed to erase.
  if (!lineArt) {
    const cleaned = await sharp(hard, { raw: { width: W, height: H, channels: 1 } })
      .blur(2.2)
      .toColourspace("b-w")
      .raw()
      .toBuffer({ resolveWithObject: true });
    const cs = cleaned.info.channels;
    for (let k = 0; k < W * H; k++) hard[k] = cleaned.data[k * cs] >= 128 ? 255 : 0;
  }

  // Feather the mask. sharp can hand back a 1-channel raw buffer as 3
  // channels depending on the pipeline, so read the stride rather than
  // assuming it — indexing a 3-channel buffer as if it were 1 scrambles the
  // mask and shreds every blob into confetti.
  const blurred = await sharp(hard, { raw: { width: W, height: H, channels: 1 } })
    .blur(lineArt ? 0.4 : 1.1)
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const stride = blurred.info.channels;

  const soft = Buffer.alloc(W * H);
  for (let k = 0; k < W * H; k++) {
    const a = blurred.data[k * stride];
    // Tighten the feather so the edge does not glow against a dark scene.
    // Line art keeps its antialiasing instead — hard-clipping one-pixel
    // strokes turns a fine engraving into a jagged stencil.
    soft[k] = lineArt ? a : a < 90 ? 0 : a > 175 ? 255 : Math.round(((a - 90) / 85) * 255);
  }

  const rgba = Buffer.alloc(W * H * 4);
  for (let k = 0; k < W * H; k++) {
    rgba[k * 4] = data[k * 4];
    rgba[k * 4 + 1] = data[k * 4 + 1];
    rgba[k * 4 + 2] = data[k * 4 + 2];
    rgba[k * 4 + 3] = soft[k];
  }
  return { rgba, W, H, alpha: soft, checks };
}

/** Bounding box of pixels above an alpha threshold. */
function bbox(alpha, W, H, thr = 8) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha[y * W + x] > thr) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Labels connected opaque blobs and returns their bounding boxes, largest first. */
function components(alpha, W, H, thr = 40) {
  const seen = new Uint8Array(W * H);
  const out = [];
  const stack = [];
  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const s = sy * W + sx;
      if (seen[s] || alpha[s] <= thr) continue;
      let x0 = sx, y0 = sy, x1 = sx, y1 = sy, area = 0;
      seen[s] = 1;
      stack.push(s);
      while (stack.length) {
        const k = stack.pop();
        const x = k % W;
        const y = (k / W) | 0;
        area++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const nk = ny * W + nx;
          if (seen[nk] || alpha[nk] <= thr) continue;
          seen[nk] = 1;
          stack.push(nk);
        }
      }
      out.push({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1, area });
    }
  }
  return out.sort((a, b) => b.area - a.area);
}

async function run() {
  await rm(CUTOUT, { recursive: true, force: true });
  await rm(PARTICLE, { recursive: true, force: true });
  await mkdir(CUTOUT, { recursive: true });
  await mkdir(PARTICLE, { recursive: true });

  console.log("\n  Keying baked-in checkerboards into real alpha\n");

  for (const job of JOBS) {
    const { rgba, W, H, alpha, checks } = job.preKeyed
      ? await loadPreKeyed(join(SRC, job.file))
      : await keyImage(join(SRC, job.file), job.tol, Boolean(job.lineArt));
    const raw = { width: W, height: H, channels: 4 };

    const box = bbox(alpha, W, H);
    if (!box) {
      console.log(`  ! ${job.slug}: nothing survived the key`);
      continue;
    }

    // Line art is dense high-frequency detail, which WebP hates — the
    // berries engraving weighed 369 kB at photo quality. It ships as a
    // decoration at ~7% opacity, so it can be compressed hard without any
    // visible cost.
    const info = await sharp(rgba, { raw })
      .extract(box)
      .resize(job.max, job.max, { fit: "inside", withoutEnlargement: true })
      .webp(
        job.lineArt
          ? { quality: 58, alphaQuality: 80, effort: 6 }
          : { quality: 88, alphaQuality: 100, effort: 5 },
      )
      .toFile(join(CUTOUT, `${job.slug}.webp`));

    console.log(
      `  ${job.slug.padEnd(13)} ` +
        (checks ? `checker=[${checks.map((c) => c[0]).join(",")}]` : "pre-keyed        ") +
        `  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`,
    );

    // ── Explode into individual particle sprites ────────────────────
    if (job.explode) {
      const all = components(alpha, W, H);
      const blobs = all.filter((b) => b.area >= job.explode.minPx);
      console.log(
        `  ${"".padEnd(13)} components=${all.length} largest=${all[0]?.area ?? 0} ` +
          `passing(>=${job.explode.minPx}px)=${blobs.length}`,
      );
      // Blobs touching the frame edge are cut in half by it and export with
      // an obvious straight side, so they are normally dropped.
      //
      // `allowEdge` overrides that. In the spice scatter every red chilli
      // runs off an edge — they are the longest objects in a frame composed
      // as a border — so the filter silently removed the entire chilli
      // family and shipped only leaves and seeds.
      const whole = job.explode.allowEdge
        ? blobs
        : blobs.filter(
            (b) => b.left > 2 && b.top > 2 && b.left + b.width < W - 2 && b.top + b.height < H - 2,
          );
      const take = whole.slice(0, job.explode.count);

      let n = 0;
      for (const b of take) {
        const p = job.explode.pad;
        const left = Math.max(0, b.left - p);
        const top = Math.max(0, b.top - p);
        const region = {
          left,
          top,
          width: Math.min(W - left, b.width + p * 2),
          height: Math.min(H - top, b.height + p * 2),
        };

        // Keep only THIS blob inside the crop. Neighbouring specks and bits
        // of the next bean fall inside the bounding box and would otherwise
        // ship as black confetti around the sprite.
        const cw = region.width;
        const chh = region.height;
        const cut = Buffer.alloc(cw * chh * 4);
        for (let y = 0; y < chh; y++) {
          for (let x = 0; x < cw; x++) {
            const sx = region.left + x;
            const sy = region.top + y;
            const si = (sy * W + sx) * 4;
            const di = (y * cw + x) * 4;
            const inside =
              sx >= b.left && sx < b.left + b.width && sy >= b.top && sy < b.top + b.height;
            cut[di] = rgba[si];
            cut[di + 1] = rgba[si + 1];
            cut[di + 2] = rgba[si + 2];
            cut[di + 3] = inside ? rgba[si + 3] : 0;
          }
        }

        const prefix = job.explode.prefix ?? "p";
        await sharp(cut, { raw: { width: cw, height: chh, channels: 4 } })
          .resize(160, 160, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 90, alphaQuality: 100, effort: 5 })
          .toFile(join(PARTICLE, `${prefix}${String(n).padStart(2, "0")}.webp`));
        n++;
      }
      console.log(
        `  ${"".padEnd(13)} exploded into ${n} particle sprites (from ${blobs.length} blobs)\n`,
      );
    }
  }
  console.log("");
}

run().catch((e) => {
  console.error("\n  Failed:", e.message, "\n");
  process.exit(1);
});
