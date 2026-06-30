import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmtINR, fmtNum, fmtDate, relTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, TrendingUp, Activity, Server, CheckCircle2, AlertCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface Stats {
  tenants: { total: number; active: number; trial: number; suspended: number; enterprise: number; totalMrr: number };
  users: { total: number; active: number };
  payments: { totalRevenue: number; monthlyRevenue: number; pendingCount: number };
  features: { total: number; enabled: number };
  audit: { total: number };
  recentTenants: any[];
  recentAudit: any[];
  planBreakdown: { plan: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  systemHealth: { api: string; db: string; queue: string; storage: string; uptime: string };
}

const PLAN_COLORS: Record<string,string> = {
  trial: "#94a3b8", starter: "#60a5fa", growth: "#34d399", professional: "#a78bfa", enterprise: "#f59e0b"
};
const STATUS_COLORS: Record<string,string> = {
  active: "#34d399", trial: "#60a5fa", suspended: "#f87171", cancelled: "#94a3b8", expired: "#fbbf24"
};

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ background: color + "20" }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthDot({ status }: { status: string }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${status === "healthy" ? "bg-green-500" : status === "degraded" ? "bg-yellow-500" : "bg-red-500"}`} />
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats"),
    refetchInterval: 30000,
  });

  if (isLoading) return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  const s = data!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time metrics across all tenant organisations</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Total Tenants" value={fmtNum(s.tenants.total)} sub={`${s.tenants.active} active · ${s.tenants.trial} trial`} color="#6366f1" />
        <KpiCard icon={TrendingUp} label="Total MRR" value={fmtINR(s.tenants.totalMrr)} sub={`${fmtINR(s.payments.monthlyRevenue)} this month`} color="#10b981" />
        <KpiCard icon={Users} label="Total Users" value={fmtNum(s.users.total)} sub={`${s.users.active} active`} color="#3b82f6" />
        <KpiCard icon={Activity} label="Platform Uptime" value={s.systemHealth.uptime} sub="Last 30 days" color="#f59e0b" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Plan Breakdown */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Tenants by Plan</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={s.planBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="plan" paddingAngle={2}>
                  {s.planBreakdown.map((e, i) => (
                    <Cell key={i} fill={PLAN_COLORS[e.plan] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                <Tooltip formatter={(v) => [`${v} tenants`]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Tenant Status</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={s.statusBreakdown} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {s.statusBreakdown.map((e, i) => (
                    <Cell key={i} fill={STATUS_COLORS[e.status] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">System Health</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {Object.entries(s.systemHealth).filter(([k]) => k !== "uptime").map(([svc, status]) => (
              <div key={svc} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center text-sm capitalize">
                  <HealthDot status={status} />
                  {svc}
                </div>
                <Badge variant="outline" className={`text-xs font-medium ${status === "healthy" ? "text-green-600 border-green-200 bg-green-50" : "text-yellow-600 border-yellow-200 bg-yellow-50"}`}>
                  {status}
                </Badge>
              </div>
            ))}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <span className="text-sm font-semibold text-green-600">{s.systemHealth.uptime}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Recent Tenants */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Tenants</CardTitle>
            <Badge variant="secondary" className="text-xs">{s.tenants.total} total</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {s.recentTenants.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {t.orgName?.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.orgName}</p>
                  <p className="text-xs text-muted-foreground">{t.contactEmail}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">{t.plan}</Badge>
                  <span className="text-[10px] text-muted-foreground">{relTime(t.createdAt)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Audit */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Platform Audit Log</CardTitle>
            <Badge variant="secondary" className="text-xs">{s.audit.total} events</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {s.recentAudit.length === 0 && (
              <p className="text-xs text-muted-foreground px-4 py-4">No audit events yet</p>
            )}
            {s.recentAudit.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-0">
                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.severity === "critical" ? "bg-red-500" : a.severity === "warning" ? "bg-yellow-500" : "bg-green-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-medium text-foreground">{a.action}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.entityRef ?? a.entityType} · {a.adminEmail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{relTime(a.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
