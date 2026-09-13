import { useEffect, useState } from "react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { api } from "@/lib/api";
import { Megaphone } from "lucide-react";

interface Announcement { id: number; title: string; description: string; priority: string; createdAt?: string; }

const priorityStyles: Record<string, string> = {
  URGENT: "bg-danger/15 text-danger border-danger/30",
  IMPORTANT: "bg-warning/15 text-warning border-warning/30",
  NORMAL: "bg-white/10 text-muted-foreground border-white/10",
};

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ announcements: Announcement[] }>("/announcements").then((r) => setItems(r.announcements)).finally(() => setLoading(false));
  }, []);

  const sorted = [...items].sort((a, b) => {
    const order = { URGENT: 0, IMPORTANT: 1, NORMAL: 2 };
    return (order[a.priority as keyof typeof order] ?? 3) - (order[b.priority as keyof typeof order] ?? 3);
  });

  return (
    <PublicLayout>
      <h1 className="heading-display text-2xl font-bold mb-6">Announcements</h1>
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-muted-foreground">No announcements available</div>
      ) : (
        <div className="space-y-4">
          {sorted.map((a) => (
            <div key={a.id} className={`glass-card p-5 border ${priorityStyles[a.priority] || ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="h-4 w-4" />
                <span className="font-semibold">{a.title}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${priorityStyles[a.priority]}`}>{a.priority}</span>
              </div>
              <p className="text-sm text-muted-foreground">{a.description}</p>
            </div>
          ))}
        </div>
      )}
    </PublicLayout>
  );
}
