import { useRef, useState } from "react";
import { Upload, Eye, EyeOff, RefreshCw, CheckCircle2, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { TemplateConfig, FieldConfig } from "./index";

interface Props {
  config: TemplateConfig;
  onUpdate: (patch: Partial<TemplateConfig>) => void;
}

const COLOR_PRESETS = [
  { header: "#1a2a4a", accent: "#1d6ae5", label: "Navy Blue" },
  { header: "#1a3d2b", accent: "#16a34a", label: "Forest Green" },
  { header: "#3b1a6b", accent: "#7c3aed", label: "Royal Purple" },
  { header: "#7c1d1d", accent: "#dc2626", label: "Deep Red" },
  { header: "#1a3a5c", accent: "#0284c7", label: "Ocean Blue" },
  { header: "#374151", accent: "#6b7280", label: "Slate Gray" },
  { header: "#92400e", accent: "#d97706", label: "Amber" },
  { header: "#1e3a5f", accent: "#0369a1", label: "Corporate Blue" },
];

const FONTS = ["Inter", "Poppins", "Roboto", "Lato", "Montserrat", "Open Sans",
  "Nunito", "DM Sans", "Work Sans", "Raleway", "Ubuntu", "Merriweather",
  "Playfair Display", "Source Sans 3", "Fira Sans"];

const PRINT_FORMATS = [
  { id: "a4",        label: "A4",        sub: "210 × 297 mm" },
  { id: "a5",        label: "A5",        sub: "148 × 210 mm" },
  { id: "thermal80", label: "80mm",      sub: "Thermal roll" },
  { id: "thermal57", label: "57mm",      sub: "Thermal roll" },
  { id: "custom",    label: "Custom",    sub: "Set manually" },
];

const PAYMENT_MODES = ["NEFT", "UPI", "Cheque", "Cash", "RTGS", "IMPS"];

const LANGUAGES = [
  { code: "en",  label: "English" },
  { code: "hi",  label: "हिन्दी" },
  { code: "ta",  label: "தமிழ்" },
  { code: "te",  label: "తెలుగు" },
  { code: "kn",  label: "ಕನ್ನಡ" },
  { code: "mr",  label: "मराठी" },
];

const LOGO_POSITIONS = [
  "top-left", "top-center", "top-right",
  "header-left", "header-center", "header-right",
  "footer-left", "footer-center", "footer-right",
  "watermark",
];

function UploadBox({
  label,
  url,
  onUpload,
  onClear,
  accept,
  hint,
}: {
  label: string;
  url: string | null;
  onUpload: (url: string) => void;
  onClear: () => void;
  accept: string;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUpload(url);
  };

  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-gray-500 mb-1.5">{label}</p>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {url ? (
        <div className="relative flex items-center gap-2 px-3 py-2 rounded-xl border border-green-200 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <img src={url} alt={label} className="h-8 object-contain max-w-[80px]" />
          <span className="text-xs text-green-700 font-medium flex-1">Uploaded</span>
          <button
            onClick={onClear}
            className="p-1 hover:bg-green-100 rounded-lg transition-colors"
          >
            <X className="w-3 h-3 text-green-600" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-colors ${
            dragging
              ? "border-violet-400 bg-violet-50"
              : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/30 bg-gray-50"
          }`}
        >
          <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="text-left">
            <p className="text-xs font-semibold text-gray-600">Upload {label}</p>
            {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
          </div>
        </button>
      )}
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-600">{label}</span>
      <button
        onClick={() => ref.current?.click()}
        className="flex items-center gap-2 px-2 py-1 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
      >
        <span className="w-5 h-5 rounded-md border border-gray-200 shadow-sm" style={{ background: value }} />
        <span className="text-[11px] text-gray-500 font-mono group-hover:text-gray-700">{value}</span>
        <input
          ref={ref}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-2">{title}</p>
      {children}
    </div>
  );
}

export function RightPanel({ config, onUpdate }: Props) {
  const [tab, setTab] = useState<"brand" | "fields" | "layout">("brand");

  const togglePaymentMode = (mode: string) => {
    const curr = config.activePaymentModes;
    const next = curr.includes(mode) ? curr.filter(m => m !== mode) : [...curr, mode];
    onUpdate({ activePaymentModes: next });
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    onUpdate({ headerColor: preset.header, accentColor: preset.accent });
  };

  const fieldList = Object.values(config.fields);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {(["brand", "fields", "layout"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs font-semibold py-2.5 transition-colors border-b-2 ${
              tab === t
                ? "border-violet-600 text-violet-700 bg-violet-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* ── BRAND TAB ── */}
        {tab === "brand" && (
          <div>
            <Section title="LOGO UPLOAD">
              <UploadBox
                label="Primary logo"
                url={config.logoUrl}
                onUpload={(url) => onUpdate({ logoUrl: url })}
                onClear={() => onUpdate({ logoUrl: null })}
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                hint="PNG · JPG · SVG · WebP · Max 5 MB"
              />
              <div className="mt-1">
                <label className="text-xs text-gray-500 block mb-1">Logo position</label>
                <select
                  value={config.logoPosition}
                  onChange={(e) => onUpdate({ logoPosition: e.target.value })}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white"
                >
                  {LOGO_POSITIONS.map(p => (
                    <option key={p} value={p}>{p.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </Section>

            <Section title="SIGNATURE &amp; SEAL">
              <UploadBox
                label="Signature"
                url={config.signatureUrl}
                onUpload={(url) => onUpdate({ signatureUrl: url })}
                onClear={() => onUpdate({ signatureUrl: null })}
                accept="image/*"
                hint="Transparent PNG recommended"
              />
              <UploadBox
                label="Stamp / Seal"
                url={config.stampUrl}
                onUpload={(url) => onUpdate({ stampUrl: url })}
                onClear={() => onUpdate({ stampUrl: null })}
                accept="image/*"
                hint="Round seal, transparent PNG"
              />
            </Section>

            <Section title="BRAND COLORS">
              <ColorPicker
                label="Header color"
                value={config.headerColor}
                onChange={(v) => onUpdate({ headerColor: v })}
              />
              <ColorPicker
                label="Accent color"
                value={config.accentColor}
                onChange={(v) => onUpdate({ accentColor: v })}
              />
              <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-3 mb-2">PRESETS</p>
              <div className="grid grid-cols-4 gap-1.5">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    title={p.label}
                    className="group relative rounded-lg overflow-hidden border-2 transition-all hover:border-violet-400"
                    style={{
                      borderColor: config.headerColor === p.header && config.accentColor === p.accent
                        ? "#7c3aed"
                        : "transparent",
                    }}
                  >
                    <div style={{ height: 20, background: p.header }} />
                    <div style={{ height: 10, background: p.accent }} />
                    {config.headerColor === p.header && config.accentColor === p.accent && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="FONT">
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                {FONTS.map((f) => (
                  <button
                    key={f}
                    onClick={() => onUpdate({ fontFamily: f })}
                    className={`text-xs py-1.5 px-2 rounded-lg border transition-colors text-left truncate ${
                      config.fontFamily === f
                        ? "border-violet-400 bg-violet-50 text-violet-700 font-semibold"
                        : "border-gray-200 hover:border-violet-200 text-gray-600"
                    }`}
                    style={{ fontFamily: f }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="DOCUMENT TITLE">
              <input
                type="text"
                value={config.documentTitle}
                onChange={(e) => onUpdate({ documentTitle: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-sm font-bold border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 uppercase"
              />
            </Section>

            <Section title="PAYMENT MODES">
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_MODES.map((m) => {
                  const active = config.activePaymentModes.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => togglePaymentMode(m)}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors border ${
                        active
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white text-gray-500 border-gray-200 hover:border-violet-300"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="LANGUAGE">
              <div className="grid grid-cols-3 gap-1.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => onUpdate({ language: l.code })}
                    className={`text-xs py-1.5 px-2 rounded-lg border transition-colors ${
                      config.language === l.code
                        ? "border-violet-400 bg-violet-50 text-violet-700 font-semibold"
                        : "border-gray-200 text-gray-600 hover:border-violet-200"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ── FIELDS TAB ── */}
        {tab === "fields" && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">FIELD CONFIGURATION</p>
            <div className="space-y-2">
              {fieldList.map((field: FieldConfig) => (
                <div key={field.id} className="bg-gray-50 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {field.visible ? (
                        <Eye className="w-3.5 h-3.5 text-violet-500" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-gray-300" />
                      )}
                      <span className={`text-xs font-semibold ${field.visible ? "text-gray-700" : "text-gray-400"}`}>
                        {field.label}
                      </span>
                    </div>
                    <Switch
                      checked={field.visible}
                      onCheckedChange={(checked: boolean) => {
                        const fields = { ...config.fields, [field.id]: { ...field, visible: checked } };
                        onUpdate({ fields });
                      }}
                    />
                  </div>
                  {field.visible && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-400 w-12">Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const fields = { ...config.fields, [field.id]: { ...field, label: e.target.value } };
                            onUpdate({ fields });
                          }}
                          className="flex-1 px-2 py-0.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-gray-400">Required</label>
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked: boolean) => {
                            const fields = { ...config.fields, [field.id]: { ...field, required: checked } };
                            onUpdate({ fields });
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">Source:</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          field.source === "auto"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-200 text-gray-600"
                        }`}>
                          {field.source === "auto" ? "Auto" : "Manual"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LAYOUT TAB ── */}
        {tab === "layout" && (
          <div>
            <Section title="PRINT FORMAT">
              <div className="space-y-1.5">
                {PRINT_FORMATS.map((pf) => (
                  <button
                    key={pf.id}
                    onClick={() => onUpdate({ printFormat: pf.id as any })}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
                      config.printFormat === pf.id
                        ? "border-violet-400 bg-violet-50"
                        : "border-gray-200 hover:border-violet-200 bg-white"
                    }`}
                  >
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${config.printFormat === pf.id ? "text-violet-700" : "text-gray-700"}`}>
                        {pf.label}
                      </p>
                      <p className="text-[10px] text-gray-400">{pf.sub}</p>
                    </div>
                    {config.printFormat === pf.id && (
                      <CheckCircle2 className="w-4 h-4 text-violet-600" />
                    )}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="WATERMARK">
              <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Show watermark</span>
                  <Switch
                    checked={config.watermark}
                    onCheckedChange={(checked: boolean) => onUpdate({ watermark: checked })}
                  />
                </div>
                {config.watermark && (
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Watermark text</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config.watermarkText}
                        onChange={(e) => onUpdate({ watermarkText: e.target.value.toUpperCase() })}
                        className="flex-1 px-2 py-1 text-xs font-bold border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400 uppercase"
                        placeholder="DRAFT"
                      />
                      {["DRAFT", "PAID", "CANCELLED", "COPY"].map((w) => (
                        <button
                          key={w}
                          onClick={() => onUpdate({ watermarkText: w })}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 hover:border-violet-300 text-gray-500"
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            <Section title="TEMPLATE LIFECYCLE">
              <div className="space-y-2">
                {(["draft", "preview", "published", "archived"] as const).map((s) => {
                  const colors: Record<string, string> = {
                    draft: "border-yellow-200 bg-yellow-50 text-yellow-700",
                    preview: "border-blue-200 bg-blue-50 text-blue-700",
                    published: "border-green-200 bg-green-50 text-green-700",
                    archived: "border-gray-200 bg-gray-50 text-gray-500",
                  };
                  return (
                    <button
                      key={s}
                      onClick={() => onUpdate({ status: s })}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        config.status === s
                          ? colors[s]
                          : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"
                      }`}
                    >
                      <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                      {config.status === s && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="VERSION HISTORY">
              <div className="space-y-1.5">
                {Array.from({ length: Math.min(config.version, 4) }).map((_, i) => {
                  const v = config.version - i;
                  return (
                    <div key={v} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                      <RefreshCw className="w-3 h-3 text-gray-300" />
                      <span className="text-xs text-gray-600 flex-1">Version {v}</span>
                      <span className="text-[10px] text-gray-400">{i === 0 ? "Current" : `${i * 2}d ago`}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
