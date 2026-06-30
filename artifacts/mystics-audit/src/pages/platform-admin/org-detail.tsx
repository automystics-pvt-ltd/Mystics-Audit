import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Building2, Users, CreditCard, Shield, CheckCircle, AlertTriangle, Edit2, Save, X } from "lucide-react";
import PlatformLayout from "@/components/platform-layout";

const PLAN_CONFIG: Record<string, { maxUsers: number; maxModules: number; mrr: number; label: string }> = {
  trial:        { maxUsers: 2,   maxModules: 5,  mrr: 0,     label: "Trial" },
  starter:      { maxUsers: 5,   maxModules: 8,  mrr: 2999,  label: "Starter" },
  professional: { maxUsers: 15,  maxModules: 15, mrr: 7999,  label: "Professional" },
  enterprise:   { maxUsers: 999, maxModules: 15, mrr: 19999, label: "Enterprise" },
};

const MODULES = [
  "dashboard","accounting","sales","purchases","banking",
  "expenses","inventory","gst","budgets","reports","audit","users","settings",
];

const PLAN_MODULES: Record<string, string[]> = {
  trial:        ["dashboard","sales","expenses"],
  starter:      ["dashboard","accounting","sales","purchases","expenses","inventory","reports"],
  professional: MODULES,
  enterprise:   MODULES,
};

const ROLE_BADGE: Record<string, string> = {
  "Super Admin": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Admin":       "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Manager":     "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Accountant":  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Staff":       "bg-slate-500/10 text-slate-400 border-slate-500/20",
  "Viewer":      "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export default function OrgDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [org, setOrg]       = useState<any | null>(null);
  const [users, setUsers]   = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm]     = useState({ plan: "", status: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch(`/api/platform-admin/organizations/${id}`).then(r => r.json())
      .then(d => { setOrg(d); setUsers(d.users ?? []); setForm({ plan: d.plan, status: d.status, notes: d.notes ?? "" }); });

  useEffect(() => { load(); }, [id]);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/platform-admin/organizations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setSaving(false);
    setEditing(false);
    load();
  };

  if (!org) return <PlatformLayout><div className="flex items-center justify-center h-full text-slate-400">Loading…</div></PlatformLayout>;

  const planCfg = PLAN_CONFIG[form.plan] ?? PLAN_CONFIG.trial;
  const allowedModules = PLAN_MODULES[form.plan] ?? PLAN_MODULES.trial;

  return (
    <PlatformLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <button onClick={() => navigate("/platform-admin/organizations")}
            className="mt-1 text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{org.name}</h1>
                <p className="text-slate-400 text-sm">{org.city}{org.state ? `, ${org.state}` : ""} · {org.industry ?? "Industry not set"}</p>
              </div>
            </div>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-slate-200 text-sm border border-slate-700 rounded-lg"><X className="w-3.5 h-3.5" />Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium"><Save className="w-3.5 h-3.5" />{saving ? "Saving…" : "Save"}</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-indigo-400 hover:text-indigo-300 text-sm border border-indigo-500/30 rounded-lg transition-colors">
              <Edit2 className="w-3.5 h-3.5" />Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Details */}
          <div className="col-span-2 space-y-6">
            {/* Subscription settings */}
            <Section title="Subscription" icon={<CreditCard className="w-4 h-4 text-indigo-400" />}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Plan</label>
                  {editing ? (
                    <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                      {Object.entries(PLAN_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label} — ₹{v.mrr > 0 ? v.mrr.toLocaleString("en-IN") : "Free"}/mo</option>
                      ))}
                    </select>
                  ) : (
                    <span className="capitalize font-semibold text-white">{org.plan}</span>
                  )}
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Status</label>
                  {editing ? (
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                      {["active","trial","suspended","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span className={`capitalize font-semibold ${form.status === "active" ? "text-emerald-400" : form.status === "trial" ? "text-yellow-400" : "text-red-400"}`}>{org.status}</span>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <StatPill label="Users" value={`${org.usersCount} / ${planCfg.maxUsers === 999 ? "∞" : planCfg.maxUsers}`} />
                <StatPill label="Modules" value={`${allowedModules.length} / 13`} />
                <StatPill label="MRR" value={planCfg.mrr > 0 ? `₹${planCfg.mrr.toLocaleString("en-IN")}` : "Free"} />
              </div>
              <div className="mt-4">
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Internal Notes</label>
                {editing ? (
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Add internal notes about this org…" />
                ) : (
                  <p className="text-slate-300 text-sm">{org.notes || <span className="text-slate-600 italic">No notes</span>}</p>
                )}
              </div>
            </Section>

            {/* Module access */}
            <Section title="Module Access" icon={<Shield className="w-4 h-4 text-indigo-400" />}>
              <div className="grid grid-cols-3 gap-2">
                {MODULES.map(m => {
                  const allowed = allowedModules.includes(m);
                  return (
                    <div key={m} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium capitalize ${
                      allowed
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-600"
                    }`}>
                      {allowed ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {m}
                    </div>
                  );
                })}
              </div>
              {!editing && (
                <p className="text-slate-500 text-xs mt-3">
                  Module access is determined by the subscription plan. Upgrade to Professional or Enterprise for full access.
                </p>
              )}
            </Section>

            {/* Users in org */}
            <Section title={`Users (${users.length})`} icon={<Users className="w-4 h-4 text-indigo-400" />}>
              {users.length === 0 ? (
                <p className="text-slate-500 text-sm">No users assigned to this organization yet.</p>
              ) : (
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/50">
                      <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-300">
                        {u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{u.name}</p>
                        <p className="text-slate-500 text-xs">{u.email}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_BADGE[u.role] ?? ROLE_BADGE["Staff"]}`}>{u.role}</span>
                      <span className={`text-xs ${u.isActive ? "text-emerald-400" : "text-red-400"}`}>{u.isActive ? "Active" : "Suspended"}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Right: Contact info */}
          <div className="space-y-6">
            <Section title="Contact" icon={<Building2 className="w-4 h-4 text-indigo-400" />}>
              <InfoRow label="Contact" value={org.contactName} />
              <InfoRow label="Email"   value={org.contactEmail} />
              <InfoRow label="Phone"   value={org.contactPhone} />
              <InfoRow label="GSTIN"   value={org.gstin} mono />
              <InfoRow label="Industry" value={org.industry} />
              <InfoRow label="Billing"  value={org.billingCycle} />
              <InfoRow label="Created"  value={org.createdAt ? new Date(org.createdAt).toLocaleDateString("en-IN") : "—"} />
            </Section>
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">{icon}{title}</h3>
      {children}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded-lg px-3 py-2">
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="text-white font-semibold text-sm">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-slate-300 text-right ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</span>
    </div>
  );
}
