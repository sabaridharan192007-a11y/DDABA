import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { Users2, Trophy, Target } from "lucide-react";
import { DISCIPLINES, DISCIPLINE_LABELS, CATEGORY_LABELS } from "@/lib/constants";

interface Player { id: number; fullName: string; playerId: string; club?: string; category?: string; area?: string; profileImage?: string; }
interface Stats { matchesPlayed: number; wins: number; losses: number; goals: number; assists: number; awards: number; }
interface Achievement { id: number; title: string; tournament?: string; year?: number; medal?: string; description?: string; }
interface PointsEntry { id: number; points: number; discipline: string; category: string; year: number; matchTitle: string; tournamentName: string; matchDate: string; }

export default function PlayerProfilePublic() {
  const { id } = useParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PointsEntry[]>([]);
  const [disciplineFilter, setDisciplineFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<{ player: Player; stats: Stats }>(`/players/${id}`),
      api.get<{ achievements: Achievement[] }>(`/achievements?playerId=${id}`),
    ])
      .then(([p, a]) => { setPlayer(p.player); setStats(p.stats); setAchievements(a.achievements); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const params = disciplineFilter ? `?discipline=${disciplineFilter}` : "";
    api.get<{ history: PointsEntry[] }>(`/points/player/${id}${params}`).then((r) => setPointsHistory(r.history));
  }, [id, disciplineFilter]);

  const totalByDiscipline = DISCIPLINES.map((d) => ({
    discipline: d,
    total: pointsHistory.filter((h) => h.discipline === d).reduce((sum, h) => sum + h.points, 0),
  }));

  if (loading) return <PublicLayout><div className="glass-card p-10 text-center text-sm text-muted-foreground">Loading player profile...</div></PublicLayout>;
  if (!player) return <PublicLayout><div className="glass-card p-10 text-center text-sm text-muted-foreground">Player not found</div></PublicLayout>;

  return (
    <PublicLayout>
      <div className="glass-card glow-border p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-8">
        <div className="h-28 w-28 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
          {player.profileImage ? <img src={player.profileImage} className="h-full w-full object-cover" /> : <Users2 className="h-12 w-12 text-primary" />}
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-navy">{player.fullName}</h1>
          <p className="text-saffron font-semibold">{player.playerId}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-muted-foreground justify-center sm:justify-start">
            <span>Club / School / College: {player.club || "—"}</span>
            <span>Category: {player.category ? CATEGORY_LABELS[player.category] : "—"}</span>
            <span>Area: {player.area || "—"}</span>
          </div>
        </div>
      </div>

      <h2 className="heading-display text-sm font-bold tracking-wide text-muted-foreground mb-3 uppercase">Career Statistics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Matches" value={stats?.matchesPlayed ?? 0} icon={Target} />
        <StatCard label="Wins" value={stats?.wins ?? 0} icon={Trophy} />
        <StatCard label="Goals" value={stats?.goals ?? 0} icon={Target} />
        <StatCard label="Assists" value={stats?.assists ?? 0} icon={Target} />
      </div>

      <h2 className="heading-display text-sm font-bold tracking-wide text-muted-foreground mb-3 uppercase">Points by Discipline</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {totalByDiscipline.map((d) => (
          <div key={d.discipline} className="glass-card p-3 text-center">
            <p className="text-[11px] text-muted-foreground uppercase">{DISCIPLINE_LABELS[d.discipline]}</p>
            <p className="text-lg font-bold text-saffron">{d.total}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="heading-display text-sm font-bold tracking-wide text-muted-foreground uppercase">Match-by-Match Points</h2>
        <input list="profile-discipline-options" className="border border-border rounded-lg px-3 py-1.5 text-xs" placeholder="Discipline" value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)} />
        <datalist id="profile-discipline-options">
          {DISCIPLINES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>)}
        </datalist>
      </div>
      {pointsHistory.length === 0 ? (
        <div className="glass-card p-6 text-center text-sm text-muted-foreground mb-8">No match points recorded yet</div>
      ) : (
        <div className="glass-card overflow-x-auto mb-8">
          <table className="w-full text-sm min-w-[560px]">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="p-3">Tournament</th><th className="p-3">Match</th><th className="p-3">Discipline</th><th className="p-3">Date</th><th className="p-3">Points</th>
            </tr></thead>
            <tbody>
              {pointsHistory.map((h) => (
                <tr key={h.id} className="border-b border-border/60">
                  <td className="p-3">{h.tournamentName}</td>
                  <td className="p-3">{h.matchTitle}</td>
                  <td className="p-3">{DISCIPLINE_LABELS[h.discipline]}</td>
                  <td className="p-3">{h.matchDate}</td>
                  <td className="p-3 font-bold text-saffron">{h.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="heading-display text-sm font-bold tracking-wide text-muted-foreground mb-3 uppercase">Achievements</h2>
      {achievements.length === 0 ? (
        <div className="glass-card p-6 text-center text-sm text-muted-foreground">No achievements available</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {achievements.map((a) => (
            <div key={a.id} className="glass-card p-4 flex gap-3 items-start">
              <Trophy className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.tournament} · {a.year} · {a.medal}</p>
                {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </PublicLayout>
  );
}
