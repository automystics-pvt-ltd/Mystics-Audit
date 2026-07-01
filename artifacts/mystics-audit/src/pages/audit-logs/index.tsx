import { useListAuditLogs } from "@workspace/api-client-react";
import { useState } from "react";
import { useFY } from "@/contexts/fy-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { Search, Shield, RefreshCw, Filter, Eye, PlusCircle, Pencil, Trash2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_CFG: Record<string, { color: string; icon: React.ElementType }> = {
  CREATE: { color: "bg-emerald-100 text-emerald-700 border border-emerald-200", icon: PlusCircle },
  UPDATE: { color: "bg-blue-100 text-blue-700 border border-blue-200",           icon: Pencil },
  DELETE: { color: "bg-red-100 text-red-700 border border-red-200",              icon: Trash2 },
  VIEW:   { color: "bg-gray-100 text-gray-600 border border-gray-200",           icon: Eye },
  LOGIN:  { color: "bg-violet-100 text-violet-700 border border-violet-200",     icon: LogIn },
};

const ENTITY_TYPES = ["", "Journal", "Invoice", "Customer", "Vendor", "Bill", "Payment",
  "User", "InventoryItem", "BankAccount", "GstFiling", "Budget", "Expense", "Receipt"];
const ACTION_TYPES = ["", "CREATE", "UPDATE", "DELETE", "VIEW", "LOGIN"];

export default function AuditLogsList() {
  const { fy } = useFY();
  const [entityType, setEntityType] = useState("");
  const [actionType,  setActionType]  = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useListAuditLogs({
    from: fy.from,
    to:   fy.to,
    ...(entityType ? { entityType } : {}),
    ...(actionType ? { actionType }  : {}),
  } as any);

  const all: any[] = data ?? [];
  const logs = search
    ? all.filter(l =>
        l.userName?.toLowerCase().includes(search.toLowerCase()) ||
        l.entityType?.toLowerCase().includes(search.toLowerCase()) ||
        l.description?.toLowerCase().includes(search.toLowerCase())
      )
    : all;

  const createCount = all.filter(l => l.actionType === "CREATE").length;
  const updateCount = all.filter(l => l.actionType === "UPDATE").length;
  const deleteCount = all.filter(l => l.actionType === "DELETE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tamper-evident log of all system activities · {all.length} records · {fy.label}
          </p>
        </div>
        <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />Refresh
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Events",  value: all.length,    color: "bg-violet-50 border-violet-100", text: "text-violet-700" },
          { label: "Created",       value: createCount,   color: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
          { label: "Updated",       value: updateCount,   color: "bg-blue-50 border-blue-100",     text: "text-blue-700" },
          { label: "Deleted",       value: deleteCount,   color: "bg-red-50 border-red-100",       text: "text-red-700" },
        ].map(({ label, value, color, text }) => (
          <div key={label} className={cn("rounded-2xl border px-5 py-4", color)}>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={cn("text-2xl font-bold mt-0.5", text)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 h-8 rounded-xl text-sm"
            placeholder="Search user, entity, description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="h-8 rounded-xl text-sm w-40">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map(m => <SelectItem key={m} value={m}>{m || "All Entities"}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger className="h-8 rounded-xl text-sm w-36">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map(a => <SelectItem key={a} value={a}>{a || "All Actions"}</SelectItem>)}
          </SelectContent>
        </Select>
        {(entityType || actionType || search) && (
          <Button size="sm" variant="ghost" className="h-8 text-xs rounded-xl"
            onClick={() => { setEntityType(""); setActionType(""); setSearch(""); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[160px_140px_100px_120px_80px_1fr_120px] gap-0 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          {["Timestamp", "User", "Action", "Entity", "Record", "Description", "IP Address"].map(h => (
            <div key={h} className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</div>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-0">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 px-4 flex items-center gap-4 border-b border-gray-50 animate-pulse">
                <div className="h-3 w-36 bg-gray-100 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="h-5 w-16 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <Shield className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No audit logs found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || entityType || actionType ? "Try adjusting your filters" : "System events will appear here"}
            </p>
          </div>
        ) : (
          logs.map((l: any, i: number) => {
            const cfg = ACTION_CFG[l.actionType] ?? ACTION_CFG["VIEW"];
            const Icon = cfg.icon;
            return (
              <div key={i} className="grid grid-cols-[160px_140px_100px_120px_80px_1fr_120px] gap-0 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                <div className="text-xs font-mono text-gray-500 self-center whitespace-nowrap">{formatDate(l.timestamp)}</div>
                <div className="text-sm font-medium text-gray-800 self-center truncate pr-2">{l.userName || l.userId || "System"}</div>
                <div className="self-center">
                  <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", cfg.color)}>
                    <Icon className="w-3 h-3 flex-shrink-0" />
                    {l.actionType}
                  </span>
                </div>
                <div className="text-sm text-gray-600 self-center truncate pr-2">{l.entityType || "—"}</div>
                <div className="text-xs font-mono text-gray-400 self-center">{l.entityId ? `#${l.entityId}` : "—"}</div>
                <div className="text-sm text-gray-500 self-center truncate pr-2" title={l.description || l.changes || ""}>{l.description || l.changes || "—"}</div>
                <div className="text-xs font-mono text-gray-400 self-center">{l.ipAddress || "—"}</div>
              </div>
            );
          })
        )}

        {logs.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Showing {logs.length} of {all.length} records
            </span>
            <span className="text-xs text-gray-400">{fy.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
