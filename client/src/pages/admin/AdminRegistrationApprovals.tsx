import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { api } from "@/lib/api";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { DISCIPLINE_LABELS, REGISTRATION_STATUS_LABELS } from "@/lib/constants";

interface Registration {
  id: number;
  name: string;
  age: number;
  category: string;
  fatherName: string;
  representingName: string;
  disciplines: string[];
  birthCertificateFile?: string | null;
  decisionNote?: string | null;
  registrationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
  matchTitle: string;
  playerCode: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  VERIFIED: "bg-success/15 text-success",
  REJECTED: "bg-danger/15 text-danger",
};

export default function AdminRegistrationApprovals() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  async function load() {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : "";
    const res = await api.get<{ registrations: Registration[] }>(`/match-registrations${params}`);
    setRegistrations(res.registrations);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function decide(id: number, status: "VERIFIED" | "REJECTED") {
    setActingId(id);
    try {
      await api.patch(`/match-registrations/${id}/verify`, { status, note: notes[id] || undefined });
      await load();
    } finally {
      setActingId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="heading-display text-2xl font-bold">Registration Approvals</h1>
        <select className="input-admin" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Accepted</option>
          <option value="REJECTED">Rejected</option>
          <option value="">All</option>
        </select>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Review player details and accept or reject each match registration.</p>
      <div className="glass-card overflow-x-auto">
        {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div> : registrations.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No registrations found for this filter.</div> : (
          <table className="w-full text-sm min-w-[720px]">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="p-3">Player / Entry</th><th className="p-3">Match</th><th className="p-3">Disciplines</th><th className="p-3">Status</th><th className="p-3">Decision note</th><th className="p-3">Actions</th>
            </tr></thead>
            <tbody>{registrations.map((registration) => (
              <tr key={registration.id} className="border-b border-border/50">
                <td className="p-3">{registration.name}<div className="text-xs text-primary">{registration.playerCode}</div><div className="text-xs text-muted-foreground">{registration.age} yrs · {registration.category}</div><div className="text-xs text-muted-foreground">Guardian: {registration.fatherName}</div><div className="text-xs text-muted-foreground">From: {registration.representingName}</div>{registration.birthCertificateFile && <a className="text-xs text-primary underline" href={`/api/match-registrations/${registration.id}/document`} target="_blank" rel="noreferrer">View certificate</a>}</td>
                <td className="p-3">{registration.matchTitle}</td>
                <td className="p-3">{registration.disciplines.map((d) => DISCIPLINE_LABELS[d] || d).join(", ")}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[registration.registrationStatus]}`}>{REGISTRATION_STATUS_LABELS[registration.registrationStatus]}</span></td>
                <td className="p-3 min-w-[150px]">{registration.registrationStatus === "PENDING" ? <input className="input-admin w-full" maxLength={500} placeholder="Optional note" value={notes[registration.id] || ""} onChange={(e) => setNotes({ ...notes, [registration.id]: e.target.value })} /> : <span className="text-xs text-muted-foreground">{registration.decisionNote || "—"}</span>}</td>
                <td className="p-3">{registration.registrationStatus === "PENDING" && <div className="flex items-center gap-2">
                  <button disabled={actingId === registration.id} onClick={() => decide(registration.id, "VERIFIED")} className="text-success disabled:opacity-50" title="Accept">
                    {actingId === registration.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  <button disabled={actingId === registration.id} onClick={() => decide(registration.id, "REJECTED")} className="text-danger disabled:opacity-50" title="Reject"><XCircle className="h-4 w-4" /></button>
                </div>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <style>{`.input-admin{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;}`}</style>
    </AdminLayout>
  );
}
