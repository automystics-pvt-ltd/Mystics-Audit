import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmtINR, fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, TrendingUp, IndianRupee, Clock } from "lucide-react";

const STATUS_BADGE: Record<string,string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  trialing: "bg-blue-50 text-blue-700 border-blue-200",
  past_due: "bg-orange-50 text-orange-700 border-orange-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  unpaid: "bg-red-50 text-red-700 border-red-200",
};

export default function Subscriptions() {
  const [subPage, setSubPage] = useState(1);
  const [payPage, setPayPage] = useState(1);

  const { data: subs, isLoading: subLoading } = useQuery({
    queryKey: ["admin-subs", subPage],
    queryFn: () => api.get<any>(`/admin/subscriptions?page=${subPage}`),
  });
  const { data: pays, isLoading: payLoading } = useQuery({
    queryKey: ["admin-pays", payPage],
    queryFn: () => api.get<any>(`/admin/payments?page=${payPage}`),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Subscriptions & Billing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage platform subscriptions and payment records</p>
      </div>

      <Tabs defaultValue="subscriptions">
        <TabsList className="bg-muted/50 h-8">
          <TabsTrigger value="subscriptions" className="text-xs px-3">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs px-3">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-4">
          <Card className="border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Billing Cycle</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Next Renewal</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {subLoading && Array.from({length:8}).map((_,i) => (
                    <tr key={i} className="border-b">
                      {Array.from({length:6}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                    </tr>
                  ))}
                  {!subLoading && subs?.subscriptions?.map((s: any) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium capitalize">{s.planSlug}</p>
                          <p className="text-xs text-muted-foreground font-mono">#{s.id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`capitalize text-xs ${STATUS_BADGE[s.status] ?? ""}`}>{s.status}</Badge>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground text-xs">{s.billingCycle}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{fmtINR(s.amount ?? 0)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(s.nextBillingDate)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(s.startDate)}</td>
                    </tr>
                  ))}
                  {!subLoading && !subs?.subscriptions?.length && (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No subscriptions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {subs && subs.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                <p className="text-xs text-muted-foreground">{subs.total} total</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={subPage <= 1} onClick={() => setSubPage(p=>p-1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                  <span className="text-xs px-2">{subPage} / {subs.pages}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={subPage >= subs.pages} onClick={() => setSubPage(p=>p+1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card className="border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ref</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Method</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">GST</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payLoading && Array.from({length:8}).map((_,i) => (
                    <tr key={i} className="border-b">
                      {Array.from({length:6}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                    </tr>
                  ))}
                  {!payLoading && pays?.payments?.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{p.reference ?? `PAY-${p.id}`}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`capitalize text-xs ${p.status === "paid" ? "bg-green-50 text-green-700 border-green-200" : p.status === "pending" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-red-50 text-red-700 border-red-200"}`}>{p.status}</Badge>
                      </td>
                      <td className="px-4 py-3 capitalize text-xs text-muted-foreground">{p.method ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{fmtINR(p.total ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{fmtINR(p.gstAmount ?? 0)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(p.paidAt ?? p.createdAt)}</td>
                    </tr>
                  ))}
                  {!payLoading && !pays?.payments?.length && (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No payments found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
