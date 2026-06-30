import { createContext, useContext, useState } from "react";

export type AppRole = "Platform Admin" | "Super Admin" | "Admin" | "Manager" | "Accountant" | "Staff" | "Viewer";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: AppRole;
  roleLevel: number;
  orgId: number;
  orgName: string;
  isPlatformAdmin: boolean;
  avatar: string;
}

export const DEMO_USERS: AuthUser[] = [
  {
    id: 0, name: "Platform Admin", email: "platform@mystics.io",
    role: "Platform Admin", roleLevel: 0,
    orgId: 0, orgName: "Mystics Platform",
    isPlatformAdmin: true, avatar: "PA",
  },
  {
    id: 1, name: "John Doe", email: "john@automystics.com",
    role: "Super Admin", roleLevel: 1,
    orgId: 1, orgName: "Automystics Technologies",
    isPlatformAdmin: false, avatar: "JD",
  },
  {
    id: 2, name: "Kavya Sharma", email: "kavya@automystics.com",
    role: "Accountant", roleLevel: 4,
    orgId: 1, orgName: "Automystics Technologies",
    isPlatformAdmin: false, avatar: "KS",
  },
  {
    id: 3, name: "Rahul Mehta", email: "rahul@automystics.com",
    role: "Viewer", roleLevel: 6,
    orgId: 1, orgName: "Automystics Technologies",
    isPlatformAdmin: false, avatar: "RM",
  },
  {
    id: 4, name: "Priya Mehta", email: "priya@nexusfintech.in",
    role: "Admin", roleLevel: 2,
    orgId: 2, orgName: "Nexus Fintech Solutions",
    isPlatformAdmin: false, avatar: "PM",
  },
];

/** Which nav groups each roleLevel can see (inclusive — level <= this) */
export const MODULE_ACCESS: Record<string, number> = {
  dashboard:   6, // everyone
  accounting:  4, // Super Admin, Admin, Manager, Accountant
  sales:       5, // + Staff
  purchases:   5,
  banking:     4,
  expenses:    5,
  inventory:   4,
  gst:         4,
  budgets:     3, // Super Admin, Admin, Manager
  reports:     6, // everyone (read-only for low roles)
  audit:       2, // Super Admin, Admin only
  users:       2,
  settings:    2,
};

const STORAGE_KEY = "mystics_auth_user";

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  canAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadUser() ?? DEMO_USERS[1]);

  const login = (u: AuthUser) => {
    setUser(u);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const canAccess = (module: string): boolean => {
    if (!user) return false;
    if (user.isPlatformAdmin) return true;
    const maxLevel = MODULE_ACCESS[module] ?? 1;
    return user.roleLevel <= maxLevel;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
