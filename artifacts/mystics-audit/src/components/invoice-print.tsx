import type { DocSettings } from "./doc-customizer";

/* ── Data types ─────────────────────────────────────── */
export interface PrintInvoiceLine {
  id?: number;
  description: string;
  hsnSac?: string | null;
  quantity: number;
  unit?: string | null;
  rate: number;
  discountPct?: number | null;
  gstRate: number;
  taxableValue?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  lineTotal?: number;
}

export interface PrintInvoiceData {
  invoiceNo: string;
  type: string;
  date: string;
  dueDate?: string | null;
  customerName: string;
  customerGstin?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  placeOfSupply?: string | null;
  poReference?: string | null;
  notes?: string | null;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  paidAmount?: number;
  balanceDue?: number;
  status: string;
  lines: PrintInvoiceLine[];
}

export interface PrintCompanyData {
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string | null;
}

const COMPANY: PrintCompanyData = {
  name: "Automystics Technologies Pvt. Ltd.",
  gstin: "33ABFCA6057N1ZE",
  address: "No. 45, Anna Salai, Chennai, Tamil Nadu – 600 002",
  phone: "+91 44 4567 8900",
  email: "accounts@automystics.com",
  website: "www.automystics.com",
  logoUrl: null,
};

function toWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (num === 0) return "Zero";
  const n = Math.round(num);
  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };
  const paise = Math.round((num - n) * 100);
  return "Rupees " + convert(n) + (paise ? ` and ${convert(paise)} Paise` : "") + " Only";
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function fmtAmt(n: number | undefined | null) {
  if (n == null) return "₹0.00";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
}

function calcLine(l: PrintInvoiceLine) {
  const taxable = l.taxableValue ?? (l.quantity * l.rate * (1 - (l.discountPct || 0) / 100));
  const gstAmt = taxable * l.gstRate / 100;
  const cgst = l.cgst ?? gstAmt / 2;
  const sgst = l.sgst ?? gstAmt / 2;
  const igst = l.igst ?? 0;
  const total = l.lineTotal ?? taxable + gstAmt;
  return { taxable, cgst, sgst, igst, total };
}

/* ── Component ──────────────────────────────────────── */
interface Props {
  invoice: PrintInvoiceData;
  settings: DocSettings;
  company?: PrintCompanyData;
}

export function InvoicePrint({ invoice, settings, company = COMPANY }: Props) {
  const isInterState = invoice.igst > 0;
  const typeLabel = invoice.type?.replace(/_/g, " ") || "TAX INVOICE";
  const isDraft = invoice.status === "DRAFT";

  /* group lines by GST rate for tax summary */
  const taxSummary = invoice.lines.reduce<Record<number, { taxable: number; cgst: number; sgst: number; igst: number }>>((acc, l) => {
    const c = calcLine(l);
    const r = l.gstRate;
    if (!acc[r]) acc[r] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    acc[r].taxable += c.taxable;
    acc[r].cgst += c.cgst;
    acc[r].sgst += c.sgst;
    acc[r].igst += c.igst;
    return acc;
  }, {});

  return (
    <div
      id="invoice-print-area"
      style={{
        fontFamily: settings.fontFamily + ", sans-serif",
        fontSize: "11px",
        color: "#1a1a1a",
        background: "#fff",
        width: settings.paperSize === "A5" ? "148mm" : "210mm",
        minHeight: settings.paperSize === "A5" ? "210mm" : "297mm",
        margin: "0 auto",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Watermark */}
      {(settings.showWatermark || isDraft) && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%) rotate(-35deg)",
          fontSize: "72px", fontWeight: 900,
          color: isDraft ? "rgba(220,38,38,0.08)" : "rgba(0,0,0,0.05)",
          pointerEvents: "none", userSelect: "none", zIndex: 0, letterSpacing: 8,
        }}>
          {isDraft ? "DRAFT" : settings.watermarkText}
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1, padding: "24px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: settings.headerColor, padding: "20px", borderRadius: "10px 10px 0 0", marginBottom: 0 }}>
          <div style={{ color: "white" }}>
            {settings.showLogo && (
              <div style={{ width: 56, height: 56, background: "rgba(255,255,255,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, overflow: "hidden" }}>
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt="Logo"
                    style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }}
                  />
                ) : (
                  <span style={{ fontSize: 24, fontWeight: 900, color: "white" }}>
                    {company.name?.charAt(0)?.toUpperCase() ?? "M"}
                  </span>
                )}
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 700 }}>{company.name}</div>
            {settings.showGstin && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>GSTIN: {company.gstin}</div>}
            {settings.showAddress && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2, maxWidth: 220 }}>{company.address}</div>}
            {settings.showPhone && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{company.phone} | {company.email}</div>}
          </div>
          <div style={{ textAlign: "right", color: "white" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: "rgba(255,255,255,0.6)", marginBottom: 4, textTransform: "uppercase" }}>{typeLabel}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{invoice.invoiceNo}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>Date: {fmtDate(invoice.date)}</div>
            {invoice.dueDate && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)" }}>Due: {fmtDate(invoice.dueDate)}</div>}
            <div style={{ marginTop: 8, padding: "4px 10px", borderRadius: 20, border: "1.5px solid rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700, color: "white", display: "inline-block" }}>
              {invoice.status}
            </div>
          </div>
        </div>

        {/* ── Bill To / Ship To ── */}
        <div style={{ display: "flex", gap: 12, background: "#f8f9ff", padding: "14px 20px", borderBottom: "2px solid " + settings.accentColor, marginBottom: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#888", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Bill To</div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#111" }}>{invoice.customerName}</div>
            {invoice.customerGstin && <div style={{ fontSize: 10, color: "#555", marginTop: 2, fontFamily: "monospace" }}>GSTIN: {invoice.customerGstin}</div>}
            {invoice.customerAddress && settings.showAddress && <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{invoice.customerAddress}</div>}
            {invoice.customerPhone && settings.showPhone && <div style={{ fontSize: 10, color: "#666", marginTop: 1 }}>{invoice.customerPhone}</div>}
          </div>
          <div style={{ borderLeft: "1px solid #e0e0e0", paddingLeft: 12, minWidth: 140 }}>
            {invoice.placeOfSupply && <div style={{ fontSize: 10, color: "#555" }}><span style={{ color: "#888", fontSize: 9 }}>Place of Supply: </span>{invoice.placeOfSupply}</div>}
            {settings.showPo && invoice.poReference && <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}><span style={{ color: "#888", fontSize: 9 }}>PO Ref: </span>{invoice.poReference}</div>}
          </div>
        </div>

        {/* ── Line Items ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
          <thead>
            <tr style={{ background: settings.accentColor + "18", borderBottom: "1.5px solid " + settings.accentColor + "44" }}>
              <th style={{ padding: "8px 8px 8px 20px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>#</th>
              <th style={{ padding: "8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Description</th>
              {settings.showHsn && <th style={{ padding: "8px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>HSN</th>}
              <th style={{ padding: "8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Qty</th>
              <th style={{ padding: "8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Rate</th>
              {settings.showDiscount && <th style={{ padding: "8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Disc%</th>}
              <th style={{ padding: "8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Taxable</th>
              <th style={{ padding: "8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>GST%</th>
              <th style={{ padding: "8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>{isInterState ? "IGST" : "CGST"}</th>
              {!isInterState && <th style={{ padding: "8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>SGST</th>}
              <th style={{ padding: "8px 20px 8px 8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, i) => {
              const c = calcLine(line);
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "7px 8px 7px 20px", color: "#888", fontSize: 10 }}>{i + 1}</td>
                  <td style={{ padding: "7px 8px", fontSize: 11 }}>
                    <div style={{ fontWeight: 600, color: "#222" }}>{line.description}</div>
                    {line.unit && <div style={{ fontSize: 9, color: "#888" }}>{line.unit}</div>}
                  </td>
                  {settings.showHsn && <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: "monospace", fontSize: 10, color: "#666" }}>{line.hsnSac || "—"}</td>}
                  <td style={{ padding: "7px 8px", textAlign: "right", fontSize: 11 }}>{line.quantity}</td>
                  <td style={{ padding: "7px 8px", textAlign: "right", fontSize: 11 }}>{fmtAmt(line.rate)}</td>
                  {settings.showDiscount && <td style={{ padding: "7px 8px", textAlign: "right", fontSize: 10, color: "#888" }}>{line.discountPct || 0}%</td>}
                  <td style={{ padding: "7px 8px", textAlign: "right", fontSize: 11 }}>{fmtAmt(c.taxable)}</td>
                  <td style={{ padding: "7px 8px", textAlign: "right", fontSize: 10, color: "#555" }}>{line.gstRate}%</td>
                  <td style={{ padding: "7px 8px", textAlign: "right", fontSize: 11 }}>{fmtAmt(isInterState ? c.igst : c.cgst)}</td>
                  {!isInterState && <td style={{ padding: "7px 8px", textAlign: "right", fontSize: 11 }}>{fmtAmt(c.sgst)}</td>}
                  <td style={{ padding: "7px 20px 7px 8px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#111" }}>{fmtAmt(c.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Totals + Tax Summary ── */}
        <div style={{ display: "flex", gap: 0, borderTop: "2px solid " + settings.accentColor + "44", marginBottom: 0 }}>
          {/* Tax breakdown */}
          <div style={{ flex: 1, padding: "12px 20px", borderRight: "1px solid #e8e8e8" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Tax Breakdown</div>
            <table style={{ width: "100%", fontSize: 10 }}>
              <thead>
                <tr style={{ color: "#888" }}>
                  <th style={{ textAlign: "left", paddingBottom: 4, fontWeight: 600 }}>GST Rate</th>
                  <th style={{ textAlign: "right", paddingBottom: 4, fontWeight: 600 }}>Taxable</th>
                  {isInterState ? <th style={{ textAlign: "right", paddingBottom: 4, fontWeight: 600 }}>IGST</th>
                    : <><th style={{ textAlign: "right", paddingBottom: 4, fontWeight: 600 }}>CGST</th><th style={{ textAlign: "right", paddingBottom: 4, fontWeight: 600 }}>SGST</th></>}
                </tr>
              </thead>
              <tbody>
                {Object.entries(taxSummary).map(([rate, t]) => (
                  <tr key={rate}>
                    <td style={{ paddingBottom: 2 }}>{rate}%</td>
                    <td style={{ textAlign: "right", paddingBottom: 2 }}>{fmtAmt(t.taxable)}</td>
                    {isInterState ? <td style={{ textAlign: "right" }}>{fmtAmt(t.igst)}</td>
                      : <><td style={{ textAlign: "right" }}>{fmtAmt(t.cgst)}</td><td style={{ textAlign: "right" }}>{fmtAmt(t.sgst)}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Amount summary */}
          <div style={{ width: 200, padding: "12px 20px 12px 16px" }}>
            {[
              { label: "Taxable Amount", val: invoice.taxableAmount },
              ...(isInterState ? [{ label: "IGST", val: invoice.igst }] : [{ label: "CGST", val: invoice.cgst }, { label: "SGST", val: invoice.sgst }]),
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, color: "#555" }}>
                <span>{row.label}</span><span>{fmtAmt(row.val)}</span>
              </div>
            ))}
            <div style={{ borderTop: "1.5px solid " + settings.accentColor, paddingTop: 6, marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: "#111" }}>
              <span>Total</span><span>{fmtAmt(invoice.totalAmount)}</span>
            </div>
            {(invoice.paidAmount ?? 0) > 0 && <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#059669", marginTop: 4 }}>
                <span>Paid</span><span>{fmtAmt(invoice.paidAmount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#dc2626", marginTop: 2 }}>
                <span>Balance Due</span><span>{fmtAmt(invoice.balanceDue)}</span>
              </div>
            </>}
          </div>
        </div>

        {/* Amount in words */}
        {settings.showAmountWords && (
          <div style={{ background: settings.accentColor + "0d", padding: "10px 20px", borderTop: "1px solid " + settings.accentColor + "22" }}>
            <span style={{ fontSize: 9, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Amount in Words: </span>
            <span style={{ fontSize: 10, fontStyle: "italic", color: "#333" }}>{toWords(invoice.totalAmount)}</span>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ display: "flex", gap: 16, padding: "14px 20px", borderTop: "1px solid #eee", marginTop: 0 }}>
          {settings.showBankDetails && settings.bankDetails && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Bank Details</div>
              <div style={{ fontSize: 10, color: "#444", whiteSpace: "pre-line" }}>{settings.bankDetails}</div>
            </div>
          )}
          {settings.showTerms && settings.termsText && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Terms & Conditions</div>
              <div style={{ fontSize: 9, color: "#555", whiteSpace: "pre-line", lineHeight: 1.5 }}>{settings.termsText}</div>
            </div>
          )}
          {settings.showNotes && invoice.notes && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 10, color: "#555" }}>{invoice.notes}</div>
            </div>
          )}
        </div>

        {/* Signature */}
        {settings.showSignature && (
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 20px 20px" }}>
            <div style={{ textAlign: "center", minWidth: 140 }}>
              <div style={{ height: 40, borderBottom: "1.5px solid #999", marginBottom: 4 }} />
              <div style={{ fontSize: 9, color: "#666", fontWeight: 600 }}>For {company.name}</div>
              <div style={{ fontSize: 9, color: "#888" }}>Authorised Signatory</div>
            </div>
          </div>
        )}

        {/* Footer strip */}
        <div style={{ background: settings.headerColor, padding: "8px 20px", borderRadius: "0 0 10px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)" }}>Computer Generated Invoice · No signature required</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>{invoice.invoiceNo}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Print trigger helper ───────────────────────────── */
export function printInvoice(invoiceNo?: string) {
  const el = document.getElementById("invoice-print-area");
  if (!el) { window.print(); return; }

  // The InvoicePrint component uses only inline styles, so no stylesheet copying needed.
  // Open a new window so this works even inside iframes (e.g. Replit preview pane).
  const win = window.open("", "_blank", "width=960,height=720");
  if (!win) { window.print(); return; }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${invoiceNo ?? "Invoice"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: white; font-family: 'Segoe UI', Arial, sans-serif; }
    @media screen { body { padding: 20px; } }
    @media print {
      body { padding: 0; }
      @page { margin: 0; }
    }
  </style>
</head>
<body>
${el.outerHTML}
<script>
  setTimeout(function () { window.print(); }, 400);
<\/script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}
