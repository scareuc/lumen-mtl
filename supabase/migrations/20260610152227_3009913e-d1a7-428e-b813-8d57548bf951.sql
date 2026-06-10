ALTER TABLE public.novels
  ADD COLUMN is_dual_language boolean NOT NULL DEFAULT false,
  ADD COLUMN original_language text;

ALTER TABLE public.chapters
  ADD COLUMN original_title text,
  ADD COLUMN original_content text;