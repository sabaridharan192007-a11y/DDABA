import { AdminLayout } from "@/layouts/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type AboutContent = {
  aboutTitle: string; mission: string;
  developmentText: string; affiliationText: string;
  contactText: string;
  contactEmail: string; contactPhone: string; facebookUrl: string; youtubeUrl: string;
};

const emptyContent: AboutContent = {
  aboutTitle: "About DDABA", mission: "",
  developmentText: "", affiliationText: "Affiliated to Tamil Nadu Aeroskatoball Association of India.", contactText: "",
  contactEmail: "", contactPhone: "", facebookUrl: "", youtubeUrl: "",
};

export default function AdminSettings() {
  const { user } = useAuth();
  const [content, setContent] = useState<AboutContent>(emptyContent);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ content: AboutContent | null }>("/admin/site-content").then((res) => {
      if (res.content) setContent({ ...emptyContent, ...res.content });
    });
  }, []);

  function update(field: keyof AboutContent, value: string) {
    setContent((current) => ({ ...current, [field]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api.put("/admin/site-content", content);
      setMessage("About page updated successfully.");
    } catch (error: any) {
      setMessage(error?.message || "Unable to update About page.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <h1 className="heading-display text-2xl font-bold mb-6">Settings</h1>
      <div className="glass-card p-6 max-w-lg space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Admin Email</p>
          <p className="font-medium">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Role</p>
          <p className="font-medium">{user?.role}</p>
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          Additional admin account management (creating new admins, password resets) should be handled via the secure seed script — see README — and is intentionally not exposed through the public UI.
        </p>
      </div>
      <form onSubmit={save} className="glass-card p-6 max-w-3xl mt-6 space-y-4">
        <div>
          <h2 className="heading-display text-xl font-bold">Edit Public About Page</h2>
          <p className="text-sm text-muted-foreground mt-1">Changes appear immediately on the public About page.</p>
        </div>
        <input className="input-admin w-full" placeholder="Page title" value={content.aboutTitle} onChange={(e) => update("aboutTitle", e.target.value)} required />
        <textarea className="input-admin w-full" rows={4} placeholder="Mission" value={content.mission} onChange={(e) => update("mission", e.target.value)} required />
        <textarea className="input-admin w-full" rows={4} placeholder="Development and history" value={content.developmentText} onChange={(e) => update("developmentText", e.target.value)} required />
        <textarea className="input-admin w-full" rows={3} placeholder="Affiliation information" value={content.affiliationText} onChange={(e) => update("affiliationText", e.target.value)} required />
        <textarea className="input-admin w-full" rows={3} placeholder="Contact details and address" value={content.contactText} onChange={(e) => update("contactText", e.target.value)} />
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="input-admin w-full" type="email" placeholder="Public contact email" value={content.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
          <input className="input-admin w-full" placeholder="Public mobile number" value={content.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
          <input className="input-admin w-full" type="url" placeholder="Facebook URL" value={content.facebookUrl} onChange={(e) => update("facebookUrl", e.target.value)} />
          <input className="input-admin w-full" type="url" placeholder="YouTube URL" value={content.youtubeUrl} onChange={(e) => update("youtubeUrl", e.target.value)} />
        </div>
        {message && <p className="text-sm text-success">{message}</p>}
        <button disabled={saving} className="bg-primary text-primary-foreground rounded-xl py-2 px-6 text-sm font-medium disabled:opacity-60">{saving ? "Saving..." : "Save About Page"}</button>
      </form>
      <style>{`.input-admin{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;}`}</style>
    </AdminLayout>
  );
}
