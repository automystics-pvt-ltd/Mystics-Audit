import { Router } from "express";
import { db, purchaseOrdersTable, poLinesTable, grnsTable, grnLinesTable, vendorsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

let poSeq = 100;
let grnSeq = 100;
function nextPoNo() { poSeq++; return `PO-${new Date().getFullYear()}-${String(poSeq).padStart(5, "0")}`; }
function nextGrnNo() { grnSeq++; return `GRN-${new Date().getFullYear()}-${String(grnSeq).padStart(5, "0")}`; }

async function getPoWithLines(id: number) {
  const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
  if (!po) return null;
  const lines = await db.select().from(poLinesTable).where(eq(poLinesTable.poId, id));
  return {
    ...po,
    totalAmount: Number(po.totalAmount),
    receivedAmount: Number(po.receivedAmount),
    billedAmount: Number(po.billedAmount),
    lines: lines.map(l => ({
      ...l,
      quantity: Number(l.quantity),
      rate: Number(l.rate),
      gstRate: Number(l.gstRate),
      receivedQty: Number(l.receivedQty),
      billedQty: Number(l.billedQty),
      lineTotal: Number(l.lineTotal),
    })),
  };
}

router.get("/purchases/orders", async (req, res) => {
  try {
    const { status, vendorId } = req.query as Record<string, string>;
    let query = db.select().from(purchaseOrdersTable).$dynamic();
    const conditions = [];
    if (status) conditions.push(eq(purchaseOrdersTable.status, status));
    if (vendorId) conditions.push(eq(purchaseOrdersTable.vendorId, Number(vendorId)));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(purchaseOrdersTable.createdAt)).limit(100);
    res.json(rows.map(r => ({
      ...r,
      totalAmount: Number(r.totalAmount),
      receivedAmount: Number(r.receivedAmount),
      billedAmount: Number(r.billedAmount),
      lines: [],
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
});

router.post("/purchases/orders", async (req, res) => {
  try {
    const { vendorId, date, deliveryDate, notes, lines } = req.body;
    const vendor = await db.query.vendorsTable.findFirst({ where: eq(vendorsTable.id, vendorId) });
    let totalAmount = 0;
    const processedLines = (lines || []).map((l: any) => {
      const qty = Number(l.quantity);
      const rate = Number(l.rate);
      const lineTotal = qty * rate;
      totalAmount += lineTotal;
      return {
        itemId: l.itemId || null,
        description: l.description, hsnSac: l.hsnSac, quantity: String(qty),
        unit: l.unit || "Nos", rate: String(rate), gstRate: String(l.gstRate || 18),
        receivedQty: "0", billedQty: "0", lineTotal: String(lineTotal),
      };
    });

    const [po] = await db.insert(purchaseOrdersTable).values({
      poNo: nextPoNo(),
      vendorId,
      vendorName: vendor?.name || "Vendor",
      date,
      deliveryDate,
      status: "draft",
      totalAmount: String(totalAmount),
      receivedAmount: "0",
      billedAmount: "0",
      notes,
    }).returning();

    if (processedLines.length) {
      await db.insert(poLinesTable).values(processedLines.map((l: any) => ({ ...l, poId: po.id })));
    }

    const result = await getPoWithLines(po.id);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create purchase order" });
  }
});

router.get("/purchases/orders/:id", async (req, res) => {
  try {
    const result = await getPoWithLines(Number(req.params.id));
    if (!result) res.status(404).json({ error: "Not found" }); return;
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch purchase order" });
  }
});

router.post("/purchases/orders/:id/approve", async (req, res) => {
  try {
    const [po] = await db
      .update(purchaseOrdersTable)
      .set({ status: "approved", approvedBy: "Current User", approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(purchaseOrdersTable.id, Number(req.params.id)))
      .returning();
    if (!po) res.status(404).json({ error: "Not found" }); return;
    const result = await getPoWithLines(po.id);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to approve PO" });
  }
});

router.get("/purchases/grn", async (req, res) => {
  try {
    const { poId } = req.query as Record<string, string>;
    let query = db.select().from(grnsTable).$dynamic();
    if (poId) query = query.where(eq(grnsTable.poId, Number(poId)));
    const rows = await query.orderBy(desc(grnsTable.createdAt)).limit(100);
    res.json(rows.map(r => ({ ...r, lines: [] })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch GRNs" });
  }
});

router.post("/purchases/grn", async (req, res) => {
  try {
    const { poId, date, notes, lines } = req.body;
    const po = await getPoWithLines(poId);
    if (!po) { res.status(404).json({ error: "PO not found" }); return; }

    const [grn] = await db.insert(grnsTable).values({
      grnNo: nextGrnNo(),
      poId,
      poNo: po.poNo,
      vendorId: po.vendorId,
      vendorName: po.vendorName,
      date,
      status: "received",
      notes,
    }).returning();

    if (lines?.length) {
      await db.insert(grnLinesTable).values(
        lines.map((l: any) => {
          const poLine = po.lines.find(pl => pl.id === l.poLineId);
          return {
            grnId: grn.id,
            poLineId: l.poLineId,
            description: poLine?.description || "Item",
            quantityOrdered: String(poLine?.quantity || 0),
            quantityReceived: String(l.quantityReceived),
            unit: poLine?.unit || "Nos",
            rate: String(poLine?.rate || 0),
          };
        })
      );
    }

    const grnLines = await db.select().from(grnLinesTable).where(eq(grnLinesTable.grnId, grn.id));
    res.status(201).json({
      ...grn,
      lines: grnLines.map(l => ({
        ...l,
        quantityOrdered: Number(l.quantityOrdered),
        quantityReceived: Number(l.quantityReceived),
        rate: Number(l.rate),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create GRN" });
  }
});

export default router;
