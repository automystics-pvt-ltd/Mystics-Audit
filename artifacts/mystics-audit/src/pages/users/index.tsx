import { useState } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { Plus, Shield, Lock, Unlock, KeyRound, AlertTriangle, Eye, EyeOff, Users } from "lucide-react";

const ROLE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  Admin: "default", Manager: "secondary", Accountant: "outline",
};

export default function UsersList() {
  const { data, refetch } = useListUsers({});
  const users: any[] = data ?? [];
  const qc = useQueryClient();

  const [resetUser, setResetUser] = useState<any>(null);
  const [tempPass, setTempPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [confirmLock, setConfirmLock] = useState<{ user: any; lock: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState<any>(null);

  // Fetch license info for this tenant (reuse users count vs org limit)
  const { data: license } = useQuery({
    queryKey: ["tenant-license"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      if (!res.ok) return null;
      const companies = await res.json();
      const org = companies?.[0];
      if (!org?.id) return null;
      const lr = await fetch(`/api/admin/tenants/${org.id}/license`);
      if (!lr.ok) return null;
      return lr.json();
    },
  });

  const lockMut = useMutation({
    mutationFn: async ({ id, lock }: { id: number; lock: boolean }) => {
      const res = await fetch(`/api/users/${id}/${lock ? "lock" : "unlock"}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ reason:"Admin action" }) });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["listUsers"] }); refetch(); },
  });

  const resetMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}/reset-password`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({}) });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (d, id) => { setResetUser(users.find(u => u.id === id)); setTempPass(d.tempPassword ?? ""); setShowPass(false); },
  });

  const maxUsers = license?.maxUsers ?? 0;
  const currentUsers = users.length;
  const utilPct = maxUsers > 0 ? Math.round((currentUsers/maxUsers)*100) : 0;
  const atLimit = maxUsers > 0 && currentUsers >= maxUsers;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-muted-foreground text-sm">{users.length} users · Manage access and permissions</p>
        </div>
        {atLimit
          ? <Button disabled title="License limit reached" className="opacity-60"><Plus className="w-4 h-4 mr-2" />Add User</Button>
          : <Link href="/users/new"><Button><Plus className="w-4 h-4 mr-2" />Add User</Button></Link>
        }
      </div>

      {/* License bar */}
      {maxUsers > 0 && (
        <Card className={`border ${atLimit ? "border-destructive/40 bg-destructive/5" : utilPct >= 80 ? "border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">License Utilization</span>
                {atLimit && <Badge variant="destructive" className="text-[10px] px-1.5">Limit Reached</Badge>}
                {!atLimit && utilPct >= 80 && <Badge className="text-[10px] px-1.5 bg-amber-100 text-amber-700 border-amber-300">Almost Full</Badge>}
              </div>
              <span className="text-sm font-semibold">{currentUsers} / {maxUsers} seats</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${atLimit ? "bg-destructive" : utilPct>=80 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${Math.min(utilPct,100)}%` }}
              />
            </div>
            {atLimit && (
              <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                License limit reached. Contact your administrator to increase the user limit or upgrade your plan.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>2FA</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u: any) => (
              <TableRow key={u.id} className={`hover:bg-muted/50 ${u.isLocked ? "opacity-75" : ""}`}>
                <TableCell>
                  <Link href={`/users/${u.id}`} className="font-medium text-primary hover:underline flex items-center gap-1.5">
                    {u.isLocked && <Lock className="w-3 h-3 text-destructive flex-shrink-0" />}
                    {u.name}
                    {u.mustChangePassword && <span title="Must change password" className="w-2 h-2 rounded-full bg-amber-400 inline-block flex-shrink-0" />}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_COLORS[u.role] ?? "outline"} className="flex items-center gap-1 w-fit">
                    {u.role === "Admin" && <Shield className="w-3 h-3" />}{u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.department || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.lastLogin ? formatDate(u.lastLogin) : "Never"}</TableCell>
                <TableCell>
                  {u.isLocked
                    ? <Badge variant="destructive" className="text-xs"><Lock className="w-2.5 h-2.5 mr-1" />Locked</Badge>
                    : <Badge variant={u.isActive ? "default" : "destructive"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  }
                </TableCell>
                <TableCell>{u.isMfaEnabled ? <Badge variant="outline" className="text-green-600 border-green-600">Enabled</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Reset password" onClick={() => setConfirmReset(u)}>
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    {u.isLocked
                      ? <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Unlock" onClick={() => setConfirmLock({ user: u, lock: false })}><Unlock className="w-3.5 h-3.5" /></Button>
                      : <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" title="Lock" onClick={() => setConfirmLock({ user: u, lock: true })}><Lock className="w-3.5 h-3.5" /></Button>
                    }
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No users found. Add your first user to get started.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      {/* Lock / Unlock confirm */}
      <ConfirmDialog
        open={!!confirmLock}
        onOpenChange={o => !o && setConfirmLock(null)}
        title={confirmLock?.lock ? "Lock Account" : "Unlock Account"}
        description={
          confirmLock?.lock
            ? `Lock ${confirmLock.user?.name}'s account? They will be immediately signed out and unable to log in.`
            : `Unlock ${confirmLock?.user?.name}'s account? They will be able to sign in again.`
        }
        confirmLabel={confirmLock?.lock ? "Lock Account" : "Unlock Account"}
        variant={confirmLock?.lock ? "destructive" : "default"}
        onConfirm={() => { lockMut.mutate({ id: confirmLock!.user.id, lock: confirmLock!.lock }); setConfirmLock(null); }}
        loading={lockMut.isPending}
      />

      {/* Reset password confirm */}
      <ConfirmDialog
        open={!!confirmReset}
        onOpenChange={o => !o && setConfirmReset(null)}
        title="Reset Password"
        description={`Generate a temporary password for ${confirmReset?.name}? They will be required to change it on next login.`}
        confirmLabel="Reset Password"
        variant="warning"
        onConfirm={() => { resetMut.mutate(confirmReset.id); setConfirmReset(null); }}
        loading={resetMut.isPending}
      />

      {/* Temp Password Dialog */}
      <Dialog open={!!tempPass} onOpenChange={() => { setTempPass(""); setResetUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-amber-500" />Temporary Password</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Share this temporary password securely with <strong>{resetUser?.name}</strong>. They must change it on next login.
            </p>
            <div className="relative">
              <Input readOnly value={showPass ? tempPass : "•".repeat(tempPass.length)} className="font-mono pr-10" />
              <Button variant="ghost" size="icon" className="absolute right-1 top-0.5 h-7 w-7" onClick={() => setShowPass(s=>!s)}>
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <Button size="sm" className="w-full" onClick={() => navigator.clipboard.writeText(tempPass)}>Copy Password</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
