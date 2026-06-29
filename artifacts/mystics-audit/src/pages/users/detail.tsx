import { useGetUser, useUpdateUser, getGetUserQueryKey, getListUsersQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { ArrowLeft, Shield } from "lucide-react";

const PERMS = ["view", "create", "edit", "delete"];
const MODULES = ["Dashboard", "Chart of Accounts", "Invoicing", "GST", "AR", "AP", "Bank", "Expenses"];

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: user } = useGetUser(Number(id));
  const updateMutation = useUpdateUser();
  const u = user as any;

  const handleToggleActive = () => {
    updateMutation.mutate({ id: Number(id), data: { isActive: !u.isActive } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetUserQueryKey(Number(id)) }); qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); },
    });
  };

  if (!u) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/users"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold">{u.name}</h1>
            <p className="text-muted-foreground text-sm">{u.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={u.isActive ? "default" : "destructive"}>{u.isActive ? "Active" : "Suspended"}</Badge>
          <Button variant={u.isActive ? "destructive" : "default"} size="sm" onClick={handleToggleActive} disabled={updateMutation.isPending}>
            {u.isActive ? "Suspend" : "Activate"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Role", value: u.role },
              { label: "Department", value: u.department || "—" },
              { label: "Phone", value: u.phone || "—" },
              { label: "Last Login", value: u.lastLogin ? formatDate(u.lastLogin) : "Never" },
              { label: "2FA", value: u.twoFactorEnabled ? "Enabled" : "Disabled" },
              { label: "Active Sessions", value: String(u.activeSessions ?? 0) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium flex items-center gap-1">
                  {label === "Role" && u.role === "Admin" && <Shield className="w-3 h-3" />}
                  {value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Module Permissions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {MODULES.map(mod => {
                const perm = (u.permissions ?? {})[mod] ?? [];
                return (
                  <div key={mod} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{mod}</span>
                    <div className="flex gap-1">
                      {PERMS.map(p => (
                        <span key={p} className={`text-xs px-1.5 py-0.5 rounded ${perm.includes(p) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {p.charAt(0).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {(u.recentActivity ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Module</TableHead><TableHead>Details</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {u.recentActivity.map((a: any, i: number) => (
                <TableRow key={i}>
                  <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                  <TableCell className="text-sm">{a.module}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.details}</TableCell>
                  <TableCell className="text-sm">{formatDate(a.timestamp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
