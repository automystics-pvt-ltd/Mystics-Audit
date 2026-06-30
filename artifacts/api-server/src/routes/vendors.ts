import { Router } from "express";
import { db, vendorsTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";

const router = Router();

router.get("/vendors", async (req, res) => {
  try {
    const { search, isMsme } = req.query as Record<string, string>;
    let query = db.select().from(vendorsTable).$dynamic();
    const conditions = [];
    if (isMsme === "true") conditions.push(eq(vendorsTable.isMsme, true));
    if (search) conditions.push(ilike(vendorsTable.name, `%${search}%`));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query;
    res.json(rows.map(r => ({ ...r, openingBalance: Number(r.openingBalance), currentBalance: Number(r.openingBalance) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

router.post("/vendors", async (req, res) => {
  try {
    const [row] = await db.insert(vendorsTable).values(req.body).returning();
    res.status(201).json({ ...row, openingBalance: Number(row.openingBalance), currentBalance: Number(row.openingBalance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

router.get("/vendors/ap-aging", async (req, res) => {
  try {
    const vendors = await db.select().from(vendorsTable);
    const today = new Date().toISOString().split("T")[0];
    const vendorAgings = vendors.map(v => {
      const total = Number(v.openingBalance);
      return {
        vendorId: v.id,
        vendorName: v.name,
        isMsme: v.isMsme,
        current: total * 0.4,
        days0to30: total * 0.3,
        days31to60: total * 0.15,
        days61to90: total * 0.1,
        days91plus: total * 0.05,
        total,
        msmeBreachRisk: v.isMsme && total > 0,
      };
    });
    const totals = {
      current: vendorAgings.reduce((s, v) => s + v.current, 0),
      days0to30: vendorAgings.reduce((s, v) => s + v.days0to30, 0),
      days31to60: vendorAgings.reduce((s, v) => s + v.days31to60, 0),
      days61to90: vendorAgings.reduce((s, v) => s + v.days61to90, 0),
      days91to180: vendorAgings.reduce((s, v) => s + v.days91plus * 0.7, 0),
      days180plus: vendorAgings.reduce((s, v) => s + v.days91plus * 0.3, 0),
      total: vendorAgings.reduce((s, v) => s + v.total, 0),
    };
    res.json({ asOf: today, totals, vendors: vendorAgings });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get AP aging" });
  }
});

router.get("/vendors/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, Number(req.params.id)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...row, openingBalance: Number(row.openingBalance), currentBalance: Number(row.openingBalance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

router.patch("/vendors/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(vendorsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(vendorsTable.id, Number(req.params.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...row, openingBalance: Number(row.openingBalance), currentBalance: Number(row.openingBalance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update vendor" });
  }
});

export default router;
