import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  CheckCircle, AlertTriangle, Clock, CreditCard, Smartphone,
  Globe, Wallet, ChevronDown, ChevronUp, Shield, Zap, Users,
  Package, FileText, ArrowUpRight, Loader2, X, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const PAYMENT_METHODS = [
  {
    id: "upi",
    label: "UPI",
    icon: <Smartphone className="w-5 h-5" />,
    options: ["PhonePe", "Google Pay", "Paytm", "BHIM", "Amazon Pay"],
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    icon: <CreditCard className="w-5 h-5" />,
    options: [],
  },
  {
    id: "netbanking",
    label: "Net Banking",
    icon: <Globe className="w-5 h-5" />,
    options: ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Bank", "Yes Bank", "Punjab National Bank"],
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: <Wallet className="w-5 h-5" />,
    options: ["PhonePe Wallet", "Paytm Wallet", "Amazon Pay", "Mobikwik"],
  },
];

/* ── UPI form ──────────────────────────────────────────── */
function UpiForm({ onPay, paying }: { onPay: (detail: string) => void; paying: boolean }) {
  const [app, setApp] = useState("PhonePe");
  const [upiId, setUpiId] = useState("");
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-2">Select UPI App</label>
        <div className="flex flex-wrap gap-2">
          {["PhonePe","Google Pay","Paytm","BHIM","Amazon Pay"].map(a => (
            <button key={a} onClick={() => setApp(a)}
              className={cn("px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors", app === a ? "bg-violet-600 border-violet-600 text-white" : "border-gray-200 text-gray-600 hover:border-violet-300")}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1.5">UPI ID</label>
        <input value={upiId} onChange={e => setUpiId(e.target.value)}
          placeholder="yourname@okicici"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        <p className="text-xs text-gray-400 mt-1">You'll receive a payment request on your {app} app</p>
      </div>
      <button onClick={() => onPay(`${app} UPI`)} disabled={!upiId || paying}
        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-violet-200">
        {paying ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing…</span> : "Pay via UPI"}
      </button>
    </div>
  );
}

/* ── Card form ─────────────────────────────────────────── */
function CardForm({ onPay, paying }: { onPay: (detail: string) => void; paying: boolean }) {
  const [num, setNum] = useState(""); const [exp, setExp] = useState(""); const [cvv, setCvv] = useState(""); const [name, setName] = useState("");
  const fmtCard = (v: string) => v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExp  = (v: string) => { const d = v.replace(/\D/g,"").slice(0,4); return d.length > 2 ? d.slice(0,2)+"/"+d.slice(2) : d; };
  const brand = num.startsWith("4") ? "Visa" : num.startsWith("5") ? "Mastercard" : num.startsWith("6") ? "RuPay" : "Card";
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1.5">Card Number</label>
        <div className="relative">
          <input value={fmtCard(num)} onChange={e => setNum(e.target.value.replace(/\s/g,""))}
            placeholder="1234 5678 9012 3456" maxLength={19}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          {brand !== "Card" && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-600">{brand}</span>}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1.5">Name on Card</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="JOHN DOE"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1.5">Expiry</label>
          <input value={fmtExp(exp)} onChange={e => setExp(e.target.value)} placeholder="MM/YY" maxLength={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1.5">CVV</label>
          <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="•••" maxLength={4} type="password"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        </div>
      </div>
      <button onClick={() => onPay(`${brand} Card ending ${num.slice(-4)}`)} disabled={num.length < 16 || !exp || !cvv || !name || paying}
        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-violet-200">
        {paying ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing…</span> : "Pay Securely"}
      </button>
      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
        <Shield className="w-3 h-3" /> 256-bit SSL secured · PCI DSS compliant
      </p>
    </div>
  );
}

/* ── Net Banking form ──────────────────────────────────── */
function NetBankingForm({ onPay, paying }: { onPay: (detail: string) => void; paying: boolean }) {
  const [bank, setBank] = useState("");
  const BANKS = ["SBI","HDFC Bank","ICICI Bank","Axis Bank","Kotak Bank","Yes Bank","Punjab National Bank","Bank of Baroda","Canara Bank","Union Bank"];
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-2">Select Bank</label>
        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {BANKS.map(b => (
            <button key={b} onClick={() => setBank(b)}
              className={cn("px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left", bank === b ? "bg-violet-50 border-violet-400 text-violet-700" : "border-gray-200 text-gray-600 hover:border-violet-200 hover:bg-violet-50/50")}>
              {b}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => onPay(`${bank} Net Banking`)} disabled={!bank || paying}
        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50">
        {paying ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing…</span> : "Continue to Bank"}
      </button>
    </div>
  );
}

/* ── Wallet form ───────────────────────────────────────── */
function WalletForm({ onPay, paying }: { onPay: (detail: string) => void; paying: boolean }) {
  const [wallet, setWallet] = useState("");
  const WALLETS = ["PhonePe Wallet","Paytm Wallet","Amazon Pay","Mobikwik","Ola Money","JioMoney"];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {WALLETS.map(w => (
          <button key={w} onClick={() => setWallet(w)}
            className={cn("px-3 py-3 rounded-xl border text-sm font-medium transition-all text-left", wallet === w ? "bg-violet-50 border-violet-400 text-violet-700" : "border-gray-200 text-gray-600 hover:border-violet-200")}>
            {w}
          </button>
        ))}
      </div>
      <button onClick={() => onPay(wallet)} disabled={!wallet || paying}
        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50">
        {paying ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing…</span> : "Pay via Wallet"}
      </button>
    </div>
  );
}

/* ── Main Billing Page ─────────────────────────────────── */
export default function BillingPage() {
  const { user } = useAuth();
  const orgId = user?.orgId ?? 1;
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [payMethod, setPayMethod] = useState("upi");
  const [paying, setPaying] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paySuccess, setPaySuccess] = useState<any | null>(null);
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

  const handlePay = async (methodDetail: string) => {
    setPaying(true);
    try {
      const r = await fetch("/api/billing/pay", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId, method: payMethod, methodDetail,
          planSlug: selectedPlan ?? sub?.planSlug ?? "starter",
          billingCycle,
        }),
      });
      const result = await r.json();
      setPaySuccess(result);
      setShowPayModal(false);
      load();
    } catch { } finally { setPaying(false); }
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
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-violet-800">Upgrade to {chosenPlan.label}</p>
                <p className="text-sm text-violet-600 mt-0.5">
                  {fmt(chosenPrice)} + {fmt(chosenTax)} GST = <strong>{fmt(chosenTotal)}</strong> / {billingCycle === "annual" ? "year" : "month"}
                </p>
              </div>
              <button onClick={() => setShowPayModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-colors">
                Pay Now <ArrowUpRight className="w-4 h-4" />
              </button>
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
              <button onClick={() => { setSelectedPlan("starter"); setShowPayModal(true); }}
                className="w-full bg-white text-violet-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-violet-50 transition-colors">
                Upgrade Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPayModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 px-6 py-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">Complete Payment</h2>
                <button onClick={() => setShowPayModal(false)}><X className="w-5 h-5 text-white/70 hover:text-white" /></button>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold">{fmt(chosenTotal)}</span>
                <span className="text-white/70 text-sm">incl. 18% GST</span>
              </div>
              <p className="text-white/70 text-sm mt-1">{chosenPlan.label} plan · {billingCycle}</p>
            </div>

            <div className="p-6">
              {/* Payment method tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.id} onClick={() => setPayMethod(m.id)}
                    className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all", payMethod === m.id ? "bg-white shadow text-violet-700" : "text-gray-500 hover:text-gray-700")}>
                    {m.icon}
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Method-specific form */}
              {payMethod === "upi"        && <UpiForm onPay={d => handlePay(d)} paying={paying} />}
              {payMethod === "card"       && <CardForm onPay={d => handlePay(d)} paying={paying} />}
              {payMethod === "netbanking" && <NetBankingForm onPay={d => handlePay(d)} paying={paying} />}
              {payMethod === "wallet"     && <WalletForm onPay={d => handlePay(d)} paying={paying} />}
            </div>
          </div>
        </div>
      )}
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
