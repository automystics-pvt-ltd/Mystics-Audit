import { useState } from "react";
import {
  Building2, Image, Hash, Calendar, QrCode, User, Mail, Phone, MapPin,
  CreditCard, FileDigit, Landmark, FileText, IndianRupee, Tag, Percent,
  Calculator, AlignLeft, Pen, Stamp, Package, Columns, Eye, EyeOff,
  Type, Minus, Square, Barcode, PenLine, Grid3X3, LayoutGrid, Puzzle
} from "lucide-react";
import type { TemplateConfig, FieldConfig } from "./index";

interface Props {
  config: TemplateConfig;
  onUpdate: (patch: Partial<TemplateConfig>) => void;
}

interface FieldDef {
  id: string;
  icon: React.ElementType;
  label: string;
}

const FIELD_GROUPS: { name: string; fields: FieldDef[] }[] = [
  {
    name: "SYSTEM FIELDS",
    fields: [
      { id: "company_name",   icon: Building2,    label: "Company name" },
      { id: "company_logo",   icon: Image,         label: "Company logo" },
      { id: "doc_number",     icon: Hash,          label: "Receipt number" },
      { id: "doc_date",       icon: Calendar,      label: "Receipt date" },
      { id: "qr_code",        icon: QrCode,        label: "QR code" },
      { id: "gstin",          icon: FileDigit,     label: "Company GSTIN" },
    ],
  },
  {
    name: "CUSTOMER FIELDS",
    fields: [
      { id: "received_from",    icon: User,    label: "Received from" },
      { id: "customer_gstin",   icon: FileDigit, label: "Customer GSTIN" },
      { id: "customer_address", icon: MapPin,  label: "Customer address" },
      { id: "customer_email",   icon: Mail,    label: "Customer email" },
      { id: "customer_phone",   icon: Phone,   label: "Customer phone" },
    ],
  },
  {
    name: "PAYMENT FIELDS",
    fields: [
      { id: "payment_mode",     icon: CreditCard, label: "Payment mode" },
      { id: "utr_number",       icon: FileDigit,  label: "Cheque / UTR no." },
      { id: "bank_name",        icon: Landmark,   label: "Bank name" },
      { id: "against_invoices", icon: FileText,   label: "Against invoice(s)" },
      { id: "transaction_date", icon: Calendar,   label: "Transaction date" },
    ],
  },
  {
    name: "AMOUNT FIELDS",
    fields: [
      { id: "gross_amount",  icon: IndianRupee, label: "Gross amount" },
      { id: "discount",      icon: Tag,         label: "Settlement discount" },
      { id: "tds_deducted",  icon: Percent,     label: "TDS deducted" },
      { id: "sgst",          icon: Calculator,  label: "SGST" },
      { id: "cgst",          icon: Calculator,  label: "CGST" },
      { id: "igst",          icon: Calculator,  label: "IGST" },
      { id: "net_amount",    icon: IndianRupee, label: "Net amount received" },
      { id: "amount_words",  icon: AlignLeft,   label: "Amount in words" },
      { id: "outstanding",   icon: IndianRupee, label: "Outstanding balance" },
    ],
  },
  {
    name: "FOOTER FIELDS",
    fields: [
      { id: "narration",  icon: AlignLeft, label: "Narration / notes" },
      { id: "terms",      icon: FileText,  label: "Terms & conditions" },
      { id: "signature",  icon: Pen,       label: "Authorised signature" },
      { id: "stamp",      icon: Stamp,     label: "Company stamp / seal" },
    ],
  },
];

const SECTION_ITEMS = [
  { icon: Building2, label: "Company header" },
  { icon: User,      label: "Customer section" },
  { icon: Package,   label: "Line items table" },
  { icon: IndianRupee, label: "Totals section" },
  { icon: Columns,   label: "Two-column info" },
  { icon: AlignLeft, label: "Footer / notes" },
];

const ELEMENT_ITEMS = [
  { icon: Type,      label: "Text block" },
  { icon: Image,     label: "Image / logo" },
  { icon: Minus,     label: "Divider line" },
  { icon: Square,    label: "Coloured box" },
  { icon: QrCode,    label: "QR code" },
  { icon: Barcode,   label: "Barcode" },
  { icon: PenLine,   label: "Signature block" },
  { icon: Grid3X3,   label: "Mini table" },
];

function FieldRow({
  field,
  fieldDef,
  onToggle,
}: {
  field: FieldConfig;
  fieldDef: FieldDef;
  onToggle: () => void;
}) {
  const Icon = fieldDef.icon;
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 group hover:bg-gray-50 rounded-lg transition-colors cursor-default">
      <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <span className={`flex-1 text-sm truncate ${field.visible ? "text-gray-700" : "text-gray-400"}`}>
        {field.label}
      </span>
      {field.source === "auto" && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 flex-shrink-0">
          Auto
        </span>
      )}
      <button
        onClick={onToggle}
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-gray-400 hover:text-gray-700"
      >
        {field.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function LeftPanel({ config, onUpdate }: Props) {
  const [tab, setTab] = useState<"fields" | "sections" | "elements">("fields");

  const toggleField = (id: string) => {
    const fields = { ...config.fields };
    if (fields[id]) {
      fields[id] = { ...fields[id], visible: !fields[id].visible };
      onUpdate({ fields });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
        {(["fields", "sections", "elements"] as const).map((t) => (
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        {tab === "fields" && (
          <div className="space-y-1">
            {FIELD_GROUPS.map((group) => (
              <div key={group.name} className="mb-3">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest px-3 py-1.5">
                  {group.name}
                </p>
                {group.fields.map((fd) => {
                  const field = config.fields[fd.id];
                  if (!field) return null;
                  return (
                    <FieldRow
                      key={fd.id}
                      field={field}
                      fieldDef={fd}
                      onToggle={() => toggleField(fd.id)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {tab === "sections" && (
          <div className="space-y-1 px-1">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest px-2 py-1.5">
              DRAG TO REORDER
            </p>
            {SECTION_ITEMS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/40 cursor-grab transition-colors"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-gray-300" />
                  <Icon className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-sm text-gray-700">{s.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {tab === "elements" && (
          <div className="space-y-1 px-1">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest px-2 py-1.5">
              CLICK TO ADD
            </p>
            {ELEMENT_ITEMS.map((e) => {
              const Icon = e.icon;
              return (
                <button
                  key={e.label}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-gray-200 bg-white hover:border-violet-400 hover:bg-violet-50/40 cursor-pointer transition-colors group"
                >
                  <Puzzle className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-400" />
                  <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-violet-600" />
                  <span className="text-sm text-gray-600 group-hover:text-violet-700">{e.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
