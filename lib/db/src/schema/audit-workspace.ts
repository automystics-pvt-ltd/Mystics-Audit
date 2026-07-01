import { pgTable, serial, text, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditClientsTable = pgTable("audit_clients", {
  id:              serial("id").primaryKey(),
  name:            text("name").notNull(),
  pan:             text("pan"),
  gstin:           text("gstin"),
  contactName:     text("contact_name"),
  contactEmail:    text("contact_email"),
  contactPhone:    text("contact_phone"),
  address:         text("address"),
  city:            text("city"),
  state:           text("state"),
  engagementTypes: text("engagement_types").notNull().default("[]"),
  engagementPhase: text("engagement_phase").notNull().default("planning"),
  status:          text("status").notNull().default("active"),
  notes:           text("notes"),
  orgId:           integer("org_id").notNull().default(1),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const auditTasksTable = pgTable("audit_tasks", {
  id:           serial("id").primaryKey(),
  clientId:     integer("client_id").notNull().references(() => auditClientsTable.id),
  title:        text("title").notNull(),
  taskType:     text("task_type").notNull().default("document_request"),
  phase:        text("phase").notNull().default("planning"),
  description:  text("description"),
  instructions: text("instructions"),
  status:       text("status").notNull().default("created"),
  priority:     text("priority").notNull().default("medium"),
  dueDate:      text("due_date"),
  assignee:     text("assignee"),
  checklist:    text("checklist").notNull().default("[]"),
  createdBy:    text("created_by").notNull().default("Current User"),
  orgId:        integer("org_id").notNull().default(1),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const auditTaskCommentsTable = pgTable("audit_task_comments", {
  id:         serial("id").primaryKey(),
  taskId:     integer("task_id").notNull().references(() => auditTasksTable.id),
  author:     text("author").notNull().default("Current User"),
  authorType: text("author_type").notNull().default("auditor"),
  message:    text("message").notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const complianceEventsTable = pgTable("compliance_events", {
  id:          serial("id").primaryKey(),
  clientId:    integer("client_id").references(() => auditClientsTable.id),
  eventType:   text("event_type").notNull().default("custom"),
  title:       text("title").notNull(),
  period:      text("period"),
  dueDate:     text("due_date").notNull(),
  status:      text("status").notNull().default("pending"),
  filedDate:   text("filed_date"),
  notes:       text("notes"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  orgId:       integer("org_id").notNull().default(1),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const auditFindingsTable = pgTable("audit_findings", {
  id:                 serial("id").primaryKey(),
  clientId:           integer("client_id").notNull().references(() => auditClientsTable.id),
  title:              text("title").notNull(),
  description:        text("description"),
  category:           text("category").notNull().default("compliance"),
  severity:           text("severity").notNull().default("medium"),
  status:             text("status").notNull().default("open"),
  recommendation:     text("recommendation"),
  managementResponse: text("management_response"),
  period:             text("period"),
  dueDate:            date("due_date", { mode: "string" }),
  resolvedDate:       date("resolved_date", { mode: "string" }),
  raisedBy:           text("raised_by"),
  assignedTo:         text("assigned_to"),
  orgId:              integer("org_id").notNull().default(1),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const auditQueriesTable = pgTable("audit_queries", {
  id:             serial("id").primaryKey(),
  clientId:       integer("client_id").notNull().references(() => auditClientsTable.id),
  taskId:         integer("task_id"),
  queryNo:        text("query_no"),
  title:          text("title").notNull(),
  description:    text("description"),
  queryType:      text("query_type").notNull().default("information_request"),
  status:         text("status").notNull().default("raised"),
  priority:       text("priority").notNull().default("medium"),
  raisedBy:       text("raised_by"),
  assignedTo:     text("assigned_to"),
  dueDate:        text("due_date"),
  clientResponse: text("client_response"),
  auditorNote:    text("auditor_note"),
  period:         text("period"),
  orgId:          integer("org_id").notNull().default(1),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const auditWorkingPapersTable = pgTable("audit_working_papers", {
  id:          serial("id").primaryKey(),
  clientId:    integer("client_id").notNull().references(() => auditClientsTable.id),
  wpNo:        text("wp_no"),
  title:       text("title").notNull(),
  section:     text("section").notNull().default("planning"),
  description: text("description"),
  preparedBy:  text("prepared_by"),
  reviewedBy:  text("reviewed_by"),
  status:      text("status").notNull().default("draft"),
  riskArea:    text("risk_area"),
  assertions:  text("assertions"),
  conclusion:  text("conclusion"),
  period:      text("period"),
  orgId:       integer("org_id").notNull().default(1),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAuditClientSchema      = createInsertSchema(auditClientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditTaskSchema        = createInsertSchema(auditTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertComplianceEventSchema  = createInsertSchema(complianceEventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditFindingSchema     = createInsertSchema(auditFindingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditQuerySchema       = createInsertSchema(auditQueriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditWorkingPaperSchema = createInsertSchema(auditWorkingPapersTable).omit({ id: true, createdAt: true, updatedAt: true });

export type AuditClient       = typeof auditClientsTable.$inferSelect;
export type AuditTask         = typeof auditTasksTable.$inferSelect;
export type AuditTaskComment  = typeof auditTaskCommentsTable.$inferSelect;
export type ComplianceEvent   = typeof complianceEventsTable.$inferSelect;
export type AuditFinding      = typeof auditFindingsTable.$inferSelect;
export type AuditQuery        = typeof auditQueriesTable.$inferSelect;
export type AuditWorkingPaper = typeof auditWorkingPapersTable.$inferSelect;

export const notificationsTable = pgTable("notifications", {
  id:          serial("id").primaryKey(),
  type:        text("type").notNull().default("info"),
  title:       text("title").notNull(),
  message:     text("message"),
  entityType:  text("entity_type"),
  entityId:    integer("entity_id"),
  clientId:    integer("client_id"),
  clientName:  text("client_name"),
  status:      text("status").notNull().default("unread"),
  priority:    text("priority").notNull().default("medium"),
  actionUrl:   text("action_url"),
  orgId:       integer("org_id").notNull().default(1),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const automationRulesTable = pgTable("automation_rules", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  ruleType:    text("rule_type").notNull().default("reminder"),
  description: text("description"),
  config:      text("config").notNull().default("{}"),
  isActive:    boolean("is_active").notNull().default(true),
  clientId:    integer("client_id"),
  orgId:       integer("org_id").notNull().default(1),
  lastRunAt:   timestamp("last_run_at", { withTimezone: true }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Notification    = typeof notificationsTable.$inferSelect;
export type AutomationRule  = typeof automationRulesTable.$inferSelect;

/* ── Auditor-Client Collaboration ───────────────────────────── */

export const collaborationRequestsTable = pgTable("collaboration_requests", {
  id:          serial("id").primaryKey(),
  clientId:    integer("client_id").notNull().references(() => auditClientsTable.id),
  title:       text("title").notNull(),
  description: text("description"),
  requestType: text("request_type").notNull().default("document"),
  priority:    text("priority").notNull().default("medium"),
  dueDate:     text("due_date"),
  status:      text("status").notNull().default("pending"),
  assignedTo:  text("assigned_to"),
  createdBy:   text("created_by"),
  tags:        text("tags"),
  orgId:       integer("org_id").notNull().default(1),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const collaborationMessagesTable = pgTable("collaboration_messages", {
  id:          serial("id").primaryKey(),
  requestId:   integer("request_id").notNull().references(() => collaborationRequestsTable.id),
  senderRole:  text("sender_role").notNull().default("auditor"),
  senderName:  text("sender_name"),
  message:     text("message"),
  messageType: text("message_type").notNull().default("message"),
  fromStatus:  text("from_status"),
  toStatus:    text("to_status"),
  attachments: text("attachments").notNull().default("[]"),
  orgId:       integer("org_id").notNull().default(1),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCollaborationRequestSchema = createInsertSchema(collaborationRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCollaborationMessageSchema  = createInsertSchema(collaborationMessagesTable).omit({ id: true, createdAt: true });

export type CollaborationRequest = typeof collaborationRequestsTable.$inferSelect;
export type CollaborationMessage = typeof collaborationMessagesTable.$inferSelect;
