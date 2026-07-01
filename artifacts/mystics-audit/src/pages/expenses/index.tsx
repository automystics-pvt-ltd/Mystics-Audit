import { useListExpenses, useApproveExpense } from "@workspace/api-client-react";
import { useState } from "react";
import { useFY } from "@/contexts/fy-context";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, AlertTriangle, Search, Filter, BarChart3,
  CheckCircle2, Clock, XCircle, Banknote, RefreshCw,
  Building2, FolderOpen, MapPin, Briefcase,
  ThumbsUp, ThumbsDown, CreditCard, ChevronDown,
} from "lucide-react";

const STATUSES = [
  { value: "",            label: "All" },
  { value: "submitted",   label: "Pending" },
  { value: "approved",    label: "Approved" },
  { value: "rejected",    label: "Rejected" },
  { value: "reimbursed",  label: "Reimbursed" },
  { value: "paid",        label: "Paid" },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  submitted:  <Clock className="w-3 h-3" />,
  approved:   <CheckCircle2 className="w-3 h-3" />,
  rejected:   <XCircle className="w-3 h-3" />,
  reimbursed: <Banknote className="w-3 h-3" />,
  paid:       <CheckCircle2 className="w-3 h-3" />,
};

const STATUS_COLOR: Record<string, string> = {
  submitted:  "bg-amber-50 text-amber-700 border border-amber-200",
  approved:   "bg-blue-50 text-blue-700 border border-blue-200",
  rejected:   "bg-red-50 text-red-700 border border-red-200",
  reimbursed: "bg-violet-50 text-violet-700 border border-violet-200",
  paid:       "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const DEPARTMENTS = ["Sales", "Engineering", "Finance", "Operations", "HR", "Marketing", "Administration"];
const BRANCHES    = ["Head Office", "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune"];
const PROJECTS    = ["Project Alpha", "Project Beta", "Infra Upgrade", "Client Delivery", "Internal", "R&D"];

export default function ExpensesList() {
  const { fy } = useFY();
  const { toast } = useToast();
  const [status, setStatus]         = useState("");
  const [department, setDepartment] = useState("");
  const [project, setProject]       = useState("");
  const [branch, setBranch]         = useState("");
  const [search, setSearch]         = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const params: Record<string, any> = { from: fy.from, to: fy.to };
  if (status)     params.status = status;
  if (department) params.department = department;
  if (project)    params.project = project;
  if (branch)     params.branch = branch;

  const { data, isLoading, refetch } = useListExpenses(params);
  const allExpenses: any[] = data ?? [];

  const approveMutation = useApproveExpense();

  const filtered = search
    ? allExpenses.filter(e =>
        e.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
        e.claimNo?.toLowerCase().includes(search.toLowerCase()) ||
        e.project?.toLowerCase().includes(search.toLowerCase()) ||
        e.department?.toLowerCase().includes(search.toLowerCase())
      )
    : allExpenses;

  const total      = allExpenses.reduce((s, e) => s + (Number(e.totalAmount) ?? 0), 0);
  const pending    = allExpenses.filter(e => e.status === "submitted").reduce((s, e) => s + (Number(e.totalAmount) ?? 0), 0);
  const approved   = allExpenses.filter(e => e.status === "approved").reduce((s, e) => s + (Number(e.totalAmount) ?? 0), 0);
  const reimbursed = allExpenses.filter(e => ["reimbursed","paid"].includes(e.status)).reduce((s, e) => s + (Number(e.totalAmount) ?? 0), 0);

  const clearFilters = () => { setDepartment(""); setProject(""); setBranch(""); setSearch(""); };

  function doAction(id: number, action: "approve" | "reject" | "reimburse") {
    setActionLoading(id);
    approveMutation.mutate(
      { id, data: { action } as any },
      {
        onSuccess: () => {
          toast({ title: action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Marked as reimbursed" });
          refetch();
        },
        onError: () => toast({ title: "Action failed", variant: "destructive" }),
        onSettled: () => setActionLoading(null),
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{allExpenses.length} claims · {formatCurrency(total)} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          <Link href="/expenses/analytics"><Button variant="outline" size="sm"><BarChart3 className="w-4 h-4 mr-1.5" />Analytics</Button></Link>
          <Link href="/expenses/new"><Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Submit Claim</Button></Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Submitted",  value: formatCurrency(total),      sub: `${allExpenses.length} claims`,                                                      bg: "bg-violet-600" },
          { label: "Pending Approval", value: formatCurrency(pending),    sub: `${allExpenses.filter(e => e.status === "submitted").length} claims`,                 bg: "bg-amber-600" },
          { label: "Approved",         value: formatCurrency(approved),   sub: `${allExpenses.filter(e => e.status === "approved").length} claims`,                  bg: "bg-blue-600" },
          { label: "Reimbursed / Paid",value: formatCurrency(reimbursed), sub: `${allExpenses.filter(e => ["reimbursed","paid"].includes(e.status)).length} claims`, bg: "bg-emerald-600" },
        ].map(({ label, value, sub, bg }) => (
          <div key={label} className={`rounded-2xl px-5 py-5 text-white ${bg}`}>
            <p className="text-xs font-medium opacity-80">{label}</p>
            <p className="text-2xl font-bold font-mono mt-2">{value}</p>
            <p className="text-xs opacity-70 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setStatus(s.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              status === s.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
            }`}>
            {s.label}
            <span className="ml-1.5 opacity-70">
              {s.value === "" ? allExpenses.length : allExpenses.filter(e => e.status === s.value).length}
            </span>
          </button>
        ))}
        <button onClick={() => setShowFilters(f => !f)}
          className={`ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${showFilters ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"}`}>
          <Filter className="w-3.5 h-3.5" />Filters
          {(department || project || branch) && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
        </button>
      </div>

      {/* Dimension filters */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-gray-400" />
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Projects</SelectItem>
                  {PROJECTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Branches</SelectItem>
                  {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(department || project || branch) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-400 hover:text-gray-600">Clear filters</Button>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 max-w-sm shadow-sm">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search employee, claim no, project…"
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Claim</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dimensions</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Amount</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Violations</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-gray-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="font-medium">No expense claims found</p>
                    <Link href="/expenses/new"><Button size="sm"><Plus className="w-4 h-4 mr-1" />Submit First Claim</Button></Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map((e: any) => {
              const isLoading = actionLoading === e.id;
              return (
                <TableRow key={e.id} className="hover:bg-gray-50/60 transition-colors">
                  <TableCell>
                    <Link href={`/expenses/${e.id}`} className="font-mono text-indigo-600 hover:text-indigo-800 font-semibold text-sm">
                      {e.claimNo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                        {e.employeeName?.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm text-gray-800">{e.employeeName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {e.department && <span className="flex items-center gap-1 text-xs text-gray-500"><Building2 className="w-3 h-3" />{e.department}</span>}
                      {e.project    && <span className="flex items-center gap-1 text-xs text-gray-500"><FolderOpen className="w-3 h-3" />{e.project}</span>}
                      {e.branch     && <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3 h-3" />{e.branch}</span>}
                      {!e.department && !e.project && !e.branch && <span className="text-xs text-gray-300">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(e.submittedDate)}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono font-semibold text-gray-900">{formatCurrency(Number(e.totalAmount))}</span>
                    {e.approvedAmount && e.approvedAmount !== e.totalAmount && (
                      <p className="text-xs text-gray-400 font-mono">Approved: {formatCurrency(Number(e.approvedAmount))}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[e.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_ICON[e.status]}{e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {e.policyViolations > 0
                      ? <span className="flex items-center gap-1 text-amber-600 text-sm font-medium"><AlertTriangle className="w-3.5 h-3.5" />{e.policyViolations}</span>
                      : <span className="text-gray-300 text-sm">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {e.status === "submitted" && (
                        <>
                          <button
                            disabled={isLoading}
                            onClick={() => doAction(e.id, "approve")}
                            className="h-7 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 flex items-center gap-1 disabled:opacity-50 transition-colors"
                          >
                            <ThumbsUp className="w-3 h-3" />Approve
                          </button>
                          <button
                            disabled={isLoading}
                            onClick={() => doAction(e.id, "reject")}
                            className="h-7 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 flex items-center gap-1 disabled:opacity-50 transition-colors"
                          >
                            <ThumbsDown className="w-3 h-3" />Reject
                          </button>
                        </>
                      )}
                      {e.status === "approved" && (
                        <button
                          disabled={isLoading}
                          onClick={() => doAction(e.id, "reimburse")}
                          className="h-7 px-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold border border-violet-200 flex items-center gap-1 disabled:opacity-50 transition-colors"
                        >
                          <CreditCard className="w-3 h-3" />Reimburse
                        </button>
                      )}
                      {["reimbursed","paid","rejected"].includes(e.status) && (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
