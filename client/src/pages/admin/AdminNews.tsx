import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { api } from "@/lib/api";
import { readImageFile } from "@/lib/media";
import { Edit3, Image, Plus, Trash2, Video, X } from "lucide-react";

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content: string;
  image?: string | null;
  videoUrl?: string | null;
  author?: string | null;
  category: string;
  published: boolean;
  publishedAt?: string | null;
}

type NewsForm = {
  title: string;
  summary: string;
  content: string;
  image: string;
  videoUrl: string;
  author: string;
  category: string;
  published: boolean;
};

const CATEGORIES = ["TOURNAMENT", "ACHIEVEMENT", "PLAYER", "ASSOCIATION", "ANNOUNCEMENT", "GENERAL"];
const empty: NewsForm = {
  title: "",
  summary: "",
  content: "",
  image: "",
  videoUrl: "",
  author: "DDABA Media Team",
  category: "GENERAL",
  published: true,
};

export default function AdminNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [form, setForm] = useState<NewsForm>(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await api.get<{ news: NewsItem[] }>("/news?all=true");
    setItems(res.news);
  }
  useEffect(() => { load(); }, []);

  function startCreate() {
    setForm(empty);
    setEditing(null);
    setMessage("");
    setShowForm(true);
  }

  function startEdit(item: NewsItem) {
    setForm({
      title: item.title,
      summary: item.summary,
      content: item.content,
      image: item.image || "",
      videoUrl: item.videoUrl || "",
      author: item.author || "",
      category: item.category,
      published: item.published,
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
      const payload = { ...form, image: form.image || null, videoUrl: form.videoUrl || null };
      if (editing) await api.put(`/news/${editing}`, payload);
      else await api.post("/news", payload);
      setShowForm(false);
      setForm(empty);
      setEditing(null);
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Unable to save article.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(item: NewsItem) {
    await api.put(`/news/${item.id}`, { published: !item.published });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this article?")) return;
    await api.delete(`/news/${id}`);
    load();
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="heading-display text-2xl font-bold">News CMS</h1>
          <p className="text-sm text-muted-foreground mt-1">Publish text stories with an optional photo and video.</p>
        </div>
        <button onClick={showForm ? () => setShowForm(false) : startCreate} className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-xl">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showForm ? "Close" : "New Article"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="glass-card p-5 mb-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input required placeholder="Title" className="input-admin" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input required placeholder="Short summary" className="input-admin" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            <div>
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
              {form.image && <img src={form.image} alt="Selected article" className="mt-2 h-16 w-24 rounded-lg object-cover" />}
            </div>
            <input placeholder="Video URL (YouTube, Vimeo, or MP4)" className="input-admin" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
            <select className="input-admin" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Author" className="input-admin" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <textarea required placeholder="Full article content" className="input-admin w-full" rows={7} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish on save</label>
          {message && <p className="text-sm text-danger">{message}</p>}
          <button disabled={saving} className="bg-primary text-primary-foreground rounded-xl py-2 px-6 text-sm font-medium disabled:opacity-60">{saving ? "Saving..." : editing ? "Save Changes" : "Create Article"}</button>
        </form>
      )}

      <div className="space-y-3">
        {items.length === 0 && <div className="glass-card p-8 text-center text-sm text-muted-foreground">No articles yet.</div>}
        {items.map((item) => (
          <div key={item.id} className="glass-card p-4 flex items-start justify-between gap-4">
            <div className="flex gap-3 min-w-0">
              {item.image ? <img src={item.image} alt="" className="h-16 w-20 rounded-lg object-cover shrink-0" /> : item.videoUrl ? <Video className="h-5 w-5 text-primary mt-1 shrink-0" /> : <Image className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />}
              <div className="min-w-0">
                <span className="text-xs text-primary uppercase">{item.category}</span>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${item.published ? "bg-success/15 text-success" : "bg-white/10 text-muted-foreground"}`}>{item.published ? "Published" : "Draft"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs shrink-0">
              <button onClick={() => startEdit(item)} className="text-primary"><Edit3 className="h-4 w-4" /></button>
              <button onClick={() => togglePublish(item)} className="text-primary">{item.published ? "Unpublish" : "Publish"}</button>
              <button onClick={() => remove(item.id)} className="text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <style>{`.input-admin{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;}`}</style>
    </AdminLayout>
  );
}
