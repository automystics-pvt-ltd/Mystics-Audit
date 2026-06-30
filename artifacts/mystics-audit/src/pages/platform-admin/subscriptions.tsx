import { useEffect, useState } from "react";
import { Link } from "wouter";
import PlatformLayout from "@/components/platform-layout";
import {
  CreditCard, CheckCircle, AlertTriangle, Clock, XCircle,
  Plus, ChevronRight, RotateCcw, Search, Filter,
} from "lucide-react";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

const STATUS_STYLE: Record<string, string> = {
  active:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  trial:       "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  grace_period:"bg-orange-500/10 text-orange-400 border-orange-500/20",
  suspended:   "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled:   "bg-slate-500/10 text-slate-400 border-slate-500/20",
  expired:     "bg-slate-500/10 text-slate-500 border-slate-700",
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  active: <CheckCircle className="w-3 h-3" />,
  trial: <Clock className="w-3 h-3" />,
  grace_period: <AlertTriangle className="w-3 h-3" />,
  suspended: <AlertTriangle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

const PLAN_STYLE: Record<string, string> = {
  trial:        "bg-yellow-500/10 text-yellow-400",
  starter:      "bg-blue-500/10 text-blue-400",
  professional: "bg-purple-500/10 text-purple-400",
  enterprise:   "bg-emerald-500/10 text-emerald-400",
};

export default function PlatformSubscriptions() {
  const [subs, setSubs] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/platform-admin/subscriptions").then(r => r.json()),
      fetch("/api/platform-admin/organizations").then(r => r.json()),
    ]).then(([s, o]) => { setSubs(s); setOrgs(o); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = subs.filter(s => {
    const matchFilter = filter === "all" || s.status === filter;
    const matchSearch = !search ||
      s.org?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.planSlug?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalMrr = subs.filter(s => s.status === "active")
    .reduce((acc, s) => acc + (s.planSlug === "enterprise" ? 19999 : s.planSlug === "professional" ? 7999 : s.planSlug === "starter" ? 2999 : 0), 0);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/platform-admin/subscriptions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <PlatformLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
            <p className="text-slate-400 text-sm mt-1">{subs.length} total · {subs.filter(s => s.status === "active").length} active · MRR {fmt(totalMrr)}</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Subscription
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search org or plan…"
              className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1" />
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-800 border border-slate-700 rounded-lg">
            {["all","active","trial","grace_period","suspended","cancelled"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filter === f ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                {f.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {["Organization","Plan","Billing","Amount","Period End","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No subscriptions found</td></tr>
              ) : filtered.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-white text-sm">{sub.org?.name ?? `Org #${sub.orgId}`}</div>
                    <div className="text-slate-500 text-xs">{sub.org?.contactEmail}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${PLAN_STYLE[sub.planSlug] ?? "bg-slate-700 text-slate-300"}`}>
                      {sub.planSlug}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs capitalize">{sub.billingCycle}</td>
                  <td className="px-4 py-3.5 text-white font-medium">
                    {sub.amount > 0 ? fmt(sub.amount) : "Free"}
                    <div className="text-slate-500 text-xs">+18% GST</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">
                    {sub.currentPeriodEnd
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
                      : sub.trialEnd
                        ? `Trial ends ${new Date(sub.trialEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                        : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[sub.status] ?? "text-slate-400"}`}>
                      {STATUS_ICON[sub.status]}
                      {sub.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/platform-admin/organizations/${sub.orgId}`}>
                        <span className="text-indigo-400 hover:text-indigo-300 text-xs cursor-pointer">View</span>
                      </Link>
                      {sub.status === "active" && (
                        <button onClick={() => updateStatus(sub.id, "suspended")}
                          className="text-red-400 hover:text-red-300 text-xs">Suspend</button>
                      )}
                      {(sub.status === "suspended" || sub.status === "cancelled") && (
                        <button onClick={() => updateStatus(sub.id, "active")}
                          className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create subscription modal */}
        {showCreate && (
          <CreateSubscriptionModal orgs={orgs} onClose={() => setShowCreate(false)} onCreated={load} />
        )}
      </div>
    </PlatformLayout>
  );
}

function CreateSubscriptionModal({ orgs, onClose, onCreated }: {
  orgs: any[]; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({ orgId: "", planSlug: "starter", billingCycle: "monthly", notes: "" });
  const [saving, setSaving] = useState(false);

  const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
    trial: { monthly: 0, annual: 0 },
    starter: { monthly: 2999, annual: 28790 },
    professional: { monthly: 7999, annual: 76790 },
    enterprise: { monthly: 19999, annual: 191990 },
  };

  const price = PLAN_PRICES[form.planSlug]?.[form.billingCycle as "monthly" | "annual"] ?? 0;

  const handleCreate = async () => {
    if (!form.orgId) return;
    setSaving(true);
    await fetch("/api/platform-admin/subscriptions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, orgId: Number(form.orgId) }),
    });
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        <h2 className="text-white font-semibold text-lg">New Subscription</h2>

        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Organization</label>
            <select value={form.orgId} onChange={e => setForm(f => ({ ...f, orgId: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500">
              <option value="">Select organization…</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Plan</label>
              <select value={form.planSlug} onChange={e => setForm(f => ({ ...f, planSlug: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500">
                {["trial","starter","professional","enterprise"].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Billing Cycle</label>
              <select value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500">
                <option value="monthly">Monthly</option>
                <option value="annual">Annual (save 20%)</option>
              </select>
            </div>
          </div>
          {price > 0 && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-sm">
              <span className="text-indigo-400">Amount: </span>
              <span className="text-white font-semibold">₹{price.toLocaleString("en-IN")}</span>
              <span className="text-slate-400"> + 18% GST = </span>
              <span className="text-white font-bold">₹{(price * 1.18).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            </div>
          )}
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 resize-none placeholder-slate-600"
              placeholder="Internal notes…" />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm border border-slate-700 rounded-lg">Cancel</button>
          <button onClick={handleCreate} disabled={!form.orgId || saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? "Creating…" : "Create Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}
