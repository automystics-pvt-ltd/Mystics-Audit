import { Router } from "express";
import { db } from "@workspace/db";
import {
  notificationsTable, automationRulesTable,
  auditTasksTable, complianceEventsTable, auditQueriesTable,
  auditClientsTable, collaborationRequestsTable,
} from "@workspace/db";
import { eq, desc, and, lte, or, lt, notInArray } from "drizzle-orm";

const router = Router();
const today = () => new Date().toISOString().split("T")[0];

/* ════════════════════════════════════════
   NOTIFICATIONS
════════════════════════════════════════ */

router.get("/notifications", async (req, res) => {
  try {
    const { status, priority, clientId, limit: lim } = req.query as Record<string, string>;
    let rows = await db
      .select()
      .from(notificationsTable)
      .orderBy(desc(notificationsTable.createdAt))
      .limit(Number(lim ?? 100));
    if (status)   rows = rows.filter(r => r.status === status);
    if (priority) rows = rows.filter(r => r.priority === priority);
    if (clientId) rows = rows.filter(r => r.clientId === Number(clientId));
    res.json(rows);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e?.message }); }
});

router.get("/notifications/summary", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.status, "unread"));
    const total    = rows.length;
    const critical = rows.filter(r => r.priority === "critical").length;
    const high     = rows.filter(r => r.priority === "high").length;
    res.json({ total, critical, high, medium: rows.filter(r => r.priority === "medium").length, low: rows.filter(r => r.priority === "low").length });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

router.post("/notifications/:id/read", async (req, res) => {
  try {
    const [row] = await db.update(notificationsTable)
      .set({ status: "read" })
      .where(eq(notificationsTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

router.post("/notifications/:id/dismiss", async (req, res) => {
  try {
    const [row] = await db.update(notificationsTable)
      .set({ status: "dismissed" })
      .where(eq(notificationsTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

router.post("/notifications/mark-all-read", async (_req, res) => {
  try {
    await db.update(notificationsTable)
      .set({ status: "read" })
      .where(eq(notificationsTable.status, "unread"));
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

router.delete("/notifications/:id", async (req, res) => {
  try {
    await db.delete(notificationsTable).where(eq(notificationsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

/* ════════════════════════════════════════
   AUTOMATION RULES
════════════════════════════════════════ */

router.get("/automation-rules", async (req, res) => {
  try {
    const { ruleType } = req.query as Record<string, string>;
    let rows = await db
      .select()
      .from(automationRulesTable)
      .orderBy(desc(automationRulesTable.createdAt));
    if (ruleType) rows = rows.filter(r => r.ruleType === ruleType);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

router.post("/automation-rules", async (req, res) => {
  try {
    const { name, ruleType, description, config, isActive, clientId } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const [row] = await db.insert(automationRulesTable).values({
      name, ruleType: ruleType ?? "reminder", description,
      config: typeof config === "object" ? JSON.stringify(config) : (config ?? "{}"),
      isActive: isActive ?? true,
      clientId: clientId ? Number(clientId) : undefined,
    }).returning();
    res.status(201).json(row);
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

router.put("/automation-rules/:id", async (req, res) => {
  try {
    const { name, ruleType, description, config, isActive, clientId } = req.body;
    const [row] = await db.update(automationRulesTable)
      .set({
        name, ruleType, description,
        config: typeof config === "object" ? JSON.stringify(config) : config,
        isActive, clientId: clientId ? Number(clientId) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(automationRulesTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

router.delete("/automation-rules/:id", async (req, res) => {
  try {
    await db.delete(automationRulesTable).where(eq(automationRulesTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

/* ════════════════════════════════════════
   TRIGGER AUTOMATION (manual + scheduled)
════════════════════════════════════════ */

router.post("/automation/run", async (req, res) => {
  try {
    const result = await runAutomationChecks();
    res.json(result);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e?.message }); }
});

/* ── Core automation logic ── */
export async function runAutomationChecks(): Promise<{ created: number; types: Record<string, number> }> {
  const td   = today();
  const in3d = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
  const in7d = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  let created = 0;
  const types: Record<string, number> = {};

  async function notify(n: {
    type: string; title: string; message?: string;
    entityType?: string; entityId?: number; clientId?: number; clientName?: string;
    priority?: string; actionUrl?: string;
  }) {
    /* Deduplicate: skip if same type+entity+title created in last 24h */
    const recent = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.title, n.title),
          eq(notificationsTable.type, n.type),
          n.entityId ? eq(notificationsTable.entityId, n.entityId) : undefined as any,
        )
      )
      .limit(1);
    /* Only create if no matching unread notification already exists */
    const alreadyUnread = recent.length > 0
      ? (await db.select({ id: notificationsTable.id, status: notificationsTable.status })
          .from(notificationsTable)
          .where(and(eq(notificationsTable.id, recent[0].id), eq(notificationsTable.status, "unread")))
          .limit(1)).length > 0
      : false;
    if (alreadyUnread) return;

    await db.insert(notificationsTable).values({
      type: n.type,
      title: n.title,
      message: n.message ?? null,
      entityType: n.entityType ?? null,
      entityId: n.entityId ?? null,
      clientId: n.clientId ?? null,
      clientName: n.clientName ?? null,
      priority: n.priority ?? "medium",
      actionUrl: n.actionUrl ?? null,
      status: "unread",
    });
    created++;
    types[n.type] = (types[n.type] ?? 0) + 1;
  }

  /* ── 1. Overdue tasks ── */
  const overdueTasks = await db
    .select({ t: auditTasksTable, c: auditClientsTable })
    .from(auditTasksTable)
    .leftJoin(auditClientsTable, eq(auditTasksTable.clientId, auditClientsTable.id))
    .where(lte(auditTasksTable.dueDate, td));

  for (const { t, c } of overdueTasks) {
    if (!t.dueDate || ["completed","archived"].includes(t.status)) continue;
    const daysOverdue = Math.floor((Date.now() - new Date(t.dueDate).getTime()) / 86400000);
    const priority    = daysOverdue >= 7 ? "critical" : daysOverdue >= 3 ? "high" : "medium";
    await notify({
      type: "overdue_task", priority,
      title: `Overdue Task: ${t.title}`,
      message: `Task is ${daysOverdue} day${daysOverdue!==1?"s":""} overdue${t.assignee ? ` (${t.assignee})` : ""}`,
      entityType: "task", entityId: t.id,
      clientId: t.clientId, clientName: c?.name ?? undefined,
      actionUrl: `/auditor/clients/${t.clientId}?tab=tasks`,
    });
  }

  /* ── 2. Upcoming compliance deadlines ── */
  const upcoming = await db
    .select({ e: complianceEventsTable, c: auditClientsTable })
    .from(complianceEventsTable)
    .leftJoin(auditClientsTable, eq(complianceEventsTable.clientId, auditClientsTable.id))
    .where(eq(complianceEventsTable.status, "pending"));

  for (const { e, c } of upcoming) {
    if (!e.dueDate) continue;
    const daysLeft = Math.floor((new Date(e.dueDate).getTime() - Date.now()) / 86400000);
    if (daysLeft < 0) {
      await notify({
        type: "overdue_compliance", priority: "critical",
        title: `Overdue: ${e.title}`,
        message: `Compliance deadline was ${Math.abs(daysLeft)} day${Math.abs(daysLeft)!==1?"s":""} ago`,
        entityType: "compliance_event", entityId: e.id,
        clientId: e.clientId ?? undefined, clientName: c?.name ?? undefined,
        actionUrl: e.clientId ? `/auditor/clients/${e.clientId}?tab=compliance` : "/auditor",
      });
    } else if (daysLeft <= 1) {
      await notify({
        type: "deadline_tomorrow", priority: "critical",
        title: `Due Tomorrow: ${e.title}`,
        message: c?.name ? `Client: ${c.name}` : undefined,
        entityType: "compliance_event", entityId: e.id,
        clientId: e.clientId ?? undefined, clientName: c?.name ?? undefined,
        actionUrl: e.clientId ? `/auditor/clients/${e.clientId}?tab=compliance` : "/auditor",
      });
    } else if (daysLeft <= 3) {
      await notify({
        type: "deadline_3days", priority: "high",
        title: `Due in ${daysLeft} days: ${e.title}`,
        message: c?.name ? `Client: ${c.name}` : undefined,
        entityType: "compliance_event", entityId: e.id,
        clientId: e.clientId ?? undefined, clientName: c?.name ?? undefined,
        actionUrl: e.clientId ? `/auditor/clients/${e.clientId}?tab=compliance` : "/auditor",
      });
    } else if (daysLeft <= 7) {
      await notify({
        type: "deadline_7days", priority: "medium",
        title: `Upcoming: ${e.title} (${daysLeft}d)`,
        message: c?.name ? `Client: ${c.name}` : undefined,
        entityType: "compliance_event", entityId: e.id,
        clientId: e.clientId ?? undefined, clientName: c?.name ?? undefined,
        actionUrl: e.clientId ? `/auditor/clients/${e.clientId}?tab=compliance` : "/auditor",
      });
    }
  }

  /* ── 3. Stale queries (no response for >3 days after "sent") ── */
  const staleDate = new Date(Date.now() - 3 * 86400000).toISOString();
  const staleQueries = await db
    .select({ q: auditQueriesTable, c: auditClientsTable })
    .from(auditQueriesTable)
    .leftJoin(auditClientsTable, eq(auditQueriesTable.clientId, auditClientsTable.id));

  for (const { q, c } of staleQueries) {
    if (!["sent","acknowledged"].includes(q.status)) continue;
    const updatedAt = q.updatedAt?.toISOString() ?? q.createdAt?.toISOString() ?? "";
    if (updatedAt < staleDate) {
      const daysWaiting = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
      await notify({
        type: "query_followup", priority: daysWaiting >= 7 ? "high" : "medium",
        title: `Follow-up Needed: ${q.title}`,
        message: `Query has been ${q.status} for ${daysWaiting} day${daysWaiting!==1?"s":""} without response`,
        entityType: "query", entityId: q.id,
        clientId: q.clientId, clientName: c?.name ?? undefined,
        actionUrl: `/auditor/clients/${q.clientId}?tab=queries`,
      });
    }
  }

  /* ── 4. Tasks without assignees ── */
  const unassigned = await db
    .select({ t: auditTasksTable, c: auditClientsTable })
    .from(auditTasksTable)
    .leftJoin(auditClientsTable, eq(auditTasksTable.clientId, auditClientsTable.id));

  let unassignedCount = 0;
  for (const { t } of unassigned) {
    if (!["completed","archived","created"].includes(t.status)) continue;
    if (!t.assignee || t.assignee.trim() === "") unassignedCount++;
  }
  if (unassignedCount > 0) {
    await notify({
      type: "unassigned_tasks", priority: "low",
      title: `${unassignedCount} task${unassignedCount!==1?"s":""} without assignee`,
      message: "Assign team members to ensure accountability",
      entityType: "task",
      actionUrl: "/auditor?tab=workload",
    });
  }

  /* ── 5. Overdue collaboration requests ── */
  const overdueCollab = await db
    .select({ r: collaborationRequestsTable, c: auditClientsTable })
    .from(collaborationRequestsTable)
    .leftJoin(auditClientsTable, eq(collaborationRequestsTable.clientId, auditClientsTable.id))
    .where(
      and(
        lt(collaborationRequestsTable.dueDate, td),
        notInArray(collaborationRequestsTable.status, ["completed", "cancelled", "overdue"])
      )
    );

  for (const { r, c } of overdueCollab) {
    if (!r.dueDate) continue;
    const daysOverdue = Math.floor((Date.now() - new Date(r.dueDate).getTime()) / 86400000);
    await notify({
      type: "overdue_collaboration", priority: daysOverdue >= 7 ? "critical" : "high",
      title: `Overdue Request: ${r.title}`,
      message: `Document/info request is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue${c?.name ? ` · ${c.name}` : ""}`,
      entityType: "collaboration_request", entityId: r.id,
      clientId: r.clientId ?? undefined, clientName: c?.name ?? undefined,
      actionUrl: "/auditor?tab=collaboration",
    });
  }

  /* ── 6. Stale collaboration requests (no activity for 5+ days) ── */
  const stale5 = new Date(Date.now() - 5 * 86400000).toISOString();
  const staleCollab = await db
    .select({ r: collaborationRequestsTable, c: auditClientsTable })
    .from(collaborationRequestsTable)
    .leftJoin(auditClientsTable, eq(collaborationRequestsTable.clientId, auditClientsTable.id));

  for (const { r, c } of staleCollab) {
    if (!["pending", "in_progress"].includes(r.status)) continue;
    const updatedAt = r.updatedAt?.toISOString() ?? r.createdAt?.toISOString() ?? "";
    if (updatedAt >= stale5) continue;
    const daysStale = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
    await notify({
      type: "stale_collaboration", priority: "medium",
      title: `No Activity: ${r.title}`,
      message: `Collaboration request has been ${r.status} for ${daysStale} day${daysStale !== 1 ? "s" : ""} with no updates${c?.name ? ` · ${c.name}` : ""}`,
      entityType: "collaboration_request", entityId: r.id,
      clientId: r.clientId ?? undefined, clientName: c?.name ?? undefined,
      actionUrl: "/auditor?tab=collaboration",
    });
  }

  return { created, types };
}

export default router;
