import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { TemplateConfig } from "./index";

interface Props {
  config: TemplateConfig;
  onToggleField?: (id: string) => void;
}

const FORMAT_SIZES: Record<string, { width: number; label: string; thermal?: boolean }> = {
  a4:         { width: 595, label: "A4 (210×297mm)" },
  a5:         { width: 420, label: "A5 (148×210mm)" },
  thermal80:  { width: 226, label: "80mm Thermal", thermal: true },
  thermal57:  { width: 161, label: "57mm Thermal", thermal: true },
  custom:     { width: 500, label: "Custom" },
};

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function amountWords(n: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if (n === 0) return "Zero";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " "+ones[n%10] : "");
  if (n < 1000) return ones[Math.floor(n/100)]+" Hundred"+(n%100 ? " "+amountWords(n%100) : "");
  if (n < 100000) return amountWords(Math.floor(n/1000))+" Thousand"+(n%1000 ? " "+amountWords(n%1000) : "");
  return amountWords(Math.floor(n/100000))+" Lakh"+(n%100000 ? " "+amountWords(n%100000) : "");
}

const SAMPLE = {
  company: "Automystics Technologies Pvt. Ltd.",
  gstin: "33ABFCA6057N1ZE", address: "Dindigul, Tamil Nadu",
  phone: "+91 98765 43210",
  docNo: "RCP/2026/0042", docDate: "29 Jun 2026",
  customer: "Rajan Textiles Pvt. Ltd.",
  custGstin: "33AABCR1234A1Z5", custAddress: "Chennai, Tamil Nadu",
  invoices: "INV/2026/0089 (₹45,000), INV/2026/0091 (₹23,600)",
  utr: "HDFCA2026062912345", bankName: "HDFC Bank, Coimbatore",
  gross: 68600, tds: 4500, discount: 600, net: 63500,
};

const INVOICE_ITEMS = [
  { desc: "Software licence – Standard", hsn: "998314", qty: 12, unit: "Mo", rate: 3750, gst: 18, taxable: 45000, cgst: 4050, sgst: 4050, total: 53100 },
  { desc: "Implementation & Support",    hsn: "998316", qty: 1,  unit: "Nos", rate: 23600, gst: 18, taxable: 23600, cgst: 2124, sgst: 2124, total: 27848 },
];

// ── Hover-aware field wrapper ──────────────────────────────────────────────────
function FieldOverlay({ id, visible, onToggle, children }: { id: string; visible: boolean; onToggle?: (id: string) => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  if (!onToggle) return <>{children}</>;
  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && (
        <button
          onClick={() => onToggle(id)}
          className="absolute top-0 right-0 z-20 p-0.5 rounded bg-violet-600 text-white shadow-sm translate-x-1/2 -translate-y-1/2"
          title={visible ? "Hide field" : "Show field"}
        >
          {visible ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
        </button>
      )}
    </div>
  );
}

// ── THERMAL Receipt ────────────────────────────────────────────────────────────
function ThermalReceiptPreview({ config, onToggleField }: Props) {
  const f = config.fields;
  const modes = ["NEFT", "UPI", "Cheque", "Cash", "RTGS"];
  return (
    <div
      className="bg-white py-4 px-3 text-black"
      style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 10, lineHeight: 1.4 }}
    >
      {/* Header */}
      <div className="text-center mb-3">
        {f.company_logo?.visible && config.logoUrl && (
          <img src={config.logoUrl} alt="logo" className="h-8 mx-auto mb-1 object-contain" />
        )}
        {f.company_name?.visible && (
          <div className="font-bold text-xs">{SAMPLE.company}</div>
        )}
        {f.gstin?.visible && <div>GSTIN: {SAMPLE.gstin}</div>}
        <div>{SAMPLE.address}</div>
        <div>{SAMPLE.phone}</div>
        <div className="my-1">{"─".repeat(28)}</div>
        <div className="font-bold">{config.documentTitle}</div>
        {f.doc_number?.visible && <div>No: {SAMPLE.docNo}</div>}
        {f.doc_date?.visible && <div>Date: {SAMPLE.docDate}</div>}
        <div className="my-1">{"─".repeat(28)}</div>
      </div>

      {/* Customer */}
      {f.received_from?.visible && (
        <div className="mb-2">
          <div className="font-bold">RECEIVED FROM:</div>
          <div>{SAMPLE.customer}</div>
          {f.customer_gstin?.visible && <div>GSTIN: {SAMPLE.custGstin}</div>}
          {f.customer_address?.visible && <div>{SAMPLE.custAddress}</div>}
        </div>
      )}
      <div className="my-1">{"─".repeat(28)}</div>

      {/* Payment mode */}
      {f.payment_mode?.visible && (
        <div className="mb-1">
          <span className="font-bold">Mode: </span>
          {config.activePaymentModes.join(" / ")}
        </div>
      )}
      {f.utr_number?.visible && <div>UTR: {SAMPLE.utr}</div>}
      {f.bank_name?.visible && <div>Bank: {SAMPLE.bankName}</div>}
      {f.against_invoices?.visible && (
        <div className="text-[9px] my-1">Ref: {SAMPLE.invoices}</div>
      )}
      <div className="my-1">{"─".repeat(28)}</div>

      {/* Amounts */}
      <div className="space-y-0.5 text-[10px]">
        {f.gross_amount?.visible && (
          <div className="flex justify-between"><span>Invoice Total</span><span>{fmt(SAMPLE.gross)}</span></div>
        )}
        {f.tds_deducted?.visible && (
          <div className="flex justify-between"><span>Less: TDS (7%)</span><span>-{fmt(SAMPLE.tds)}</span></div>
        )}
        {f.discount?.visible && (
          <div className="flex justify-between"><span>Less: Discount</span><span>-{fmt(SAMPLE.discount)}</span></div>
        )}
        <div className="my-0.5">{"─".repeat(28)}</div>
        {f.net_amount?.visible && (
          <div className="flex justify-between font-bold"><span>NET RECEIVED</span><span>{fmt(SAMPLE.net)}</span></div>
        )}
      </div>

      {/* Words */}
      {f.amount_words?.visible && (
        <div className="mt-1 text-[9px]">Rupees: {amountWords(SAMPLE.net)} Only</div>
      )}
      <div className="my-1">{"─".repeat(28)}</div>

      {/* Footer */}
      <div className="text-center text-[9px] mt-2">
        {f.signature?.visible && (
          <div className="mt-4 mb-1">
            {config.signatureUrl
              ? <img src={config.signatureUrl} alt="sig" className="h-6 mx-auto object-contain" />
              : <div className="border-b border-black w-20 mx-auto mb-0.5" />
            }
            <div>Authorised Signatory</div>
          </div>
        )}
        <div>This is a computer-generated receipt</div>
        <div>Thank you for your payment!</div>
      </div>
    </div>
  );
}

// ── A4 Receipt Preview ────────────────────────────────────────────────────────
function ReceiptPreview({ config, onToggleField }: Props) {
  const f = config.fields;
  const modes = ["NEFT", "UPI", "Cheque", "Cash", "RTGS"];
  const tog = onToggleField;
  return (
    <div style={{ fontFamily: config.fontFamily + ", sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ background: config.headerColor }}>
        <div className="flex items-center gap-3">
          {f.company_logo?.visible && (
            config.logoUrl
              ? <img src={config.logoUrl} alt="logo" className="w-12 h-12 object-contain rounded bg-white/10 p-0.5" />
              : <div className="w-12 h-12 rounded border-2 border-dashed border-white/40 flex items-center justify-center text-white/50 text-xs">Logo</div>
          )}
        </div>
        <div className="text-right">
          <FieldOverlay id="company_name" visible={!!f.company_name?.visible} onToggle={tog}>
            {f.company_name?.visible && <p className="font-bold text-white text-sm">{SAMPLE.company}</p>}
          </FieldOverlay>
          <FieldOverlay id="gstin" visible={!!f.gstin?.visible} onToggle={tog}>
            <p className="text-white/70 text-xs mt-0.5">
              {f.gstin?.visible && `GSTIN: ${SAMPLE.gstin} | `}{SAMPLE.address}
            </p>
          </FieldOverlay>
        </div>
      </div>

      {/* Doc title bar */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: config.accentColor }}>
        <div className="text-white font-extrabold text-sm tracking-wide">
          {config.documentTitle.split(" ").map((w, i) => <span key={i} className="block leading-tight">{w}</span>)}
        </div>
        <div className="text-right text-xs text-white/90">
          <FieldOverlay id="doc_number" visible={!!f.doc_number?.visible} onToggle={tog}>
            {f.doc_number?.visible && <p>Receipt No: <strong>{SAMPLE.docNo}</strong></p>}
          </FieldOverlay>
          <FieldOverlay id="doc_date" visible={!!f.doc_date?.visible} onToggle={tog}>
            {f.doc_date?.visible && <p>Date: {SAMPLE.docDate}</p>}
          </FieldOverlay>
        </div>
      </div>

      {/* Two-column info */}
      <div className="flex border-b border-gray-200">
        <FieldOverlay id="received_from" visible={!!f.received_from?.visible} onToggle={tog}>
          <div className="flex-1 p-4 border-r border-gray-200">
            {f.received_from?.visible && (
              <>
                <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-2">RECEIVED FROM</p>
                <p className="font-bold text-gray-800 text-sm">{SAMPLE.customer}</p>
                {f.customer_gstin?.visible && <p className="text-xs text-gray-500 mt-0.5">GSTIN: {SAMPLE.custGstin}</p>}
                {f.customer_address?.visible && <p className="text-xs text-gray-500">{SAMPLE.custAddress}</p>}
              </>
            )}
          </div>
        </FieldOverlay>
        <div className="flex-1 p-4">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-2">PAYMENT DETAILS</p>
          <p className="font-bold text-gray-800 text-sm">NEFT Transfer</p>
          {f.utr_number?.visible && <p className="text-xs text-gray-500 mt-0.5">UTR: {SAMPLE.utr}</p>}
          {f.bank_name?.visible && <p className="text-xs text-gray-500">{SAMPLE.bankName}</p>}
        </div>
      </div>

      {/* Payment mode chips */}
      {f.payment_mode?.visible && (
        <div className="px-4 py-3 flex flex-wrap gap-1.5 border-b border-gray-100">
          {modes.map((m) => (
            <span key={m} className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={config.activePaymentModes.includes(m)
                ? { background: config.accentColor, color: "#fff" }
                : { background: "#f3f4f6", color: "#374151" }}>
              {m}
            </span>
          ))}
        </div>
      )}

      {/* Against invoices */}
      {f.against_invoices?.visible && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs text-gray-600">
          Against invoices: <span className="font-semibold text-gray-800">{SAMPLE.invoices}</span>
        </div>
      )}

      {/* Amounts */}
      <div className="px-4 py-3 space-y-1.5">
        {f.gross_amount?.visible && (
          <div className="flex justify-between text-sm text-gray-700">
            <span>Invoice total</span><span className="font-medium">{fmt(SAMPLE.gross)}</span>
          </div>
        )}
        {f.tds_deducted?.visible && (
          <div className="flex justify-between text-sm text-red-500">
            <span>Less: TDS deducted (7%)</span><span>- {fmt(SAMPLE.tds)}</span>
          </div>
        )}
        {f.discount?.visible && (
          <div className="flex justify-between text-sm text-red-500">
            <span>Less: Settlement discount</span><span>- {fmt(SAMPLE.discount)}</span>
          </div>
        )}
        <div className="h-px bg-gray-200 my-2" />
        {f.net_amount?.visible && (
          <div className="flex justify-between font-extrabold text-sm">
            <span>Net amount received</span><span>{fmt(SAMPLE.net)}</span>
          </div>
        )}
      </div>

      {/* Amount in words */}
      {f.amount_words?.visible && (
        <div className="mx-4 mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
          <strong>Rupees:</strong> {amountWords(SAMPLE.net)} Only
        </div>
      )}

      {/* Footer */}
      {(f.signature?.visible || f.stamp?.visible) && (
        <div className="flex justify-end gap-6 px-5 pt-3 pb-5">
          {f.signature?.visible && (
            <div className="text-center">
              {config.signatureUrl
                ? <img src={config.signatureUrl} alt="sig" className="h-10 mb-1 mx-auto object-contain" />
                : <div className="h-10 w-28 border-b-2 border-gray-300 mb-1" />}
              <p className="text-[10px] text-gray-400">Authorised Signature</p>
            </div>
          )}
          {f.stamp?.visible && (
            <div className="text-center">
              {config.stampUrl
                ? <img src={config.stampUrl} alt="stamp" className="h-12 w-12 mx-auto mb-1 object-contain" />
                : <div className="h-12 w-12 rounded-full border-2 border-dashed border-gray-300 mx-auto mb-1 flex items-center justify-center text-[9px] text-gray-400 text-center">Company<br />Seal</div>}
              <p className="text-[10px] text-gray-400">Company Stamp</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Invoice Preview ───────────────────────────────────────────────────────────
function InvoicePreview({ config, onToggleField }: Props) {
  const f = config.fields;
  const subtotal = INVOICE_ITEMS.reduce((s, r) => s + r.taxable, 0);
  const totalTax = INVOICE_ITEMS.reduce((s, r) => s + r.cgst + r.sgst, 0);
  const total = subtotal + totalTax;

  // Configurable columns — track which are shown
  const cols = [
    { id: "sr",     label: "#",      show: true },
    { id: "desc",   label: "Description / HSN", show: true },
    { id: "qty",    label: "Qty",    show: true },
    { id: "rate",   label: "Rate",   show: true },
    { id: "taxable",label: "Taxable", show: f.sgst?.visible },
    { id: "cgst",   label: "CGST",   show: f.cgst?.visible },
    { id: "sgst",   label: "SGST",   show: f.sgst?.visible },
    { id: "total",  label: "Total",  show: true },
  ].filter(c => c.show);

  return (
    <div style={{ fontFamily: config.fontFamily + ", sans-serif" }}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-5" style={{ background: config.headerColor }}>
        <div>
          {config.logoUrl
            ? <img src={config.logoUrl} alt="logo" className="h-12 object-contain mb-2" />
            : <div className="h-12 w-24 rounded border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-xs mb-2">Logo</div>}
          <p className="text-white font-bold text-sm">{SAMPLE.company}</p>
          <p className="text-white/60 text-xs">{SAMPLE.address}</p>
          <p className="text-white/60 text-xs">GSTIN: {SAMPLE.gstin}</p>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-[10px] font-semibold tracking-widest mb-1">{config.documentTitle}</p>
          <p className="text-white font-bold text-base">INV/2026/0089</p>
          <p className="text-white/70 text-xs mt-1">Date: {SAMPLE.docDate}</p>
          <p className="text-white/70 text-xs">Due: 29 Jul 2026</p>
        </div>
      </div>

      {/* Bill to */}
      <div className="flex border-b border-gray-100">
        <div className="flex-1 p-4">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-1.5">BILL TO</p>
          <p className="font-bold text-gray-800 text-sm">{SAMPLE.customer}</p>
          <p className="text-xs text-gray-500">GSTIN: {SAMPLE.custGstin}</p>
          <p className="text-xs text-gray-500">{SAMPLE.custAddress}</p>
        </div>
        <div className="flex-1 p-4 border-l border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-1.5">SHIP TO</p>
          <p className="text-xs text-gray-700">{SAMPLE.customer}</p>
          <p className="text-xs text-gray-500">{SAMPLE.custAddress}</p>
        </div>
      </div>

      {/* Line items */}
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: config.accentColor + "22" }}>
            {cols.map(c => (
              <th key={c.id} className={`py-2 px-3 font-semibold text-gray-500 ${c.id === "desc" ? "text-left" : "text-right"}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {INVOICE_ITEMS.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {cols.map(c => (
                <td key={c.id} className={`px-3 py-2 ${c.id === "desc" ? "text-left" : "text-right"}`}>
                  {c.id === "sr" && <span className="text-gray-400">{i + 1}</span>}
                  {c.id === "desc" && (
                    <div>
                      <p className="font-medium text-gray-700">{row.desc}</p>
                      <p className="text-[10px] text-gray-400">HSN: {row.hsn}</p>
                    </div>
                  )}
                  {c.id === "qty" && <span className="text-gray-600">{row.qty} {row.unit}</span>}
                  {c.id === "rate" && <span className="text-gray-600">{fmt(row.rate)}</span>}
                  {c.id === "taxable" && <span className="text-gray-600">{fmt(row.taxable)}</span>}
                  {c.id === "cgst" && <span className="text-gray-500">{fmt(row.cgst)}</span>}
                  {c.id === "sgst" && <span className="text-gray-500">{fmt(row.sgst)}</span>}
                  {c.id === "total" && <span className="font-semibold text-gray-800">{fmt(row.total)}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex border-t border-gray-200">
        <div className="flex-1 p-4">
          {f.amount_words?.visible && (
            <p className="text-xs text-gray-500"><strong>Amount in words:</strong> {amountWords(total)} Only</p>
          )}
        </div>
        <div className="w-44 p-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          {f.cgst?.visible && <div className="flex justify-between text-gray-500"><span>CGST</span><span>{fmt(INVOICE_ITEMS.reduce((s,r)=>s+r.cgst,0))}</span></div>}
          {f.sgst?.visible && <div className="flex justify-between text-gray-500"><span>SGST</span><span>{fmt(INVOICE_ITEMS.reduce((s,r)=>s+r.sgst,0))}</span></div>}
          <div className="h-px bg-gray-200" />
          <div className="flex justify-between font-extrabold text-sm"><span>Total</span><span>{fmt(total)}</span></div>
        </div>
      </div>

      {/* Footer */}
      {(f.signature?.visible || f.stamp?.visible) && (
        <div className="flex justify-end gap-6 px-5 pt-2 pb-4 border-t border-gray-100">
          {f.signature?.visible && (
            <div className="text-center">
              {config.signatureUrl ? <img src={config.signatureUrl} alt="sig" className="h-9 mb-1 mx-auto object-contain" /> : <div className="h-9 w-28 border-b-2 border-gray-300 mb-1" />}
              <p className="text-[10px] text-gray-400">Authorised Signature</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Generic Preview ─────────────────────────────────────────────────────────────
function GenericPreview({ config }: Props) {
  const f = config.fields;
  const LABELS: Record<string, string> = {
    quotation: "QUOTATION",
    po: "PURCHASE ORDER",
    delivery_note: "DELIVERY NOTE",
    credit_note: "CREDIT NOTE",
    debit_note: "DEBIT NOTE",
    bill_of_supply: "BILL OF SUPPLY",
    eway_bill: "E-WAY BILL",
    expense: "EXPENSE CLAIM",
  };
  const fromLabel = config.documentType === "po" ? "VENDOR" : "TO";
  return (
    <div style={{ fontFamily: config.fontFamily + ", sans-serif" }}>
      <div className="flex items-start justify-between px-5 py-5" style={{ background: config.headerColor }}>
        <div>
          {config.logoUrl ? <img src={config.logoUrl} alt="logo" className="h-10 object-contain mb-2" />
            : <div className="h-10 w-20 rounded border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-xs mb-2">Logo</div>}
          <p className="text-white font-bold text-sm">{SAMPLE.company}</p>
          <p className="text-white/60 text-xs">GSTIN: {SAMPLE.gstin}</p>
          <p className="text-white/60 text-xs">{SAMPLE.address}</p>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-[10px] font-semibold tracking-widest mb-1">{config.documentTitle}</p>
          <p className="text-white font-bold">DOC/2026/0001</p>
          <p className="text-white/70 text-xs">{SAMPLE.docDate}</p>
        </div>
      </div>
      <div className="p-4 border-b border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-1">{fromLabel}</p>
        <p className="font-bold text-gray-800 text-sm">{SAMPLE.customer}</p>
        <p className="text-xs text-gray-500">{SAMPLE.custAddress}</p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: config.accentColor + "22" }}>
            <th className="text-left px-4 py-2 text-gray-500">#</th>
            <th className="text-left px-4 py-2 text-gray-500">Description</th>
            <th className="text-right px-4 py-2 text-gray-500">Qty</th>
            <th className="text-right px-4 py-2 text-gray-500">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="px-4 py-2 text-gray-400">1</td>
            <td className="px-4 py-2 text-gray-700 font-medium">Sample line item</td>
            <td className="px-4 py-2 text-right text-gray-600">1</td>
            <td className="px-4 py-2 text-right font-semibold">₹0.00</td>
          </tr>
        </tbody>
      </table>
      <div className="flex justify-end px-4 py-3 border-t border-gray-200">
        <div className="w-40 space-y-1 text-sm">
          <div className="flex justify-between font-extrabold"><span>Total</span><span>₹0.00</span></div>
        </div>
      </div>
      {f.signature?.visible && (
        <div className="flex justify-end px-5 pb-4">
          <div className="text-center">
            {config.signatureUrl ? <img src={config.signatureUrl} alt="sig" className="h-9 mb-1 mx-auto object-contain" /> : <div className="h-9 w-28 border-b-2 border-gray-300 mb-1" />}
            <p className="text-[10px] text-gray-400">Authorised Signature</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Template Gallery Modal ─────────────────────────────────────────────────────
const GALLERY_TEMPLATES = [
  { id: 1, name: "Classic Blue",    headerColor: "#1a2a4a", accentColor: "#1d6ae5", icon: "🏢" },
  { id: 2, name: "Forest Green",    headerColor: "#1a3d2b", accentColor: "#16a34a", icon: "🌿" },
  { id: 3, name: "Royal Purple",    headerColor: "#3b1a6b", accentColor: "#7c3aed", icon: "👑" },
  { id: 4, name: "Crimson Red",     headerColor: "#7c1d1d", accentColor: "#dc2626", icon: "🔴" },
  { id: 5, name: "Ocean Teal",      headerColor: "#0f4c5c", accentColor: "#0891b2", icon: "🌊" },
  { id: 6, name: "Sunset Orange",   headerColor: "#7c2d12", accentColor: "#ea580c", icon: "🌅" },
  { id: 7, name: "Slate Corporate", headerColor: "#1e293b", accentColor: "#475569", icon: "🏛" },
  { id: 8, name: "Golden Amber",    headerColor: "#78350f", accentColor: "#d97706", icon: "✨" },
];

export function TemplateGallery({ onApply, onClose }: { onApply: (t: typeof GALLERY_TEMPLATES[0]) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-3xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">Template Gallery</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choose a pre-built template to get started</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-xl font-bold">×</button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {GALLERY_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => { onApply(t); onClose(); }}
              className="group rounded-xl border border-gray-200 overflow-hidden hover:border-violet-400 hover:shadow-md transition-all text-left"
            >
              <div className="h-16 flex items-end px-3 pb-2" style={{ background: `linear-gradient(135deg, ${t.headerColor}, ${t.accentColor})` }}>
                <span className="text-2xl">{t.icon}</span>
              </div>
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-gray-700 group-hover:text-violet-700 truncate">{t.name}</p>
                <div className="flex gap-1 mt-1">
                  <span className="w-4 h-1.5 rounded-full" style={{ background: t.headerColor }} />
                  <span className="w-4 h-1.5 rounded-full" style={{ background: t.accentColor }} />
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">All templates support all 12 document types</p>
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────
export function DocumentPreview({ config, onToggleField }: Props) {
  const fmt_ = FORMAT_SIZES[config.printFormat] ?? FORMAT_SIZES.a4;
  const isThermal = fmt_.thermal;
  const scale = isThermal ? 1 : Math.min(1, 520 / fmt_.width);

  const PreviewComponent =
    isThermal ? ThermalReceiptPreview :
    (config.documentType === "receipt") ? ReceiptPreview :
    (["invoice", "gst_invoice", "proforma"].includes(config.documentType)) ? InvoicePreview :
    GenericPreview;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-medium">{fmt_.label}</span>
        {isThermal && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            Thermal Roll
          </span>
        )}
      </div>

      <div
        className="relative bg-white shadow-2xl overflow-hidden"
        style={{
          width: fmt_.width * scale,
          borderRadius: isThermal ? 4 : 12,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          border: isThermal ? "1px solid #e5e7eb" : undefined,
        }}
      >
        {/* Watermark */}
        {config.watermark && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center" style={{ transform: "rotate(-30deg)" }}>
            <span className="font-black select-none" style={{ fontSize: fmt_.width * 0.18, color: "#00000008", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
              {config.watermarkText || "DRAFT"}
            </span>
          </div>
        )}

        <PreviewComponent config={config} onToggleField={onToggleField} />

        {/* Thermal tear-line */}
        {isThermal && (
          <div className="flex items-center gap-1 px-2 py-2 bg-gray-50">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className="flex-1 h-px border-t border-dashed border-gray-300" />
            ))}
          </div>
        )}
      </div>

      {/* QR placeholder */}
      {config.fields.qr_code?.visible && !isThermal && (
        <div className="flex flex-col items-center gap-1 mt-1">
          <div className="w-16 h-16 grid grid-cols-4 gap-0.5 p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="rounded-[1px]" style={{ background: [0,1,4,5,2,7,8,11,3,6,9,10,12,14,13,15].indexOf(i)<10?"#1a1a2e":"#f0f0f0" }} />
            ))}
          </div>
          <span className="text-[10px] text-gray-400">QR code</span>
        </div>
      )}
    </div>
  );
}
