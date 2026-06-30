import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmtINR, fmtDate, relTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Search, MoreHorizontal, Pause, Play, Trash2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  expired: "bg-orange-50 text-orange-700 border-orange-200",
};
const PLAN_BADGE: Record<string, string> = {
  trial: "bg-slate-50 text-slate-600", starter: "bg-blue-50 text-blue-700",
  growth: "bg-emerald-50 text-emerald-700", professional: "bg-purple-50 text-purple-700",
  enterprise: "bg-amber-50 text-amber-700",
};

export default function Tenants() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [suspendId, setSuspendId] = useState<number|null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("search", search);
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (planFilter !== "all") params.set("plan", planFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenants", search, statusFilter, planFilter, page],
    queryFn: () => api.get<any>(`/admin/tenants?${params}`),
  });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post("/admin/tenants", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tenants"] }); setShowCreate(false); toast({ title: "Tenant created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const suspendMut = useMutation({
    mutationFn: ({ id, reason }: any) => api.post(`/admin/tenants/${id}/suspend`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tenants"] }); setSuspendId(null); setSuspendReason(""); toast({ title: "Tenant suspended" }); },
  });

  const activateMut = useMutation({
    mutationFn: (id: number) => api.post(`/admin/tenants/${id}/activate`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tenants"] }); toast({ title: "Tenant activated" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.del(`/admin/tenants/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tenants"] }); toast({ title: "Tenant deleted" }); },
  });

  const [form, setForm] = useState({ orgName: "", contactEmail: "", plan: "trial", industry: "", contactName: "", contactPhone: "", city: "", state: "", notes: "" });
  const handleCreate = (e: React.FormEvent) => { e.preventDefault(); createMut.mutate(form); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all customer organisations on the platform</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Tenant
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search name, email, slug…" className="pl-8 h-8 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["trial","active","suspended","cancelled","expired"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={v => { setPlanFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {["trial","starter","growth","professional","enterprise"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organisation</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">MRR</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Users</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({length:8}).map((_,i) => (
                <tr key={i} className="border-b">
                  {Array.from({length:7}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && data?.tenants?.map((t: any) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {t.orgName?.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{t.orgName}</p>
                        <p className="text-xs text-muted-foreground">{t.contactEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`capitalize text-xs ${PLAN_BADGE[t.plan]}`}>{t.plan}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`capitalize text-xs ${STATUS_BADGE[t.status] ?? ""}`}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{fmtINR(t.mrr ?? 0)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.activeUsers ?? 0}/{t.maxUsers}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{relTime(t.createdAt)}</td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setShowDetail(t)}><Eye className="w-3.5 h-3.5 mr-2" />View Details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {t.status !== "suspended" ? (
                          <DropdownMenuItem className="text-orange-600" onClick={() => setSuspendId(t.id)}><Pause className="w-3.5 h-3.5 mr-2" />Suspend</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-green-600" onClick={() => activateMut.mutate(t.id)}><Play className="w-3.5 h-3.5 mr-2" />Activate</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Delete this tenant?")) deleteMut.mutate(t.id); }}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {!isLoading && !data?.tenants?.length && (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No tenants found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New Tenant</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Organisation Name *</Label>
                <Input value={form.orgName} onChange={e => setForm(f => ({...f, orgName: e.target.value}))} required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Contact Email *</Label>
                <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({...f, contactEmail: e.target.value}))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={v => setForm(f => ({...f, plan: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["trial","starter","growth","professional","enterprise"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Input value={form.industry} onChange={e => setForm(f => ({...f, industry: e.target.value}))} placeholder="e.g. Manufacturing" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input value={form.contactName} onChange={e => setForm(f => ({...f, contactName: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input value={form.contactPhone} onChange={e => setForm(f => ({...f, contactPhone: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Creating…" : "Create Tenant"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tenant Detail */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{showDetail?.orgName}</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-3 text-sm mt-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Slug", showDetail.slug],
                  ["Status", showDetail.status],
                  ["Plan", showDetail.plan],
                  ["MRR", fmtINR(showDetail.mrr ?? 0)],
                  ["Contact", showDetail.contactName],
                  ["Email", showDetail.contactEmail],
                  ["Phone", showDetail.contactPhone],
                  ["City", showDetail.city],
                  ["State", showDetail.state],
                  ["Industry", showDetail.industry],
                  ["Max Users", showDetail.maxUsers],
                  ["Trial End", fmtDate(showDetail.trialEnd)],
                  ["Created", fmtDate(showDetail.createdAt)],
                ].map(([k, v]) => v ? (
                  <div key={k}>
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="font-medium truncate">{v}</p>
                  </div>
                ) : null)}
              </div>
              {showDetail.notes && (
                <div className="p-2.5 rounded-md bg-muted/50 text-xs text-muted-foreground">{showDetail.notes}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendId !== null} onOpenChange={() => setSuspendId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Suspend Tenant</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">This will immediately suspend access for this tenant. Provide a reason.</p>
            <Textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason for suspension…" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!suspendReason || suspendMut.isPending} onClick={() => suspendMut.mutate({ id: suspendId!, reason: suspendReason })}>
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
