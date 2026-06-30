import {
  useGetDashboardSummary,
  useGetDashboardCashflow,
  useGetGstStatus,
  useGetAgingSummary,
  useGetRecentActivity,
} from "@workspace/api-client-react";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Wallet,
  Clock,
  Calculator,
  FileText,
  Receipt,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const GRADIENTS = [
  { from: "#7C3AED", to: "#A78BFA", icon: "from-white/20 to-white/10" },
  { from: "#0EA5E9", to: "#38BDF8", icon: "from-white/20 to-white/10" },
  { from: "#059669", to: "#34D399", icon: "from-white/20 to-white/10" },
  { from: "#D97706", to: "#FBBF24", icon: "from-white/20 to-white/10" },
];

function GradientKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradientIndex,
  trend,
  isLoading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  gradientIndex: number;
  trend?: "up" | "down";
  isLoading?: boolean;
}) {
  const g = GRADIENTS[gradientIndex];
  return (
    <div
      className="relative rounded-2xl p-6 overflow-hidden text-white shadow-lg flex flex-col gap-3"
      style={{ background: `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)` }}
    >
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 0), radial-gradient(circle at 20% 80%, white 1px, transparent 0)",
        backgroundSize: "40px 40px"
      }} />

      <div className="flex items-start justify-between relative">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{trend === "up" ? "Up" : "Down"}</span>
          </div>
        )}
      </div>

      <div className="relative">
        <p className="text-white/75 text-sm font-medium mb-1">{title}</p>
        {isLoading ? (
          <div className="h-9 w-32 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.3)" }} />
        ) : (
          <p className="text-3xl font-extrabold tracking-tight leading-none">{value}</p>
        )}
        {subtitle && (
          <p className="text-white/65 text-xs mt-1.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

const ACTIVITY_COLORS: Record<string, string> = {
  invoice: "#7C3AED",
  receipt: "#059669",
  purchase: "#0EA5E9",
  expense: "#D97706",
  bill: "#DC2626",
  payment: "#059669",
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  invoice: FileText,
  receipt: Receipt,
  purchase: ShoppingCart,
  expense: Wallet,
  bill: FileText,
  payment: CheckCircle2,
};

function activityColor(type: string) {
  return ACTIVITY_COLORS[type?.toLowerCase()] ?? "#6B7280";
}
function activityIcon(type: string): React.ElementType {
  return ACTIVITY_ICONS[type?.toLowerCase()] ?? FileText;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
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
  }
  return null;
};

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: cashflow, isLoading: isLoadingCashflow } = useGetDashboardCashflow();
  const { data: gstStatus, isLoading: isLoadingGst } = useGetGstStatus();
  const { data: aging, isLoading: isLoadingAging } = useGetAgingSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();

  const chartData = (summary?.revenueChart || []).map((r, i) => ({
    month: r.month,
    revenue: r.value,
    expense: summary?.expenseChart?.[i]?.value ?? 0,
  }));

  const gstDueDate = gstStatus?.gstr3bDueDate
    ? new Date(gstStatus.gstr3bDueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "-";

  const arTotal = aging?.receivables.total ?? 0;
  const apTotal = aging?.payables.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back — here's your business at a glance.
          </p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 font-medium">
          FY 2024–25
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <GradientKpiCard
          title="Revenue (MTD)"
          value={formatCurrency(summary?.revenueMtd)}
          subtitle="Month-to-date invoiced"
          icon={TrendingUp}
          gradientIndex={0}
          trend="up"
          isLoading={isLoadingSummary}
        />
        <GradientKpiCard
          title="Cash & Bank"
          value={formatCurrency(summary?.totalCashBank)}
          subtitle="Available liquidity"
          icon={Wallet}
          gradientIndex={1}
          trend="up"
          isLoading={isLoadingSummary}
        />
        <GradientKpiCard
          title="Collection Efficiency"
          value={formatPercentage(summary?.collectionEfficiency)}
          subtitle={summary?.dso ? `${summary.dso} days DSO` : "Days Sales Outstanding"}
          icon={Clock}
          gradientIndex={2}
          trend={summary?.collectionEfficiency && summary.collectionEfficiency < 85 ? "down" : "up"}
          isLoading={isLoadingSummary}
        />
        <GradientKpiCard
          title="Net GST Payable"
          value={formatCurrency(summary?.gstNetPayable)}
          subtitle={`Due: ${gstDueDate}`}
          icon={Calculator}
          gradientIndex={3}
          isLoading={isLoadingSummary || isLoadingGst}
        />
      </div>

      {/* Chart + Right panel */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Revenue vs Expenses Chart */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-base font-bold text-gray-800">Revenue &amp; Expense Trends</h2>
              <p className="text-xs text-gray-400 mt-0.5">Monthly overview for FY 2024–25</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-1 rounded-full" style={{ background: "#7C3AED" }} />Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-1 rounded-full" style={{ background: "#0EA5E9" }} />Expense
              </span>
            </div>
          </div>

          {isLoadingSummary ? (
            <div className="h-[260px] flex items-center justify-center">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          ) : (
            <div className="h-[260px] mt-4">
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
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#7C3AED"
                    strokeWidth={2.5}
                    fill="url(#gradRevenue)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#7C3AED", stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#0EA5E9"
                    strokeWidth={2.5}
                    fill="url(#gradExpense)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#0EA5E9", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Cash Position */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-800 mb-1">Cash Position</h2>
          <p className="text-xs text-gray-400 mb-4">Across all bank accounts</p>

          {isLoadingCashflow ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="mb-5">
                <p className="text-3xl font-extrabold text-gray-900 leading-none">
                  {formatCurrency(cashflow?.totalBalance)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Total available</p>
              </div>
              <div className="space-y-2.5">
                {cashflow?.accounts.slice(0, 4).map((acc, i) => {
                  const colors = ["#7C3AED", "#0EA5E9", "#059669", "#D97706"];
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${colors[i % colors.length]}18` }}
                      >
                        <Landmark className="w-4 h-4" style={{ color: colors[i % colors.length] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{acc.accountName}</p>
                        <p className="text-xs text-gray-400 truncate">{acc.bankName}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-800 flex-shrink-0">{formatCurrency(acc.balance)}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row: Aging + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Aging Summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-800 mb-1">Aging Summary</h2>
          <p className="text-xs text-gray-400 mb-5">AR &amp; AP overdue breakdown</p>

          {isLoadingAging ? (
            <div className="space-y-6">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Receivables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-sm font-semibold text-gray-700">Receivables</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{formatCurrency(arTotal)}</span>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 gap-px">
                  {[
                    { pct: (aging?.receivables.current ?? 0) / (arTotal || 1), color: "#059669" },
                    { pct: (aging?.receivables.days0to30 ?? 0) / (arTotal || 1), color: "#F59E0B" },
                    { pct: ((aging?.receivables.days31to60 ?? 0) + (aging?.receivables.days61to90 ?? 0)) / (arTotal || 1), color: "#F97316" },
                    { pct: ((aging?.receivables.days91to180 ?? 0) + (aging?.receivables.days180plus ?? 0)) / (arTotal || 1), color: "#EF4444" },
                  ].map((seg, i) => (
                    <div key={i} className="h-full transition-all" style={{ width: `${seg.pct * 100}%`, background: seg.color }} />
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {[
                    { label: "Current", color: "#059669" },
                    { label: "1–30d", color: "#F59E0B" },
                    { label: "31–90d", color: "#F97316" },
                    { label: ">90d", color: "#EF4444" },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Payables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-sky-500" />
                    <span className="text-sm font-semibold text-gray-700">Payables</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{formatCurrency(apTotal)}</span>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 gap-px">
                  {[
                    { pct: (aging?.payables.current ?? 0) / (apTotal || 1), color: "#059669" },
                    { pct: (aging?.payables.days0to30 ?? 0) / (apTotal || 1), color: "#F59E0B" },
                    { pct: ((aging?.payables.days31to60 ?? 0) + (aging?.payables.days61to90 ?? 0)) / (apTotal || 1), color: "#F97316" },
                    { pct: ((aging?.payables.days91to180 ?? 0) + (aging?.payables.days180plus ?? 0)) / (apTotal || 1), color: "#EF4444" },
                  ].map((seg, i) => (
                    <div key={i} className="h-full transition-all" style={{ width: `${seg.pct * 100}%`, background: seg.color }} />
                  ))}
                </div>
              </div>

              {/* GST Status */}
              <div className="mt-2 rounded-xl p-4" style={{ background: "linear-gradient(135deg, #7C3AED18, #A78BFA10)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-semibold text-gray-700">GST Status</span>
                </div>
                {isLoadingGst ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <div className="flex items-center justify-between mt-1">
                    <div>
                      <p className="text-xs text-gray-400">GSTR-1</p>
                      <p className="text-sm font-semibold text-gray-800">{gstStatus?.gstr1Filed ? "Filed" : "Pending"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">GSTR-3B</p>
                      <p className="text-sm font-semibold text-gray-800">{gstStatus?.gstr3bFiled ? "Filed" : "Pending"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Due Date</p>
                      <p className="text-sm font-semibold text-gray-800">{gstDueDate}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-800 mb-1">Recent Activity</h2>
          <p className="text-xs text-gray-400 mb-4">Latest transactions and events</p>

          {isLoadingActivity ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {(activity ?? []).map((item) => {
                const color = activityColor(item.type ?? "");
                const ItemIcon = activityIcon(item.type ?? "");
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18` }}
                    >
                      <ItemIcon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.description}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {item.party && <span>{item.party} · </span>}
                        {timeAgo(item.timestamp)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {item.amount != null && (
                        <p className="text-sm font-bold text-gray-800">{formatCurrency(item.amount)}</p>
                      )}
                      {item.status && (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full uppercase tracking-wide"
                          style={{
                            background: item.status === "posted" || item.status === "paid" ? "#05966918" : "#F5940018",
                            color: item.status === "posted" || item.status === "paid" ? "#059669" : "#D97706",
                          }}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!activity || activity.length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <CheckCircle2 className="w-8 h-8 mb-2 text-gray-200" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
