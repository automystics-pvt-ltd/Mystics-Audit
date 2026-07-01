import { Router } from "express";
import { db, budgetsTable, budgetLinesTable, accountsTable, expenseClaimsTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

/** Parse FY string like "2026-27" into date bounds */
function parseFY(fy?: string): { fyFrom: string; fyTo: string } | null {
  if (fy && /^\d{4}-\d{2}$/.test(fy)) {
    const y = parseInt(fy.split("-")[0]);
    return { fyFrom: `${y}-04-01`, fyTo: `${y + 1}-03-31` };
  }
  return null;
}

router.get("/budgets", async (req, res) => {
  try {
    const { fiscalYear } = req.query as Record<string, string>;
    let query = db.select().from(budgetsTable).$dynamic();
    if (fiscalYear) query = query.where(eq(budgetsTable.fiscalYear, fiscalYear));
    const rows = await query;

    // For each budget, compute real totalActual from expense claims filtered by FY
    const result = await Promise.all(rows.map(async r => {
      const fyDates = parseFY(r.fiscalYear);
      let totalActual = Number(r.totalActual);

      if (fyDates && r.type === "Departmental") {
        // Pull actual spend from expense claims in this FY
        const [exp] = await db
          .select({ total: sql<number>`coalesce(sum(total_amount), 0)` })
          .from(expenseClaimsTable)
          .where(and(
            gte(expenseClaimsTable.submittedDate, fyDates.fyFrom),
            lte(expenseClaimsTable.submittedDate, fyDates.fyTo),
            sql`status not in ('rejected','draft')`
          ));
        if (Number(exp?.total) > 0) totalActual = Number(exp?.total);
      }

      const totalBudget = Number(r.totalBudget);
      const utilizationPct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100 * 10) / 10 : 0;
      return {
        ...r,
        totalBudget,
        totalActual,
        utilizationPct,
        alertLevel: utilizationPct > 100 ? "over" : utilizationPct > 80 ? "warning" : null,
        department: r.type === "Departmental" ? (r.name.includes(" - ") ? r.name.split(" - ")[1] : null) : null,
      };
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

router.post("/budgets", async (req, res) => {
  try {
    const { name, fiscalYear, type, lines } = req.body;
    const totalBudget = (lines || []).reduce((s: number, l: any) => s + Number(l.annualAmount || 0), 0);

    const [budget] = await db.insert(budgetsTable).values({
      name,
      fiscalYear,
      type: type || "Departmental",
      totalBudget: String(totalBudget),
      totalActual: "0",
      utilizationPct: "0",
      status: "active",
    }).returning();

    if (lines?.length) {
      const accountData = await db.select().from(accountsTable);
      const validLines = lines.map((l: any) => {
        const account = l.accountId
          ? accountData.find(a => a.id === Number(l.accountId))
          : accountData.find(a => a.code === l.accountCode);
        if (!account) return null;
        return {
          budgetId: budget.id,
          accountId: account.id,
          accountName: account.name,
          accountCode: account.code,
          department: l.department,
          annualAmount: String(l.annualAmount || l.budgetedAmount || 0),
          actualAmount: "0",
        };
      }).filter(Boolean);
      if (validLines.length) await db.insert(budgetLinesTable).values(validLines);
    }

    const result = await db.select().from(budgetsTable).where(eq(budgetsTable.id, budget.id));
    res.status(201).json({ ...result[0], totalBudget: Number(result[0].totalBudget), totalActual: 0, utilizationPct: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create budget" });
  }
});

router.get("/budgets/:id/vs-actual", async (req, res) => {
  try {
    const [budget] = await db.select().from(budgetsTable).where(eq(budgetsTable.id, Number(req.params.id)));
    if (!budget) { res.status(404).json({ error: "Not found" }); return; }

    const lines = await db.select().from(budgetLinesTable).where(eq(budgetLinesTable.budgetId, Number(req.params.id)));

    // Compute how many months of the FY have elapsed (for YTD budget proration)
    const fyDates = parseFY(budget.fiscalYear);
    const now = new Date();
    let monthsElapsed = 12;
    if (fyDates) {
      const fyStart = new Date(fyDates.fyFrom);
      const fyEnd = new Date(fyDates.fyTo);
      if (now < fyEnd) {
        // Months from April 1 to now
        const msElapsed = now.getTime() - fyStart.getTime();
        monthsElapsed = Math.max(1, Math.min(12, Math.ceil(msElapsed / (1000 * 60 * 60 * 24 * 30.44))));
      }
    }

    // For departmental budgets, pull real expense actuals by department from claims
    const expenseActualsByDept: Record<string, number> = {};
    if (fyDates) {
      const expRows = await db
        .select({
          dept: expenseClaimsTable.department,
          total: sql<number>`coalesce(sum(total_amount), 0)`,
        })
        .from(expenseClaimsTable)
        .where(and(
          gte(expenseClaimsTable.submittedDate, fyDates.fyFrom),
          lte(expenseClaimsTable.submittedDate, fyDates.fyTo),
          sql`status not in ('rejected','draft')`
        ))
        .groupBy(expenseClaimsTable.department);
      expRows.forEach(r => {
        if (r.dept) expenseActualsByDept[r.dept] = Number(r.total);
      });
    }

    const mappedLines = lines.map(l => {
      const annualBudget = Number(l.annualAmount);
      // Use stored actualAmount; if zero try to pull from expenses by dept
      let ytdActual = Number(l.actualAmount);
      if (ytdActual === 0 && l.department && expenseActualsByDept[l.department]) {
        ytdActual = expenseActualsByDept[l.department];
      }
      const ytdBudget  = (annualBudget / 12) * monthsElapsed;
      const ytdVariance = ytdBudget - ytdActual;
      const utilizationPct = annualBudget > 0 ? (ytdActual / annualBudget) * 100 : 0;
      return {
        accountCode:    l.accountCode,
        accountName:    l.accountName,
        department:     l.department ?? null,
        annualBudget,
        ytdBudget:      Math.round(ytdBudget),
        ytdActual,
        ytdVariance:    Math.round(ytdVariance),
        utilizationPct: Math.round(utilizationPct * 10) / 10,
        alertLevel:     utilizationPct > 100 ? "over" : utilizationPct > 80 ? "warning" : null,
      };
    });

    const totalBudget  = Number(budget.totalBudget);
    let totalActual = Number(budget.totalActual);
    if (totalActual === 0 && Object.keys(expenseActualsByDept).length > 0) {
      totalActual = Object.values(expenseActualsByDept).reduce((s, v) => s + v, 0);
    }
    if (totalActual === 0) totalActual = mappedLines.reduce((s, l) => s + l.ytdActual, 0);

    res.json({
      budgetId:      budget.id,
      budgetName:    budget.name,
      fiscalYear:    budget.fiscalYear,
      monthsElapsed,
      lines:         mappedLines,
      totalBudget,
      totalActual,
      totalVariance: totalBudget - totalActual,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get budget vs actual" });
  }
});

export default router;
