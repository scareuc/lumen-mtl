import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { NovelCard } from "@/components/NovelCard";
import { Input } from "@/components/ui/input";
import { fetchNovels } from "@/lib/novels";
import { Search } from "lucide-react";

const GENRES = ["All", "Fantasy", "Sci-Fi", "Romance", "Mystery", "Horror", "Literary", "Slice of Life"];

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse novels — Lumen" },
      { name: "description", content: "Browse the full catalog of webnovels on Lumen." },
    ],
  }),
  component: Browse,
});

function Browse() {
  const [genre, setGenre] = useState("All");
  const [q, setQ] = useState("");
  const { data: novels = [], isLoading } = useQuery({
    queryKey: ["novels", "browse", genre, q],
    queryFn: () => fetchNovels({ genre: genre === "All" ? undefined : genre, q: q || undefined, limit: 60 }),
  });

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="font-display text-4xl text-parchment">Browse the library</h1>
        <p className="mt-2 text-muted-foreground">Find your next late-night read.</p>

        <div className="mt-8 flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider transition-colors ${
                  genre === g
                    ? "bg-gold text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:border-gold/40 hover:text-gold"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : novels.length === 0 ? (
            <p className="text-muted-foreground">No novels found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {novels.map((n) => <NovelCard key={n.id} novel={n} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
