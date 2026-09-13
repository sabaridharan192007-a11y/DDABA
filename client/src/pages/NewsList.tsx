import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { api } from "@/lib/api";

interface NewsItem { id: number; title: string; summary: string; category: string; image?: string | null; videoUrl?: string | null; publishedAt?: string; }

export default function NewsList() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ news: NewsItem[] }>("/news").then((r) => setNews(r.news)).finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <h1 className="heading-display text-2xl font-bold mb-6">News</h1>
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-40 animate-pulse" />)}
        </div>
      ) : news.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-muted-foreground">No news published yet</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {news.map((n) => (
            <Link key={n.id} to={`/news/${n.id}`} className="glass-card p-5 hover:border-primary/40 transition-colors block">
              {n.image && <img src={n.image} alt="" className="w-full h-36 object-cover rounded-xl mb-3" />}
              <span className="text-xs text-primary uppercase tracking-wide">{n.category}</span>
              <h3 className="font-semibold mt-2">{n.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{n.summary}</p>
              {n.videoUrl && <span className="text-xs text-primary mt-2 inline-block">▶ Includes video</span>}
            </Link>
          ))}
        </div>
      )}
    </PublicLayout>
  );
}
