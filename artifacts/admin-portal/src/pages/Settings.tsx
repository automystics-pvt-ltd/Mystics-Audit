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
import { Save, Globe, Shield, Bell, CreditCard, Palette } from "lucide-react";

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
  general: Globe, billing: CreditCard, email: Bell, security: Shield, branding: Palette
};

export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [localValues, setLocalValues] = useState<Record<string,string>>({});

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-settings"],
    queryFn: () => api.get("/admin/settings"),
  });

  const updateMut = useMutation({
    mutationFn: ({ key, value }: any) => api.patch(`/admin/settings/${key}`, { value }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-settings"] }); toast({ title: "Setting saved" }); },
    onError: (e:any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function getValue(key: string, def: string): string {
    if (localValues[key] !== undefined) return localValues[key];
    const s = settings.find((s:any) => s.key === key);
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
                              setLocalValues(lv => ({...lv, [def.key]: String(v)}));
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
                            onChange={e => setLocalValues(lv => ({...lv, [def.key]: e.target.value}))}
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
      </Tabs>
    </div>
  );
}
