import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/write/$novelId/chapter/new")({
  head: () => ({ meta: [{ title: "New chapter — Lumen" }] }),
  loader: async ({ params }) => {
    const { data: novel } = await supabase
      .from("novels").select("id, title, is_dual_language, original_language")
      .eq("id", params.novelId).maybeSingle();
    if (!novel) throw notFound();
    const { data: maxRow } = await supabase
      .from("chapters").select("chapter_number")
      .eq("novel_id", params.novelId)
      .order("chapter_number", { ascending: false }).limit(1).maybeSingle();
    return { novel, nextNumber: (maxRow?.chapter_number ?? 0) + 1 };
  },
  notFoundComponent: () => <div className="p-12 text-center text-muted-foreground">Novel not found.</div>,
  errorComponent: ({ error }) => <div className="p-12 text-center text-muted-foreground">{error.message}</div>,
  component: NewChapter,
});

function countWords(s: string) { return s.trim().split(/\s+/).filter(Boolean).length; }

function NewChapter() {
  const { novel, nextNumber } = Route.useLoaderData();
  const { novelId } = Route.useParams();
  const navigate = useNavigate();
  const dual = novel.is_dual_language;
  const [chapterNumber, setChapterNumber] = useState(nextNumber);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(chapterNumber);
    if (!Number.isFinite(num) || num < 1) { toast.error("Chapter number must be at least 1"); return; }
    if (!title.trim()) { toast.error("Add an English chapter title"); return; }
    if (!content.trim()) { toast.error("Write the English chapter content"); return; }
    if (dual) {
      if (!originalTitle.trim()) { toast.error(`Add the ${novel.original_language} title`); return; }
      if (!originalContent.trim()) { toast.error(`Write the ${novel.original_language} content`); return; }
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("chapters").insert({
        novel_id: novelId, chapter_number: num, title: title.trim(), content,
        word_count: countWords(content), published,
        original_title: dual ? originalTitle.trim() : null,
        original_content: dual ? originalContent : null,
      });
      if (error) { toast.error(error.message); return; }
      toast.success(published ? "Chapter published" : "Chapter saved as draft");
      navigate({ to: "/write/$novelId", params: { novelId } });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save chapter");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-4xl text-parchment">New chapter</h1>
        {dual && (
          <p className="mt-2 text-sm text-muted-foreground">
            Dual language · {novel.original_language} + English
          </p>
        )}

        <form onSubmit={submit} noValidate className="mt-8 space-y-5">
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <div>
              <Label htmlFor="num">Number</Label>
              <Input id="num" type="number" min={1} value={Number.isFinite(chapterNumber) ? chapterNumber : ""} onChange={e => setChapterNumber(e.target.value === "" ? NaN : parseInt(e.target.value, 10))} className="bg-background mt-1.5" />
            </div>
            <div>
              <Label htmlFor="title">{dual ? "English title" : "Title"}</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="bg-background mt-1.5" placeholder="Chapter title" />
            </div>
          </div>
          <div>
            <Label htmlFor="content">{dual ? "English content" : "Content"}</Label>
            <textarea
              id="content" value={content} onChange={e => setContent(e.target.value)} rows={18}
              className="w-full mt-1.5 rounded-md bg-background border border-border px-4 py-3 font-serif text-base leading-relaxed"
              placeholder="Write your chapter..."
            />
            <p className="mt-1 text-xs text-muted-foreground">{countWords(content).toLocaleString()} words</p>
          </div>

          {dual && (
            <>
              <div className="pt-2 border-t border-border/60">
                <Label htmlFor="otitle">{novel.original_language} title</Label>
                <Input id="otitle" value={originalTitle} onChange={e => setOriginalTitle(e.target.value)} className="bg-background mt-1.5" placeholder={`${novel.original_language} title`} />
              </div>
              <div>
                <Label htmlFor="ocontent">{novel.original_language} content</Label>
                <textarea
                  id="ocontent" value={originalContent} onChange={e => setOriginalContent(e.target.value)} rows={18}
                  className="w-full mt-1.5 rounded-md bg-background border border-border px-4 py-3 font-serif text-base leading-relaxed"
                  placeholder={`Write the ${novel.original_language} text...`}
                />
                <p className="mt-1 text-xs text-muted-foreground">{originalContent.trim().length.toLocaleString()} characters</p>
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
            Publish immediately
          </label>
          <Button type="submit" disabled={loading} className="bg-gold text-primary-foreground hover:bg-gold-soft">
            {loading ? "Saving..." : "Save chapter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
