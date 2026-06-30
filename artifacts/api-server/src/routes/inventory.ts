import { Router } from "express";
import { db, inventoryItemsTable } from "@workspace/db";
import { eq, and, ilike, lte } from "drizzle-orm";

const router = Router();

let itemSeq = 1000;
function nextItemCode() { itemSeq++; return `ITM-${String(itemSeq).padStart(5, "0")}`; }

function mapItem(r: any) {
  return {
    ...r,
    gstRate: Number(r.gstRate),
    purchaseRate: r.purchaseRate ? Number(r.purchaseRate) : null,
    sellingRate: r.sellingRate ? Number(r.sellingRate) : null,
    mrp: r.mrp ? Number(r.mrp) : null,
    reorderLevel: r.reorderLevel ? Number(r.reorderLevel) : null,
    reorderQty: r.reorderQty ? Number(r.reorderQty) : null,
    currentStock: Number(r.currentStock),
    stockValue: Number(r.stockValue),
  };
}

router.get("/inventory/items", async (req, res) => {
  try {
    const { search, type, group, lowStock } = req.query as Record<string, string>;
    let query = db.select().from(inventoryItemsTable).$dynamic();
    const conditions = [];
    if (type) conditions.push(eq(inventoryItemsTable.type, type));
    if (group) conditions.push(eq(inventoryItemsTable.group, group));
    if (search) conditions.push(ilike(inventoryItemsTable.name, `%${search}%`));
    if (lowStock === "true") conditions.push(lte(inventoryItemsTable.currentStock, inventoryItemsTable.reorderLevel!));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query;
    res.json(rows.map(mapItem));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

router.post("/inventory/items", async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.itemCode) data.itemCode = nextItemCode();
    const [row] = await db.insert(inventoryItemsTable).values(data).returning();
    res.status(201).json(mapItem(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

router.get("/inventory/valuation", async (req, res) => {
  try {
    const items = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.isActive, true));
    const totalValue = items.reduce((s, i) => s + Number(i.stockValue), 0);
    res.json({
      asOf: new Date().toISOString().split("T")[0],
      totalValue,
      totalItems: items.length,
      lowStockItems: items.filter(i => i.reorderLevel && Number(i.currentStock) <= Number(i.reorderLevel)).length,
      lines: items.map(i => ({
        itemId: i.id,
        itemCode: i.itemCode,
        itemName: i.name,
        currentQty: Number(i.currentStock),
        unit: i.unit,
        avgCost: Number(i.purchaseRate || 0),
        stockValue: Number(i.stockValue),
        isLowStock: !!i.reorderLevel && Number(i.currentStock) <= Number(i.reorderLevel),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get valuation" });
  }
});

router.get("/inventory/items/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, Number(req.params.id)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapItem(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

router.patch("/inventory/items/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(inventoryItemsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(inventoryItemsTable.id, Number(req.params.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapItem(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

export default router;
