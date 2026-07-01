import { useListAuditLogs } from "@workspace/api-client-react";
import { useState } from "react";
import { useFY } from "@/contexts/fy-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Search } from "lucide-react";

const ACTION_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CREATE: "default", UPDATE: "secondary", DELETE: "destructive", VIEW: "outline",
};

const ENTITY_TYPES = ["", "Journal", "Invoice", "Customer", "Vendor", "Bill", "Payment", "User", "InventoryItem", "BankAccount", "GstFiling", "Budget"];
const ACTION_TYPES = ["", "CREATE", "UPDATE", "DELETE", "VIEW", "LOGIN"];

export default function AuditLogsList() {
  const { fy } = useFY();
  const [entityType, setEntityType] = useState("");
  const [actionType, setActionType] = useState("");
  const { data } = useListAuditLogs({
    from: fy.from,
    to: fy.to,
    ...(entityType ? { entityType } : {}),
    ...(actionType ? { actionType } : {}),
  } as any);
  const logs: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Trail</h1>
        <p className="text-muted-foreground text-sm">Complete log of all system activities for compliance and security</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Entity</Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>{ENTITY_TYPES.map(m => <SelectItem key={m} value={m}>{m || "All Types"}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Action</Label>
          <Select value={actionType} onValueChange={setActionType}>
            <SelectTrigger className="w-28"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map(a => <SelectItem key={a} value={a}>{a || "All"}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Changes</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{formatDate(l.timestamp)}</TableCell>
                <TableCell className="text-sm font-medium">{l.userName || l.userId || "System"}</TableCell>
                <TableCell><Badge variant={ACTION_COLORS[l.actionType] ?? "outline"}>{l.actionType}</Badge></TableCell>
                <TableCell className="text-sm">{l.entityType}</TableCell>
                <TableCell className="text-sm text-muted-foreground font-mono">{l.entityId ? `#${l.entityId}` : "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-48 truncate" title={l.description || l.changes || ""}>{l.description || l.changes || "—"}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{l.ipAddress || "—"}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No audit logs found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
