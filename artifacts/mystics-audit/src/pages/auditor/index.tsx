import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FileArchive, Mail, Download, Search, Filter, CheckSquare, Square,
  FileText, Package, Clock, Send, Eye, Shield, RefreshCw,
  Building2, User, CalendarDays, FolderOpen, CheckCircle2,
  AlertCircle, ExternalLink, Layers, FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── helpers ── */
function inrK(n: number) {
  if (Math.abs(n) >= 100_000) return `₹${(n/100_000).toFixed(1)}L`;
  if (Math.abs(n) >= 1_000) return `₹${(n/1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}
function fmtDate(s: string) {
  return s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}
function fmtSize(b: number) {
  if (b >= 1_000_000) return `${(b/1_000_000).toFixed(1)} MB`;
  if (b >= 1_000)     return `${(b/1_000).toFixed(0)} KB`;
  return `${b} B`;
}
function parseTags(raw: string) { try { return JSON.parse(raw) ?? []; } catch { return []; } }

const FY_OPTIONS = ["2026-27","2025-26","2024-25","2023-24"];
const MONTHS: Record<string,string> = {
  "2026-06":"Jun 2026","2026-05":"May 2026","2026-04":"Apr 2026",
  "2026-03":"Mar 2026","2026-02":"Feb 2026","2026-01":"Jan 2026",
  "2025-12":"Dec 2025","2025-11":"Nov 2025","2025-10":"Oct 2025",
};

const CAT_LABELS: Record<string, string> = {
  invoice:"Sales Invoice", bill:"Vendor Bill", receipt:"Receipt",
  purchase_doc:"Purchase Doc", vendor_invoice:"Vendor Invoice",
  gst_doc:"GST Document", bank_statement:"Bank Statement",
  contract:"Contract", supporting:"Supporting", other:"Other",
};
const CAT_COLORS: Record<string,string> = {
  invoice:"bg-blue-100 text-blue-800", bill:"bg-purple-100 text-purple-800",
  receipt:"bg-green-100 text-green-800", gst_doc:"bg-yellow-100 text-yellow-800",
  bank_statement:"bg-cyan-100 text-cyan-800", contract:"bg-red-100 text-red-800",
  supporting:"bg-gray-100 text-gray-800",
};

interface PackageData {
  docs: any[];
  invoices: any[];
  bills: any[];
  summary: { docCount: number; totalSize: number; byCat: Record<string,number>; invoiceCount: number; billCount: number };
}
interface Share {
  id: number; shareType: string; format: string; recipientEmail?: string;
  recipientName?: string; filterFY?: string; filterPeriod?: string;
  docCount: number; status: string; sharedBy: string; createdAt: string;
  subject?: string;
}

export default function AuditorCollaboration() {
  const qc = useQueryClient();
  const { toast } = useToast();

  /* filters */
  const [fy, setFy]           = useState("2025-26");
  const [period, setPeriod]   = useState("");
  const [project, setProject] = useState("");
  const [customer, setCust]   = useState("");
  const [vendor, setVendor]   = useState("");
  const [applied, setApplied] = useState(false);

  /* selection */
  const [selDocs, setSelDocs] = useState<Set<number>>(new Set());
  const [selInv,  setSelInv]  = useState<Set<number>>(new Set());
  const [selBill, setSelBill] = useState<Set<number>>(new Set());

  /* modals */
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ recipientEmail:"", recipientName:"", subject:"Audit Document Package", message:"Please find the attached audit document package for your review." });

  const params = new URLSearchParams();
  if (applied) { params.set("fy",fy); if(period)setPeriod(period),params.set("period",period); if(project)params.set("project",project); if(customer)params.set("customer",customer); if(vendor)params.set("vendor",vendor); }

  const { data: pkg, isLoading, refetch } = useQuery<PackageData>({
    queryKey: ["auditor-package", fy, period, project, customer, vendor, applied],
    queryFn: () => {
      const p = new URLSearchParams();
      if (applied) { p.set("fy",fy); if(period)p.set("period",period); if(project)p.set("project",project); if(customer)p.set("customer",customer); if(vendor)p.set("vendor",vendor); }
      return fetch(`/api/auditor/package?${p}`).then(r => r.json());
    },
    enabled: true,
  });

  const { data: shares = [] } = useQuery<Share[]>({
    queryKey: ["auditor-shares"],
    queryFn: () => fetch("/api/auditor/shares").then(r => r.json()),
  });

  const shareMut = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/auditor/shares", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) })
        .then(r => r.json()),
    onSuccess: (result: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ["auditor-shares"] });
      if (vars.shareType === "email") {
        if (result.status === "sent") {
          toast({ title:"Email Sent", description:`Audit package emailed to ${vars.recipientEmail} successfully.` });
        } else if (result.status === "not_configured") {
          toast({ title:"SMTP Not Configured", description:"Email saved but not delivered. Configure SMTP_HOST, SMTP_USER, and SMTP_PASS in environment variables.", variant:"destructive" });
        } else if (result.status === "failed") {
          toast({ title:"Email Delivery Failed", description: result.emailError || "Failed to send email. Check server logs.", variant:"destructive" });
        }
      }
    },
    onError: () => {
      toast({ title:"Error", description:"Failed to process request.", variant:"destructive" });
    },
  });

  function buildPackageSummary() {
    const totalDocs = selDocs.size + selInv.size + selBill.size;
    return { totalDocs, selectedDocIds: [...selDocs], selectedInvoiceIds: [...selInv], selectedBillIds: [...selBill] };
  }

  function handleSelectAllDocs() {
    if (pkg?.docs && selDocs.size === pkg.docs.length) setSelDocs(new Set());
    else setSelDocs(new Set(pkg?.docs.map((d:any)=>d.id) ?? []));
  }
  function handleSelectAllTx() {
    const allInv = new Set(pkg?.invoices.map((i:any)=>i.id) ?? []);
    const allBill = new Set(pkg?.bills.map((b:any)=>b.id) ?? []);
    if (selInv.size + selBill.size === (pkg?.invoices.length??0) + (pkg?.bills.length??0)) { setSelInv(new Set()); setSelBill(new Set()); }
    else { setSelInv(allInv); setSelBill(allBill); }
  }

  function handleDownload(format: "zip" | "pdf") {
    const { totalDocs } = buildPackageSummary();
    if (totalDocs === 0) { toast({ title:"No records selected", description:"Select at least one document or transaction first.", variant:"destructive" }); return; }
    shareMut.mutate({ shareType:"download", format, filterFY:fy, filterPeriod:period, filterProject:project, filterCustomer:customer, filterVendor:vendor, docIds:[...selDocs,...selInv,...selBill], docCount:totalDocs });
    toast({ title: format === "zip" ? "ZIP Package Generated" : "PDF Bundle Generated", description: `${totalDocs} records packaged successfully. Download would start in production.` });
  }

  function handleEmail() {
    const { totalDocs } = buildPackageSummary();
    if (!emailForm.recipientEmail) { toast({ title:"Email required", variant:"destructive" }); return; }
    setEmailOpen(false);
    shareMut.mutate({
      shareType:"email", format:"pdf", ...emailForm,
      filterFY:fy, filterPeriod:period, filterProject:project,
      filterCustomer:customer, filterVendor:vendor,
      docIds:[...selDocs,...selInv,...selBill], docCount:totalDocs,
    });
  }

  const totalSelected = selDocs.size + selInv.size + selBill.size;

  return (
    <div className="flex h-full">
      {/* ── filter sidebar ── */}
      <aside className="w-64 border-r bg-gray-50/60 flex-shrink-0 p-4 space-y-4 overflow-y-auto">
        <div>
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-primary" />Package Filters
          </h2>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">Financial Year</Label>
              <Select value={fy} onValueChange={setFy}>
                <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{FY_OPTIONS.map(f=><SelectItem key={f} value={f}>FY {f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">GST Period / Month</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="All periods" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All periods</SelectItem>
                  {Object.entries(MONTHS).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Project</Label>
              <Input className="mt-1 h-8 text-sm" placeholder="e.g. Project Alpha" value={project} onChange={e=>setProject(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Customer</Label>
              <Input className="mt-1 h-8 text-sm" placeholder="Customer name" value={customer} onChange={e=>setCust(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Vendor</Label>
              <Input className="mt-1 h-8 text-sm" placeholder="Vendor name" value={vendor} onChange={e=>setVendor(e.target.value)} />
            </div>

            <Button className="w-full" size="sm" onClick={()=>{ setApplied(true); refetch(); }}>
              <Search className="w-3.5 h-3.5 mr-1.5" />Build Package
            </Button>
            {applied && (
              <Button variant="ghost" size="sm" className="w-full text-gray-500" onClick={()=>{ setApplied(false); setFy("2025-26"); setPeriod(""); setProject(""); setCust(""); setVendor(""); setSelDocs(new Set()); setSelInv(new Set()); setSelBill(new Set()); }}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* package summary */}
        {pkg && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Package Contents</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Documents</span><span className="font-medium">{pkg.summary.docCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Invoices</span><span className="font-medium">{pkg.summary.invoiceCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Bills</span><span className="font-medium">{pkg.summary.billCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Total Size</span><span className="font-medium">{fmtSize(pkg.summary.totalSize)}</span></div>
            </div>
            <Separator className="my-2" />
            {Object.entries(pkg.summary.byCat).map(([cat,cnt])=>(
              <div key={cat} className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{CAT_LABELS[cat]??cat}</span><span>{cnt as number}</span>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* export actions */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Export</p>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={()=>handleDownload("zip")}>
              <FileArchive className="w-4 h-4 mr-2 text-orange-500" />Download as ZIP
              {totalSelected > 0 && <Badge className="ml-auto text-xs">{totalSelected}</Badge>}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={()=>handleDownload("pdf")}>
              <FileText className="w-4 h-4 mr-2 text-red-500" />Bundle as PDF
              {totalSelected > 0 && <Badge className="ml-auto text-xs">{totalSelected}</Badge>}
            </Button>
            <Button size="sm" className="w-full justify-start" onClick={()=>setEmailOpen(true)}>
              <Mail className="w-4 h-4 mr-2" />Email to Auditor
            </Button>
          </div>
        </div>
      </aside>

      {/* ── main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />Auditor Collaboration
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Build auditor-ready packages · Export ZIP / PDF · Email with secure attachments · Track sharing history</p>
            </div>
            <Button variant="outline" size="sm" onClick={()=>refetch()}>
              <RefreshCw className="w-4 h-4 mr-1.5" />Refresh
            </Button>
          </div>

          {/* selection bar */}
          {totalSelected > 0 && (
            <div className="flex items-center gap-3 mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{totalSelected} records selected</span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={()=>handleDownload("zip")}><FileArchive className="w-3.5 h-3.5 mr-1.5" />ZIP</Button>
                <Button size="sm" variant="outline" onClick={()=>handleDownload("pdf")}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
                <Button size="sm" onClick={()=>setEmailOpen(true)}><Mail className="w-3.5 h-3.5 mr-1.5" />Email</Button>
                <Button size="sm" variant="ghost" onClick={()=>{setSelDocs(new Set());setSelInv(new Set());setSelBill(new Set());}}>Clear</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Documents section */}
          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />Supporting Documents
                <Badge variant="outline">{pkg?.summary.docCount ?? 0}</Badge>
              </CardTitle>
              <button onClick={handleSelectAllDocs} className="text-xs text-primary hover:underline">
                {selDocs.size === (pkg?.docs.length??0) && (pkg?.docs.length??0)>0 ? "Deselect all" : "Select all"}
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {(!pkg?.docs || pkg.docs.length === 0) ? (
                <div className="text-center py-10 text-gray-400">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{applied ? "No documents match these filters" : "Apply filters to build your package"}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {pkg.docs.map((doc:any)=>(
                    <div key={doc.id} className={cn("flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors", selDocs.has(doc.id) && "bg-primary/5")}>
                      <button onClick={()=>{const s=new Set(selDocs); s.has(doc.id)?s.delete(doc.id):s.add(doc.id); setSelDocs(s);}}>
                        {selDocs.has(doc.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-gray-300" />}
                      </button>
                      <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-gray-400">{fmtSize(doc.sizeBytes)} · {fmtDate(doc.createdAt)}</p>
                      </div>
                      <Badge className={cn("text-xs", CAT_COLORS[doc.docCategory]??CAT_COLORS.supporting)}>
                        {CAT_LABELS[doc.docCategory]??doc.docCategory}
                      </Badge>
                      {doc.linkedEntityRef && (
                        <span className="text-xs text-primary bg-primary/5 px-2 py-0.5 rounded">{doc.linkedEntityRef}</span>
                      )}
                      {parseTags(doc.tags).slice(0,2).map((t:string)=>(
                        <span key={t} className="text-xs border text-gray-500 px-1.5 py-0.5 rounded-full hidden lg:block">{t}</span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices & Bills */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-500" />Sales Invoices
                  <Badge variant="outline">{pkg?.summary.invoiceCount ?? 0}</Badge>
                </CardTitle>
                <button onClick={()=>{const all=new Set(pkg?.invoices.map((i:any)=>i.id)??[]); setSelInv(selInv.size===all.size?new Set():all);}} className="text-xs text-primary hover:underline">
                  {selInv.size===(pkg?.invoices.length??0)&&(pkg?.invoices.length??0)>0?"Deselect all":"Select all"}
                </button>
              </CardHeader>
              <CardContent className="p-0">
                {(!pkg?.invoices || pkg.invoices.length === 0) ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No invoices match filters</div>
                ) : (
                  <div className="divide-y max-h-60 overflow-y-auto">
                    {pkg.invoices.map((inv:any)=>(
                      <div key={inv.id} className={cn("flex items-center gap-2 px-3 py-2 hover:bg-gray-50", selInv.has(inv.id)&&"bg-blue-50/50")}>
                        <button onClick={()=>{const s=new Set(selInv);s.has(inv.id)?s.delete(inv.id):s.add(inv.id);setSelInv(s);}}>
                          {selInv.has(inv.id)?<CheckSquare className="w-3.5 h-3.5 text-primary"/>:<Square className="w-3.5 h-3.5 text-gray-300"/>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{inv.ref}</p>
                          <p className="text-xs text-gray-400 truncate">{inv.party}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold">{inrK(inv.amount)}</p>
                          <p className="text-xs text-gray-400">{fmtDate(inv.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-purple-500" />Vendor Bills
                  <Badge variant="outline">{pkg?.summary.billCount ?? 0}</Badge>
                </CardTitle>
                <button onClick={()=>{const all=new Set(pkg?.bills.map((b:any)=>b.id)??[]);setSelBill(selBill.size===all.size?new Set():all);}} className="text-xs text-primary hover:underline">
                  {selBill.size===(pkg?.bills.length??0)&&(pkg?.bills.length??0)>0?"Deselect all":"Select all"}
                </button>
              </CardHeader>
              <CardContent className="p-0">
                {(!pkg?.bills || pkg.bills.length === 0) ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No bills match filters</div>
                ) : (
                  <div className="divide-y max-h-60 overflow-y-auto">
                    {pkg.bills.map((bill:any)=>(
                      <div key={bill.id} className={cn("flex items-center gap-2 px-3 py-2 hover:bg-gray-50", selBill.has(bill.id)&&"bg-purple-50/50")}>
                        <button onClick={()=>{const s=new Set(selBill);s.has(bill.id)?s.delete(bill.id):s.add(bill.id);setSelBill(s);}}>
                          {selBill.has(bill.id)?<CheckSquare className="w-3.5 h-3.5 text-primary"/>:<Square className="w-3.5 h-3.5 text-gray-300"/>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{bill.ref}</p>
                          <p className="text-xs text-gray-400 truncate">{bill.party}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold">{inrK(bill.amount)}</p>
                          <p className="text-xs text-gray-400">{fmtDate(bill.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sharing History */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />Sharing History & Audit Log
                <Badge variant="outline">{shares.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {shares.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No shares yet — your audit trail will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-left px-4 py-2">Type</th>
                      <th className="text-left px-4 py-2">Recipient</th>
                      <th className="text-left px-4 py-2">Filter</th>
                      <th className="text-left px-4 py-2">Records</th>
                      <th className="text-left px-4 py-2">Status</th>
                      <th className="text-left px-4 py-2">Shared By</th>
                    </tr></thead>
                    <tbody>
                      {shares.map(s=>(
                        <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                              s.shareType==="email"?"bg-blue-100 text-blue-700":"bg-orange-100 text-orange-700")}>
                              {s.shareType==="email"?<Mail className="w-3 h-3"/>:<Download className="w-3 h-3"/>}
                              {s.format?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">{s.recipientEmail||"—"}</td>
                          <td className="px-4 py-2.5 text-gray-500">
                            {[s.filterFY&&`FY ${s.filterFY}`, s.filterPeriod&&MONTHS[s.filterPeriod]].filter(Boolean).join(" · ")||"All"}
                          </td>
                          <td className="px-4 py-2.5 font-medium">{s.docCount}</td>
                          <td className="px-4 py-2.5">
                            <Badge className={s.status==="sent"?"bg-green-100 text-green-700 border-green-200":"bg-red-100 text-red-700"}>
                              {s.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500">{s.sharedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Email modal ── */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" />Email Audit Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {totalSelected > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg text-sm text-primary font-medium">
                📎 {totalSelected} records selected for attachment
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Recipient Email *</Label>
                <Input className="mt-1" placeholder="auditor@firm.com" value={emailForm.recipientEmail} onChange={e=>setEmailForm(p=>({...p,recipientEmail:e.target.value}))} />
              </div>
              <div>
                <Label className="text-xs">Recipient Name</Label>
                <Input className="mt-1" placeholder="CA Sharma" value={emailForm.recipientName} onChange={e=>setEmailForm(p=>({...p,recipientName:e.target.value}))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input className="mt-1" value={emailForm.subject} onChange={e=>setEmailForm(p=>({...p,subject:e.target.value}))} />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea className="mt-1 resize-none" rows={4} value={emailForm.message} onChange={e=>setEmailForm(p=>({...p,message:e.target.value}))} />
            </div>
            <div className="p-3 bg-gray-50 rounded text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">Package details:</p>
              <p>• FY: {fy}{period && ` · ${MONTHS[period]??period}`}</p>
              {project && <p>• Project: {project}</p>}
              {customer && <p>• Customer: {customer}</p>}
              {vendor && <p>• Vendor: {vendor}</p>}
              <p>• {totalSelected} records included</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={()=>setEmailOpen(false)}>Cancel</Button>
            <Button onClick={handleEmail}><Send className="w-4 h-4 mr-2" />Send to Auditor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
