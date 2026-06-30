import { useCreateExpense, getListExpensesQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2, ArrowLeft, Receipt, Building2, FolderOpen, MapPin, Users2, Briefcase, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES: { group: string; items: string[] }[] = [
  { group: "Facilities", items: ["Office Rent", "Electricity (EB)", "Water & Sewage", "Internet & Telecom", "Security Services", "Office Maintenance"] },
  { group: "Travel & Transport", items: ["Fuel", "Air Travel", "Train Travel", "Bus / Auto / Cab", "Hotel / Accommodation", "Toll & Parking", "Vehicle Maintenance"] },
  { group: "Food & Hospitality", items: ["Meals & Food", "Client Entertainment", "Team Meals", "Canteen / Pantry"] },
  { group: "Operations", items: ["Office Supplies", "Printing & Stationery", "Repairs & Maintenance", "Cleaning & Housekeeping", "Postage & Courier"] },
  { group: "Technology", items: ["Software Subscriptions", "Hardware / Equipment", "Cloud Services", "IT Support", "Mobile & Data Recharge"] },
  { group: "Personnel", items: ["Salaries & Wages", "Staff Training", "Recruitment", "Medical / Insurance", "Uniform & Safety Gear"] },
  { group: "Business Development", items: ["Marketing & Advertising", "Sales Promotions", "Events & Exhibitions", "Gifts & Samples", "Professional Fees"] },
  { group: "Finance", items: ["Bank Charges", "Interest Payments", "Professional Services (CA/Legal)", "Petty Cash", "Asset Purchase", "Depreciation"] },
  { group: "Project Costs", items: ["Project Materials", "Sub-contractor Payments", "Vendor Payments", "Site Expenses", "Testing & QC"] },
  { group: "Other", items: ["Miscellaneous", "Custom Category"] },
];

const ALL_CATEGORIES = CATEGORIES.flatMap(g => g.items);

const POLICY_LIMITS: Record<string, number> = {
  "Meals & Food": 1500, "Client Entertainment": 5000, "Air Travel": 15000,
  "Hotel / Accommodation": 5000, "Fuel": 3000, "Office Supplies": 2000,
  "Team Meals": 3000, "Mobile & Data Recharge": 1000,
};

const DEPARTMENTS = ["Sales", "Engineering", "Finance", "Operations", "HR", "Marketing", "Administration"];
const BRANCHES    = ["Head Office", "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune"];
const PROJECTS    = ["Project Alpha", "Project Beta", "Infra Upgrade", "Client Delivery", "Internal", "R&D"];
const COST_CENTERS = ["CC-100 Operations", "CC-200 Sales", "CC-300 Technology", "CC-400 Finance", "CC-500 HR"];
const CLIENTS     = ["Automystics Technologies", "Nexus Fintech", "Meridian Exports", "Bharat Commerce", "None"];
const GST_RATES   = ["0", "5", "12", "18", "28"];

type ExpLine = {
  date: string; category: string; subCategory: string;
  amount: string; description: string; vendorName: string; vendorGstin: string;
  gstAmount: string; gstRate: string; hsnCode: string;
  billable: boolean; policyViolation: boolean; violationReason: string;
};

const blankLine = (): ExpLine => ({
  date: new Date().toISOString().split("T")[0],
  category: "", subCategory: "", amount: "", description: "",
  vendorName: "", vendorGstin: "", gstAmount: "", gstRate: "18",
  hsnCode: "", billable: false, policyViolation: false, violationReason: "",
});

export default function NewExpense() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const mutation = useCreateExpense();

  // Header fields
  const [employeeName, setEmployeeName] = useState("John Doe");
  const [submittedDate, setSubmittedDate] = useState(new Date().toISOString().split("T")[0]);
  const [department, setDepartment] = useState("");
  const [project, setProject] = useState("");
  const [branch, setBranch] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ExpLine[]>([blankLine()]);

  const updateLine = (i: number, field: keyof ExpLine, value: string | boolean) => {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, [field]: value };
      // Auto policy check
      if (field === "amount" || field === "category") {
        const cat = field === "category" ? String(value) : l.category;
        const amt = Number(field === "amount" ? value : l.amount);
        const limit = POLICY_LIMITS[cat];
        if (limit && amt > limit) {
          updated.policyViolation = true;
          updated.violationReason = `Exceeds ₹${limit.toLocaleString("en-IN")} policy limit for ${cat}`;
        } else {
          updated.policyViolation = false;
          updated.violationReason = "";
        }
      }
      // Auto GST calculation
      if (field === "amount" || field === "gstRate") {
        const amt = Number(field === "amount" ? value : l.amount);
        const rate = Number(field === "gstRate" ? value : l.gstRate);
        if (amt > 0 && rate > 0) {
          updated.gstAmount = ((amt * rate) / 100).toFixed(2);
        }
      }
      return updated;
    }));
  };

  const addLine = () => setLines(prev => [...prev, blankLine()]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const totalGst = lines.reduce((s, l) => s + (parseFloat(l.gstAmount) || 0), 0);
  const violations = lines.filter(l => l.policyViolation).length;

  const handleSubmit = () => {
    mutation.mutate({
      data: {
        employeeName, submittedDate, notes,
        department: department || undefined, project: project || undefined,
        branch: branch || undefined, costCenter: costCenter || undefined,
        clientName: clientName || undefined,
        lines: lines.map(l => ({
          date: l.date, category: l.category || "Miscellaneous",
          subCategory: l.subCategory || undefined,
          amount: parseFloat(l.amount) || 0,
          description: l.description || "—",
          vendorName: l.vendorName || undefined,
          vendorGstin: l.vendorGstin || undefined,
          gstAmount: parseFloat(l.gstAmount) || 0,
          gstRate: parseFloat(l.gstRate) || undefined,
          hsnCode: l.hsnCode || undefined,
          billable: l.billable,
          policyViolation: l.policyViolation,
          violationReason: l.violationReason || undefined,
          currency: "INR",
        })),
      }
    } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListExpensesQueryKey() }); navigate("/expenses"); },
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/expenses"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Expense Claim</h1>
          <p className="text-sm text-gray-500">Fill in expense details and dimensions for proper tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left — Claim details */}
        <div className="col-span-2 space-y-5">

          {/* Employee + Date */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Receipt className="w-4 h-4 text-indigo-500" />Claim Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-500">Employee Name *</Label>
                <Input value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-500">Submission Date *</Label>
                <DateInput value={submittedDate} onChange={e => setSubmittedDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Building2 className="w-4 h-4 text-indigo-500" />Classification</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Department", icon: <Building2 className="w-3.5 h-3.5" />, value: department, set: setDepartment, opts: DEPARTMENTS, ph: "Select department" },
                { label: "Project", icon: <FolderOpen className="w-3.5 h-3.5" />, value: project, set: setProject, opts: PROJECTS, ph: "Select project" },
                { label: "Branch / Location", icon: <MapPin className="w-3.5 h-3.5" />, value: branch, set: setBranch, opts: BRANCHES, ph: "Select branch" },
                { label: "Cost Center", icon: <Users2 className="w-3.5 h-3.5" />, value: costCenter, set: setCostCenter, opts: COST_CENTERS, ph: "Select cost center" },
              ].map(({ label, icon, value, set, opts, ph }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-xs font-medium text-gray-500 flex items-center gap-1">{icon}{label}</Label>
                  <Select value={value} onValueChange={set}>
                    <SelectTrigger><SelectValue placeholder={ph} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />Client (for billable expenses)</Label>
              <Select value={clientName} onValueChange={setClientName}>
                <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select client (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not billable</SelectItem>
                  {CLIENTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expense lines */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Expense Lines</h2>
              <div className="flex items-center gap-3 text-sm">
                {violations > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                    <AlertTriangle className="w-4 h-4" />{violations} policy violation{violations > 1 ? "s" : ""}
                  </span>
                )}
                <span className="text-gray-400">{lines.length} line{lines.length !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {lines.map((l, i) => (
                <div key={i} className={cn("p-5 space-y-4", l.policyViolation && "bg-amber-50/40")}>
                  {l.policyViolation && (
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{l.violationReason}
                    </div>
                  )}
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-gray-400">Date *</Label>
                      <DateInput className="text-sm" value={l.date} onChange={e => updateLine(i, "date", e.target.value)} />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs text-gray-400">Category *</Label>
                      <Select value={l.category} onValueChange={v => updateLine(i, "category", v)}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {CATEGORIES.map(g => (
                            <div key={g.group}>
                              <p className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{g.group}</p>
                              {g.items.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs text-gray-400">Description *</Label>
                      <Input className="text-sm" value={l.description} onChange={e => updateLine(i, "description", e.target.value)} placeholder="Purpose / details..." />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-gray-400">Amount (₹) *</Label>
                      <Input className="text-sm text-right font-mono" value={l.amount} onChange={e => updateLine(i, "amount", e.target.value)} placeholder="0" />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => removeLine(i)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs text-gray-400">Vendor Name</Label>
                      <Input className="text-sm" value={l.vendorName} onChange={e => updateLine(i, "vendorName", e.target.value)} placeholder="Supplier / store..." />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-gray-400">Vendor GSTIN</Label>
                      <Input className="text-sm font-mono" value={l.vendorGstin} onChange={e => updateLine(i, "vendorGstin", e.target.value)} placeholder="22AAAAA..." />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-gray-400">HSN Code</Label>
                      <Input className="text-sm font-mono" value={l.hsnCode} onChange={e => updateLine(i, "hsnCode", e.target.value)} placeholder="9963..." />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-gray-400">GST Rate %</Label>
                      <Select value={l.gstRate} onValueChange={v => updateLine(i, "gstRate", v)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GST_RATES.map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-gray-400">GST Amount (₹)</Label>
                      <Input className="text-sm text-right font-mono bg-gray-50" readOnly value={l.gstAmount ? Number(l.gstAmount).toFixed(2) : ""} placeholder="Auto-calc" />
                    </div>
                    <div className="col-span-1 flex items-end pb-0.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={l.billable} onChange={e => updateLine(i, "billable", e.target.checked)}
                          className="rounded accent-indigo-600" />
                        <span className="text-xs text-gray-400">Billable</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-1.5" />Add Expense Line
              </Button>
              <div className="text-right text-sm">
                <p className="text-gray-400">GST: <span className="font-mono text-gray-600">{formatCurrency(totalGst)}</span></p>
                <p className="text-gray-700 font-semibold">Total: <span className="font-mono text-lg text-indigo-700">{formatCurrency(total)}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Claim Summary</h2>
            <div className="space-y-2">
              {[
                { label: "Employee", value: employeeName || "—" },
                { label: "Date", value: submittedDate },
                { label: "Department", value: department || "—" },
                { label: "Project", value: project || "—" },
                { label: "Branch", value: branch || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-700 text-right">{value}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-gray-100 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="font-mono font-medium">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total GST</span>
                <span className="font-mono font-medium text-blue-600">{formatCurrency(totalGst)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100">
                <span>Grand Total</span>
                <span className="font-mono text-indigo-700">{formatCurrency(total)}</span>
              </div>
            </div>
            {violations > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />{violations} Policy Violation{violations > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-amber-600">Manager review required for violations.</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
            <Label className="font-semibold text-gray-800">Notes</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={4} placeholder="Describe the business purpose or any special circumstances..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none" />
          </div>

          {/* Policy reference */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="font-semibold text-indigo-800 text-sm mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Expense Policy Limits</p>
            <div className="space-y-1">
              {Object.entries(POLICY_LIMITS).slice(0, 5).map(([cat, limit]) => (
                <div key={cat} className="flex justify-between text-xs text-indigo-700">
                  <span>{cat}</span><span className="font-mono">₹{limit.toLocaleString("en-IN")}</span>
                </div>
              ))}
              <p className="text-[10px] text-indigo-500 mt-1">Violations require manager approval</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full" onClick={handleSubmit} disabled={mutation.isPending || lines.length === 0}>
              {mutation.isPending ? "Submitting…" : "Submit for Approval"}
            </Button>
            <Link href="/expenses"><Button variant="outline" className="w-full">Cancel</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
