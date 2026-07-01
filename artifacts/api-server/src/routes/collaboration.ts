import { Router } from "express";
import { db } from "@workspace/db";
import {
  collaborationRequestsTable,
  collaborationMessagesTable,
  auditClientsTable,
} from "@workspace/db";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";

const router = Router();

/* ── List requests ──────────────────────────────────────────── */
router.get("/collaboration/requests", async (req, res) => {
  try {
    const { clientId, status, requestType, search } = req.query as Record<string, string>;
    const conditions: any[] = [];
    if (clientId) conditions.push(eq(collaborationRequestsTable.clientId, Number(clientId)));
    if (status)      conditions.push(eq(collaborationRequestsTable.status, status));
    if (requestType) conditions.push(eq(collaborationRequestsTable.requestType, requestType));
    if (search)      conditions.push(ilike(collaborationRequestsTable.title, `%${search}%`));

    const rows = await db
      .select({
        id:           collaborationRequestsTable.id,
        clientId:     collaborationRequestsTable.clientId,
        title:        collaborationRequestsTable.title,
        description:  collaborationRequestsTable.description,
        requestType:  collaborationRequestsTable.requestType,
        priority:     collaborationRequestsTable.priority,
        dueDate:      collaborationRequestsTable.dueDate,
        status:       collaborationRequestsTable.status,
        assignedTo:   collaborationRequestsTable.assignedTo,
        createdBy:    collaborationRequestsTable.createdBy,
        tags:         collaborationRequestsTable.tags,
        orgId:        collaborationRequestsTable.orgId,
        createdAt:    collaborationRequestsTable.createdAt,
        updatedAt:    collaborationRequestsTable.updatedAt,
        clientName:   auditClientsTable.name,
      })
      .from(collaborationRequestsTable)
      .leftJoin(auditClientsTable, eq(collaborationRequestsTable.clientId, auditClientsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(collaborationRequestsTable.updatedAt));

    /* Attach message counts */
    const ids = (rows as any[]).map((r: any) => r.id as number);
    const countMap: Record<number, number> = {};
    if (ids.length > 0) {
      const counts = await db
        .select({ requestId: collaborationMessagesTable.requestId, cnt: sql<number>`count(*)::int` })
        .from(collaborationMessagesTable)
        .where(sql`${collaborationMessagesTable.requestId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]`)})`)
        .groupBy(collaborationMessagesTable.requestId);
      (counts as any[]).forEach((c: any) => { countMap[c.requestId as number] = c.cnt as number; });
    }

    res.json((rows as any[]).map((r: any) => ({ ...r, messageCount: countMap[r.id as number] ?? 0 })));
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

/* ── Create request ─────────────────────────────────────────── */
router.post("/collaboration/requests", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(collaborationRequestsTable).values({
      clientId:    body.clientId,
      title:       body.title,
      description: body.description ?? null,
      requestType: body.requestType ?? "document",
      priority:    body.priority ?? "medium",
      dueDate:     body.dueDate ?? null,
      status:      "pending",
      assignedTo:  body.assignedTo ?? null,
      createdBy:   body.createdBy ?? null,
      tags:        body.tags ?? null,
    }).returning();

    /* Auto-create opening system message */
    await db.insert(collaborationMessagesTable).values({
      requestId:   row.id,
      senderRole:  "auditor",
      senderName:  body.createdBy ?? "Auditor",
      message:     body.description ?? `Request created: ${body.title}`,
      messageType: "system",
      attachments: "[]",
    });

    res.status(201).json(row);
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

/* ── Get request with full timeline ─────────────────────────── */
router.get("/collaboration/requests/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [request] = await db
      .select({
        id:           collaborationRequestsTable.id,
        clientId:     collaborationRequestsTable.clientId,
        title:        collaborationRequestsTable.title,
        description:  collaborationRequestsTable.description,
        requestType:  collaborationRequestsTable.requestType,
        priority:     collaborationRequestsTable.priority,
        dueDate:      collaborationRequestsTable.dueDate,
        status:       collaborationRequestsTable.status,
        assignedTo:   collaborationRequestsTable.assignedTo,
        createdBy:    collaborationRequestsTable.createdBy,
        tags:         collaborationRequestsTable.tags,
        orgId:        collaborationRequestsTable.orgId,
        createdAt:    collaborationRequestsTable.createdAt,
        updatedAt:    collaborationRequestsTable.updatedAt,
        clientName:   auditClientsTable.name,
      })
      .from(collaborationRequestsTable)
      .leftJoin(auditClientsTable, eq(collaborationRequestsTable.clientId, auditClientsTable.id))
      .where(eq(collaborationRequestsTable.id, id));

    if (!request) { res.status(404).json({ error: "Not found" }); return; }

    const messages = await db
      .select()
      .from(collaborationMessagesTable)
      .where(eq(collaborationMessagesTable.requestId, id))
      .orderBy(collaborationMessagesTable.createdAt);

    res.json({ request, messages });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

/* ── Update request ─────────────────────────────────────────── */
router.put("/collaboration/requests/:id", async (req, res) => {
  try {
    const id   = Number(req.params.id);
    const body = req.body;

    /* Fetch current status for history tracking */
    const [current] = await db
      .select({ status: collaborationRequestsTable.status })
      .from(collaborationRequestsTable)
      .where(eq(collaborationRequestsTable.id, id));

    const [row] = await db.update(collaborationRequestsTable)
      .set({
        title:       body.title,
        description: body.description,
        requestType: body.requestType,
        priority:    body.priority,
        dueDate:     body.dueDate,
        status:      body.status,
        assignedTo:  body.assignedTo,
        tags:        body.tags,
        updatedAt:   new Date(),
      })
      .where(eq(collaborationRequestsTable.id, id))
      .returning();

    /* Log status change as a timeline message */
    if (current && body.status && body.status !== current.status) {
      await db.insert(collaborationMessagesTable).values({
        requestId:   id,
        senderRole:  "auditor",
        senderName:  body.updatedBy ?? "Auditor",
        messageType: "status_change",
        fromStatus:  current.status,
        toStatus:    body.status,
        message:     body.statusNote ?? null,
        attachments: "[]",
      });
    }

    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

/* ── Delete request ─────────────────────────────────────────── */
router.delete("/collaboration/requests/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(collaborationMessagesTable).where(eq(collaborationMessagesTable.requestId, id));
    await db.delete(collaborationRequestsTable).where(eq(collaborationRequestsTable.id, id));
    res.status(204).send();
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

/* ── List messages ───────────────────────────────────────────── */
router.get("/collaboration/requests/:id/messages", async (req, res) => {
  try {
    const messages = await db
      .select()
      .from(collaborationMessagesTable)
      .where(eq(collaborationMessagesTable.requestId, Number(req.params.id)))
      .orderBy(collaborationMessagesTable.createdAt);
    res.json(messages);
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

/* ── Post message ────────────────────────────────────────────── */
router.post("/collaboration/requests/:id/messages", async (req, res) => {
  try {
    const id   = Number(req.params.id);
    const body = req.body;

    const [msg] = await db.insert(collaborationMessagesTable).values({
      requestId:   id,
      senderRole:  body.senderRole ?? "auditor",
      senderName:  body.senderName ?? null,
      message:     body.message ?? null,
      messageType: body.messageType ?? "message",
      fromStatus:  body.fromStatus ?? null,
      toStatus:    body.toStatus ?? null,
      attachments: body.attachments ?? "[]",
    }).returning();

    /* Auto-advance status based on sender role */
    const [current] = await db
      .select({ status: collaborationRequestsTable.status })
      .from(collaborationRequestsTable)
      .where(eq(collaborationRequestsTable.id, id));

    if (current) {
      let newStatus = current.status;
      if (body.senderRole === "client" && current.status === "pending") newStatus = "in_progress";
      if (body.senderRole === "client" && body.messageType === "message") newStatus = "submitted";
      if (body.senderRole === "auditor" && current.status === "submitted") newStatus = "under_review";
      if (body.toStatus) newStatus = body.toStatus;

      if (newStatus !== current.status) {
        await db.update(collaborationRequestsTable)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(collaborationRequestsTable.id, id));
      }
    }

    res.status(201).json(msg);
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

/* ── Summary counts ─────────────────────────────────────────── */
router.get("/collaboration/summary", async (_req, res) => {
  try {
    const rows = await db
      .select({ status: collaborationRequestsTable.status, cnt: sql<number>`count(*)::int` })
      .from(collaborationRequestsTable)
      .groupBy(collaborationRequestsTable.status);

    const map: Record<string, number> = {};
    (rows as any[]).forEach((r: any) => { map[r.status as string] = r.cnt as number; });
    const total = (rows as any[]).reduce((s: number, r: any) => s + (r.cnt as number), 0);

    /* Auto-mark overdue */
    const today = new Date().toISOString().split("T")[0];
    await db.update(collaborationRequestsTable)
      .set({ status: "overdue", updatedAt: new Date() })
      .where(
        and(
          sql`${collaborationRequestsTable.dueDate} < ${today}`,
          or(
            eq(collaborationRequestsTable.status, "pending"),
            eq(collaborationRequestsTable.status, "in_progress")
          )
        )
      );

    res.json({
      total,
      pending:     map["pending"]      ?? 0,
      inProgress:  map["in_progress"]  ?? 0,
      submitted:   map["submitted"]    ?? 0,
      underReview: map["under_review"] ?? 0,
      completed:   map["completed"]    ?? 0,
      overdue:     map["overdue"]      ?? 0,
      cancelled:   map["cancelled"]    ?? 0,
    });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

export default router;
