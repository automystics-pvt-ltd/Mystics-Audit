import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FileText, Image, FileSpreadsheet, Search, Upload, Grid3X3, List,
  Tag, Link2, Trash2, Download, Eye, CheckCircle2, Clock, AlertCircle,
  X, CalendarDays, FolderOpen, Layers, RotateCcw, ArrowUpDown,
  File, FileCheck, Building2, User, Plus, Filter, ChevronRight,
  ExternalLink, Paperclip, MoreVertical, RefreshCw, ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────── types ─────────────── */
interface Doc {
  id: number; name: string; originalName: string; fileType: string;
  mimeType: string; sizeBytes: number; fileUrl?: string;
  docCategory: string; financialYear?: string; period?: string;
  gstPeriod?: string; vendorName?: string; project?: string;
  department?: string; clientName?: string;
  tags: string; description?: string; linkedEntityType?: string;
  linkedEntityId?: number; linkedEntityRef?: string;
  filingStatus: string; uploadedBy: string; createdAt: string;
}
interface UploadItem {
  id: string; file: File; status: "queued"|"uploading"|"done"|"error";
  progress: number; docId?: number; error?: string;
}
interface Summary {
  totals: { total: number; totalSize: number; filed: number; unfiled: number; linked: number; pdfCount: number; imageCount: number; excelCount: number };
  byCategory: Array<{ docCategory: string; count: number }>;
}

/* ─────────────── constants ─────────────── */
const CATEGORIES = [
  { value:"invoice",        label:"Sales Invoice",    color:"bg-blue-100 text-blue-800 border-blue-200" },
  { value:"bill",           label:"Vendor Bill",      color:"bg-purple-100 text-purple-800 border-purple-200" },
  { value:"receipt",        label:"Receipt",          color:"bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value:"purchase_doc",   label:"Purchase Doc",     color:"bg-orange-100 text-orange-800 border-orange-200" },
  { value:"vendor_invoice", label:"Vendor Invoice",   color:"bg-pink-100 text-pink-800 border-pink-200" },
  { value:"gst_doc",        label:"GST Document",     color:"bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value:"bank_statement", label:"Bank Statement",   color:"bg-cyan-100 text-cyan-800 border-cyan-200" },
  { value:"contract",       label:"Contract / Legal", color:"bg-red-100 text-red-800 border-red-200" },
  { value:"supporting",     label:"Supporting Doc",   color:"bg-gray-100 text-gray-700 border-gray-200" },
  { value:"other",          label:"Other",            color:"bg-slate-100 text-slate-700 border-slate-200" },
];
const FY_OPTIONS = ["2026-27","2025-26","2024-25","2023-24"];
const MONTHS: Record<string,string> = {
  "2026-06":"Jun 2026","2026-05":"May 2026","2026-04":"Apr 2026",
  "2026-03":"Mar 2026","2026-02":"Feb 2026","2026-01":"Jan 2026",
  "2025-12":"Dec 2025","2025-11":"Nov 2025","2025-10":"Oct 2025",
  "2025-09":"Sep 2025","2025-08":"Aug 2025","2025-07":"Jul 2025","2025-06":"Jun 2025",
};
const DEPARTMENTS = ["Finance","Operations","HR","Sales","Marketing","Technology","Admin","Legal","Projects"];
const PROJECTS = ["Project Alpha","Project Beta","Infra Upgrade","Client Onboarding","Internal Ops"];

const FILE_CFG: Record<string,{ bg:string; border:string; text:string; label:string; icon: React.ReactNode }> = {
  pdf:   { bg:"bg-red-50",     border:"border-red-200",     text:"text-red-600",    label:"PDF", icon: <FileText className="w-5 h-5"/> },
  image: { bg:"bg-emerald-50", border:"border-emerald-200", text:"text-emerald-600",label:"IMG", icon: <Image className="w-5 h-5"/> },
  excel: { bg:"bg-green-50",   border:"border-green-200",   text:"text-green-700",  label:"XLS", icon: <FileSpreadsheet className="w-5 h-5"/> },
  csv:   { bg:"bg-orange-50",  border:"border-orange-200",  text:"text-orange-600", label:"CSV", icon: <FileSpreadsheet className="w-5 h-5"/> },
  word:  { bg:"bg-blue-50",    border:"border-blue-200",    text:"text-blue-600",   label:"DOC", icon: <FileText className="w-5 h-5"/> },
  other: { bg:"bg-gray-50",    border:"border-gray-200",    text:"text-gray-500",   label:"FILE",icon: <File className="w-5 h-5"/> },
};
const fc = (t: string) => FILE_CFG[t] ?? FILE_CFG.other;

/* ─────────────── helpers ─────────────── */
function fmtSize(b: number) {
  if (b>=1_000_000) return `${(b/1_000_000).toFixed(1)} MB`;
  if (b>=1_000)     return `${Math.round(b/1_000)} KB`;
  return `${b} B`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
}
function parseTags(raw: string): string[] { try { return JSON.parse(raw)??[]; } catch { return []; } }
function catMeta(cat: string) { return CATEGORIES.find(c=>c.value===cat)??CATEGORIES[CATEGORIES.length-1]; }
function detectFileType(f: File) {
  if (f.type.startsWith("image/")) return "image";
  const n = f.name.toLowerCase();
  if (n.endsWith(".xlsx")||n.endsWith(".xls")) return "excel";
  if (n.endsWith(".csv")) return "csv";
  if (n.endsWith(".doc")||n.endsWith(".docx")) return "word";
  return "pdf";
}

/* ─────────────── FilingBadge ─────────────── */
function FilingBadge({ status }: { status: string }) {
  if (status==="filed")     return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1 font-medium"><CheckCircle2 className="w-3 h-3"/>Filed</Badge>;
  if (status==="matched")   return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs gap-1 font-medium"><CheckCircle2 className="w-3 h-3"/>Matched</Badge>;
  if (status==="mismatched")return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs gap-1 font-medium"><AlertCircle className="w-3 h-3"/>Mismatch</Badge>;
  return <Badge variant="outline" className="text-gray-500 text-xs gap-1 font-medium"><Clock className="w-3 h-3"/>Unfiled</Badge>;
}

/* ─────────────── FileIcon ─────────────── */
function FileIcon({ type, size="md" }: { type: string; size?: "sm"|"md"|"lg" }) {
  const c = fc(type);
  const cls = size==="lg" ? "w-16 h-16 text-2xl rounded-2xl" : size==="sm" ? "w-9 h-9 text-xs rounded-xl" : "w-11 h-11 text-sm rounded-xl";
  return (
    <div className={cn("flex flex-col items-center justify-center font-bold border shrink-0", cls, c.bg, c.border, c.text)}>
      <span className="text-[10px] font-black tracking-wider">{c.label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════
   UPLOAD MODAL
═══════════════════════════════════════ */
function UploadModal({ open, onClose, onUploaded }: {
  open: boolean; onClose: () => void; onUploaded: () => void;
}) {
  const [queue, setQueue]   = useState<UploadItem[]>([]);
  const [step, setStep]     = useState<"files"|"meta">("files");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    docCategory: "supporting", financialYear: "2025-26", period: "2026-06",
    gstPeriod: "", vendorName: "", project: "", department: "",
    clientName: "", linkedEntityRef: "", filingStatus: "unfiled", description: "", tagsRaw: "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function addFiles(files: File[]) {
    const valid = files.filter(f => f.size <= 25_000_000);
    setQueue(q => [...q, ...valid.map(f => ({ id: `${Date.now()}_${f.name}`, file: f, status: "queued" as const, progress: 0 }))]);
    if (valid.length > 0) setStep("meta");
  }

  async function handleUpload() {
    if (queue.filter(i => i.status === "queued").length === 0) return;
    setUploading(true);
    const tags = JSON.stringify(form.tagsRaw.split(",").map(t => t.trim()).filter(Boolean));

    for (const item of queue) {
      if (item.status !== "queued") continue;
      setQueue(q => q.map(i => i.id===item.id ? { ...i, status: "uploading", progress: 10 } : i));

      const fd = new FormData();
      fd.append("file", item.file);
      fd.append("docCategory",   form.docCategory);
      fd.append("financialYear", form.financialYear);
      fd.append("period",        form.period);
      if (form.gstPeriod)        fd.append("gstPeriod", form.gstPeriod);
      if (form.vendorName)       fd.append("vendorName", form.vendorName);
      if (form.clientName)       fd.append("clientName", form.clientName);
      if (form.department)       fd.append("department", form.department);
      if (form.project)          fd.append("project", form.project);
      if (form.linkedEntityRef)  fd.append("linkedEntityRef", form.linkedEntityRef);
      fd.append("filingStatus",  form.filingStatus);
      fd.append("description",   form.description);
      fd.append("tags",          tags);

      // Simulate progress while uploading
      const fakeProgress = setInterval(() => {
        setQueue(q => q.map(i => i.id===item.id && i.status==="uploading"
          ? { ...i, progress: Math.min(i.progress + 15, 85) } : i));
      }, 200);

      try {
        const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
        clearInterval(fakeProgress);
        if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
        const doc = await res.json();
        setQueue(q => q.map(i => i.id===item.id ? { ...i, status: "done", progress: 100, docId: doc.id } : i));
      } catch (e: any) {
        clearInterval(fakeProgress);
        setQueue(q => q.map(i => i.id===item.id ? { ...i, status: "error", error: e.message } : i));
      }
    }
    setUploading(false);
    onUploaded();
  }

  function handleClose() {
    if (uploading) return;
    setQueue([]); setStep("files"); setDragging(false);
    setForm({ docCategory:"supporting", financialYear:"2025-26", period:"2026-06", gstPeriod:"", vendorName:"", project:"", department:"", clientName:"", linkedEntityRef:"", filingStatus:"unfiled", description:"", tagsRaw:"" });
    onClose();
  }

  const allDone  = queue.length > 0 && queue.every(i => i.status === "done");
  const anyError = queue.some(i => i.status === "error");
  const pending  = queue.filter(i => i.status === "queued").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white rounded-t-lg shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-4.5 h-4.5 text-primary"/>
            </div>
            <div>
              <h2 className="text-base font-semibold">Upload Documents</h2>
              <p className="text-xs text-muted-foreground">PDF, Images, Excel, Word — up to 25 MB each</p>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs">
            <button onClick={()=>setStep("files")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all font-medium",
              step==="files" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted")}>
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">1</span> Files
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground"/>
            <button onClick={()=>queue.length>0&&setStep("meta")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all font-medium",
              step==="meta" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted",
              queue.length===0 && "opacity-40 pointer-events-none")}>
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">2</span> Metadata
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── STEP 1: File selection ── */}
          {step === "files" && (
            <div className="p-6 space-y-4">
              <div
                className={cn("border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all select-none",
                  isDragging ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50 hover:bg-muted/30")}
                onDragOver={e=>{e.preventDefault();setDragging(true);}}
                onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false);}}
                onDrop={e=>{e.preventDefault();setDragging(false);addFiles(Array.from(e.dataTransfer.files));}}
                onClick={()=>inputRef.current?.click()}>
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="w-7 h-7 text-primary"/>
                </div>
                <p className="font-semibold text-gray-800">{isDragging ? "Drop files here" : "Drag & drop files"}</p>
                <p className="text-sm text-muted-foreground mt-1">or <span className="text-primary font-medium underline underline-offset-2">browse your computer</span></p>
                <p className="text-xs text-muted-foreground/60 mt-3">Supports: PDF · PNG · JPG · XLSX · XLS · CSV · DOC · DOCX</p>
                <input ref={inputRef} type="file" className="hidden" multiple accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.doc,.docx" onChange={e=>{addFiles(Array.from(e.target.files??[]));e.target.value="";}}/>
              </div>

              {queue.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{queue.length} file{queue.length!==1?"s":""} selected</span>
                    <button onClick={()=>{setQueue([]);setStep("files");}} className="text-xs text-destructive hover:underline">Clear all</button>
                  </div>
                  {queue.map(item => (
                    <div key={item.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all",
                      item.status==="done"?"bg-green-50 border-green-200":
                      item.status==="error"?"bg-red-50 border-red-200":"bg-muted/30 border-muted")}>
                      <FileIcon type={detectFileType(item.file)} size="sm"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.file.name}</p>
                        <p className="text-xs text-muted-foreground">{fmtSize(item.file.size)}</p>
                        {item.status==="uploading" && <Progress value={item.progress} className="h-1 mt-1.5"/>}
                        {item.status==="error"     && <p className="text-xs text-destructive mt-0.5">{item.error}</p>}
                      </div>
                      <div className="shrink-0">
                        {item.status==="done"      && <CheckCircle2 className="w-5 h-5 text-green-500"/>}
                        {item.status==="uploading" && <span className="text-xs font-bold text-primary">{item.progress}%</span>}
                        {item.status==="error"     && <AlertCircle className="w-5 h-5 text-destructive"/>}
                        {item.status==="queued"    && <button onClick={()=>setQueue(q=>q.filter(i=>i.id!==item.id))} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-4 h-4"/></button>}
                      </div>
                    </div>
                  ))}
                  <Button className="w-full" onClick={()=>setStep("meta")}>
                    Continue — Add Metadata <ChevronRight className="w-4 h-4 ml-1"/>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Metadata ── */}
          {step === "meta" && (
            <div className="p-6 space-y-5">
              {/* File summary */}
              <div className="bg-muted/40 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-muted-foreground"/>
                  <span className="text-sm font-medium">{queue.length} file{queue.length!==1?"s":""} ready</span>
                  <span className="text-xs text-muted-foreground">({queue.map(i=>i.file.name).slice(0,2).join(", ")}{queue.length>2?` +${queue.length-2} more`:""})</span>
                </div>
                <button onClick={()=>setStep("files")} className="text-xs text-primary hover:underline">← Change</button>
              </div>

              {/* Metadata form — 2-col grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category — full width */}
                <div className="col-span-2">
                  <Label className="text-xs font-semibold mb-2 block">Document Category *</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => (
                      <button key={c.value} onClick={()=>set("docCategory",c.value)}
                        className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                          form.docCategory===c.value ? cn(c.color, "shadow-sm") : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Financial Year</Label>
                  <Select value={form.financialYear} onValueChange={v=>set("financialYear",v)}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue/></SelectTrigger>
                    <SelectContent>{FY_OPTIONS.map(f=><SelectItem key={f} value={f}>FY {f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Month / Period</Label>
                  <Select value={form.period} onValueChange={v=>set("period",v)}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select month"/></SelectTrigger>
                    <SelectContent>{Object.entries(MONTHS).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Filing Status</Label>
                  <Select value={form.filingStatus} onValueChange={v=>set("filingStatus",v)}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unfiled">Unfiled</SelectItem>
                      <SelectItem value="filed">Filed</SelectItem>
                      <SelectItem value="matched">Matched</SelectItem>
                      <SelectItem value="mismatched">Mismatched</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Department</Label>
                  <Select value={form.department} onValueChange={v=>set("department",v)}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select dept"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No department</SelectItem>
                      {DEPARTMENTS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Vendor Name</Label>
                  <Input className="mt-1 h-9" placeholder="e.g. Infosys BPM" value={form.vendorName} onChange={e=>set("vendorName",e.target.value)}/>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Client / Customer</Label>
                  <Input className="mt-1 h-9" placeholder="e.g. Tata Group" value={form.clientName} onChange={e=>set("clientName",e.target.value)}/>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Transaction Reference</Label>
                  <Input className="mt-1 h-9" placeholder="e.g. INV-2026-001" value={form.linkedEntityRef} onChange={e=>set("linkedEntityRef",e.target.value)}/>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Project</Label>
                  <Select value={form.project} onValueChange={v=>set("project",v)}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select project"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No project</SelectItem>
                      {PROJECTS.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label className="text-xs font-semibold">Tags <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
                  <Input className="mt-1 h-9" placeholder="gst, q1, mumbai" value={form.tagsRaw} onChange={e=>set("tagsRaw",e.target.value)}/>
                </div>

                <div className="col-span-2">
                  <Label className="text-xs font-semibold">Notes / Description</Label>
                  <Textarea className="mt-1 resize-none text-sm" rows={2} placeholder="Any additional context…" value={form.description} onChange={e=>set("description",e.target.value)}/>
                </div>
              </div>

              {anyError && !uploading && (
                <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/30"
                  onClick={()=>{ setQueue(q=>q.map(i=>i.status==="error"?{...i,status:"queued",progress:0,error:undefined}:i)); handleUpload(); }}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5"/>Retry failed files
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/20 shrink-0 flex items-center justify-between rounded-b-lg">
          {allDone ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4"/>All {queue.length} file{queue.length!==1?"s":""} uploaded successfully
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {step==="files" ? "Select files to continue" : pending > 0 ? `${pending} file${pending!==1?"s":""} ready to upload` : "All files processed"}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>{allDone ? "Done" : "Cancel"}</Button>
            {!allDone && step==="meta" && pending > 0 && (
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin"/>Uploading…</> : <><Upload className="w-4 h-4 mr-2"/>Upload {pending} File{pending!==1?"s":""}</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════
   DOCUMENT VIEWER MODAL
═══════════════════════════════════════ */
function DocViewer({ doc, onClose, onDelete }: { doc: Doc | null; onClose: () => void; onDelete: (id: number) => void }) {
  if (!doc) return null;
  const cat  = catMeta(doc.docCategory);
  const tags = parseTags(doc.tags);
  const cfg  = fc(doc.fileType);
  const fileApiUrl = doc.fileUrl ? `/api/documents/file/${doc.id}` : null;
  const canPreview = fileApiUrl && (doc.fileType === "pdf" || doc.fileType === "image");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-white shrink-0 rounded-t-lg">
          <FileIcon type={doc.fileType} size="sm"/>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{doc.name}</h2>
            <p className="text-xs text-muted-foreground">{fmtSize(doc.sizeBytes)} · Uploaded {fmtDate(doc.createdAt)} by {doc.uploadedBy}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <FilingBadge status={doc.filingStatus}/>
            <Badge className={cn("text-xs border", cat.color)}>{cat.label}</Badge>
            {fileApiUrl && (
              <a href={fileApiUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5"><ExternalLink className="w-3.5 h-3.5"/>Open</Button>
              </a>
            )}
            {fileApiUrl && (
              <a href={fileApiUrl} download={doc.originalName}>
                <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5"/>Download</Button>
              </a>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={()=>{onDelete(doc.id);onClose();}}>
              <Trash2 className="w-3.5 h-3.5"/>Delete
            </Button>
          </div>
        </div>

        {/* Body: preview + detail side by side */}
        <div className="flex-1 flex min-h-0">
          {/* Left: file preview */}
          <div className="flex-1 bg-gray-100 flex flex-col min-w-0">
            {canPreview ? (
              doc.fileType === "image" ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <img src={fileApiUrl!} alt={doc.name} className="max-w-full max-h-full object-contain rounded-xl shadow-lg"/>
                </div>
              ) : (
                <iframe src={`${fileApiUrl}#toolbar=1&navpanes=0`} className="flex-1 w-full border-0 rounded-none" title={doc.name}/>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className={cn("w-24 h-24 rounded-3xl flex flex-col items-center justify-center border-2", cfg.bg, cfg.border)}>
                  <span className={cn("text-xl font-black", cfg.text)}>{cfg.label}</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">{doc.originalName ?? doc.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fmtSize(doc.sizeBytes)}</p>
                  {!doc.fileUrl && <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">No file stored — metadata only record</p>}
                </div>
                {fileApiUrl && (
                  <a href={fileApiUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2"><ZoomIn className="w-4 h-4"/>Open in Browser</Button>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Right: full detail panel */}
          <div className="w-80 border-l bg-white flex flex-col shrink-0 overflow-y-auto">
            {/* Classification */}
            <div className="p-5 border-b">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Classification</p>
              <div className="space-y-2.5">
                <DetailRow icon={<FileCheck className="w-3.5 h-3.5"/>} label="Category">
                  <Badge className={cn("text-xs border", cat.color)}>{cat.label}</Badge>
                </DetailRow>
                <DetailRow icon={<CheckCircle2 className="w-3.5 h-3.5"/>} label="Status">
                  <FilingBadge status={doc.filingStatus}/>
                </DetailRow>
                <DetailRow icon={<File className="w-3.5 h-3.5"/>} label="File type">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", cfg.bg, cfg.text, cfg.border)}>{cfg.label}</span>
                </DetailRow>
              </div>
            </div>

            {/* Period */}
            <div className="p-5 border-b">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Period & Filing</p>
              <div className="space-y-2.5">
                {doc.financialYear && <DetailRow icon={<CalendarDays className="w-3.5 h-3.5"/>} label="Financial Year"><span className="text-sm font-medium">FY {doc.financialYear}</span></DetailRow>}
                {doc.period && <DetailRow icon={<CalendarDays className="w-3.5 h-3.5"/>} label="Period"><span className="text-sm font-medium">{MONTHS[doc.period]??doc.period}</span></DetailRow>}
                {doc.gstPeriod && <DetailRow icon={<FileCheck className="w-3.5 h-3.5"/>} label="GST Period"><span className="text-sm font-medium">{MONTHS[doc.gstPeriod]??doc.gstPeriod}</span></DetailRow>}
                {!doc.financialYear && !doc.period && !doc.gstPeriod && <p className="text-xs text-muted-foreground italic">No period set</p>}
              </div>
            </div>

            {/* Parties */}
            {(doc.vendorName || doc.clientName) && (
              <div className="p-5 border-b">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Parties</p>
                <div className="space-y-2.5">
                  {doc.vendorName && <DetailRow icon={<Building2 className="w-3.5 h-3.5"/>} label="Vendor"><span className="text-sm font-medium">{doc.vendorName}</span></DetailRow>}
                  {doc.clientName && <DetailRow icon={<User className="w-3.5 h-3.5"/>} label="Client"><span className="text-sm font-medium">{doc.clientName}</span></DetailRow>}
                </div>
              </div>
            )}

            {/* Context */}
            {(doc.department || doc.project || doc.linkedEntityRef) && (
              <div className="p-5 border-b">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Context</p>
                <div className="space-y-2.5">
                  {doc.department && <DetailRow icon={<Layers className="w-3.5 h-3.5"/>} label="Department"><span className="text-sm font-medium">{doc.department}</span></DetailRow>}
                  {doc.project && <DetailRow icon={<FolderOpen className="w-3.5 h-3.5"/>} label="Project"><span className="text-sm font-medium">{doc.project}</span></DetailRow>}
                  {doc.linkedEntityRef && (
                    <DetailRow icon={<Link2 className="w-3.5 h-3.5"/>} label="Linked to">
                      <span className="text-sm font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-md">{doc.linkedEntityRef}</span>
                    </DetailRow>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="p-5 border-b">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 text-xs border rounded-full px-2.5 py-0.5 bg-muted/40 text-gray-600">
                      <Tag className="w-2.5 h-2.5"/>{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {doc.description && (
              <div className="p-5 border-b">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Notes</p>
                <p className="text-sm text-gray-700 leading-relaxed">{doc.description}</p>
              </div>
            )}

            {/* Upload info */}
            <div className="p-5 mt-auto">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">File Info</p>
              <div className="space-y-2.5">
                <DetailRow icon={<User className="w-3.5 h-3.5"/>} label="Uploaded by"><span className="text-sm font-medium">{doc.uploadedBy}</span></DetailRow>
                <DetailRow icon={<CalendarDays className="w-3.5 h-3.5"/>} label="Upload date"><span className="text-sm font-medium">{fmtDate(doc.createdAt)}</span></DetailRow>
                <DetailRow icon={<File className="w-3.5 h-3.5"/>} label="File size"><span className="text-sm font-medium">{fmtSize(doc.sizeBytes)}</span></DetailRow>
                <DetailRow icon={<FileText className="w-3.5 h-3.5"/>} label="Original name">
                  <span className="text-xs font-medium text-muted-foreground truncate max-w-[160px]" title={doc.originalName}>{doc.originalName}</span>
                </DetailRow>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-muted-foreground/60 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   DOCUMENT CARD (grid)
═══════════════════════════════════════ */
function DocCard({ doc, onView, onDelete }: { doc: Doc; onView: (d: Doc) => void; onDelete: (id: number) => void }) {
  const cat  = catMeta(doc.docCategory);
  const tags = parseTags(doc.tags);
  const cfg  = fc(doc.fileType);

  return (
    <div
      className="group relative bg-white border border-border rounded-2xl cursor-pointer hover:shadow-md hover:border-primary/30 transition-all overflow-hidden"
      onClick={() => onView(doc)}>
      {/* File type banner */}
      <div className={cn("h-20 flex items-center justify-center relative", cfg.bg)}>
        <span className={cn("text-4xl font-black opacity-[0.12]", cfg.text)}>{cfg.label}</span>
        <div className={cn("absolute left-3 top-3 w-8 h-8 rounded-xl flex items-center justify-center border", cfg.bg, cfg.border, cfg.text)}>
          <span className="text-[9px] font-black">{cfg.label}</span>
        </div>
        {/* Hover actions */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="w-7 h-7 rounded-lg bg-white shadow border flex items-center justify-center text-blue-500 hover:bg-blue-50"
            onClick={e=>{e.stopPropagation();onView(doc);}} title="View"><Eye className="w-3.5 h-3.5"/></button>
          <button className="w-7 h-7 rounded-lg bg-white shadow border flex items-center justify-center text-destructive hover:bg-red-50"
            onClick={e=>{e.stopPropagation();onDelete(doc.id);}} title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>
        </div>
      </div>

      <div className="p-3.5 space-y-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{doc.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtSize(doc.sizeBytes)} · {fmtDate(doc.createdAt)}</p>
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge className={cn("text-[10px] px-1.5 py-0 border leading-4", cat.color)}>{cat.label}</Badge>
          <FilingBadge status={doc.filingStatus}/>
        </div>

        <div className="flex flex-wrap gap-1">
          {doc.financialYear && <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-md font-medium">FY {doc.financialYear}</span>}
          {doc.period && MONTHS[doc.period] && <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 px-1.5 py-0.5 rounded-md font-medium">{MONTHS[doc.period]}</span>}
          {doc.vendorName && <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-100 px-1.5 py-0.5 rounded-md font-medium truncate max-w-[80px]">{doc.vendorName}</span>}
          {doc.department && <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-md font-medium">{doc.department}</span>}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0,2).map(t => <span key={t} className="text-[10px] border rounded-full px-1.5 py-0 text-muted-foreground flex items-center gap-0.5"><Tag className="w-2.5 h-2.5"/>{t}</span>)}
            {tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{tags.length-2}</span>}
          </div>
        )}

        {doc.linkedEntityRef && (
          <div className="flex items-center gap-1 text-[10px] text-primary bg-primary/5 border border-primary/10 px-2 py-1 rounded-lg">
            <Link2 className="w-3 h-3 shrink-0"/><span className="truncate font-medium">{doc.linkedEntityRef}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   DOCUMENT LIST ROW
═══════════════════════════════════════ */
function DocRow({ doc, onView, onDelete }: { doc: Doc; onView: (d: Doc) => void; onDelete: (id: number) => void }) {
  const cat  = catMeta(doc.docCategory);
  const cfg  = fc(doc.fileType);
  return (
    <tr className="group hover:bg-muted/30 transition-colors cursor-pointer border-b last:border-0" onClick={() => onView(doc)}>
      <td className="py-3 pl-4 pr-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border text-[9px] font-black", cfg.bg, cfg.border, cfg.text)}>{cfg.label}</div>
      </td>
      <td className="py-3 pr-3 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{doc.name}</p>
        <p className="text-xs text-muted-foreground">{fmtSize(doc.sizeBytes)} · {doc.uploadedBy}</p>
      </td>
      <td className="py-3 pr-3 hidden md:table-cell">
        <Badge className={cn("text-xs border", cat.color)}>{cat.label}</Badge>
      </td>
      <td className="py-3 pr-3 hidden lg:table-cell">
        <div className="flex gap-1">
          {doc.financialYear && <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded font-medium">FY {doc.financialYear}</span>}
          {doc.period && MONTHS[doc.period] && <span className="text-[10px] bg-sky-50 text-sky-600 border border-sky-100 px-1.5 py-0.5 rounded font-medium">{MONTHS[doc.period]}</span>}
        </div>
      </td>
      <td className="py-3 pr-3 hidden xl:table-cell">
        {doc.linkedEntityRef && <span className="text-xs text-primary bg-primary/5 px-2 py-0.5 rounded-full"><Link2 className="w-3 h-3 inline mr-0.5"/>{doc.linkedEntityRef}</span>}
      </td>
      <td className="py-3 pr-3"><FilingBadge status={doc.filingStatus}/></td>
      <td className="py-3 pr-4 hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">{fmtDate(doc.createdAt)}</td>
      <td className="py-3 pr-3" onClick={e=>e.stopPropagation()}>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600" onClick={()=>onView(doc)}><Eye className="w-3.5 h-3.5"/></button>
          <button className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive" onClick={()=>onDelete(doc.id)}><Trash2 className="w-3.5 h-3.5"/></button>
        </div>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════ */
function EmptyState({ hasFilter, onUpload }: { hasFilter: boolean; onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <div className="w-20 h-20 rounded-3xl bg-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-center mb-5">
        <FileText className="w-9 h-9 text-primary/30"/>
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{hasFilter ? "No documents match" : "No documents yet"}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
        {hasFilter ? "Try adjusting your filters or search query." : "Upload invoices, bills, bank statements and other financial documents to keep them audit-ready."}
      </p>
      {!hasFilter && (
        <Button onClick={onUpload} className="gap-2"><Upload className="w-4 h-4"/>Upload First Document</Button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
export default function Documents() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [view, setView]         = useState<"grid"|"list">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewDoc, setViewDoc]   = useState<Doc|null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]     = useState("");
  const [sort, setSort]         = useState("newest");
  const [fCategory, setFCategory] = useState("all");
  const [fFY, setFFY]           = useState("");
  const [fFiling, setFFiling]   = useState("");
  const [fDept, setFDept]       = useState("");

  /* debounce */
  useEffect(() => { const t = setTimeout(()=>setSearch(searchInput),300); return ()=>clearTimeout(t); }, [searchInput]);

  const params = new URLSearchParams();
  if (search)             params.set("search", search);
  if (fCategory!=="all")  params.set("docCategory", fCategory);
  if (fFY)                params.set("financialYear", fFY);
  if (fFiling)            params.set("filingStatus", fFiling);
  if (fDept)              params.set("department", fDept);

  const { data: allDocs = [], isLoading, refetch } = useQuery<Doc[]>({
    queryKey: ["documents", params.toString()],
    queryFn: () => fetch(`/api/documents?${params}`).then(r=>r.json()),
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ["documents-summary"],
    queryFn: () => fetch("/api/documents/summary").then(r=>r.json()),
  });

  const docs = useMemo(() => {
    const arr = [...allDocs];
    if (sort==="newest")    arr.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    if (sort==="oldest")    arr.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
    if (sort==="name_asc")  arr.sort((a,b)=>a.name.localeCompare(b.name));
    if (sort==="name_desc") arr.sort((a,b)=>b.name.localeCompare(a.name));
    if (sort==="size_desc") arr.sort((a,b)=>b.sizeBytes-a.sizeBytes);
    if (sort==="size_asc")  arr.sort((a,b)=>a.sizeBytes-b.sizeBytes);
    return arr;
  }, [allDocs, sort]);

  const deleteMut = useMutation({
    mutationFn: (id:number) => fetch(`/api/documents/${id}`,{method:"DELETE"}).then(r=>r.json()),
    onSuccess: () => { qc.invalidateQueries({queryKey:["documents"]}); qc.invalidateQueries({queryKey:["documents-summary"]}); },
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function handleDelete(id: number) {
    setConfirmDeleteId(id);
  }

  function doDeleteDoc() {
    if (confirmDeleteId == null) return;
    deleteMut.mutate(confirmDeleteId);
    toast({ title: "Document deleted" });
    if (viewDoc?.id === confirmDeleteId) setViewDoc(null);
    setConfirmDeleteId(null);
  }

  function handleUploaded() {
    qc.invalidateQueries({queryKey:["documents"]});
    qc.invalidateQueries({queryKey:["documents-summary"]});
    toast({ title: "Upload complete", description: "Documents are now in the repository." });
  }

  const totals  = summary?.totals ?? { total:0, totalSize:0, filed:0, unfiled:0, linked:0, pdfCount:0, imageCount:0, excelCount:0 };
  const hasFilter = fCategory!=="all" || !!fFY || !!fFiling || !!fDept || !!search;

  function clearFilters() { setFCategory("all"); setFFY(""); setFFiling(""); setFDept(""); setSearchInput(""); setSearch(""); }

  return (
    <div className="h-full flex flex-col bg-muted/20 overflow-hidden">

      {/* ── TOP HEADER ── */}
      <div className="bg-white border-b shrink-0">
        <div className="px-6 py-4 flex items-center gap-4">
          <div className="shrink-0">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Document Repository</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totals.total} documents · {fmtSize(totals.totalSize)} stored
            </p>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <Input
              className="pl-9 h-9 bg-muted/40 border-muted placeholder:text-muted-foreground/60"
              placeholder="Search by name, vendor, reference…"
              value={searchInput}
              onChange={e=>setSearchInput(e.target.value)}/>
            {searchInput && (
              <button onClick={()=>{setSearchInput("");setSearch("");}} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5"/>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 w-36 text-xs gap-1"><ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground"/><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" className="text-xs">Newest first</SelectItem>
                <SelectItem value="oldest" className="text-xs">Oldest first</SelectItem>
                <SelectItem value="name_asc" className="text-xs">Name A→Z</SelectItem>
                <SelectItem value="name_desc" className="text-xs">Name Z→A</SelectItem>
                <SelectItem value="size_desc" className="text-xs">Largest first</SelectItem>
                <SelectItem value="size_asc" className="text-xs">Smallest first</SelectItem>
              </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden bg-white">
              <button onClick={()=>setView("grid")} className={cn("px-2.5 py-1.5 flex items-center gap-1.5 text-xs transition-colors border-r",
                view==="grid"?"bg-primary text-white":"text-muted-foreground hover:bg-muted")}>
                <Grid3X3 className="w-3.5 h-3.5"/><span className="hidden sm:inline">Grid</span>
              </button>
              <button onClick={()=>setView("list")} className={cn("px-2.5 py-1.5 flex items-center gap-1.5 text-xs transition-colors",
                view==="list"?"bg-primary text-white":"text-muted-foreground hover:bg-muted")}>
                <List className="w-3.5 h-3.5"/><span className="hidden sm:inline">List</span>
              </button>
            </div>

            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={()=>refetch()} title="Refresh">
              <RefreshCw className="w-4 h-4 text-muted-foreground"/>
            </Button>

            <Button size="sm" className="h-9 gap-2 px-4" onClick={()=>setUploadOpen(true)}>
              <Plus className="w-4 h-4"/>Upload
            </Button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="px-6 pb-3 flex items-center gap-2 overflow-x-auto">
          {[
            { label:"Total",   value:totals.total,      icon:<File className="w-3.5 h-3.5"/>,          active: false,        onClick: ()=>clearFilters() },
            { label:"Filed",   value:totals.filed,      icon:<CheckCircle2 className="w-3.5 h-3.5"/>,  active: fFiling==="filed",    onClick: ()=>setFFiling(p=>p==="filed"?"":"filed") },
            { label:"Unfiled", value:totals.unfiled,    icon:<Clock className="w-3.5 h-3.5"/>,          active: fFiling==="unfiled",  onClick: ()=>setFFiling(p=>p==="unfiled"?"":"unfiled") },
            { label:"Linked",  value:totals.linked,     icon:<Link2 className="w-3.5 h-3.5"/>,          active: false,        onClick: ()=>{} },
            { label:"PDFs",    value:totals.pdfCount,   icon:<FileText className="w-3.5 h-3.5"/>,       active: false,        onClick: ()=>{} },
            { label:"Images",  value:totals.imageCount, icon:<Image className="w-3.5 h-3.5"/>,          active: false,        onClick: ()=>{} },
            { label:"Sheets",  value:totals.excelCount, icon:<FileSpreadsheet className="w-3.5 h-3.5"/>,active: false,        onClick: ()=>{} },
          ].map(k => (
            <button key={k.label} onClick={k.onClick}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-all shrink-0",
                k.active ? "bg-primary/10 border-primary/30 text-primary font-semibold" : "bg-white text-gray-600 hover:bg-muted/40")}>
              {k.icon}<span className="font-semibold">{k.value}</span><span className="text-muted-foreground">{k.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY: sidebar + content ── */}
      <div className="flex-1 flex min-h-0">
        {/* ── Left filter sidebar ── */}
        <aside className="w-56 bg-white border-r shrink-0 flex flex-col overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Filter className="w-3 h-3"/>Filters</span>
              {hasFilter && <button onClick={clearFilters} className="text-[10px] text-primary hover:underline font-medium">Clear all</button>}
            </div>

            {/* Category filter */}
            <div className="space-y-0.5">
              <button onClick={()=>setFCategory("all")}
                className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors text-left",
                  fCategory==="all" ? "bg-primary text-white font-medium" : "text-gray-600 hover:bg-muted/50")}>
                <File className="w-3.5 h-3.5 shrink-0"/>
                <span className="flex-1">All Documents</span>
                <span className={cn("text-[10px] font-bold rounded-full px-1.5", fCategory==="all"?"bg-white/20 text-white":"bg-muted text-muted-foreground")}>{totals.total}</span>
              </button>
              {CATEGORIES.map(c => {
                const cnt = summary?.byCategory?.find(b=>b.docCategory===c.value)?.count ?? 0;
                if (cnt === 0 && fCategory !== c.value) return null;
                return (
                  <button key={c.value} onClick={()=>setFCategory(p=>p===c.value?"all":c.value)}
                    className={cn("w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left",
                      fCategory===c.value ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-muted/50")}>
                    <span className="flex-1 text-xs">{c.label}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground">{cnt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FY filter */}
          <div className="p-4 border-b">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Financial Year</p>
            <div className="space-y-0.5">
              {FY_OPTIONS.map(fy => {
                const cnt = summary?.byCategory ? 0 : 0; // just show options
                return (
                  <button key={fy} onClick={()=>setFFY(p=>p===fy?"":fy)}
                    className={cn("w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                      fFY===fy ? "bg-primary/10 text-primary font-semibold" : "text-gray-600 hover:bg-muted/50")}>
                    FY {fy}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department filter */}
          <div className="p-4 border-b">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Department</p>
            <div className="space-y-0.5">
              {DEPARTMENTS.map(d => (
                <button key={d} onClick={()=>setFDept(p=>p===d?"":d)}
                  className={cn("w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                    fDept===d ? "bg-primary/10 text-primary font-semibold" : "text-gray-600 hover:bg-muted/50")}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Active filter chips */}
          {hasFilter && (
            <div className="px-5 py-2.5 border-b bg-white flex items-center gap-2 shrink-0 flex-wrap">
              <span className="text-xs text-muted-foreground">Showing {docs.length} result{docs.length!==1?"s":""}:</span>
              {fCategory!=="all" && <FilterChip label={`Category: ${catMeta(fCategory).label}`} onRemove={()=>setFCategory("all")}/>}
              {fFY && <FilterChip label={`FY ${fFY}`} onRemove={()=>setFFY("")}/>}
              {fFiling && <FilterChip label={`Status: ${fFiling}`} onRemove={()=>setFFiling("")}/>}
              {fDept && <FilterChip label={`Dept: ${fDept}`} onRemove={()=>setFDept("")}/>}
              {search && <FilterChip label={`"${search}"`} onRemove={()=>{setSearchInput("");setSearch("");}}/>}
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground"/>
              </div>
            ) : docs.length === 0 ? (
              <EmptyState hasFilter={hasFilter} onUpload={()=>setUploadOpen(true)}/>
            ) : view === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {docs.map(doc => (
                  <DocCard key={doc.id} doc={doc} onView={setViewDoc} onDelete={handleDelete}/>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="py-3 pl-4 pr-2 w-10"></th>
                      <th className="py-3 pr-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Document</th>
                      <th className="py-3 pr-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Category</th>
                      <th className="py-3 pr-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Period</th>
                      <th className="py-3 pr-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Reference</th>
                      <th className="py-3 pr-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="py-3 pr-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Date</th>
                      <th className="py-3 pr-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map(doc => <DocRow key={doc.id} doc={doc} onView={setViewDoc} onDelete={handleDelete}/>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <UploadModal open={uploadOpen} onClose={()=>setUploadOpen(false)} onUploaded={handleUploaded}/>
      {viewDoc && <DocViewer doc={viewDoc} onClose={()=>setViewDoc(null)} onDelete={handleDelete}/>}

      <ConfirmDialog
        open={confirmDeleteId != null}
        onOpenChange={o => !o && setConfirmDeleteId(null)}
        title="Delete Document"
        description="This will permanently remove the document from the repository. This action cannot be undone."
        confirmLabel="Delete Document"
        variant="destructive"
        onConfirm={doDeleteDoc}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-primary/60"><X className="w-3 h-3"/></button>
    </span>
  );
}
