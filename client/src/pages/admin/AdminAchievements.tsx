import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { api } from "@/lib/api";
import { readImageFile } from "@/lib/media";
import { Edit3, Plus, Trash2, Trophy, X } from "lucide-react";

interface Achievement {
  id: number;
  title: string;
  description?: string | null;
  playerId?: number | null;
  tournament?: string | null;
  year?: number | null;
  type: string;
  medal?: string | null;
  image?: string | null;
}
interface PlayerOption { id: number; fullName: string; playerId: string; }
type AchievementForm = { title: string; description: string; playerId: string; tournament: string; year: string; type: string; medal: string; image: string; };
const TYPES = ["STATE", "NATIONAL", "INTERNATIONAL", "ASSOCIATION"];
const empty: AchievementForm = { title: "", description: "", playerId: "", tournament: "", year: String(new Date().getFullYear()), type: "STATE", medal: "Gold", image: "" };

export default function AdminAchievements() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [form, setForm] = useState<AchievementForm>(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await api.get<{ achievements: Achievement[] }>("/achievements");
    setItems(res.achievements);
  }
  useEffect(() => {
    load();
    api.get<{ players: PlayerOption[] }>("/players?pageSize=100").then((res) => setPlayers(res.players));
  }, []);

  function edit(item: Achievement) {
    setForm({
      title: item.title, description: item.description || "", playerId: item.playerId ? String(item.playerId) : "",
      tournament: item.tournament || "", year: item.year ? String(item.year) : "", type: item.type, medal: item.medal || "", image: item.image || "",
    });
    setEditing(item.id);
    setMessage("");
    setShowForm(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload = { ...form, playerId: form.playerId ? Number(form.playerId) : null, year: form.year ? Number(form.year) : undefined, image: form.image || undefined };
      if (editing) await api.put(`/achievements/${editing}`, payload);
      else await api.post("/achievements", payload);
      setForm(empty); setEditing(null); setShowForm(false); await load();
    } catch (error: any) {
      setMessage(error?.message || "Unable to save achievement.");
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: number) {
    if (!confirm("Remove this achievement?")) return;
    await api.delete(`/achievements/${id}`);
    load();
  }
  const playerName = (id?: number | null) => players.find((p) => p.id === id)?.fullName;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="heading-display text-2xl font-bold">Achievements CMS</h1><p className="text-sm text-muted-foreground mt-1">Manage association and player accomplishments shown on public profiles.</p></div>
        <button onClick={() => { setForm(empty); setEditing(null); setShowForm(!showForm); }} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-xl">{showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showForm ? "Close" : "Add Achievement"}</button>
      </div>
      {showForm && <form onSubmit={save} className="glass-card p-5 mb-6 grid sm:grid-cols-2 gap-3">
        <input required placeholder="Title" className="input-admin" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="input-admin" value={form.playerId} onChange={(e) => setForm({ ...form, playerId: e.target.value })}><option value="">Association-wide</option>{players.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.playerId})</option>)}</select>
        <input placeholder="Tournament" className="input-admin" value={form.tournament} onChange={(e) => setForm({ ...form, tournament: e.target.value })} />
        <input type="number" min={1900} max={2200} placeholder="Year" className="input-admin" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
        <select className="input-admin" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <input placeholder="Medal (Gold/Silver/Bronze)" className="input-admin" value={form.medal} onChange={(e) => setForm({ ...form, medal: e.target.value })} />
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">Photo (JPG or PNG, max 2MB)</label>
          <input type="file" accept="image/jpeg,image/png" className="input-admin w-full mt-1" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setForm({ ...form, image: await readImageFile(file) });
              setMessage("");
            } catch (error: any) {
              e.target.value = "";
              setMessage(error?.message || "Unable to read the selected image.");
            }
          }} />
          {form.image && <img src={form.image} alt="Selected achievement" className="mt-2 h-20 w-32 rounded-lg object-cover" />}
        </div>
        <textarea placeholder="Description" className="input-admin sm:col-span-2" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {message && <p className="sm:col-span-2 text-sm text-danger">{message}</p>}
        <button disabled={saving} className="sm:col-span-2 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium disabled:opacity-60">{saving ? "Saving..." : editing ? "Save Changes" : "Add Achievement"}</button>
      </form>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && <div className="glass-card p-8 text-center text-sm text-muted-foreground sm:col-span-3">No achievements available</div>}
        {items.map((a) => <div key={a.id} className="glass-card p-4">
          {a.image && <img src={a.image} alt="" className="w-full h-28 rounded-lg object-cover mb-3" />}
          <div className="flex items-center justify-between"><Trophy className="h-5 w-5 text-warning" /><div className="flex gap-3"><button onClick={() => edit(a)} className="text-primary"><Edit3 className="h-4 w-4" /></button><button onClick={() => remove(a.id)} className="text-danger"><Trash2 className="h-4 w-4" /></button></div></div>
          <p className="font-semibold text-sm mt-2">{a.title}</p><p className="text-xs text-muted-foreground">{a.tournament || "Association"} · {a.year || "—"} · {a.medal || "—"}</p>
          {a.playerId && <p className="text-xs text-primary mt-1">{playerName(a.playerId) || "Player achievement"}</p>}
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{a.type}</span>
          {a.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{a.description}</p>}
        </div>)}
      </div>
      <style>{`.input-admin{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;}`}</style>
    </AdminLayout>
  );
}
