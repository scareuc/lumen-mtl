import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";

export interface NovelCardData {
  id: string;
  title: string;
  synopsis: string | null;
  cover_url: string | null;
  genre: string | null;
  status: string;
  avg_rating?: number | null;
  rating_count?: number;
  chapter_count?: number;
}

export function NovelCard({ novel }: { novel: NovelCardData }) {
  return (
    <Link
      to="/novel/$id"
      params={{ id: novel.id }}
      className="group block rounded-lg border border-border/60 bg-card/60 overflow-hidden hover:border-gold/50 transition-all hover:-translate-y-0.5"
    >
      <div className="aspect-[3/4] w-full overflow-hidden bg-secondary relative">
        {novel.cover_url ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img
            src={novel.cover_url}
            alt={novel.title}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center p-4 bg-gradient-to-br from-secondary to-card">
            <span className="font-display text-xl text-gold/70 text-center leading-tight">{novel.title}</span>
          </div>
        )}
        <div className="absolute top-2 right-2 rounded-sm bg-background/80 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold backdrop-blur">
          {novel.status}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg leading-tight text-parchment line-clamp-2 group-hover:text-gold transition-colors">
          {novel.title}
        </h3>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {novel.genre && <span>{novel.genre}</span>}
          {typeof novel.avg_rating === "number" && novel.avg_rating > 0 && (
            <span className="flex items-center gap-1 text-gold">
              <Star className="h-3 w-3 fill-current" />
              {novel.avg_rating.toFixed(1)}
            </span>
          )}
          {typeof novel.chapter_count === "number" && (
            <span>{novel.chapter_count} ch</span>
          )}
        </div>
        {novel.synopsis && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{novel.synopsis}</p>
        )}
      </div>
    </Link>
  );
}
