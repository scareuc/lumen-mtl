import { supabase } from "@/integrations/supabase/client";
import type { NovelCardData } from "@/components/NovelCard";

export async function fetchNovels(opts?: { limit?: number; genre?: string; q?: string }) {
  let q = supabase
    .from("novels")
    .select("id, title, synopsis, cover_url, genre, status, views, created_at")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.genre) q = q.eq("genre", opts.genre);
  if (opts?.q) q = q.ilike("title", `%${opts.q}%`);
  const { data, error } = await q;
  if (error) throw error;
  const ids = (data ?? []).map((n) => n.id);
  if (ids.length === 0) return [] as NovelCardData[];

  const [{ data: ratings }, { data: chapters }] = await Promise.all([
    supabase.from("ratings").select("novel_id, rating").in("novel_id", ids),
    supabase.from("chapters").select("novel_id").in("novel_id", ids).eq("published", true),
  ]);

  const ratingMap = new Map<string, { sum: number; count: number }>();
  for (const r of ratings ?? []) {
    const cur = ratingMap.get(r.novel_id) ?? { sum: 0, count: 0 };
    cur.sum += r.rating; cur.count += 1;
    ratingMap.set(r.novel_id, cur);
  }
  const chapterMap = new Map<string, number>();
  for (const c of chapters ?? []) {
    chapterMap.set(c.novel_id, (chapterMap.get(c.novel_id) ?? 0) + 1);
  }

  return (data ?? []).map((n): NovelCardData => {
    const r = ratingMap.get(n.id);
    return {
      ...n,
      avg_rating: r ? r.sum / r.count : null,
      rating_count: r?.count ?? 0,
      chapter_count: chapterMap.get(n.id) ?? 0,
    };
  });
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + "-" + Math.random().toString(36).slice(2, 7);
}
