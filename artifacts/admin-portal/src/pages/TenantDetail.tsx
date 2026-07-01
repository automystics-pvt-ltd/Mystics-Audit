import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Building2, Users, CreditCard, Shield, Lock, Unlock, KeyRound,
  AlertTriangle, CheckCircle2, Clock, Ban, LayoutGrid, Plus, Eye, EyeOff,
  RefreshCw, Zap, Mail, Tag, Save,
} from "lucide-react";

const ALL_MODULES = ["dashboard","accounts","invoicing","gst","receivables","payables","bank","expenses","purchases","inventory","reports","audit","budgets","users","settings"];
const MODULE_LABELS: Record<string,string> = {
  dashboard:"Dashboard", accounts:"Chart of Accounts", invoicing:"Invoicing", gst:"GST Management",
  receivables:"Accounts Receivable", payables:"Accounts Payable", bank:"Bank & Cash",
  expenses:"Expenses", purchases:"Purchases", inventory:"Inventory",
  reports:"Financial Reports", audit:"Audit Trail", budgets:"Budget Management",
  users:"User Management", settings:"Settings",
};
const PLAN_COLORS: Record<string,string> = {
  trial:"bg-slate-100 text-slate-700", starter:"bg-blue-100 text-blue-700",
  growth:"bg-violet-100 text-violet-700", professional:"bg-indigo-100 text-indigo-700",
  enterprise:"bg-amber-100 text-amber-700",
};
const STATUS_ICON: Record<string,any> = {
  active:<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  trial:<Clock className="w-3.5 h-3.5 text-amber-500" />,
  suspended:<Ban className="w-3.5 h-3.5 text-destructive" />,
};
const ROLES = ["Admin","Manager","Accountant","Auditor","Staff","Viewer"];

export default function TenantDetail() {
  const [, params] = useRoute("/tenants/:id");
  const id = Number(params?.id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [maxUsersEdit, setMaxUsersEdit] = useState("");
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [emailConfigAllowed, setEmailConfigAllowed] = useState<boolean | null>(null);
  const [provForm, setProvForm] = useState({ name:"", email:"", role:"Staff", department:"" });
  const [tempPass, setTempPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [resetUserId, setResetUserId] = useState<number|null>(null);

  /* Custom pricing state */
  const [cpEnabled, setCpEnabled] = useState<boolean | null>(null);
  const [cpPlans, setCpPlans] = useState<Record<string, { monthlyPrice: string; annualPrice: string }>>({
    starter:      { monthlyPrice: "", annualPrice: "" },
    professional: { monthlyPrice: "", annualPrice: "" },
    enterprise:   { monthlyPrice: "", annualPrice: "" },
  });

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["admin-tenant", id],
    queryFn: () => api.get<any>(`/admin/tenants/${id}`),
    enabled: !!id,
  });

  const { data: license, refetch: refetchLicense } = useQuery({
    queryKey: ["admin-tenant-license", id],
    queryFn: () => api.get<any>(`/admin/tenants/${id}/license`),
    enabled: !!id,
  });

  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-tenant-users", id],
    queryFn: () => api.get<any>(`/admin/tenants/${id}/users`),
    enabled: !!id,
  });

  const updateMut = useMutation({
    mutationFn: (body: any) => api.patch(`/admin/tenants/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tenant", id] }); toast({ title: "Tenant updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const licenseMut = useMutation({
    mutationFn: (maxUsers: number) => api.patch(`/admin/tenants/${id}/license`, { maxUsers }),
    onSuccess: () => { refetchLicense(); qc.invalidateQueries({ queryKey: ["admin-tenant", id] }); toast({ title: "License limit updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const modulesMut = useMutation({
    mutationFn: (enabledModules: string[]) => api.patch(`/admin/tenants/${id}/modules`, { enabledModules }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tenant-license", id] }); toast({ title: "Module access updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const suspendMut = useMutation({
    mutationFn: (reason: string) => api.post(`/admin/tenants/${id}/suspend`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tenant", id] }); refetchUsers(); toast({ title: "Tenant suspended — all users locked" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const activateMut = useMutation({
    mutationFn: () => api.post(`/admin/tenants/${id}/activate`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tenant", id] }); refetchUsers(); toast({ title: "Tenant activated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const lockUserMut = useMutation({
    mutationFn: ({ userId, lock }: any) => lock ? api.post(`/admin/users/${userId}/lock`, { reason: "Admin action" }) : api.post(`/admin/users/${userId}/unlock`, {}),
    onSuccess: () => { refetchUsers(); refetchLicense(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetPassMut = useMutation({
    mutationFn: (userId: number) => api.post<any>(`/admin/users/${userId}/reset-password`, {}),
    onSuccess: (d, userId) => { setResetUserId(userId); setTempPass(d.tempPassword ?? ""); setShowPass(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { data: emailConfig, refetch: refetchEmailConfig } = useQuery({
    queryKey: ["admin-tenant-email-config", id],
    queryFn: () => api.get<any>(`/admin/tenants/${id}/email-config`),
    enabled: !!id,
  });

  const emailConfigMut = useMutation({
    mutationFn: (configAllowed: boolean) => api.patch(`/admin/tenants/${id}/email-config`, { configAllowed }),
    onSuccess: (_, configAllowed) => {
      setEmailConfigAllowed(configAllowed);
      refetchEmailConfig();
      toast({ title: configAllowed ? "Email configuration enabled for this tenant" : "Email configuration disabled" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  /* Custom pricing query + mutation */
  const { data: customPricingData, refetch: refetchCp } = useQuery({
    queryKey: ["admin-tenant-custom-pricing", id],
    queryFn: () => api.get<any>(`/admin/tenants/${id}/custom-pricing`),
    enabled: !!id,
  });

  const cpMut = useMutation({
    mutationFn: (body: any) => api.put(`/admin/tenants/${id}/custom-pricing`, body),
    onSuccess: () => { refetchCp(); toast({ title: "Custom pricing saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  /* Sync server data → local state once loaded */
  const serverCpEnabled = customPricingData?.enabled ?? false;
  const isEnabled = cpEnabled ?? serverCpEnabled;

  const provisionMut = useMutation({
    mutationFn: (body: any) => api.post<any>(`/admin/tenants/${id}/users`, body),
    onSuccess: (d) => {
      refetchUsers(); refetchLicense(); setProvisionOpen(false);
      if (d.tempPassword) { setTempPass(d.tempPassword); setResetUserId(-1); setShowPass(false); }
      setProvForm({ name:"", email:"", role:"Staff", department:"" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-3">{Array.from({length:4}).map((_,i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}</div>;
  if (!tenant) return <div className="text-center py-20 text-muted-foreground">Tenant not found</div>;

  const enabledMods: string[] = license?.enabledModules ?? [];
  const utilPct = license?.utilization ?? 0;
  const utilColor = utilPct >= 90 ? "bg-destructive" : utilPct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/tenants"><Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{tenant.orgName}</h1>
            <Badge className={`text-[10px] px-1.5 ${PLAN_COLORS[tenant.plan] ?? ""}`}>{tenant.plan?.toUpperCase()}</Badge>
            <div className="flex items-center gap-1 text-xs">{STATUS_ICON[tenant.status]}<span className="capitalize">{tenant.status}</span></div>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{tenant.contactEmail} · {tenant.city ?? ""}  {tenant.state ?? ""}</p>
        </div>
        <div className="flex gap-2">
          {tenant.status !== "suspended"
            ? <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => suspendMut.mutate("Admin action")} disabled={suspendMut.isPending}><Ban className="w-3.5 h-3.5 mr-1" />Suspend</Button>
            : <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => activateMut.mutate()} disabled={activateMut.isPending}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Activate</Button>
          }
          <Select value={tenant.plan} onValueChange={plan => updateMut.mutate({ plan })}>
            <SelectTrigger className="h-8 text-xs w-36"><Zap className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {["trial","starter","growth","professional","enterprise"].map(p => <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Licensed Users", value: license ? `${license.currentUsers} / ${license.maxUsers}` : "—", icon:<Users className="w-4 h-4" />, color:"text-primary" },
          { label:"Active Users", value: license?.activeUsers ?? "—", icon:<Shield className="w-4 h-4" />, color:"text-emerald-600" },
          { label:"Locked Users", value: license?.lockedUsers ?? "—", icon:<Lock className="w-4 h-4" />, color:"text-destructive" },
          { label:"Modules Enabled", value: `${enabledMods.length} / ${ALL_MODULES.length}`, icon:<LayoutGrid className="w-4 h-4" />, color:"text-violet-600" },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className={s.color}>{s.icon}</span>
            </div>
            <p className="text-xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="license">
        <TabsList className="h-8">
          <TabsTrigger value="license" className="text-xs h-7">License & Modules</TabsTrigger>
          <TabsTrigger value="users" className="text-xs h-7">Users ({usersData?.users?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs h-7">Custom Pricing</TabsTrigger>
          <TabsTrigger value="email" className="text-xs h-7">Email Config</TabsTrigger>
          <TabsTrigger value="info" className="text-xs h-7">Details</TabsTrigger>
        </TabsList>

        {/* License & Modules Tab */}
        <TabsContent value="license" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* License utilization */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />License Utilization</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>{license?.currentUsers ?? 0} of {license?.maxUsers ?? 0} seats used</span>
                    <span className={`font-semibold ${utilPct>=90?"text-destructive":utilPct>=70?"text-amber-600":"text-emerald-600"}`}>{utilPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${utilColor}`} style={{ width: `${Math.min(utilPct,100)}%` }} />
                  </div>
                  {utilPct >= 90 && <p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />License limit almost reached</p>}
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Adjust Max Users</Label>
                    <Input type="number" className="mt-1 h-8 text-sm" min={license?.currentUsers ?? 1}
                      placeholder={String(license?.maxUsers ?? "")}
                      value={maxUsersEdit} onChange={e => setMaxUsersEdit(e.target.value)} />
                  </div>
                  <Button size="sm" className="h-8" disabled={!maxUsersEdit || licenseMut.isPending}
                    onClick={() => { licenseMut.mutate(parseInt(maxUsersEdit)); setMaxUsersEdit(""); }}>
                    {licenseMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Update"}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between"><span>Available seats</span><span className="font-medium">{license?.availableSeats ?? 0}</span></div>
                  <div className="flex justify-between"><span>Plan</span><span className="font-medium capitalize">{license?.planName ?? tenant.plan}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Module access */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-primary" />Module Access Control</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {ALL_MODULES.map(m => {
                    const enabled = enabledMods.includes(m);
                    return (
                      <div key={m} className="flex items-center justify-between py-1 border-b border-dashed border-muted last:border-0">
                        <span className="text-sm">{MODULE_LABELS[m]}</span>
                        <Switch
                          checked={enabled}
                          onCheckedChange={v => {
                            const next = v ? [...enabledMods, m] : enabledMods.filter(x => x !== m);
                            modulesMut.mutate(next);
                          }}
                          className="scale-75"
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-medium">Tenant Users</span>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setProvisionOpen(true)}>
                <Plus className="w-3.5 h-3.5" />Add User
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Last Login</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData?.users?.map((u: any) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${u.isLocked?"bg-destructive/10 text-destructive":"bg-primary/10 text-primary"}`}>
                            {(u.name||u.email)?.slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px] px-1.5">{u.role}</Badge></td>
                      <td className="px-4 py-2.5">
                        {u.isLocked
                          ? <Badge variant="destructive" className="text-[10px] px-1.5"><Lock className="w-2.5 h-2.5 mr-1" />Locked</Badge>
                          : u.isActive ? <Badge className="text-[10px] px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>
                          : <Badge variant="secondary" className="text-[10px] px-1.5">Inactive</Badge>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.lastLogin ? fmtDate(u.lastLogin) : "Never"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Reset password" onClick={() => resetPassMut.mutate(u.id)}>
                            <KeyRound className="w-3 h-3" />
                          </Button>
                          {u.isLocked
                            ? <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600" title="Unlock" onClick={() => lockUserMut.mutate({ userId: u.id, lock: false })}><Unlock className="w-3 h-3" /></Button>
                            : <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Lock" onClick={() => lockUserMut.mutate({ userId: u.id, lock: true })}><Lock className="w-3 h-3" /></Button>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!usersData?.users?.length && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No users yet</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Custom Pricing Tab */}
        <TabsContent value="pricing" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />Custom Pricing for {tenant.orgName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Override standard plan prices for this tenant. When enabled, they will see and pay these custom amounts instead of the global pricing. Leave a field blank to keep the standard price for that plan.
              </p>

              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 border rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isEnabled ? "bg-amber-100" : "bg-gray-200"}`}>
                    <Tag className={`w-5 h-5 ${isEnabled ? "text-amber-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Custom Pricing</p>
                    <p className="text-xs text-muted-foreground">
                      {isEnabled ? "Tenant sees custom prices below" : "Tenant sees standard global prices"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={v => setCpEnabled(v)}
                />
              </div>

              {/* Per-plan price inputs */}
              {([
                { slug: "starter", label: "Starter", stdMonthly: 2999, stdAnnual: 28790 },
                { slug: "professional", label: "Professional", stdMonthly: 7999, stdAnnual: 76790 },
                { slug: "enterprise", label: "Enterprise", stdMonthly: 19999, stdAnnual: 191990 },
              ] as const).map(plan => {
                const serverOverride = customPricingData?.plans?.[plan.slug];
                const localVals = cpPlans[plan.slug];
                const monthlyVal = localVals.monthlyPrice !== "" ? localVals.monthlyPrice : (serverOverride?.monthlyPrice ?? "");
                const annualVal  = localVals.annualPrice  !== "" ? localVals.annualPrice  : (serverOverride?.annualPrice  ?? "");
                return (
                  <div key={plan.slug} className={`border rounded-xl p-4 space-y-3 ${!isEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{plan.label}</p>
                      {serverOverride && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Custom active</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Monthly Price (₹)</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                          <Input type="number" min={0} className="h-8 text-sm pl-6"
                            placeholder={`${plan.stdMonthly} (standard)`}
                            value={monthlyVal}
                            onChange={e => setCpPlans(prev => ({ ...prev, [plan.slug]: { ...prev[plan.slug], monthlyPrice: e.target.value } }))} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Annual Price (₹)</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                          <Input type="number" min={0} className="h-8 text-sm pl-6"
                            placeholder={`${plan.stdAnnual} (standard)`}
                            value={annualVal}
                            onChange={e => setCpPlans(prev => ({ ...prev, [plan.slug]: { ...prev[plan.slug], annualPrice: e.target.value } }))} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Save */}
              <Button
                className="w-full gap-2"
                disabled={cpMut.isPending}
                onClick={() => {
                  const serverPlans = customPricingData?.plans ?? {};
                  const merged: Record<string, { monthlyPrice: number; annualPrice: number }> = {};
                  for (const slug of ["starter", "professional", "enterprise"]) {
                    const lv = cpPlans[slug];
                    const sv = serverPlans[slug] ?? {};
                    const mp = lv.monthlyPrice !== "" ? Number(lv.monthlyPrice) : (sv.monthlyPrice ?? null);
                    const ap = lv.annualPrice  !== "" ? Number(lv.annualPrice)  : (sv.annualPrice  ?? null);
                    if (mp !== null && ap !== null) merged[slug] = { monthlyPrice: mp, annualPrice: ap };
                    else if (mp !== null) merged[slug] = { monthlyPrice: mp, annualPrice: sv.annualPrice ?? mp * 9.6 };
                    else if (ap !== null) merged[slug] = { monthlyPrice: sv.monthlyPrice ?? Math.round(ap / 9.6), annualPrice: ap };
                    else if (sv.monthlyPrice !== undefined) merged[slug] = sv;
                  }
                  cpMut.mutate({ enabled: isEnabled, plans: merged });
                }}>
                {cpMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Custom Pricing
              </Button>

              {/* Current state summary */}
              {customPricingData && (
                <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                  <p className="font-semibold mb-1">Saved overrides</p>
                  {Object.entries(customPricingData.plans ?? {}).length === 0
                    ? <p>No overrides saved yet.</p>
                    : Object.entries(customPricingData.plans as Record<string, { monthlyPrice: number; annualPrice: number }>).map(([slug, vals]) => (
                        <div key={slug} className="flex justify-between">
                          <span className="capitalize">{slug}</span>
                          <span>₹{vals.monthlyPrice?.toLocaleString("en-IN")}/mo · ₹{vals.annualPrice?.toLocaleString("en-IN")}/yr</span>
                        </div>
                      ))
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Config Tab */}
        <TabsContent value="email" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />Email Configuration Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Control whether this tenant can configure their own SMTP email settings from within the app.
                When enabled, admins of this organisation can set up their Gmail, Outlook, or custom SMTP credentials in Settings → Email Configuration.
              </p>

              {/* Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${(emailConfigAllowed ?? emailConfig?.configAllowed) ? "bg-emerald-100" : "bg-gray-200"}`}>
                    <Mail className={`w-5 h-5 ${(emailConfigAllowed ?? emailConfig?.configAllowed) ? "text-emerald-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Email Configuration</p>
                    <p className="text-xs text-muted-foreground">
                      {(emailConfigAllowed ?? emailConfig?.configAllowed) ? "Tenant can configure their own email settings" : "Tenant cannot configure email settings"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailConfigAllowed ?? emailConfig?.configAllowed ?? false}
                  onCheckedChange={v => emailConfigMut.mutate(v)}
                  disabled={emailConfigMut.isPending}
                />
              </div>

              {/* Current config status */}
              {emailConfig?.settings && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current Configuration</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    {[
                      ["Provider", emailConfig.settings.provider || "—"],
                      ["SMTP Host", emailConfig.settings.smtpHost || "Not set"],
                      ["SMTP Port", emailConfig.settings.smtpPort || "—"],
                      ["SMTP User", emailConfig.settings.smtpUser || "Not set"],
                      ["Password", emailConfig.settings.hasPassword ? "••••••••" : "Not set"],
                      ["Status", emailConfig.settings.isVerified ? "✓ Verified" : "Not verified"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between border-b border-dashed border-muted py-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`font-medium ${label === "Status" && emailConfig.settings.isVerified ? "text-emerald-600" : ""}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="info" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" />Organisation Info</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[["Legal Name", tenant.legalName],["GSTIN", tenant.gstin],["PAN", tenant.pan],["Industry", tenant.industry],["City / State", `${tenant.city||""} ${tenant.state||""}`.trim()||"—"],["Contact", tenant.contactName],["Email", tenant.contactEmail],["Phone", tenant.contactPhone],["Created", fmtDate(tenant.createdAt)]].map(([l,v]) => (
                  <div key={l} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="font-medium text-right">{v||"—"}</span></div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" />Subscription</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {tenant.subscription ? (
                  [["Plan", tenant.subscription.planSlug?.toUpperCase()],["Status", tenant.subscription.status],["Billing", tenant.subscription.billingCycle],["Amount", tenant.subscription.amount > 0 ? `₹${Number(tenant.subscription.amount).toLocaleString("en-IN")}` : "Free"],["Period End", fmtDate(tenant.subscription.currentPeriodEnd)],["Trial End", fmtDate(tenant.subscription.trialEnd)],["Auto Renew", tenant.subscription.autoRenew ? "Yes" : "No"]].map(([l,v]) => (
                    <div key={l} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v||"—"}</span></div>
                  ))
                ) : <p className="text-muted-foreground">No subscription found</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Provision user dialog */}
      <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add User to {tenant.orgName}</DialogTitle></DialogHeader>
          {license && license.availableSeats <= 0 && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              License limit reached ({license.currentUsers}/{license.maxUsers}). Increase the license limit first.
            </div>
          )}
          <div className="space-y-3">
            <div><Label className="text-xs">Full Name *</Label><Input className="mt-1 h-8 text-sm" value={provForm.name} onChange={e => setProvForm(f=>({...f,name:e.target.value}))} /></div>
            <div><Label className="text-xs">Email *</Label><Input className="mt-1 h-8 text-sm" type="email" value={provForm.email} onChange={e => setProvForm(f=>({...f,email:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={provForm.role} onValueChange={v => setProvForm(f=>({...f,role:v}))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Department</Label><Input className="mt-1 h-8 text-sm" value={provForm.department} onChange={e => setProvForm(f=>({...f,department:e.target.value}))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setProvisionOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={provisionMut.isPending || (!!(license && license.availableSeats <= 0))} onClick={() => provisionMut.mutate(provForm)}>
              {provisionMut.isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temp password dialog */}
      <Dialog open={!!tempPass} onOpenChange={() => { setTempPass(""); setResetUserId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-amber-500" />Temporary Password</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share this password securely. The user must change it on next login.</p>
            <div className="relative">
              <Input readOnly value={showPass ? tempPass : "•".repeat(tempPass.length)} className="font-mono text-sm pr-10" />
              <Button variant="ghost" size="icon" className="absolute right-1 top-0.5 h-7 w-7" onClick={() => setShowPass(s=>!s)}>
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <Button size="sm" className="w-full" onClick={() => { navigator.clipboard.writeText(tempPass); toast({ title:"Copied!" }); }}>Copy to Clipboard</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
