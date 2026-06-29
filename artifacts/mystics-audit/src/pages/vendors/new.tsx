import { useCreateVendor, getListVendorsQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";

export default function NewVendor() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const mutation = useCreateVendor();
  const [form, setForm] = useState({ name: "", gstin: "", pan: "", email: "", phone: "", city: "", state: "Maharashtra", paymentTerms: "30 days", openingBalance: "0", tdsSection: "", msmeRegistrationNo: "" });
  const [isMsme, setIsMsme] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ data: { ...form, isMsme } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListVendorsQueryKey() }); navigate("/vendors"); },
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/vendors"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">New Vendor</h1>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Vendor Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1"><Label>Name *</Label><Input required value={form.name} onChange={set("name")} /></div>
            <div className="space-y-1"><Label>GSTIN</Label><Input value={form.gstin} onChange={set("gstin")} /></div>
            <div className="space-y-1"><Label>PAN</Label><Input value={form.pan} onChange={set("pan")} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={set("email")} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} /></div>
            <div className="space-y-1"><Label>City</Label><Input value={form.city} onChange={set("city")} /></div>
            <div className="space-y-1"><Label>State</Label><Input value={form.state} onChange={set("state")} /></div>
            <div className="space-y-1">
              <Label>Payment Terms</Label>
              <Select defaultValue="30 days" onValueChange={v => setForm(f => ({ ...f, paymentTerms: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["7 days","15 days","30 days","45 days","60 days","90 days"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>TDS Section</Label>
              <Select onValueChange={v => setForm(f => ({ ...f, tdsSection: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{["194C","194J","194H","194I","194Q","No TDS"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={isMsme} onCheckedChange={setIsMsme} />
              <Label>MSME Vendor</Label>
            </div>
            {isMsme && (
              <div className="col-span-2 space-y-1"><Label>MSME Registration No</Label><Input value={form.msmeRegistrationNo} onChange={set("msmeRegistrationNo")} placeholder="MH01E0000012345" /></div>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Create Vendor"}</Button>
          <Link href="/vendors"><Button variant="outline" type="button">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
