import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { slugify } from "@/lib/novels";
import { LANGUAGES } from "@/lib/languages";

const ADMIN_UID = "08c0f03e-64ca-482b-9234-d1137355e9b1"; // 👈 same UID as write.index

const GENRES = ["Fantasy", "Sci-Fi", "Romance", "Mystery", "Horror", "Literary", "Slice of Life"];
const STATUSES = ["ongoing", "completed", "hiatus"] as const;

function NewNovel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.id === ADMIN_UID;

  // Kick non-admins back to browse immediately
  useEffect(() => {
    if (user && !isAdmin) {
      toast.error("You don't have permission to do that.");
      navigate({ to: "/browse" });
    }
  }, [user, isAdmin]);

  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [cover, setCover] = useState("");
  const [status, setStatus] = useState<typeof STATUSES[number]>("ongoing");
  const [isDual, setIsDual] = useState(false);
  const [origLang, setOrigLang] = useState<string>(LANGUAGES[0]);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isAdmin) return; // double-safety
    setLoading(true);
    const { data, error } = await supabase.from("novels").insert({
      author_id: user.id,
      title, synopsis, genre, status,
      cover_url: cover || null,
      slug: slugify(title),
      is_dual_language: isDual,
      original_language: isDual ? origLang : null,
    }).select("id").single();
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Novel created");
    navigate({ to: "/write/$novelId", params: { novelId: data.id } });
  }

  if (!isAdmin) return null; // prevent flash of the form while redirect happens

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-4xl text-parchment">New novel</h1>
        <p className="mt-2 text-muted-foreground">Set the stage. You can edit these details anytime.</p>

        <form onSubmit={submit} className="mt-10 space-y-5">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={e => setTitle(e.target.value)} className="bg-background mt-1.5" />
          </div>
          <div>
            <Label htmlFor="synopsis">Synopsis</Label>
            <textarea
              id="synopsis" rows={5} required value={synopsis} onChange={e => setSynopsis(e.target.value)}
              className="w-full mt-1.5 rounded-md bg-background border border-border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="genre">Genre</Label>
              <select id="genre" value={genre} onChange={e => setGenre(e.target.value)} className="w-full mt-1.5 rounded-md bg-background border border-border px-3 py-2 text-sm">
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" value={status} onChange={e => setStatus(e.target.value as any)} className="w-full mt-1.5 rounded-md bg-background border border-border px-3 py-2 text-sm">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="cover">Cover image URL (optional)</Label>
            <Input id="cover" type="url" placeholder="https://..." value={cover} onChange={e => setCover(e.target.value)} className="bg-background mt-1.5" />
          </div>

          <fieldset className="rounded-md border border-border/60 bg-card/40 p-4">
            <legend className="px-2 text-xs uppercase tracking-wider text-gold/80">Translation</legend>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="dual" checked={!isDual} onChange={() => setIsDual(false)} className="mt-1" />
                <span><span className="text-parchment">Single language</span><span className="block text-xs text-muted-foreground">One version of each chapter.</span></span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="dual" checked={isDual} onChange={() => setIsDual(true)} className="mt-1" />
                <span><span className="text-parchment">Dual language</span><span className="block text-xs text-muted-foreground">Each chapter has an original-language version plus an English translation.</span></span>
              </label>
            </div>
            {isDual && (
              <div className="mt-3">
                <Label htmlFor="origLang">Original language</Label>
                <select id="origLang" value={origLang} onChange={e => setOrigLang(e.target.value)} className="w-full mt-1.5 rounded-md bg-background border border-border px-3 py-2 text-sm">
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            )}
          </fieldset>

          <Button type="submit" disabled={loading} className="bg-gold text-primary-foreground hover:bg-gold-soft">
            {loading ? "Creating..." : "Create novel"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export { NewNovel as default };