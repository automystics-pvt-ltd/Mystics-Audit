import { useState, useRef } from "react";
import {
  Building2, Image, Hash, Calendar, QrCode, User, Mail, Phone, MapPin,
  FileDigit, Landmark, FileText, IndianRupee, Tag, Percent,
  Calculator, AlignLeft, Pen, Stamp, Package, Eye, EyeOff,
  Type, Minus, Square, Barcode, PenLine, Grid3X3, LayoutGrid, Puzzle,
  Plus, Sigma, List, Star, ToggleLeft, Table2, ChevronUp, ChevronDown as ChDown, GripVertical
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { TemplateConfig, FieldConfig } from "./index";

interface Props {
  config: TemplateConfig;
  onUpdate: (patch: Partial<TemplateConfig>) => void;
}

interface FieldDef { id: string; icon: React.ElementType; label: string }

const FIELD_GROUPS: { name: string; fields: FieldDef[] }[] = [
  { name: "SYSTEM FIELDS", fields: [
    { id: "company_name",   icon: Building2,   label: "Company name" },
    { id: "company_logo",   icon: Image,        label: "Company logo" },
    { id: "doc_number",     icon: Hash,         label: "Receipt number" },
    { id: "doc_date",       icon: Calendar,     label: "Receipt date" },
    { id: "qr_code",        icon: QrCode,       label: "QR code" },
    { id: "gstin",          icon: FileDigit,    label: "Company GSTIN" },
  ]},
  { name: "CUSTOMER FIELDS", fields: [
    { id: "received_from",    icon: User,      label: "Received from" },
    { id: "customer_gstin",   icon: FileDigit, label: "Customer GSTIN" },
    { id: "customer_address", icon: MapPin,    label: "Customer address" },
    { id: "customer_email",   icon: Mail,      label: "Customer email" },
    { id: "customer_phone",   icon: Phone,     label: "Customer phone" },
  ]},
  { name: "PAYMENT FIELDS", fields: [
    { id: "payment_mode",     icon: FileText,  label: "Payment mode" },
    { id: "utr_number",       icon: FileDigit, label: "Cheque / UTR no." },
    { id: "bank_name",        icon: Landmark,  label: "Bank name" },
    { id: "against_invoices", icon: FileText,  label: "Against invoice(s)" },
    { id: "transaction_date", icon: Calendar,  label: "Transaction date" },
  ]},
  { name: "AMOUNT FIELDS", fields: [
    { id: "gross_amount",  icon: IndianRupee, label: "Gross amount" },
    { id: "discount",      icon: Tag,         label: "Settlement discount" },
    { id: "tds_deducted",  icon: Percent,     label: "TDS deducted" },
    { id: "sgst",          icon: Calculator,  label: "SGST" },
    { id: "cgst",          icon: Calculator,  label: "CGST" },
    { id: "igst",          icon: Calculator,  label: "IGST" },
    { id: "net_amount",    icon: IndianRupee, label: "Net amount received" },
    { id: "amount_words",  icon: AlignLeft,   label: "Amount in words" },
    { id: "outstanding",   icon: IndianRupee, label: "Outstanding balance" },
  ]},
  { name: "FOOTER FIELDS", fields: [
    { id: "narration",  icon: AlignLeft, label: "Narration / notes" },
    { id: "terms",      icon: FileText,  label: "Terms & conditions" },
    { id: "signature",  icon: Pen,       label: "Authorised signature" },
    { id: "stamp",      icon: Stamp,     label: "Company stamp / seal" },
  ]},
];

interface SectionItem { id: string; label: string; icon: React.ElementType }
const SECTIONS: SectionItem[] = [
  { id: "header",   label: "Company header",    icon: Building2 },
  { id: "doctitle", label: "Document title bar", icon: FileText },
  { id: "customer", label: "Customer section",   icon: User },
  { id: "payment",  label: "Payment details",    icon: IndianRupee },
  { id: "items",    label: "Line items table",   icon: Table2 },
  { id: "totals",   label: "Totals section",     icon: Calculator },
  { id: "footer",   label: "Footer / notes",     icon: AlignLeft },
];

const CUSTOM_FIELD_TYPES = [
  { id: "text",      icon: Type,       label: "Text field",      badge: "T" },
  { id: "number",    icon: Hash,       label: "Number field",    badge: "#" },
  { id: "formula",   icon: Sigma,      label: "Formula field",   badge: "f(x)" },
  { id: "dropdown",  icon: List,       label: "Dropdown select", badge: "▾" },
  { id: "toggle",    icon: ToggleLeft, label: "Yes / No toggle", badge: "✓" },
  { id: "qr",        icon: QrCode,     label: "QR generator",    badge: "QR" },
  { id: "barcode",   icon: Barcode,    label: "Barcode field",   badge: "≡≡" },
  { id: "rating",    icon: Star,       label: "Star rating",     badge: "★" },
  { id: "subtable",  icon: Table2,     label: "Sub-table",       badge: "⊞" },
  { id: "signature", icon: PenLine,    label: "Signature pad",   badge: "✍" },
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

function FieldRow({ field, fieldDef, onToggle }: { field: FieldConfig; fieldDef: FieldDef; onToggle: () => void }) {
  const Icon = fieldDef.icon;
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 group hover:bg-gray-50 rounded-lg transition-colors">
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${field.visible ? "text-violet-500" : "text-gray-300"}`} />
      <span className={`flex-1 text-xs truncate ${field.visible ? "text-gray-700" : "text-gray-400 line-through"}`}>
        {field.label}
      </span>
      {field.source === "auto" && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 flex-shrink-0">Auto</span>
      )}
      <button onClick={onToggle} className="flex-shrink-0">
        {field.visible
          ? <Eye className="w-3.5 h-3.5 text-gray-300 hover:text-violet-600 transition-colors" />
          : <EyeOff className="w-3.5 h-3.5 text-gray-200 hover:text-gray-500 transition-colors" />}
      </button>
    </div>
  );
}

// Draggable section row
function SectionRow({ item, index, onMoveUp, onMoveDown, isFirst, isLast }: {
  item: SectionItem; index: number;
  onMoveUp: () => void; onMoveDown: () => void;
  isFirst: boolean; isLast: boolean;
}) {
  const Icon = item.icon;
  return (
    <div className="flex items-center gap-2 px-2.5 py-2.5 rounded-xl border border-gray-200 bg-white group hover:border-violet-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing">
      <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
      <Icon className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
      <span className="flex-1 text-xs text-gray-700 font-medium">{item.label}</span>
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onMoveUp} disabled={isFirst} className="p-0.5 rounded hover:bg-violet-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronUp className="w-3 h-3 text-violet-500" />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="p-0.5 rounded hover:bg-violet-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChDown className="w-3 h-3 text-violet-500" />
        </button>
      </div>
    </div>
  );
}

export function LeftPanel({ config, onUpdate }: Props) {
  const [tab, setTab] = useState<"fields" | "sections" | "elements">("fields");
  const [sections, setSections] = useState<SectionItem[]>(SECTIONS);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addingCustom, setAddingCustom] = useState(false);
  const [customFieldName, setCustomFieldName] = useState("");
  const [customFieldType, setCustomFieldType] = useState("text");

  const toggleField = (id: string) => {
    const fields = { ...config.fields };
    if (fields[id]) {
      fields[id] = { ...fields[id], visible: !fields[id].visible };
      onUpdate({ fields });
    }
  };

  const toggleAll = (groupFields: FieldDef[], visible: boolean) => {
    const fields = { ...config.fields };
    groupFields.forEach(fd => {
      if (fields[fd.id]) fields[fd.id] = { ...fields[fd.id], visible };
    });
    onUpdate({ fields });
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const next = [...sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
  };

  const addCustomField = () => {
    if (!customFieldName.trim()) return;
    const id = `custom_${Date.now()}`;
    const fields = {
      ...config.fields,
      [id]: { id, label: customFieldName, visible: true, required: false, source: "manual" as const },
    };
    onUpdate({ fields });
    setCustomFieldName("");
    setAddingCustom(false);
  };

  const visibleCount = (group: { fields: FieldDef[] }) =>
    group.fields.filter(fd => config.fields[fd.id]?.visible).length;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
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

      <div className="flex-1 overflow-y-auto py-2 px-2">

        {/* ── FIELDS TAB ── */}
        {tab === "fields" && (
          <div>
            {FIELD_GROUPS.map((group) => {
              const isCollapsed = collapsed[group.name];
              const vc = visibleCount(group);
              return (
                <div key={group.name} className="mb-2">
                  <div
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer group"
                    onClick={() => setCollapsed(c => ({ ...c, [group.name]: !c[group.name] }))}
                  >
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest flex items-center gap-1.5">
                      {group.name}
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {vc}/{group.fields.length}
                      </span>
                    </p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAll(group.fields, true); }}
                        className="text-[10px] px-1 py-0.5 rounded text-violet-600 hover:bg-violet-50 font-semibold"
                      >All</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAll(group.fields, false); }}
                        className="text-[10px] px-1 py-0.5 rounded text-gray-400 hover:bg-gray-100 font-semibold"
                      >None</button>
                    </div>
                  </div>
                  {!isCollapsed && group.fields.map((fd) => {
                    const field = config.fields[fd.id];
                    if (!field) return null;
                    return (
                      <FieldRow key={fd.id} field={field} fieldDef={fd} onToggle={() => toggleField(fd.id)} />
                    );
                  })}
                </div>
              );
            })}

            {/* Custom field section */}
            <div className="mt-2 px-2">
              <div className="h-px bg-gray-100 mb-3" />
              <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-2 px-1">CUSTOM FIELDS</p>
              {/* Show existing custom fields */}
              {Object.values(config.fields).filter(f => f.id.startsWith("custom_")).map(f => (
                <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 group">
                  <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="flex-1 text-xs text-gray-700 truncate">{f.label}</span>
                  <button onClick={() => {
                    const fields = { ...config.fields };
                    delete fields[f.id];
                    onUpdate({ fields });
                  }} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 text-xs font-bold">×</button>
                </div>
              ))}
              {addingCustom ? (
                <div className="bg-violet-50 rounded-xl border border-violet-200 p-3 mt-1">
                  <select
                    value={customFieldType}
                    onChange={e => setCustomFieldType(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mb-2 bg-white"
                  >
                    {CUSTOM_FIELD_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    autoFocus
                    type="text"
                    value={customFieldName}
                    onChange={e => setCustomFieldName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustomField()}
                    placeholder="Field label…"
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mb-2 focus:outline-none focus:border-violet-400"
                  />
                  <div className="flex gap-2">
                    <button onClick={addCustomField} className="flex-1 text-xs bg-violet-600 text-white py-1.5 rounded-lg font-semibold hover:bg-violet-700">Add</button>
                    <button onClick={() => setAddingCustom(false)} className="flex-1 text-xs bg-gray-100 text-gray-600 py-1.5 rounded-lg hover:bg-gray-200">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCustom(true)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-violet-600 border border-dashed border-violet-300 rounded-xl py-2 hover:bg-violet-50 transition-colors mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add custom field
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── SECTIONS TAB ── */}
        {tab === "sections" && (
          <div className="px-1">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest px-2 py-1.5 mb-1">
              DRAG OR USE ARROWS TO REORDER
            </p>
            <div className="space-y-1.5">
              {sections.map((s, i) => (
                <SectionRow
                  key={s.id}
                  item={s}
                  index={i}
                  onMoveUp={() => moveSection(i, -1)}
                  onMoveDown={() => moveSection(i, 1)}
                  isFirst={i === 0}
                  isLast={i === sections.length - 1}
                />
              ))}
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-4 px-2">
              Section order is reflected in the printed document
            </p>
          </div>
        )}

        {/* ── ELEMENTS TAB ── */}
        {tab === "elements" && (
          <div className="px-1">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest px-2 py-1.5">CUSTOM FIELD TYPES</p>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {CUSTOM_FIELD_TYPES.map((ct) => {
                const Icon = ct.icon;
                return (
                  <button
                    key={ct.id}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-gray-200 bg-white hover:border-violet-400 hover:bg-violet-50/40 cursor-pointer transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                      <Icon className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-[10px] text-gray-600 text-center leading-tight group-hover:text-violet-700">{ct.label}</span>
                    <span className="text-[9px] font-mono font-bold text-gray-300 group-hover:text-violet-400">{ct.badge}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] font-bold text-gray-400 tracking-widest px-2 py-1.5">LAYOUT ELEMENTS</p>
            <div className="space-y-1">
              {ELEMENT_ITEMS.map((e) => {
                const Icon = e.icon;
                return (
                  <button
                    key={e.label}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-gray-200 bg-white hover:border-violet-400 hover:bg-violet-50/40 transition-colors group"
                  >
                    <Puzzle className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-400" />
                    <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-violet-600" />
                    <span className="text-xs text-gray-600 group-hover:text-violet-700">{e.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
