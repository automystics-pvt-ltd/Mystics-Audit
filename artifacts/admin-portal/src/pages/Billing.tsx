import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmtDate, fmtCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, CreditCard, FileText, Plus, CheckCircle2, Clock, Zap, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

const PLANS = [
  { slug:"trial",        name:"Free Trial",     price:0,     annualPrice:0,      maxUsers:5,   color:"slate",   features:["14-day trial","5 users","Basic modules","Email support"] },
  { slug:"starter",      name:"Starter",        price:2999,  annualPrice:29999,  maxUsers:10,  color:"blue",    features:["10 users","Invoicing + GST","Accounts","Email support"] },
  { slug:"growth",       name:"Growth",         price:7999,  annualPrice:79999,  maxUsers:25,  color:"violet",  features:["25 users","Inventory","Expenses","Priority support"] },
  { slug:"professional", name:"Professional",   price:14999, annualPrice:149999, maxUsers:50,  color:"indigo",  features:["50 users","All 15 modules","Audit trail","Phone support"] },
  { slug:"enterprise",   name:"Enterprise",     price:49999, annualPrice:499999, maxUsers:500, color:"amber",   features:["500 users","Custom modules","24/7 SLA","Onboarding"] },
];

const PLAN_BADGE: Record<string,string> = {
  trial:"bg-slate-100 text-slate-700", starter:"bg-blue-100 text-blue-700",
  growth:"bg-violet-100 text-violet-700", professional:"bg-indigo-100 text-indigo-700",
  enterprise:"bg-amber-100 text-amber-700",
};

const SUB_STATUS_BADGE: Record<string,any> = {
  active:<Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>,
  trial:<Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Trial</Badge>,
  suspended:<Badge variant="destructive" className="text-[10px]">Suspended</Badge>,
  cancelled:<Badge variant="secondary" className="text-[10px]">Cancelled</Badge>,
  grace_period:<Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">Grace</Badge>,
};

export default function Billing() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [subPage, setSubPage] = useState(1);
  const [invPage, setInvPage] = useState(1);
  const [createSubOpen, setCreateSubOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [subForm, setSubForm] = useState({ orgId:"", planSlug:"trial", billingCycle:"monthly" });
  const [invForm, setInvForm] = useState({ orgId:"", planSlug:"", billingCycle:"monthly", billingName:"", billingEmail:"", billingGstin:"" });
  const [payForm, setPayForm] = useState({ orgId:"", subscriptionId:"", amount:"", method:"upi", methodDetail:"", description:"" });

  const { data: subs, isLoading: subsLoading } = useQuery({
    queryKey: ["admin-subscriptions", subPage],
    queryFn: () => api.get<any>(`/admin/subscriptions?page=${subPage}`),
  });

  const { data: invoices } = useQuery({
    queryKey: ["admin-invoices", invPage],
    queryFn: () => api.get<any>("/admin/invoices"),
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-billing-stats"],
    queryFn: () => api.get<any>("/admin/stats"),
  });

  const { data: tenants } = useQuery({
    queryKey: ["admin-tenants-list-billing"],
    queryFn: () => api.get<any>("/admin/tenants?page=1"),
    select: d => d.tenants ?? [],
  });

  const createSubMut = useMutation({
    mutationFn: (body: any) => api.post<any>("/admin/subscriptions", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-subscriptions"] }); setCreateSubOpen(false); toast({ title:"Subscription created" }); },
    onError: (e: any) => toast({ title:"Error", description: e.message, variant:"destructive" }),
  });

  const invMut = useMutation({
    mutationFn: (body: any) => api.post<any>("/admin/invoices/generate", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-invoices"] }); setInvoiceOpen(false); toast({ title:"Invoice generated" }); },
    onError: (e: any) => toast({ title:"Error", description: e.message, variant:"destructive" }),
  });

  const payMut = useMutation({
    mutationFn: (body: any) => api.post<any>("/admin/payments", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-subscriptions"] }); setPaymentOpen(false); toast({ title:"Payment recorded" }); },
    onError: (e: any) => toast({ title:"Error", description: e.message, variant:"destructive" }),
  });

  const mrr = Number(stats?.tenants?.totalMrr ?? 0);
  const revenue = Number(stats?.payments?.monthlyRevenue ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Billing & Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Manage plans, subscriptions, payments and invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setPaymentOpen(true)}><CreditCard className="w-3.5 h-3.5" />Record Payment</Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setInvoiceOpen(true)}><FileText className="w-3.5 h-3.5" />Generate Invoice</Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateSubOpen(true)}><Plus className="w-3.5 h-3.5" />New Subscription</Button>
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Monthly Recurring Revenue", value:`₹${mrr.toLocaleString("en-IN")}`, icon:<TrendingUp className="w-4 h-4 text-emerald-600" /> },
          { label:"Revenue This Month", value:`₹${revenue.toLocaleString("en-IN")}`, icon:<CreditCard className="w-4 h-4 text-primary" /> },
          { label:"Active Subscriptions", value: subs?.total ?? "—", icon:<CheckCircle2 className="w-4 h-4 text-violet-600" /> },
          { label:"Total Invoices", value: Array.isArray(invoices) ? invoices.length : "—", icon:<FileText className="w-4 h-4 text-amber-600" /> },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center justify-between mb-1">{<span className="text-xs text-muted-foreground">{s.label}</span>}{s.icon}</div>
            <p className="text-xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="h-8">
          <TabsTrigger value="plans" className="text-xs h-7">Pricing Plans</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs h-7">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs h-7">Invoices</TabsTrigger>
        </TabsList>

        {/* Plans */}
        <TabsContent value="plans" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {PLANS.map(p => (
              <Card key={p.slug} className={`border-2 ${p.slug==="professional"?"border-primary shadow-md":"border-border"}`}>
                <CardContent className="p-4 space-y-3">
                  {p.slug==="professional" && <Badge className="w-full justify-center text-[10px] mb-1 bg-primary text-primary-foreground">Most Popular</Badge>}
                  <div>
                    <h3 className="font-semibold text-sm">{p.name}</h3>
                    <div className="mt-1">
                      {p.price === 0
                        ? <span className="text-xl font-bold">Free</span>
                        : <><span className="text-xl font-bold">₹{p.price.toLocaleString("en-IN")}</span><span className="text-xs text-muted-foreground">/mo</span></>
                      }
                    </div>
                    {p.annualPrice > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">₹{p.annualPrice.toLocaleString("en-IN")}/yr</p>}
                  </div>
                  <div className="space-y-1">
                    {p.features.map(f => (
                      <div key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />{f}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground border-t pt-2">Up to {p.maxUsers === 500 ? "500+" : p.maxUsers} users</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Subscriptions */}
        <TabsContent value="subscriptions" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Organisation","Plan","Status","Billing","Amount","Period End","Users"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subsLoading && Array.from({length:6}).map((_,i) => (
                    <tr key={i} className="border-b">{Array.from({length:7}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
                  ))}
                  {subs?.subscriptions?.map((s: any) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-xs">{s.orgName ?? `Org ${s.orgId}`}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] px-1.5 ${PLAN_BADGE[s.planSlug]??""}`}>{s.planSlug}</Badge></td>
                      <td className="px-4 py-3">{SUB_STATUS_BADGE[s.status] ?? <Badge variant="outline" className="text-[10px]">{s.status}</Badge>}</td>
                      <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{s.billingCycle}</td>
                      <td className="px-4 py-3 text-xs">{s.amount > 0 ? `₹${Number(s.amount).toLocaleString("en-IN")}` : "Free"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(s.currentPeriodEnd)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.maxUsers}</td>
                    </tr>
                  ))}
                  {!subsLoading && !subs?.subscriptions?.length && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No subscriptions</td></tr>}
                </tbody>
              </table>
            </div>
            {subs && subs.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                <p className="text-xs text-muted-foreground">{subs.total} total</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={subPage<=1} onClick={() => setSubPage(p=>p-1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                  <span className="text-xs self-center px-2">{subPage}/{subs.pages}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={subPage>=subs.pages} onClick={() => setSubPage(p=>p+1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Invoice #","Organisation","Plan","Amount","GST","Total","Status","Issued"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(invoices) ? invoices : []).map((inv: any) => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs font-mono font-medium">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-xs">{inv.orgName}</td>
                      <td className="px-4 py-3"><Badge className={`text-[10px] px-1.5 ${PLAN_BADGE[inv.planLabel?.toLowerCase()]??""}`}>{inv.planLabel}</Badge></td>
                      <td className="px-4 py-3 text-xs">₹{Number(inv.amount).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">₹{Number(inv.tax).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-xs font-semibold">₹{Number(inv.total).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3">
                        {inv.status==="paid" ? <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600">Paid</Badge>
                         : inv.status==="issued" ? <Badge className="text-[10px] bg-amber-100 text-amber-700">Issued</Badge>
                         : <Badge variant="secondary" className="text-[10px]">{inv.status}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(inv.issuedAt)}</td>
                    </tr>
                  ))}
                  {!(Array.isArray(invoices) ? invoices : []).length && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No invoices yet</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Subscription Dialog */}
      <Dialog open={createSubOpen} onOpenChange={setCreateSubOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Subscription</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tenant *</Label>
              <Select value={subForm.orgId} onValueChange={v => setSubForm(f=>({...f,orgId:v}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select tenant…" /></SelectTrigger>
                <SelectContent>{tenants?.map((t:any) => <SelectItem key={t.id} value={String(t.id)}>{t.orgName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Plan</Label>
                <Select value={subForm.planSlug} onValueChange={v => setSubForm(f=>({...f,planSlug:v}))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{PLANS.map(p => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Billing Cycle</Label>
                <Select value={subForm.billingCycle} onValueChange={v => setSubForm(f=>({...f,billingCycle:v}))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {subForm.planSlug && subForm.planSlug !== "trial" && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                {PLANS.find(p=>p.slug===subForm.planSlug)?.name}: ₹{(subForm.billingCycle==="annual" ? PLANS.find(p=>p.slug===subForm.planSlug)?.annualPrice : PLANS.find(p=>p.slug===subForm.planSlug)?.price)?.toLocaleString("en-IN")}/{subForm.billingCycle==="annual"?"yr":"mo"} + 18% GST
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateSubOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!subForm.orgId || createSubMut.isPending} onClick={() => createSubMut.mutate({ orgId: parseInt(subForm.orgId), planSlug: subForm.planSlug, billingCycle: subForm.billingCycle })}>
              {createSubMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Invoice Dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Generate Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tenant *</Label>
              <Select value={invForm.orgId} onValueChange={v => setInvForm(f=>({...f,orgId:v}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select tenant…" /></SelectTrigger>
                <SelectContent>{tenants?.map((t:any) => <SelectItem key={t.id} value={String(t.id)}>{t.orgName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Plan</Label>
                <Select value={invForm.planSlug} onValueChange={v => setInvForm(f=>({...f,planSlug:v}))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Auto" /></SelectTrigger>
                  <SelectContent>{PLANS.filter(p=>p.price>0).map(p => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Billing Cycle</Label>
                <Select value={invForm.billingCycle} onValueChange={v => setInvForm(f=>({...f,billingCycle:v}))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Billing Name</Label><Input className="mt-1 h-8 text-sm" value={invForm.billingName} onChange={e => setInvForm(f=>({...f,billingName:e.target.value}))} /></div>
            <div><Label className="text-xs">Billing Email</Label><Input className="mt-1 h-8 text-sm" type="email" value={invForm.billingEmail} onChange={e => setInvForm(f=>({...f,billingEmail:e.target.value}))} /></div>
            <div><Label className="text-xs">GSTIN</Label><Input className="mt-1 h-8 text-sm" value={invForm.billingGstin} onChange={e => setInvForm(f=>({...f,billingGstin:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!invForm.orgId || invMut.isPending} onClick={() => invMut.mutate({ orgId: parseInt(invForm.orgId), planSlug: invForm.planSlug||undefined, billingCycle: invForm.billingCycle, billingName: invForm.billingName||undefined, billingEmail: invForm.billingEmail||undefined, billingGstin: invForm.billingGstin||undefined })}>
              {invMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tenant *</Label>
              <Select value={payForm.orgId} onValueChange={v => setPayForm(f=>({...f,orgId:v}))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select tenant…" /></SelectTrigger>
                <SelectContent>{tenants?.map((t:any) => <SelectItem key={t.id} value={String(t.id)}>{t.orgName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Amount (₹) *</Label><Input className="mt-1 h-8 text-sm" type="number" value={payForm.amount} onChange={e => setPayForm(f=>({...f,amount:e.target.value}))} /></div>
              <div>
                <Label className="text-xs">Method</Label>
                <Select value={payForm.method} onValueChange={v => setPayForm(f=>({...f,method:v}))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["upi","card","netbanking","wallet","qr","offline","neft","rtgs"].map(m => <SelectItem key={m} value={m} className="uppercase text-xs">{m.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Details (e.g. PhonePe UPI)</Label><Input className="mt-1 h-8 text-sm" value={payForm.methodDetail} onChange={e => setPayForm(f=>({...f,methodDetail:e.target.value}))} /></div>
            <div><Label className="text-xs">Description</Label><Input className="mt-1 h-8 text-sm" value={payForm.description} onChange={e => setPayForm(f=>({...f,description:e.target.value}))} /></div>
            {payForm.amount && Number(payForm.amount)>0 && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                Amount ₹{Number(payForm.amount).toLocaleString("en-IN")} + GST ₹{Math.round(Number(payForm.amount)*0.18).toLocaleString("en-IN")} = Total ₹{Math.round(Number(payForm.amount)*1.18).toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!payForm.orgId || !payForm.amount || payMut.isPending} onClick={() => payMut.mutate({ orgId: parseInt(payForm.orgId), amount: parseInt(payForm.amount), method: payForm.method, methodDetail: payForm.methodDetail||undefined, description: payForm.description||undefined })}>
              {payMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
