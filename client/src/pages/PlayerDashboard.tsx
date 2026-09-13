import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Target, Award, Users2 } from "lucide-react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { DISCIPLINE_LABELS, REGISTRATION_STATUS_LABELS, CATEGORY_LABELS } from "@/lib/constants";

interface Stats {
  matchesPlayed: number; wins: number; losses: number; goals: number; assists: number; awards: number;
}
interface Match {
  id: number; tournamentName: string; title: string; date: string; time: string; venue: string;
  status: string; teamA: string; teamB: string; registrationReleased: boolean;
}
interface Achievement { id: number; title: string; tournament: string; year: number; medal: string; }
interface Announcement { id: number; title: string; description: string; priority: string; }
interface Participation {
  id: number; matchId: number; matchTitle: string; tournamentName: string; matchDate: string;
  disciplines: string[]; registrationStatus: "PENDING" | "VERIFIED" | "REJECTED"; decisionNote?: string | null; createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  VERIFIED: "bg-success/15 text-success",
  REJECTED: "bg-danger/15 text-danger",
};

export default function PlayerDashboard() {
  const { player } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [participation, setParticipation] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player) return;
    Promise.all([
      api.get<{ stats: Stats }>(`/players/${player.id}/stats`).catch(() => ({ stats: null })),
      api.get<{ matches: Match[] }>("/matches?status=UPCOMING"),
      api.get<{ achievements: Achievement[] }>(`/achievements?playerId=${player.id}`),
      api.get<{ announcements: Announcement[] }>("/announcements"),
      api.get<{ registrations: Participation[] }>("/match-registrations/mine"),
    ])
      .then(([s, m, a, an, p]) => {
        setStats(s.stats);
        setMatches(m.matches.slice(0, 4));
        setAchievements(a.achievements.slice(0, 4));
        setAnnouncements(an.announcements.slice(0, 3));
        setParticipation(p.registrations);
      })
      .finally(() => setLoading(false));
  }, [player]);

  if (!player) return null;

  return (
    <PublicLayout>
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 flex flex-col items-center text-center lg:col-span-1">
          <div className="h-24 w-24 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden mb-4">
            {player.profileImage ? (
              <img src={player.profileImage} alt={player.fullName} className="h-full w-full object-cover" />
            ) : (
              <Users2 className="h-10 w-10 text-primary" />
            )}
          </div>
          <h2 className="text-xl font-bold">{player.fullName}</h2>
          <p className="text-primary text-sm">{player.playerId}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 w-full text-left text-sm">
            <InfoRow label="Club / School / College" value={player.club} />
            <InfoRow label="Category" value={player.category ? CATEGORY_LABELS[player.category] || player.category : undefined} />
            <InfoRow label="Area" value={player.area} />
          </div>
        </motion.div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Matches" value={stats?.matchesPlayed ?? 0} icon={Target} />
            <StatCard label="Wins" value={stats?.wins ?? 0} icon={Trophy} />
            <StatCard label="Goals" value={stats?.goals ?? 0} icon={Award} />
            <StatCard label="Awards" value={stats?.awards ?? 0} icon={Trophy} />
          </div>

          <Section title="Upcoming Matches" empty="No upcoming matches" loading={loading} items={matches}>
            {matches.map((m) => (
              <div key={m.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.tournamentName} · {m.venue}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-primary">{m.date} · {m.time}</span>
                  {m.registrationReleased && (
                    <Link to={`/matches/${m.id}/register`} className="text-xs bg-saffron text-white px-3 py-1.5 rounded-lg font-semibold uppercase">
                      Register
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </Section>

          <Section title="Recent Participation" empty="No match registrations yet" loading={loading} items={participation}>
            {participation.map((p) => (
              <div key={p.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{p.matchTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.tournamentName} · {p.matchDate} · {p.disciplines.map((d) => DISCIPLINE_LABELS[d] || d).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[p.registrationStatus]}`}>
                    {REGISTRATION_STATUS_LABELS[p.registrationStatus]}
                  </span>
                </div>
                {p.decisionNote && <p className="text-xs text-muted-foreground mt-2">Admin note: {p.decisionNote}</p>}
              </div>
            ))}
          </Section>

          <Section title="Achievements" empty="No achievements available" loading={loading} items={achievements}>
            <div className="grid sm:grid-cols-2 gap-3">
              {achievements.map((a) => (
                <div key={a.id} className="glass-card p-4">
                  <p className="font-semibold text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.tournament} · {a.year} · {a.medal}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Announcements" empty="No announcements available" loading={loading} items={announcements}>
            {announcements.map((a) => (
              <div key={a.id} className="glass-card p-4">
                <p className="font-semibold text-sm">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
              </div>
            ))}
          </Section>
        </div>
      </div>
    </PublicLayout>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

function Section({ title, empty, loading, items, children }: { title: string; empty: string; loading: boolean; items: any[]; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="heading-display text-sm font-bold tracking-wide text-muted-foreground mb-3 uppercase">{title}</h3>
      {loading ? (
        <div className="glass-card p-4 animate-pulse h-16" />
      ) : items.length === 0 ? (
        <div className="glass-card p-4 text-sm text-muted-foreground text-center">{empty}</div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  );
}
