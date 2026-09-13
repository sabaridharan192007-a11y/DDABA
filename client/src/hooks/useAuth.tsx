import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";

type Role = "PLAYER" | "ADMIN";

interface SessionUser {
  id: number;
  email: string;
  role: Role;
}

interface Player {
  id: number;
  playerId: string;
  fullName: string;
  club?: string | null;
  category?: string | null;
  area?: string | null;
  profileImage?: string | null;
}

interface AuthContextValue {
  user: SessionUser | null;
  player: Player | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  register: (data: Record<string, unknown>) => Promise<{ user: SessionUser; player: Player }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: SessionUser; player: Player | null }>("/auth/me")
      .then((res) => {
        setUser(res.user);
        setPlayer(res.player);
      })
      .catch(() => {
        setUser(null);
        setPlayer(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{ user: SessionUser }>("/auth/login", { email, password });
    setUser(res.user);
    const me = await api.get<{ user: SessionUser; player: Player | null }>("/auth/me");
    setPlayer(me.player);
    return res.user;
  }

  async function register(data: Record<string, unknown>) {
    const res = await api.post<{ user: SessionUser; player: Player }>("/auth/register", data);
    setUser(res.user);
    setPlayer(res.player);
    return res;
  }

  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
    setPlayer(null);
  }

  return (
    <AuthContext.Provider value={{ user, player, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
export type { SessionUser, Player, Role };
