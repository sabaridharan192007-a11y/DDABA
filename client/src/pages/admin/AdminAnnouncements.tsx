import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { api } from "@/lib/api";
import { Edit3, Megaphone, Plus, Trash2, X } from "lucide-react";

interface Announcement { id: number; title: string; description: string; priority: string; matchId?: number | null; published: boolean; }
interface MatchOption { id: number; title: string; tournamentName: string; }
type Form = { title: string; description: string; priority: string; matchId: string; published: boolean };
const empty: Form = { title: "", description: "", priority: "NORMAL", matchId: "", published: true };

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() { const res = await api.get<{ announcements: Announcement[] }>("/announcements?all=true"); setItems(res.announcements); }
  useEffect(() => { load(); api.get<{ matches: MatchOption[] }>("/matches").then((res) => setMatches(res.matches)); }, []);
  function edit(item: Announcement) {
    setForm({ title: item.title, description: item.description, priority: item.priority, matchId: item.matchId ? String(item.matchId) : "", published: item.published });
    setEditing(item.id); setShowForm(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, matchId: form.matchId ? Number(form.matchId) : null };
    if (editing) await api.put(`/announcements/${editing}`, payload); else await api.post("/announcements", payload);
    setForm(empty); setEditing(null); setShowForm(false); await load();
  }
  async function togglePublish(a: Announcement) { await api.put(`/announcements/${a.id}`, { published: !a.published }); load(); }
  async function remove(id: number) { if (!confirm("Delete this announcement?")) return; await api.delete(`/announcements/${id}`); load(); }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6"><div><h1 className="heading-display text-2xl font-bold">Announcements CMS</h1><p className="text-sm text-muted-foreground mt-1">Publish operational notices and match-linked updates.</p></div><button onClick={() => { if (showForm) setShowForm(false); else { setForm(empty); setEditing(null); setShowForm(true); } }} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-xl">{showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showForm ? "Close" : "New Announcement"}</button></div>
      {showForm && <form onSubmit={save} className="glass-card p-5 mb-6 space-y-3"><input required placeholder="Title" className="input-admin w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><textarea required placeholder="Description" className="input-admin w-full" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><div className="grid sm:grid-cols-3 gap-3"><select className="input-admin" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>NORMAL</option><option>IMPORTANT</option><option>URGENT</option></select><select className="input-admin sm:col-span-2" value={form.matchId} onChange={(e) => setForm({ ...form, matchId: e.target.value })}><option value="">No linked match</option>{matches.map((m) => <option key={m.id} value={m.id}>{m.title} — {m.tournamentName}</option>)}</select></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish on save</label><button className="bg-primary text-primary-foreground rounded-xl py-2 px-6 text-sm font-medium">{editing ? "Save Changes" : "Publish"}</button></form>}
      <div className="space-y-3">{items.length === 0 && <div className="glass-card p-8 text-center text-sm text-muted-foreground">No announcements available</div>}{items.map((a) => <div key={a.id} className="glass-card p-4 flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">{a.title}</span><span className={`text-xs px-2 py-0.5 rounded-full ${a.priority === "URGENT" ? "bg-danger/15 text-danger" : a.priority === "IMPORTANT" ? "bg-warning/15 text-warning" : "bg-white/10 text-muted-foreground"}`}>{a.priority}</span></div><p className="text-xs text-muted-foreground mt-1">{a.description}</p>{a.matchId && <p className="text-xs text-primary mt-1">Linked match #{a.matchId}</p>}<span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${a.published ? "bg-success/15 text-success" : "bg-white/10 text-muted-foreground"}`}>{a.published ? "Published" : "Draft"}</span></div><div className="flex items-center gap-3 text-xs shrink-0"><button onClick={() => edit(a)} className="text-primary"><Edit3 className="h-4 w-4" /></button><button onClick={() => togglePublish(a)} className="text-primary">{a.published ? "Unpublish" : "Publish"}</button><button onClick={() => remove(a.id)} className="text-danger"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>
      <style>{`.input-admin{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;}`}</style>
    </AdminLayout>
  );
}
