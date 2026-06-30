import { useLocation } from "wouter";
import { DEMO_USERS, type AuthUser, useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, User, Eye, ChevronRight } from "lucide-react";

const ROLE_ICON: Record<string, React.ReactNode> = {
  "Platform Admin": <Shield className="w-5 h-5 text-indigo-500" />,
  "Super Admin":    <Shield className="w-5 h-5 text-purple-500" />,
  "Admin":          <Shield className="w-5 h-5 text-blue-500" />,
  "Accountant":     <User  className="w-5 h-5 text-emerald-500" />,
  "Viewer":         <Eye   className="w-5 h-5 text-gray-400" />,
};

const ROLE_COLOR: Record<string, string> = {
  "Platform Admin": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Super Admin":    "bg-purple-100 text-purple-800 border-purple-200",
  "Admin":          "bg-blue-100 text-blue-800 border-blue-200",
  "Accountant":     "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Viewer":         "bg-gray-100 text-gray-700 border-gray-200",
};

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();

  const handleLogin = (u: AuthUser) => {
    login(u);
    navigate(u.isPlatformAdmin ? "/platform-admin" : "/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Mystics Audit</h1>
          <p className="text-indigo-300 text-sm">Enterprise Cloud Accounting · SaaS</p>
        </div>

        {/* Demo login cards */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base font-medium text-center">
              Choose a demo account to continue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => handleLogin(u)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {u.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">{u.name}</div>
                  <div className="text-indigo-300 text-xs truncate">{u.email}</div>
                  <div className="text-indigo-400 text-xs">{u.orgName}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLOR[u.role]}`}>
                    {u.role}
                  </span>
                  {ROLE_ICON[u.role]}
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/80 transition-colors" />
              </button>
            ))}
          </CardContent>
        </Card>

        <p className="text-center text-indigo-400/60 text-xs">
          Demo mode — no real credentials required
        </p>
      </div>
    </div>
  );
}
