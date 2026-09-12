/**
 * Seeds the menu from src/data/menu.ts into Supabase.
 *
 *   npm run seed
 *
 * Run it after applying supabase/schema.sql. It is idempotent: categories,
 * items and combos are upserted by slug, so re-running picks up new dishes and
 * corrected descriptions without creating duplicates.
 *
 * Prices are the one thing it will NOT overwrite. Once an admin edits a price
 * the row is flagged `price_locked` and the placeholder in menu.ts is ignored
 * from then on. Pass --force-prices to override that deliberately.
 *
 * Imports a .ts file directly — Node 24 strips the types at load time.
 */
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES, COMBOS } from "../src/data/menu.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const forcePrices = process.argv.includes("--force-prices");

if (!url || !key) {
  console.error(
    "\n  Missing Supabase credentials.\n" +
      "  Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL\n" +
      "  and SUPABASE_SERVICE_ROLE_KEY, then run `npm run seed` again.\n",
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const paise = (rupees) => Math.round(rupees * 100);

async function main() {
  console.log(`\n  Seeding Shreya's Kitchen → ${new URL(url).host}\n`);

  let itemCount = 0;
  let skippedPrices = 0;

  for (const [index, cat] of CATEGORIES.entries()) {
    const { data: category, error: catErr } = await db
      .from("categories")
      .upsert(
        {
          slug: cat.slug,
          name: cat.name,
          blurb: cat.blurb,
          window_label: cat.window ?? null,
          available_from: cat.availableFrom ?? null,
          available_to: cat.availableTo ?? null,
          sort_order: index,
          is_active: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (catErr) throw catErr;
    console.log(`  ${cat.name.padEnd(34)} ${String(cat.items.length).padStart(2)} items`);

    for (const [i, item] of cat.items.entries()) {
      const { data: existing } = await db
        .from("menu_items")
        .select("id, price_locked")
        .eq("slug", item.slug)
        .maybeSingle();

      const keepPrice = existing?.price_locked && !forcePrices;
      if (keepPrice) skippedPrices++;

      const row = {
        category_id: category.id,
        slug: item.slug,
        name: item.name,
        description: item.description,
        note: item.note ?? null,
        options: item.options ?? [],
        is_favourite: Boolean(item.favourite),
        sort_order: i,
        updated_at: new Date().toISOString(),
      };
      if (!keepPrice) {
        row.price_paise = paise(item.price);
        if (forcePrices) row.price_locked = false;
      }

      const { error } = existing
        ? await db.from("menu_items").update(row).eq("id", existing.id)
        : await db.from("menu_items").insert({ ...row, price_paise: paise(item.price) });
      if (error) throw error;
      itemCount++;
    }
  }

  console.log("");
  for (const [i, combo] of COMBOS.entries()) {
    const { data: existing } = await db
      .from("combos")
      .select("id, price_locked")
      .eq("slug", combo.slug)
      .maybeSingle();

    const keepPrice = existing?.price_locked && !forcePrices;
    if (keepPrice) skippedPrices++;

    const row = {
      slug: combo.slug,
      code: combo.code,
      name: combo.name,
      window_label: combo.window,
      available_from: combo.availableFrom ?? null,
      available_to: combo.availableTo ?? null,
      slots: combo.slots,
      sort_order: i,
      updated_at: new Date().toISOString(),
    };
    if (!keepPrice) {
      row.price_paise = paise(combo.price);
      if (forcePrices) row.price_locked = false;
    }

    const { error } = existing
      ? await db.from("combos").update(row).eq("id", existing.id)
      : await db.from("combos").insert({ ...row, price_paise: paise(combo.price) });
    if (error) throw error;
    console.log(`  ${combo.code}  ${combo.name}`);
  }

  console.log(
    `\n  Done — ${itemCount} items, ${COMBOS.length} combos.` +
      (skippedPrices
        ? `\n  ${skippedPrices} admin-edited price(s) left untouched. Use --force-prices to reset them.`
        : "") +
      "\n  Placeholder prices are seeds, not quotes — set the real ones in Admin → Menu.\n",
  );
}

main().catch((err) => {
  console.error("\n  Seed failed:", err.message ?? err, "\n");
  process.exit(1);
});
