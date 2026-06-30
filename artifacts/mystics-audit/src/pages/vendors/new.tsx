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
import { ArrowLeft, AlertCircle } from "lucide-react";
import { INDIAN_STATES, GSTIN_REGEX, PAN_REGEX, PHONE_REGEX } from "@/lib/india-data";
import { cn } from "@/lib/utils";

interface FormState {
  name: string; gstin: string; pan: string; email: string; phone: string;
  city: string; state: string; paymentTerms: string; openingBalance: string;
  tdsSection: string; msmeRegistrationNo: string;
}

interface FieldErrors {
  name?: string; gstin?: string; pan?: string; email?: string; phone?: string; state?: string;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/>{msg}</p>;
}

export default function NewVendor() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const mutation = useCreateVendor();

  const [form, setForm] = useState<FormState>({
    name: "", gstin: "", pan: "", email: "", phone: "",
    city: "", state: "Maharashtra", paymentTerms: "30 days",
    openingBalance: "0", tdsSection: "", msmeRegistrationNo: "",
  });
  const [isMsme, setIsMsme] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const setVal = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.name.trim())  errs.name  = "Vendor name is required";
    if (!form.state)        errs.state = "State is required";
    if (form.gstin && !GSTIN_REGEX.test(form.gstin.toUpperCase()))
      errs.gstin = "Invalid GSTIN format (e.g. 27AABCT1332L1ZT)";
    if (form.pan && !PAN_REGEX.test(form.pan.toUpperCase()))
      errs.pan = "Invalid PAN format (e.g. ABCDE1234F)";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Enter a valid email address";
    if (form.phone && !PHONE_REGEX.test(form.phone))
      errs.phone = "Enter a valid 10-digit Indian mobile number";
    return errs;
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    mutation.mutate({
      data: {
        ...form,
        gstin: form.gstin.toUpperCase(),
        pan: form.pan.toUpperCase(),
        isMsme,
      },
    } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListVendorsQueryKey() }); navigate("/vendors"); },
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/vendors"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">New Vendor</h1>
      </div>

      {mutation.isError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to create vendor. Please try again.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Card>
          <CardHeader><CardTitle>Vendor Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">

            <div className="col-span-2 space-y-1">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={set("name")}
                placeholder="Vendor / Company Name"
                className={cn(submitted && errors.name && "border-destructive")}
              />
              {submitted && <FieldError msg={errors.name} />}
            </div>

            <div className="space-y-1">
              <Label>GSTIN <span className="text-muted-foreground text-xs font-normal">(15 chars)</span></Label>
              <Input
                value={form.gstin}
                onChange={e => setVal("gstin", e.target.value.toUpperCase())}
                placeholder="27AABCT1332L1ZT"
                maxLength={15}
                className={cn("uppercase", submitted && errors.gstin && "border-destructive")}
              />
              {submitted && <FieldError msg={errors.gstin} />}
            </div>

            <div className="space-y-1">
              <Label>PAN <span className="text-muted-foreground text-xs font-normal">(10 chars)</span></Label>
              <Input
                value={form.pan}
                onChange={e => setVal("pan", e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                className={cn("uppercase", submitted && errors.pan && "border-destructive")}
              />
              {submitted && <FieldError msg={errors.pan} />}
            </div>

            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="accounts@vendor.com"
                className={cn(submitted && errors.email && "border-destructive")}
              />
              {submitted && <FieldError msg={errors.email} />}
            </div>

            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={set("phone")}
                placeholder="9876543210"
                maxLength={10}
                className={cn(submitted && errors.phone && "border-destructive")}
              />
              {submitted && <FieldError msg={errors.phone} />}
            </div>

            <div className="space-y-1">
              <Label>City</Label>
              <Input value={form.city} onChange={set("city")} placeholder="Mumbai" />
            </div>

            <div className="space-y-1">
              <Label>State <span className="text-destructive">*</span></Label>
              <Select value={form.state} onValueChange={v => setVal("state", v)}>
                <SelectTrigger className={cn(submitted && errors.state && "border-destructive")}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {submitted && <FieldError msg={errors.state} />}
            </div>

            <div className="space-y-1">
              <Label>Payment Terms</Label>
              <Select defaultValue="30 days" onValueChange={v => setVal("paymentTerms", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["7 days", "15 days", "30 days", "45 days", "60 days", "90 days"].map(t =>
                    <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>TDS Section</Label>
              <Select onValueChange={v => setVal("tdsSection", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {["194C", "194J", "194H", "194I", "194Q", "No TDS"].map(t =>
                    <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={isMsme} onCheckedChange={setIsMsme} />
              <Label>MSME Vendor</Label>
            </div>

            {isMsme && (
              <div className="col-span-2 space-y-1">
                <Label>MSME Registration No</Label>
                <Input value={form.msmeRegistrationNo} onChange={set("msmeRegistrationNo")} placeholder="MH01E0000012345" />
              </div>
            )}

          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Create Vendor"}
          </Button>
          <Link href="/vendors"><Button variant="outline" type="button">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
