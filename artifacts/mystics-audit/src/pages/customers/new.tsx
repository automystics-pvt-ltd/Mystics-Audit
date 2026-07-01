import { useCreateCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { GSTIN_REGEX, PAN_REGEX, PHONE_REGEX } from "@/lib/india-data";
import { cn } from "@/lib/utils";
import { LocationSelector } from "@/components/LocationSelector";

type FormData = {
  name: string; type: string; gstin: string; pan: string;
  email: string; phone: string; city: string; state: string; country: string;
  creditLimit: string; paymentTerms: string;
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/>{msg}</p>;
}

export default function NewCustomer() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const mutation = useCreateCustomer();
  const {
    register, handleSubmit, setValue, watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { type: "Business", paymentTerms: "30 days", creditLimit: "0", country: "India", state: "Maharashtra" },
  });

  const selectedCountry = watch("country");
  const selectedState   = watch("state");
  const selectedCity    = watch("city");

  const onSubmit = (data: FormData) => {
    mutation.mutate({ data: { ...data, creditLimit: data.creditLimit, openingBalance: "0" } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListCustomersQueryKey() }); navigate("/customers"); },
      onError: () => toast({ title: "Failed to create customer", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/customers"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">New Customer</h1>
      </div>

      {mutation.isError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to create customer. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Card>
          <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">

            <div className="col-span-2 space-y-1">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                {...register("name", { required: "Customer name is required" })}
                placeholder="Customer / Company Name"
                className={cn(errors.name && "border-destructive")}
              />
              <FieldError msg={errors.name?.message} />
            </div>

            <div className="space-y-1">
              <Label>Type</Label>
              <Select defaultValue="Business" onValueChange={v => setValue("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>GSTIN <span className="text-muted-foreground text-xs font-normal">(15 chars)</span></Label>
              <Input
                {...register("gstin", {
                  validate: v => !v || GSTIN_REGEX.test(v) || "Invalid GSTIN format (e.g. 27AABCT1332L1ZT)",
                  setValueAs: v => v?.toUpperCase(),
                })}
                placeholder="27AABCT1332L1ZT"
                maxLength={15}
                className={cn("uppercase", errors.gstin && "border-destructive")}
              />
              <FieldError msg={errors.gstin?.message} />
            </div>

            <div className="space-y-1">
              <Label>PAN <span className="text-muted-foreground text-xs font-normal">(10 chars)</span></Label>
              <Input
                {...register("pan", {
                  validate: v => !v || PAN_REGEX.test(v) || "Invalid PAN format (e.g. ABCDE1234F)",
                  setValueAs: v => v?.toUpperCase(),
                })}
                placeholder="ABCDE1234F"
                maxLength={10}
                className={cn("uppercase", errors.pan && "border-destructive")}
              />
              <FieldError msg={errors.pan?.message} />
            </div>

            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                {...register("email", {
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address" },
                })}
                type="email"
                placeholder="accounts@company.com"
                className={cn(errors.email && "border-destructive")}
              />
              <FieldError msg={errors.email?.message} />
            </div>

            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                {...register("phone", {
                  validate: v => !v || PHONE_REGEX.test(v) || "Enter a valid 10-digit Indian mobile number",
                })}
                placeholder="9876543210"
                maxLength={10}
                className={cn(errors.phone && "border-destructive")}
              />
              <FieldError msg={errors.phone?.message} />
            </div>

            <div className="col-span-2">
              <input type="hidden" {...register("country")} />
              <input type="hidden" {...register("state")} />
              <input type="hidden" {...register("city")} />
              <LocationSelector
                country={selectedCountry ?? ""}
                state={selectedState ?? ""}
                city={selectedCity ?? ""}
                onCountryChange={v => setValue("country", v)}
                onStateChange={v => setValue("state", v)}
                onCityChange={v => setValue("city", v)}
              />
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Credit Settings</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Credit Limit (₹)</Label>
              <Input
                {...register("creditLimit", {
                  validate: v => !v || Number(v) >= 0 || "Credit limit cannot be negative",
                })}
                type="number"
                min="0"
                step="1000"
                className={cn(errors.creditLimit && "border-destructive")}
              />
              <FieldError msg={errors.creditLimit?.message} />
            </div>
            <div className="space-y-1">
              <Label>Payment Terms</Label>
              <Select defaultValue="30 days" onValueChange={v => setValue("paymentTerms", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Immediate", "7 days", "15 days", "30 days", "45 days", "60 days", "90 days"].map(t =>
                    <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Create Customer"}
          </Button>
          <Link href="/customers"><Button variant="outline" type="button">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
