import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Palette, Layout, Type, ChevronDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────── */
export interface DocSettings {
  showLogo: boolean;
  showGstin: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showPo: boolean;
  showTerms: boolean;
  showNotes: boolean;
  showBankDetails: boolean;
  showQr: boolean;
  showWatermark: boolean;
  watermarkText: string;
  showSignature: boolean;
  showStamp: boolean;
  showAmountWords: boolean;
  showHsn: boolean;
  showDiscount: boolean;
  headerColor: string;
  accentColor: string;
  fontFamily: string;
  paperSize: "A4" | "A5" | "Letter";
  termsText: string;
  bankDetails: string;
}

const DEFAULTS: DocSettings = {
  showLogo: true,
  showGstin: true,
  showAddress: true,
  showPhone: true,
  showEmail: false,
  showPo: true,
  showTerms: true,
  showNotes: true,
  showBankDetails: true,
  showQr: false,
  showWatermark: false,
  watermarkText: "DRAFT",
  showSignature: true,
  showStamp: true,
  showAmountWords: true,
  showHsn: true,
  showDiscount: true,
  headerColor: "#1e3a5f",
  accentColor: "#7c3aed",
  fontFamily: "Poppins",
  paperSize: "A4",
  termsText: "1. Payment due within 30 days of invoice date.\n2. Interest @ 18% p.a. will be charged on overdue amounts.\n3. All disputes subject to local jurisdiction.",
  bankDetails: "",
};

/* ── Hook ───────────────────────────────────────────────── */
export function useDocSettings(docType: string) {
  const key = `docSettings_${docType}`;

  const [settings, setSettings] = useState<DocSettings>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  const update = (patch: Partial<DocSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const reset = () => {
    setSettings(DEFAULTS);
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  };

  return { settings, update, reset };
}

/* ── Panel ──────────────────────────────────────────────── */
interface Props {
  docType: string;
  isOpen: boolean;
  onClose: () => void;
  settings: DocSettings;
  onUpdate: (patch: Partial<DocSettings>) => void;
  onReset: () => void;
}

type Tab = "fields" | "layout" | "style";

const COLORS = ["#1e3a5f", "#1a2a4a", "#7c3aed", "#0f766e", "#b45309", "#1d4ed8", "#be185d", "#374151"];
const FONTS = ["Poppins", "Inter", "Roboto", "Arial", "Georgia", "Courier New"];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "w-full flex items-center justify-between py-2 px-3 rounded-xl text-sm transition-colors hover:bg-gray-50",
        checked ? "text-gray-800" : "text-gray-400",
      )}
    >
      <span className="font-medium">{label}</span>
      <div className={cn("w-9 h-5 rounded-full relative transition-colors flex-shrink-0", checked ? "bg-violet-600" : "bg-gray-200")}>
        <div className={cn("w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform", checked ? "translate-x-4.5" : "translate-x-0.5")} style={{ left: checked ? "auto" : "2px", right: checked ? "2px" : "auto" }} />
      </div>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors">
        {title}
        <ChevronDown className={cn("w-3 h-3 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

export function DocCustomizerPanel({ isOpen, onClose, settings, onUpdate, onReset }: Props) {
  const [tab, setTab] = useState<Tab>("fields");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-72 z-50 bg-white shadow-2xl flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-800">Document Layout</p>
            <p className="text-[11px] text-gray-400">Customize fields & style</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onReset} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Reset to defaults">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {([
            { id: "fields" as Tab, icon: Eye, label: "Fields" },
            { id: "layout" as Tab, icon: Layout, label: "Layout" },
            { id: "style" as Tab, icon: Palette, label: "Style" },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2",
                tab === t.id ? "text-violet-600 border-violet-600" : "text-gray-400 border-transparent hover:text-gray-600",
              )}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {tab === "fields" && (
            <>
              <Section title="Header">
                <Toggle checked={settings.showLogo} onChange={() => onUpdate({ showLogo: !settings.showLogo })} label="Company logo" />
                <Toggle checked={settings.showGstin} onChange={() => onUpdate({ showGstin: !settings.showGstin })} label="GSTIN" />
                <Toggle checked={settings.showAddress} onChange={() => onUpdate({ showAddress: !settings.showAddress })} label="Company address" />
                <Toggle checked={settings.showPhone} onChange={() => onUpdate({ showPhone: !settings.showPhone })} label="Phone number" />
                <Toggle checked={settings.showEmail} onChange={() => onUpdate({ showEmail: !settings.showEmail })} label="Email address" />
              </Section>
              <Section title="Document fields">
                <Toggle checked={settings.showPo} onChange={() => onUpdate({ showPo: !settings.showPo })} label="PO reference" />
                <Toggle checked={settings.showHsn} onChange={() => onUpdate({ showHsn: !settings.showHsn })} label="HSN/SAC code" />
                <Toggle checked={settings.showDiscount} onChange={() => onUpdate({ showDiscount: !settings.showDiscount })} label="Discount column" />
                <Toggle checked={settings.showAmountWords} onChange={() => onUpdate({ showAmountWords: !settings.showAmountWords })} label="Amount in words" />
                <Toggle checked={settings.showNotes} onChange={() => onUpdate({ showNotes: !settings.showNotes })} label="Notes / narration" />
              </Section>
              <Section title="Footer">
                <Toggle checked={settings.showBankDetails} onChange={() => onUpdate({ showBankDetails: !settings.showBankDetails })} label="Bank details" />
                <Toggle checked={settings.showTerms} onChange={() => onUpdate({ showTerms: !settings.showTerms })} label="Terms & conditions" />
                <Toggle checked={settings.showSignature} onChange={() => onUpdate({ showSignature: !settings.showSignature })} label="Authorised signature" />
                <Toggle checked={settings.showStamp} onChange={() => onUpdate({ showStamp: !settings.showStamp })} label="Company stamp" />
                <Toggle checked={settings.showQr} onChange={() => onUpdate({ showQr: !settings.showQr })} label="QR code" />
              </Section>
              <Section title="Watermark">
                <Toggle checked={settings.showWatermark} onChange={() => onUpdate({ showWatermark: !settings.showWatermark })} label="Show watermark" />
                {settings.showWatermark && (
                  <div className="px-3 pb-2">
                    <input
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
                      value={settings.watermarkText}
                      onChange={e => onUpdate({ watermarkText: e.target.value })}
                      placeholder="DRAFT / PAID / COPY…"
                    />
                  </div>
                )}
              </Section>
            </>
          )}

          {tab === "layout" && (
            <div className="px-3 py-2 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Paper size</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["A4", "A5", "Letter"] as const).map(s => (
                    <button key={s} onClick={() => onUpdate({ paperSize: s })}
                      className={cn("py-2 rounded-lg text-xs font-semibold border transition-colors",
                        settings.paperSize === s ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-500 hover:border-violet-300")}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bank details</p>
                <textarea
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                  rows={4}
                  value={settings.bankDetails}
                  onChange={e => onUpdate({ bankDetails: e.target.value })}
                  placeholder={"Bank: HDFC Bank\nA/C: 12345678901234\nIFSC: HDFC0001234"}
                />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Terms & conditions</p>
                <textarea
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                  rows={5}
                  value={settings.termsText}
                  onChange={e => onUpdate({ termsText: e.target.value })}
                />
              </div>
            </div>
          )}

          {tab === "style" && (
            <div className="px-3 py-2 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Header color</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => onUpdate({ headerColor: c })}
                      className={cn("w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110",
                        settings.headerColor === c ? "border-gray-700 scale-110" : "border-transparent")}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Accent color</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => onUpdate({ accentColor: c })}
                      className={cn("w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110",
                        settings.accentColor === c ? "border-gray-700 scale-110" : "border-transparent")}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Font family</p>
                <div className="space-y-1">
                  {FONTS.map(f => (
                    <button key={f} onClick={() => onUpdate({ fontFamily: f })}
                      className={cn("w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors",
                        settings.fontFamily === f ? "border-violet-400 bg-violet-50 text-violet-700 font-semibold" : "border-gray-200 text-gray-600 hover:border-violet-300")}
                      style={{ fontFamily: f }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-3">
          <p className="text-[10px] text-gray-400 text-center">
            Settings saved per document type · Affects print & PDF
          </p>
        </div>
      </div>
    </>
  );
}
