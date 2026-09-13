import { PublicLayout } from "@/layouts/PublicLayout";
import { Target, Eye, ListChecks, Mail, Phone, Facebook, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function About() {
  const [content, setContent] = useState<any>(null);
  useEffect(() => { api.get<{ content: any }>("/site-content").then((res) => setContent(res.content)).catch(() => undefined); }, []);
  const objectives = Array.isArray(content?.objectives) ? content.objectives : [];
  return (
    <PublicLayout>
      <h1 className="heading-display text-2xl font-bold mb-8">{content?.aboutTitle || "About DDABA"}</h1>

      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <Target className="h-5 w-5 text-primary mb-3" />
          <h2 className="font-semibold mb-2">Mission</h2>
          <p className="text-sm text-muted-foreground">
            {content?.mission || "Association mission will be published here."}
          </p>
        </div>
        <div className="glass-card p-6">
          <Eye className="h-5 w-5 text-primary mb-3" />
          <h2 className="font-semibold mb-2">Vision</h2>
          <p className="text-sm text-muted-foreground">
            {content?.vision || "Association vision will be published here."}
          </p>
        </div>
      </div>

      <div className="glass-card p-6 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Objectives</h2>
        </div>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          {(objectives.length ? objectives : ["Objectives will be published here."]).map((objective: string) => <li key={objective}>{objective}</li>)}
        </ul>
      </div>

      <div className="glass-card p-6 mb-8">
        <h2 className="font-semibold mb-2">Dindigul District Skating Development</h2>
        <p className="text-sm text-muted-foreground">
          {content?.developmentText || "Development information will be published here."}
        </p>
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
          {content?.affiliationText || "Affiliation information will be published here."}
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Contact</h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          {content?.contactEmail && <a className="flex items-center gap-2 hover:text-primary" href={`mailto:${content.contactEmail}`}><Mail className="h-4 w-4" />{content.contactEmail}</a>}
          {content?.contactPhone && <a className="flex items-center gap-2 hover:text-primary" href={`tel:${content.contactPhone}`}><Phone className="h-4 w-4" />{content.contactPhone}</a>}
          <div className="flex gap-4 pt-2">
            {content?.facebookUrl && <a className="hover:text-primary" href={content.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook className="h-5 w-5" /></a>}
            {content?.youtubeUrl && <a className="hover:text-primary" href={content.youtubeUrl} target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube className="h-5 w-5" /></a>}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
