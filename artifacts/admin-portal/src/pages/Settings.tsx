import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Globe, Shield, Bell, CreditCard, Palette,
  Eye, EyeOff, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";

const DEFAULTS = [
  { key: "platform_name",          label: "Platform Name",         category: "branding",  type: "text",    default: "Mystics Audit" },
  { key: "support_email",          label: "Support Email",         category: "general",   type: "email",   default: "support@mystics.app" },
  { key: "trial_days",             label: "Trial Period (days)",   category: "billing",   type: "number",  default: "14" },
  { key: "max_trial_users",        label: "Max Trial Users",       category: "billing",   type: "number",  default: "5" },
  { key: "enable_signups",         label: "Allow New Sign-ups",    category: "general",   type: "boolean", default: "true" },
  { key: "maintenance_mode",       label: "Maintenance Mode",      category: "general",   type: "boolean", default: "false" },
  { key: "smtp_host",              label: "SMTP Host",             category: "email",     type: "text",    default: "" },
  { key: "smtp_port",              label: "SMTP Port",             category: "email",     type: "number",  default: "587" },
  { key: "smtp_from",              label: "From Address",          category: "email",     type: "email",   default: "noreply@mystics.app" },
  { key: "session_timeout_mins",   label: "Session Timeout (min)", category: "security",  type: "number",  default: "60" },
  { key: "mfa_required",          label: "Require MFA for Admins",category: "security",  type: "boolean", default: "true" },
  { key: "ip_allowlist_enabled",   label: "IP Allowlist",          category: "security",  type: "boolean", default: "false" },
];

const CAT_ICON: Record<string, any> = {
  general: Globe, billing: CreditCard, email: Bell, security: Shield, branding: Palette,
};

/* ── Payment Gateway Tab ───────────────────────────────── */
function PaymentGatewaySettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);

  const { data: gw, isLoading } = useQuery<any>({
    queryKey: ["payment-gateway"],
    queryFn: () => api.get("/admin/settings/payment-gateway"),
    onSuccess: (d: any) => setForm({ ...d }),
  } as any);

  const saveMut = useMutation({
    mutationFn: (body: any) => api.patch("/admin/settings/payment-gateway", body) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-gateway"] });
      setDirty(false);
      toast({ title: "Payment gateway settings saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function set(key: string, val: any) {
    setForm(f => ({ ...f, [key]: val }));
    setDirty(true);
  }

  function save() {
    saveMut.mutate(form);
  }

  const effective = { ...(gw ?? {}), ...form };
  const isRazorpay = (effective.provider ?? "razorpay") === "razorpay";

  if (isLoading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading gateway settings…
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${effective.enabled ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        {effective.enabled
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
          : <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />}
        <div>
          <p className={`text-sm font-semibold ${effective.enabled ? "text-emerald-800" : "text-amber-800"}`}>
            {effective.enabled ? "Payment gateway is active" : "Payment gateway is disabled"}
          </p>
          <p className={`text-xs mt-0.5 ${effective.enabled ? "text-emerald-600" : "text-amber-600"}`}>
            {effective.enabled
              ? `Tenants can pay via Razorpay checkout (${effective.mode === "live" ? "Live" : "Test"} mode).`
              : "Enable the gateway and add your API keys so tenants can upgrade their plans."}
          </p>
        </div>
        <div className="ml-auto">
          <Switch
            checked={!!effective.enabled}
            onCheckedChange={v => set("enabled", v)}
          />
        </div>
      </div>

      {/* Provider */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-violet-500" /> Payment Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="flex gap-3">
            {[{ id: "razorpay", label: "Razorpay", desc: "India's leading payment gateway — UPI, Cards, Netbanking, Wallets" }].map(p => (
              <button
                key={p.id}
                onClick={() => set("provider", p.id)}
                className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${effective.provider === p.id || !effective.provider
                  ? "border-violet-500 bg-violet-50"
                  : "border-gray-200 hover:border-violet-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-900">{p.label}</span>
                  {(effective.provider === p.id || !effective.provider) && (
                    <Badge className="bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0">Selected</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">{p.desc}</p>
              </button>
            ))}
          </div>

          {/* Mode */}
          <div>
            <Label className="text-xs font-medium text-gray-600 block mb-2">Mode</Label>
            <div className="flex gap-2">
              {(["test", "live"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => set("mode", m)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all capitalize ${effective.mode === m
                    ? m === "live" ? "bg-emerald-600 border-emerald-600 text-white" : "bg-violet-600 border-violet-600 text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  {m === "live" ? "🔴 Live" : "🧪 Test"}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {effective.mode === "live"
                ? "Live mode — real money is collected. Use live API keys."
                : "Test mode — no real money. Use test keys from Razorpay Dashboard."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      {isRazorpay && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Razorpay API Keys</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get your keys from{" "}
              <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer"
                className="text-violet-600 hover:underline">
                Razorpay Dashboard → Settings → API Keys
              </a>
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            {/* Key ID */}
            <div>
              <Label className="text-xs font-medium text-gray-600 block mb-1.5">
                Key ID <span className="text-gray-400">(public — safe to share)</span>
              </Label>
              <Input
                placeholder={effective.mode === "live" ? "rzp_live_..." : "rzp_test_..."}
                value={form.keyId ?? effective.keyId ?? ""}
                onChange={e => set("keyId", e.target.value)}
                className="font-mono text-sm h-9"
              />
              {effective.keyId && (
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> Key ID configured
                </p>
              )}
            </div>

            {/* Key Secret */}
            <div>
              <Label className="text-xs font-medium text-gray-600 block mb-1.5">
                Key Secret <span className="text-gray-400">(private — never share)</span>
              </Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder={effective.keySecretSet ? "Leave blank to keep existing secret" : "Enter Key Secret…"}
                  value={form.keySecret ?? ""}
                  onChange={e => set("keySecret", e.target.value)}
                  className="font-mono text-sm h-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {effective.keySecretSet && !form.keySecret && (
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> Key Secret already saved
                </p>
              )}
            </div>

            {/* Webhook Secret */}
            <div>
              <Label className="text-xs font-medium text-gray-600 block mb-1.5">
                Webhook Secret <span className="text-gray-400">(optional — for payment webhooks)</span>
              </Label>
              <div className="relative">
                <Input
                  type={showWebhook ? "text" : "password"}
                  placeholder={effective.webhookSecretSet ? "Leave blank to keep existing" : "Enter Webhook Secret…"}
                  value={form.webhookSecret ?? ""}
                  onChange={e => set("webhookSecret", e.target.value)}
                  className="font-mono text-sm h-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhook(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Key ID quick look */}
            {(form.keyId ?? effective.keyId) && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-xs font-mono text-gray-500 break-all">
                Key ID: {form.keyId ?? effective.keyId}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card className="border shadow-sm bg-violet-50/50">
        <CardContent className="px-5 py-4">
          <p className="text-xs font-semibold text-violet-800 mb-2">How it works</p>
          <ol className="text-xs text-violet-700 space-y-1 list-decimal list-inside">
            <li>Tenant clicks "Pay Now" on their Billing page</li>
            <li>Our server creates a Razorpay order using your Key Secret</li>
            <li>Razorpay checkout popup opens — tenant pays via UPI / Card / Netbanking / Wallet</li>
            <li>Our server verifies the payment signature and activates the subscription</li>
            <li>Invoice is auto-generated and recorded in Admin → Billing</li>
          </ol>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          onClick={save}
          disabled={saveMut.isPending || !dirty}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
        >
          {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Gateway Settings
        </Button>
        {!dirty && !saveMut.isPending && (
          <span className="text-xs text-muted-foreground">All changes saved</span>
        )}
      </div>
    </div>
  );
}

/* ── Main Settings Page ────────────────────────────────── */
export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-settings"],
    queryFn: () => api.get("/admin/settings"),
  });

  const updateMut = useMutation({
    mutationFn: ({ key, value }: any) => api.patch(`/admin/settings/${key}`, { value }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-settings"] }); toast({ title: "Setting saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function getValue(key: string, def: string): string {
    if (localValues[key] !== undefined) return localValues[key];
    const s = settings.find((s: any) => s.key === key);
    return s?.value ?? def;
  }

  function save(key: string) {
    const val = getValue(key, "");
    updateMut.mutate({ key, value: val });
  }

  const categories = Array.from(new Set(DEFAULTS.map(d => d.category)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure global platform behaviour and defaults</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="bg-muted/50 h-8">
          {categories.map(c => {
            const Icon = CAT_ICON[c] ?? Globe;
            return (
              <TabsTrigger key={c} value={c} className="text-xs px-3 gap-1.5 capitalize">
                <Icon className="w-3 h-3" />{c}
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="payment" className="text-xs px-3 gap-1.5">
            <CreditCard className="w-3 h-3" />Payment Gateway
          </TabsTrigger>
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold capitalize">{cat} Settings</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {DEFAULTS.filter(d => d.category === cat).map(def => {
                  const val = getValue(def.key, def.default);
                  return (
                    <div key={def.key} className="flex items-center gap-4 py-3 border-b last:border-0">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">{def.label}</Label>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{def.key}</p>
                      </div>
                      {def.type === "boolean" ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={val === "true"}
                            onCheckedChange={v => {
                              setLocalValues(lv => ({ ...lv, [def.key]: String(v) }));
                              updateMut.mutate({ key: def.key, value: String(v) });
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{val === "true" ? "Enabled" : "Disabled"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            type={def.type}
                            className="h-8 text-sm w-56"
                            value={val}
                            onChange={e => setLocalValues(lv => ({ ...lv, [def.key]: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") save(def.key); }}
                          />
                          <Button size="sm" variant="outline" className="h-8 px-3 gap-1" onClick={() => save(def.key)} disabled={updateMut.isPending}>
                            <Save className="w-3 h-3" /> Save
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="payment" className="mt-4">
          <PaymentGatewaySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
