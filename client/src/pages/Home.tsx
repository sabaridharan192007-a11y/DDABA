import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PublicLayout } from "@/layouts/PublicLayout";
import { api } from "@/lib/api";
import { CalendarDays, Megaphone, Newspaper, Trophy, ArrowRight } from "lucide-react";

interface Match { id: number; title: string; tournamentName: string; date: string; venue?: string; }
interface Announcement { id: number; title: string; priority: string; }
interface NewsItem { id: number; title: string; summary: string; }

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    api.get<{ matches: Match[] }>("/matches?status=UPCOMING").then((r) => setMatches(r.matches.slice(0, 3)));
    api.get<{ announcements: Announcement[] }>("/announcements").then((r) => setAnnouncements(r.announcements.slice(0, 3)));
    api.get<{ news: NewsItem[] }>("/news").then((r) => setNews(r.news.slice(0, 3)));
  }, []);

  return (
    <PublicLayout>
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card glow-border p-8 sm:p-12 text-center mb-10">
        <h1 className="heading-display text-3xl sm:text-4xl font-extrabold mb-3">DINDIGUL DISTRICT AEROSKATOBALL ASSOCIATION</h1>
        <p className="text-primary uppercase tracking-widest text-xs mb-4">Building Champions Across Dindigul</p>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
          The official district portal for players, clubs, and administrators across Dindigul district — tracking matches, statistics, and achievements in one place.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          <Link to="/players" className="bg-primary text-primary-foreground text-sm px-5 py-2.5 rounded-xl font-medium">Find a Player</Link>
          <Link to="/rankings" className="glass-card text-sm px-5 py-2.5 rounded-xl">View Rankings</Link>
        </div>
      </motion.section>

      <div className="grid md:grid-cols-3 gap-6">
        <QuickSection title="Upcoming Matches" icon={CalendarDays} link="/matches" empty="No upcoming matches">
          {matches.map((m) => (
            <div key={m.id} className="text-sm">
              <p className="font-medium">{m.title}</p>
              <p className="text-xs text-muted-foreground">{m.tournamentName} · {m.date}</p>
            </div>
          ))}
        </QuickSection>

        <QuickSection title="Announcements" icon={Megaphone} link="/announcements" empty="No announcements available">
          {announcements.map((a) => (
            <div key={a.id} className="text-sm">
              <p className="font-medium">{a.title}</p>
            </div>
          ))}
        </QuickSection>

        <QuickSection title="Latest News" icon={Newspaper} link="/news" empty="No news published yet">
          {news.map((n) => (
            <Link key={n.id} to={`/news/${n.id}`} className="block text-sm hover:text-primary">
              <p className="font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{n.summary}</p>
            </Link>
          ))}
        </QuickSection>
      </div>
    </PublicLayout>
  );
}

function QuickSection({ title, icon: Icon, link, empty, children }: { title: string; icon: any; link: string; empty: string; children: React.ReactNode }) {
  const hasContent = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <Link to={link} className="text-xs text-primary flex items-center gap-1">See all <ArrowRight className="h-3 w-3" /></Link>
      </div>
      <div className="space-y-3">
        {hasContent ? children : <p className="text-xs text-muted-foreground text-center py-4">{empty}</p>}
      </div>
    </div>
  );
}
