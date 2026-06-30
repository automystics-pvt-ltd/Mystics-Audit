import { useState, useCallback } from "react";
import {
  Undo2, Redo2, Droplets, Save, Rocket, ChevronDown,
  LayoutTemplate, History, Eye, ShieldCheck, AlertTriangle,
  Copy, Download, Keyboard
} from "lucide-react";
import { LeftPanel } from "./left-panel";
import { DocumentPreview, TemplateGallery } from "./preview";
import { RightPanel } from "./right-panel";

export type DocumentType =
  | "receipt" | "invoice" | "quotation" | "po"
  | "delivery_note" | "credit_note" | "debit_note"
  | "proforma" | "gst_invoice" | "expense"
  | "bill_of_supply" | "eway_bill";

export type PrintFormat = "a4" | "a5" | "thermal80" | "thermal57" | "custom";
export type TemplateStatus = "draft" | "preview" | "published" | "archived";

export interface FieldConfig {
  id: string;
  label: string;
  visible: boolean;
  required: boolean;
  source: "auto" | "manual";
}

export interface TemplateConfig {
  documentType: DocumentType;
  documentTitle: string;
  status: TemplateStatus;
  version: number;
  logoUrl: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
  logoPosition: string;
  headerColor: string;
  accentColor: string;
  fontFamily: string;
  printFormat: PrintFormat;
  watermark: boolean;
  watermarkText: string;
  activePaymentModes: string[];
  fields: Record<string, FieldConfig>;
  language: string;
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  receipt: "Payment Receipt",
  invoice: "Tax Invoice",
  quotation: "Quotation",
  po: "Purchase Order",
  delivery_note: "Delivery Note",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  proforma: "Proforma Invoice",
  gst_invoice: "GST Invoice",
  expense: "Expense Claim",
  bill_of_supply: "Bill of Supply",
  eway_bill: "E-Way Bill",
};

const DOC_TITLE_MAP: Record<DocumentType, string> = {
  receipt: "PAYMENT RECEIPT",
  invoice: "TAX INVOICE",
  quotation: "QUOTATION",
  po: "PURCHASE ORDER",
  delivery_note: "DELIVERY NOTE",
  credit_note: "CREDIT NOTE",
  debit_note: "DEBIT NOTE",
  proforma: "PROFORMA INVOICE",
  gst_invoice: "GST INVOICE",
  expense: "EXPENSE CLAIM",
  bill_of_supply: "BILL OF SUPPLY",
  eway_bill: "E-WAY BILL",
};

const DEFAULT_FIELDS: Record<string, FieldConfig> = {
  company_name:     { id: "company_name",     label: "Company name",        visible: true,  required: true,  source: "auto" },
  company_logo:     { id: "company_logo",     label: "Company logo",        visible: true,  required: false, source: "auto" },
  doc_number:       { id: "doc_number",       label: "Receipt number",      visible: true,  required: true,  source: "auto" },
  doc_date:         { id: "doc_date",         label: "Receipt date",        visible: true,  required: true,  source: "auto" },
  qr_code:          { id: "qr_code",          label: "QR code",             visible: true,  required: false, source: "auto" },
  gstin:            { id: "gstin",            label: "Company GSTIN",       visible: true,  required: false, source: "auto" },
  received_from:    { id: "received_from",    label: "Received from",       visible: true,  required: true,  source: "manual" },
  customer_gstin:   { id: "customer_gstin",   label: "Customer GSTIN",      visible: true,  required: false, source: "manual" },
  customer_address: { id: "customer_address", label: "Customer address",    visible: true,  required: false, source: "manual" },
  customer_email:   { id: "customer_email",   label: "Customer email",      visible: false, required: false, source: "manual" },
  customer_phone:   { id: "customer_phone",   label: "Customer phone",      visible: false, required: false, source: "manual" },
  payment_mode:     { id: "payment_mode",     label: "Payment mode",        visible: true,  required: true,  source: "manual" },
  utr_number:       { id: "utr_number",       label: "Cheque / UTR no.",    visible: true,  required: false, source: "manual" },
  bank_name:        { id: "bank_name",        label: "Bank name",           visible: true,  required: false, source: "manual" },
  against_invoices: { id: "against_invoices", label: "Against invoice(s)",  visible: true,  required: false, source: "manual" },
  transaction_date: { id: "transaction_date", label: "Transaction date",    visible: false, required: false, source: "manual" },
  gross_amount:     { id: "gross_amount",     label: "Gross amount",        visible: true,  required: true,  source: "auto" },
  discount:         { id: "discount",         label: "Settlement discount", visible: true,  required: false, source: "manual" },
  tds_deducted:     { id: "tds_deducted",     label: "TDS deducted",        visible: true,  required: false, source: "manual" },
  sgst:             { id: "sgst",             label: "SGST",                visible: false, required: false, source: "auto" },
  cgst:             { id: "cgst",             label: "CGST",                visible: false, required: false, source: "auto" },
  igst:             { id: "igst",             label: "IGST",                visible: false, required: false, source: "auto" },
  net_amount:       { id: "net_amount",       label: "Net amount received", visible: true,  required: true,  source: "auto" },
  amount_words:     { id: "amount_words",     label: "Amount in words",     visible: true,  required: false, source: "auto" },
  outstanding:      { id: "outstanding",      label: "Outstanding balance", visible: false, required: false, source: "auto" },
  narration:        { id: "narration",        label: "Narration / notes",   visible: false, required: false, source: "manual" },
  terms:            { id: "terms",            label: "Terms & conditions",  visible: false, required: false, source: "manual" },
  signature:        { id: "signature",        label: "Authorised signature", visible: true, required: false, source: "manual" },
  stamp:            { id: "stamp",            label: "Company stamp / seal", visible: true, required: false, source: "manual" },
};

const INITIAL_CONFIG: TemplateConfig = {
  documentType: "receipt",
  documentTitle: "PAYMENT RECEIPT",
  status: "draft",
  version: 1,
  logoUrl: null,
  signatureUrl: null,
  stampUrl: null,
  logoPosition: "top-left",
  headerColor: "#1a2a4a",
  accentColor: "#1d6ae5",
  fontFamily: "Inter",
  printFormat: "a4",
  watermark: false,
  watermarkText: "DRAFT",
  activePaymentModes: ["NEFT"],
  fields: DEFAULT_FIELDS,
  language: "en",
};

function complianceScore(config: TemplateConfig): { score: number; issues: string[] } {
  const issues: string[] = [];
  const f = config.fields;
  if (!f.company_name?.visible) issues.push("Company name hidden");
  if (!f.gstin?.visible) issues.push("GSTIN not shown (GST compliance)");
  if (!f.doc_number?.visible) issues.push("Document number missing");
  if (!f.doc_date?.visible) issues.push("Date missing");
  if (!f.net_amount?.visible) issues.push("Net amount not shown");
  if (!config.logoUrl) issues.push("No logo uploaded");
  if (!config.signatureUrl) issues.push("No signature uploaded");
  const total = 7;
  return { score: Math.round(((total - issues.length) / total) * 100), issues };
}

const STATUS_COLORS: Record<TemplateStatus, string> = {
  draft: "bg-yellow-100 text-yellow-700 border-yellow-200",
  preview: "bg-blue-100 text-blue-700 border-blue-200",
  published: "bg-green-100 text-green-700 border-green-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function TemplateBuilder() {
  const [config, setConfig] = useState<TemplateConfig>(INITIAL_CONFIG);
  const [history, setHistory] = useState<TemplateConfig[]>([INITIAL_CONFIG]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [docTypeOpen, setDocTypeOpen] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const pushHistory = useCallback((next: TemplateConfig) => {
    setHistory(prev => [...prev.slice(0, historyIdx + 1), next]);
    setHistoryIdx(i => i + 1);
    setConfig(next);
  }, [historyIdx]);

  const update = useCallback((patch: Partial<TemplateConfig>) => {
    pushHistory({ ...config, ...patch });
  }, [config, pushHistory]);

  const undo = useCallback(() => {
    if (historyIdx > 0) { setHistoryIdx(i => i - 1); setConfig(history[historyIdx - 1]); }
  }, [historyIdx, history]);

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) { setHistoryIdx(i => i + 1); setConfig(history[historyIdx + 1]); }
  }, [historyIdx, history]);

  const handleToggleField = useCallback((id: string) => {
    const fields = { ...config.fields };
    if (fields[id]) { fields[id] = { ...fields[id], visible: !fields[id].visible }; update({ fields }); }
  }, [config.fields, update]);

  const handleSave = () => { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2000); };

  const handlePublish = () => update({
    status: config.status === "published" ? "draft" : "published",
    version: config.status !== "published" ? config.version + 1 : config.version,
  });

  const handleDocTypeChange = (dt: DocumentType) => {
    update({ documentType: dt, documentTitle: DOC_TITLE_MAP[dt] });
    setDocTypeOpen(false);
  };

  const handleDuplicate = () => {
    update({ status: "draft", version: 1, documentTitle: config.documentTitle + " (Copy)" });
  };

  const applyGalleryTemplate = (t: { headerColor: string; accentColor: string; name: string }) => {
    update({ headerColor: t.headerColor, accentColor: t.accentColor });
  };

  const { score, issues } = complianceScore(config);
  const complianceColor = score >= 85 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626";

  const visibleFieldCount = Object.values(config.fields).filter(f => f.visible).length;
  const totalFieldCount = Object.values(config.fields).length;

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 flex flex-col" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0 z-10">
        <div className="flex items-center gap-1.5 mr-1">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            <LayoutTemplate className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-gray-800 hidden md:block">Receipt template builder</span>
        </div>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* Doc type */}
        <div className="relative">
          <button
            onClick={() => setDocTypeOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-colors text-gray-700"
          >
            {DOC_TYPE_LABELS[config.documentType]}
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>
          {docTypeOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDocTypeOpen(false)} />
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-52">
                {(Object.entries(DOC_TYPE_LABELS) as [DocumentType, string][]).map(([k, v]) => (
                  <button key={k} onClick={() => handleDocTypeChange(k)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-violet-50 hover:text-violet-700 transition-colors ${config.documentType === k ? "text-violet-700 font-bold bg-violet-50" : "text-gray-700"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="h-4 w-px bg-gray-200 mx-0.5" />

        <button onClick={undo} disabled={historyIdx === 0}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
          title="Ctrl+Z">
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
        <button onClick={redo} disabled={historyIdx >= history.length - 1}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
          title="Ctrl+Shift+Z">
          <Redo2 className="w-3.5 h-3.5" /> Redo
        </button>
        <button
          onClick={() => update({ watermark: !config.watermark })}
          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${config.watermark ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}>
          <Droplets className="w-3.5 h-3.5" /> Watermark
        </button>
        <button onClick={handleDuplicate}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
          <Copy className="w-3.5 h-3.5" /> Duplicate
        </button>

        <div className="h-4 w-px bg-gray-200 mx-0.5" />

        {/* Compliance badge */}
        <button
          onClick={() => setShowCompliance(o => !o)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
          style={{ borderColor: complianceColor + "50", color: complianceColor }}
          title="Compliance check"
        >
          {score >= 85 ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          <span className="font-bold">{score}%</span>
        </button>

        {/* Compliance dropdown */}
        {showCompliance && issues.length > 0 && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowCompliance(false)} />
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72">
              <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Compliance Issues
              </p>
              {issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">{issue}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex-1" />

        {/* Field count pill */}
        <span className="text-xs text-gray-400 font-medium hidden lg:block">
          {visibleFieldCount}/{totalFieldCount} fields
        </span>

        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[config.status]}`}>
          {config.status.charAt(0).toUpperCase() + config.status.slice(1)}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <History className="w-3 h-3" /> v{config.version}
        </span>

        <div className="h-4 w-px bg-gray-200 mx-0.5" />

        <button onClick={handleSave}
          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${savedFlash ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}>
          {savedFlash ? "✓ Saved!" : <><Download className="w-3.5 h-3.5" /> Save Draft</>}
        </button>
        <button onClick={handlePublish}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${config.status === "published" ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
          <Rocket className="w-3.5 h-3.5" />
          {config.status === "published" ? "Unpublish" : "Publish"}
        </button>
      </div>

      {/* ── 3-panel layout ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden flex flex-col">
          <LeftPanel config={config} onUpdate={update} />
        </div>

        {/* Center preview */}
        <div
          className="flex-1 overflow-y-auto flex flex-col items-center pt-6 pb-8 px-4"
          style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 24px, #e5e7eb1a 24px, #e5e7eb1a 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, #e5e7eb1a 24px, #e5e7eb1a 25px), #f3f4f6" }}
        >
          <DocumentPreview config={config} onToggleField={handleToggleField} />
        </div>

        {/* Right panel */}
        <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-white overflow-hidden flex flex-col">
          <RightPanel config={config} onUpdate={update} />
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-gray-200 bg-white flex-shrink-0 text-xs">
        <button onClick={() => setShowGallery(true)}
          className="hover:text-violet-600 flex items-center gap-1 transition-colors text-gray-500 font-medium">
          📄 All templates ↗
        </button>
        <span className="text-gray-200">|</span>
        <button className="hover:text-violet-600 transition-colors text-gray-500">🖨 Print formats ↗</button>
        <span className="text-gray-200">|</span>
        <button className="hover:text-violet-600 transition-colors text-gray-500">🖼 Logo specs ↗</button>
        <span className="text-gray-200">|</span>
        <button className="hover:text-violet-600 flex items-center gap-1 transition-colors text-gray-500">
          <Eye className="w-3 h-3" /> Field visibility rules ↗
        </button>
        <div className="flex-1" />
        <button onClick={() => setShowShortcuts(o => !o)}
          className="flex items-center gap-1 hover:text-violet-600 text-gray-400 transition-colors">
          <Keyboard className="w-3 h-3" />
        </button>
        <span className="text-gray-400">
          {config.printFormat.toUpperCase()} · {config.fontFamily} ·{" "}
          {config.language === "en" ? "English" : config.language === "ta" ? "Tamil" : config.language === "hi" ? "Hindi" : config.language}
        </span>
      </div>

      {/* ── Gallery modal ── */}
      {showGallery && (
        <TemplateGallery
          onApply={applyGalleryTemplate}
          onClose={() => setShowGallery(false)}
        />
      )}

      {/* ── Keyboard shortcuts panel ── */}
      {showShortcuts && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowShortcuts(false)} />
          <div className="fixed bottom-12 right-4 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-64">
            <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Keyboard className="w-3.5 h-3.5" /> Keyboard Shortcuts
            </p>
            {[
              ["Ctrl+Z", "Undo"],
              ["Ctrl+Shift+Z", "Redo"],
              ["Ctrl+S", "Save draft"],
              ["Ctrl+D", "Duplicate template"],
              ["Escape", "Close dropdowns"],
            ].map(([key, action]) => (
              <div key={key} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{action}</span>
                <kbd className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{key}</kbd>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
