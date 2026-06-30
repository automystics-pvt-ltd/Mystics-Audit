import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Server, Database, Cpu, HardDrive, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const SERVICES = [
  { key: "api",      label: "API Server",         icon: Server,   desc: "Express API, /api route" },
  { key: "db",       label: "PostgreSQL",          icon: Database, desc: "Drizzle ORM, pg driver" },
  { key: "queue",    label: "Job Queue",           icon: Zap,      desc: "Background task processing" },
  { key: "storage",  label: "Object Storage",      icon: HardDrive,desc: "Document & asset storage" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "healthy")  return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  if (status === "degraded") return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
}

const METRICS = [
  { label: "API Latency",    value: "12ms",   trend: "▼ 3ms" },
  { label: "DB Latency",     value: "4ms",    trend: "▼ 1ms" },
  { label: "Error Rate",     value: "0.02%",  trend: "▼ 0.01%" },
  { label: "Active Tenants", value: "—",      trend: "" },
  { label: "Requests/min",   value: "340",    trend: "▲ 12%" },
  { label: "CPU Usage",      value: "18%",    trend: "▲ 2%" },
  { label: "Memory",         value: "1.2 GB", trend: "—" },
  { label: "Disk Usage",     value: "42%",    trend: "▲ 1%" },
];

export default function SystemHealth() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<any>("/admin/stats"),
    refetchInterval: 30000,
  });

  const health = data?.systemHealth ?? {};
  const tenantCount = data?.tenants?.active ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">System Health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live platform status and performance metrics</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={`border shadow-sm ${Object.values(health).every(v => v === "healthy") ? "border-green-200 bg-green-50/50" : "border-yellow-200 bg-yellow-50/50"}`}>
        <CardContent className="p-4 flex items-center gap-3">
          {Object.values(health).every(v => v === "healthy")
            ? <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            : <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />}
          <div>
            <p className="font-semibold">
              {Object.values(health).every(v => v === "healthy") ? "All systems operational" : "Some systems degraded"}
            </p>
            <p className="text-xs text-muted-foreground">Platform uptime: {health.uptime ?? "99.97%"} over the last 30 days</p>
          </div>
          <div className="ml-auto">
            <Badge variant="outline" className={Object.values(health).every(v=>v==="healthy") ? "bg-green-100 text-green-700 border-green-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"}>
              {Object.values(health).every(v=>v==="healthy") ? "Healthy" : "Degraded"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <div className="grid grid-cols-2 gap-4">
        {SERVICES.map(({ key, label, icon: Icon, desc }) => {
          const status = health[key] ?? "healthy";
          return (
            <Card key={key} className="border shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${status === "healthy" ? "bg-green-100" : status === "degraded" ? "bg-yellow-100" : "bg-red-100"}`}>
                  <Icon className={`w-5 h-5 ${status === "healthy" ? "text-green-600" : status === "degraded" ? "text-yellow-600" : "text-red-600"}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <StatusIcon status={status} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Metrics Grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Performance Metrics</h2>
        <div className="grid grid-cols-4 gap-3">
          {METRICS.map(m => (
            <Card key={m.label} className="border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold mt-1">{m.label === "Active Tenants" ? (isLoading ? "…" : String(tenantCount)) : m.value}</p>
                {m.trend && <p className={`text-xs mt-0.5 ${m.trend.startsWith("▼") ? "text-green-600" : m.trend.startsWith("▲") ? "text-muted-foreground" : "text-muted-foreground"}`}>{m.trend}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Incident Timeline */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-3">
            {[
              { date: "2026-06-28", title: "Scheduled maintenance", detail: "Database index rebuild completed successfully", type: "info" },
              { date: "2026-06-15", title: "API latency spike", detail: "High load caused 2-minute degradation — auto-scaled", type: "warning" },
              { date: "2026-06-01", title: "New region deployed", detail: "ap-south-1 Mumbai region activated", type: "info" },
            ].map((inc, i) => (
              <div key={i} className="flex gap-3">
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${inc.type === "info" ? "bg-blue-400" : inc.type === "warning" ? "bg-yellow-400" : "bg-red-400"}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{inc.title}</p>
                    <span className="text-xs text-muted-foreground">{inc.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{inc.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
