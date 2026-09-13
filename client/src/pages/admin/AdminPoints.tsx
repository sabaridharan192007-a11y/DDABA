import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { api } from "@/lib/api";
import { Loader2, Trash2 } from "lucide-react";
import { DISCIPLINES, DISCIPLINE_LABELS, CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";

interface PlayerOption { id: number; fullName: string; playerId: string; }
interface MatchOption { id: number; title: string; tournamentName: string; discipline: string; }
interface RecentEntry {
  id: number; points: number; discipline: string; category: string; year: number;
  playerName: string; playerCode: string; matchTitle: string; createdAt: string;
}

export default function AdminPoints() {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    playerId: "", matchId: "", discipline: DISCIPLINES[0] as string, category: CATEGORIES[0] as string, points: "",
  });

  useEffect(() => {
    api.get<{ players: PlayerOption[] }>("/players?pageSize=100").then((r) => setPlayers(r.players));
    api.get<{ matches: MatchOption[] }>("/matches").then((r) => setMatches(r.matches));
    loadRecent();
  }, []);

  async function loadRecent() {
    const r = await api.get<{ entries: RecentEntry[] }>("/points/recent");
    setRecent(r.entries);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!form.playerId || !form.matchId || !form.points) {
      setMessage("Please complete all fields.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/points", {
        playerId: Number(form.playerId),
        matchId: Number(form.matchId),
        discipline: form.discipline,
        category: form.category,
        points: Number(form.points),
      });
      setMessage("Points saved successfully.");
      setForm({ ...form, points: "" });
      loadRecent();
    } catch {
      setMessage("Unable to save points right now.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Remove this points entry? Public rankings will update immediately.")) return;
    await api.delete(`/points/${id}`);
    loadRecent();
  }

  return (
    <AdminLayout>
      <h1 className="heading-display text-2xl font-bold mb-6">Match Points Entry</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Points are tied to one player, one match, and one discipline. A player's ranking is the sum of all their
        entries for that discipline and year — this feeds the public Rankings page directly.
      </p>

      <form onSubmit={save} className="glass-card p-5 mb-8 grid sm:grid-cols-2 gap-3">
        <select required className="input-admin" value={form.playerId} onChange={(e) => setForm({ ...form, playerId: e.target.value })}>
          <option value="">Select Player</option>
          {players.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.playerId})</option>)}
        </select>
        <select required className="input-admin" value={form.matchId} onChange={(e) => setForm({ ...form, matchId: e.target.value })}>
          <option value="">Select Match</option>
          {matches.map((m) => <option key={m.id} value={m.id}>{m.title} — {m.tournamentName}</option>)}
        </select>
        <input list="points-discipline-options" required className="input-admin" placeholder="Discipline" value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} />
        <datalist id="points-discipline-options">
          {DISCIPLINES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>)}
        </datalist>
        <input list="points-category-options" required className="input-admin" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <datalist id="points-category-options">
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </datalist>
        <input required type="number" min={0} placeholder="Points Awarded" className="input-admin" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Points Entry
        </button>
        {message && <p className="sm:col-span-2 text-sm text-muted-foreground">{message}</p>}
      </form>

      <h2 className="heading-display text-sm font-bold tracking-wide text-muted-foreground mb-3 uppercase">Recent Entries</h2>
      <div className="glass-card overflow-x-auto">
        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No entries yet.</div>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="p-3">Player</th><th className="p-3">Discipline</th><th className="p-3">Match</th><th className="p-3">Points</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className="p-3">{e.playerName}<div className="text-xs text-primary">{e.playerCode}</div></td>
                  <td className="p-3">{DISCIPLINE_LABELS[e.discipline] || e.discipline}</td>
                  <td className="p-3">{e.matchTitle}</td>
                  <td className="p-3 font-bold">{e.points}</td>
                  <td className="p-3"><button onClick={() => remove(e.id)} className="text-danger"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style>{`.input-admin{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;}`}</style>
    </AdminLayout>
  );
}
