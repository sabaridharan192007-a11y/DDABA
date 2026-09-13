import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/", label: "Home" },
  { to: "/players", label: "Player Search" },
  { to: "/rankings", label: "Rankings" },
  { to: "/matches", label: "Matches" },
  { to: "/achievements", label: "Achievements" },
  { to: "/news", label: "News" },
  { to: "/announcements", label: "Announcements" },
  { to: "/about", label: "About" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/auth");
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b-[3px] border-saffron">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-[72px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.jpg" alt="DDABA" className="h-11 w-11 object-contain" />
          <div>
            <div className="font-display font-bold text-sm text-navy tracking-wide">DDABA</div>
            <div className="text-[10px] text-muted-foreground tracking-widest">DINDIGUL DISTRICT AEROSKATOBALL ASSN.</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wide text-navy">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-saffron transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="text-xs font-semibold uppercase px-4 py-2 rounded border border-navy text-navy hover:bg-navy hover:text-white transition-colors"
              >
                {user.role === "ADMIN" ? "Admin Panel" : "Player Dashboard"}
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs font-semibold uppercase px-4 py-2 rounded bg-saffron text-white hover:opacity-90 transition-opacity"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="text-xs font-semibold uppercase px-5 py-2.5 rounded bg-saffron text-white hover:opacity-90 transition-opacity"
            >
              Login
            </Link>
          )}
        </div>

        <button className="md:hidden text-navy" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border px-4 py-4 flex flex-col gap-3 bg-white">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-sm text-navy font-medium">
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to={user.role === "ADMIN" ? "/admin" : "/dashboard"} onClick={() => setOpen(false)} className="text-sm text-saffron font-semibold">
                {user.role === "ADMIN" ? "Admin Panel" : "Player Dashboard"}
              </Link>
              <button onClick={handleLogout} className="text-sm text-left text-danger font-semibold">
                Logout
              </button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)} className="text-sm text-saffron font-semibold">
              Login
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
