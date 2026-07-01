import { Router } from "express";
import { db } from "@workspace/db";
import {
  auditClientsTable, auditTasksTable,
  auditTaskCommentsTable, complianceEventsTable,
  auditFindingsTable,
} from "@workspace/db";
import { eq, and, desc, ilike, lte, sql } from "drizzle-orm";

const router = Router();

/* ════════════════════════════════════════
   AUDIT CLIENTS
════════════════════════════════════════ */

router.get("/audit-clients", async (req, res) => {
  try {
    const { status, search } = req.query as Record<string, string>;
    let rows = await db.select().from(auditClientsTable).orderBy(desc(auditClientsTable.createdAt));
    if (status) rows = rows.filter(r => r.status === status);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.pan ?? "").toLowerCase().includes(q) ||
        (r.gstin ?? "").toLowerCase().includes(q)
      );
    }
    res.json(rows);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.message });
  }
});

router.post("/audit-clients", async (req, res) => {
  try {
    const { name, pan, gstin, contactName, contactEmail, contactPhone,
            address, city, state, engagementTypes, status, notes } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [row] = await db.insert(auditClientsTable).values({
      name, pan, gstin, contactName, contactEmail, contactPhone,
      address, city, state,
      engagementTypes: Array.isArray(engagementTypes) ? JSON.stringify(engagementTypes) : (engagementTypes ?? "[]"),
      status: status ?? "active", notes,
    }).returning();
    res.status(201).json(row);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.message });
  }
});

router.get("/audit-clients/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(auditClientsTable).where(eq(auditClientsTable.id, Number(req.params.id)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

router.put("/audit-clients/:id", async (req, res) => {
  try {
    const { name, pan, gstin, contactName, contactEmail, contactPhone,
            address, city, state, engagementTypes, status, notes } = req.body;
    const [row] = await db.update(auditClientsTable)
      .set({
        name, pan, gstin, contactName, contactEmail, contactPhone,
        address, city, state,
        engagementTypes: Array.isArray(engagementTypes) ? JSON.stringify(engagementTypes) : engagementTypes,
        status, notes, updatedAt: new Date(),
      })
      .where(eq(auditClientsTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

router.delete("/audit-clients/:id", async (req, res) => {
  try {
    await db.delete(auditClientsTable).where(eq(auditClientsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

/* ════════════════════════════════════════
   AUDIT TASKS
════════════════════════════════════════ */

router.get("/audit-tasks", async (req, res) => {
  try {
    const { clientId, status, priority, assignee, overdue } = req.query as Record<string, string>;
    let rows = await db
      .select({
        task: auditTasksTable,
        clientName: auditClientsTable.name,
      })
      .from(auditTasksTable)
      .leftJoin(auditClientsTable, eq(auditTasksTable.clientId, auditClientsTable.id))
      .orderBy(desc(auditTasksTable.createdAt));

    let result = rows.map(r => ({ ...r.task, clientName: r.clientName }));
    if (clientId) result = result.filter(r => r.clientId === Number(clientId));
    if (status)   result = result.filter(r => r.status === status);
    if (priority) result = result.filter(r => r.priority === priority);
    if (assignee) result = result.filter(r => (r.assignee ?? "").toLowerCase().includes(assignee.toLowerCase()));
    if (overdue === "true") {
      const today = new Date().toISOString().split("T")[0];
      result = result.filter(r => r.dueDate && r.dueDate < today && !["completed", "archived"].includes(r.status));
    }
    res.json(result);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.message });
  }
});

router.post("/audit-tasks", async (req, res) => {
  try {
    const { clientId, title, taskType, description, instructions,
            status, priority, dueDate, assignee, checklist, createdBy } = req.body;
    if (!clientId || !title) { res.status(400).json({ error: "clientId and title are required" }); return; }
    const [row] = await db.insert(auditTasksTable).values({
      clientId: Number(clientId), title, taskType: taskType ?? "document_request",
      description, instructions,
      status: status ?? "created", priority: priority ?? "medium",
      dueDate, assignee,
      checklist: Array.isArray(checklist) ? JSON.stringify(checklist) : (checklist ?? "[]"),
      createdBy: createdBy ?? "Current User",
    }).returning();
    res.status(201).json(row);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.message });
  }
});

router.get("/audit-tasks/:id", async (req, res) => {
  try {
    const [taskRow] = await db
      .select({ task: auditTasksTable, clientName: auditClientsTable.name })
      .from(auditTasksTable)
      .leftJoin(auditClientsTable, eq(auditTasksTable.clientId, auditClientsTable.id))
      .where(eq(auditTasksTable.id, Number(req.params.id)));
    if (!taskRow) { res.status(404).json({ error: "Not found" }); return; }
    const comments = await db.select().from(auditTaskCommentsTable)
      .where(eq(auditTaskCommentsTable.taskId, Number(req.params.id)))
      .orderBy(auditTaskCommentsTable.createdAt);
    res.json({ ...taskRow.task, clientName: taskRow.clientName, comments });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

router.put("/audit-tasks/:id", async (req, res) => {
  try {
    const { title, taskType, description, instructions,
            status, priority, dueDate, assignee, checklist } = req.body;
    const [row] = await db.update(auditTasksTable)
      .set({
        title, taskType, description, instructions,
        status, priority, dueDate, assignee,
        checklist: Array.isArray(checklist) ? JSON.stringify(checklist) : checklist,
        updatedAt: new Date(),
      })
      .where(eq(auditTasksTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

router.put("/audit-tasks/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) { res.status(400).json({ error: "status required" }); return; }
    const [row] = await db.update(auditTasksTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(auditTasksTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

router.delete("/audit-tasks/:id", async (req, res) => {
  try {
    await db.delete(auditTaskCommentsTable).where(eq(auditTaskCommentsTable.taskId, Number(req.params.id)));
    await db.delete(auditTasksTable).where(eq(auditTasksTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

router.post("/audit-tasks/:id/comments", async (req, res) => {
  try {
    const { message, author, authorType } = req.body;
    if (!message) { res.status(400).json({ error: "message required" }); return; }
    const [row] = await db.insert(auditTaskCommentsTable).values({
      taskId: Number(req.params.id),
      message,
      author: author ?? "Current User",
      authorType: authorType ?? "auditor",
    }).returning();
    res.status(201).json(row);
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

/* ════════════════════════════════════════
   COMPLIANCE EVENTS
════════════════════════════════════════ */

router.get("/compliance-events", async (req, res) => {
  try {
    const { clientId, status, month, eventType } = req.query as Record<string, string>;
    let rows = await db
      .select({ event: complianceEventsTable, clientName: auditClientsTable.name })
      .from(complianceEventsTable)
      .leftJoin(auditClientsTable, eq(complianceEventsTable.clientId, auditClientsTable.id))
      .orderBy(complianceEventsTable.dueDate);

    let result = rows.map(r => ({ ...r.event, clientName: r.clientName }));
    if (clientId)  result = result.filter(r => r.clientId === Number(clientId));
    if (status)    result = result.filter(r => r.status === status);
    if (eventType) result = result.filter(r => r.eventType === eventType);
    if (month)     result = result.filter(r => r.dueDate.startsWith(month));
    res.json(result);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.message });
  }
});

router.post("/compliance-events", async (req, res) => {
  try {
    const { clientId, eventType, title, period, dueDate, status, notes, isRecurring } = req.body;
    if (!title || !dueDate) { res.status(400).json({ error: "title and dueDate are required" }); return; }
    const [row] = await db.insert(complianceEventsTable).values({
      clientId: clientId ? Number(clientId) : undefined,
      eventType: eventType ?? "custom", title, period,
      dueDate, status: status ?? "pending",
      notes, isRecurring: !!isRecurring,
    }).returning();
    res.status(201).json(row);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.message });
  }
});

router.put("/compliance-events/:id", async (req, res) => {
  try {
    const { clientId, eventType, title, period, dueDate, status, filedDate, notes, isRecurring } = req.body;
    const [row] = await db.update(complianceEventsTable)
      .set({
        clientId: clientId ? Number(clientId) : undefined,
        eventType, title, period, dueDate, status, filedDate, notes,
        isRecurring: isRecurring !== undefined ? !!isRecurring : undefined,
        updatedAt: new Date(),
      })
      .where(eq(complianceEventsTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

router.delete("/compliance-events/:id", async (req, res) => {
  try {
    await db.delete(complianceEventsTable).where(eq(complianceEventsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

/* ════════════════════════════════════════
   AUDIT FINDINGS
════════════════════════════════════════ */

router.get("/audit-findings", async (req, res) => {
  try {
    const { clientId, status, severity, category } = req.query as Record<string, string>;
    let rows = await db.select().from(auditFindingsTable).orderBy(desc(auditFindingsTable.createdAt));
    if (clientId) rows = rows.filter(r => r.clientId === Number(clientId));
    if (status)   rows = rows.filter(r => r.status === status);
    if (severity) rows = rows.filter(r => r.severity === severity);
    if (category) rows = rows.filter(r => r.category === category);

    // Join client names
    const clients = await db.select({ id: auditClientsTable.id, name: auditClientsTable.name }).from(auditClientsTable);
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

    res.json(rows.map(r => ({ ...r, clientName: clientMap[r.clientId] ?? null })));
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.message });
  }
});

router.post("/audit-findings", async (req, res) => {
  try {
    const { clientId, title, description, category, severity, status,
            recommendation, managementResponse, period, dueDate, raisedBy, assignedTo } = req.body;
    if (!clientId || !title) { res.status(400).json({ error: "clientId and title are required" }); return; }
    const [row] = await db.insert(auditFindingsTable).values({
      clientId: Number(clientId), title, description, category: category ?? "compliance",
      severity: severity ?? "medium", status: status ?? "open",
      recommendation, managementResponse, period, dueDate, raisedBy, assignedTo,
    }).returning();
    res.status(201).json(row);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.message });
  }
});

router.get("/audit-findings/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(auditFindingsTable).where(eq(auditFindingsTable.id, Number(req.params.id)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

router.put("/audit-findings/:id", async (req, res) => {
  try {
    const { title, description, category, severity, status,
            recommendation, managementResponse, period, dueDate,
            resolvedDate, raisedBy, assignedTo } = req.body;
    const [row] = await db.update(auditFindingsTable)
      .set({ title, description, category, severity, status,
             recommendation, managementResponse, period, dueDate,
             resolvedDate: status === "resolved" || status === "closed" ? (resolvedDate ?? new Date().toISOString().split("T")[0]) : resolvedDate,
             raisedBy, assignedTo, updatedAt: new Date() })
      .where(eq(auditFindingsTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

router.delete("/audit-findings/:id", async (req, res) => {
  try {
    await db.delete(auditFindingsTable).where(eq(auditFindingsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

export default router;
