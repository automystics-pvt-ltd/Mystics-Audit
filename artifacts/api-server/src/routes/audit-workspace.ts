import { Router } from "express";
import { db } from "@workspace/db";
import {
  auditClientsTable, auditTasksTable,
  auditTaskCommentsTable, complianceEventsTable,
  auditFindingsTable, auditQueriesTable, auditWorkingPapersTable,
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
            address, city, state, engagementTypes, engagementPhase, status, notes } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [row] = await db.insert(auditClientsTable).values({
      name, pan, gstin, contactName, contactEmail, contactPhone,
      address, city, state,
      engagementTypes: Array.isArray(engagementTypes) ? JSON.stringify(engagementTypes) : (engagementTypes ?? "[]"),
      engagementPhase: engagementPhase ?? "planning",
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
            address, city, state, engagementTypes, engagementPhase, status, notes } = req.body;
    const [row] = await db.update(auditClientsTable)
      .set({
        name, pan, gstin, contactName, contactEmail, contactPhone,
        address, city, state,
        engagementTypes: Array.isArray(engagementTypes) ? JSON.stringify(engagementTypes) : engagementTypes,
        engagementPhase: engagementPhase ?? undefined,
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
    const { clientId, title, taskType, phase, description, instructions,
            status, priority, dueDate, assignee, checklist, createdBy } = req.body;
    if (!clientId || !title) { res.status(400).json({ error: "clientId and title are required" }); return; }
    const [row] = await db.insert(auditTasksTable).values({
      clientId: Number(clientId), title,
      taskType: taskType ?? "document_request",
      phase: phase ?? "planning",
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
    const { title, taskType, phase, description, instructions,
            status, priority, dueDate, assignee, checklist } = req.body;
    const [row] = await db.update(auditTasksTable)
      .set({
        title, taskType, phase: phase ?? undefined, description, instructions,
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

/* ════════════════════════════════════════
   AUDIT QUERIES
════════════════════════════════════════ */

router.get("/audit-queries", async (req, res) => {
  try {
    const { clientId, status, priority, queryType } = req.query as Record<string, string>;
    let rows = await db
      .select({ q: auditQueriesTable, clientName: auditClientsTable.name })
      .from(auditQueriesTable)
      .leftJoin(auditClientsTable, eq(auditQueriesTable.clientId, auditClientsTable.id))
      .orderBy(desc(auditQueriesTable.createdAt));
    let result = rows.map(r => ({ ...r.q, clientName: r.clientName }));
    if (clientId)   result = result.filter(r => r.clientId === Number(clientId));
    if (status)     result = result.filter(r => r.status === status);
    if (priority)   result = result.filter(r => r.priority === priority);
    if (queryType)  result = result.filter(r => r.queryType === queryType);
    res.json(result);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e?.message }); }
});

router.post("/audit-queries", async (req, res) => {
  try {
    const { clientId, taskId, queryNo, title, description, queryType,
            status, priority, raisedBy, assignedTo, dueDate, clientResponse, auditorNote, period } = req.body;
    if (!clientId || !title) { res.status(400).json({ error: "clientId and title required" }); return; }
    const [row] = await db.insert(auditQueriesTable).values({
      clientId: Number(clientId), taskId: taskId ? Number(taskId) : undefined,
      queryNo, title, description, queryType: queryType ?? "information_request",
      status: status ?? "raised", priority: priority ?? "medium",
      raisedBy, assignedTo, dueDate, clientResponse, auditorNote, period,
    }).returning();
    res.status(201).json(row);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e?.message }); }
});

router.get("/audit-queries/:id", async (req, res) => {
  try {
    const [row] = await db.select({ q: auditQueriesTable, clientName: auditClientsTable.name })
      .from(auditQueriesTable)
      .leftJoin(auditClientsTable, eq(auditQueriesTable.clientId, auditClientsTable.id))
      .where(eq(auditQueriesTable.id, Number(req.params.id)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...row.q, clientName: row.clientName });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

router.put("/audit-queries/:id", async (req, res) => {
  try {
    const { title, description, queryType, status, priority, raisedBy, assignedTo,
            dueDate, clientResponse, auditorNote, period, queryNo } = req.body;
    const [row] = await db.update(auditQueriesTable)
      .set({ title, description, queryType, status, priority, raisedBy, assignedTo,
             dueDate, clientResponse, auditorNote, period, queryNo, updatedAt: new Date() })
      .where(eq(auditQueriesTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

router.delete("/audit-queries/:id", async (req, res) => {
  try {
    await db.delete(auditQueriesTable).where(eq(auditQueriesTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

/* ════════════════════════════════════════
   AUDIT WORKING PAPERS
════════════════════════════════════════ */

router.get("/audit-working-papers", async (req, res) => {
  try {
    const { clientId, status, section } = req.query as Record<string, string>;
    let rows = await db
      .select({ wp: auditWorkingPapersTable, clientName: auditClientsTable.name })
      .from(auditWorkingPapersTable)
      .leftJoin(auditClientsTable, eq(auditWorkingPapersTable.clientId, auditClientsTable.id))
      .orderBy(desc(auditWorkingPapersTable.createdAt));
    let result = rows.map(r => ({ ...r.wp, clientName: r.clientName }));
    if (clientId) result = result.filter(r => r.clientId === Number(clientId));
    if (status)   result = result.filter(r => r.status === status);
    if (section)  result = result.filter(r => r.section === section);
    res.json(result);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e?.message }); }
});

router.post("/audit-working-papers", async (req, res) => {
  try {
    const { clientId, wpNo, title, section, description, preparedBy,
            reviewedBy, status, riskArea, assertions, conclusion, period } = req.body;
    if (!clientId || !title) { res.status(400).json({ error: "clientId and title required" }); return; }
    const [row] = await db.insert(auditWorkingPapersTable).values({
      clientId: Number(clientId), wpNo, title, section: section ?? "planning",
      description, preparedBy, reviewedBy, status: status ?? "draft",
      riskArea, assertions, conclusion, period,
    }).returning();
    res.status(201).json(row);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e?.message }); }
});

router.get("/audit-working-papers/:id", async (req, res) => {
  try {
    const [row] = await db.select({ wp: auditWorkingPapersTable, clientName: auditClientsTable.name })
      .from(auditWorkingPapersTable)
      .leftJoin(auditClientsTable, eq(auditWorkingPapersTable.clientId, auditClientsTable.id))
      .where(eq(auditWorkingPapersTable.id, Number(req.params.id)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...row.wp, clientName: row.clientName });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

router.put("/audit-working-papers/:id", async (req, res) => {
  try {
    const { wpNo, title, section, description, preparedBy, reviewedBy,
            status, riskArea, assertions, conclusion, period } = req.body;
    const [row] = await db.update(auditWorkingPapersTable)
      .set({ wpNo, title, section, description, preparedBy, reviewedBy,
             status, riskArea, assertions, conclusion, period, updatedAt: new Date() })
      .where(eq(auditWorkingPapersTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

router.delete("/audit-working-papers/:id", async (req, res) => {
  try {
    await db.delete(auditWorkingPapersTable).where(eq(auditWorkingPapersTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

/* ════════════════════════════════════════
   COMPLIANCE CALENDAR SEEDING
════════════════════════════════════════ */

router.post("/audit-clients/:id/seed-compliance", async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const { fy = "2025-26", categories = ["gst", "tds", "income_tax", "roc"] } = req.body as {
      fy?: string; categories?: string[];
    };

    const fyYear   = parseInt(fy.split("-")[0]); // e.g. 2025 from "2025-26"
    const startY   = fyYear;
    const endY     = fyYear + 1;

    const dt = (y: number, m: number, d: number) =>
      `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

    const events: (typeof complianceEventsTable.$inferInsert)[] = [];

    /* ── GST ── */
    if (categories.includes("gst")) {
      const months: [number, number][] = [
        [startY,4],[startY,5],[startY,6],[startY,7],[startY,8],[startY,9],
        [startY,10],[startY,11],[startY,12],[endY,1],[endY,2],[endY,3],
      ];
      for (const [y, m] of months) {
        const [ny, nm] = m === 12 ? [y+1, 1] : [y, m+1];
        const period = `${y}-${String(m).padStart(2,"0")}`;
        events.push({ clientId, eventType:"gst_return", period, status:"pending",
          title: `GSTR-1 — ${period}`, dueDate: dt(ny, nm, 11) });
        events.push({ clientId, eventType:"gst_return", period, status:"pending",
          title: `GSTR-3B — ${period}`, dueDate: dt(ny, nm, 20) });
      }
    }

    /* ── TDS ── */
    if (categories.includes("tds")) {
      // Monthly TDS payment (7th of following month)
      const months: [number, number][] = [
        [startY,4],[startY,5],[startY,6],[startY,7],[startY,8],[startY,9],
        [startY,10],[startY,11],[startY,12],[endY,1],[endY,2],[endY,3],
      ];
      for (const [y, m] of months) {
        const [ny, nm] = m === 12 ? [y+1, 1] : [y, m+1];
        const period = `${y}-${String(m).padStart(2,"0")}`;
        events.push({ clientId, eventType:"tds_return", period, status:"pending",
          title: `TDS Payment — ${period}`, dueDate: dt(ny, nm, 7) });
      }
      // Quarterly TDS returns
      events.push({ clientId, eventType:"tds_return", period:`${startY}-Q1`, status:"pending",
        title:`TDS Return Q1 (Apr–Jun ${startY})`, dueDate: dt(startY,7,31) });
      events.push({ clientId, eventType:"tds_return", period:`${startY}-Q2`, status:"pending",
        title:`TDS Return Q2 (Jul–Sep ${startY})`, dueDate: dt(startY,10,31) });
      events.push({ clientId, eventType:"tds_return", period:`${startY}-Q3`, status:"pending",
        title:`TDS Return Q3 (Oct–Dec ${startY})`, dueDate: dt(endY,1,31) });
      events.push({ clientId, eventType:"tds_return", period:`${startY}-Q4`, status:"pending",
        title:`TDS Return Q4 (Jan–Mar ${endY})`, dueDate: dt(endY,5,31) });
    }

    /* ── Income Tax & Advance Tax ── */
    if (categories.includes("income_tax")) {
      events.push({ clientId, eventType:"income_tax", period:`FY ${fy}`, status:"pending",
        title:`Advance Tax Q1 (${startY})`, dueDate: dt(startY,6,15) });
      events.push({ clientId, eventType:"income_tax", period:`FY ${fy}`, status:"pending",
        title:`Advance Tax Q2 (${startY})`, dueDate: dt(startY,9,15) });
      events.push({ clientId, eventType:"income_tax", period:`FY ${fy}`, status:"pending",
        title:`Advance Tax Q3 (${startY})`, dueDate: dt(startY,12,15) });
      events.push({ clientId, eventType:"income_tax", period:`FY ${fy}`, status:"pending",
        title:`Advance Tax Q4 (${endY})`, dueDate: dt(endY,3,15) });
      events.push({ clientId, eventType:"audit_report", period:`FY ${fy}`, status:"pending",
        title:`Tax Audit Report (Sec 44AB) — FY ${fy}`, dueDate: dt(endY,9,30) });
      events.push({ clientId, eventType:"income_tax", period:`FY ${fy}`, status:"pending",
        title:`Income Tax Return — FY ${fy}`, dueDate: dt(endY,10,31) });
    }

    /* ── ROC / MCA ── */
    if (categories.includes("roc")) {
      events.push({ clientId, eventType:"audit_report", period:`FY ${fy}`, status:"pending",
        title:`Statutory Audit Report — FY ${fy}`, dueDate: dt(endY,9,29) });
      events.push({ clientId, eventType:"roc_filing", period:`FY ${fy}`, status:"pending",
        title:`AGM — FY ${fy}`, dueDate: dt(endY,9,30) });
      events.push({ clientId, eventType:"roc_filing", period:`FY ${fy}`, status:"pending",
        title:`AOC-4 (Financial Statements) — FY ${fy}`, dueDate: dt(endY,10,29) });
      events.push({ clientId, eventType:"roc_filing", period:`FY ${fy}`, status:"pending",
        title:`MGT-7 (Annual Return) — FY ${fy}`, dueDate: dt(endY,11,29) });
    }

    /* ── PF / ESI ── */
    if (categories.includes("pf_esi")) {
      const months: [number, number][] = [
        [startY,4],[startY,5],[startY,6],[startY,7],[startY,8],[startY,9],
        [startY,10],[startY,11],[startY,12],[endY,1],[endY,2],[endY,3],
      ];
      for (const [y, m] of months) {
        const [ny, nm] = m === 12 ? [y+1, 1] : [y, m+1];
        const period = `${y}-${String(m).padStart(2,"0")}`;
        events.push({ clientId, eventType:"pt_return", period, status:"pending",
          title:`PF/ESI Payment — ${period}`, dueDate: dt(ny, nm, 15) });
      }
    }

    const created = await db.insert(complianceEventsTable).values(events).returning();
    res.status(201).json({ created: created.length, events: created });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.message });
  }
});

/* ════════════════════════════════════════
   BULK TASK CREATION (Engagement Templates)
════════════════════════════════════════ */

router.post("/audit-tasks/bulk", async (req, res) => {
  try {
    const { tasks } = req.body as { tasks: any[] };
    if (!Array.isArray(tasks) || tasks.length === 0) {
      res.status(400).json({ error: "tasks array required" }); return;
    }
    const created = await db.insert(auditTasksTable).values(
      tasks.map((t: any) => ({
        clientId:     Number(t.clientId),
        title:        t.title,
        taskType:     t.taskType     ?? "document_request",
        description:  t.description  ?? null,
        instructions: t.instructions ?? null,
        priority:     t.priority     ?? "medium",
        phase:        t.phase        ?? "planning",
        dueDate:      t.dueDate      ?? null,
        assignee:     t.assignee     ?? null,
        status:       "created",
        checklist:    t.checklist    ?? null,
      }))
    ).returning();
    res.status(201).json(created);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.message });
  }
});
