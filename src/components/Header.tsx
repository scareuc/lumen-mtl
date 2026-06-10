import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Library, PenLine, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const ADMIN_UID = "08c0f03e-64ca-482b-9234-d1137355e9b1"; // 👈 same UID as the other files

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.id === ADMIN_UID;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <BookOpen className="h-5 w-5 text-gold" />
          <span className="font-display text-2xl tracking-tight text-parchment group-hover:text-gold transition-colors">
            Lumen
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link to="/browse" className="hover:text-gold transition-colors" activeProps={{ className: "text-gold" }}>
            Browse
          </Link>
          {user && (
            <Link to="/library" className="hover:text-gold transition-colors" activeProps={{ className: "text-gold" }}>
              Library
            </Link>
          )}
          {isAdmin && ( // 👈 was {user &&
            <Link to="/write" className="hover:text-gold transition-colors" activeProps={{ className: "text-gold" }}>
              Write
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild className="md:hidden">
                <Link to="/library"><Library className="h-4 w-4" /></Link>
              </Button>
              {isAdmin && ( // 👈 was no guard
                <Button variant="ghost" size="sm" asChild className="md:hidden">
                  <Link to="/write"><PenLine className="h-4 w-4" /></Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" asChild className="border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">
              <Link to="/auth"><UserIcon className="h-4 w-4 mr-2" />Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}