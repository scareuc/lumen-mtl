## Goal

Let authors create novels as either single-language (default) or dual-language (original + English translation). Readers choose to read in original, English (default), or both side-by-side.

## Schema changes (one migration)

**`novels` table**
- `is_dual_language boolean NOT NULL DEFAULT false`
- `original_language text` (e.g. "Japanese", "Korean", "Chinese", "Spanish" — nullable; required when dual)

**`chapters` table**
- `original_title text` (nullable)
- `original_content text` (nullable)
- Existing `title` / `content` continue to hold the English (or sole) version.
- `word_count` continues to reflect English/primary content.

No backfill needed — existing novels stay single-language.

## Author UI

**New novel form** (`write.new.tsx`)
- Add a "Translation" toggle: *Single language* (default) / *Dual language (original + English)*.
- When dual: show an `original_language` dropdown (Japanese, Korean, Chinese, Spanish, French, German, Other) and a note that each chapter will have two text fields.

**Edit novel page** (`write.$novelId.index.tsx`)
- Surface and allow editing the same two fields.

**New / edit chapter forms**
- If the parent novel is dual-language, render two stacked editors:
  - *Original* — `original_title`, `original_content` (with its own word count).
  - *English* — existing `title`, `content`.
- Validate both sides are non-empty before save when dual; keep current single-field validation otherwise.
- Loader fetches the parent novel's `is_dual_language` to decide which UI to show.

## Reader UI

**Chapter page** (`novel.$id.chapter.$num.tsx`)
- If `novel.is_dual_language` and the chapter has `original_content`, show a view-mode switcher in the chapter header:
  - **English** (default)
  - **Original** (labeled with the novel's `original_language`)
  - **Both** — two-column layout on ≥md screens, stacked on mobile, with a subtle divider; each paragraph aligned by index where possible (simple flex columns, no smart alignment in v1).
- Persist the selected mode in `localStorage` per-novel.
- Title in the page header swaps with the mode; "Both" shows the English title with the original beneath in muted type.
- Single-language novels are unchanged.

**Novel detail page**
- Small badge near the status pill: "Translated from {original_language}" when dual.

## Files touched

- `supabase/migrations/<new>.sql` — schema additions.
- `src/integrations/supabase/types.ts` — regenerated after migration.
- `src/routes/_authenticated/write.new.tsx` — toggle + language select.
- `src/routes/_authenticated/write.$novelId.index.tsx` — edit translation settings.
- `src/routes/_authenticated/write.$novelId.chapter.new.tsx` — dual editor.
- `src/routes/_authenticated/write.$novelId.chapter.$chapterId.tsx` — dual editor.
- `src/routes/novel.$id.chapter.$num.tsx` — view-mode switcher + layouts.
- `src/routes/novel.$id.index.tsx` — translated-from badge.

## Out of scope (v1)

- Per-paragraph alignment / sentence-level sync.
- More than two languages.
- Importing translations from files.
