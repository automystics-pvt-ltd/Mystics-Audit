import { Router } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/companies", async (req, res) => {
  try {
    const rows = await db.select().from(companiesTable);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

router.post("/companies", async (req, res) => {
  try {
    const [row] = await db.insert(companiesTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create company" });
  }
});

router.get("/companies/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(companiesTable).where(eq(companiesTable.id, Number(req.params.id)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

router.patch("/companies/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(companiesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(companiesTable.id, Number(req.params.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update company" });
  }
});

export default router;
