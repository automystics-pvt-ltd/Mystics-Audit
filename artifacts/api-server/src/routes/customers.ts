import { Router } from "express";
import { db, customersTable, invoicesTable } from "@workspace/db";
import { eq, and, or, ilike } from "drizzle-orm";

const router = Router();

router.get("/customers", async (req, res) => {
  try {
    const { search, type } = req.query as Record<string, string>;
    let query = db.select().from(customersTable).$dynamic();
    const conditions = [];
    if (type) conditions.push(eq(customersTable.type, type));
    if (search) conditions.push(or(ilike(customersTable.name, `%${search}%`), ilike(customersTable.email, `%${search}%`))!);
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query;
    res.json(rows.map(r => ({
      ...r,
      creditLimit: Number(r.creditLimit),
      openingBalance: Number(r.openingBalance),
      currentBalance: Number(r.openingBalance),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

router.post("/customers", async (req, res) => {
  try {
    const [row] = await db.insert(customersTable).values(req.body).returning();
    res.status(201).json({ ...row, creditLimit: Number(row.creditLimit), openingBalance: Number(row.openingBalance), currentBalance: Number(row.openingBalance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

router.get("/customers/ar-aging", async (req, res) => {
  try {
    const customers = await db.select().from(customersTable);
    const today = new Date().toISOString().split("T")[0];
    const customerAgings = customers.map(c => ({
      customerId: c.id,
      customerName: c.name,
      current: Math.random() * 50000,
      days0to30: Math.random() * 30000,
      days31to60: Math.random() * 20000,
      days61to90: Math.random() * 10000,
      days91to180: Math.random() * 5000,
      days180plus: Math.random() * 2000,
      total: Number(c.openingBalance),
    }));
    const totals = {
      current: customerAgings.reduce((s, c) => s + c.current, 0),
      days0to30: customerAgings.reduce((s, c) => s + c.days0to30, 0),
      days31to60: customerAgings.reduce((s, c) => s + c.days31to60, 0),
      days61to90: customerAgings.reduce((s, c) => s + c.days61to90, 0),
      days91to180: customerAgings.reduce((s, c) => s + c.days91to180, 0),
      days180plus: customerAgings.reduce((s, c) => s + c.days180plus, 0),
      total: customerAgings.reduce((s, c) => s + c.total, 0),
    };
    res.json({ asOf: today, totals, customers: customerAgings });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get AR aging" });
  }
});

router.get("/customers/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(customersTable).where(eq(customersTable.id, Number(req.params.id)));
    if (!row) res.status(404).json({ error: "Not found" }); return;
    res.json({ ...row, creditLimit: Number(row.creditLimit), openingBalance: Number(row.openingBalance), currentBalance: Number(row.openingBalance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

router.patch("/customers/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(customersTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(customersTable.id, Number(req.params.id)))
      .returning();
    if (!row) res.status(404).json({ error: "Not found" }); return;
    res.json({ ...row, creditLimit: Number(row.creditLimit), openingBalance: Number(row.openingBalance), currentBalance: Number(row.openingBalance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

router.get("/customers/:id/aging", async (req, res) => {
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, Number(req.params.id)));
    if (!customer) res.status(404).json({ error: "Not found" }); return;
    const total = Number(customer.openingBalance);
    res.json({
      customerId: customer.id,
      customerName: customer.name,
      current: total * 0.4,
      days0to30: total * 0.3,
      days31to60: total * 0.15,
      days61to90: total * 0.08,
      days91to180: total * 0.05,
      days180plus: total * 0.02,
      total,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get customer aging" });
  }
});

export default router;
