import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";

type Mode = "english" | "original" | "both";

export const Route = createFileRoute("/novel/$id/chapter/$num")({
  loader: async ({ params }) => {
    const num = parseInt(params.num, 10);
    if (Number.isNaN(num)) throw notFound();
    const { data: novel } = await supabase
      .from("novels").select("id, title, is_dual_language, original_language")
      .eq("id", params.id).maybeSingle();
    if (!novel) throw notFound();
    const { data: chapter } = await supabase
      .from("chapters")
      .select("id, chapter_number, title, content, word_count, published, original_title, original_content")
      .eq("novel_id", params.id).eq("chapter_number", num).maybeSingle();
    if (!chapter) throw notFound();
    const { data: siblings } = await supabase
      .from("chapters").select("chapter_number").eq("novel_id", params.id).eq("published", true)
      .order("chapter_number", { ascending: true });
    const nums = (siblings ?? []).map(s => s.chapter_number);
    const idx = nums.indexOf(num);
    return {
      novel, chapter,
      prev: idx > 0 ? nums[idx - 1] : null,
      next: idx >= 0 && idx < nums.length - 1 ? nums[idx + 1] : null,
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.chapter.title} — ${loaderData.novel.title}` },
      { name: "description", content: `Chapter ${loaderData.chapter.chapter_number}: ${loaderData.chapter.title}` },
    ] : [],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen"><Header /><div className="p-12 text-center text-muted-foreground">Chapter not found.</div></div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen"><Header /><div className="p-12 text-center text-muted-foreground">{error.message}</div></div>
  ),
  component: ChapterPage,
});

function splitParas(s: string) {
  return s.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
}

function ChapterPage() {
  const { novel, chapter, prev, next } = Route.useLoaderData();
  const { user } = useAuth();
  const hasOriginal = !!(novel.is_dual_language && chapter.original_content);
  const storageKey = `lumen:reader-mode:${novel.id}`;
  const [mode, setMode] = useState<Mode>("english");

  useEffect(() => {
    if (!hasOriginal) { setMode("english"); return; }
    const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (saved === "original" || saved === "both" || saved === "english") setMode(saved);
  }, [hasOriginal, storageKey]);

  function pickMode(m: Mode) {
    setMode(m);
    if (typeof window !== "undefined") localStorage.setItem(storageKey, m);
  }

  // Track reading progress
  useEffect(() => {
    if (!user) return;
    supabase.from("reading_progress").upsert({
      user_id: user.id, novel_id: novel.id, chapter_id: chapter.id, chapter_number: chapter.chapter_number,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,novel_id" });
  }, [user, novel.id, chapter.id, chapter.chapter_number]);

  const enParas = splitParas(chapter.content);
  const origParas = hasOriginal ? splitParas(chapter.original_content!) : [];

  return (
    <div className="min-h-screen">
      <Header />
      <article className={`mx-auto px-6 py-12 ${mode === "both" ? "max-w-6xl" : "max-w-2xl"}`}>
        <Link to="/novel/$id" params={{ id: novel.id }} className="text-xs uppercase tracking-[0.2em] text-gold/80 hover:text-gold">
          ← {novel.title}
        </Link>

        {mode === "both" && hasOriginal ? (
          <div className="mt-4 grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70">{novel.original_language}</p>
              <h1 className="mt-1 font-display text-3xl text-parchment leading-tight">{chapter.original_title ?? chapter.title}</h1>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70">English</p>
              <h1 className="mt-1 font-display text-3xl text-parchment leading-tight">{chapter.title}</h1>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-4 font-display text-4xl text-parchment leading-tight">
              {mode === "original" && hasOriginal ? (chapter.original_title ?? chapter.title) : chapter.title}
            </h1>
            {mode === "original" && hasOriginal && chapter.original_title && chapter.title && (
              <p className="mt-1 text-sm text-muted-foreground italic">{chapter.title}</p>
            )}
          </>
        )}
        <p className="mt-2 text-sm text-muted-foreground">Chapter {chapter.chapter_number} · {chapter.word_count.toLocaleString()} words</p>

        {hasOriginal && (
          <div className="mt-4 inline-flex rounded-md border border-border/60 bg-card/60 p-1 text-xs">
            <ModeButton active={mode === "english"} onClick={() => pickMode("english")}>English</ModeButton>
            <ModeButton active={mode === "original"} onClick={() => pickMode("original")}>{novel.original_language}</ModeButton>
            <ModeButton active={mode === "both"} onClick={() => pickMode("both")}>Both</ModeButton>
          </div>
        )}

        <div className="ornament mt-8 mb-8 text-gold/60"><span className="text-xs">❦</span></div>

        {mode === "both" && hasOriginal ? (
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
            {Array.from({ length: Math.max(enParas.length, origParas.length) }).map((_, i) => (
              <BothRow key={i} orig={origParas[i] ?? ""} en={enParas[i] ?? ""} />
            ))}
          </div>
        ) : (
          <div className="prose-reader whitespace-pre-wrap">
            {mode === "original" && hasOriginal ? chapter.original_content : chapter.content}
          </div>
        )}

        <div className="ornament mt-12 mb-8 text-gold/60"><span className="text-xs">❦</span></div>

        <nav className="flex items-center justify-between gap-2">
          {prev ? (
            <Button variant="outline" asChild>
              <Link to="/novel/$id/chapter/$num" params={{ id: novel.id, num: String(prev) }}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Link>
            </Button>
          ) : <Button variant="outline" disabled><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>}
          <Button variant="ghost" asChild>
            <Link to="/novel/$id" params={{ id: novel.id }}><List className="h-4 w-4 mr-2" />Index</Link>
          </Button>
          {next ? (
            <Button variant="outline" asChild className="border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">
              <Link to="/novel/$id/chapter/$num" params={{ id: novel.id, num: String(next) }}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : <Button variant="outline" disabled>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>}
        </nav>
      </article>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-colors ${active ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-parchment"}`}
    >
      {children}
    </button>
  );
}

function BothRow({ orig, en }: { orig: string; en: string }) {
  return (
    <>
      <p className="font-serif text-base leading-relaxed text-parchment whitespace-pre-wrap">{orig}</p>
      <p className="font-serif text-base leading-relaxed text-parchment whitespace-pre-wrap">{en}</p>
    </>
  );
}
