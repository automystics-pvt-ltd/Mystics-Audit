import {
  useGetDashboardSummary,
  useGetDashboardCashflow,
  useGetGstStatus,
  useGetAgingSummary,
  useGetRecentActivity,
} from "@workspace/api-client-react";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { useFY } from "@/contexts/fy-context";
import {
  TrendingUp, TrendingDown, Wallet, Clock, Calculator, FileText, Receipt,
  ShoppingCart, CheckCircle2, AlertTriangle, Landmark, ArrowUpRight,
  ArrowDownRight, Plus, BadgeIndianRupee, Package, Users, Building2,
  ChevronRight, AlertCircle, Activity, PieChart, BookOpen,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

/* ── helpers ─────────────────────────────────────────── */
function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  posted: "#059669", paid: "#059669", approved: "#059669",
  draft: "#D97706", submitted: "#0EA5E9",
  cancelled: "#DC2626", overdue: "#DC2626",
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  invoice: FileText, receipt: Receipt, purchase: ShoppingCart,
  expense: Wallet, bill: FileText, payment: CheckCircle2,
};
const ACTIVITY_COLORS: Record<string, string> = {
  invoice: "#7C3AED", receipt: "#059669", purchase: "#0EA5E9",
  expense: "#D97706", bill: "#DC2626", payment: "#059669",
};
const ACTIVITY_ROUTES: Record<string, (id: number) => string> = {
  invoice: (id) => `/invoices/${id}`,
  bill:    (id) => `/bills/${id}`,
  expense: (id) => `/expenses/${id}`,
  receipt: (id) => `/receipts/${id}`,
};

const CHART_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 capitalize">{p.dataKey}:</span>
          <span className="font-medium text-gray-800">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

/* ── KPI card ─────────────────────────────────────────── */
function KpiCard({
  title, value, sub, icon: Icon, from, to, trend, badge, href, isLoading,
}: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  from: string; to: string; trend?: "up" | "down"; badge?: string;
  href?: string; isLoading?: boolean;
}) {
  const inner = (
    <div
      className="relative rounded-2xl p-5 overflow-hidden text-white shadow-lg flex flex-col gap-3 cursor-pointer group hover:scale-[1.02] transition-transform duration-200"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 0)",
        backgroundSize: "40px 40px",
      }} />
      <div className="flex items-start justify-between relative">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center gap-1.5">
          {trend && (
            <div className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
              {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend === "up" ? "Up" : "Down"}
            </div>
          )}
          {badge && (
            <div className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }}>
              {badge}
            </div>
          )}
          {href && <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />}
        </div>
      </div>
      <div className="relative">
        <p className="text-white/75 text-xs font-medium mb-0.5">{title}</p>
        {isLoading
          ? <div className="h-8 w-28 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.3)" }} />
          : <p className="text-2xl font-extrabold tracking-tight leading-none">{value}</p>
        }
        {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* ── Stat mini card ───────────────────────────────────── */
function MiniStat({ icon: Icon, label, value, color, href }: {
  icon: React.ElementType; label: string; value: string | number;
  color: string; href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-violet-200 hover:shadow-sm transition-all cursor-pointer group">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-lg font-extrabold text-gray-900">{value}</p>
      </div>
      {href && <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 transition-colors" />}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* ── Quick action button ──────────────────────────────── */
function QuickAction({ icon: Icon, label, color, href }: {
  icon: React.ElementType; label: string; color: string; href: string;
}) {
  return (
    <Link href={href}>
      <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 hover:border-violet-200 hover:shadow-sm transition-all cursor-pointer group">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <p className="text-xs font-semibold text-gray-600 group-hover:text-violet-700 text-center leading-tight">{label}</p>
      </div>
    </Link>
  );
}

/* ── Main Dashboard ───────────────────────────────────── */
export default function Dashboard() {
  const { fy } = useFY();
  const [, navigate] = useLocation();

  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ fy: fy.value });
  const { data: cashflow, isLoading: isLoadingCashflow } = useGetDashboardCashflow({ fy: fy.value });
  const { data: gstStatus, isLoading: isLoadingGst } = useGetGstStatus({ fy: fy.value });
  const { data: aging, isLoading: isLoadingAging } = useGetAgingSummary({ fy: fy.value });
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({ fy: fy.value });

  const s = summary as any;
  const chartData = (s?.revenueChart || []).map((r: any, i: number) => ({
    month: r.month,
    revenue: r.value,
    expense: s?.expenseChart?.[i]?.value ?? 0,
  }));

  const gstDueDate = gstStatus?.gstr3bDueDate
    ? new Date(gstStatus.gstr3bDueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "—";

  const arTotal = aging?.receivables.total ?? 0;
  const apTotal = aging?.payables.total ?? 0;

  const agingSegments = (buckets: any, total: number) => [
    { pct: (buckets?.current ?? 0) / (total || 1),   color: "#059669", label: "Current" },
    { pct: (buckets?.days0to30 ?? 0) / (total || 1), color: "#F59E0B", label: "1–30d" },
    { pct: ((buckets?.days31to60 ?? 0) + (buckets?.days61to90 ?? 0)) / (total || 1), color: "#F97316", label: "31–90d" },
    { pct: ((buckets?.days91to180 ?? 0) + (buckets?.days180plus ?? 0)) / (total || 1), color: "#EF4444", label: ">90d" },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, John — here's {fy.label} at a glance.</p>
        </div>
        <div className="text-xs text-gray-400 font-medium">{fy.from} → {fy.to}</div>
      </div>

      {/* ── KPI Cards row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          title="Revenue (MTD)" href="/invoices"
          value={formatCurrency(s?.revenueMtd)}
          sub={`YTD: ${formatCurrency(s?.revenueYtd)}`}
          icon={TrendingUp} from="#7C3AED" to="#A78BFA" trend="up"
          isLoading={isLoadingSummary}
        />
        <KpiCard
          title="Cash & Bank" href="/bank"
          value={formatCurrency(s?.totalCashBank)}
          sub="Available liquidity"
          icon={Wallet} from="#0EA5E9" to="#38BDF8" trend="up"
          isLoading={isLoadingSummary}
        />
        <KpiCard
          title="Collection Efficiency" href="/customers/ar-aging"
          value={formatPercentage(s?.collectionEfficiency)}
          sub={s?.dso ? `${s.dso} days DSO` : "Days Sales Outstanding"}
          icon={Clock} from="#059669" to="#34D399"
          trend={s?.collectionEfficiency && s.collectionEfficiency < 85 ? "down" : "up"}
          isLoading={isLoadingSummary}
        />
        <KpiCard
          title="Net GST Payable" href="/gst/gstr3b"
          value={formatCurrency(s?.gstNetPayable)}
          sub={`Due: ${gstDueDate}`}
          icon={Calculator} from="#D97706" to="#FBBF24"
          isLoading={isLoadingSummary || isLoadingGst}
        />
      </div>

      {/* ── Secondary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <MiniStat icon={AlertTriangle} label="Overdue Invoices"
          value={isLoadingSummary ? "…" : s?.overdueInvoicesCount ?? 0}
          color="#EF4444" href="/customers/ar-aging" />
        <MiniStat icon={BadgeIndianRupee} label="Overdue AR"
          value={isLoadingSummary ? "…" : formatCurrency(s?.overdueReceivables)}
          color="#DC2626" href="/customers/ar-aging" />
        <MiniStat icon={FileText} label="Pending Bills"
          value={isLoadingSummary ? "…" : s?.pendingBillsCount ?? 0}
          color="#F97316" href="/bills" />
        <MiniStat icon={Receipt} label="Pending Expenses"
          value={isLoadingSummary ? "…" : s?.pendingExpensesCount ?? 0}
          color="#0EA5E9" href="/expenses" />
        <MiniStat icon={Users} label="Customers"
          value={isLoadingSummary ? "…" : s?.totalCustomers ?? 0}
          color="#7C3AED" href="/customers" />
        <MiniStat icon={Building2} label="Vendors"
          value={isLoadingSummary ? "…" : s?.totalVendors ?? 0}
          color="#059669" href="/vendors" />
      </div>

      {/* ── Quick actions ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          <QuickAction icon={Plus}            label="New Invoice"      color="#7C3AED" href="/invoices/new" />
          <QuickAction icon={Receipt}         label="Record Payment"   color="#059669" href="/receipts/new" />
          <QuickAction icon={ShoppingCart}    label="New Purchase"     color="#0EA5E9" href="/purchases/orders/new" />
          <QuickAction icon={Wallet}          label="Add Expense"      color="#D97706" href="/expenses/new" />
          <QuickAction icon={FileText}        label="New Bill"         color="#F97316" href="/bills/new" />
          <QuickAction icon={BookOpen}        label="Journal Entry"    color="#6366F1" href="/journals/new" />
          <QuickAction icon={Package}         label="Inventory"        color="#0D9488" href="/inventory" />
          <QuickAction icon={PieChart}        label="Reports"          color="#8B5CF6" href="/reports/profit-loss" />
        </div>
      </div>

      {/* ── Chart + Cash position ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">

        {/* Revenue vs Expenses Chart */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-800">Revenue &amp; Expense Trends</h2>
              <p className="text-xs text-gray-400 mt-0.5">Monthly overview for {fy.label}</p>
            </div>
            <Link href="/reports/profit-loss">
              <button className="text-xs text-violet-600 font-semibold hover:underline flex items-center gap-1">
                View P&amp;L <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
          {isLoadingSummary ? (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f5" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} width={40} />
                  <Tooltip content={<CHART_TOOLTIP />} />
                  <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2.5}
                    fill="url(#gradRevenue)" dot={false}
                    activeDot={{ r: 5, fill: "#7C3AED", stroke: "#fff", strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="expense" stroke="#0EA5E9" strokeWidth={2.5}
                    fill="url(#gradExpense)" dot={false}
                    activeDot={{ r: 5, fill: "#0EA5E9", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Budget utilization bar */}
          {!isLoadingSummary && s?.budgetUtilizationPct != null && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 font-medium">Budget Utilization</span>
                <Link href="/budgets">
                  <span className="text-xs font-bold text-violet-600 hover:underline">{s.budgetUtilizationPct}%</span>
                </Link>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(s.budgetUtilizationPct, 100)}%`,
                    background: s.budgetUtilizationPct > 90 ? "#EF4444" : s.budgetUtilizationPct > 70 ? "#F97316" : "#7C3AED",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cash Position */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-gray-800">Cash Position</h2>
            <Link href="/bank">
              <button className="text-xs text-violet-600 font-semibold hover:underline flex items-center gap-1">
                All Accounts <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
          <p className="text-xs text-gray-400 mb-4">Across all bank accounts</p>
          {isLoadingCashflow ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-3xl font-extrabold text-gray-900 leading-none">
                  {formatCurrency(cashflow?.totalBalance)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Total available</p>
              </div>
              <div className="space-y-2">
                {(cashflow?.accounts ?? []).slice(0, 4).map((acc: any, i: number) => {
                  const colors = ["#7C3AED", "#0EA5E9", "#059669", "#D97706"];
                  const c = colors[i % colors.length];
                  return (
                    <Link key={i} href={acc.id ? `/bank/${acc.id}/transactions` : "/bank"}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-violet-50 hover:border-violet-100 border border-transparent transition-all cursor-pointer">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${c}18` }}>
                          <Landmark className="w-4 h-4" style={{ color: c }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{acc.accountName}</p>
                          <p className="text-xs text-gray-400 truncate">{acc.bankName}</p>
                        </div>
                        <p className="text-sm font-bold text-gray-800 flex-shrink-0">{formatCurrency(acc.balance)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {/* 30-day cash flow */}
              <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
                <div className="text-center p-2 rounded-xl bg-green-50">
                  <p className="text-[10px] text-gray-400 font-medium">Inflows (30d)</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency((cashflow as any)?.inflows30Days)}</p>
                </div>
                <div className="text-center p-2 rounded-xl bg-red-50">
                  <p className="text-[10px] text-gray-400 font-medium">Outflows (30d)</p>
                  <p className="text-sm font-bold text-red-500">{formatCurrency((cashflow as any)?.outflows30Days)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Aging + GST + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Aging Summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">Aging Summary</h2>
            <span className="text-xs text-gray-400">AR &amp; AP</span>
          </div>

          {isLoadingAging ? (
            <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
          ) : (
            <>
              {/* Receivables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />Receivables
                  </span>
                  <Link href="/customers/ar-aging">
                    <span className="text-sm font-bold text-violet-700 hover:underline cursor-pointer">{formatCurrency(arTotal)}</span>
                  </Link>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 gap-px">
                  {agingSegments(aging?.receivables, arTotal).map((seg, i) => (
                    <div key={i} className="h-full" style={{ width: `${seg.pct * 100}%`, background: seg.color }} />
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {agingSegments(aging?.receivables, arTotal).map(seg => (
                    <span key={seg.label} className="flex items-center gap-1 text-[10px] text-gray-400">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: seg.color }} />{seg.label}
                    </span>
                  ))}
                </div>
                {/* Overdue callout */}
                {(aging?.receivables?.days91to180 ?? 0) + (aging?.receivables?.days180plus ?? 0) > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {formatCurrency((aging?.receivables?.days91to180 ?? 0) + (aging?.receivables?.days180plus ?? 0))} overdue &gt;90d
                  </div>
                )}
              </div>

              {/* Payables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />Payables
                  </span>
                  <Link href="/vendors/ap-aging">
                    <span className="text-sm font-bold text-sky-700 hover:underline cursor-pointer">{formatCurrency(apTotal)}</span>
                  </Link>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 gap-px">
                  {agingSegments(aging?.payables, apTotal).map((seg, i) => (
                    <div key={i} className="h-full" style={{ width: `${seg.pct * 100}%`, background: seg.color }} />
                  ))}
                </div>
              </div>

              {/* GST Status */}
              <Link href="/gst/gstr3b">
                <div className="rounded-xl p-4 cursor-pointer hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg, #7C3AED18, #A78BFA10)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4 text-violet-600" />
                    <span className="text-sm font-bold text-gray-700">GST Filing Status</span>
                    <span className="ml-auto text-xs text-violet-600 font-semibold">{gstStatus?.currentPeriod}</span>
                  </div>
                  {isLoadingGst ? <Skeleton className="h-8 w-full" /> : (
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[
                        { label: "GSTR-1", filed: gstStatus?.gstr1Filed },
                        { label: "GSTR-3B", filed: gstStatus?.gstr3bFiled },
                        { label: "Due", value: gstDueDate },
                      ].map((item, i) => (
                        <div key={i} className="text-center">
                          <p className="text-[10px] text-gray-400">{item.label}</p>
                          {item.value != null
                            ? <p className="text-xs font-bold text-gray-700">{item.value}</p>
                            : <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${item.filed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                {item.filed ? "Filed" : "Pending"}
                              </span>
                          }
                        </div>
                      ))}
                    </div>
                  )}
                  {/* ITC Balance */}
                  {gstStatus?.itcBalance && (
                    <div className="mt-3 pt-2 border-t border-violet-200/40 grid grid-cols-3 gap-1">
                      {[
                        { label: "ITC CGST", val: gstStatus.itcBalance.cgst },
                        { label: "ITC SGST", val: gstStatus.itcBalance.sgst },
                        { label: "ITC IGST", val: gstStatus.itcBalance.igst },
                      ].map(({ label, val }) => (
                        <div key={label} className="text-center">
                          <p className="text-[9px] text-gray-400">{label}</p>
                          <p className="text-xs font-bold text-violet-700">₹{(val / 1000).toFixed(0)}K</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-800">Recent Activity</h2>
              <p className="text-xs text-gray-400">Latest transactions for {fy.label}</p>
            </div>
            <Link href="/invoices">
              <button className="text-xs text-violet-600 font-semibold hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>

          {isLoadingActivity ? (
            <div className="space-y-2.5">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0.5 max-h-[420px] overflow-y-auto">
              {(activity ?? []).map((item: any) => {
                const color = ACTIVITY_COLORS[item.type?.toLowerCase()] ?? "#6B7280";
                const ItemIcon = ACTIVITY_ICONS[item.type?.toLowerCase()] ?? FileText;
                const route = ACTIVITY_ROUTES[item.type?.toLowerCase()]?.(item.id);
                const statusColor = STATUS_COLORS[item.status?.toLowerCase()] ?? "#6B7280";
                const inner = (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                      <ItemIcon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.description}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {item.party && <span>{item.party} · </span>}
                        {item.refNo && <span className="font-mono text-violet-500">{item.refNo} · </span>}
                        {timeAgo(item.timestamp)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      {item.amount != null && (
                        <p className="text-sm font-bold text-gray-800">{formatCurrency(item.amount)}</p>
                      )}
                      {item.status && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide inline-block"
                          style={{ background: `${statusColor}18`, color: statusColor }}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                    {route && <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-500 transition-colors flex-shrink-0" />}
                  </div>
                );
                return route
                  ? <Link key={`${item.type}-${item.id}`} href={route}>{inner}</Link>
                  : <div key={`${item.type}-${item.id}`}>{inner}</div>;
              })}
              {(!activity || (activity as any[]).length === 0) && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Activity className="w-8 h-8 mb-2 text-gray-200" />
                  <p className="text-sm">No activity for {fy.label}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
