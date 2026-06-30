import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Flag, Zap } from "lucide-react";

const CAT_COLOR: Record<string,string> = {
  general: "bg-gray-100 text-gray-600",
  billing: "bg-green-50 text-green-700",
  modules: "bg-blue-50 text-blue-700",
  security: "bg-red-50 text-red-700",
  beta: "bg-purple-50 text-purple-700",
};

export default function FeatureFlags() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const [form, setForm] = useState({ key: "", name: "", description: "", category: "general", enabled: false, rolloutPct: 100 });

  const { data: flags = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-flags"],
    queryFn: () => api.get("/admin/feature-flags"),
  });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post("/admin/feature-flags", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-flags"] }); setShowCreate(false); toast({ title: "Flag created" }); setForm({ key:"",name:"",description:"",category:"general",enabled:false,rolloutPct:100 }); },
    onError: (e:any) => toast({ title:"Error", description:e.message, variant:"destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: any) => api.patch(`/admin/feature-flags/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-flags"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.del(`/admin/feature-flags/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-flags"] }); toast({ title: "Flag deleted" }); },
  });

  const filtered = catFilter === "all" ? flags : flags.filter((f:any) => f.category === catFilter);

  const categories = ["all", ...Array.from(new Set(flags.map((f:any) => f.category).filter(Boolean)))];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Feature Flags</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Control feature rollout across the platform</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Flag
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <Button key={c} variant={catFilter === c ? "default" : "outline"} size="sm" className="h-7 text-xs capitalize" onClick={() => setCatFilter(c)}>
            {c === "all" ? "All Categories" : c}
          </Button>
        ))}
      </div>

      {isLoading && <div className="grid gap-3">{Array.from({length:4}).map((_,i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>}

      <div className="space-y-2">
        {filtered.map((f: any) => (
          <Card key={f.id} className="border shadow-sm hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-md ${f.enabled ? "bg-primary/10" : "bg-muted"}`}>
                  <Flag className={`w-4 h-4 ${f.enabled ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{f.name}</p>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 capitalize ${CAT_COLOR[f.category]}`}>{f.category}</Badge>
                    {f.rolloutPct < 100 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-700 border-yellow-200">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />{f.rolloutPct}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{f.key}</p>
                  {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${f.enabled ? "text-green-600" : "text-muted-foreground"}`}>{f.enabled ? "Enabled" : "Disabled"}</span>
                  <Switch
                    checked={f.enabled}
                    onCheckedChange={v => updateMut.mutate({ id: f.id, body: { enabled: v } })}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this flag?")) deleteMut.mutate(f.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No feature flags found</div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Feature Flag</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Flag Key *</Label>
              <Input placeholder="e.g. enable_bulk_import" value={form.key} onChange={e => setForm(f=>({...f,key:e.target.value.toLowerCase().replace(/\s+/g,"_")}))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Display Name *</Label>
              <Input placeholder="e.g. Enable Bulk Import" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v=>setForm(f=>({...f,category:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["general","billing","modules","security","beta"].map(c=><SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rollout %: {form.rolloutPct}%</Label>
                <Slider value={[form.rolloutPct]} min={0} max={100} step={5} onValueChange={([v])=>setForm(f=>({...f,rolloutPct:v}))} className="mt-3" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={v=>setForm(f=>({...f,enabled:v}))} />
              <Label>Enable immediately</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={()=>setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending?"Creating…":"Create Flag"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
