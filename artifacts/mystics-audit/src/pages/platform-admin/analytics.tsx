import { useEffect, useState } from "react";
import PlatformLayout from "@/components/platform-layout";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, DollarSign, Users, Building2, AlertTriangle,
  ArrowUpRight, Percent, RefreshCw,
} from "lucide-react";

function fmt(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }
function pct(n: number) { return n.toFixed(1) + "%"; }

const PLAN_COLORS: Record<string, string> = {
  trial: "#F59E0B", starter: "#3B82F6", professional: "#8B5CF6", enterprise: "#10B981",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm shadow-xl">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-400 capitalize">{p.dataKey}:</span>
          <span className="text-white font-semibold">{typeof p.value === "number" && p.value > 1000 ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function PlatformAnalytics() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const load = () => {
    setLoading(true);
    fetch("/api/platform-admin/analytics").then(r => r.json())
      .then(d => { setData(d); setLastUpdated(new Date()); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading || !data) {
    return (
      <PlatformLayout>
        <div className="p-8 space-y-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl" />
          ))}
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <div className="p-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
            <p className="text-slate-400 text-sm mt-1">Revenue, growth, and tenant health metrics</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white text-sm transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={<DollarSign className="w-5 h-5 text-emerald-400" />} label="Monthly Recurring Revenue"
            value={fmt(data.totalMrr)} sub={`ARR: ${fmt(data.arr)}`} color="emerald" />
          <KpiCard icon={<Building2 className="w-5 h-5 text-indigo-400" />} label="Total Tenants"
            value={String(data.totalOrgs)} sub={`${data.activeOrgs} active · ${data.trialOrgs} trial`} color="indigo" />
          <KpiCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Total Users"
            value={String(data.totalUsers)} sub={`Across ${data.totalOrgs} tenants`} color="blue" />
          <KpiCard icon={<Percent className="w-5 h-5 text-purple-400" />} label="Conversion Rate"
            value={pct(data.conversionRate)} sub={`${data.churnRate?.toFixed(1)}% churn`} color="purple" />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue Collected", value: fmt(data.totalCollected), icon: <TrendingUp className="w-4 h-4" />, color: "text-emerald-400" },
            { label: "Avg Revenue per Tenant", value: fmt(data.avgRevenuePerUser), icon: <DollarSign className="w-4 h-4" />, color: "text-blue-400" },
            { label: "Suspended / Churned", value: String(data.churned), icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-400" },
            { label: "Trial Tenants", value: String(data.trialOrgs), icon: <ArrowUpRight className="w-4 h-4" />, color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className={`flex items-center gap-2 ${s.color} mb-2`}>{s.icon}<span className="text-xs font-medium">{s.label}</span></div>
              <p className="text-white text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-white font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Monthly Revenue (Last 12 Months)
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.monthlyRevenue}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => "₹" + (v / 1000).toFixed(0) + "k"} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5}
                fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan distribution + breakdown */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-6">Plan Distribution</h2>
            <div className="flex gap-4 items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={data.planDist} dataKey="count" cx="50%" cy="50%" innerRadius={55} outerRadius={90}>
                    {data.planDist.map((p: any) => (
                      <Cell key={p.plan} fill={PLAN_COLORS[p.plan] ?? "#6366f1"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {data.planDist.map((p: any) => (
                  <div key={p.plan} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PLAN_COLORS[p.plan] }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm capitalize font-medium">{p.plan}</span>
                        <span className="text-white font-bold text-sm">{p.count}</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full mt-1">
                        <div className="h-1 rounded-full transition-all"
                          style={{ width: `${data.totalOrgs > 0 ? (p.count / data.totalOrgs) * 100 : 0}%`, background: PLAN_COLORS[p.plan] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h2 className="text-white font-semibold mb-6">Revenue by Plan</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.planDist} margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="plan" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v === 0 ? "₹0" : "₹" + (v / 1000).toFixed(0) + "k"} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="mrr" radius={[4, 4, 0, 0]}>
                  {data.planDist.map((p: any) => (
                    <Cell key={p.plan} fill={PLAN_COLORS[p.plan] ?? "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="text-slate-600 text-xs text-right">Last updated: {lastUpdated.toLocaleTimeString("en-IN")}</p>
      </div>
    </PlatformLayout>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 border-emerald-500/20",
    indigo: "bg-indigo-500/10 border-indigo-500/20",
    blue: "bg-blue-500/10 border-blue-500/20",
    purple: "bg-purple-500/10 border-purple-500/20",
  };
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color] ?? "bg-slate-800 border-slate-700"}`}>
      <div className="flex items-center gap-2 mb-3 opacity-80">{icon}<span className="text-xs font-medium text-slate-300">{label}</span></div>
      <p className="text-white text-2xl font-bold">{value}</p>
      <p className="text-slate-400 text-xs mt-1">{sub}</p>
    </div>
  );
}
