import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Search, ChevronLeft, ChevronRight, UserCheck, UserX, Lock, Unlock,
  KeyRound, Plus, Shield, Eye, EyeOff, LayoutGrid, Building2, Filter,
} from "lucide-react";

const ALL_MODULES = ["dashboard","accounts","invoicing","gst","receivables","payables","bank","expenses","purchases","inventory","reports","audit","budgets","users","settings"];
const MODULE_LABELS: Record<string, string> = {
  dashboard:"Dashboard", accounts:"Chart of Accounts", invoicing:"Invoicing", gst:"GST Management",
  receivables:"Accounts Receivable", payables:"Accounts Payable", bank:"Bank & Cash",
  expenses:"Expenses", purchases:"Purchases", inventory:"Inventory",
  reports:"Financial Reports", audit:"Audit Trail", budgets:"Budget Management",
  users:"User Management", settings:"Settings",
};
const ROLES = ["Admin","Manager","Accountant","Auditor","Staff","Viewer"];

function StatusBadge({ u }: { u: any }) {
  if (u.isLocked) return <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><Lock className="w-2.5 h-2.5 mr-1" />Locked</Badge>;
  if (!u.isActive) return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactive</Badge>;
  return <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border border-emerald-200"><UserCheck className="w-2.5 h-2.5 mr-1" />Active</Badge>;
}

export default function Users() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tenantFilter, setTenantFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ tenantId: "", name: "", email: "", role: "Staff", department: "", phone: "" });

  // Reset password dialog
  const [resetUser, setResetUser] = useState<any>(null);
  const [tempPass, setTempPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Modules dialog
  const [modulesUser, setModulesUser] = useState<any>(null);
  const [selectedMods, setSelectedMods] = useState<string[]>([]);

  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("search", search);
  if (tenantFilter) params.set("tenantId", tenantFilter);
  if (statusFilter) params.set("status", statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, page, tenantFilter, statusFilter],
    queryFn: () => api.get<any>(`/admin/users?${params}`),
  });

  const { data: tenants } = useQuery({
    queryKey: ["admin-tenants-list"],
    queryFn: () => api.get<any>("/admin/tenants?page=1"),
    select: d => d.tenants ?? [],
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: any) => api.patch(`/admin/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast({ title: "User updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const lockMut = useMutation({
    mutationFn: ({ id, lock }: any) => lock ? api.post(`/admin/users/${id}/lock`, { reason: "Admin action" }) : api.post(`/admin/users/${id}/unlock`, {}),
    onSuccess: (_,v) => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast({ title: v.lock ? "Account locked" : "Account unlocked" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetMut = useMutation({
    mutationFn: (id: number) => api.post<any>(`/admin/users/${id}/reset-password`, {}),
    onSuccess: (d) => { setTempPass(d.tempPassword ?? ""); setShowPass(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: ({ tenantId, body }: any) => api.post<any>(`/admin/tenants/${tenantId}/users`, body),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setCreateOpen(false);
      if (d.tempPassword) { setTempPass(d.tempPassword); setResetUser({ name: createForm.name, email: createForm.email }); }
      setCreateForm({ tenantId: "", name: "", email: "", role: "Staff", department: "", phone: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const modulesMut = useMutation({
    mutationFn: ({ id, mods }: any) => api.patch(`/admin/users/${id}/modules`, { modulePermissions: Object.fromEntries(mods.map((m: string) => [m, "full"])) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setModulesUser(null); toast({ title: "Module access updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openModules = (u: any) => {
    const existing = u.modulePermissions ? Object.keys(u.modulePermissions) : ALL_MODULES;
    setSelectedMods(existing);
    setModulesUser(u);
  };

  const handleCreate = () => {
    if (!createForm.tenantId) { toast({ title: "Select a tenant", variant: "destructive" }); return; }
    createMut.mutate({ tenantId: createForm.tenantId, body: { name: createForm.name, email: createForm.email, role: createForm.role, department: createForm.department, phone: createForm.phone } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Platform Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Provision, manage and control all tenant users</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5">
          <Plus className="w-3.5 h-3.5" />Provision User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search name or email…" className="pl-8 h-8 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={tenantFilter || "all"} onValueChange={v => { setTenantFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-8 text-sm w-44"><Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="All tenants" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tenants</SelectItem>
            {tenants?.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.orgName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter || "all"} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-8 text-sm w-36"><Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="All status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
          </SelectContent>
        </Select>
        {data && <span className="self-center text-xs text-muted-foreground">{data.total} users</span>}
      </div>

      <Card className="border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tenant</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({length:8}).map((_,i) => (
                <tr key={i} className="border-b">
                  {Array.from({length:6}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && data?.users?.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${u.isLocked ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                        {(u.name || u.email)?.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium flex items-center gap-1">{u.name || "—"}{u.mustChangePassword && <span title="Must change password" className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-muted/60 rounded px-1.5 py-0.5">{u.tenantName ?? `Org ${u.orgId}`}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Select value={u.role ?? "Staff"} onValueChange={v => updateMut.mutate({ id: u.id, body: { role: v } })}>
                      <SelectTrigger className="h-7 w-28 text-xs border-0 bg-muted/50 focus:ring-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3"><StatusBadge u={u} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Module access" onClick={() => openModules(u)}>
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Reset password" onClick={() => { setResetUser(u); setTempPass(""); resetMut.mutate(u.id); }}>
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                      {u.isLocked
                        ? <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700" title="Unlock account" onClick={() => lockMut.mutate({ id: u.id, lock: false })}><Unlock className="w-3.5 h-3.5" /></Button>
                        : <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Lock account" onClick={() => lockMut.mutate({ id: u.id, lock: true })}><Lock className="w-3.5 h-3.5" /></Button>
                      }
                      <Switch
                        checked={u.isActive && !u.isLocked}
                        disabled={u.isLocked}
                        onCheckedChange={v => updateMut.mutate({ id: u.id, body: { isActive: v } })}
                        className="scale-75 ml-1"
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !data?.users?.length && (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">{data.total} total</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p-1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
              <span className="text-xs px-2">{page} / {data.pages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= data.pages} onClick={() => setPage(p => p+1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        )}
      </Card>

      {/* Provision User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Provision User</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs font-medium">Tenant *</Label>
              <Select value={createForm.tenantId} onValueChange={v => setCreateForm(f => ({ ...f, tenantId: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select tenant…" /></SelectTrigger>
                <SelectContent>{tenants?.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.orgName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Full Name *</Label>
                <Input className="mt-1 h-8 text-sm" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium">Email *</Label>
                <Input className="mt-1 h-8 text-sm" type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium">Role</Label>
                <Select value={createForm.role} onValueChange={v => setCreateForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Department</Label>
                <Input className="mt-1 h-8 text-sm" value={createForm.department} onChange={e => setCreateForm(f => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium">Phone</Label>
                <Input className="mt-1 h-8 text-sm" value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 rounded px-2 py-1.5">
              A temporary password will be generated and displayed after creation. The user must change it on first login.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={createMut.isPending} onClick={handleCreate}>{createMut.isPending ? "Creating…" : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temp Password Dialog */}
      <Dialog open={!!resetUser && !!tempPass} onOpenChange={() => { setResetUser(null); setTempPass(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-amber-500" />Temporary Password</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share this temporary password securely with <strong>{resetUser?.name || resetUser?.email}</strong>. They must change it on next login.</p>
            <div className="relative">
              <Input readOnly value={showPass ? tempPass : "•".repeat(tempPass.length)} className="h-9 font-mono text-sm pr-10" />
              <Button variant="ghost" size="icon" className="absolute right-1 top-0.5 h-7 w-7" onClick={() => setShowPass(s => !s)}>
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <Button size="sm" className="w-full" onClick={() => { navigator.clipboard.writeText(tempPass); toast({ title: "Copied to clipboard" }); }}>Copy Password</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Module Access Dialog */}
      <Dialog open={!!modulesUser} onOpenChange={() => setModulesUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-primary" />Module Access — {modulesUser?.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-2 max-h-72 overflow-y-auto">
            {ALL_MODULES.map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-muted/50">
                <Checkbox checked={selectedMods.includes(m)} onCheckedChange={v => setSelectedMods(prev => v ? [...prev, m] : prev.filter(x => x !== m))} />
                <span className="text-sm">{MODULE_LABELS[m]}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1 border-t">
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelectedMods(ALL_MODULES)}>All</Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelectedMods([])}>None</Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => setModulesUser(null)}>Cancel</Button>
            <Button size="sm" disabled={modulesMut.isPending} onClick={() => modulesMut.mutate({ id: modulesUser.id, mods: selectedMods })}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
