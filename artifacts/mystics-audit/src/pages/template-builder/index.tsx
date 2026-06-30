import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Undo2, Redo2, Droplets, Save, Rocket, ChevronDown,
  LayoutTemplate, History, Eye
} from "lucide-react";
import { LeftPanel } from "./left-panel";
import { DocumentPreview } from "./preview";
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
  company_name:     { id: "company_name",     label: "Company name",       visible: true,  required: true,  source: "auto" },
  company_logo:     { id: "company_logo",     label: "Company logo",       visible: true,  required: false, source: "auto" },
  doc_number:       { id: "doc_number",       label: "Receipt number",     visible: true,  required: true,  source: "auto" },
  doc_date:         { id: "doc_date",         label: "Receipt date",       visible: true,  required: true,  source: "auto" },
  qr_code:          { id: "qr_code",          label: "QR code",            visible: true,  required: false, source: "auto" },
  gstin:            { id: "gstin",            label: "Company GSTIN",      visible: true,  required: false, source: "auto" },
  received_from:    { id: "received_from",    label: "Received from",      visible: true,  required: true,  source: "manual" },
  customer_gstin:   { id: "customer_gstin",   label: "Customer GSTIN",     visible: true,  required: false, source: "manual" },
  customer_address: { id: "customer_address", label: "Customer address",   visible: true,  required: false, source: "manual" },
  customer_email:   { id: "customer_email",   label: "Customer email",     visible: false, required: false, source: "manual" },
  customer_phone:   { id: "customer_phone",   label: "Customer phone",     visible: false, required: false, source: "manual" },
  payment_mode:     { id: "payment_mode",     label: "Payment mode",       visible: true,  required: true,  source: "manual" },
  utr_number:       { id: "utr_number",       label: "Cheque / UTR no.",   visible: true,  required: false, source: "manual" },
  bank_name:        { id: "bank_name",        label: "Bank name",          visible: true,  required: false, source: "manual" },
  against_invoices: { id: "against_invoices", label: "Against invoice(s)", visible: true,  required: false, source: "manual" },
  transaction_date: { id: "transaction_date", label: "Transaction date",   visible: false, required: false, source: "manual" },
  gross_amount:     { id: "gross_amount",     label: "Gross amount",       visible: true,  required: true,  source: "auto" },
  discount:         { id: "discount",         label: "Settlement discount", visible: true,  required: false, source: "manual" },
  tds_deducted:     { id: "tds_deducted",     label: "TDS deducted",       visible: true,  required: false, source: "manual" },
  sgst:             { id: "sgst",             label: "SGST",               visible: false, required: false, source: "auto" },
  cgst:             { id: "cgst",             label: "CGST",               visible: false, required: false, source: "auto" },
  igst:             { id: "igst",             label: "IGST",               visible: false, required: false, source: "auto" },
  net_amount:       { id: "net_amount",       label: "Net amount received", visible: true,  required: true,  source: "auto" },
  amount_words:     { id: "amount_words",     label: "Amount in words",    visible: true,  required: false, source: "auto" },
  outstanding:      { id: "outstanding",      label: "Outstanding balance", visible: false, required: false, source: "auto" },
  narration:        { id: "narration",        label: "Narration / notes",  visible: false, required: false, source: "manual" },
  terms:            { id: "terms",            label: "Terms & conditions", visible: false, required: false, source: "manual" },
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
  watermarkText: "PAID",
  activePaymentModes: ["NEFT"],
  fields: DEFAULT_FIELDS,
  language: "en",
};

export default function TemplateBuilder() {
  const [config, setConfig] = useState<TemplateConfig>(INITIAL_CONFIG);
  const [history, setHistory] = useState<TemplateConfig[]>([INITIAL_CONFIG]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [docTypeOpen, setDocTypeOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const pushHistory = useCallback((next: TemplateConfig) => {
    setHistory(prev => [...prev.slice(0, historyIdx + 1), next]);
    setHistoryIdx(i => i + 1);
    setConfig(next);
  }, [historyIdx]);

  const update = useCallback((patch: Partial<TemplateConfig>) => {
    const next = { ...config, ...patch };
    pushHistory(next);
  }, [config, pushHistory]);

  const undo = useCallback(() => {
    if (historyIdx > 0) {
      setHistoryIdx(i => i - 1);
      setConfig(history[historyIdx - 1]);
    }
  }, [historyIdx, history]);

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(i => i + 1);
      setConfig(history[historyIdx + 1]);
    }
  }, [historyIdx, history]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePublish = () => {
    update({ status: config.status === "published" ? "draft" : "published", version: config.version + 1 });
  };

  const handleDocTypeChange = (dt: DocumentType) => {
    update({ documentType: dt, documentTitle: DOC_TITLE_MAP[dt] });
    setDocTypeOpen(false);
  };

  const statusColor: Record<TemplateStatus, string> = {
    draft: "bg-yellow-100 text-yellow-700 border-yellow-200",
    preview: "bg-blue-100 text-blue-700 border-blue-200",
    published: "bg-green-100 text-green-700 border-green-200",
    archived: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0 z-10">
        <div className="flex items-center gap-1.5 mr-2">
          <LayoutTemplate className="w-4 h-4 text-violet-600" />
          <span className="font-semibold text-sm text-gray-800">Receipt template builder</span>
        </div>

        <div className="h-4 w-px bg-gray-200" />

        {/* Doc type selector */}
        <div className="relative">
          <button
            onClick={() => setDocTypeOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-colors text-gray-700"
          >
            {DOC_TYPE_LABELS[config.documentType]}
            <ChevronDown className="w-3 h-3" />
          </button>
          {docTypeOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-52">
              {(Object.entries(DOC_TYPE_LABELS) as [DocumentType, string][]).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => handleDocTypeChange(k)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-violet-50 hover:text-violet-700 transition-colors ${
                    config.documentType === k ? "text-violet-700 font-semibold bg-violet-50" : "text-gray-700"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-gray-200" />

        <button
          onClick={undo}
          disabled={historyIdx === 0}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
        <button
          onClick={redo}
          disabled={historyIdx >= history.length - 1}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
        >
          <Redo2 className="w-3.5 h-3.5" /> Redo
        </button>
        <button
          onClick={() => update({ watermark: !config.watermark })}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            config.watermark
              ? "border-violet-400 bg-violet-50 text-violet-700"
              : "border-gray-200 hover:bg-gray-50 text-gray-600"
          }`}
        >
          <Droplets className="w-3.5 h-3.5" /> Watermark
        </button>

        <div className="flex-1" />

        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor[config.status]}`}>
          {config.status.charAt(0).toUpperCase() + config.status.slice(1)}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <History className="w-3 h-3" /> v{config.version}
        </span>

        <div className="h-4 w-px bg-gray-200" />

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
        >
          <Save className="w-3.5 h-3.5" />
          {saved ? "Saved!" : "Save Draft"}
        </button>
        <button
          onClick={handlePublish}
          className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors ${
            config.status === "published"
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-violet-600 text-white hover:bg-violet-700"
          }`}
        >
          <Rocket className="w-3.5 h-3.5" />
          {config.status === "published" ? "Unpublish" : "Publish"}
        </button>
      </div>

      {/* ── 3-panel layout ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <LeftPanel config={config} onUpdate={update} />
        </div>

        {/* Center preview */}
        <div className="flex-1 bg-gray-100 overflow-y-auto flex items-start justify-center p-6">
          <DocumentPreview config={config} />
        </div>

        {/* Right */}
        <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          <RightPanel config={config} onUpdate={update} />
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 bg-white flex-shrink-0 text-xs text-gray-500">
        <button className="hover:text-violet-600 flex items-center gap-1 transition-colors">
          <Eye className="w-3.5 h-3.5" /> Field visibility rules ↗
        </button>
        <span className="text-gray-200">|</span>
        <button className="hover:text-violet-600 transition-colors">🖨 Print formats ↗</button>
        <span className="text-gray-200">|</span>
        <button className="hover:text-violet-600 transition-colors">🖼 Logo specs ↗</button>
        <span className="text-gray-200">|</span>
        <button className="hover:text-violet-600 transition-colors">📄 All templates ↗</button>
        <div className="flex-1" />
        <span className="text-gray-400">
          {config.printFormat.toUpperCase()} · {config.fontFamily} · {config.language === "en" ? "English" : config.language}
        </span>
      </div>
    </div>
  );
}
