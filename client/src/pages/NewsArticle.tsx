import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

interface Article { id: number; title: string; content: string; image?: string | null; videoUrl?: string | null; author?: string; category: string; publishedAt?: string; }

export default function NewsArticle() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get<{ article: Article }>(`/news/${id}`).then((r) => setArticle(r.article)).finally(() => setLoading(false));
  }, [id]);

  return (
    <PublicLayout>
      <Link to="/news" className="inline-flex items-center gap-2 text-sm text-primary mb-6"><ArrowLeft className="h-4 w-4" /> Back to News</Link>
      {loading ? (
        <div className="glass-card p-10 text-center text-sm text-muted-foreground">Loading article...</div>
      ) : !article ? (
        <div className="glass-card p-10 text-center text-sm text-muted-foreground">Article not found</div>
      ) : (
        <article className="glass-card p-6 sm:p-8">
          <span className="text-xs text-primary uppercase tracking-wide">{article.category}</span>
          <h1 className="text-2xl font-bold mt-2 mb-2">{article.title}</h1>
          <p className="text-xs text-muted-foreground mb-6">By {article.author || "DDABA Media Team"}</p>
          {article.image && <img src={article.image} alt="" className="w-full max-h-[28rem] object-cover rounded-xl mb-6" />}
          {article.videoUrl && (
            <div className="mb-6">
              <video controls className="w-full max-h-[28rem] rounded-xl bg-black" src={article.videoUrl}>
                Your browser does not support embedded video.
              </video>
              <a href={article.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline mt-2 inline-block">Open video in a new tab</a>
            </div>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{article.content}</p>
        </article>
      )}
    </PublicLayout>
  );
}
