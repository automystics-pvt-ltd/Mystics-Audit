import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq, and, like, or, desc, sql, ilike } from "drizzle-orm";

const router = Router();

/* ─── GET /documents/summary ─── */
router.get("/documents/summary", async (req, res) => {
  try {
    const [totals] = await db
      .select({
        total:        sql<number>`count(*)`,
        totalSize:    sql<number>`coalesce(sum(size_bytes), 0)`,
        filed:        sql<number>`count(*) filter (where filing_status = 'filed')`,
        unfiled:      sql<number>`count(*) filter (where filing_status = 'unfiled')`,
        linked:       sql<number>`count(*) filter (where linked_entity_type is not null)`,
        pdfCount:     sql<number>`count(*) filter (where file_type = 'pdf')`,
        imageCount:   sql<number>`count(*) filter (where file_type = 'image')`,
        excelCount:   sql<number>`count(*) filter (where file_type = 'excel')`,
      })
      .from(documentsTable);

    const byCategory = await db
      .select({
        docCategory: documentsTable.docCategory,
        count: sql<number>`count(*)`,
        totalSize: sql<number>`coalesce(sum(size_bytes), 0)`,
      })
      .from(documentsTable)
      .groupBy(documentsTable.docCategory)
      .orderBy(desc(sql`count(*)`));

    const byFY = await db
      .select({
        financialYear: documentsTable.financialYear,
        count: sql<number>`count(*)`,
      })
      .from(documentsTable)
      .groupBy(documentsTable.financialYear)
      .orderBy(desc(documentsTable.financialYear));

    const recentDocs = await db
      .select()
      .from(documentsTable)
      .orderBy(desc(documentsTable.createdAt))
      .limit(5);

    res.json({ totals, byCategory, byFY, recentDocs });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /documents ─── */
router.get("/documents", async (req, res) => {
  try {
    const {
      search, docCategory, financialYear, period, gstPeriod,
      vendorName, project, department, expenseCategory,
      filingStatus, linkedEntityType, tag,
    } = req.query as Record<string, string>;

    const conditions: ReturnType<typeof eq>[] = [];

    if (docCategory)      conditions.push(eq(documentsTable.docCategory, docCategory));
    if (financialYear)    conditions.push(eq(documentsTable.financialYear, financialYear));
    if (period)           conditions.push(eq(documentsTable.period, period));
    if (gstPeriod)        conditions.push(eq(documentsTable.gstPeriod, gstPeriod));
    if (vendorName)       conditions.push(eq(documentsTable.vendorName, vendorName));
    if (project)          conditions.push(eq(documentsTable.project, project));
    if (department)       conditions.push(eq(documentsTable.department, department));
    if (expenseCategory)  conditions.push(eq(documentsTable.expenseCategory, expenseCategory));
    if (filingStatus)     conditions.push(eq(documentsTable.filingStatus, filingStatus));
    if (linkedEntityType) conditions.push(eq(documentsTable.linkedEntityType, linkedEntityType));
    if (tag) {
      conditions.push(ilike(documentsTable.tags, `%${tag}%`));
    }
    if (search) {
      conditions.push(
        or(
          ilike(documentsTable.name, `%${search}%`),
          ilike(documentsTable.originalName, `%${search}%`),
          ilike(documentsTable.vendorName, `%${search}%`),
          ilike(documentsTable.ocrText, `%${search}%`),
          ilike(documentsTable.description, `%${search}%`),
          ilike(documentsTable.linkedEntityRef, `%${search}%`),
        ) as any
      );
    }

    const docs = await db
      .select()
      .from(documentsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(documentsTable.createdAt));

    res.json(docs);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /documents/:id ─── */
router.get("/documents/:id", async (req, res) => {
  try {
    const [doc] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, parseInt(req.params.id)));
    if (!doc) { res.status(404).json({ error: "Not found" }); return; }
    res.json(doc);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /documents ─── */
router.post("/documents", async (req, res) => {
  try {
    const {
      name, originalName, fileType, mimeType, sizeBytes, fileUrl, thumbnailUrl,
      docCategory, financialYear, period, gstPeriod,
      vendorName, project, department, expenseCategory, clientName,
      tags, description, ocrText,
      linkedEntityType, linkedEntityId, linkedEntityRef,
      filingStatus, uploadedBy, notes,
    } = req.body;

    const [doc] = await db
      .insert(documentsTable)
      .values({
        name:             name || originalName,
        originalName:     originalName,
        fileType:         fileType || "pdf",
        mimeType:         mimeType || "application/pdf",
        sizeBytes:        sizeBytes || 0,
        fileUrl:          fileUrl,
        thumbnailUrl:     thumbnailUrl,
        docCategory:      docCategory || "supporting",
        financialYear:    financialYear,
        period:           period,
        gstPeriod:        gstPeriod,
        vendorName:       vendorName,
        project:          project,
        department:       department,
        expenseCategory:  expenseCategory,
        clientName:       clientName,
        tags:             tags || "[]",
        description:      description,
        ocrText:          ocrText,
        linkedEntityType: linkedEntityType,
        linkedEntityId:   linkedEntityId ? parseInt(linkedEntityId) : undefined,
        linkedEntityRef:  linkedEntityRef,
        filingStatus:     filingStatus || "unfiled",
        uploadedBy:       uploadedBy || "Current User",
        notes:            notes,
      })
      .returning();
    res.status(201).json(doc);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── PATCH /documents/:id ─── */
router.patch("/documents/:id", async (req, res) => {
  try {
    const updates: Record<string, any> = {};
    const allowed = [
      "name","docCategory","financialYear","period","gstPeriod",
      "vendorName","project","department","expenseCategory","clientName",
      "tags","description","filingStatus","linkedEntityType","linkedEntityId",
      "linkedEntityRef","notes",
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const [doc] = await db
      .update(documentsTable)
      .set(updates)
      .where(eq(documentsTable.id, parseInt(req.params.id)))
      .returning();
    if (!doc) { res.status(404).json({ error: "Not found" }); return; }
    res.json(doc);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── DELETE /documents ─── */
router.delete("/documents/:id", async (req, res) => {
  try {
    await db.delete(documentsTable).where(eq(documentsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
