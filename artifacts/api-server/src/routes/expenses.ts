import { Router } from "express";
import { db, expenseClaimsTable, expenseLinesTable, expenseApprovalLogsTable } from "@workspace/db";
import { eq, and, desc, gte, lte, ilike } from "drizzle-orm";

const router = Router();

let expSeq = 100;
function nextClaimNo() {
  expSeq++;
  return `EXP-${new Date().getFullYear()}-${String(expSeq).padStart(5, "0")}`;
}

async function getClaimWithLines(id: number) {
  const [claim] = await db.select().from(expenseClaimsTable).where(eq(expenseClaimsTable.id, id));
  if (!claim) return null;
  const lines = await db.select().from(expenseLinesTable).where(eq(expenseLinesTable.claimId, id)).orderBy(expenseLinesTable.id);
  const logs  = await db.select().from(expenseApprovalLogsTable).where(eq(expenseApprovalLogsTable.claimId, id)).orderBy(expenseApprovalLogsTable.createdAt);
  return {
    ...claim,
    totalAmount: Number(claim.totalAmount),
    approvedAmount: claim.approvedAmount ? Number(claim.approvedAmount) : null,
    lines: lines.map(l => ({ ...l, amount: Number(l.amount), gstAmount: Number(l.gstAmount), gstRate: l.gstRate ? Number(l.gstRate) : null })),
    approvalLogs: logs.map(lg => ({ ...lg, amount: lg.amount ? Number(lg.amount) : null })),
  };
}

/* ── List ── */
router.get("/expenses", async (req, res) => {
  try {
    const { status, department, project, branch, costCenter, clientName, from, to, search } = req.query as Record<string, string>;
    let query = db.select().from(expenseClaimsTable).$dynamic();
    const conditions = [];
    if (status)     conditions.push(eq(expenseClaimsTable.status, status));
    if (department) conditions.push(eq(expenseClaimsTable.department, department));
    if (project)    conditions.push(eq(expenseClaimsTable.project, project));
    if (branch)     conditions.push(eq(expenseClaimsTable.branch, branch));
    if (costCenter) conditions.push(eq(expenseClaimsTable.costCenter, costCenter));
    if (clientName) conditions.push(eq(expenseClaimsTable.clientName, clientName));
    if (from)       conditions.push(gte(expenseClaimsTable.submittedDate, from));
    if (to)         conditions.push(lte(expenseClaimsTable.submittedDate, to));
    if (search)     conditions.push(ilike(expenseClaimsTable.employeeName, `%${search}%`));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(expenseClaimsTable.createdAt)).limit(200);
    res.json(rows.map(r => ({
      ...r,
      totalAmount: Number(r.totalAmount),
      approvedAmount: r.approvedAmount ? Number(r.approvedAmount) : null,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

/* ── Create ── */
router.post("/expenses", async (req, res) => {
  try {
    const {
      employeeName, submittedDate, status, currentApprover, notes, lines,
      project, department, branch, costCenter, clientName, paymentMethod,
    } = req.body;
    const totalAmount = (lines || []).reduce((s: number, l: any) => s + Number(l.amount || 0), 0);
    const policyViolations = (lines || []).filter((l: any) => l.policyViolation).length;

    const [claim] = await db.insert(expenseClaimsTable).values({
      claimNo: nextClaimNo(),
      employeeName: employeeName || "Current User",
      submittedDate: submittedDate || new Date().toISOString().split("T")[0],
      totalAmount: String(totalAmount),
      status: status || "submitted",
      currentApprover: currentApprover || null,
      project: project || null, department: department || null,
      branch: branch || null, costCenter: costCenter || null,
      clientName: clientName || null, paymentMethod: paymentMethod || null,
      policyViolations,
      notes,
    }).returning();

    if (lines?.length) {
      await db.insert(expenseLinesTable).values(
        lines.map((l: any) => ({
          claimId: claim.id,
          date: l.date,
          category: l.category,
          subCategory: l.subCategory || null,
          amount: String(l.amount),
          currency: l.currency || "INR",
          vendorName: l.vendorName || null,
          vendorGstin: l.vendorGstin || null,
          description: l.description,
          receiptUrl: l.receiptUrl || null,
          gstAmount: String(l.gstAmount || 0),
          gstRate: l.gstRate ? String(l.gstRate) : null,
          hsnCode: l.hsnCode || null,
          billable: l.billable || false,
          policyViolation: l.policyViolation || false,
          violationReason: l.violationReason || null,
        }))
      );
    }

    // Log submission
    await db.insert(expenseApprovalLogsTable).values({
      claimId: claim.id, level: 0, action: "submitted",
      actorName: employeeName || "Current User",
      comment: notes || null, amount: String(totalAmount),
    });

    const result = await getClaimWithLines(claim.id);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create expense claim" });
  }
});

/* ── Analytics ── */
router.get("/expenses/analytics", async (req, res) => {
  try {
    const claims = await db.select().from(expenseClaimsTable);
    const totalAmount   = claims.reduce((s, c) => s + Number(c.totalAmount), 0);
    const totalApproved = claims.filter(c => ["approved","reimbursed","paid"].includes(c.status)).reduce((s, c) => s + Number(c.totalAmount), 0);
    const totalPending  = claims.filter(c => c.status === "submitted").reduce((s, c) => s + Number(c.totalAmount), 0);
    const totalRejected = claims.filter(c => c.status === "rejected").reduce((s, c) => s + Number(c.totalAmount), 0);
    const totalReimbursed = claims.filter(c => c.status === "reimbursed").reduce((s, c) => s + Number(c.totalAmount), 0);

    // Aggregate by department
    const deptMap: Record<string, number> = {};
    for (const c of claims) {
      const d = c.department || "General";
      deptMap[d] = (deptMap[d] || 0) + Number(c.totalAmount);
    }
    const byDept = Object.entries(deptMap).map(([dept, amount]) => ({
      department: dept, amount,
      budget: amount * 1.3, utilizationPct: Math.round((amount / (amount * 1.3)) * 100),
    }));

    // Aggregate by project
    const projMap: Record<string, number> = {};
    for (const c of claims) {
      const p = c.project || "No Project";
      projMap[p] = (projMap[p] || 0) + Number(c.totalAmount);
    }
    const byProject = Object.entries(projMap).map(([project, amount]) => ({ project, amount }));

    // Aggregate by status
    const byStatus = [
      { status: "Submitted", count: claims.filter(c => c.status === "submitted").length, amount: totalPending },
      { status: "Approved",  count: claims.filter(c => c.status === "approved").length,  amount: totalApproved },
      { status: "Rejected",  count: claims.filter(c => c.status === "rejected").length,  amount: totalRejected },
      { status: "Reimbursed",count: claims.filter(c => c.status === "reimbursed").length,amount: totalReimbursed },
      { status: "Paid",      count: claims.filter(c => c.status === "paid").length,      amount: claims.filter(c=>c.status==="paid").reduce((s,c)=>s+Number(c.totalAmount),0) },
    ];

    // Category breakdown from lines
    const lines = await db.select().from(expenseLinesTable);
    const catMap: Record<string, { amount: number; count: number }> = {};
    for (const l of lines) {
      const cat = l.category;
      if (!catMap[cat]) catMap[cat] = { amount: 0, count: 0 };
      catMap[cat].amount += Number(l.amount);
      catMap[cat].count++;
    }
    const catTotal = Object.values(catMap).reduce((s, v) => s + v.amount, 0) || 1;
    const byCategory = Object.entries(catMap)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([category, v]) => ({ category, amount: v.amount, count: v.count, pct: Math.round((v.amount / catTotal) * 100) }));

    res.json({
      totalAmount, totalApproved, totalPending, totalRejected, totalReimbursed,
      byCategory: byCategory.length ? byCategory : [
        { category: "Travel", amount: totalAmount * 0.30, count: 8, pct: 30 },
        { category: "Office Supplies", amount: totalAmount * 0.20, count: 5, pct: 20 },
        { category: "Fuel", amount: totalAmount * 0.15, count: 12, pct: 15 },
        { category: "Meals & Food", amount: totalAmount * 0.20, count: 10, pct: 20 },
        { category: "Internet & Telecom", amount: totalAmount * 0.10, count: 3, pct: 10 },
        { category: "Other", amount: totalAmount * 0.05, count: 4, pct: 5 },
      ],
      byDepartment: byDept.length ? byDept : [
        { department: "Sales", amount: totalAmount * 0.4, budget: totalAmount * 0.5, utilizationPct: 80 },
        { department: "Engineering", amount: totalAmount * 0.25, budget: totalAmount * 0.3, utilizationPct: 83 },
        { department: "Finance", amount: totalAmount * 0.15, budget: totalAmount * 0.2, utilizationPct: 75 },
        { department: "Operations", amount: totalAmount * 0.20, budget: totalAmount * 0.25, utilizationPct: 80 },
      ],
      byProject: byProject.length ? byProject : [
        { project: "No Project", amount: totalAmount },
      ],
      byStatus,
      policyViolations: claims.reduce((s, c) => s + c.policyViolations, 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get analytics" });
  }
});

/* ── Dimensions meta ── */
router.get("/expenses/dimensions", async (req, res) => {
  try {
    const rows = await db.select().from(expenseClaimsTable);
    const unique = (fn: (r: typeof rows[0]) => string | null) =>
      [...new Set(rows.map(fn).filter(Boolean))].sort() as string[];
    res.json({
      departments: unique(r => r.department),
      projects:    unique(r => r.project),
      branches:    unique(r => r.branch),
      costCenters: unique(r => r.costCenter),
      clients:     unique(r => r.clientName),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dimensions" });
  }
});

/* ── Detail ── */
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

/* ── Approve / Reject / Forward ── */
router.post("/expenses/:id/approve", async (req, res) => {
  try {
    const { action, comment, adjustedAmount, actorName, level } = req.body;
    let newStatus: string;
    if (action === "approve")  newStatus = "approved";
    else if (action === "reject")   newStatus = "rejected";
    else if (action === "reimburse") newStatus = "reimbursed";
    else if (action === "pay")      newStatus = "paid";
    else if (action === "forward")  newStatus = "submitted"; // stays submitted, moves to next level
    else newStatus = "submitted";

    const updateData: Partial<typeof expenseClaimsTable.$inferInsert> = {
      status: newStatus,
      updatedAt: new Date(),
    };
    if (adjustedAmount) updateData.approvedAmount = String(adjustedAmount);
    if (newStatus === "reimbursed") updateData.reimbursementStatus = "reimbursed";
    if (newStatus === "paid") updateData.reimbursementStatus = "reimbursed";
    if (action === "forward" && level) updateData.approvalLevel = Number(level) + 1;

    const [claim] = await db.update(expenseClaimsTable)
      .set(updateData)
      .where(eq(expenseClaimsTable.id, Number(req.params.id)))
      .returning();
    if (!claim) { res.status(404).json({ error: "Not found" }); return; }

    await db.insert(expenseApprovalLogsTable).values({
      claimId: claim.id,
      level: level ? Number(level) : 1,
      action,
      actorName: actorName || "Manager",
      comment: comment || null,
      amount: adjustedAmount ? String(adjustedAmount) : null,
    });

    const result = await getClaimWithLines(claim.id);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to process approval" });
  }
});

export default router;
