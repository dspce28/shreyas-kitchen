"use client";

import { Database } from "lucide-react";

/**
 * Shown when /api/menu could not be reached, which in practice means
 * Supabase has not been connected yet. The menu below is the transcribed
 * printed one, so the page still reads correctly — ordering is just off.
 */
export function PreviewBanner() {
  return (
    <div className="mx-auto mt-6 max-w-3xl px-4 sm:px-6">
      <div className="glass-sage flex items-start gap-3 rounded-2xl px-4 py-3.5">
        <Database size={17} className="mt-0.5 shrink-0 text-sage-300" aria-hidden />
        <div className="text-sm">
          <p className="font-medium text-sage-300">Preview mode</p>
          <p className="mt-0.5 leading-relaxed text-cream-dim">
            Showing the printed menu. Connect Supabase and run{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-sage-300">
              npm run seed
            </code>{" "}
            to switch on live prices and ordering. Prices below are placeholders.
          </p>
        </div>
      </div>
    </div>
  );
}
