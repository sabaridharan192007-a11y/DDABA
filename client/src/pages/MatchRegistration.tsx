import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { api, ApiError } from "@/lib/api";
import { DISCIPLINES, DISCIPLINE_LABELS, CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { Loader2, CheckCircle2 } from "lucide-react";
import { RecommendedInput } from "@/components/RecommendedInput";

interface Match {
  id: number; title: string; tournamentName: string; date: string;
  maxDisciplinesPerRegistration: number; requireBirthCertificate: boolean;
  registrationReleased: boolean;
}

type Step = "form" | "done";

export default function MatchRegistration() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", age: "", category: CATEGORIES[0] as string, fatherName: "", representingName: "",
  });
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [birthCert, setBirthCert] = useState<File | null>(null);

  const [registrationId, setRegistrationId] = useState<number | null>(null);

  useEffect(() => {
    if (!matchId) return;
    api.get<{ match: Match }>(`/matches/${matchId}`).then((r) => setMatch(r.match)).finally(() => setLoading(false));
  }, [matchId]);

  function toggleDiscipline(d: string) {
    setDisciplines((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (match && prev.length >= match.maxDisciplinesPerRegistration) return prev; // cap enforced client-side too
      return [...prev, d];
    });
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!match) return;
    if (Object.values(form).some((v) => v === "")) return setError("Please complete all required fields.");
    if (disciplines.length === 0) return setError(`Please select at least 1 discipline (max ${match.maxDisciplinesPerRegistration}).`);
    if (match.requireBirthCertificate && !birthCert) return setError("A birth certificate upload is required for this match.");

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("matchId", String(match.id));
      fd.append("name", form.name);
      fd.append("age", form.age);
      fd.append("category", form.category);
      fd.append("fatherName", form.fatherName);
      fd.append("representingName", form.representingName);
      fd.append("disciplines", JSON.stringify(disciplines));
      if (birthCert) fd.append("birthCertificate", birthCert);

      const res = await api.postForm<{ registration: { id: number } }>("/match-registrations", fd);
      setRegistrationId(res.registration.id);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to submit registration.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PublicLayout><div className="card p-10 text-center text-sm text-muted-foreground">Loading match details...</div></PublicLayout>;
  if (!match) return <PublicLayout><div className="card p-10 text-center text-sm text-muted-foreground">Match not found.</div></PublicLayout>;
  if (!match.registrationReleased) {
    return <PublicLayout><div className="card p-10 text-center text-sm text-muted-foreground">Registration for this match has not been released yet. Please check back later.</div></PublicLayout>;
  }

  return (
    <PublicLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="heading-display text-xl font-bold text-navy mb-1">{match.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{match.tournamentName} · {match.date}</p>

        {error && <div className="mb-4 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{error}</div>}

        {step === "form" && (
          <form onSubmit={submitForm} className="card p-6 space-y-4">
            <Field label="Name"><input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age"><input type="number" min={3} max={100} className="field-input" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></Field>
              <Field label="Category">
                <RecommendedInput storageKey="match-registration-category" className="field-input" value={form.category} onChange={(value) => setForm({ ...form, category: value })} options={CATEGORIES} labels={CATEGORY_LABELS} />
              </Field>
            </div>
            <Field label="Father's Name"><input className="field-input" value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} /></Field>
            <Field label="Representing School / College / Club"><RecommendedInput storageKey="club-school-college" className="field-input" value={form.representingName} onChange={(value) => setForm({ ...form, representingName: value })} /></Field>

            <div>
              <span className="block text-xs font-medium text-muted-foreground mb-2">
                Disciplines (select up to {match.maxDisciplinesPerRegistration})
              </span>
              <div className="grid grid-cols-2 gap-2">
                {DISCIPLINES.map((d) => (
                  <label key={d} className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${disciplines.includes(d) ? "border-saffron bg-saffron/5" : "border-border"}`}>
                    <input type="checkbox" checked={disciplines.includes(d)} onChange={() => toggleDiscipline(d)} />
                    {DISCIPLINE_LABELS[d]}
                  </label>
                ))}
              </div>
            </div>

            {match.requireBirthCertificate && (
              <Field label="Birth Certificate (JPG, PNG, or PDF — max 5MB)">
                <input type="file" accept="image/jpeg,image/png,application/pdf" className="field-input" onChange={(e) => setBirthCert(e.target.files?.[0] ?? null)} />
              </Field>
            )}

            <button disabled={submitting} className="w-full py-2.5 rounded-lg bg-saffron text-white font-semibold text-sm uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit Registration
            </button>
          </form>
        )}

        {step === "done" && registrationId && (
          <div className="card p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <h2 className="font-bold text-navy">Registration Submitted</h2>
            <p className="text-sm text-muted-foreground">
              Your registration is pending admin approval. You will see the status on your dashboard after the admin accepts or rejects it.
            </p>
            <div>
              <button onClick={() => navigate("/dashboard")} className="text-sm text-green font-semibold mt-2">
                Go to My Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .field-input { width: 100%; border: 1px solid #e6e3da; border-radius: 0.5rem; padding: 0.6rem 0.9rem; font-size: 0.875rem; outline: none; }
        .field-input:focus { border-color: #ff6a00; }
      `}</style>
    </PublicLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
