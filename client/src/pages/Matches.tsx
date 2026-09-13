import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { api } from "@/lib/api";
import { DISCIPLINE_LABELS, CATEGORY_LABELS } from "@/lib/constants";

interface Match {
  id: number;
  tournamentName: string;
  title: string;
  discipline: string;
  date: string;
  time: string;
  venue?: string | null;
  city?: string | null;
  category?: string | null;
  teamA: string;
  teamB: string;
  scoreA?: number | null;
  scoreB?: number | null;
  description?: string | null;
  status: string;
  registrationReleased: boolean;
}

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState("UPCOMING");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api.get<{ matches: Match[] }>(`/matches?status=${filter}`).then((res) => setMatches(res.matches)).finally(() => setLoading(false));
  }, [filter]);
  return (
    <PublicLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div><h1 className="heading-display text-2xl font-bold">Matches & Events</h1><p className="text-sm text-muted-foreground mt-1">Official fixtures and results published by DDABA.</p></div>
        <select className="border border-border rounded-lg px-3 py-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}><option>UPCOMING</option><option>LIVE</option><option>COMPLETED</option><option>CANCELLED</option></select>
      </div>
      {loading ? <div className="glass-card p-10 text-center text-sm text-muted-foreground">Loading matches...</div> : matches.length === 0 ? <div className="glass-card p-10 text-center text-sm text-muted-foreground">No matches published for this status.</div> : <div className="grid md:grid-cols-2 gap-4">{matches.map((m) => <div key={m.id} className="glass-card p-5">
        <div className="flex items-start justify-between gap-3"><div><span className="text-xs text-primary uppercase">{m.tournamentName}</span><h2 className="font-bold mt-1">{m.title}</h2></div><span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">{m.status}</span></div>
        <p className="text-sm font-semibold mt-4">{m.teamA} <span className="text-muted-foreground mx-2">vs</span> {m.teamB}</p>
        {m.status === "COMPLETED" && <p className="text-xl font-bold text-saffron mt-1">{m.scoreA ?? 0} - {m.scoreB ?? 0}</p>}
        <div className="grid sm:grid-cols-2 gap-2 mt-4 text-xs text-muted-foreground"><span className="flex gap-1.5 items-center"><CalendarDays className="h-3.5 w-3.5" />{m.date} · {m.time}</span><span className="flex gap-1.5 items-center"><MapPin className="h-3.5 w-3.5" />{m.venue || m.city || "Venue TBA"}</span></div>
        <p className="text-xs text-muted-foreground mt-2">{DISCIPLINE_LABELS[m.discipline] || m.discipline}{m.category ? ` · ${CATEGORY_LABELS[m.category] || m.category}` : ""}</p>
        {m.description && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line">{m.description}</p>}
        {m.registrationReleased && m.status === "UPCOMING" && <Link to={`/matches/${m.id}/register`} className="inline-block mt-4 text-xs bg-primary text-primary-foreground rounded-lg px-3 py-2">Register for this match</Link>}
      </div>)}</div>}
    </PublicLayout>
  );
}
