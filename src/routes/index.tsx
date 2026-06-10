import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { NovelCard } from "@/components/NovelCard";
import { Button } from "@/components/ui/button";
import { fetchNovels } from "@/lib/novels";
import heroImg from "@/assets/hero.jpg";
import { Feather, Library, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Webnovels for late nights" },
      { name: "description", content: "Discover, read, and write serialized fiction. A home for original webnovels." },
      { property: "og:title", content: "Lumen — Webnovels for late nights" },
      { property: "og:description", content: "Discover, read, and write serialized fiction." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: novels = [] } = useQuery({
    queryKey: ["novels", "home"],
    queryFn: () => fetchNovels({ limit: 12 }),
  });

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="" width={1920} height={1080} className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>
        <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 text-center">
          <div className="ornament mx-auto w-44 text-xs uppercase tracking-[0.3em] text-gold/80">
            <span>est. 2026</span>
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-7xl text-parchment leading-[1.05]">
            Stories that <em className="text-gold not-italic">unfold</em>
            <br />
            chapter by chapter.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base md:text-lg text-muted-foreground">
            A quiet corner of the internet for serialized fiction. Discover new worlds,
            follow your favorite authors, and publish your own.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gold text-primary-foreground hover:bg-gold-soft">
              <Link to="/browse"><Library className="mr-2 h-4 w-4" />Browse novels</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">
              <Link to="/write"><Feather className="mr-2 h-4 w-4" />Start writing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Latest */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gold/80 flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> Fresh ink
            </p>
            <h2 className="mt-2 font-display text-3xl text-parchment">Latest novels</h2>
          </div>
          <Link to="/browse" className="text-sm text-muted-foreground hover:text-gold transition-colors">
            View all →
          </Link>
        </div>

        {novels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-12 text-center">
            <p className="font-display text-2xl text-parchment">The shelves are bare.</p>
            <p className="mt-2 text-sm text-muted-foreground">Be the first to publish — your story begins here.</p>
            <Button asChild className="mt-6 bg-gold text-primary-foreground hover:bg-gold-soft">
              <Link to="/write">Write the first novel</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {novels.map((n) => <NovelCard key={n.id} novel={n} />)}
          </div>
        )}
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        Lumen · Made for storytellers
      </footer>
    </div>
  );
}
