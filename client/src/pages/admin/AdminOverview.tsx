import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Activity, CalendarDays, Newspaper, Trophy, Wallet } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";

interface Overview {
  totalPlayers: number; activePlayers: number; upcomingMatches: number; publishedNews: number; totalAchievements: number; pendingRegistrations: number;
}

export default function AdminOverview() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    api.get<{ overview: Overview }>("/admin/overview").then((res) => setOverview(res.overview));
  }, []);

  return (
    <AdminLayout>
      <h1 className="heading-display text-2xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Players" value={overview?.totalPlayers ?? 0} icon={Users} />
        <StatCard label="Active Players" value={overview?.activePlayers ?? 0} icon={Activity} />
        <StatCard label="Upcoming Matches" value={overview?.upcomingMatches ?? 0} icon={CalendarDays} />
        <StatCard label="Published News" value={overview?.publishedNews ?? 0} icon={Newspaper} />
        <StatCard label="Achievements" value={overview?.totalAchievements ?? 0} icon={Trophy} />
        <StatCard label="Pending Registrations" value={overview?.pendingRegistrations ?? 0} icon={Wallet} />
      </div>
      {overview && overview.pendingRegistrations > 0 && (
        <Link to="/admin/registrations" className="glass-card p-4 mb-6 flex items-center justify-between text-sm border border-warning/30 bg-warning/5">
          <span>{overview.pendingRegistrations} registration{overview.pendingRegistrations === 1 ? "" : "s"} awaiting approval.</span>
          <span className="text-saffron font-semibold">Review now →</span>
        </Link>
      )}
      <div className="glass-card p-6 text-sm text-muted-foreground">
        Use the sidebar to manage players, matches, match points, registration permissions, and content.
      </div>
    </AdminLayout>
  );
}
