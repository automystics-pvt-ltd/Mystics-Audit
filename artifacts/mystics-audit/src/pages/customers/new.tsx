import { useCreateCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

type FormData = { name: string; type: string; gstin: string; pan: string; email: string; phone: string; city: string; state: string; creditLimit: string; paymentTerms: string };

export default function NewCustomer() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const mutation = useCreateCustomer();
  const { register, handleSubmit, setValue, watch } = useForm<FormData>({ defaultValues: { type: "Business", paymentTerms: "30 days", creditLimit: "0" } });

  const onSubmit = (data: FormData) => {
    mutation.mutate({ data: { ...data, creditLimit: data.creditLimit, openingBalance: "0" } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListCustomersQueryKey() }); navigate("/customers"); },
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/customers"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">New Customer</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1"><Label>Name *</Label><Input {...register("name", { required: true })} placeholder="Customer / Company Name" /></div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select defaultValue="Business" onValueChange={v => setValue("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Business">Business</SelectItem><SelectItem value="Individual">Individual</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>GSTIN</Label><Input {...register("gstin")} placeholder="27AABCT1332L1ZT" /></div>
            <div className="space-y-1"><Label>PAN</Label><Input {...register("pan")} placeholder="ABCDE1234F" /></div>
            <div className="space-y-1"><Label>Email</Label><Input {...register("email")} type="email" placeholder="accounts@company.com" /></div>
            <div className="space-y-1"><Label>Phone</Label><Input {...register("phone")} placeholder="9876543210" /></div>
            <div className="space-y-1"><Label>City</Label><Input {...register("city")} /></div>
            <div className="space-y-1"><Label>State</Label><Input {...register("state")} defaultValue="Maharashtra" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Credit Settings</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Credit Limit (₹)</Label><Input {...register("creditLimit")} type="number" defaultValue="0" /></div>
            <div className="space-y-1">
              <Label>Payment Terms</Label>
              <Select defaultValue="30 days" onValueChange={v => setValue("paymentTerms", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Immediate", "7 days", "15 days", "30 days", "45 days", "60 days", "90 days"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Create Customer"}</Button>
          <Link href="/customers"><Button variant="outline" type="button">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
