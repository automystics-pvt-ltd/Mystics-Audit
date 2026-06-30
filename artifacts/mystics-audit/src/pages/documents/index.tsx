import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Image, Table2, FileSpreadsheet, Search, Upload,
  Grid3X3, List, Tag, Link2, Trash2, Download, Eye,
  CheckCircle2, Clock, AlertCircle, MoreHorizontal, RefreshCw,
  SlidersHorizontal, ChevronDown, X, CheckSquare, Square,
  CalendarDays, FolderOpen, Layers, AlertTriangle,
  RotateCcw, ArrowUpDown, Filter,
  TrendingUp, File, FileCheck, Archive,
  Building2, User, Hash, Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────── types ─────────────── */
interface Doc {
  id: number; name: string; originalName: string; fileType: string;
  mimeType: string; sizeBytes: number; fileUrl?: string;
  docCategory: string; financialYear?: string; period?: string;
  gstPeriod?: string; vendorName?: string; project?: string;
  department?: string; expenseCategory?: string; clientName?: string;
  tags: string; description?: string; linkedEntityType?: string;
  linkedEntityId?: number; linkedEntityRef?: string;
  filingStatus: string; uploadedBy: string; createdAt: string;
}
interface UploadItem {
  id: string; file: File; status: "queued"|"uploading"|"done"|"error";
  progress: number; error?: string;
}
interface Summary {
  totals: { total: number; totalSize: number; filed: number; unfiled: number; linked: number; pdfCount: number; imageCount: number; excelCount: number };
  byCategory: Array<{ docCategory: string; count: number; totalSize: number }>;
  byFY: Array<{ financialYear: string; count: number }>;
}

/* ─────────────── constants ─────────────── */
const CATEGORIES = [
  { value:"invoice",        label:"Sales Invoice",     color:"bg-blue-100 text-blue-800",   accent:"#3b82f6" },
  { value:"bill",           label:"Vendor Bill",       color:"bg-purple-100 text-purple-800", accent:"#8b5cf6" },
  { value:"receipt",        label:"Receipt",           color:"bg-emerald-100 text-emerald-800", accent:"#10b981" },
  { value:"purchase_doc",   label:"Purchase Doc",      color:"bg-orange-100 text-orange-800", accent:"#f97316" },
  { value:"vendor_invoice", label:"Vendor Invoice",    color:"bg-pink-100 text-pink-800",   accent:"#ec4899" },
  { value:"gst_doc",        label:"GST Document",      color:"bg-yellow-100 text-yellow-800", accent:"#eab308" },
  { value:"bank_statement", label:"Bank Statement",    color:"bg-cyan-100 text-cyan-800",   accent:"#06b6d4" },
  { value:"contract",       label:"Contract / Legal",  color:"bg-red-100 text-red-800",     accent:"#ef4444" },
  { value:"supporting",     label:"Supporting Doc",    color:"bg-gray-100 text-gray-800",   accent:"#6b7280" },
  { value:"other",          label:"Other",             color:"bg-slate-100 text-slate-800", accent:"#94a3b8" },
];

const FY_OPTIONS = ["2026-27","2025-26","2024-25","2023-24"];
const MONTHS: Record<string,string> = {
  "2026-06":"Jun 2026","2026-05":"May 2026","2026-04":"Apr 2026",
  "2026-03":"Mar 2026","2026-02":"Feb 2026","2026-01":"Jan 2026",
  "2025-12":"Dec 2025","2025-11":"Nov 2025","2025-10":"Oct 2025",
  "2025-09":"Sep 2025","2025-08":"Aug 2025","2025-07":"Jul 2025","2025-06":"Jun 2025",
};
const DEPARTMENTS = ["Finance","Operations","HR","Sales","Marketing","Technology","Admin","Legal","Projects"];
const PROJECTS    = ["Project Alpha","Project Beta","Infra Upgrade","Client Onboarding","Internal Ops"];
const ENTITY_TYPES = [
  { value:"invoice", label:"Invoice" },{ value:"bill", label:"Bill" },
  { value:"expense", label:"Expense Claim" },{ value:"receipt", label:"Receipt" },
  { value:"payment", label:"Payment" },{ value:"journal", label:"Journal Entry" },
  { value:"gst_doc", label:"GST Document" },
];
const SORT_OPTIONS = [
  { value:"newest",    label:"Newest first" },
  { value:"oldest",    label:"Oldest first" },
  { value:"name_asc",  label:"Name A→Z" },
  { value:"name_desc", label:"Name Z→A" },
  { value:"size_desc", label:"Largest first" },
  { value:"size_asc",  label:"Smallest first" },
];
const FILING = [
  { value:"unfiled",    label:"Unfiled",   color:"text-gray-500" },
  { value:"filed",      label:"Filed",     color:"text-green-600" },
  { value:"matched",    label:"Matched",   color:"text-blue-600" },
  { value:"mismatched", label:"Mismatch",  color:"text-red-600" },
];

/* ─────────────── helpers ─────────────── */
function fmtSize(b: number) {
  if (b>=1_000_000) return `${(b/1_000_000).toFixed(1)} MB`;
  if (b>=1_000)     return `${(b/1_000).toFixed(0)} KB`;
  return `${b} B`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
}
function fmtMonth(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN",{month:"long",year:"numeric"});
}
function parseTags(raw: string): string[] { try { return JSON.parse(raw)??[]; } catch { return []; } }
function catMeta(cat: string) { return CATEGORIES.find(c=>c.value===cat)??CATEGORIES[CATEGORIES.length-1]; }
function detectFileType(f: File) {
  if (f.type.startsWith("image/")) return "image";
  if (f.name.endsWith(".xlsx")||f.name.endsWith(".xls")) return "excel";
  if (f.name.endsWith(".csv")) return "csv";
  if (f.name.endsWith(".doc")||f.name.endsWith(".docx")) return "word";
  return "pdf";
}
const FILE_TYPE_CONFIG: Record<string,{ bg:string; text:string; label:string }> = {
  pdf:   { bg:"bg-red-50",     text:"text-red-600",    label:"PDF"  },
  image: { bg:"bg-emerald-50", text:"text-emerald-600",label:"IMG"  },
  excel: { bg:"bg-green-50",   text:"text-green-700",  label:"XLS"  },
  csv:   { bg:"bg-orange-50",  text:"text-orange-600", label:"CSV"  },
  word:  { bg:"bg-blue-50",    text:"text-blue-600",   label:"DOC"  },
  other: { bg:"bg-gray-50",    text:"text-gray-600",   label:"FILE" },
};
function ftc(type: string) { return FILE_TYPE_CONFIG[type]??FILE_TYPE_CONFIG.other; }

/* ─────────────── sub-components ─────────────── */

function FileTypeBadge({ type, size="md" }: { type: string; size?: "sm"|"md"|"lg" }) {
  const c = ftc(type);
  const dim = size==="lg"?"w-14 h-14 text-sm":size==="sm"?"w-8 h-8 text-xs":"w-10 h-10 text-xs";
  return (
    <div className={cn("rounded-xl flex items-center justify-center font-bold border shrink-0", dim, c.bg, c.text)}>
      {c.label}
    </div>
  );
}

function FilingBadge({ status }: { status: string }) {
  if (status==="filed")     return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1"><CheckCircle2 className="w-3 h-3"/>Filed</Badge>;
  if (status==="matched")   return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs gap-1"><CheckCircle2 className="w-3 h-3"/>Matched</Badge>;
  if (status==="mismatched")return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs gap-1"><AlertCircle className="w-3 h-3"/>Mismatch</Badge>;
  return <Badge variant="outline" className="text-gray-500 text-xs gap-1"><Clock className="w-3 h-3"/>Unfiled</Badge>;
}

/* ── Upload Queue Item ── */
function UploadQueueItem({ item, onRemove }: { item: UploadItem; onRemove: (id:string)=>void }) {
  const c = ftc(detectFileType(item.file));
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all",
      item.status==="done" ?"bg-green-50 border-green-200":
      item.status==="error"?"bg-red-50 border-red-200":
      item.status==="uploading"?"bg-primary/5 border-primary/30":"bg-gray-50 border-gray-200")}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0", c.bg, c.text)}>{c.label}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.file.name}</p>
        <p className="text-xs text-gray-400">{fmtSize(item.file.size)}</p>
        {item.status==="uploading" && <Progress value={item.progress} className="h-1 mt-1.5" />}
        {item.status==="error"     && <p className="text-xs text-red-600 mt-0.5">{item.error||"Upload failed"}</p>}
      </div>
      <div className="shrink-0">
        {item.status==="done"      && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        {item.status==="uploading" && <span className="text-xs font-semibold text-primary">{item.progress}%</span>}
        {item.status==="error"     && <AlertCircle className="w-5 h-5 text-red-500" />}
        {item.status==="queued"    && (
          <button onClick={()=>onRemove(item.id)} className="p-1 rounded hover:bg-gray-200 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Drop Zone ── */
function DropZone({ onFiles, compact=false }: { onFiles:(files:File[])=>void; compact?:boolean }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handle = useCallback((files: FileList|null) => { if(files) onFiles(Array.from(files)); }, [onFiles]);

  return (
    <div className={cn(
      "border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all select-none",
      compact?"p-5":"p-8",
      dragging?"border-primary bg-primary/5 scale-[1.005]":"border-gray-200 hover:border-primary/60 hover:bg-gray-50/80"
    )}
      onDragOver={e=>{e.preventDefault();setDragging(true);}}
      onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false);}}
      onDrop={e=>{e.preventDefault();setDragging(false);handle(e.dataTransfer.files);}}
      onClick={()=>inputRef.current?.click()}>
      <div className={cn("mx-auto mb-3 rounded-2xl flex items-center justify-center bg-primary/10 text-primary",
        compact?"w-10 h-10":"w-14 h-14")}>
        <Upload className={compact?"w-5 h-5":"w-7 h-7"} />
      </div>
      <p className="text-sm font-semibold text-gray-800">
        {dragging?"Drop files here":"Drag & drop files here"}
      </p>
      <p className="text-xs text-gray-400 mt-1">or <span className="text-primary font-medium underline">browse files</span></p>
      {!compact && <p className="text-xs text-gray-300 mt-2">PDF, Images, Excel, Word, CSV — up to 25 MB each</p>}
      <input ref={inputRef} type="file" className="hidden" multiple
        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.doc,.docx"
        onChange={e=>handle(e.target.files)} />
    </div>
  );
}

/* ── Upload Modal ── */
function UploadModal({ open, onClose, onSave }: { open:boolean; onClose:()=>void; onSave:(data:any)=>void }) {
  const [queue, setQueue]   = useState<UploadItem[]>([]);
  const [step, setStep]     = useState<"drop"|"meta">("drop");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    docCategory:"supporting", financialYear:"2025-26", period:"2026-06",
    gstPeriod:"", vendorName:"", project:"", department:"",
    clientName:"", linkedEntityType:"", linkedEntityRef:"",
    filingStatus:"unfiled", description:"", tagsRaw:"",
  });
  const set = (k:string, v:string) => setForm(p=>({...p,[k]:v}));

  function addFiles(files: File[]) {
    const valid = files.filter(f => f.size <= 25_000_000);
    const invalid = files.filter(f => f.size > 25_000_000);
    if (invalid.length > 0) {
      /* show inline notice */
    }
    setQueue(q => [
      ...q,
      ...valid.map(f=>({ id:`${Date.now()}_${f.name}_${Math.random()}`, file:f, status:"queued" as const, progress:0 }))
    ]);
    if (valid.length > 0) setStep("meta");
  }

  function removeFromQueue(id: string) {
    setQueue(q => q.filter(i=>i.id!==id));
    if (queue.length === 1) setStep("drop");
  }

  async function handleUpload() {
    if (queue.length === 0) return;
    setUploading(true);
    const tags = JSON.stringify(form.tagsRaw.split(",").map(t=>t.trim()).filter(Boolean));

    for (let idx = 0; idx < queue.length; idx++) {
      const item = queue[idx];
      if (item.status === "done") continue;

      // Start uploading
      setQueue(q => q.map(i=>i.id===item.id?{...i,status:"uploading",progress:0}:i));

      // Simulate progress
      await new Promise<void>(resolve => {
        let p = 0;
        const iv = setInterval(() => {
          p = Math.min(p + Math.random()*25 + 5, 90);
          setQueue(q=>q.map(i=>i.id===item.id?{...i,progress:Math.round(p)}:i));
          if (p >= 90) { clearInterval(iv); resolve(); }
        }, 120);
      });

      try {
        await onSave({
          ...form, tags,
          name: item.file.name, originalName: item.file.name,
          fileType: detectFileType(item.file),
          mimeType: item.file.type || "application/octet-stream",
          sizeBytes: item.file.size,
          fileUrl: `https://storage.mystics.app/docs/${Date.now()}_${item.file.name}`,
        });
        setQueue(q => q.map(i=>i.id===item.id?{...i,status:"done",progress:100}:i));
      } catch (e: any) {
        setQueue(q => q.map(i=>i.id===item.id?{...i,status:"error",error:e.message||"Upload failed"}:i));
      }
    }
    setUploading(false);
  }

  function handleClose() {
    setQueue([]); setStep("drop"); setUploading(false);
    setForm({ docCategory:"supporting", financialYear:"2025-26", period:"2026-06",
      gstPeriod:"", vendorName:"", project:"", department:"",
      clientName:"", linkedEntityType:"", linkedEntityRef:"",
      filingStatus:"unfiled", description:"", tagsRaw:"" });
    onClose();
  }

  const allDone   = queue.length > 0 && queue.every(i=>i.status==="done");
  const anyError  = queue.some(i=>i.status==="error");
  const pending   = queue.filter(i=>i.status==="queued"||i.status==="uploading").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Upload className="w-5 h-5 text-primary"/>Upload Documents</h2>
            <p className="text-xs text-gray-400 mt-0.5">Attach financial documents with complete metadata for audit-ready filing</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step pills */}
          <div className="flex gap-1 px-6 pt-4">
            {["drop","meta"].map((s,i)=>(
              <button key={s} onClick={()=>setStep(s as any)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  step===s?"bg-primary text-white":"bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold",
                  step===s?"bg-white/20":"bg-gray-300/50")}>{i+1}</span>
                {s==="drop"?"Select Files":"Set Metadata"}
              </button>
            ))}
          </div>

          <div className="px-6 py-4 space-y-4">
            {step==="drop" && (
              <>
                <DropZone onFiles={addFiles} />
                {queue.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{queue.length} file{queue.length!==1?"s":""} selected</span>
                      <button onClick={()=>{setQueue([]);setStep("drop");}} className="text-xs text-red-500 hover:underline">Clear all</button>
                    </div>
                    <div className="space-y-2">
                      {queue.map(item=><UploadQueueItem key={item.id} item={item} onRemove={removeFromQueue}/>)}
                    </div>
                    <Button className="w-full mt-3" onClick={()=>setStep("meta")}>
                      Continue to Metadata →
                    </Button>
                  </div>
                )}
              </>
            )}

            {step==="meta" && (
              <>
                {/* Queue preview (compact) */}
                {queue.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{queue.length} file{queue.length!==1?"s":""} ready</span>
                      <button onClick={()=>setStep("drop")} className="text-xs text-primary hover:underline">← Change files</button>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5">
                      {queue.map(item=><UploadQueueItem key={item.id} item={item} onRemove={removeFromQueue}/>)}
                    </div>
                    {anyError && !uploading && (
                      <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200"
                        onClick={()=>{ setQueue(q=>q.map(i=>i.status==="error"?{...i,status:"queued",progress:0,error:undefined}:i)); handleUpload(); }}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5"/>Retry failed files
                      </Button>
                    )}
                  </div>
                )}

                {/* Metadata form */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold">Document Category *</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {CATEGORIES.map(c=>(
                        <button key={c.value} onClick={()=>set("docCategory",c.value)}
                          className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                            form.docCategory===c.value?cn(c.color,"border-current shadow-sm font-semibold"):"bg-white text-gray-500 border-gray-200 hover:border-gray-300")}>
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
                    <Label className="text-xs font-semibold">GST Filing Period</Label>
                    <Select value={form.gstPeriod} onValueChange={v=>set("gstPeriod",v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="GST period (optional)"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Not applicable</SelectItem>
                        {Object.entries(MONTHS).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Filing Status</Label>
                    <Select value={form.filingStatus} onValueChange={v=>set("filingStatus",v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {FILING.map(f=><SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
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
                    <Label className="text-xs font-semibold">Project</Label>
                    <Select value={form.project} onValueChange={v=>set("project",v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select project"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No project</SelectItem>
                        {PROJECTS.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Link to Transaction</Label>
                    <Select value={form.linkedEntityType} onValueChange={v=>set("linkedEntityType",v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Entity type"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No link</SelectItem>
                        {ENTITY_TYPES.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Transaction Reference</Label>
                    <Input className="mt-1 h-9" placeholder="e.g. INV-2026-001" value={form.linkedEntityRef} onChange={e=>set("linkedEntityRef",e.target.value)}/>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs font-semibold">Tags <span className="text-gray-400 font-normal">(comma separated)</span></Label>
                    <Input className="mt-1 h-9" placeholder="gst, q4, audit, vendor, travel…" value={form.tagsRaw} onChange={e=>set("tagsRaw",e.target.value)}/>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs font-semibold">Notes</Label>
                    <Textarea className="mt-1 resize-none text-sm" rows={2} placeholder="Add context or notes about this document…" value={form.description} onChange={e=>set("description",e.target.value)}/>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50/60 shrink-0 flex items-center justify-between">
          {allDone ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4"/>All files uploaded successfully
            </div>
          ) : (
            <p className="text-xs text-gray-400">{queue.length===0?"No files selected yet":pending>0?`${pending} file${pending!==1?"s":""} ready to upload`:anyError?"Some files failed — use Retry":"All files uploaded"}</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>{allDone?"Close":"Cancel"}</Button>
            {!allDone && step==="meta" && queue.length>0 && (
              <Button onClick={handleUpload} disabled={uploading||queue.filter(i=>i.status==="queued").length===0}>
                {uploading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin"/>Uploading…</> : <><Upload className="w-4 h-4 mr-2"/>Upload {queue.filter(i=>i.status==="queued").length} File{queue.filter(i=>i.status==="queued").length!==1?"s":""}</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Document Detail Drawer ── */
function DocDrawer({ doc, onClose, onDelete }: { doc: Doc|null; onClose:()=>void; onDelete:(id:number)=>void }) {
  if (!doc) return null;
  const cat  = catMeta(doc.docCategory);
  const tags = parseTags(doc.tags);
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose}/>
      <div className="fixed right-0 top-0 h-full w-96 bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex items-start gap-3">
            <FileTypeBadge type={doc.fileType} size="lg"/>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight break-all">{doc.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{fmtSize(doc.sizeBytes)} · Uploaded {fmtDate(doc.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"><X className="w-4 h-4"/></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Preview placeholder */}
          <div className={cn("rounded-2xl h-48 flex flex-col items-center justify-center", ftc(doc.fileType).bg)}>
            <div className={cn("text-3xl font-bold opacity-30", ftc(doc.fileType).text)}>{ftc(doc.fileType).label}</div>
            <p className="text-xs text-gray-400 mt-2">Preview not available</p>
            {doc.fileUrl && (
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-3">
                <Button variant="outline" size="sm"><Eye className="w-3.5 h-3.5 mr-1.5"/>Open File</Button>
              </a>
            )}
          </div>

          {/* Category & filing */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-xs", cat.color)}>{cat.label}</Badge>
            <FilingBadge status={doc.filingStatus}/>
            {doc.linkedEntityRef && (
              <span className="inline-flex items-center gap-1 text-xs bg-primary/5 text-primary px-2 py-0.5 rounded-full">
                <Link2 className="w-3 h-3"/>{doc.linkedEntityRef}
              </span>
            )}
          </div>

          {/* Metadata grid */}
          <div className="space-y-3">
            {[
              { label:"Financial Year", value:doc.financialYear?`FY ${doc.financialYear}`:null, icon:<CalendarDays className="w-3.5 h-3.5"/> },
              { label:"Period / Month",  value:doc.period?MONTHS[doc.period]??doc.period:null, icon:<CalendarDays className="w-3.5 h-3.5"/> },
              { label:"GST Period",      value:doc.gstPeriod?MONTHS[doc.gstPeriod]??doc.gstPeriod:null, icon:<FileCheck className="w-3.5 h-3.5"/> },
              { label:"Vendor",          value:doc.vendorName, icon:<Building2 className="w-3.5 h-3.5"/> },
              { label:"Client",          value:doc.clientName, icon:<User className="w-3.5 h-3.5"/> },
              { label:"Department",      value:doc.department, icon:<Layers className="w-3.5 h-3.5"/> },
              { label:"Project",         value:doc.project, icon:<FolderOpen className="w-3.5 h-3.5"/> },
              { label:"Uploaded by",     value:doc.uploadedBy, icon:<User className="w-3.5 h-3.5"/> },
            ].filter(r=>r.value).map(row=>(
              <div key={row.label} className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5 shrink-0">{row.icon}</span>
                <div>
                  <p className="text-xs text-gray-400">{row.label}</p>
                  <p className="text-sm font-medium text-gray-800">{row.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1"><Tag className="w-3 h-3"/>Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t=><span key={t} className="text-xs border text-gray-600 px-2 py-0.5 rounded-full bg-gray-50">{t}</span>)}
              </div>
            </div>
          )}

          {/* Description */}
          {doc.description && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">{doc.description}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t flex gap-2">
          {doc.fileUrl && (
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" className="w-full"><Download className="w-4 h-4 mr-1.5"/>Download</Button>
            </a>
          )}
          <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={()=>{onDelete(doc.id);onClose();}}>
            <Trash2 className="w-4 h-4"/>
          </Button>
        </div>
      </div>
    </>
  );
}

/* ── Grid Card ── */
function DocCard({ doc, selected, onToggle, onPreview, onDelete }: {
  doc: Doc; selected: boolean;
  onToggle:(id:number)=>void; onPreview:(doc:Doc)=>void; onDelete:(id:number)=>void;
}) {
  const cat  = catMeta(doc.docCategory);
  const tags = parseTags(doc.tags);
  return (
    <div className={cn(
      "group relative border rounded-2xl bg-white transition-all cursor-pointer",
      "hover:shadow-md hover:border-primary/30",
      selected&&"border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/20"
    )} onClick={()=>onPreview(doc)}>
      {/* Select checkbox */}
      <button className={cn("absolute top-3 left-3 z-10 transition-opacity", selected?"opacity-100":"opacity-0 group-hover:opacity-100")}
        onClick={e=>{e.stopPropagation();onToggle(doc.id);}}>
        {selected ? <CheckSquare className="w-4 h-4 text-primary"/> : <Square className="w-4 h-4 text-gray-400"/>}
      </button>

      {/* Thumbnail bar */}
      <div className={cn("rounded-t-2xl h-24 flex items-center justify-center", ftc(doc.fileType).bg)}>
        <span className={cn("text-4xl font-black opacity-20", ftc(doc.fileType).text)}>{ftc(doc.fileType).label}</span>
      </div>

      <div className="p-3.5">
        {/* Name */}
        <p className="text-sm font-semibold text-gray-900 truncate leading-tight mb-0.5">{doc.name}</p>
        <p className="text-xs text-gray-400">{fmtSize(doc.sizeBytes)} · {fmtDate(doc.createdAt)}</p>

        {/* Category + filing */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <Badge className={cn("text-xs", cat.color)}>{cat.label}</Badge>
          <FilingBadge status={doc.filingStatus}/>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-1 mt-2">
          {doc.financialYear && <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md">FY {doc.financialYear}</span>}
          {doc.period && MONTHS[doc.period] && <span className="text-xs bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded-md">{MONTHS[doc.period]}</span>}
          {doc.vendorName && <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-md truncate max-w-[90px]" title={doc.vendorName}>{doc.vendorName}</span>}
          {doc.department && <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-md">{doc.department}</span>}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.slice(0,2).map(t=><span key={t} className="text-xs border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Tag className="w-2.5 h-2.5"/>{t}</span>)}
            {tags.length>2&&<span className="text-xs text-gray-400">+{tags.length-2}</span>}
          </div>
        )}

        {/* Linked ref */}
        {doc.linkedEntityRef && (
          <div className="flex items-center gap-1 text-xs text-primary bg-primary/5 px-2 py-1 rounded-lg mt-2">
            <Link2 className="w-3 h-3 shrink-0"/><span className="truncate">{doc.linkedEntityRef}</span>
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 rounded-lg bg-white shadow-sm border hover:bg-blue-50 text-gray-400 hover:text-blue-600"
          onClick={e=>{e.stopPropagation();onPreview(doc);}}>
          <Eye className="w-3.5 h-3.5"/>
        </button>
        <button className="p-1.5 rounded-lg bg-white shadow-sm border hover:bg-red-50 text-gray-400 hover:text-red-500"
          onClick={e=>{e.stopPropagation();onDelete(doc.id);}}>
          <Trash2 className="w-3.5 h-3.5"/>
        </button>
      </div>
    </div>
  );
}

/* ── List Row ── */
function DocRow({ doc, selected, onToggle, onPreview, onDelete }: {
  doc: Doc; selected: boolean;
  onToggle:(id:number)=>void; onPreview:(doc:Doc)=>void; onDelete:(id:number)=>void;
}) {
  const cat  = catMeta(doc.docCategory);
  const tags = parseTags(doc.tags);
  return (
    <div className={cn(
      "group flex items-center gap-3 py-2.5 px-4 hover:bg-gray-50 rounded-xl transition-all cursor-pointer border-b last:border-0",
      selected&&"bg-primary/5"
    )} onClick={()=>onPreview(doc)}>
      <button className={cn("transition-opacity", selected?"opacity-100":"opacity-0 group-hover:opacity-100")}
        onClick={e=>{e.stopPropagation();onToggle(doc.id);}}>
        {selected?<CheckSquare className="w-4 h-4 text-primary"/>:<Square className="w-4 h-4 text-gray-300"/>}
      </button>
      <FileTypeBadge type={doc.fileType} size="sm"/>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
        <p className="text-xs text-gray-400">{fmtSize(doc.sizeBytes)} · {doc.uploadedBy}</p>
      </div>
      <Badge className={cn("text-xs shrink-0 hidden md:inline-flex", cat.color)}>{cat.label}</Badge>
      <div className="hidden lg:flex gap-1 shrink-0">
        {doc.financialYear && <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">FY {doc.financialYear}</span>}
        {doc.period && MONTHS[doc.period] && <span className="text-xs bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded">{MONTHS[doc.period]}</span>}
      </div>
      {doc.linkedEntityRef && <span className="text-xs text-primary bg-primary/5 px-2 py-0.5 rounded-full hidden xl:block whitespace-nowrap"><Link2 className="w-3 h-3 inline mr-1"/>{doc.linkedEntityRef}</span>}
      <div className="shrink-0"><FilingBadge status={doc.filingStatus}/></div>
      <span className="text-xs text-gray-400 hidden md:block whitespace-nowrap shrink-0">{fmtDate(doc.createdAt)}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e=>e.stopPropagation()}>
        <button className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-blue-600" onClick={()=>onPreview(doc)}><Eye className="w-3.5 h-3.5"/></button>
        <button className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500" onClick={()=>onDelete(doc.id)}><Trash2 className="w-3.5 h-3.5"/></button>
      </div>
    </div>
  );
}

/* ── Timeline View ── */
function TimelineView({ docs, selected, onToggle, onPreview, onDelete }: {
  docs: Doc[]; selected: Set<number>;
  onToggle:(id:number)=>void; onPreview:(doc:Doc)=>void; onDelete:(id:number)=>void;
}) {
  const grouped = useMemo(()=>{
    const g: Record<string, Doc[]> = {};
    for (const d of docs) {
      const key = d.createdAt.slice(0,7);
      if (!g[key]) g[key] = [];
      g[key].push(d);
    }
    return Object.entries(g).sort(([a],[b])=>b.localeCompare(a));
  }, [docs]);

  if (docs.length===0) return null;

  return (
    <div className="space-y-6 py-2">
      {grouped.map(([month, monthDocs])=>(
        <div key={month} className="relative">
          {/* Month label */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0"/>
            <div className="h-px flex-1 bg-gray-200"/>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              {new Date(month+"-01").toLocaleDateString("en-IN",{month:"long",year:"numeric"})}
              <span className="ml-1.5 font-normal text-gray-300">({monthDocs.length})</span>
            </span>
            <div className="h-px flex-1 bg-gray-200"/>
          </div>
          {/* Docs in this month */}
          <div className="pl-4 border-l-2 border-gray-100 ml-1 space-y-2">
            {monthDocs.map(doc=>(
              <DocRow key={doc.id} doc={doc} selected={selected.has(doc.id)}
                onToggle={onToggle} onPreview={onPreview} onDelete={onDelete}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
const PAGE_SIZE = 30;

export default function Documents() {
  const qc = useQueryClient();
  const { toast } = useToast();

  /* view state */
  const [view, setView]             = useState<"grid"|"list"|"timeline">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch]         = useState("");
  const [searchInput, setSearchInput]= useState("");
  const [previewDoc, setPreviewDoc] = useState<Doc|null>(null);
  const [selected, setSelected]     = useState<Set<number>>(new Set());
  const [page, setPage]             = useState(1);
  const [sort, setSort]             = useState("newest");
  const [showFilters, setShowFilters]= useState(false);

  /* filter state */
  const [fCategory, setFCategory] = useState("all");
  const [fFY, setFFY]             = useState("");
  const [fPeriod, setFPeriod]     = useState("");
  const [fFiling, setFFiling]     = useState("");
  const [fDept, setFDept]         = useState("");
  const [fProject, setFProject]   = useState("");

  /* debounce search */
  useEffect(()=>{
    const t = setTimeout(()=>setSearch(searchInput), 300);
    return ()=>clearTimeout(t);
  }, [searchInput]);

  /* Reset page on filter change */
  useEffect(()=>setPage(1), [search, fCategory, fFY, fPeriod, fFiling, fDept, fProject, sort]);

  const params = new URLSearchParams();
  if (search)           params.set("search", search);
  if (fCategory!=="all") params.set("docCategory", fCategory);
  if (fFY)             params.set("financialYear", fFY);
  if (fPeriod)         params.set("period", fPeriod);
  if (fFiling)         params.set("filingStatus", fFiling);
  if (fDept)           params.set("department", fDept);
  if (fProject)        params.set("project", fProject);

  const { data: allDocs = [], isLoading, refetch } = useQuery<Doc[]>({
    queryKey: ["documents", params.toString()],
    queryFn: () => fetch(`/api/documents?${params}`).then(r=>r.json()),
  });
  const { data: summary } = useQuery<Summary>({
    queryKey: ["documents-summary"],
    queryFn: () => fetch("/api/documents/summary").then(r=>r.json()),
  });

  /* Sort client-side */
  const docs = useMemo(()=>{
    const arr = [...allDocs];
    if (sort==="newest")    arr.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    if (sort==="oldest")    arr.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
    if (sort==="name_asc")  arr.sort((a,b)=>a.name.localeCompare(b.name));
    if (sort==="name_desc") arr.sort((a,b)=>b.name.localeCompare(a.name));
    if (sort==="size_desc") arr.sort((a,b)=>b.sizeBytes-a.sizeBytes);
    if (sort==="size_asc")  arr.sort((a,b)=>a.sizeBytes-b.sizeBytes);
    return arr;
  }, [allDocs, sort]);

  /* Paginate (skip for timeline) */
  const totalPages = Math.ceil(docs.length/PAGE_SIZE);
  const pageDocs   = view==="timeline" ? docs : docs.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const createMut = useMutation({
    mutationFn: (data:any) => fetch("/api/documents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}).then(r=>r.json()),
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:["documents"]}); qc.invalidateQueries({queryKey:["documents-summary"]}); },
  });
  const deleteMut = useMutation({
    mutationFn: (id:number) => fetch(`/api/documents/${id}`,{method:"DELETE"}).then(r=>r.json()),
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:["documents"]}); qc.invalidateQueries({queryKey:["documents-summary"]}); },
  });

  async function handleSave(data:any) { await createMut.mutateAsync(data); }
  function handleDelete(id:number) {
    deleteMut.mutate(id);
    toast({ title:"Document deleted", description:"Document has been removed." });
  }

  function toggleSelect(id:number) {
    const s = new Set(selected);
    s.has(id)?s.delete(id):s.add(id);
    setSelected(s);
  }
  function selectAll() { setSelected(new Set(docs.map(d=>d.id))); }
  function clearSelect() { setSelected(new Set()); }

  function clearFilters() {
    setFCategory("all"); setFFY(""); setFPeriod(""); setFFiling(""); setFDept(""); setFProject(""); setSearchInput(""); setSearch("");
  }
  const hasFilters = fCategory!=="all"||fFY||fPeriod||fFiling||fDept||fProject||search;

  const totals = summary?.totals ?? { total:0, totalSize:0, filed:0, unfiled:0, linked:0, pdfCount:0, imageCount:0, excelCount:0 };

  return (
    <div className="h-full flex flex-col bg-gray-50/30">
      {/* ── TOP BAR ── */}
      <div className="bg-white border-b px-5 py-3.5 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Title */}
          <div className="mr-2 shrink-0">
            <h1 className="text-lg font-bold text-gray-900">Document Repository</h1>
            <p className="text-xs text-gray-400">{totals.total} docs · {fmtSize(totals.totalSize)} stored</p>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <Input className="pl-9 h-9 bg-gray-50 border-gray-200 placeholder:text-gray-400"
              placeholder="Search by name, vendor, reference, tag…"
              value={searchInput} onChange={e=>setSearchInput(e.target.value)}/>
            {searchInput && <button onClick={()=>{setSearchInput("");setSearch("");}} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5"/></button>}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Sort */}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 w-auto gap-1.5 text-xs border-gray-200 bg-gray-50">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400"/>
                <SelectValue/>
              </SelectTrigger>
              <SelectContent>{SORT_OPTIONS.map(o=><SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
            </Select>

            {/* Filter toggle */}
            <Button variant="outline" size="sm" className={cn("h-9 gap-1.5 text-xs", showFilters&&"bg-primary/5 border-primary/30 text-primary")}
              onClick={()=>setShowFilters(p=>!p)}>
              <SlidersHorizontal className="w-3.5 h-3.5"/>Filters
              {hasFilters && <span className="w-4 h-4 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold">!</span>}
            </Button>

            {/* View toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              {([["grid","Grid",[Grid3X3]], ["list","List",[List]], ["timeline","Timeline",[CalendarDays]]] as [string,string,any[]][]).map(([v,label,[Icon]])=>(
                <button key={v} onClick={()=>setView(v as any)}
                  className={cn("px-2.5 py-1.5 text-xs flex items-center gap-1 border-r last:border-0 transition-colors",
                    view===v?"bg-primary text-white":"text-gray-500 hover:bg-gray-50")}>
                  <Icon className="w-3.5 h-3.5"/><span className="hidden sm:block">{label}</span>
                </button>
              ))}
            </div>

            {/* Refresh */}
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={()=>refetch()}><RefreshCw className="w-4 h-4 text-gray-400"/></Button>

            {/* Upload */}
            <Button size="sm" className="h-9 gap-1.5" onClick={()=>setUploadOpen(true)}>
              <Upload className="w-4 h-4"/>Upload
            </Button>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div className="flex items-center gap-3 mt-3 overflow-x-auto pb-0.5">
          {[
            { label:"Total",    value:totals.total,       icon:<File className="w-3.5 h-3.5"/>,          color:"text-gray-700" },
            { label:"Filed",    value:totals.filed,       icon:<CheckCircle2 className="w-3.5 h-3.5"/>,  color:"text-green-600" },
            { label:"Unfiled",  value:totals.unfiled,     icon:<Clock className="w-3.5 h-3.5"/>,          color:"text-amber-600" },
            { label:"Linked",   value:totals.linked,      icon:<Link2 className="w-3.5 h-3.5"/>,          color:"text-primary" },
            { label:"PDF",      value:totals.pdfCount,    icon:<FileText className="w-3.5 h-3.5"/>,       color:"text-red-600" },
            { label:"Images",   value:totals.imageCount,  icon:<Image className="w-3.5 h-3.5"/>,          color:"text-emerald-600" },
            { label:"Sheets",   value:totals.excelCount,  icon:<FileSpreadsheet className="w-3.5 h-3.5"/>,color:"text-green-700" },
          ].map(k=>(
            <div key={k.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border whitespace-nowrap shrink-0">
              <span className={k.color}>{k.icon}</span>
              <span className="text-xs font-semibold text-gray-800">{k.value}</span>
              <span className="text-xs text-gray-400">{k.label}</span>
            </div>
          ))}
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg border border-red-200 whitespace-nowrap shrink-0">
              <X className="w-3 h-3"/>Clear filters
            </button>
          )}
        </div>

        {/* ── Filter panel ── */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl border grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Category</Label>
              <Select value={fCategory} onValueChange={setFCategory}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All categories</SelectItem>
                  {CATEGORIES.map(c=><SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Financial Year</Label>
              <Select value={fFY} onValueChange={setFFY}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="All FY"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">All years</SelectItem>
                  {FY_OPTIONS.map(f=><SelectItem key={f} value={f} className="text-xs">FY {f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Month</Label>
              <Select value={fPeriod} onValueChange={setFPeriod}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="All months"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">All months</SelectItem>
                  {Object.entries(MONTHS).map(([k,v])=><SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Filing Status</Label>
              <Select value={fFiling} onValueChange={setFFiling}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="All statuses"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">All statuses</SelectItem>
                  {FILING.map(f=><SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Department</Label>
              <Select value={fDept} onValueChange={setFDept}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="All depts"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">All departments</SelectItem>
                  {DEPARTMENTS.map(d=><SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Project</Label>
              <Select value={fProject} onValueChange={setFProject}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="All projects"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">All projects</SelectItem>
                  {PROJECTS.map(p=><SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* ── Quick category chips ── */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-0.5">
          {[{value:"all",label:"All",color:""},  ...CATEGORIES].map(cat=>{
            const active = fCategory===cat.value;
            const count  = cat.value==="all" ? totals.total : (summary?.byCategory.find(b=>b.docCategory===cat.value)?.count??0);
            return (
              <button key={cat.value} onClick={()=>setFCategory(cat.value)}
                className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap shrink-0",
                  active?"bg-primary text-white border-primary shadow-sm":"bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50")}>
                {cat.label}
                {count > 0 && <span className={cn("text-xs px-1 rounded-full", active?"bg-white/20 text-white":"bg-gray-100 text-gray-500")}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BULK ACTION BAR ── */}
      {selected.size > 0 && (
        <div className="bg-primary/5 border-b border-primary/20 px-5 py-2.5 flex items-center gap-3 shrink-0">
          <CheckSquare className="w-4 h-4 text-primary"/>
          <span className="text-sm font-semibold text-primary">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>Select all ({docs.length})</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs"><Download className="w-3 h-3 mr-1"/>Download</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs"><Archive className="w-3 h-3 mr-1"/>Archive</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 border-red-200" onClick={()=>{ selected.forEach(id=>deleteMut.mutate(id)); clearSelect(); }}>
              <Trash2 className="w-3 h-3 mr-1"/>Delete ({selected.size})
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelect}><X className="w-3 h-3 mr-1"/>Clear</Button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-8 h-8 animate-spin text-primary/30"/>
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
              <FolderOpen className="w-10 h-10 text-gray-300"/>
            </div>
            <p className="font-semibold text-gray-700 mb-1">{hasFilters?"No documents match your filters":"No documents yet"}</p>
            <p className="text-sm text-gray-400 mb-4">{hasFilters?"Try changing or clearing your filters.":"Upload your first document to get started."}</p>
            {hasFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}><X className="w-3.5 h-3.5 mr-1.5"/>Clear filters</Button>
            ) : (
              <Button size="sm" onClick={()=>setUploadOpen(true)}><Upload className="w-4 h-4 mr-1.5"/>Upload Documents</Button>
            )}
          </div>
        ) : (
          <>
            {/* Docs count */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">
                {docs.length === allDocs.length ? `${docs.length} documents` : `${docs.length} matching (${allDocs.length} total)`}
                {view!=="timeline" && totalPages>1 && ` · page ${page}/${totalPages}`}
              </p>
              {view!=="timeline" && selected.size===0 && (
                <button className="text-xs text-gray-400 hover:text-primary" onClick={selectAll}>Select all</button>
              )}
            </div>

            {/* Grid view */}
            {view==="grid" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {pageDocs.map(doc=>(
                  <DocCard key={doc.id} doc={doc} selected={selected.has(doc.id)}
                    onToggle={toggleSelect} onPreview={setPreviewDoc} onDelete={handleDelete}/>
                ))}
              </div>
            )}

            {/* List view */}
            {view==="list" && (
              <div className="bg-white border rounded-2xl overflow-hidden divide-y">
                {pageDocs.map(doc=>(
                  <DocRow key={doc.id} doc={doc} selected={selected.has(doc.id)}
                    onToggle={toggleSelect} onPreview={setPreviewDoc} onDelete={handleDelete}/>
                ))}
              </div>
            )}

            {/* Timeline view */}
            {view==="timeline" && (
              <TimelineView docs={docs} selected={selected}
                onToggle={toggleSelect} onPreview={setPreviewDoc} onDelete={handleDelete}/>
            )}

            {/* Pagination (grid + list) */}
            {view!=="timeline" && totalPages>1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</Button>
                <div className="flex gap-1">
                  {Array.from({length:Math.min(totalPages,7)},(_,i)=>{
                    const p = totalPages<=7?i+1:page<=4?i+1:page>=totalPages-3?totalPages-6+i:page-3+i;
                    return (
                      <button key={p} onClick={()=>setPage(p)}
                        className={cn("w-8 h-8 rounded-lg text-xs font-medium",
                          page===p?"bg-primary text-white":"text-gray-600 hover:bg-gray-100")}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>Next →</Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Upload modal ── */}
      <UploadModal open={uploadOpen} onClose={()=>setUploadOpen(false)} onSave={handleSave}/>

      {/* ── Document drawer ── */}
      <DocDrawer doc={previewDoc} onClose={()=>setPreviewDoc(null)} onDelete={handleDelete}/>
    </div>
  );
}
