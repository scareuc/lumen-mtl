import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { NovelCard } from "@/components/NovelCard";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "My library — Lumen" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user } = useAuth();
  const { data: novels = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["library-novels", user?.id],
    queryFn: async () => {
      const { data: lib } = await supabase.from("library").select("novel_id").eq("user_id", user!.id);
      const ids = (lib ?? []).map(l => l.novel_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("novels").select("id, title, synopsis, cover_url, genre, status").in("id", ids);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="font-display text-4xl text-parchment">Your library</h1>
        <p className="mt-2 text-muted-foreground">Novels you've saved for later.</p>

        <div className="mt-10">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : novels.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-12 text-center">
              <p className="font-display text-2xl text-parchment">Your shelves are empty.</p>
              <Button asChild className="mt-4 bg-gold text-primary-foreground hover:bg-gold-soft">
                <Link to="/browse">Browse novels</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {novels.map((n) => <NovelCard key={n.id} novel={n as any} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
