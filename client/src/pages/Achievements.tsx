import { useEffect, useState } from "react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { api } from "@/lib/api";
import { Trophy } from "lucide-react";

interface Achievement {
  id: number;
  title: string;
  description?: string | null;
  tournament?: string | null;
  year?: number | null;
  type: string;
  medal?: string | null;
  image?: string | null;
  playerId?: number | null;
}

export default function Achievements() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get<{ achievements: Achievement[] }>("/achievements").then((res) => setItems(res.achievements)).finally(() => setLoading(false));
  }, []);
  return (
    <PublicLayout>
      <div className="mb-6"><h1 className="heading-display text-2xl font-bold">Achievements</h1><p className="text-sm text-muted-foreground mt-1">Celebrating DDABA players, clubs, and association milestones.</p></div>
      {loading ? <div className="glass-card p-10 text-center text-sm text-muted-foreground">Loading achievements...</div> : items.length === 0 ? <div className="glass-card p-10 text-center text-sm text-muted-foreground">No achievements published yet.</div> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{items.map((a) => <article key={a.id} className="glass-card overflow-hidden">{a.image && <img src={a.image} alt="" className="w-full h-40 object-cover" />}<div className="p-5"><div className="flex items-center justify-between"><Trophy className="h-5 w-5 text-warning" /><span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">{a.type}</span></div><h2 className="font-bold mt-3">{a.title}</h2><p className="text-xs text-muted-foreground mt-1">{a.tournament || "DDABA Association"} · {a.year || "—"}{a.medal ? ` · ${a.medal}` : ""}</p>{a.description && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line">{a.description}</p>}</div></article>)}</div>}
    </PublicLayout>
  );
}
