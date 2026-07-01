import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ArrowRight, ArrowLeft, Shield, Building2, CreditCard, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { LocationSelector } from "@/components/LocationSelector";

const PLANS = [
  { slug:"trial",        name:"Free Trial",   price:0,     maxUsers:5,   desc:"14-day trial, no credit card required", color:"slate",   highlight:false },
  { slug:"starter",      name:"Starter",      price:2999,  maxUsers:10,  desc:"Growing businesses, core accounting",   color:"blue",    highlight:false },
  { slug:"growth",       name:"Growth",       price:7999,  maxUsers:25,  desc:"Inventory, expenses, full modules",      color:"violet",  highlight:false },
  { slug:"professional", name:"Professional", price:14999, maxUsers:50,  desc:"All 15 modules + audit + budgets",       color:"indigo",  highlight:true  },
  { slug:"enterprise",   name:"Enterprise",   price:49999, maxUsers:500, desc:"Unlimited scale, 24/7 SLA support",      color:"amber",   highlight:false },
];

const INDUSTRIES = [
  "Manufacturing","Trading","Retail","Services","IT & Technology","Healthcare","Education",
  "Construction","Real Estate","Hospitality","Logistics","Agriculture","Finance","Other",
];

const STEPS = [
  { label:"Company",  icon:Building2 },
  { label:"Plan",     icon:CreditCard },
  { label:"Account",  icon:User },
];

export default function Register() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    orgName:"", legalName:"", industry:"", gstin:"", city:"", state:"", country:"India",
    contactName:"", contactEmail:"", contactPhone:"",
    planSlug:"professional", billingCycle:"monthly",
    adminName:"", adminEmail:"", adminPassword:"", adminPhone:"",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectedPlan = PLANS.find(p => p.slug === form.planSlug)!;

  const canNext = () => {
    if (step === 0) return form.orgName.trim() && form.contactEmail.trim();
    if (step === 1) return !!form.planSlug;
    if (step === 2) return form.adminEmail.trim() && form.adminPassword.length >= 8;
    return false;
  };

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/register", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          orgName: form.orgName, legalName: form.legalName, industry: form.industry,
          gstin: form.gstin, city: form.city, state: form.state,
          contactName: form.contactName || form.adminName,
          contactEmail: form.contactEmail || form.adminEmail,
          contactPhone: form.contactPhone,
          planSlug: form.planSlug, billingCycle: form.billingCycle,
          adminName: form.adminName, adminEmail: form.adminEmail,
          adminPassword: form.adminPassword, adminPhone: form.adminPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed"); setLoading(false); return; }
      setSuccess(data);
    } catch (e: any) {
      setError(e.message ?? "Network error");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center shadow-xl">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold">Welcome to Mystics!</h2>
            <p className="text-muted-foreground">
              Your organisation <strong>{success.tenant.orgName}</strong> has been created on the <strong>{success.tenant.plan}</strong> plan.
              {success.tenant.trialEnd && ` Your free trial runs until ${new Date(success.tenant.trialEnd).toLocaleDateString("en-IN")}.`}
            </p>
            {success.tempPassword && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                <p className="text-xs font-semibold text-amber-700 mb-1">Your temporary password</p>
                <p className="font-mono text-lg font-bold text-amber-900">{success.tempPassword}</p>
                <p className="text-xs text-amber-600 mt-1">Change this immediately after your first login.</p>
              </div>
            )}
            <Button className="w-full" onClick={() => navigate("/")}>Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold">Mystics Audit</span>
        </div>
        <p className="text-muted-foreground">Enterprise Cloud Accounting for Indian Businesses</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step; const active = i === step;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${active ? "bg-primary text-primary-foreground shadow-sm" : done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                {s.label}
              </div>
              {i < STEPS.length-1 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      <Card className="max-w-2xl w-full shadow-xl border-0">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-base">{STEPS[step].label === "Company" ? "Tell us about your company" : STEPS[step].label === "Plan" ? "Choose your plan" : "Create your admin account"}</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {/* Step 0: Company Info */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Company Name *</Label>
                <Input value={form.orgName} onChange={set("orgName")} placeholder="Acme Industries Pvt Ltd" />
              </div>
              <div className="space-y-1.5">
                <Label>Legal Name</Label>
                <Input value={form.legalName} onChange={set("legalName")} placeholder="Acme Industries Private Limited" />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={form.industry} onValueChange={setVal("industry")}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>GSTIN</Label>
                <Input value={form.gstin} onChange={set("gstin")} placeholder="27AAAAA0000A1Z5" maxLength={15} className="uppercase" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Email *</Label>
                <Input type="email" value={form.contactEmail} onChange={set("contactEmail")} placeholder="accounts@acme.in" />
              </div>
              <div className="col-span-2">
                <LocationSelector
                  country={form.country}
                  state={form.state}
                  city={form.city}
                  onCountryChange={v => setForm(f => ({ ...f, country: v, state: "", city: "" }))}
                  onStateChange={v => setForm(f => ({ ...f, state: v, city: "" }))}
                  onCityChange={v => setForm(f => ({ ...f, city: v }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input value={form.contactName} onChange={set("contactName")} placeholder="Rajesh Kumar" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input value={form.contactPhone} onChange={set("contactPhone")} placeholder="+91 98765 43210" />
              </div>
            </div>
          )}

          {/* Step 1: Plan Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium">Billing:</span>
                <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
                  {["monthly","annual"].map(c => (
                    <button key={c} onClick={() => setVal("billingCycle")(c)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${form.billingCycle===c ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
                      {c==="annual" ? "Annual (save 17%)" : "Monthly"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PLANS.map(p => {
                  const price = form.billingCycle==="annual" && p.price>0 ? Math.round(p.price*10/12) : p.price;
                  const selected = form.planSlug === p.slug;
                  return (
                    <div key={p.slug} onClick={() => setVal("planSlug")(p.slug)}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${selected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}>
                      {p.highlight && <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-primary text-primary-foreground">Popular</Badge>}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-sm">{p.name}</h3>
                          <div className="mt-0.5">
                            {price === 0 ? <span className="text-lg font-bold">Free</span>
                              : <><span className="text-lg font-bold">₹{price.toLocaleString("en-IN")}</span><span className="text-xs text-muted-foreground">/mo</span></>
                            }
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 ${selected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                          {selected && <div className="w-full h-full rounded-full bg-white scale-50" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                      <p className="text-xs font-medium mt-1.5">Up to {p.maxUsers === 500 ? "500+" : p.maxUsers} users</p>
                    </div>
                  );
                })}
              </div>
              {selectedPlan && selectedPlan.price > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between mb-1"><span className="text-muted-foreground">{selectedPlan.name} ({form.billingCycle})</span><span className="font-medium">₹{(form.billingCycle==="annual" ? selectedPlan.price*10 : selectedPlan.price).toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between mb-1"><span className="text-muted-foreground">GST 18%</span><span>₹{Math.round((form.billingCycle==="annual" ? selectedPlan.price*10 : selectedPlan.price)*0.18).toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total</span><span>₹{Math.round((form.billingCycle==="annual" ? selectedPlan.price*10 : selectedPlan.price)*1.18).toLocaleString("en-IN")}</span></div>
                  <p className="text-xs text-muted-foreground mt-2">Payment details will be shared after account creation. Start with 14-day free access immediately.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Admin Account */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-4">
              <p className="col-span-2 text-sm text-muted-foreground">This will be the primary administrator account for your organisation.</p>
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.adminName} onChange={set("adminName")} placeholder="Rajesh Kumar" />
              </div>
              <div className="space-y-1.5">
                <Label>Work Email *</Label>
                <Input type="email" value={form.adminEmail} onChange={set("adminEmail")} placeholder="rajesh@acme.in" />
              </div>
              <div className="space-y-1.5 col-span-2 relative">
                <Label>Password * <span className="text-xs text-muted-foreground font-normal">(min 8 characters)</span></Label>
                <div className="relative">
                  <Input type={showPass?"text":"password"} value={form.adminPassword} onChange={set("adminPassword")} placeholder="Create a strong password" className="pr-10" />
                  <button type="button" onClick={() => setShowPass(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.adminPassword.length > 0 && form.adminPassword.length < 8 && (
                  <p className="text-xs text-destructive">Password must be at least 8 characters</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.adminPhone} onChange={set("adminPhone")} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1.5 bg-muted/50 rounded-lg p-3 col-span-2 text-sm">
                <p className="font-medium text-xs text-muted-foreground mb-1">Registration Summary</p>
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Organisation</span><span className="font-medium">{form.orgName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium capitalize">{form.planSlug} ({form.billingCycle})</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Max Users</span><span className="font-medium">{selectedPlan?.maxUsers}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
          <div>
            {step > 0
              ? <Button variant="ghost" size="sm" onClick={() => { setStep(s=>s-1); setError(""); }}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
              : <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to login</a>
            }
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Step {step+1} of {STEPS.length}</span>
            {step < STEPS.length-1
              ? <Button disabled={!canNext()} onClick={() => { setStep(s=>s+1); setError(""); }}>Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
              : <Button disabled={!canNext() || loading} onClick={handleSubmit}>{loading ? "Creating account…" : "Create Account"} {!loading && <CheckCircle2 className="w-4 h-4 ml-1" />}</Button>
            }
          </div>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-6">
        By registering you agree to our Terms of Service and Privacy Policy.
        Already have an account? <a href="/" className="text-primary underline">Sign in</a>
      </p>
    </div>
  );
}
