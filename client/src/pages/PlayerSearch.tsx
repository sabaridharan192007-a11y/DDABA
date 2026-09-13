import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { api } from "@/lib/api";
import { Search, Users2 } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, AREAS } from "@/lib/constants";

interface PlayerRow {
  id: number; playerId: string; fullName: string; club?: string; category?: string; area?: string; profileImage?: string;
}

export default function PlayerSearch() {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (area) params.set("area", area);
      if (category) params.set("category", category);
      params.set("status", "ACTIVE");
      api.get<{ players: PlayerRow[] }>(`/players?${params}`).then((r) => setPlayers(r.players)).finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [search, area, category]);

  return (
    <PublicLayout>
      <h1 className="heading-display text-2xl font-bold mb-6">Player Search</h1>

      <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full bg-white/5 border border-border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/50"
            placeholder="Search by name, player ID, or club"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input list="search-area-options" className="bg-white/5 border border-border rounded-xl px-3 py-2 text-sm" placeholder="Area (or type one)" value={area} onChange={(e) => setArea(e.target.value)} />
        <datalist id="search-area-options">
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </datalist>
        <input list="search-category-options" className="bg-white/5 border border-border rounded-xl px-3 py-2 text-sm" placeholder="Category (or type one)" value={category} onChange={(e) => setCategory(e.target.value)} />
        <datalist id="search-category-options">
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </datalist>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card p-4 h-32 animate-pulse" />)}
        </div>
      ) : players.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-muted-foreground">No players found</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p) => (
            <div key={p.id} className="glass-card p-4 flex gap-4 items-center">
              <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                {p.profileImage ? <img src={p.profileImage} className="h-full w-full object-cover" /> : <Users2 className="h-6 w-6 text-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{p.fullName}</p>
                <p className="text-xs text-primary">{p.playerId}</p>
                <p className="text-xs text-muted-foreground truncate">{p.club} · {p.area}</p>
                <Link to={`/players/${p.id}`} className="text-xs text-primary hover:underline mt-1 inline-block">View Profile →</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </PublicLayout>
  );
}
