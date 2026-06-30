import { Router } from "express";
import { db, invoicesTable, vendorBillsTable } from "@workspace/db";
import { gte, lte, and, eq } from "drizzle-orm";

const router = Router();

function parsePeriod(period: string) {
  const parts = period.split("-");
  let y: string, m: string;
  if (parts.length === 2 && parts[0].length === 4) {
    // YYYY-MM format (sent by frontend)
    y = parts[0];
    m = parts[1].padStart(2, "0");
  } else {
    // Mon-YYYY format (legacy)
    const months: Record<string, string> = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
      Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    };
    m = months[parts[0]] || "01";
    y = parts[1] || new Date().getFullYear().toString();
  }
  const from = `${y}-${m}-01`;
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  const to = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

router.get("/gst/itc-ledger", async (req, res) => {
  try {
    const period = (req.query.period as string) || "May-2025";
    const { from, to } = parsePeriod(period);
    const bills = await db.select().from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.date, from), lte(vendorBillsTable.date, to)));

    const cgstAvailed = bills.reduce((s, b) => s + Number(b.cgst), 0);
    const sgstAvailed = bills.reduce((s, b) => s + Number(b.sgst), 0);
    const igstAvailed = bills.reduce((s, b) => s + Number(b.igst), 0);

    const entries = bills.map(b => ({
      date: b.date,
      vendorName: b.vendorName,
      vendorGstin: null,
      invoiceNo: b.vendorInvoiceNo || b.billNo,
      cgst: Number(b.cgst),
      sgst: Number(b.sgst),
      igst: Number(b.igst),
      totalGst: Number(b.cgst) + Number(b.sgst) + Number(b.igst),
      status: "available",
    }));

    res.json({
      period,
      entries,
      summary: {
        cgstAvailable: cgstAvailed,
        sgstAvailable: sgstAvailed,
        igstAvailable: igstAvailed,
        totalAvailable: cgstAvailed + sgstAvailed + igstAvailed,
      },
      openingBalance: { cgst: 18000, sgst: 18000, igst: 8000, total: 44000 },
      availed: { cgst: cgstAvailed, sgst: sgstAvailed, igst: igstAvailed, total: cgstAvailed + sgstAvailed + igstAvailed },
      reversed: { cgst: 0, sgst: 0, igst: 0, total: 0 },
      utilized: { cgst: 12000, sgst: 12000, igst: 5000, total: 29000 },
      closingBalance: {
        cgst: 18000 + cgstAvailed - 12000,
        sgst: 18000 + sgstAvailed - 12000,
        igst: 8000 + igstAvailed - 5000,
        total: 44000 + cgstAvailed + sgstAvailed + igstAvailed - 29000,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get ITC ledger" });
  }
});

router.get("/gst/gstr1", async (req, res) => {
  try {
    const period = (req.query.period as string) || "May-2025";
    const { from, to } = parsePeriod(period);
    const invoices = await db.select().from(invoicesTable)
      .where(and(gte(invoicesTable.date, from), lte(invoicesTable.date, to), eq(invoicesTable.status, "posted")));

    const b2b = invoices.filter(i => i.customerGstin);
    const b2c = invoices.filter(i => !i.customerGstin);

    const totalTaxableValue = invoices.reduce((s, i) => s + Number(i.taxableAmount), 0);
    const totalCgst = invoices.reduce((s, i) => s + Number(i.cgst), 0);
    const totalSgst = invoices.reduce((s, i) => s + Number(i.sgst), 0);
    const totalIgst = invoices.reduce((s, i) => s + Number(i.igst), 0);

    res.json({
      period,
      totalInvoices: invoices.length,
      b2bInvoices: b2b.map(i => ({
        customerName: i.customerName,
        customerGstin: i.customerGstin,
        invoiceNo: i.invoiceNo,
        taxableValue: Number(i.taxableAmount),
        cgst: Number(i.cgst),
        sgst: Number(i.sgst),
        igst: Number(i.igst),
        totalAmount: Number(i.totalAmount),
      })),
      b2cInvoices: b2c.map(i => ({
        customerName: i.customerName,
        invoiceNo: i.invoiceNo,
        taxableValue: Number(i.taxableAmount),
        cgst: Number(i.cgst),
        sgst: Number(i.sgst),
        igst: Number(i.igst),
        totalAmount: Number(i.totalAmount),
      })),
      b2bCount: b2b.length,
      b2cCount: b2c.length,
      b2bAmount: b2b.reduce((s, i) => s + Number(i.totalAmount), 0),
      b2cAmount: b2c.reduce((s, i) => s + Number(i.totalAmount), 0),
      exportAmount: 0,
      creditNoteAmount: invoices.filter(i => i.type === "Credit Note").reduce((s, i) => s + Number(i.totalAmount), 0),
      totalTaxableValue,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax: totalCgst + totalSgst + totalIgst,
      isFilingReady: invoices.length > 0,
      validationErrors: [],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get GSTR-1" });
  }
});

router.get("/gst/gstr3b", async (req, res) => {
  try {
    const period = (req.query.period as string) || "May-2025";
    const { from, to } = parsePeriod(period);

    const invoices = await db.select().from(invoicesTable)
      .where(and(gte(invoicesTable.date, from), lte(invoicesTable.date, to), eq(invoicesTable.status, "posted")));
    const bills = await db.select().from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.date, from), lte(vendorBillsTable.date, to)));

    const outwardTaxable = invoices.reduce((s, i) => s + Number(i.taxableAmount), 0);
    const outwardCgst = invoices.reduce((s, i) => s + Number(i.cgst), 0);
    const outwardSgst = invoices.reduce((s, i) => s + Number(i.sgst), 0);
    const outwardIgst = invoices.reduce((s, i) => s + Number(i.igst), 0);
    const outwardTax = outwardCgst + outwardSgst + outwardIgst;

    const itcCgst = bills.reduce((s, b) => s + Number(b.cgst), 0);
    const itcSgst = bills.reduce((s, b) => s + Number(b.sgst), 0);
    const itcIgst = bills.reduce((s, b) => s + Number(b.igst), 0);
    const totalItc = itcCgst + itcSgst + itcIgst;

    const netPayable = Math.max(0, outwardTax - totalItc);

    res.json({
      period,
      taxableValue: outwardTaxable,
      outwardCgst,
      outwardSgst,
      outwardIgst,
      outwardSupplies: outwardTaxable,
      outwardTax,
      inwardRcm: 0,
      itcCgst,
      itcSgst,
      itcIgst,
      itcAvailable: { cgst: itcCgst, sgst: itcSgst, igst: itcIgst, total: totalItc },
      itcReversed: { cgst: 0, sgst: 0, igst: 0, total: 0 },
      netItc: { cgst: itcCgst, sgst: itcSgst, igst: itcIgst, total: totalItc },
      netPayable,
      taxPayableCash: netPayable,
      taxPayableItc: totalItc,
      totalLiability: outwardTax,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get GSTR-3B" });
  }
});

router.get("/gst/reconciliation", async (req, res) => {
  try {
    const period = (req.query.period as string) || "May-2025";
    const { from, to } = parsePeriod(period);
    const bills = await db.select().from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.date, from), lte(vendorBillsTable.date, to)));

    const booksTotal = bills.reduce((s, b) => s + Number(b.cgst) + Number(b.sgst) + Number(b.igst), 0);
    // Simulate some matched entries for demo data
    const matchedCount = Math.max(0, bills.length - Math.min(2, bills.length));
    const unmatchedCount = Math.min(2, bills.length);

    const items = bills.map((b, idx) => {
      const bookAmount = Number(b.cgst) + Number(b.sgst) + Number(b.igst);
      const isMatched = idx < matchedCount;
      const gstnAmount = isMatched ? bookAmount : 0;
      return {
        partyName: b.vendorName,
        gstin: "—",
        invoiceNo: b.vendorInvoiceNo || b.billNo,
        invoiceDate: b.date,
        booksAmount: bookAmount,
        gstnAmount,
        difference: bookAmount - gstnAmount,
        status: isMatched ? "matched" : "mismatch",
      };
    });

    const gstnTotal = items.reduce((s, i) => s + i.gstnAmount, 0);

    res.json({
      period,
      booksTotal,
      gstnTotal,
      items,
      totalInPurchaseRegister: bills.length,
      totalIn2b: matchedCount,
      matched: matchedCount,
      unmatched: unmatchedCount,
      mismatched: 0,
      unmatchedItcAmount: items.filter(i => i.status === "mismatch").reduce((s, i) => s + i.booksAmount, 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get GST reconciliation" });
  }
});

export default router;
