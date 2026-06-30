import { useState, useRef, useCallback } from "react";
import { useListCompanies, useUpdateCompany } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Building2, Upload, Trash2, CheckCircle2, ImageIcon, Loader2,
  Globe, Phone, Mail, MapPin, Hash, FileText, Save, Camera,
} from "lucide-react";

const COMPANY_TYPES = ["Private Limited", "Public Limited", "LLP", "Partnership", "Sole Proprietorship", "OPC", "NGO/Trust"];
const FISCAL_YEARS  = ["April", "January", "July", "October"];
const GST_FREQ      = ["Monthly", "Quarterly", "Annual"];

const MAX_SIZE_MB = 2;

function LogoUpload({
  current,
  onChange,
}: {
  current?: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, SVG, WebP)."); return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Image must be under ${MAX_SIZE_MB} MB.`); return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Company Logo</Label>
      <p className="text-xs text-muted-foreground -mt-1">
        Appears on all printed invoices, receipts &amp; documents. PNG, JPG, SVG or WebP · max {MAX_SIZE_MB} MB.
      </p>

      <div className="flex items-start gap-5">
        {/* Preview / Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={cn(
            "relative flex flex-col items-center justify-center w-40 h-40 rounded-2xl border-2 border-dashed cursor-pointer transition-all select-none",
            drag
              ? "border-primary bg-primary/5 scale-[1.02]"
              : current
                ? "border-gray-200 bg-gray-50 hover:border-primary/40"
                : "border-gray-200 bg-gray-50 hover:border-primary/40 hover:bg-primary/5",
          )}
        >
          {current ? (
            <img
              src={current}
              alt="Company logo"
              className="w-full h-full object-contain rounded-2xl p-3"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-12 h-12 rounded-xl bg-gray-200/80 flex items-center justify-center">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold">Click or drag &amp; drop</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">PNG · JPG · SVG · WebP</p>
              </div>
            </div>
          )}
          {/* Hover overlay on existing logo */}
          {current && (
            <div className="absolute inset-0 rounded-2xl bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <Camera className="w-6 h-6 text-white drop-shadow" />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            {current ? "Replace Logo" : "Upload Logo"}
          </Button>
          {current && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onChange(null)}
            >
              <Trash2 className="w-3.5 h-3.5" />Remove
            </Button>
          )}
          <div className="mt-2 space-y-1">
            {current ? (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Logo uploaded</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No logo yet</p>
            )}
            <p className="text-xs text-muted-foreground">
              Recommended: 400 × 400 px
            </p>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

/* ── Field wrapper ── */
function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ── Section header ── */
function Section({ icon: Icon, title, subtitle }: {
  icon: React.FC<{ className?: string }>; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 pb-2 border-b">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN SETTINGS PAGE
════════════════════════════════════════ */
export default function CompanySettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: companies, isLoading } = useListCompanies({});
  const company = (companies as any[])?.[0] ?? null;
  const updateMut = useUpdateCompany();

  /* form state - initialised from company when loaded */
  const [form, setForm] = useState<Record<string, any> | null>(null);
  const [logoChanged, setLogoChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  /* init form once company data arrives */
  if (company && !form) {
    setForm({
      legalName:          company.legalName ?? "",
      tradeName:          company.tradeName ?? "",
      pan:                company.pan ?? "",
      cin:                company.cin ?? "",
      gstin:              company.gstin ?? "",
      companyType:        company.companyType ?? "Private Limited",
      industry:           company.industry ?? "",
      phone:              company.phone ?? "",
      email:              company.email ?? "",
      website:            company.website ?? "",
      address:            company.address ?? "",
      city:               company.city ?? "",
      state:              company.state ?? "",
      pincode:            company.pincode ?? "",
      logoUrl:            company.logoUrl ?? null,
      fiscalYearStart:    company.fiscalYearStart ?? "April",
      gstFilingFrequency: company.gstFilingFrequency ?? "Monthly",
    });
  }

  function set(k: string, v: any) { setForm(f => f ? { ...f, [k]: v } : f); }

  function handleLogoChange(dataUrl: string | null) {
    set("logoUrl", dataUrl);
    setLogoChanged(true);
  }

  async function handleSave() {
    if (!company?.id || !form) return;
    if (!form.legalName?.trim()) {
      toast({ title: "Legal name is required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await new Promise<void>((resolve, reject) => {
        updateMut.mutate(
          { id: company.id, data: form } as any,
          {
            onSuccess: () => {
              qc.invalidateQueries({ queryKey: ["companies"] });
              setLogoChanged(false);
              toast({
                title: "✓ Company settings saved",
                description: logoChanged
                  ? "Logo updated — will appear on all new prints."
                  : "Your company profile has been updated.",
              });
              resolve();
            },
            onError: (e: any) => {
              toast({ title: "Save failed", description: e.message, variant: "destructive" });
              reject(e);
            },
          },
        );
      });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading company profile…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Company Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            One-time setup — your logo and profile appear on every invoice, receipt &amp; report.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[120px]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* ── Logo card ── */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-5">
        <Section icon={ImageIcon} title="Company Logo" subtitle="Shown on all printed documents — set once, used everywhere." />
        <LogoUpload current={form.logoUrl} onChange={handleLogoChange} />

        {/* Print preview strip */}
        <div className="mt-4 rounded-xl border bg-slate-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Print header preview</p>
          <div
            className="rounded-lg p-4 flex items-center gap-4"
            style={{ background: "linear-gradient(135deg, #6b21a8, #7c3aed)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center overflow-hidden shrink-0">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-white text-xl font-black">
                  {form.legalName?.charAt(0)?.toUpperCase() || "M"}
                </span>
              )}
            </div>
            <div className="text-white">
              <p className="font-bold text-base leading-tight">{form.legalName || "Your Company Name"}</p>
              {form.gstin && <p className="text-[11px] text-white/70 mt-0.5">GSTIN: {form.gstin}</p>}
              {form.address && <p className="text-[11px] text-white/60 mt-0.5 max-w-sm truncate">{form.address}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Company identity ── */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-5">
        <Section icon={Building2} title="Company Identity" subtitle="Legal name, type, and registration numbers." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Legal Name" required>
            <Input value={form.legalName} onChange={e => set("legalName", e.target.value)} placeholder="Automystics Technologies Pvt. Ltd." />
          </Field>
          <Field label="Trade / Brand Name" hint="If different from legal name">
            <Input value={form.tradeName} onChange={e => set("tradeName", e.target.value)} placeholder="Automystics" />
          </Field>
          <Field label="Company Type" required>
            <Select value={form.companyType} onValueChange={v => set("companyType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Industry">
            <Input value={form.industry} onChange={e => set("industry", e.target.value)} placeholder="Technology, Manufacturing…" />
          </Field>
          <Field label="PAN" hint="10-character alphanumeric">
            <Input value={form.pan} onChange={e => set("pan", e.target.value.toUpperCase())} placeholder="ABCDE1234F" className="font-mono uppercase" maxLength={10} />
          </Field>
          <Field label="CIN" hint="For companies registered with MCA">
            <Input value={form.cin} onChange={e => set("cin", e.target.value.toUpperCase())} placeholder="U72900TN2020PTC123456" className="font-mono uppercase" />
          </Field>
        </div>
      </div>

      {/* ── GST & Tax ── */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-5">
        <Section icon={Hash} title="GST & Tax Registration" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="GSTIN" hint="15-character GST Identification Number">
            <Input value={form.gstin} onChange={e => set("gstin", e.target.value.toUpperCase())} placeholder="33ABFCA6057N1ZE" className="font-mono uppercase" maxLength={15} />
          </Field>
          <Field label="GST Filing Frequency">
            <Select value={form.gstFilingFrequency} onValueChange={v => set("gstFilingFrequency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GST_FREQ.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Fiscal Year Start">
            <Select value={form.fiscalYearStart} onValueChange={v => set("fiscalYearStart", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FISCAL_YEARS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {/* ── Contact ── */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-5">
        <Section icon={Phone} title="Contact Information" subtitle="Printed on invoices and receipts." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input className="pl-9" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 44 4567 8900" />
            </div>
          </Field>
          <Field label="Email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input className="pl-9" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="accounts@company.com" />
            </div>
          </Field>
          <Field label="Website" hint="Optional — shown on print header">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input className="pl-9" value={form.website} onChange={e => set("website", e.target.value)} placeholder="www.company.com" />
            </div>
          </Field>
        </div>
      </div>

      {/* ── Address ── */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-5">
        <Section icon={MapPin} title="Registered Address" subtitle="Used as 'From' address on all documents." />
        <div className="space-y-4">
          <Field label="Street Address">
            <Textarea value={form.address} onChange={e => set("address", e.target.value)} rows={2} placeholder="Building No., Street, Area…" />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City">
              <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Chennai" />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={e => set("state", e.target.value)} placeholder="Tamil Nadu" />
            </Field>
            <Field label="Pincode">
              <Input value={form.pincode} onChange={e => set("pincode", e.target.value)} placeholder="600 002" maxLength={6} className="font-mono" />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Save button (bottom) ── */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 px-8">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Company Settings"}
        </Button>
      </div>
    </div>
  );
}
