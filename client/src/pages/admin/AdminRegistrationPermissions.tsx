import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { api } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { AREAS } from "@/lib/constants";

interface Permission {
  id: number; area: string; institution: string | null; isOpen: boolean; note: string | null; updatedAt: string;
}

const emptyForm = { area: AREAS[0] as string, institution: "", isOpen: true, note: "" };

export default function AdminRegistrationPermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await api.get<{ permissions: Permission[] }>("/registration-permissions");
    setPermissions(res.permissions);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/registration-permissions", {
      area: form.area,
      institution: form.institution.trim() || undefined,
      isOpen: form.isOpen,
      note: form.note || undefined,
    });
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Remove this registration permission rule?")) return;
    await api.delete(`/registration-permissions/${id}`);
    load();
  }

  const areaWide = permissions.filter((p) => !p.institution);
  const institutionSpecific = permissions.filter((p) => p.institution);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-display text-2xl font-bold">Registration Permissions</h1>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-xl">
          <Plus className="h-4 w-4" /> Add Rule
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Controls both account registration and match registration eligibility. A club/school/college-specific rule
        (e.g. one school within a taluk) always overrides the area-wide rule for that area — in either direction.
      </p>

      {showForm && (
        <form onSubmit={add} className="glass-card p-5 mb-6 grid sm:grid-cols-2 gap-3">
          <input list="permission-area-options" className="input-admin" placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          <datalist id="permission-area-options">
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </datalist>
          <input
            placeholder="Club / School / College — leave blank for area-wide"
            className="input-admin"
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
          />
          <select className="input-admin" value={form.isOpen ? "open" : "closed"} onChange={(e) => setForm({ ...form, isOpen: e.target.value === "open" })}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <input placeholder="Note (optional)" className="input-admin" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button className="sm:col-span-2 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium">Save Rule</button>
        </form>
      )}

      {loading ? (
        <div className="glass-card p-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2 mt-2">Area-Wide Rules</h2>
          <PermTable rows={areaWide} onRemove={remove} showInstitution={false} />

          <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2 mt-6">Club / School / College Overrides</h2>
          <PermTable rows={institutionSpecific} onRemove={remove} showInstitution={true} />
        </>
      )}
      <style>{`.input-admin{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;}`}</style>
    </AdminLayout>
  );
}

function PermTable({ rows, onRemove, showInstitution }: { rows: Permission[]; onRemove: (id: number) => void; showInstitution: boolean }) {
  if (rows.length === 0) {
    return <div className="glass-card p-6 text-center text-sm text-muted-foreground mb-4">No rules yet.</div>;
  }
  return (
    <div className="glass-card overflow-x-auto mb-4">
      <table className="w-full text-sm min-w-[500px]">
        <thead><tr className="text-left text-muted-foreground border-b border-border">
          <th className="p-3">Area</th>
          {showInstitution && <th className="p-3">Club / School / College</th>}
          <th className="p-3">Status</th><th className="p-3">Note</th><th className="p-3"></th>
        </tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-border/50">
              <td className="p-3">{p.area}</td>
              {showInstitution && <td className="p-3">{p.institution}</td>}
              <td className="p-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.isOpen ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                  {p.isOpen ? "Open" : "Closed"}
                </span>
              </td>
              <td className="p-3 text-muted-foreground">{p.note || "—"}</td>
              <td className="p-3"><button onClick={() => onRemove(p.id)} className="text-danger"><Trash2 className="h-4 w-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
