import { useEffect, useState } from "react";
import { Search, Shield, Users } from "lucide-react";
import PlatformLayout from "@/components/platform-layout";

const ROLE_BADGE: Record<string, string> = {
  "Super Admin": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Admin":       "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Manager":     "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Accountant":  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Staff":       "bg-slate-500/10 text-slate-400 border-slate-500/20",
  "Viewer":      "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export default function PlatformUsers() {
  const [users, setUsers]   = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform-admin/users").then(r => r.json())
      .then(d => { setUsers(d); setLoading(false); });
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <PlatformLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-400" /> All Users
            </h1>
            <p className="text-slate-400 text-sm mt-1">{users.length} users across all organizations</p>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
        </div>

        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading…</div>
        ) : (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {["User", "Email", "Role", "Department", "Status", "2FA", "Created"].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-300">
                          {u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <span className="text-white font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit ${ROLE_BADGE[u.role] ?? ROLE_BADGE["Staff"]}`}>
                        {(u.roleLevel ?? 5) <= 2 && <Shield className="w-2.5 h-2.5" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{u.department || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${u.isActive ? "text-emerald-400" : "text-red-400"}`}>
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{u.isMfaEnabled ? "✓" : "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-500">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}
