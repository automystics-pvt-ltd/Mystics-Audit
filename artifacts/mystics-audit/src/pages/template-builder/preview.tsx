import type { TemplateConfig } from "./index";

interface Props {
  config: TemplateConfig;
}

const FORMAT_SIZES: Record<string, { width: number; label: string }> = {
  a4:         { width: 595, label: "A4 (210×297mm)" },
  a5:         { width: 420, label: "A5 (148×210mm)" },
  thermal80:  { width: 226, label: "80mm Thermal" },
  thermal57:  { width: 161, label: "57mm Thermal" },
  custom:     { width: 500, label: "Custom" },
};

function amountWords(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n === 0) return "Zero";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + amountWords(n % 100) : "");
  if (n < 100000) return amountWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + amountWords(n % 1000) : "");
  return amountWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + amountWords(n % 100000) : "");
}

function fmt(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const SAMPLE = {
  company: "Automystics Technologies Pvt. Ltd.",
  gstin: "33ABFCA6057N1ZE",
  address: "Dindigul, Tamil Nadu",
  docNo: "RCP/2026/0042",
  docDate: "29 Jun 2026",
  customer: "Rajan Textiles Pvt. Ltd.",
  custGstin: "33AABCR1234A1Z5",
  custAddress: "Chennai, Tamil Nadu",
  paymentDetail: "NEFT Transfer",
  utr: "HDFCA2026062912345",
  bankName: "HDFC Bank, Coimbatore",
  invoices: "INV/2026/0089 (₹45,000), INV/2026/0091 (₹23,600)",
  gross: 68600,
  tds: 4500,
  discount: 600,
  net: 63500,
};

// ── Receipt Preview ────────────────────────────────────────────────────────────
function ReceiptPreview({ config }: Props) {
  const f = config.fields;
  const tdsLabel = f.tds_deducted?.visible ? `TDS deducted (${Math.round(SAMPLE.tds / SAMPLE.gross * 100)}%)` : "";
  const modes = ["NEFT", "UPI", "Cheque", "Cash", "RTGS"];

  return (
    <div style={{ fontFamily: config.fontFamily + ", sans-serif" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ background: config.headerColor }}
      >
        <div className="flex items-center gap-3">
          {f.company_logo?.visible && (
            config.logoUrl ? (
              <img src={config.logoUrl} alt="logo" className="w-12 h-12 object-contain rounded bg-white/10 p-0.5" />
            ) : (
              <div className="w-12 h-12 rounded border-2 border-dashed border-white/40 flex items-center justify-center text-white/50 text-xs">
                Logo
              </div>
            )
          )}
        </div>
        <div className="text-right">
          {f.company_name?.visible && (
            <p className="font-bold text-white text-sm leading-tight">{SAMPLE.company}</p>
          )}
          <p className="text-white/70 text-xs mt-0.5">
            {f.gstin?.visible && `GSTIN: ${SAMPLE.gstin}`}
            {f.gstin?.visible && f.company_name?.visible && " | "}
            {SAMPLE.address}
          </p>
        </div>
      </div>

      {/* Doc title bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: config.accentColor }}
      >
        <div className="text-white font-extrabold text-sm tracking-wide leading-tight">
          {config.documentTitle.split(" ").map((w, i) => (
            <span key={i} className="block leading-tight">{w}</span>
          ))}
        </div>
        <div className="text-right text-xs text-white/90">
          {f.doc_number?.visible && <p>Receipt No: <strong>{SAMPLE.docNo}</strong></p>}
          {f.doc_date?.visible && <p>Date: {SAMPLE.docDate}</p>}
        </div>
      </div>

      {/* Two-column info */}
      <div className="flex border-b border-gray-200">
        {f.received_from?.visible && (
          <div className="flex-1 p-4 border-r border-gray-200">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-2">RECEIVED FROM</p>
            <p className="font-bold text-gray-800 text-sm">{SAMPLE.customer}</p>
            {f.customer_gstin?.visible && <p className="text-xs text-gray-500 mt-0.5">GSTIN: {SAMPLE.custGstin}</p>}
            {f.customer_address?.visible && <p className="text-xs text-gray-500">{SAMPLE.custAddress}</p>}
          </div>
        )}
        <div className="flex-1 p-4">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-2">PAYMENT DETAILS</p>
          <p className="font-bold text-gray-800 text-sm">{SAMPLE.paymentDetail}</p>
          {f.utr_number?.visible && <p className="text-xs text-gray-500 mt-0.5">UTR: {SAMPLE.utr}</p>}
          {f.bank_name?.visible && <p className="text-xs text-gray-500">{SAMPLE.bankName}</p>}
        </div>
      </div>

      {/* Payment mode chips */}
      {f.payment_mode?.visible && (
        <div className="px-4 py-3 flex flex-wrap gap-1.5 border-b border-gray-100">
          {modes.map((m) => {
            const active = config.activePaymentModes.includes(m);
            return (
              <span
                key={m}
                className="text-xs px-2.5 py-1 rounded-full font-semibold transition-colors"
                style={
                  active
                    ? { background: config.accentColor, color: "#fff" }
                    : { background: "#f3f4f6", color: "#374151" }
                }
              >
                {m}
              </span>
            );
          })}
        </div>
      )}

      {/* Against invoices */}
      {f.against_invoices?.visible && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs text-gray-600">
          Against invoices:{" "}
          <span className="font-semibold text-gray-800">{SAMPLE.invoices}</span>
        </div>
      )}

      {/* Amount breakdown */}
      <div className="px-4 py-3 space-y-1.5">
        {f.gross_amount?.visible && (
          <div className="flex justify-between text-sm text-gray-700">
            <span>Invoice total</span>
            <span className="font-medium">{fmt(SAMPLE.gross)}</span>
          </div>
        )}
        {f.tds_deducted?.visible && (
          <div className="flex justify-between text-sm" style={{ color: "#ef4444" }}>
            <span>{tdsLabel || "TDS deducted"}</span>
            <span>- {fmt(SAMPLE.tds)}</span>
          </div>
        )}
        {f.discount?.visible && (
          <div className="flex justify-between text-sm" style={{ color: "#ef4444" }}>
            <span>Less: Settlement discount</span>
            <span>- {fmt(SAMPLE.discount)}</span>
          </div>
        )}
        <div className="h-px bg-gray-200 my-2" />
        {f.net_amount?.visible && (
          <div className="flex justify-between font-extrabold text-sm">
            <span>Net amount received</span>
            <span>{fmt(SAMPLE.net)}</span>
          </div>
        )}
      </div>

      {/* Amount in words */}
      {f.amount_words?.visible && (
        <div className="mx-4 mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
          <strong>Rupees:</strong>{" "}
          {amountWords(SAMPLE.net)} Only
        </div>
      )}

      {/* Footer: signature + stamp */}
      {(f.signature?.visible || f.stamp?.visible) && (
        <div className="flex justify-end gap-6 px-5 pt-3 pb-5">
          {f.signature?.visible && (
            <div className="text-center">
              {config.signatureUrl ? (
                <img src={config.signatureUrl} alt="sig" className="h-10 mb-1 mx-auto object-contain" />
              ) : (
                <div className="h-10 w-28 border-b-2 border-gray-300 mb-1" />
              )}
              <p className="text-[10px] text-gray-400">Authorised Signature</p>
            </div>
          )}
          {f.stamp?.visible && (
            <div className="text-center">
              {config.stampUrl ? (
                <img src={config.stampUrl} alt="stamp" className="h-12 w-12 mx-auto mb-1 object-contain" />
              ) : (
                <div className="h-12 w-12 rounded-full border-2 border-dashed border-gray-300 mx-auto mb-1 flex items-center justify-center text-[9px] text-gray-400 text-center leading-tight">
                  Company<br />Seal
                </div>
              )}
              <p className="text-[10px] text-gray-400">Company Stamp</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Invoice Preview ─────────────────────────────────────────────────────────────
function InvoicePreview({ config }: Props) {
  return (
    <div style={{ fontFamily: config.fontFamily + ", sans-serif" }}>
      <div className="flex items-start justify-between px-5 py-5" style={{ background: config.headerColor }}>
        <div>
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="logo" className="h-12 object-contain mb-2" />
          ) : (
            <div className="h-12 w-24 rounded border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-xs mb-2">Logo</div>
          )}
          <p className="text-white font-bold text-sm">{SAMPLE.company}</p>
          <p className="text-white/60 text-xs">{SAMPLE.address}</p>
          <p className="text-white/60 text-xs">GSTIN: {SAMPLE.gstin}</p>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-xs font-semibold tracking-widest mb-1">TAX INVOICE</p>
          <p className="text-white font-bold text-base">INV/2026/0089</p>
          <p className="text-white/70 text-xs mt-1">Date: {SAMPLE.docDate}</p>
          <p className="text-white/70 text-xs">Due: 29 Jul 2026</p>
        </div>
      </div>

      <div className="flex border-b border-gray-100">
        <div className="flex-1 p-4">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-1.5">BILL TO</p>
          <p className="font-bold text-gray-800 text-sm">{SAMPLE.customer}</p>
          <p className="text-xs text-gray-500 mt-0.5">GSTIN: {SAMPLE.custGstin}</p>
          <p className="text-xs text-gray-500">{SAMPLE.custAddress}</p>
        </div>
        <div className="flex-1 p-4">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-1.5">SHIP TO</p>
          <p className="text-xs text-gray-500">{SAMPLE.customer}</p>
          <p className="text-xs text-gray-500">{SAMPLE.custAddress}</p>
        </div>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: config.accentColor + "18" }}>
            <th className="text-left px-4 py-2 font-semibold text-gray-500">#</th>
            <th className="text-left px-4 py-2 font-semibold text-gray-500">Description</th>
            <th className="text-right px-4 py-2 font-semibold text-gray-500">Qty</th>
            <th className="text-right px-4 py-2 font-semibold text-gray-500">Rate</th>
            <th className="text-right px-4 py-2 font-semibold text-gray-500">Tax</th>
            <th className="text-right px-4 py-2 font-semibold text-gray-500">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {[
            ["Software licence – Std", "12", "₹3,750", "18%", "₹45,000"],
            ["Implementation support", "1", "₹23,600", "18%", "₹23,600"],
          ].map(([desc, qty, rate, tax, amt], i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-gray-400">{i + 1}</td>
              <td className="px-4 py-2 text-gray-700 font-medium">{desc}</td>
              <td className="px-4 py-2 text-right text-gray-600">{qty}</td>
              <td className="px-4 py-2 text-right text-gray-600">{rate}</td>
              <td className="px-4 py-2 text-right text-gray-500">{tax}</td>
              <td className="px-4 py-2 text-right font-semibold text-gray-800">{amt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end px-4 py-4 border-t border-gray-200">
        <div className="w-48 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹68,600</span></div>
          <div className="flex justify-between text-gray-500"><span>CGST 9%</span><span>₹6,174</span></div>
          <div className="flex justify-between text-gray-500"><span>SGST 9%</span><span>₹6,174</span></div>
          <div className="h-px bg-gray-200" />
          <div className="flex justify-between font-extrabold"><span>Total</span><span>₹80,948</span></div>
        </div>
      </div>

      <div className="mx-4 mb-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
        <strong>Rupees:</strong> Eighty Thousand Nine Hundred Forty Eight Only
      </div>
    </div>
  );
}

// ── Generic / Other doc types preview ─────────────────────────────────────────
function GenericPreview({ config }: Props) {
  return (
    <div style={{ fontFamily: config.fontFamily + ", sans-serif" }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ background: config.headerColor }}>
        <div className="flex items-center gap-3">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="logo" className="h-10 object-contain" />
          ) : (
            <div className="h-10 w-20 rounded border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-xs">Logo</div>
          )}
          <div>
            <p className="text-white font-bold text-sm">{SAMPLE.company}</p>
            <p className="text-white/60 text-xs">GSTIN: {SAMPLE.gstin}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-[10px] font-semibold tracking-widest">{config.documentTitle}</p>
          <p className="text-white font-bold">{SAMPLE.docNo.replace("RCP", "DOC")}</p>
          <p className="text-white/70 text-xs">{SAMPLE.docDate}</p>
        </div>
      </div>

      <div className="flex border-b border-gray-100">
        <div className="flex-1 p-4">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-1.5">TO</p>
          <p className="font-bold text-gray-800 text-sm">{SAMPLE.customer}</p>
          <p className="text-xs text-gray-500">{SAMPLE.custAddress}</p>
        </div>
      </div>

      <div className="p-4">
        <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr style={{ background: config.accentColor + "22" }}>
              <th className="text-left px-3 py-2 font-semibold text-gray-500">Description</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500">Qty</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-3 py-2 text-gray-700">Item description here</td><td className="px-3 py-2 text-right text-gray-600">1</td><td className="px-3 py-2 text-right font-semibold">₹0.00</td></tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end px-4 py-3 border-t border-gray-200">
        <div className="w-40 space-y-1.5 text-sm">
          <div className="flex justify-between font-extrabold"><span>Total</span><span>₹0.00</span></div>
        </div>
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────
export function DocumentPreview({ config }: Props) {
  const { width, label } = FORMAT_SIZES[config.printFormat] ?? FORMAT_SIZES.a4;
  const scale = Math.min(1, 520 / width);

  const PreviewComponent =
    config.documentType === "receipt" ? ReceiptPreview :
    config.documentType === "invoice" || config.documentType === "gst_invoice" || config.documentType === "proforma" ? InvoicePreview :
    GenericPreview;

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <div
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden origin-top"
        style={{ width: width * scale, transform: `scale(${scale})`, transformOrigin: "top center" }}
      >
        {/* Watermark */}
        {config.watermark && (
          <div
            className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center"
            style={{ transform: "rotate(-30deg)" }}
          >
            <span
              className="font-black select-none"
              style={{
                fontSize: width * 0.18,
                color: "#00000008",
                letterSpacing: "0.1em",
                whiteSpace: "nowrap",
              }}
            >
              {config.watermarkText || "DRAFT"}
            </span>
          </div>
        )}

        <PreviewComponent config={config} />
      </div>

      {/* QR code placeholder */}
      {config.fields.qr_code?.visible && (
        <div className="flex flex-col items-center gap-1 mt-1">
          <div className="w-16 h-16 grid grid-cols-4 gap-0.5 p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="rounded-[1px]" style={{ background: [0,1,4,5,2,7,8,11,3,6,9,10,12,14,13,15].indexOf(i) < 10 ? "#1a1a2e" : "#f0f0f0" }} />
            ))}
          </div>
          <span className="text-[10px] text-gray-400">QR code</span>
        </div>
      )}
    </div>
  );
}
