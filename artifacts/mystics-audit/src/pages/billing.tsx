import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  CheckCircle, AlertTriangle, Clock,
  ChevronDown, ChevronUp, Zap, Users,
  Package, FileText, ArrowUpRight, Loader2, X, RefreshCw, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Razorpay helpers ─────────────────────────────────── */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay checkout"));
    document.body.appendChild(s);
  });
}

/* ── helpers ───────────────────────────────────────────── */
const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active:       { label: "Active", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
  trial:        { label: "Trial", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: <Clock className="w-4 h-4 text-amber-500" /> },
  grace_period: { label: "Grace Period", color: "text-orange-600", bg: "bg-orange-50 border-orange-200", icon: <AlertTriangle className="w-4 h-4 text-orange-500" /> },
  suspended:    { label: "Suspended", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
  cancelled:    { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: <X className="w-4 h-4 text-gray-400" /> },
};

const PLAN_COLORS: Record<string, string> = {
  trial:        "from-amber-500 to-orange-500",
  starter:      "from-blue-500 to-cyan-500",
  professional: "from-violet-600 to-purple-600",
  enterprise:   "from-emerald-500 to-teal-600",
};

const PLANS = [
  {
    slug: "starter", label: "Starter", monthlyPrice: 2999, annualPrice: 28790,
    maxUsers: 5, maxModules: 8,
    features: ["5 Users", "8 Modules", "GST Filing", "Inventory", "Purchase Orders", "Priority Email Support"],
    badge: "",
  },
  {
    slug: "professional", label: "Professional", monthlyPrice: 7999, annualPrice: 76790,
    maxUsers: 15, maxModules: 15,
    features: ["15 Users", "All 15 Modules", "Advanced GST", "Budgets & Forecasting", "RBAC & Permissions", "API Access", "Phone Support"],
    badge: "Most Popular",
  },
  {
    slug: "enterprise", label: "Enterprise", monthlyPrice: 19999, annualPrice: 191990,
    maxUsers: 999, maxModules: 15,
    features: ["Unlimited Users", "All Modules", "Dedicated CSM", "99.9% SLA", "Custom Integrations", "On-premise Option", "White-glove Onboarding"],
    badge: "Best Value",
  },
];

/* ── Main Billing Page ─────────────────────────────────── */
export default function BillingPage() {
  const { user } = useAuth();
  const orgId = user?.orgId ?? 1;
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState<any | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/billing/current?orgId=${orgId}`).then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [orgId]);

  const sub = data?.sub;
  const org = data?.org;
  const plan = data?.plan;
  const invoices: any[] = data?.invoices ?? [];
  const payments: any[] = data?.payments ?? [];
  const usersCount = data?.usersCount ?? 0;
  const statusCfg = STATUS_CONFIG[sub?.status ?? "trial"] ?? STATUS_CONFIG.trial;

  const chosenPlan = PLANS.find(p => p.slug === (selectedPlan ?? sub?.planSlug)) ?? PLANS[0];
  const chosenPrice = billingCycle === "annual" ? chosenPlan.annualPrice : chosenPlan.monthlyPrice;
  const chosenTax   = Math.round(chosenPrice * 0.18);
  const chosenTotal = chosenPrice + chosenTax;

  const handleRazorpayCheckout = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const planSlug = selectedPlan ?? sub?.planSlug ?? "starter";
      const plan = PLANS.find(p => p.slug === planSlug) ?? PLANS[0];
      const amount = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;

      // 1. Create order on server
      const orderRes = await fetch("/api/billing/razorpay/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: "INR", planSlug, billingCycle, orgId }),
      }).then(r => r.json());

      if (orderRes.error) { setPayError(orderRes.error); setPaying(false); return; }

      // 2. Load checkout script
      await loadRazorpayScript();

      // 3. Open Razorpay modal
      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: "Mystics Audit",
        description: `${plan.label} — ${billingCycle}`,
        order_id: orderRes.orderId,
        handler: async (response: any) => {
          // 4. Verify on server
          const verify = await fetch("/api/billing/razorpay/verify", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id:    response.razorpay_order_id,
              razorpay_payment_id:  response.razorpay_payment_id,
              razorpay_signature:   response.razorpay_signature,
              orgId, planSlug, billingCycle, amount,
            }),
          }).then(r => r.json());
          if (verify.ok) { setPaySuccess(verify); load(); }
          else { setPayError(verify.error ?? "Payment verification failed"); }
          setPaying(false);
        },
        prefill: { name: org?.contactName ?? "", email: org?.contactEmail ?? "" },
        notes: { orgId: String(orgId), planSlug, billingCycle },
        theme: { color: "#7c3aed" },
        modal: { ondismiss: () => setPaying(false) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setPayError(resp.error?.description ?? "Payment failed");
        setPaying(false);
      });
      rzp.open();
    } catch (e: any) {
      setPayError(e.message ?? "Something went wrong");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Billing & Subscription</h1>
          <p className="text-sm text-gray-500 mt-0.5">{org?.name} — manage your plan, payments, and invoices</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      {/* Payment success banner */}
      {paySuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-800">Payment Successful!</p>
            <p className="text-sm text-emerald-600">Your subscription is now active. Transaction ID: {paySuccess.payment?.transactionId}</p>
          </div>
          <button onClick={() => setPaySuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">

        {/* Left: current subscription */}
        <div className="col-span-2 space-y-5">

          {/* Current plan card */}
          <div className={`relative overflow-hidden rounded-2xl p-6 text-white bg-gradient-to-br ${PLAN_COLORS[sub?.planSlug ?? "trial"]}`}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
            <div className="relative flex items-start justify-between">
              <div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-4 ${statusCfg.bg} ${statusCfg.color} border-white/20 bg-white/20 text-white`}>
                  {statusCfg.icon} {statusCfg.label}
                </div>
                <p className="text-white/70 text-sm font-medium mb-1">Current Plan</p>
                <h2 className="text-3xl font-extrabold capitalize">{sub?.planSlug ?? "Trial"}</h2>
                {sub?.billingCycle && <p className="text-white/70 text-sm mt-1">Billed {sub.billingCycle}</p>}
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs mb-1">Renewal Date</p>
                <p className="font-bold text-lg">
                  {sub?.currentPeriodEnd
                    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : sub?.trialEnd
                      ? new Date(sub.trialEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " (Trial)"
                      : "—"}
                </p>
              </div>
            </div>

            {/* Usage meters */}
            <div className="relative grid grid-cols-2 gap-4 mt-6">
              <UsageMeter label="Users" used={usersCount} max={sub?.maxUsers ?? 2} icon={<Users className="w-3.5 h-3.5" />} />
              <UsageMeter label="Modules" used={sub?.maxModules ?? 5} max={15} icon={<Package className="w-3.5 h-3.5" />} />
            </div>
          </div>

          {/* Upgrade plans */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Available Plans</h2>
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
                {(["monthly","annual"] as const).map(c => (
                  <button key={c} onClick={() => setBillingCycle(c)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize", billingCycle === c ? "bg-white shadow-sm text-violet-700" : "text-gray-500")}>
                    {c === "annual" ? "Annual (−20%)" : "Monthly"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {PLANS.map(p => {
                const price = billingCycle === "annual" ? p.annualPrice : p.monthlyPrice;
                const isCurrentPlan = sub?.planSlug === p.slug;
                const isSelected = selectedPlan === p.slug;
                return (
                  <div key={p.slug} onClick={() => setSelectedPlan(p.slug)}
                    className={cn(
                      "rounded-2xl border-2 p-5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg",
                      isSelected ? "border-violet-500 bg-violet-50 shadow-violet-100 shadow-lg" :
                        isCurrentPlan ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-white hover:border-violet-200"
                    )}>
                    {p.badge && (
                      <span className="inline-block text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full mb-2">{p.badge}</span>
                    )}
                    {isCurrentPlan && !p.badge && (
                      <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full mb-2">Current Plan</span>
                    )}
                    {!p.badge && !isCurrentPlan && <div className="h-5 mb-2" />}
                    <h3 className="font-bold text-gray-900 text-lg">{p.label}</h3>
                    <div className="mt-2 mb-4">
                      <span className="text-2xl font-extrabold text-gray-900">{fmt(price)}</span>
                      <span className="text-gray-400 text-sm">/{billingCycle === "annual" ? "yr" : "mo"}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {p.features.slice(0, 5).map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA to pay */}
          {selectedPlan && selectedPlan !== sub?.planSlug && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-violet-800">Upgrade to {chosenPlan.label}</p>
                  <p className="text-sm text-violet-600 mt-0.5">
                    {fmt(chosenPrice)} + {fmt(chosenTax)} GST = <strong>{fmt(chosenTotal)}</strong> / {billingCycle === "annual" ? "year" : "month"}
                  </p>
                </div>
                <button onClick={handleRazorpayCheckout} disabled={paying}
                  className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors">
                  {paying ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <>Pay via Razorpay <ArrowUpRight className="w-4 h-4" /></>}
                </button>
              </div>
              <p className="text-xs text-violet-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Secured by Razorpay · UPI, Cards, Netbanking & Wallets accepted
              </p>
              {payError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{payError}
                </div>
              )}
            </div>
          )}

          {/* Payment history */}
          <div className="bg-white rounded-2xl border border-gray-100">
            <button onClick={() => setShowHistory(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 rounded-2xl transition-colors">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-500" /> Invoice & Payment History
                <span className="text-xs font-normal text-gray-400">({invoices.length} invoices)</span>
              </h2>
              {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showHistory && (
              <div className="px-5 pb-5">
                {invoices.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">No invoices yet</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.slice(0, 10).map((inv: any) => (
                      <div key={inv.id} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-violet-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{inv.invoiceNumber}</p>
                            <p className="text-xs text-gray-400">{inv.planLabel} · {inv.billingCycle} · {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString("en-IN") : "—"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{fmt(inv.total)}</p>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Quick stats */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-bold text-gray-900">Account Summary</h2>
            {[
              { label: "Organization", value: org?.name, mono: false },
              { label: "Plan", value: (sub?.planSlug ?? "trial").charAt(0).toUpperCase() + (sub?.planSlug ?? "trial").slice(1), mono: false },
              { label: "Billing Cycle", value: sub?.billingCycle ?? "—", mono: false },
              { label: "Auto-Renew", value: sub?.autoRenew ? "Enabled" : "Disabled", mono: false },
              { label: "GSTIN", value: org?.gstin ?? "Not set", mono: true },
              { label: "Contact Email", value: org?.contactEmail ?? "—", mono: false },
            ].map(r => (
              <div key={r.label} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-gray-400 shrink-0">{r.label}</span>
                <span className={`text-gray-800 text-right ${r.mono ? "font-mono text-xs" : "font-medium"} truncate`}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Plan features */}
          {plan && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h2 className="font-bold text-gray-900">What's Included</h2>
              <ul className="space-y-2">
                {(plan.features ?? []).map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-gray-100 space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Max Users</span>
                  <span className="font-semibold text-gray-700">{sub?.maxUsers === 999 ? "Unlimited" : sub?.maxUsers ?? 2}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Max Modules</span>
                  <span className="font-semibold text-gray-700">{sub?.maxModules ?? 5} / 15</span>
                </div>
              </div>
            </div>
          )}

          {/* Renew / upgrade CTA */}
          {(sub?.status === "trial" || sub?.status === "grace_period") && (
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white">
              <Zap className="w-5 h-5 mb-3 text-yellow-300" />
              <p className="font-bold text-lg mb-1">
                {sub.status === "trial" ? "Your trial ends soon" : "Action required"}
              </p>
              <p className="text-white/70 text-sm mb-4">
                {sub.status === "trial"
                  ? "Upgrade to a paid plan to keep your data and continue uninterrupted."
                  : "Your payment failed. Please update your payment method to restore access."}
              </p>
              <button onClick={() => { setSelectedPlan("starter"); handleRazorpayCheckout(); }}
                disabled={paying}
                className="w-full bg-white text-violet-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-violet-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {paying ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : "Upgrade Now via Razorpay"}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function UsageMeter({ label, used, max, icon }: { label: string; used: number; max: number; icon: React.ReactNode }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const isHigh = pct >= 80;
  return (
    <div className="bg-white/15 rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-white/80 text-xs font-medium">{icon}{label}</div>
        <span className="text-white font-bold text-sm">{used} / {max === 999 ? "∞" : max}</span>
      </div>
      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isHigh ? "bg-red-300" : "bg-white/80"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
