import { useGetDashboardSummary, useGetDashboardCashflow, useGetGstStatus, useGetAgingSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Wallet, 
  Calculator, 
  Clock,
  AlertCircle,
  FileText,
  Landmark
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  subtitle,
  isLoading 
}: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-[120px]" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {isLoading ? (
          <Skeleton className="h-4 w-[100px] mt-2" />
        ) : (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend === "up" && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
            {trend === "down" && <ArrowDownRight className="h-3 w-3 text-red-500" />}
            <span className={trend === "up" ? "text-emerald-500 font-medium" : trend === "down" ? "text-red-500 font-medium" : ""}>
              {trendValue}
            </span>
            {" "}{subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: cashflow, isLoading: isLoadingCashflow } = useGetDashboardCashflow();
  const { data: gstStatus, isLoading: isLoadingGst } = useGetGstStatus();
  const { data: aging, isLoading: isLoadingAging } = useGetAgingSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here's what's happening with your business today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue (MTD)"
          value={formatCurrency(summary?.revenueMtd)}
          icon={TrendingUp}
          trend="up"
          trendValue="+12.5%"
          subtitle="vs last month"
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Total Cash & Bank"
          value={formatCurrency(summary?.totalCashBank)}
          icon={Wallet}
          trend="up"
          trendValue="+2.1%"
          subtitle="vs last week"
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Collection Efficiency"
          value={formatPercentage(summary?.collectionEfficiency)}
          icon={Clock}
          trend={summary?.collectionEfficiency && summary.collectionEfficiency < 85 ? "down" : "up"}
          trendValue={summary?.dso ? `${summary.dso} Days DSO` : ""}
          subtitle=""
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Net GST Payable"
          value={formatCurrency(summary?.gstNetPayable)}
          icon={Calculator}
          subtitle={`Due: ${gstStatus?.gstr3bDueDate ? new Date(gstStatus.gstr3bDueDate).toLocaleDateString() : '-'}`}
          isLoading={isLoadingSummary || isLoadingGst}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoadingSummary ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(summary?.revenueChart || []).map((r, i) => ({
                      month: r.month,
                      revenue: r.value,
                      expense: summary?.expenseChart?.[i]?.value || 0
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Cash Position</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCashflow ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="text-3xl font-bold">{formatCurrency(cashflow?.totalBalance)}</div>
                  <p className="text-sm text-muted-foreground mt-1">Available liquidity across all accounts</p>
                </div>
                
                <div className="space-y-3">
                  {cashflow?.accounts.slice(0, 4).map((acc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Landmark className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{acc.accountName}</p>
                          <p className="text-xs text-muted-foreground">{acc.bankName}</p>
                        </div>
                      </div>
                      <div className="font-semibold text-sm">
                        {formatCurrency(acc.balance)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Aging Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAging ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Accounts Receivable</span>
                    <span className="text-sm font-bold">{formatCurrency(aging?.receivables.total)}</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    <div className="bg-emerald-500" style={{ width: `${(aging?.receivables.current || 0) / (aging?.receivables.total || 1) * 100}%` }} />
                    <div className="bg-amber-400" style={{ width: `${(aging?.receivables.days0to30 || 0) / (aging?.receivables.total || 1) * 100}%` }} />
                    <div className="bg-orange-500" style={{ width: `${((aging?.receivables.days31to60 || 0) + (aging?.receivables.days61to90 || 0)) / (aging?.receivables.total || 1) * 100}%` }} />
                    <div className="bg-red-500" style={{ width: `${((aging?.receivables.days91to180 || 0) + (aging?.receivables.days180plus || 0)) / (aging?.receivables.total || 1) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Current</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/> &gt;90 Days</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Accounts Payable</span>
                    <span className="text-sm font-bold">{formatCurrency(aging?.payables.total)}</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    <div className="bg-emerald-500" style={{ width: `${(aging?.payables.current || 0) / (aging?.payables.total || 1) * 100}%` }} />
                    <div className="bg-amber-400" style={{ width: `${(aging?.payables.days0to30 || 0) / (aging?.payables.total || 1) * 100}%` }} />
                    <div className="bg-orange-500" style={{ width: `${((aging?.payables.days31to60 || 0) + (aging?.payables.days61to90 || 0)) / (aging?.payables.total || 1) * 100}%` }} />
                    <div className="bg-red-500" style={{ width: `${((aging?.payables.days91to180 || 0) + (aging?.payables.days180plus || 0)) / (aging?.payables.total || 1) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {activity?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.party} • {new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    {item.amount != null && (
                      <div className="text-sm font-semibold text-right">
                        {formatCurrency(item.amount)}
                        <p className="text-xs font-normal text-muted-foreground uppercase">{item.status}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
