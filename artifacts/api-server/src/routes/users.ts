import { Router } from "express";
import { db, usersTable, auditLogsTable } from "@workspace/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const rows = await db.select().from(usersTable);
    res.json(rows.map(r => ({ ...r, lastLogin: r.lastLogin?.toISOString() ?? null })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const roleLevel: Record<string, number> = {
      "Super Admin": 1, "Admin": 2, "Manager": 3, "Accountant": 4, "Staff": 5, "Viewer": 6,
    };
    const [row] = await db.insert(usersTable).values({
      ...req.body,
      roleLevel: roleLevel[req.body.role] || 5,
    }).returning();
    res.status(201).json({ ...row, lastLogin: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(usersTable).where(eq(usersTable.id, Number(req.params.id)));
    if (!row) res.status(404).json({ error: "Not found" }); return;
    res.json({ ...row, lastLogin: row.lastLogin?.toISOString() ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const roleLevel: Record<string, number> = {
      "Super Admin": 1, "Admin": 2, "Manager": 3, "Accountant": 4, "Staff": 5, "Viewer": 6,
    };
    const update: any = { ...req.body, updatedAt: new Date() };
    if (req.body.role) update.roleLevel = roleLevel[req.body.role] || 5;
    const [row] = await db
      .update(usersTable)
      .set(update)
      .where(eq(usersTable.id, Number(req.params.id)))
      .returning();
    if (!row) res.status(404).json({ error: "Not found" }); return;
    res.json({ ...row, lastLogin: row.lastLogin?.toISOString() ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.get("/audit-logs", async (req, res) => {
  try {
    const { entityType, actionType, userId, from, to } = req.query as Record<string, string>;
    let query = db.select().from(auditLogsTable).$dynamic();
    const conditions = [];
    if (entityType) conditions.push(eq(auditLogsTable.entityType, entityType));
    if (actionType) conditions.push(eq(auditLogsTable.actionType, actionType));
    if (from) conditions.push(gte(auditLogsTable.timestamp, new Date(from)));
    if (to) conditions.push(lte(auditLogsTable.timestamp, new Date(to)));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(auditLogsTable.timestamp)).limit(200);
    res.json(rows.map(r => ({ ...r, timestamp: r.timestamp.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

export default router;
