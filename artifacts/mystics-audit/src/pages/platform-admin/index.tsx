import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Building2, Users, TrendingUp, AlertTriangle, Activity, ArrowUpRight, Clock, CheckCircle } from "lucide-react";
import PlatformLayout from "@/components/platform-layout";

interface PlatformStats {
  totalOrgs: number; activeOrgs: number; trialOrgs: number; suspendedOrgs: number;
  totalMrr: number; totalUsers: number;
  planBreakdown: { trial: number; starter: number; professional: number; enterprise: number };
}

const PLAN_COLOR: Record<string, string> = {
  trial:        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  starter:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  professional: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  enterprise:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STATUS_COLOR: Record<string, string> = {
  active:    "text-emerald-400",
  trial:     "text-yellow-400",
  suspended: "text-red-400",
  cancelled: "text-slate-500",
};

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function PlatformAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/platform-admin/stats").then(r => r.json()),
      fetch("/api/platform-admin/organizations").then(r => r.json()),
    ]).then(([s, o]) => { setStats(s); setOrgs(o); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <PlatformLayout>
      <div className="flex items-center justify-center h-full text-slate-400">Loading platform data…</div>
    </PlatformLayout>
  );

  return (
    <PlatformLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Manage all tenant organizations and subscriptions</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={<Building2 className="w-5 h-5 text-indigo-400" />} label="Total Organizations" value={String(stats?.totalOrgs ?? 0)} sub={`${stats?.activeOrgs} active · ${stats?.trialOrgs} trial`} />
          <KpiCard icon={<TrendingUp className="w-5 h-5 text-emerald-400" />} label="Monthly Revenue" value={fmt(stats?.totalMrr ?? 0)} sub="Annualized: " sub2={fmt((stats?.totalMrr ?? 0) * 12)} />
          <KpiCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Total Users" value={String(stats?.totalUsers ?? 0)} sub="Across all orgs" />
          <KpiCard icon={<AlertTriangle className="w-5 h-5 text-yellow-400" />} label="Needs Attention" value={String((stats?.trialOrgs ?? 0) + (stats?.suspendedOrgs ?? 0))} sub={`${stats?.suspendedOrgs} suspended`} />
        </div>

        {/* Plan breakdown */}
        <div className="grid grid-cols-4 gap-4">
          {["trial", "starter", "professional", "enterprise"].map(plan => (
            <div key={plan} className={`rounded-xl border p-4 ${PLAN_COLOR[plan]}`}>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{plan}</p>
              <p className="text-3xl font-bold">{(stats?.planBreakdown as any)?.[plan] ?? 0}</p>
              <p className="text-xs opacity-60 mt-1">
                {plan === "trial" ? "Free" : plan === "starter" ? "₹2,999/mo" : plan === "professional" ? "₹7,999/mo" : "₹19,999/mo"}
              </p>
            </div>
          ))}
        </div>

        {/* Orgs table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Organizations
            </h2>
            <Link href="/platform-admin/organizations" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Organization</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Plan</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Users</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">MRR</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {orgs.map(org => (
                  <tr key={org.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{org.name}</div>
                      <div className="text-xs text-slate-500">{org.city}, {org.state}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${PLAN_COLOR[org.plan]}`}>
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white">{org.usersCount}</span>
                      <span className="text-slate-500">/{org.maxUsers === 999 ? "∞" : org.maxUsers}</span>
                    </td>
                    <td className="px-4 py-3 text-white">{org.mrr > 0 ? fmt(org.mrr) : <span className="text-slate-500">Free</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium capitalize ${STATUS_COLOR[org.status]}`}>
                        {org.status === "active" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {org.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/platform-admin/organizations/${org.id}`} className="text-indigo-400 hover:text-indigo-300 text-xs font-medium">Manage →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}

function KpiCard({ icon, label, value, sub, sub2 }: { icon: React.ReactNode; label: string; value: string; sub: string; sub2?: string }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-slate-400 text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500">{sub}{sub2 && <span className="text-slate-400"> {sub2}</span>}</p>
    </div>
  );
}
