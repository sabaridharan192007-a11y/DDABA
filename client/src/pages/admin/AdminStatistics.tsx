import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DISCIPLINES, DISCIPLINE_LABELS } from "@/lib/constants";

interface RankingRow { fullName: string; totalPoints: number; }
interface Achievement { type: string; }

const COLORS = ["#FF6A00", "#128A3E", "#0A2540", "#F5B400"];
const CURRENT_YEAR = new Date().getFullYear();

export default function AdminStatistics() {
  const [discipline, setDiscipline] = useState<string>(DISCIPLINES[0]);
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [achievementDist, setAchievementDist] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    api
      .get<{ rankings: RankingRow[] }>(`/rankings?discipline=${discipline}&year=${CURRENT_YEAR}`)
      .then((res) => setRows(res.rankings.slice(0, 8)));
  }, [discipline]);

  useEffect(() => {
    api.get<{ achievements: Achievement[] }>("/achievements").then((res) => {
      const counts: Record<string, number> = {};
      res.achievements.forEach((a) => { counts[a.type] = (counts[a.type] || 0) + 1; });
      setAchievementDist(Object.entries(counts).map(([name, value]) => ({ name, value })));
    });
  }, []);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="heading-display text-2xl font-bold">Statistics</h1>
        <input list="stats-discipline-options" className="input-admin" placeholder="Discipline" value={discipline} onChange={(e) => setDiscipline(e.target.value)} />
        <datalist id="stats-discipline-options">
          {DISCIPLINES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>)}
        </datalist>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 h-80">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">
            Top Points — {DISCIPLINE_LABELS[discipline]} ({CURRENT_YEAR})
          </h3>
          {rows.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No ranked players yet for this discipline/year.</div>
          ) : (
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={rows}>
                <XAxis dataKey="fullName" tick={{ fontSize: 10, fill: "#6B7280" }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E6E3DA" }} />
                <Bar dataKey="totalPoints" fill="#FF6A00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5 h-80">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Achievement Distribution</h3>
          {achievementDist.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No achievements recorded yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={achievementDist} dataKey="value" nameKey="name" outerRadius={90} label>
                  {achievementDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E6E3DA" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <style>{`.input-admin{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;}`}</style>
    </AdminLayout>
  );
}
