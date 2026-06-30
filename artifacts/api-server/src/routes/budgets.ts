import { Router } from "express";
import { db, budgetsTable, budgetLinesTable, accountsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/budgets", async (req, res) => {
  try {
    const { fiscalYear } = req.query as Record<string, string>;
    let query = db.select().from(budgetsTable).$dynamic();
    if (fiscalYear) query = query.where(eq(budgetsTable.fiscalYear, fiscalYear));
    const rows = await query;
    res.json(rows.map(r => ({
      ...r,
      totalBudget: Number(r.totalBudget),
      totalActual: Number(r.totalActual),
      utilizationPct: Number(r.utilizationPct),
    })));
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
      await db.insert(budgetLinesTable).values(
        lines.map((l: any) => {
          const account = accountData.find(a => a.id === l.accountId);
          return {
            budgetId: budget.id,
            accountId: l.accountId,
            accountName: account?.name || "Account",
            accountCode: account?.code || "000",
            department: l.department,
            annualAmount: String(l.annualAmount),
            actualAmount: "0",
          };
        })
      );
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

    const totalBudget = Number(budget.totalBudget);
    const totalActual = Number(budget.totalActual);

    const mappedLines = lines.map(l => {
      const annualBudget = Number(l.annualAmount);
      const periodBudget = annualBudget / 12;
      const periodActual = Number(l.actualAmount);
      const periodVariance = periodBudget - periodActual;
      const ytdBudget = annualBudget * 5 / 12;
      const ytdActual = periodActual * 5;
      const ytdVariance = ytdBudget - ytdActual;
      const utilizationPct = ytdBudget > 0 ? (ytdActual / ytdBudget) * 100 : 0;
      return {
        accountCode: l.accountCode,
        accountName: l.accountName,
        department: l.department ?? null,
        annualBudget,
        periodBudget,
        periodActual,
        periodVariance,
        ytdBudget,
        ytdActual,
        ytdVariance,
        utilizationPct: Math.round(utilizationPct * 10) / 10,
        alertLevel: utilizationPct > 100 ? "over" : utilizationPct > 80 ? "warning" : null,
      };
    });

    res.json({
      budgetId: budget.id,
      budgetName: budget.name,
      fiscalYear: budget.fiscalYear,
      period: null,
      lines: mappedLines,
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
