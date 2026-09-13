import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Trophy,
  CalendarDays,
  Megaphone,
  Newspaper,
  BarChart3,
  Settings,
  LogOut,
  ClipboardCheck,
  Award,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/players", label: "Players", icon: Users },
  { to: "/admin/matches", label: "Matches", icon: CalendarDays },
  { to: "/admin/points", label: "Match Points", icon: Award },
  { to: "/admin/registrations", label: "Registration Approvals", icon: Wallet },
  { to: "/admin/registration", label: "Registration Permissions", icon: ClipboardCheck },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/news", label: "News", icon: Newspaper },
  { to: "/admin/achievements", label: "Achievements", icon: Trophy },
  { to: "/admin/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/auth");
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 flex-col bg-navy text-white">
        <div className="h-[72px] flex items-center gap-3 px-5 border-b border-white/10">
          <img src="/logo.jpg" alt="DDABA" className="h-9 w-9 object-contain" />
          <span className="font-display font-bold tracking-wide text-sm">DDABA ADMIN</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-saffron text-white font-semibold" : "text-[#c7d3e0] hover:bg-white/10"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-red-300 hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="lg:hidden font-display font-bold text-sm tracking-wide text-navy">DDABA ADMIN</div>
          <div className="ml-auto flex items-center gap-4">
            <Link to="/" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-saffron">
              <ExternalLink className="h-3.5 w-3.5" />
              View Public Site
            </Link>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
          </div>
        </header>
        <nav className="lg:hidden bg-navy text-white px-3 py-2 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap ${
                    active ? "bg-saffron font-semibold" : "text-[#c7d3e0] hover:bg-white/10"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
