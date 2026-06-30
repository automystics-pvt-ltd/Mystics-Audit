import { Router } from "express";
import { db, expenseClaimsTable, expenseLinesTable } from "@workspace/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

const router = Router();

let expSeq = 100;
function nextClaimNo() {
  expSeq++;
  return `EXP-${new Date().getFullYear()}-${String(expSeq).padStart(5, "0")}`;
}

async function getClaimWithLines(id: number) {
  const [claim] = await db.select().from(expenseClaimsTable).where(eq(expenseClaimsTable.id, id));
  if (!claim) return null;
  const lines = await db.select().from(expenseLinesTable).where(eq(expenseLinesTable.claimId, id));
  return {
    ...claim,
    totalAmount: Number(claim.totalAmount),
    approvedAmount: claim.approvedAmount ? Number(claim.approvedAmount) : null,
    lines: lines.map(l => ({
      ...l,
      amount: Number(l.amount),
      gstAmount: Number(l.gstAmount),
    })),
  };
}

router.get("/expenses", async (req, res) => {
  try {
    const { status, employeeId, from, to } = req.query as Record<string, string>;
    let query = db.select().from(expenseClaimsTable).$dynamic();
    const conditions = [];
    if (status) conditions.push(eq(expenseClaimsTable.status, status));
    if (from) conditions.push(gte(expenseClaimsTable.submittedDate, from));
    if (to) conditions.push(lte(expenseClaimsTable.submittedDate, to));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(expenseClaimsTable.createdAt)).limit(100);
    res.json(rows.map(r => ({
      ...r,
      totalAmount: Number(r.totalAmount),
      approvedAmount: r.approvedAmount ? Number(r.approvedAmount) : null,
      lines: [],
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.post("/expenses", async (req, res) => {
  try {
    const { employeeName, submittedDate, status, currentApprover, notes, lines } = req.body;
    const totalAmount = (lines || []).reduce((s: number, l: any) => s + Number(l.amount || 0), 0);
    const policyViolations = (lines || []).filter((l: any) => l.policyViolation).length;

    const [claim] = await db.insert(expenseClaimsTable).values({
      claimNo: nextClaimNo(),
      employeeName: employeeName || "Current User",
      submittedDate: submittedDate || new Date().toISOString().split("T")[0],
      totalAmount: String(totalAmount),
      status: status || "submitted",
      currentApprover: currentApprover || null,
      policyViolations,
      notes,
    }).returning();

    if (lines?.length) {
      await db.insert(expenseLinesTable).values(
        lines.map((l: any) => ({
          claimId: claim.id,
          date: l.date,
          category: l.category,
          subCategory: l.subCategory,
          amount: String(l.amount),
          currency: l.currency || "INR",
          vendorName: l.vendorName,
          description: l.description,
          gstAmount: String(l.gstAmount || 0),
          vendorGstin: l.vendorGstin,
          policyViolation: l.policyViolation || false,
          violationReason: l.violationReason,
        }))
      );
    }

    const result = await getClaimWithLines(claim.id);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create expense claim" });
  }
});

router.get("/expenses/analytics", async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const period = from && to ? `${from} to ${to}` : "Current Period";
    const claims = await db.select().from(expenseClaimsTable);
    const totalAmount = claims.reduce((s, c) => s + Number(c.totalAmount), 0);
    const totalApproved = claims.filter(c => c.status === "approved").reduce((s, c) => s + Number(c.totalAmount), 0);
    const totalPending = claims.filter(c => c.status === "submitted").reduce((s, c) => s + Number(c.totalAmount), 0);

    res.json({
      period,
      totalAmount,
      totalApproved,
      totalPending,
      byCategory: [
        { category: "Travel", amount: totalAmount * 0.35, count: 12, pct: 35 },
        { category: "Meals", amount: totalAmount * 0.20, count: 28, pct: 20 },
        { category: "Office Supplies", amount: totalAmount * 0.15, count: 8, pct: 15 },
        { category: "Training", amount: totalAmount * 0.20, count: 5, pct: 20 },
        { category: "Other", amount: totalAmount * 0.10, count: 15, pct: 10 },
      ],
      byDepartment: [
        { department: "Sales", amount: totalAmount * 0.4, budget: totalAmount * 0.5, utilizationPct: 80 },
        { department: "Engineering", amount: totalAmount * 0.25, budget: totalAmount * 0.3, utilizationPct: 83 },
        { department: "Finance", amount: totalAmount * 0.15, budget: totalAmount * 0.1, utilizationPct: 150 },
        { department: "HR", amount: totalAmount * 0.2, budget: totalAmount * 0.15, utilizationPct: 133 },
      ],
      policyViolations: claims.reduce((s, c) => s + c.policyViolations, 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get analytics" });
  }
});

router.get("/expenses/:id", async (req, res) => {
  try {
    const result = await getClaimWithLines(Number(req.params.id));
    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch expense claim" });
  }
});

router.post("/expenses/:id/approve", async (req, res) => {
  try {
    const { action, comment, adjustedAmount } = req.body;
    const newStatus = action === "approve" ? "approved" : "rejected";
    const [claim] = await db
      .update(expenseClaimsTable)
      .set({
        status: newStatus,
        approvedAmount: adjustedAmount ? String(adjustedAmount) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(expenseClaimsTable.id, Number(req.params.id)))
      .returning();
    if (!claim) { res.status(404).json({ error: "Not found" }); return; }
    const result = await getClaimWithLines(claim.id);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to process approval" });
  }
});

export default router;
