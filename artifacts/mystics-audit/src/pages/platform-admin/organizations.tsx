import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Building2, CheckCircle, Clock, AlertTriangle, XCircle, MoreHorizontal } from "lucide-react";
import PlatformLayout from "@/components/platform-layout";

const PLAN_BADGE: Record<string, string> = {
  trial:        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  starter:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  professional: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  enterprise:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  active:    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  trial:     <Clock       className="w-3.5 h-3.5 text-yellow-400" />,
  suspended: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
  cancelled: <XCircle     className="w-3.5 h-3.5 text-slate-500" />,
};

export default function PlatformOrganizations() {
  const [orgs, setOrgs]       = useState<any[]>([]);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ name: "", plan: "trial", contactEmail: "", contactName: "", city: "", state: "", industry: "" });

  const load = () => fetch("/api/platform-admin/organizations").then(r => r.json())
    .then(d => { setOrgs(d); setLoading(false); });

  useEffect(() => { load(); }, []);

  const filtered = orgs.filter(o => {
    const q = search.toLowerCase();
    const match = !q || o.name.toLowerCase().includes(q) || (o.city ?? "").toLowerCase().includes(q) || (o.contactEmail ?? "").toLowerCase().includes(q);
    const planMatch = filter === "all" || o.plan === filter || o.status === filter;
    return match && planMatch;
  });

  const handleCreate = async () => {
    if (!form.name) return;
    await fetch("/api/platform-admin/organizations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowNew(false);
    setForm({ name: "", plan: "trial", contactEmail: "", contactName: "", city: "", state: "", industry: "" });
    load();
  };

  const toggleStatus = async (org: any) => {
    const newStatus = org.status === "active" ? "suspended" : "active";
    await fetch(`/api/platform-admin/organizations/${org.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    load();
  };

  return (
    <PlatformLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Organizations</h1>
            <p className="text-slate-400 text-sm mt-1">{orgs.length} tenant{orgs.length !== 1 ? "s" : ""} on the platform</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Organization
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, city, email…"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
          </div>
          {["all", "trial", "starter", "professional", "enterprise", "suspended"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                filter === f ? "bg-indigo-600 text-white border-indigo-500" : "text-slate-400 border-slate-700 hover:border-slate-500"
              }`}>{f}</button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading…</div>
        ) : (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {["Organization", "Plan", "Users", "MRR", "Location", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(org => (
                  <tr key={org.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <div>
                          <Link href={`/platform-admin/organizations/${org.id}`} className="font-medium text-white hover:text-indigo-300 transition-colors">{org.name}</Link>
                          <div className="text-xs text-slate-500">{org.contactEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${PLAN_BADGE[org.plan]}`}>{org.plan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{org.usersCount}</span>
                      <span className="text-slate-500">/{org.maxUsers === 999 ? "∞" : org.maxUsers}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {org.mrr > 0 ? `₹${org.mrr.toLocaleString("en-IN")}` : <span className="text-slate-500">Free</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{org.city}{org.state ? `, ${org.state}` : ""}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-medium capitalize">
                        {STATUS_ICON[org.status]}
                        <span className={org.status === "active" ? "text-emerald-400" : org.status === "trial" ? "text-yellow-400" : org.status === "suspended" ? "text-red-400" : "text-slate-500"}>
                          {org.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/platform-admin/organizations/${org.id}`} className="text-indigo-400 hover:text-indigo-300 text-xs">Manage</Link>
                        <button onClick={() => toggleStatus(org)} className={`text-xs ${org.status === "active" ? "text-red-400 hover:text-red-300" : "text-emerald-400 hover:text-emerald-300"}`}>
                          {org.status === "active" || org.status === "trial" ? "Suspend" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-500">No organizations found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New org modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-5">
            <h2 className="text-white text-lg font-semibold">Provision New Organization</h2>
            <div className="space-y-3">
              <Field label="Organization Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Acme Corp Pvt Ltd" />
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Plan *</label>
                <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                  <option value="trial">Trial (Free · 2 users · 5 modules)</option>
                  <option value="starter">Starter (₹2,999/mo · 5 users · 8 modules)</option>
                  <option value="professional">Professional (₹7,999/mo · 15 users · 15 modules)</option>
                  <option value="enterprise">Enterprise (₹19,999/mo · Unlimited)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact Name"  value={form.contactName}  onChange={v => setForm(f => ({ ...f, contactName: v }))}  placeholder="John Doe" />
                <Field label="Contact Email" value={form.contactEmail} onChange={v => setForm(f => ({ ...f, contactEmail: v }))} placeholder="admin@org.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City"     value={form.city}     onChange={v => setForm(f => ({ ...f, city: v }))}     placeholder="Mumbai" />
                <Field label="State"    value={form.state}    onChange={v => setForm(f => ({ ...f, state: v }))}    placeholder="Maharashtra" />
              </div>
              <Field label="Industry" value={form.industry} onChange={v => setForm(f => ({ ...f, industry: v }))} placeholder="Technology / FMCG / Manufacturing…" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                Create Organization
              </button>
            </div>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-slate-400 text-xs font-medium block mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
    </div>
  );
}
