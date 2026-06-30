import { pgTable, serial, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentsTable = pgTable("documents", {
  id:               serial("id").primaryKey(),
  // File identity
  name:             text("name").notNull(),
  originalName:     text("original_name").notNull(),
  fileType:         text("file_type").notNull().default("pdf"),  // pdf | image | excel | word | csv | other
  mimeType:         text("mime_type").notNull().default("application/pdf"),
  sizeBytes:        integer("size_bytes").notNull().default(0),
  fileUrl:          text("file_url"),                            // stored URL (Object Storage / CDN)
  thumbnailUrl:     text("thumbnail_url"),
  // Classification
  docCategory:      text("doc_category").notNull().default("supporting"), // invoice | bill | receipt | purchase_doc | vendor_invoice | supporting | gst_doc | bank_statement | contract | other
  financialYear:    text("financial_year"),                      // "2025-26"
  period:           text("period"),                              // "2026-06"
  gstPeriod:        text("gst_period"),                         // "2026-06" (for GST filing)
  // Dimensions
  vendorName:       text("vendor_name"),
  project:          text("project"),
  department:       text("department"),
  expenseCategory:  text("expense_category"),
  clientName:       text("client_name"),
  // Tagging & search
  tags:             text("tags").default("[]"),                  // JSON array of strings
  description:      text("description"),
  ocrText:          text("ocr_text"),                           // full-text from OCR
  // Linking to transactions
  linkedEntityType: text("linked_entity_type"),                 // invoice | bill | expense | receipt | payment | journal | gst_doc
  linkedEntityId:   integer("linked_entity_id"),
  linkedEntityRef:  text("linked_entity_ref"),                  // human-readable ref (INV-001, EXP-2026-001)
  // Filing
  filingStatus:     text("filing_status").notNull().default("unfiled"),
  // Version control
  version:          integer("version").notNull().default(1),
  parentDocId:      integer("parent_doc_id"),                   // points to previous version
  isLatestVersion:  boolean("is_latest_version").notNull().default(true),
  // Audit
  uploadedBy:       text("uploaded_by").notNull().default("Current User"),
  orgId:            integer("org_id").notNull().default(1),
  notes:            text("notes"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const auditorSharesTable = pgTable("auditor_shares", {
  id:             serial("id").primaryKey(),
  shareType:      text("share_type").notNull().default("email"),  // email | download
  format:         text("format").notNull().default("pdf"),        // pdf | zip | email
  subject:        text("subject"),
  message:        text("message"),
  recipientEmail: text("recipient_email"),
  recipientName:  text("recipient_name"),
  filterFY:       text("filter_fy"),
  filterPeriod:   text("filter_period"),
  filterProject:  text("filter_project"),
  filterCustomer: text("filter_customer"),
  filterVendor:   text("filter_vendor"),
  docIds:         text("doc_ids").notNull().default("[]"),        // JSON array of doc IDs
  docCount:       integer("doc_count").notNull().default(0),
  status:         text("status").notNull().default("sent"),       // sent | delivered | failed
  sharedBy:       text("shared_by").notNull().default("Current User"),
  notes:          text("notes"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
export type AuditorShare = typeof auditorSharesTable.$inferSelect;
