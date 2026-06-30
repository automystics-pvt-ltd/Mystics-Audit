import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Image, Table2, FileSpreadsheet, FilePlus2, Search, Upload,
  Grid3X3, List, Filter, Tag, Link2, X, Trash2, Download, Eye,
  FolderOpen, ChevronRight, FileCheck, Clock, AlertCircle,
  CheckCircle2, File, MoreHorizontal, RefreshCw, Building2,
  Layers, CalendarDays, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── types ─────────────────────────────────────────────── */
interface Doc {
  id: number;
  name: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  sizeBytes: number;
  fileUrl?: string;
  docCategory: string;
  financialYear?: string;
  period?: string;
  gstPeriod?: string;
  vendorName?: string;
  project?: string;
  department?: string;
  expenseCategory?: string;
  clientName?: string;
  tags: string;
  description?: string;
  linkedEntityType?: string;
  linkedEntityId?: number;
  linkedEntityRef?: string;
  filingStatus: string;
  uploadedBy: string;
  createdAt: string;
}

interface Summary {
  totals: { total: number; totalSize: number; filed: number; unfiled: number; linked: number; pdfCount: number; imageCount: number; excelCount: number };
  byCategory: Array<{ docCategory: string; count: number; totalSize: number }>;
  byFY: Array<{ financialYear: string; count: number }>;
}

/* ── constants ──────────────────────────────────────────── */
const CATEGORIES = [
  { value: "invoice",         label: "Sales Invoice",      color: "bg-blue-100 text-blue-800" },
  { value: "bill",            label: "Vendor Bill",        color: "bg-purple-100 text-purple-800" },
  { value: "receipt",         label: "Receipt / Payment",  color: "bg-green-100 text-green-800" },
  { value: "purchase_doc",    label: "Purchase Document",  color: "bg-orange-100 text-orange-800" },
  { value: "vendor_invoice",  label: "Vendor Invoice",     color: "bg-pink-100 text-pink-800" },
  { value: "gst_doc",         label: "GST Document",       color: "bg-yellow-100 text-yellow-800" },
  { value: "bank_statement",  label: "Bank Statement",     color: "bg-cyan-100 text-cyan-800" },
  { value: "contract",        label: "Contract / Legal",   color: "bg-red-100 text-red-800" },
  { value: "supporting",      label: "Supporting Doc",     color: "bg-gray-100 text-gray-800" },
  { value: "other",           label: "Other",              color: "bg-slate-100 text-slate-800" },
];

const FY_OPTIONS = ["2026-27","2025-26","2024-25","2023-24"];
const MONTHS: Record<string, string> = {
  "2026-06":"Jun 2026","2026-05":"May 2026","2026-04":"Apr 2026",
  "2026-03":"Mar 2026","2026-02":"Feb 2026","2026-01":"Jan 2026",
  "2025-12":"Dec 2025","2025-11":"Nov 2025","2025-10":"Oct 2025",
  "2025-09":"Sep 2025","2025-08":"Aug 2025","2025-07":"Jul 2025","2025-06":"Jun 2025",
};
const DEPARTMENTS = ["Finance","Operations","HR","Sales","Marketing","Technology","Admin","Legal","Projects"];
const PROJECTS = ["Project Alpha","Project Beta","Infra Upgrade","Client Onboarding","Internal Ops"];
const ENTITY_TYPES = [
  { value: "invoice",  label: "Invoice" },
  { value: "bill",     label: "Bill" },
  { value: "expense",  label: "Expense Claim" },
  { value: "receipt",  label: "Receipt" },
  { value: "payment",  label: "Payment" },
  { value: "journal",  label: "Journal Entry" },
  { value: "gst_doc",  label: "GST Document" },
];

/* ── helpers ────────────────────────────────────────────── */
function fmtSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function parseTags(raw: string): string[] {
  try { return JSON.parse(raw) ?? []; } catch { return []; }
}
function catMeta(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

function FileIcon({ type, size = 20 }: { type: string; size?: number }) {
  const cls = `w-${Math.floor(size/4)} h-${Math.floor(size/4)}`;
  if (type === "image")  return <Image className={cn(cls, "text-emerald-500")} />;
  if (type === "excel")  return <FileSpreadsheet className={cn(cls, "text-green-600")} />;
  if (type === "word")   return <FileText className={cn(cls, "text-blue-600")} />;
  if (type === "csv")    return <Table2 className={cn(cls, "text-orange-500")} />;
  return <FileText className={cn(cls, "text-red-500")} />;
}

function FilingBadge({ status }: { status: string }) {
  if (status === "filed")     return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Filed</Badge>;
  if (status === "matched")   return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><CheckCircle2 className="w-3 h-3 mr-1" />Matched</Badge>;
  if (status === "mismatched")return <Badge className="bg-red-100 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Mismatch</Badge>;
  return <Badge variant="outline" className="text-gray-500"><Clock className="w-3 h-3 mr-1" />Unfiled</Badge>;
}

/* ── drag-drop upload area ──────────────────────────────── */
function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback((files: FileList | null) => {
    if (files) onFiles(Array.from(files));
  }, [onFiles]);

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
        dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
      )}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="w-10 h-10 mx-auto mb-3 text-primary/60" />
      <p className="text-sm font-medium text-gray-700">Drag & drop files here or click to browse</p>
      <p className="text-xs text-gray-400 mt-1">PDF, Images, Excel, Word, CSV — up to 25 MB each</p>
      <input ref={inputRef} type="file" className="hidden" multiple
        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.doc,.docx"
        onChange={e => handle(e.target.files)} />
    </div>
  );
}

/* ── upload modal ───────────────────────────────────────── */
function UploadModal({
  open, onClose, onSave,
}: { open: boolean; onClose: () => void; onSave: (data: any) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    docCategory: "supporting", financialYear: "2025-26", period: "2026-06",
    gstPeriod: "", vendorName: "", project: "", department: "",
    expenseCategory: "", clientName: "",
    linkedEntityType: "", linkedEntityRef: "",
    filingStatus: "unfiled", description: "", tagsRaw: "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function detectFileType(file: File): string {
    if (file.type.startsWith("image/")) return "image";
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) return "excel";
    if (file.name.endsWith(".csv")) return "csv";
    if (file.name.endsWith(".doc") || file.name.endsWith(".docx")) return "word";
    return "pdf";
  }

  function handleSave() {
    const tags = JSON.stringify(form.tagsRaw.split(",").map(t => t.trim()).filter(Boolean));
    if (files.length === 0) {
      onSave({ ...form, name: "Untitled Document", originalName: "Untitled Document",
        fileType: "pdf", mimeType: "application/pdf", sizeBytes: 0, tags });
      return;
    }
    for (const file of files) {
      onSave({
        ...form,
        name: file.name,
        originalName: file.name,
        fileType: detectFileType(file),
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        fileUrl: `https://storage.mystics.app/docs/${Date.now()}_${file.name}`,
        tags,
      });
    }
    onClose();
    setFiles([]);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Upload Documents
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <DropZone onFiles={setFiles} />
          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded text-sm">
                  <span className="flex items-center gap-2">
                    <FileIcon type={f.type.startsWith("image/") ? "image" : "pdf"} size={16} />
                    <span className="truncate max-w-[300px]">{f.name}</span>
                  </span>
                  <span className="text-gray-400">{fmtSize(f.size)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Document Category *</Label>
              <Select value={form.docCategory} onValueChange={v => set("docCategory", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Financial Year</Label>
              <Select value={form.financialYear} onValueChange={v => set("financialYear", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FY_OPTIONS.map(f => <SelectItem key={f} value={f}>FY {f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Month / Period</Label>
              <Select value={form.period} onValueChange={v => set("period", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MONTHS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">GST Period</Label>
              <Select value={form.gstPeriod} onValueChange={v => set("gstPeriod", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select GST period" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MONTHS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Vendor Name</Label>
              <Input className="mt-1" placeholder="e.g. Infosys Ltd"
                value={form.vendorName} onChange={e => set("vendorName", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Project</Label>
              <Select value={form.project} onValueChange={v => set("project", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {PROJECTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Select value={form.department} onValueChange={v => set("department", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Filing Status</Label>
              <Select value={form.filingStatus} onValueChange={v => set("filingStatus", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unfiled">Unfiled</SelectItem>
                  <SelectItem value="filed">Filed</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="mismatched">Mismatched</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Link to Transaction</Label>
              <Select value={form.linkedEntityType} onValueChange={v => set("linkedEntityType", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Entity type" /></SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Transaction Reference</Label>
              <Input className="mt-1" placeholder="e.g. INV-2026-001"
                value={form.linkedEntityRef} onChange={e => set("linkedEntityRef", e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Tags (comma separated)</Label>
            <Input className="mt-1" placeholder="e.g. gst, q4, audit, vendor"
              value={form.tagsRaw} onChange={e => set("tagsRaw", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Description / Notes</Label>
            <Textarea className="mt-1 resize-none" rows={2} placeholder="Add context or notes about this document…"
              value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            <Upload className="w-4 h-4 mr-2" />
            {files.length > 1 ? `Upload ${files.length} Files` : "Upload Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── document card (grid) ───────────────────────────────── */
function DocCard({ doc, onDelete }: { doc: Doc; onDelete: (id: number) => void }) {
  const tags = parseTags(doc.tags);
  const cat  = catMeta(doc.docCategory);
  return (
    <div className="group relative border rounded-xl p-4 bg-white hover:shadow-md hover:border-primary/30 transition-all">
      {/* icon + name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-gray-50 rounded-lg border flex-shrink-0">
          <FileIcon type={doc.fileType} size={28} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate leading-tight">{doc.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{fmtSize(doc.sizeBytes)} · {fmtDate(doc.createdAt)}</p>
        </div>
      </div>

      {/* category badge */}
      <Badge className={cn("text-xs mb-2", cat.color)}>{cat.label}</Badge>

      {/* meta pills */}
      <div className="flex flex-wrap gap-1 mb-2">
        {doc.financialYear && (
          <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">FY {doc.financialYear}</span>
        )}
        {doc.period && MONTHS[doc.period] && (
          <span className="text-xs bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded">{MONTHS[doc.period]}</span>
        )}
        {doc.vendorName && (
          <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded truncate max-w-[100px]" title={doc.vendorName}>{doc.vendorName}</span>
        )}
        {doc.department && (
          <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{doc.department}</span>
        )}
      </div>

      {/* tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.slice(0, 3).map(t => (
            <span key={t} className="text-xs border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Tag className="w-2.5 h-2.5" />{t}
            </span>
          ))}
          {tags.length > 3 && <span className="text-xs text-gray-400">+{tags.length - 3}</span>}
        </div>
      )}

      {/* linked transaction */}
      {doc.linkedEntityRef && (
        <div className="flex items-center gap-1 text-xs text-primary bg-primary/5 px-2 py-1 rounded mb-2">
          <Link2 className="w-3 h-3" />
          <span>{doc.linkedEntityRef}</span>
        </div>
      )}

      <FilingBadge status={doc.filingStatus} />

      {/* hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1 rounded bg-white shadow-sm border hover:bg-blue-50 text-gray-500 hover:text-blue-600">
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button className="p-1 rounded bg-white shadow-sm border hover:bg-green-50 text-gray-500 hover:text-green-600">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button className="p-1 rounded bg-white shadow-sm border hover:bg-red-50 text-gray-500 hover:text-red-600"
          onClick={() => onDelete(doc.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* uploader */}
      <p className="text-xs text-gray-400 mt-2">{doc.uploadedBy}</p>
    </div>
  );
}

/* ── document row (list) ────────────────────────────────── */
function DocRow({ doc, onDelete }: { doc: Doc; onDelete: (id: number) => void }) {
  const tags = parseTags(doc.tags);
  const cat  = catMeta(doc.docCategory);
  return (
    <div className="group flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 rounded-lg border-b last:border-0">
      <FileIcon type={doc.fileType} size={16} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.name}</p>
        <p className="text-xs text-gray-400">{fmtSize(doc.sizeBytes)} · {doc.uploadedBy}</p>
      </div>
      <Badge className={cn("text-xs hidden md:flex", cat.color)}>{cat.label}</Badge>
      <div className="hidden lg:flex gap-1">
        {tags.slice(0, 2).map(t => <span key={t} className="text-xs border text-gray-500 px-1.5 py-0.5 rounded-full">{t}</span>)}
      </div>
      {doc.linkedEntityRef && (
        <span className="text-xs text-primary bg-primary/5 px-2 py-0.5 rounded hidden md:block">
          <Link2 className="w-3 h-3 inline mr-1" />{doc.linkedEntityRef}
        </span>
      )}
      <FilingBadge status={doc.filingStatus} />
      <span className="text-xs text-gray-400 hidden md:block">{fmtDate(doc.createdAt)}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Eye className="w-3.5 h-3.5" /></button>
        <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600"><Download className="w-3.5 h-3.5" /></button>
        <button className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600" onClick={() => onDelete(doc.id)}><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────── */
export default function Documents() {
  const qc = useQueryClient();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeFY, setActiveFY] = useState<string>("");
  const [activePeriod, setActivePeriod] = useState<string>("");
  const [activeDept, setActiveDept] = useState<string>("");
  const [activeProject, setActiveProject] = useState<string>("");
  const [activeFiling, setActiveFiling] = useState<string>("");

  const params = new URLSearchParams();
  if (search)        params.set("search", search);
  if (activeCategory !== "all") params.set("docCategory", activeCategory);
  if (activeFY)      params.set("financialYear", activeFY);
  if (activePeriod)  params.set("period", activePeriod);
  if (activeDept)    params.set("department", activeDept);
  if (activeProject) params.set("project", activeProject);
  if (activeFiling)  params.set("filingStatus", activeFiling);

  const { data: docs = [], refetch } = useQuery<Doc[]>({
    queryKey: ["documents", params.toString()],
    queryFn: () => fetch(`/api/documents?${params}`).then(r => r.json()),
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ["documents-summary"],
    queryFn: () => fetch("/api/documents/summary").then(r => r.json()),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); qc.invalidateQueries({ queryKey: ["documents-summary"] }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/documents/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); qc.invalidateQueries({ queryKey: ["documents-summary"] }); },
  });

  const clearFilters = () => {
    setActiveCategory("all"); setActiveFY(""); setActivePeriod("");
    setActiveDept(""); setActiveProject(""); setActiveFiling(""); setSearch("");
  };
  const hasFilters = activeCategory !== "all" || activeFY || activePeriod || activeDept || activeProject || activeFiling;

  return (
    <div className="flex h-full">
      {/* ── left sidebar ─────────────────────── */}
      <aside className="w-56 border-r bg-gray-50/50 flex-shrink-0 p-3 space-y-4 overflow-y-auto">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Category</p>
          <button
            onClick={() => setActiveCategory("all")}
            className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
              activeCategory === "all" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100")}
          >
            <FolderOpen className="w-3.5 h-3.5" />All Documents
            <span className="ml-auto text-xs opacity-70">{summary?.totals.total ?? 0}</span>
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
                activeCategory === cat.value ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100")}
            >
              <File className="w-3.5 h-3.5" />
              <span className="truncate">{cat.label}</span>
              <span className="ml-auto text-xs opacity-70">
                {summary?.byCategory.find(c => c.docCategory === cat.value)?.count ?? 0}
              </span>
            </button>
          ))}
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Financial Year</p>
          {FY_OPTIONS.map(fy => (
            <button key={fy}
              onClick={() => setActiveFY(activeFY === fy ? "" : fy)}
              className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
                activeFY === fy ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-100")}
            >
              <CalendarDays className="w-3.5 h-3.5" />FY {fy}
              <span className="ml-auto text-xs opacity-70">
                {summary?.byFY.find(f => f.financialYear === fy)?.count ?? 0}
              </span>
            </button>
          ))}
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Month</p>
          {Object.entries(MONTHS).slice(0, 6).map(([k, v]) => (
            <button key={k}
              onClick={() => setActivePeriod(activePeriod === k ? "" : k)}
              className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
                activePeriod === k ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-100")}
            >
              <ChevronRight className="w-3 h-3" />{v}
            </button>
          ))}
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Department</p>
          {DEPARTMENTS.slice(0, 6).map(dept => (
            <button key={dept}
              onClick={() => setActiveDept(activeDept === dept ? "" : dept)}
              className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
                activeDept === dept ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-100")}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">{dept}</span>
            </button>
          ))}
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Project</p>
          {PROJECTS.map(proj => (
            <button key={proj}
              onClick={() => setActiveProject(activeProject === proj ? "" : proj)}
              className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
                activeProject === proj ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-100")}
            >
              <Package className="w-3.5 h-3.5" />
              <span className="truncate text-xs">{proj}</span>
            </button>
          ))}
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Filing Status</p>
          {[["unfiled","Unfiled"],["filed","Filed"],["matched","Matched"],["mismatched","Mismatched"]].map(([v,l]) => (
            <button key={v}
              onClick={() => setActiveFiling(activeFiling === v ? "" : v)}
              className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
                activeFiling === v ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-100")}
            >
              <ChevronRight className="w-3 h-3" />{l}
            </button>
          ))}
        </div>
      </aside>

      {/* ── main area ────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* header */}
        <div className="border-b bg-white p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Document Repository</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {summary?.totals.total ?? 0} documents · {fmtSize(summary?.totals.totalSize ?? 0)} stored · {summary?.totals.linked ?? 0} linked to transactions
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-1.5" />Refresh
              </Button>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-1.5" />Upload Documents
              </Button>
            </div>
          </div>

          {/* summary KPIs */}
          <div className="grid grid-cols-4 gap-3 mb-3">
            {[
              { label: "Total Documents", value: summary?.totals.total ?? 0, color: "text-gray-900", sub: `${fmtSize(summary?.totals.totalSize ?? 0)} total` },
              { label: "Filed", value: summary?.totals.filed ?? 0, color: "text-green-600", sub: `${summary?.totals.unfiled ?? 0} unfiled` },
              { label: "Linked to Transactions", value: summary?.totals.linked ?? 0, color: "text-blue-600", sub: "with audit trail" },
              { label: "PDF / Image / Excel", value: `${summary?.totals.pdfCount ?? 0} / ${summary?.totals.imageCount ?? 0} / ${summary?.totals.excelCount ?? 0}`, color: "text-purple-600", sub: "by file type" },
            ].map(k => (
              <div key={k.label} className="bg-gray-50 rounded-lg p-3 border">
                <p className="text-xs text-gray-500">{k.label}</p>
                <p className={cn("text-xl font-bold", k.color)}>{k.value}</p>
                <p className="text-xs text-gray-400">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* search + view toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <Input className="pl-9" placeholder="Search by name, vendor, reference, OCR text…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                <X className="w-4 h-4 mr-1" />Clear
              </Button>
            )}
            <div className="flex border rounded-md overflow-hidden">
              <button onClick={() => setView("grid")} className={cn("p-2", view === "grid" ? "bg-primary text-white" : "hover:bg-gray-50")}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setView("list")} className={cn("p-2 border-l", view === "list" ? "bg-primary text-white" : "hover:bg-gray-50")}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-1 mt-2">
              {activeCategory !== "all" && <Badge variant="outline" className="gap-1">{catMeta(activeCategory).label}<X className="w-3 h-3 cursor-pointer" onClick={() => setActiveCategory("all")} /></Badge>}
              {activeFY && <Badge variant="outline" className="gap-1">FY {activeFY}<X className="w-3 h-3 cursor-pointer" onClick={() => setActiveFY("")} /></Badge>}
              {activePeriod && <Badge variant="outline" className="gap-1">{MONTHS[activePeriod]}<X className="w-3 h-3 cursor-pointer" onClick={() => setActivePeriod("")} /></Badge>}
              {activeDept && <Badge variant="outline" className="gap-1">{activeDept}<X className="w-3 h-3 cursor-pointer" onClick={() => setActiveDept("")} /></Badge>}
              {activeProject && <Badge variant="outline" className="gap-1">{activeProject}<X className="w-3 h-3 cursor-pointer" onClick={() => setActiveProject("")} /></Badge>}
              {activeFiling && <Badge variant="outline" className="gap-1 capitalize">{activeFiling}<X className="w-3 h-3 cursor-pointer" onClick={() => setActiveFiling("")} /></Badge>}
            </div>
          )}
        </div>

        {/* document list/grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FilePlus2 className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">No documents found</p>
              <p className="text-gray-400 text-sm mt-1">Upload your first document or adjust filters</p>
              <Button className="mt-4" onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />Upload Documents
              </Button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {docs.map(doc => <DocCard key={doc.id} doc={doc} onDelete={id => deleteMut.mutate(id)} />)}
            </div>
          ) : (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[auto,1fr,auto,auto,auto,auto,auto] gap-2 px-3 py-2 border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span></span><span>Name</span><span>Category</span><span>Tags</span><span>Linked To</span><span>Status</span><span>Date</span>
              </div>
              {docs.map(doc => <DocRow key={doc.id} doc={doc} onDelete={id => deleteMut.mutate(id)} />)}
            </div>
          )}
        </div>
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSave={data => createMut.mutate(data)}
      />
    </div>
  );
}
