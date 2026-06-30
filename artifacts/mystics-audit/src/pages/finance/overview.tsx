import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, IndianRupee, Users, Building2,
  Landmark, AlertCircle, CheckCircle2, ArrowRight, RefreshCw,
  BarChart3, PieChartIcon, Activity, CreditCard, Receipt,
  Wallet, ArrowUpRight, ArrowDownRight, Target, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFY, FY_OPTIONS } from "@/contexts/fy-context";

/* ── types ─────────────────────────────────────────────── */
interface OverviewData {
  fy: string;
  pnl: {
    totalRevenue: number; totalPurchases: number; totalExpenses: number;
    grossProfit: number; netProfit: number; grossMargin: number; netMargin: number;
  };
  ar: { outstanding: number; overdue: number; collected: number; invoiceCount: number };
  ap: { outstanding: number; overdue: number; paid: number; totalTds: number };
  cash: { total: number; accounts: Array<{ accountName: string; bankName: string; balance: number; accountType: string }> };
  expenses: { total: number; pending: number; approved: number; reimbursed: number };
  gst: { outputTax: number; inputCredit: number; payable: number; receivable: number };
  trends: { monthly: Array<{ month: string; revenue: number; collected: number; expenses: number; profit: number }> };
  deptExpenses: Array<{ department: string; total: number; count: number }>;
  projectProfitability: Array<{ project: string; revenue: number; expenses: number; profit: number }>;
  budgets: Array<{ id: number; name: string; type: string; totalBudget: number; totalActual: number; utilization: number; status: string }>;
  topCustomersAR: Array<{ customerName: string; outstanding: number }>;
  topVendorsAP: Array<{ vendorName: string; outstanding: number }>;
}

/* ── helpers ────────────────────────────────────────────── */
function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function inrK(n: number) {
  if (Math.abs(n) >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (Math.abs(n) >= 1_000)      return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}
function fmtMonth(m: string) {
  try {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  } catch { return m; }
}
const COLORS = ["#7c3aed","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#3b82f6","#ec4899"];
const TREND_COLORS = { revenue: "#7c3aed", expenses: "#ef4444", profit: "#10b981", collected: "#06b6d4" };

/* ── KPI card ───────────────────────────────────────────── */
function KpiCard({
  label, value, sub, trend, trendValue, icon: Icon, color, href, alert,
}: {
  label: string; value: string; sub?: string; trend?: "up" | "down" | "neutral";
  trendValue?: string; icon: any; color: string; href?: string; alert?: boolean;
}) {
  const content = (
    <div className={cn(
      "border rounded-xl p-4 bg-white transition-all hover:shadow-md",
      alert ? "border-amber-300 bg-amber-50/30" : "hover:border-primary/30"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", `${color}/10`)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        {alert && <AlertCircle className="w-4 h-4 text-amber-500" />}
        {trend === "up"   && <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><ArrowUpRight className="w-3 h-3" />{trendValue}</div>}
        {trend === "down" && <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><ArrowDownRight className="w-3 h-3" />{trendValue}</div>}
      </div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {href && <div className="flex items-center gap-1 text-xs text-primary mt-2">View details <ArrowRight className="w-3 h-3" /></div>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

/* ── custom tooltip ─────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{fmtMonth(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600 capitalize">{p.name}:</span>
          <span className="font-medium">{inrK(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── main page ──────────────────────────────────────────── */
export default function FinanceOverview() {
  const { fy, setFY } = useFY();
  const [chartType, setChartType] = useState<"line" | "bar">("bar");

  const { data, isLoading, refetch } = useQuery<OverviewData>({
    queryKey: ["finance-overview", fy.value],
    queryFn: () => fetch(`/api/finance/overview?fy=${fy.value}`).then(r => r.json()),
  });

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-100 rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const { pnl, ar, ap, cash, expenses, gst, trends, deptExpenses, projectProfitability, budgets, topCustomersAR, topVendorsAP } = data;

  /* build monthly chart data — fill gaps */
  const allMonths = ["2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03"];
  const monthlyData = allMonths.map(m => {
    const found = trends.monthly.find(t => t.month === m);
    return { month: m, revenue: found?.revenue ?? 0, expenses: found?.expenses ?? 0, profit: found?.profit ?? 0, collected: found?.collected ?? 0 };
  });

  /* expense breakdown for pie */
  const expPie = [
    { name: "Purchases", value: pnl.totalPurchases },
    { name: "Operating Exp", value: pnl.totalExpenses },
  ].filter(e => e.value > 0);

  /* GST net */
  const gstNet    = gst.outputTax - gst.inputCredit;
  const gstLabel  = gstNet >= 0 ? "GST Payable" : "GST Receivable";
  const gstAmt    = Math.abs(gstNet);

  return (
    <div className="p-6 space-y-6 bg-gray-50/40 min-h-full">
      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time financial tracking across all modules — FY {fy.value}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" />Refresh
          </Button>
          <Select value={fy.value} onValueChange={v => { const opt = FY_OPTIONS.find(o => o.value === v); if (opt) setFY(opt); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── P&L KPIs ───────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Profit & Loss</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total Revenue" value={inrK(pnl.totalRevenue)}
            sub={`${pnl.grossMargin.toFixed(1)}% gross margin`}
            icon={TrendingUp} color="text-emerald-600" href="/invoices" />
          <KpiCard label="Total Purchases (CoGS)" value={inrK(pnl.totalPurchases)}
            sub="Vendor bills incl. GST"
            icon={Package} color="text-orange-600" href="/bills" />
          <KpiCard label="Gross Profit" value={inrK(pnl.grossProfit)}
            sub={`Margin: ${pnl.grossMargin.toFixed(1)}%`}
            trend={pnl.grossProfit >= 0 ? "up" : "down"} trendValue={`${pnl.grossMargin.toFixed(1)}%`}
            icon={BarChart3} color="text-violet-600" />
          <KpiCard label="Net Profit" value={inrK(pnl.netProfit)}
            sub={`After operating expenses · ${pnl.netMargin.toFixed(1)}% net margin`}
            trend={pnl.netProfit >= 0 ? "up" : "down"} trendValue={`${pnl.netMargin.toFixed(1)}%`}
            icon={Activity} color={pnl.netProfit >= 0 ? "text-green-600" : "text-red-600"} />
        </div>
      </div>

      {/* ── Balance KPIs ────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Working Capital</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Outstanding Receivables" value={inrK(ar.outstanding)}
            sub={`₹${inrK(ar.overdue)} overdue`}
            alert={ar.overdue > 0}
            icon={Receipt} color="text-blue-600" href="/customers/ar-aging" />
          <KpiCard label="Outstanding Payables" value={inrK(ap.outstanding)}
            sub={`₹${inrK(ap.overdue)} overdue`}
            alert={ap.overdue > 0}
            icon={CreditCard} color="text-red-600" href="/vendors/ap-aging" />
          <KpiCard label="Available Cash & Bank" value={inrK(cash.total)}
            sub={`Across ${cash.accounts.length} account${cash.accounts.length !== 1 ? "s" : ""}`}
            icon={Landmark} color="text-cyan-600" href="/bank" />
          <KpiCard label={gstLabel} value={inrK(gstAmt)}
            sub={`Output: ${inrK(gst.outputTax)} · ITC: ${inrK(gst.inputCredit)}`}
            trend={gstNet > 0 ? "down" : "up"} trendValue={gstNet > 0 ? "Payable" : "Receivable"}
            icon={IndianRupee} color="text-amber-600" href="/gst/gstr3b" />
        </div>
      </div>

      {/* ── Revenue vs Expenses chart + Expense pie ─── */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Revenue vs Expenses — Monthly Trend</CardTitle>
            <div className="flex border rounded overflow-hidden">
              <button onClick={() => setChartType("bar")} className={cn("px-3 py-1 text-xs", chartType === "bar" ? "bg-primary text-white" : "hover:bg-gray-50")}>Bar</button>
              <button onClick={() => setChartType("line")} className={cn("px-3 py-1 text-xs border-l", chartType === "line" ? "bg-primary text-white" : "hover:bg-gray-50")}>Line</button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              {chartType === "bar" ? (
                <BarChart data={monthlyData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => inrK(v)} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill={TREND_COLORS.revenue} radius={[2,2,0,0]} />
                  <Bar dataKey="expenses" name="Expenses" fill={TREND_COLORS.expenses} radius={[2,2,0,0]} />
                  <Bar dataKey="profit" name="Profit" fill={TREND_COLORS.profit} radius={[2,2,0,0]} />
                </BarChart>
              ) : (
                <AreaChart data={monthlyData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={TREND_COLORS.revenue} stopOpacity={0.15} /><stop offset="95%" stopColor={TREND_COLORS.revenue} stopOpacity={0} /></linearGradient>
                    <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={TREND_COLORS.expenses} stopOpacity={0.15} /><stop offset="95%" stopColor={TREND_COLORS.expenses} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => inrK(v)} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={TREND_COLORS.revenue} fill="url(#rev)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke={TREND_COLORS.expenses} fill="url(#exp)" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke={TREND_COLORS.profit} strokeWidth={2} dot={{ r: 2 }} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expenditure Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {expPie.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">No expenditure data yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={expPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {expPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => inrK(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {expPie.map((e, i) => (
                    <div key={e.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                        <span className="text-gray-600">{e.name}</span>
                      </div>
                      <span className="font-medium">{inrK(e.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Dept expenses + Budget vs Actual ──── */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />Department-wise Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deptExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">No department expense data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptExpenses.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => inrK(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v: any) => inrK(v)} />
                  <Bar dataKey="total" name="Expenses" radius={[0,3,3,0]}>
                    {deptExpenses.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />Budget vs Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">No budgets for this FY</div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {budgets.map(b => {
                  const pct = Math.min(b.utilization, 100);
                  const over = b.utilization > 100;
                  return (
                    <div key={b.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate max-w-[140px]">{b.name}</span>
                        <span className={cn("text-xs font-medium", over ? "text-red-600" : "text-gray-500")}>
                          {inrK(b.totalActual)} / {inrK(b.totalBudget)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500")}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{b.utilization.toFixed(1)}% utilized{over ? " ⚠ Over budget" : ""}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Project profitability ────────────── */}
      {projectProfitability.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />Project Profitability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b">
                    <th className="text-left py-2">Project</th>
                    <th className="text-right py-2">Revenue</th>
                    <th className="text-right py-2">Expenses</th>
                    <th className="text-right py-2">Profit</th>
                    <th className="text-right py-2">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {projectProfitability.map(p => {
                    const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100) : 0;
                    return (
                      <tr key={p.project} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 font-medium">{p.project || "Unassigned"}</td>
                        <td className="py-2 text-right">{inrK(p.revenue)}</td>
                        <td className="py-2 text-right text-red-600">{inrK(p.expenses)}</td>
                        <td className={cn("py-2 text-right font-semibold", p.profit >= 0 ? "text-green-600" : "text-red-600")}>{inrK(p.profit)}</td>
                        <td className="py-2 text-right">
                          <Badge className={cn("text-xs", margin >= 20 ? "bg-green-100 text-green-700" : margin >= 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                            {margin.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Top AR customers + Top AP vendors ─ */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />Top Outstanding Receivables
            </CardTitle>
            <Link href="/customers/ar-aging">
              <Button variant="ghost" size="sm" className="text-xs text-primary">
                View AR Aging <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {topCustomersAR.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No outstanding receivables</p>
            ) : (
              <div className="space-y-2">
                {topCustomersAR.map((c, i) => (
                  <div key={c.customerName} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                      <span className="text-sm text-gray-700">{c.customerName}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600">{inrK(c.outstanding)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />Top Outstanding Payables
            </CardTitle>
            <Link href="/vendors/ap-aging">
              <Button variant="ghost" size="sm" className="text-xs text-primary">
                View AP Aging <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {topVendorsAP.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No outstanding payables</p>
            ) : (
              <div className="space-y-2">
                {topVendorsAP.map((v, i) => (
                  <div key={v.vendorName} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700">{i + 1}</div>
                      <span className="text-sm text-gray-700">{v.vendorName}</span>
                    </div>
                    <span className="text-sm font-semibold text-amber-600">{inrK(v.outstanding)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Cash accounts breakdown ──────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="w-4 h-4" />Cash & Bank Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cash.accounts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No active bank accounts</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {cash.accounts.map((a, i) => (
                <div key={i} className="border rounded-lg p-3 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">{a.accountType}</span>
                    <Badge variant="outline" className="text-xs">{a.bankName}</Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{a.accountName}</p>
                  <p className="text-lg font-bold text-cyan-700 mt-1">{inrK(a.balance)}</p>
                </div>
              ))}
              <div className="border-2 border-primary/30 rounded-lg p-3 bg-primary/5 flex flex-col justify-center items-center">
                <p className="text-xs font-medium text-primary mb-1">Total Available</p>
                <p className="text-2xl font-bold text-primary">{inrK(cash.total)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Expense claims status ────────────── */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4" />Expense Claims Summary
          </CardTitle>
          <Link href="/expenses">
            <Button variant="ghost" size="sm" className="text-xs text-primary">Manage Expenses <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Claimed", value: inrK(expenses.total), color: "text-gray-900", bg: "bg-gray-50" },
              { label: "Pending Approval", value: inrK(expenses.pending), color: "text-amber-700", bg: "bg-amber-50" },
              { label: "Approved", value: inrK(expenses.approved), color: "text-blue-700", bg: "bg-blue-50" },
              { label: "Reimbursed / Paid", value: inrK(expenses.reimbursed), color: "text-green-700", bg: "bg-green-50" },
            ].map(e => (
              <div key={e.label} className={cn("rounded-lg p-3 border", e.bg)}>
                <p className="text-xs text-gray-500">{e.label}</p>
                <p className={cn("text-xl font-bold", e.color)}>{e.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
