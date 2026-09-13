import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { api } from "@/lib/api";
import { Search, Loader2 } from "lucide-react";

interface PlayerRow {
  id: number; playerId: string; fullName: string; club?: string; category?: string; area?: string; status: "ACTIVE" | "INACTIVE";
}

export default function AdminPlayers() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlayerRow | null>(null);

  async function load(q = "") {
    setLoading(true);
    try {
      const res = await api.get<{ players: PlayerRow[] }>(`/players${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      setPlayers(res.players);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(search), 350); // debounced search
    return () => clearTimeout(t);
  }, [search]);

  async function toggleStatus(p: PlayerRow) {
    const next = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!confirm(`${next === "INACTIVE" ? "Deactivate" : "Reactivate"} ${p.fullName}?`)) return;
    await api.patch(`/players/${p.id}/status`, { status: next });
    load(search);
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="heading-display text-2xl font-bold">Players</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full bg-white/5 border border-border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/50"
            placeholder="Search name, player ID, club..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : players.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No players found</div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="p-3">Name</th>
                <th className="p-3">Player ID</th>
                <th className="p-3">Club / School / College</th>
                <th className="p-3">Area</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-white/5">
                  <td className="p-3 font-medium">{p.fullName}</td>
                  <td className="p-3 text-primary">{p.playerId}</td>
                  <td className="p-3">{p.club || "—"}</td>
                  <td className="p-3">{p.area || "—"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${p.status === "ACTIVE" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 space-x-2">
                    <button onClick={() => setEditing(p)} className="text-primary hover:underline">Update Stats</button>
                    <button onClick={() => toggleStatus(p)} className="text-danger hover:underline">
                      {p.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && <StatsModal player={editing} onClose={() => setEditing(null)} />}
    </AdminLayout>
  );
}

function StatsModal({ player, onClose }: { player: PlayerRow; onClose: () => void }) {
  const [form, setForm] = useState({ matchesPlayed: 0, wins: 0, losses: 0, goals: 0, assists: 0, awards: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ stats: typeof form }>(`/players/${player.id}/stats`).then((res) => res.stats && setForm(res.stats));
  }, [player.id]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/players/${player.id}/stats`, form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-card glow-border p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold mb-4">Update Statistics — {player.fullName}</h3>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(form) as (keyof typeof form)[]).map((key) => (
            <label key={key} className="block">
              <span className="block text-xs text-muted-foreground mb-1 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
              <input
                type="number"
                min={0}
                className="w-full bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-border text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
