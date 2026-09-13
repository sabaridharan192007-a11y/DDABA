import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { api } from "@/lib/api";
import { Plus, Trash2, Lock, Unlock } from "lucide-react";
import { DISCIPLINES, DISCIPLINE_LABELS, CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { RecommendedInput } from "@/components/RecommendedInput";

interface Match {
  id: number; tournamentName: string; title: string; discipline: string; date: string; time: string;
  venue?: string; city?: string; category?: string; teamA: string; teamB: string; scoreA?: number | null; scoreB?: number | null; description?: string | null; status: string;
  maxDisciplinesPerRegistration: number; requireBirthCertificate: boolean; registrationReleased: boolean;
}

const emptyForm = {
  tournamentName: "", title: "", discipline: DISCIPLINES[0] as string, date: "", time: "", venue: "", city: "",
  category: "", teamA: "", teamB: "", status: "UPCOMING",
  scoreA: "", scoreB: "", description: "", maxDisciplinesPerRegistration: "1", requireBirthCertificate: false,
};

export default function AdminMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await api.get<{ matches: Match[] }>("/matches");
    setMatches(res.matches);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      maxDisciplinesPerRegistration: Number(form.maxDisciplinesPerRegistration),
      category: form.category || undefined,
      scoreA: form.scoreA === "" ? null : Number(form.scoreA),
      scoreB: form.scoreB === "" ? null : Number(form.scoreB),
    };
    if (editing) await api.put(`/matches/${editing.id}`, payload);
    else await api.post("/matches", payload);
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
    load();
  }

  function startEdit(match: Match) {
    setEditing(match);
    setForm({
      tournamentName: match.tournamentName, title: match.title, discipline: match.discipline, date: match.date, time: match.time?.slice(0, 5) || "",
      venue: match.venue || "", city: match.city || "", category: match.category || "", teamA: match.teamA, teamB: match.teamB, status: match.status,
      maxDisciplinesPerRegistration: String(match.maxDisciplinesPerRegistration || 1), requireBirthCertificate: match.requireBirthCertificate,
      scoreA: match.scoreA == null ? "" : String(match.scoreA), scoreB: match.scoreB == null ? "" : String(match.scoreB), description: match.description || "",
    });
    setShowForm(true);
  }

  async function remove(id: number) {
    if (!confirm("Cancel/delete this match?")) return;
    await api.delete(`/matches/${id}`);
    load();
  }

  async function toggleRegistration(m: Match) {
    const next = !m.registrationReleased;
    if (!confirm(`${next ? "Release" : "Close"} registration for "${m.title}"?`)) return;
    await api.patch(`/matches/${m.id}/registration-status`, { released: next });
    load();
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-display text-2xl font-bold">Matches</h1>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm((s) => !s); }} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-xl">
          <Plus className="h-4 w-4" /> {showForm ? "Close" : "Add Match"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="glass-card p-5 mb-6 grid sm:grid-cols-2 gap-3">
          <input required placeholder="Tournament Name" className="input-admin" value={form.tournamentName} onChange={(e) => setForm({ ...form, tournamentName: e.target.value })} />
          <input required placeholder="Match Title" className="input-admin" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <RecommendedInput storageKey="discipline" className="input-admin" placeholder="Discipline" value={form.discipline} onChange={(value) => setForm({ ...form, discipline: value })} options={DISCIPLINES} labels={DISCIPLINE_LABELS} />
          <RecommendedInput storageKey="match-category" className="input-admin" placeholder="Category (optional)" value={form.category} onChange={(value) => setForm({ ...form, category: value })} options={CATEGORIES} labels={CATEGORY_LABELS} />
          <input required type="date" className="input-admin" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input required type="time" className="input-admin" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <input placeholder="Venue" className="input-admin" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          <input placeholder="City / Area" className="input-admin" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <select className="input-admin" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>UPCOMING</option><option>LIVE</option><option>COMPLETED</option><option>CANCELLED</option>
          </select>
          <input required placeholder="Team / Player A" className="input-admin" value={form.teamA} onChange={(e) => setForm({ ...form, teamA: e.target.value })} />
          <input required placeholder="Team / Player B" className="input-admin" value={form.teamB} onChange={(e) => setForm({ ...form, teamB: e.target.value })} />
          <input type="number" min={0} placeholder="Score A (optional)" className="input-admin" value={form.scoreA || ""} onChange={(e) => setForm({ ...form, scoreA: e.target.value })} />
          <input type="number" min={0} placeholder="Score B (optional)" className="input-admin" value={form.scoreB || ""} onChange={(e) => setForm({ ...form, scoreB: e.target.value })} />
          <textarea placeholder="Match description / public notes" className="input-admin sm:col-span-2" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="sm:col-span-2 border-t border-border pt-3 mt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Registration Settings</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-xs text-muted-foreground mb-1">Max Disciplines / Participant</span>
                <input type="number" min={1} max={DISCIPLINES.length} className="input-admin w-full" value={form.maxDisciplinesPerRegistration} onChange={(e) => setForm({ ...form, maxDisciplinesPerRegistration: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 mt-5">
                <input type="checkbox" checked={form.requireBirthCertificate} onChange={(e) => setForm({ ...form, requireBirthCertificate: e.target.checked })} />
                <span className="text-sm">Require birth certificate</span>
              </label>
            </div>
          </div>

          <button className="sm:col-span-2 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium">{editing ? "Save Match Changes" : "Create Match"}</button>
        </form>
      )}

      <div className="glass-card overflow-x-auto">
        {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div> :
        matches.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No matches yet</div> : (
          <table className="w-full text-sm min-w-[820px]">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="p-3">Match</th><th className="p-3">Discipline</th><th className="p-3">Date</th>
              <th className="p-3">Score</th><th className="p-3">Status</th><th className="p-3">Registration</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-b border-border/50">
                  <td className="p-3">{m.title}<div className="text-xs text-muted-foreground">{m.tournamentName}</div></td>
                  <td className="p-3">{DISCIPLINE_LABELS[m.discipline] || m.discipline}</td>
                  <td className="p-3">{m.date} {m.time}</td>
                  <td className="p-3">{m.scoreA == null && m.scoreB == null ? "—" : `${m.scoreA ?? 0} - ${m.scoreB ?? 0}`}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-primary/15 text-primary">{m.status}</span></td>
                  <td className="p-3">
                    <button onClick={() => toggleRegistration(m)} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium ${m.registrationReleased ? "bg-success/15 text-success" : "bg-white/10 text-muted-foreground"}`}>
                      {m.registrationReleased ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {m.registrationReleased ? "Released" : "Closed"}
                    </button>
                  </td>
                  <td className="p-3 flex items-center gap-3"><button onClick={() => startEdit(m)} className="text-primary text-xs">Edit</button><button onClick={() => remove(m.id)} className="text-danger"><Trash2 className="h-4 w-4" /></button></td>
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
