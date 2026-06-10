import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Star, BookmarkPlus, BookmarkCheck, Edit } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/novel/$id/")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("novels")
      .select("id, title, synopsis, cover_url, genre, tags, status, author_id, created_at, is_dual_language, original_language")
      .eq("id", params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    const { data: profile } = await supabase.from("profiles").select("username, display_name").eq("id", data.author_id).maybeSingle();
    return { novel: data, author: profile };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.novel.title} — Lumen` },
      { name: "description", content: loaderData.novel.synopsis ?? "Read on Lumen" },
      { property: "og:title", content: loaderData.novel.title },
      { property: "og:description", content: loaderData.novel.synopsis ?? "Read on Lumen" },
      ...(loaderData.novel.cover_url ? [{ property: "og:image", content: loaderData.novel.cover_url }] : []),
    ] : [],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen"><Header /><div className="p-12 text-center text-muted-foreground">{error.message}</div></div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen"><Header /><div className="p-12 text-center text-muted-foreground">Novel not found.</div></div>
  ),
  component: NovelPage,
});

function NovelPage() {
  const { novel, author } = Route.useLoaderData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAuthor = user?.id === novel.author_id;

  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", novel.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("id, chapter_number, title, word_count, created_at, published")
        .eq("novel_id", novel.id)
        .order("chapter_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ["ratings", novel.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("id, user_id, rating, review, created_at")
        .eq("novel_id", novel.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const avg = ratings.length ? ratings.reduce((a, r) => a + r.rating, 0) / ratings.length : 0;

  const { data: inLibrary, refetch: refetchLib } = useQuery({
    enabled: !!user,
    queryKey: ["library", novel.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("library").select("novel_id").eq("user_id", user!.id).eq("novel_id", novel.id).maybeSingle();
      return !!data;
    },
  });

  const myRating = ratings.find((r) => r.user_id === user?.id);

  async function toggleLibrary() {
    if (!user) { toast.error("Sign in to save novels"); return; }
    if (inLibrary) {
      await supabase.from("library").delete().eq("user_id", user.id).eq("novel_id", novel.id);
    } else {
      await supabase.from("library").insert({ user_id: user.id, novel_id: novel.id });
    }
    refetchLib();
  }

  return (
    <div className="min-h-screen">
      <Header />
      <article className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid md:grid-cols-[260px_1fr] gap-10">
          <div className="rounded-lg overflow-hidden border border-border/60 bg-secondary aspect-[3/4]">
            {novel.cover_url ? (
              <img src={novel.cover_url} alt={novel.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center p-4">
                <span className="font-display text-2xl text-gold/70 text-center">{novel.title}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gold/80">{novel.genre ?? "Fiction"} · {novel.status}</p>
            {novel.is_dual_language && novel.original_language && (
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Translated from {novel.original_language}</p>
            )}
            <h1 className="mt-2 font-display text-5xl text-parchment leading-tight">{novel.title}</h1>
            {author && (
              <p className="mt-2 text-muted-foreground">
                by <span className="text-parchment">{author.display_name ?? author.username}</span>
              </p>
            )}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-gold">
                <Star className="h-4 w-4 fill-current" />
                {avg > 0 ? avg.toFixed(1) : "—"}
                <span className="text-muted-foreground ml-1">({ratings.length})</span>
              </span>
              <span className="text-muted-foreground">{chapters.filter(c => c.published).length} chapters</span>
            </div>

            <p className="mt-6 text-base leading-relaxed text-muted-foreground whitespace-pre-line">
              {novel.synopsis}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {chapters[0] && (
                <Button asChild className="bg-gold text-primary-foreground hover:bg-gold-soft">
                  <Link to="/novel/$id/chapter/$num" params={{ id: novel.id, num: String(chapters[0].chapter_number) }}>
                    Start reading
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={toggleLibrary} className="border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">
                {inLibrary ? <><BookmarkCheck className="h-4 w-4 mr-2" />In library</> : <><BookmarkPlus className="h-4 w-4 mr-2" />Add to library</>}
              </Button>
              {isAuthor && (
                <Button variant="outline" asChild>
                  <Link to="/write/$novelId" params={{ novelId: novel.id }}><Edit className="h-4 w-4 mr-2" />Manage</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <section className="mt-16">
          <h2 className="font-display text-2xl text-parchment mb-4">Chapters</h2>
          <div className="rounded-lg border border-border/60 bg-card/50 divide-y divide-border/50">
            {chapters.length === 0 && <p className="p-6 text-muted-foreground text-sm">No chapters yet.</p>}
            {chapters.map((c) => (
              <Link
                key={c.id}
                to="/novel/$id/chapter/$num"
                params={{ id: novel.id, num: String(c.chapter_number) }}
                className="flex items-center justify-between px-5 py-3 hover:bg-accent/40 transition-colors"
              >
                <div>
                  <span className="text-xs text-gold/80 mr-3">Ch. {c.chapter_number}</span>
                  <span className="text-parchment">{c.title}</span>
                  {!c.published && <span className="ml-2 text-xs text-muted-foreground">(draft)</span>}
                </div>
                <span className="text-xs text-muted-foreground">{c.word_count.toLocaleString()} words</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl text-parchment mb-4">Reviews</h2>
          {user && !isAuthor && (
            <RatingForm novelId={novel.id} userId={user.id} existing={myRating} onDone={() => qc.invalidateQueries({ queryKey: ["ratings", novel.id] })} />
          )}
          <div className="mt-6 space-y-4">
            {ratings.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
            {ratings.filter(r => r.review).map((r) => (
              <div key={r.id} className="rounded-lg border border-border/60 bg-card/50 p-4">
                <div className="flex items-center gap-1 text-gold mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "opacity-30"}`} />
                  ))}
                </div>
                <p className="text-sm text-foreground whitespace-pre-line">{r.review}</p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}

function RatingForm({ novelId, userId, existing, onDone }: { novelId: string; userId: string; existing?: any; onDone: () => void }) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [review, setReview] = useState(existing?.review ?? "");
  useEffect(() => { setRating(existing?.rating ?? 0); setReview(existing?.review ?? ""); }, [existing?.id]);

  const m = useMutation({
    mutationFn: async () => {
      if (rating < 1) throw new Error("Pick a rating");
      const { error } = await supabase.from("ratings").upsert(
        { novel_id: novelId, user_id: userId, rating, review: review || null },
        { onConflict: "novel_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Review saved"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-4">
      <p className="text-sm text-muted-foreground mb-2">{existing ? "Update your review" : "Leave a review"}</p>
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} type="button" onClick={() => setRating(i + 1)}>
            <Star className={`h-6 w-6 transition-colors ${i < rating ? "fill-gold text-gold" : "text-muted-foreground hover:text-gold"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Share your thoughts..."
        rows={3}
        className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm"
      />
      <Button onClick={() => m.mutate()} disabled={m.isPending} className="mt-3 bg-gold text-primary-foreground hover:bg-gold-soft">
        {m.isPending ? "Saving..." : "Submit"}
      </Button>
    </div>
  );
}