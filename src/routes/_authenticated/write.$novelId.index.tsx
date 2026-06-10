import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/write/$novelId/")({
  loader: async ({ params }) => {
    const { data } = await supabase.from("novels").select("id, title, author_id, status, genre").eq("id", params.novelId).maybeSingle();
    if (!data) throw notFound();
    return { novel: data };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `Manage: ${loaderData?.novel.title ?? ""}` }] }),
  notFoundComponent: () => <div className="p-12 text-center text-muted-foreground">Novel not found.</div>,
  errorComponent: ({ error }) => <div className="p-12 text-center text-muted-foreground">{error.message}</div>,
  component: ManageNovel,
});

function ManageNovel() {
  const { novel } = Route.useLoaderData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: chapters = [] } = useQuery({
    queryKey: ["my-chapters", novel.id],
    queryFn: async () => {
      const { data } = await supabase.from("chapters").select("id, chapter_number, title, word_count, published, created_at")
        .eq("novel_id", novel.id).order("chapter_number", { ascending: true });
      return data ?? [];
    },
  });

  if (user && novel.author_id !== user.id) {
    return <div className="min-h-screen"><Header /><div className="p-12 text-center text-muted-foreground">Not your novel.</div></div>;
  }

  async function deleteNovel() {
    if (!confirm("Delete this novel and all its chapters? This can't be undone.")) return;
    const { error } = await supabase.from("novels").delete().eq("id", novel.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Novel deleted");
    navigate({ to: "/write" });
  }

  async function deleteChapter(id: string) {
    if (!confirm("Delete this chapter?")) return;
    await supabase.from("chapters").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-chapters", novel.id] });
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link to="/write" className="text-xs uppercase tracking-[0.2em] text-gold/80 hover:text-gold">← Your novels</Link>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-parchment">{novel.title}</h1>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{novel.genre} · {novel.status}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/novel/$id" params={{ id: novel.id }}><ExternalLink className="h-4 w-4 mr-2" />View public</Link>
            </Button>
            <Button variant="ghost" onClick={deleteNovel} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <h2 className="font-display text-2xl text-parchment">Chapters</h2>
          <Button asChild className="bg-gold text-primary-foreground hover:bg-gold-soft">
            <Link to="/write/$novelId/chapter/new" params={{ novelId: novel.id }}>
              <Plus className="h-4 w-4 mr-2" />New chapter
            </Link>
          </Button>
        </div>

        <div className="mt-4 rounded-lg border border-border/60 bg-card/50 divide-y divide-border/50">
          {chapters.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No chapters yet. Write the first one.</p>
          ) : chapters.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <Link
                to="/write/$novelId/chapter/$chapterId"
                params={{ novelId: novel.id, chapterId: c.id }}
                className="flex-1 flex items-center gap-3 hover:text-gold transition-colors"
              >
                <span className="text-xs text-gold/80">Ch. {c.chapter_number}</span>
                <span>{c.title}</span>
                {!c.published && <span className="text-xs text-muted-foreground">(draft)</span>}
              </Link>
              <span className="text-xs text-muted-foreground">{c.word_count.toLocaleString()}w</span>
              <button onClick={() => deleteChapter(c.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
