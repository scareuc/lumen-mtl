import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Plus, BookOpen } from "lucide-react";

const ADMIN_UID = "08c0f03e-64ca-482b-9234-d1137355e9b1"; // 👈 same UID you used in the SQL policy

export const Route = createFileRoute("/_authenticated/write/")({
  head: () => ({ meta: [{ title: "Author dashboard — Lumen" }] }),
  component: WriteDashboard,
});

function WriteDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.id === ADMIN_UID; // 👈 true only for you

  const { data: novels = [] } = useQuery({
    enabled: !!user,
    queryKey: ["my-novels", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("novels").select("id, title, status, genre, created_at, cover_url")
        .eq("author_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl text-parchment">Your novels</h1>
            <p className="mt-2 text-muted-foreground">Drafts, works in progress, finished tales.</p>
          </div>
          {isAdmin && ( // 👈 only you see this button
            <Button asChild className="bg-gold text-primary-foreground hover:bg-gold-soft">
              <Link to="/write/new"><Plus className="h-4 w-4 mr-2" />New novel</Link>
            </Button>
          )}
        </div>

        <div className="mt-10 space-y-3">
          {novels.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-gold/60" />
              <p className="mt-3 font-display text-2xl text-parchment">No novels yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Start your first work and publish chapters as you go.</p>
              {isAdmin && ( // 👈 only you see this button too
                <Button asChild className="mt-6 bg-gold text-primary-foreground hover:bg-gold-soft">
                  <Link to="/write/new">Create your first novel</Link>
                </Button>
              )}
            </div>
          ) : novels.map((n) => (
            <Link
              key={n.id}
              to="/write/$novelId"
              params={{ novelId: n.id }}
              className="flex items-center gap-4 rounded-lg border border-border/60 bg-card/60 p-4 hover:border-gold/40 transition-colors"
            >
              <div className="h-16 w-12 rounded bg-secondary overflow-hidden flex-shrink-0">
                {n.cover_url && <img src={n.cover_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1">
                <p className="font-display text-xl text-parchment">{n.title}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mt-0.5">{n.genre ?? "—"} · {n.status}</p>
              </div>
              <span className="text-xs text-gold">Manage →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}