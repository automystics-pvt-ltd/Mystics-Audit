import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq, and, or, desc, sql, ilike } from "drizzle-orm";

const router = Router();

// ── File storage (local disk) ───────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, "_").toLowerCase();
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

function detectFileType(mime: string, filename: string): string {
  if (mime.startsWith("image/")) return "image";
  const ext = path.extname(filename).toLowerCase();
  if ([".xlsx", ".xls"].includes(ext)) return "excel";
  if (ext === ".csv")  return "csv";
  if ([".doc", ".docx"].includes(ext)) return "word";
  if (ext === ".pdf" || mime === "application/pdf") return "pdf";
  return "other";
}

// ── GET /documents/summary ──────────────────────────────────────────────────
router.get("/documents/summary", async (req, res) => {
  try {
    const [totals] = await db.select({
      total:       sql<number>`count(*)`,
      totalSize:   sql<number>`coalesce(sum(size_bytes),0)`,
      filed:       sql<number>`count(*) filter (where filing_status='filed')`,
      unfiled:     sql<number>`count(*) filter (where filing_status='unfiled')`,
      linked:      sql<number>`count(*) filter (where linked_entity_type is not null)`,
      pdfCount:    sql<number>`count(*) filter (where file_type='pdf')`,
      imageCount:  sql<number>`count(*) filter (where file_type='image')`,
      excelCount:  sql<number>`count(*) filter (where file_type='excel')`,
    }).from(documentsTable);

    const byCategory = await db.select({
      docCategory: documentsTable.docCategory,
      count:     sql<number>`count(*)`,
      totalSize: sql<number>`coalesce(sum(size_bytes),0)`,
    }).from(documentsTable).groupBy(documentsTable.docCategory).orderBy(desc(sql`count(*)`));

    const byFY = await db.select({
      financialYear: documentsTable.financialYear,
      count: sql<number>`count(*)`,
    }).from(documentsTable).groupBy(documentsTable.financialYear).orderBy(desc(documentsTable.financialYear));

    const byPeriod = await db.select({
      period: documentsTable.period,
      count: sql<number>`count(*)`,
    }).from(documentsTable)
      .where(sql`period is not null and period != ''`)
      .groupBy(documentsTable.period)
      .orderBy(desc(documentsTable.period));

    const recentDocs = await db.select().from(documentsTable).orderBy(desc(documentsTable.createdAt)).limit(5);

    res.json({ totals, byCategory, byFY, byPeriod, recentDocs });
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e.message }); }
});

// ── GET /documents ───────────────────────────────────────────────────────────
router.get("/documents", async (req, res) => {
  try {
    const { search, docCategory, financialYear, period, filingStatus, department, project } = req.query as Record<string, string>;
    const conditions: any[] = [];
    if (docCategory)   conditions.push(eq(documentsTable.docCategory, docCategory));
    if (financialYear) conditions.push(eq(documentsTable.financialYear, financialYear));
    if (period)        conditions.push(eq(documentsTable.period, period));
    if (filingStatus)  conditions.push(eq(documentsTable.filingStatus, filingStatus));
    if (department)    conditions.push(eq(documentsTable.department, department));
    if (project)       conditions.push(eq(documentsTable.project, project));
    if (search) conditions.push(or(
      ilike(documentsTable.name, `%${search}%`),
      ilike(documentsTable.originalName, `%${search}%`),
      ilike(documentsTable.vendorName, `%${search}%`),
      ilike(documentsTable.description, `%${search}%`),
      ilike(documentsTable.linkedEntityRef, `%${search}%`),
    ) as any);

    const docs = await db.select().from(documentsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(documentsTable.createdAt));
    res.json(docs);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e.message }); }
});

// ── GET /documents/file/:id  (serve file) ───────────────────────────────────
router.get("/documents/file/:id", async (req, res) => {
  try {
    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, parseInt(req.params.id)));
    if (!doc) { res.status(404).json({ error: "Not found" }); return; }
    if (!doc.fileUrl) { res.status(404).json({ error: "No file stored" }); return; }

    // If fileUrl is an absolute HTTP(S) URL, redirect to it directly
    if (doc.fileUrl.startsWith("http://") || doc.fileUrl.startsWith("https://")) {
      res.redirect(302, doc.fileUrl);
      return;
    }

    // fileUrl is stored as the disk filename (e.g. "1234_invoice.pdf")
    const filePath = path.join(UPLOADS_DIR, doc.fileUrl);
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File not found on disk" }); return; }

    res.setHeader("Content-Type", doc.mimeType ?? "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName ?? doc.name)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e.message }); }
});

// ── GET /documents/:id ───────────────────────────────────────────────────────
router.get("/documents/:id", async (req, res) => {
  try {
    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, parseInt(req.params.id)));
    if (!doc) { res.status(404).json({ error: "Not found" }); return; }
    res.json(doc);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e.message }); }
});

// ── POST /documents/upload  (multipart upload + create record) ───────────────
router.post("/documents/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

    const body = req.body ?? {};
    const fileType = detectFileType(req.file.mimetype, req.file.originalname);

    const [doc] = await db.insert(documentsTable).values({
      name:             body.name || req.file.originalname,
      originalName:     req.file.originalname,
      fileType,
      mimeType:         req.file.mimetype,
      sizeBytes:        req.file.size,
      fileUrl:          req.file.filename,   // store disk filename, served via /documents/file/:id
      docCategory:      body.docCategory  || "supporting",
      financialYear:    body.financialYear || undefined,
      period:           body.period       || undefined,
      gstPeriod:        body.gstPeriod    || undefined,
      vendorName:       body.vendorName   || undefined,
      project:          body.project      || undefined,
      department:       body.department   || undefined,
      clientName:       body.clientName   || undefined,
      tags:             body.tags         || "[]",
      description:      body.description  || undefined,
      linkedEntityType: body.linkedEntityType || undefined,
      linkedEntityRef:  body.linkedEntityRef  || undefined,
      filingStatus:     body.filingStatus || "unfiled",
      uploadedBy:       body.uploadedBy   || "Current User",
    }).returning();

    res.status(201).json(doc);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e.message }); }
});

// ── POST /documents  (metadata-only record) ──────────────────────────────────
router.post("/documents", async (req, res) => {
  try {
    const b = req.body;
    const [doc] = await db.insert(documentsTable).values({
      name:             b.name || b.originalName,
      originalName:     b.originalName,
      fileType:         b.fileType || "pdf",
      mimeType:         b.mimeType || "application/pdf",
      sizeBytes:        b.sizeBytes || 0,
      fileUrl:          b.fileUrl,
      docCategory:      b.docCategory  || "supporting",
      financialYear:    b.financialYear,
      period:           b.period,
      gstPeriod:        b.gstPeriod,
      vendorName:       b.vendorName,
      project:          b.project,
      department:       b.department,
      clientName:       b.clientName,
      tags:             b.tags || "[]",
      description:      b.description,
      linkedEntityType: b.linkedEntityType,
      linkedEntityRef:  b.linkedEntityRef,
      filingStatus:     b.filingStatus || "unfiled",
      uploadedBy:       b.uploadedBy   || "Current User",
    }).returning();
    res.status(201).json(doc);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e.message }); }
});

// ── PATCH /documents/:id ─────────────────────────────────────────────────────
router.patch("/documents/:id", async (req, res) => {
  try {
    const allowed = ["name","docCategory","financialYear","period","gstPeriod","vendorName","project","department","clientName","tags","description","filingStatus","linkedEntityType","linkedEntityRef","notes"];
    const updates: Record<string, any> = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const [doc] = await db.update(documentsTable).set(updates).where(eq(documentsTable.id, parseInt(req.params.id))).returning();
    if (!doc) { res.status(404).json({ error: "Not found" }); return; }
    res.json(doc);
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e.message }); }
});

// ── DELETE /documents/:id ────────────────────────────────────────────────────
router.delete("/documents/:id", async (req, res) => {
  try {
    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, parseInt(req.params.id)));
    if (doc?.fileUrl) {
      const filePath = path.join(UPLOADS_DIR, doc.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.delete(documentsTable).where(eq(documentsTable.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e.message }); }
});

export default router;
