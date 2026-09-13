import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { api } from "@/lib/api";
import { DISCIPLINES, DISCIPLINE_LABELS, CATEGORIES, CATEGORY_LABELS, AREAS } from "@/lib/constants";

interface Row {
  playerId: number; fullName: string; playerCode: string; club?: string; area?: string; category?: string;
  totalPoints: number; matchesCounted: number;
}

const YEARS = [2026, 2025, 2024];

export default function Rankings() {
  const [discipline, setDiscipline] = useState<string>(DISCIPLINES[0]);
  const [year, setYear] = useState<number>(YEARS[0]);
  const [area, setArea] = useState<string>(""); // "" = all areas (district-wide)
  const [category, setCategory] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ discipline, year: String(year) });
    if (area) params.set("area", area);
    if (category) params.set("category", category);
    api
      .get<{ rankings: Row[] }>(`/rankings?${params}`)
      .then((r) => setRows(r.rankings))
      .finally(() => setLoading(false));
  }, [discipline, year, area, category]);

  const topThree = rows.slice(0, 3);

  return (
    <PublicLayout>
      <div className="mb-6">
        <h1 className="heading-display text-2xl font-bold text-navy">Dindigul District Player Rankings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rankings calculated from official match statistics and points entered by authorized administrators.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <input list="ranking-discipline-options" className="border border-border rounded-lg px-3 py-2 text-sm font-medium text-navy bg-white" placeholder="Discipline" value={discipline} onChange={(e) => setDiscipline(e.target.value)} />
        <datalist id="ranking-discipline-options">
          {DISCIPLINES.map((d) => <option key={d} value={d}>Discipline: {DISCIPLINE_LABELS[d]}</option>)}
        </datalist>
        <select className="border border-border rounded-lg px-3 py-2 text-sm font-medium text-navy bg-white" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {YEARS.map((y) => <option key={y} value={y}>Year: {y}</option>)}
        </select>
        <input list="ranking-area-options" className="border border-border rounded-lg px-3 py-2 text-sm font-medium text-navy bg-white" placeholder="Area (optional)" value={area} onChange={(e) => setArea(e.target.value)} />
        <datalist id="ranking-area-options">
          {AREAS.map((a) => <option key={a} value={a}>Area: {a}</option>)}
        </datalist>
        <input list="ranking-category-options" className="border border-border rounded-lg px-3 py-2 text-sm font-medium text-navy bg-white" placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} />
        <datalist id="ranking-category-options">
          {CATEGORIES.map((c) => <option key={c} value={c}>Category: {CATEGORY_LABELS[c]}</option>)}
        </datalist>
      </div>

      <p className="text-xs text-muted-foreground -mt-4 mb-8">
        Rankings are calculated separately per discipline — a player's Aeroskatoball ranking is independent of their Speed or Huddles ranking. Never hardcoded, always derived from stored match points.
      </p>

      {loading ? (
        <div className="card p-10 text-center text-sm text-muted-foreground">Loading rankings...</div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted-foreground">
          No ranked players found for this discipline, year, area, and category.
        </div>
      ) : (
        <>
          {topThree.length === 3 && (
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[topThree[1], topThree[0], topThree[2]].map((r, i) => {
                const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
                const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
                return (
                  <Link
                    key={r.playerId}
                    to={`/players/${r.playerId}`}
                    className={`card p-5 text-center ${rank === 1 ? "border-t-4 border-t-warning sm:scale-105" : rank === 2 ? "border-t-4 border-t-slate-300" : "border-t-4 border-t-amber-700"}`}
                  >
                    <div className="text-2xl">{medal}</div>
                    <p className="font-bold text-navy mt-1">{r.fullName}</p>
                    <p className="text-xs text-muted-foreground">{r.club}</p>
                    <p className="text-saffron text-xl font-extrabold mt-2">{r.totalPoints} pts</p>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="p-3">Rank</th><th className="p-3">Player</th><th className="p-3">Area</th>
                  <th className="p-3">Club / School / College</th><th className="p-3">Matches</th><th className="p-3">Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.playerId} className="border-b border-border/60 hover:bg-muted">
                    <td className="p-3 font-bold text-navy">{i + 1}</td>
                    <td className="p-3"><Link to={`/players/${r.playerId}`} className="hover:text-saffron">{r.fullName}</Link></td>
                    <td className="p-3">{r.area || "—"}</td>
                    <td className="p-3">{r.club || "—"}</td>
                    <td className="p-3">{r.matchesCounted}</td>
                    <td className="p-3 text-saffron font-bold">{r.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PublicLayout>
  );
}
