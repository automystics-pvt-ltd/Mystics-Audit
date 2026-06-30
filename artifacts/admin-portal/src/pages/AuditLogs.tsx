import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Shield, AlertTriangle, Info } from "lucide-react";

const SEV_ICON: Record<string, any> = {
  critical: AlertTriangle, warning: AlertTriangle, info: Info
};
const SEV_COLOR: Record<string, string> = {
  critical: "text-red-500", warning: "text-yellow-500", info: "text-blue-500"
};
const SEV_BADGE: Record<string, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function AuditLogs() {
  const [entityType, setEntityType] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page) });
  if (entityType !== "all") params.set("entityType", entityType);
  if (severity !== "all") params.set("severity", severity);
  if (action) params.set("action", action);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", entityType, severity, action, page],
    queryFn: () => api.get<any>(`/admin/audit-logs?${params}`),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Platform Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tamper-evident record of all admin actions</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Input placeholder="Filter by action…" className="h-8 text-sm pl-3" value={action} onChange={e => { setAction(e.target.value); setPage(1); }} />
        </div>
        <Select value={entityType} onValueChange={v => { setEntityType(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Entity type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {["tenant","user","admin_user","subscription","feature_flag","setting"].map(e => <SelectItem key={e} value={e} className="capitalize">{e.replace("_"," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={v => { setSeverity(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severity</SelectItem>
            {["info","warning","critical"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8"></th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entity</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Admin</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">IP</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({length:12}).map((_,i) => (
                <tr key={i} className="border-b">
                  {Array.from({length:7}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && data?.logs?.map((l: any) => {
                const Icon = SEV_ICON[l.severity] ?? Info;
                return (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Icon className={`w-3.5 h-3.5 ${SEV_COLOR[l.severity] ?? "text-muted-foreground"}`} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium">{l.action}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs capitalize">{l.entityType.replace("_"," ")}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-32">{l.entityRef ?? `#${l.entityId ?? "—"}`}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs">{l.adminEmail}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{l.adminRole}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.ipAddress ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`capitalize text-[10px] px-1.5 py-0 ${SEV_BADGE[l.severity] ?? ""}`}>{l.severity}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                  </tr>
                );
              })}
              {!isLoading && !data?.logs?.length && (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No audit events found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">{data.total} events</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
              <span className="text-xs px-2">{page} / {data.pages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page>=data.pages} onClick={()=>setPage(p=>p+1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
