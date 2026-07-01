import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  useListAuditClients, useCreateAuditClient, useUpdateAuditClient, useDeleteAuditClient,
  useListAuditTasks, useCreateAuditTask, useUpdateAuditTask, useDeleteAuditTask,
  useUpdateAuditTaskStatus, useAddAuditTaskComment,
  useListComplianceEvents, useCreateComplianceEvent, useUpdateComplianceEvent,
  useListAuditFindings, useCreateAuditFinding, useUpdateAuditFinding, useDeleteAuditFinding,
  useListCustomers, useListVendors,
  useListNotifications, useGetNotificationSummary,
  useMarkAllNotificationsRead, useMarkNotificationRead, useDismissNotification,
  useListAutomationRules, useCreateAutomationRule, useUpdateAutomationRule, useDeleteAutomationRule,
  useRunAutomation,
  useListCollaborationRequests, useCreateCollaborationRequest, useUpdateCollaborationRequest,
  useDeleteCollaborationRequest, useGetCollaborationRequest, useGetCollaborationSummary,
  useCreateCollaborationMessage,
  useSeedClientCompliance, useBulkCreateAuditTasks,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Shield, Users, ClipboardList, CalendarDays, Package, Activity,
  Plus, Pencil, Trash2, Search, Filter, CheckSquare, Square,
  FileText, FileArchive, FileCheck, FolderOpen, Clock, Send,
  Mail, Download, RefreshCw, ExternalLink, Building2, Phone,
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
  ArrowUpRight, MessageSquare, Flag, MoreHorizontal, Eye, BarChart3,
  Zap, Bell, BellOff, Play, ToggleLeft, ToggleRight, XCircle,
  Link2, FileUp, MessageCircle, ChevronDown, ChevronUp, Inbox,
  CheckCheck, HelpCircle, ThumbsUp, Paperclip, FilePlus2,
  LayoutGrid, List, Table2, SortAsc, SortDesc, CircleDot,
  TrendingUp, TrendingDown, Minus, Star, ArrowRight, GanttChart,
  UserCircle, Tag, CalendarRange,
  Sparkles, Layers, Wand2, CalendarCog, CheckSquare2,
} from "lucide-react";

/* ── helpers ── */
const today = new Date().toISOString().split("T")[0];
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtSize = (b: number) =>
  b >= 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : b >= 1_000 ? `${(b / 1_000).toFixed(0)} KB` : `${b} B`;
const inrK = (n: number) =>
  Math.abs(n) >= 100_000 ? `₹${(n / 100_000).toFixed(1)}L` : Math.abs(n) >= 1_000 ? `₹${(n / 1_000).toFixed(0)}K` : `₹${n.toFixed(0)}`;
function parseTags(raw: string) { try { return JSON.parse(raw) ?? []; } catch { return []; } }

/* ── constants ── */
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  created:           { label: "Created",           color: "bg-gray-100 text-gray-700" },
  assigned:          { label: "Assigned",           color: "bg-blue-100 text-blue-700" },
  in_progress:       { label: "In Progress",        color: "bg-amber-100 text-amber-700" },
  under_review:      { label: "Under Review",       color: "bg-violet-100 text-violet-700" },
  changes_requested: { label: "Changes Requested",  color: "bg-orange-100 text-orange-700" },
  resubmitted:       { label: "Resubmitted",        color: "bg-teal-100 text-teal-700" },
  completed:         { label: "Completed",          color: "bg-green-100 text-green-700" },
  archived:          { label: "Archived",           color: "bg-gray-200 text-gray-500" },
};
const STATUS_FLOW = ["created","assigned","in_progress","under_review","changes_requested","resubmitted","completed","archived"];
const PRIORITY_CFG: Record<string, { label: string; color: string; dot: string }> = {
  low:    { label: "Low",    color: "bg-green-100 text-green-700",  dot: "bg-green-400" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-700",   dot: "bg-blue-400" },
  high:   { label: "High",   color: "bg-amber-100 text-amber-700", dot: "bg-amber-400" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700",     dot: "bg-red-500" },
};
const TASK_TYPES = ["document_request","compliance_task","query","review","custom"];
const TASK_TYPE_LABELS: Record<string,string> = {
  document_request: "Document Request", compliance_task: "Compliance Task",
  query: "Query", review: "Review", custom: "Custom",
};
const ENGAGEMENT_TYPES = ["GST","Audit","ITR","ROC","TDS","MCA","Payroll","Custom"];
const EVENT_TYPES = [
  { value: "gstr1",        label: "GSTR-1" },
  { value: "gstr3b",       label: "GSTR-3B" },
  { value: "tds_payment",  label: "TDS Payment" },
  { value: "tds_return",   label: "TDS Return" },
  { value: "itr",          label: "ITR Filing" },
  { value: "roc",          label: "ROC Filing" },
  { value: "advance_tax",  label: "Advance Tax" },
  { value: "custom",       label: "Custom" },
];
const EVENT_COLORS: Record<string,string> = {
  gstr1: "bg-blue-100 text-blue-700 border-blue-200",
  gstr3b: "bg-violet-100 text-violet-700 border-violet-200",
  tds_payment: "bg-amber-100 text-amber-700 border-amber-200",
  tds_return: "bg-orange-100 text-orange-700 border-orange-200",
  itr: "bg-green-100 text-green-700 border-green-200",
  roc: "bg-pink-100 text-pink-700 border-pink-200",
  advance_tax: "bg-cyan-100 text-cyan-700 border-cyan-200",
  custom: "bg-gray-100 text-gray-700 border-gray-200",
};
const FY_OPTIONS = ["2026-27","2025-26","2024-25","2023-24"];
const MONTHS: Record<string,string> = {
  "2026-06":"Jun 2026","2026-05":"May 2026","2026-04":"Apr 2026",
  "2026-03":"Mar 2026","2026-02":"Feb 2026","2026-01":"Jan 2026",
  "2025-12":"Dec 2025","2025-11":"Nov 2025","2025-10":"Oct 2025",
};
const CAT_LABELS: Record<string,string> = {
  invoice:"Sales Invoice", bill:"Vendor Bill", receipt:"Receipt",
  purchase_doc:"Purchase Doc", vendor_invoice:"Vendor Invoice",
  gst_doc:"GST Document", bank_statement:"Bank Statement",
  contract:"Contract", supporting:"Supporting", other:"Other",
};
const CAT_COLORS: Record<string,string> = {
  invoice:"bg-blue-100 text-blue-800", bill:"bg-purple-100 text-purple-800",
  receipt:"bg-green-100 text-green-800", gst_doc:"bg-yellow-100 text-yellow-800",
  bank_statement:"bg-cyan-100 text-cyan-800", contract:"bg-red-100 text-red-800",
  supporting:"bg-gray-100 text-gray-800",
};

/* ══ AUDIT ENGAGEMENT TEMPLATES ══════════════════════════════════ */
type TemplateTask = { title: string; taskType: string; phase: string; priority: string; description: string; daysOffset: number };
type AuditTemplate = { id: string; label: string; icon: string; color: string; description: string; tasks: TemplateTask[] };

const AUDIT_TEMPLATES: AuditTemplate[] = [
  {
    id: "statutory",
    label: "Statutory Audit",
    icon: "⚖️",
    color: "border-blue-200 bg-blue-50",
    description: "Companies Act 2013 — full statutory audit from engagement to CARO report",
    tasks: [
      { title:"Appointment & Engagement Letter", taskType:"compliance_task", phase:"planning", priority:"critical", description:"Obtain Board resolution and sign engagement letter", daysOffset:0 },
      { title:"Obtain Prior Year Financials & Audit Report", taskType:"document_request", phase:"planning", priority:"high", description:"Collect prior year financial statements, notes and auditor report", daysOffset:3 },
      { title:"Review Internal Controls & Processes", taskType:"review", phase:"planning", priority:"high", description:"Assess internal control environment, identify weaknesses", daysOffset:7 },
      { title:"Prepare Audit Plan & Risk Assessment", taskType:"review", phase:"planning", priority:"medium", description:"Document risk-based audit plan, materiality threshold", daysOffset:10 },
      { title:"Opening Trial Balance Verification", taskType:"review", phase:"fieldwork", priority:"high", description:"Agree opening balances with prior year closing balances", daysOffset:12 },
      { title:"Cash & Bank Balances Verification", taskType:"review", phase:"fieldwork", priority:"high", description:"Verify cash on hand, obtain bank confirmations and reconcile", daysOffset:15 },
      { title:"Trade Receivables Confirmation", taskType:"document_request", phase:"fieldwork", priority:"high", description:"Send balance confirmation letters to debtors", daysOffset:18 },
      { title:"Fixed Assets Register Verification", taskType:"review", phase:"fieldwork", priority:"medium", description:"Verify fixed asset additions, disposals, and depreciation", daysOffset:20 },
      { title:"Inventory Verification & Valuation", taskType:"review", phase:"fieldwork", priority:"medium", description:"Physical verification and valuation of closing inventory", daysOffset:22 },
      { title:"Vendor Ledger & AP Reconciliation", taskType:"review", phase:"fieldwork", priority:"medium", description:"Reconcile creditors ledger, obtain confirmation for large balances", daysOffset:25 },
      { title:"Revenue Recognition Testing", taskType:"review", phase:"fieldwork", priority:"high", description:"Test revenue cut-off, completeness and accuracy", daysOffset:28 },
      { title:"Expense Vouching & Verification", taskType:"review", phase:"fieldwork", priority:"medium", description:"Vouch major expense heads, verify statutory deductions", daysOffset:30 },
      { title:"Related Party Transactions Review", taskType:"review", phase:"fieldwork", priority:"high", description:"Identify and verify RPT disclosures per Sec 188", daysOffset:32 },
      { title:"Draft Financial Statements Review", taskType:"review", phase:"review", priority:"high", description:"Review draft P&L, Balance Sheet, Cash Flow and Notes", daysOffset:40 },
      { title:"CARO 2020 Checklist", taskType:"review", phase:"review", priority:"high", description:"Complete Companies Auditor's Report Order checklist", daysOffset:42 },
      { title:"Director's Report Review", taskType:"review", phase:"review", priority:"medium", description:"Review Director's report for completeness and consistency", daysOffset:44 },
      { title:"Issue Management Letter", taskType:"compliance_task", phase:"reporting", priority:"medium", description:"Communicate internal control weaknesses to management", daysOffset:50 },
      { title:"Issue Statutory Audit Report", taskType:"compliance_task", phase:"reporting", priority:"critical", description:"Sign and issue final audit report under Companies Act", daysOffset:55 },
    ],
  },
  {
    id: "tax_audit",
    label: "Tax Audit (44AB)",
    icon: "📊",
    color: "border-green-200 bg-green-50",
    description: "Income Tax Sec 44AB audit — Form 3CA/3CB & Form 3CD preparation and filing",
    tasks: [
      { title:"Review Books of Accounts", taskType:"review", phase:"planning", priority:"high", description:"Verify books are maintained per IT Act requirements", daysOffset:0 },
      { title:"Collect Form 3CD Supporting Details", taskType:"document_request", phase:"planning", priority:"critical", description:"Obtain all clause-wise details for Form 3CD", daysOffset:3 },
      { title:"Verify TDS Deductions & 26AS", taskType:"document_request", phase:"planning", priority:"high", description:"Reconcile TDS deducted with 26AS statement and Form 16/16A", daysOffset:5 },
      { title:"Verify Business Income & Expenses", taskType:"review", phase:"fieldwork", priority:"high", description:"Verify turnover, business income and allowable expenses", daysOffset:10 },
      { title:"Check Disallowances u/s 40 & 43B", taskType:"review", phase:"fieldwork", priority:"high", description:"Verify statutory payments, ESIC/PF, interest disallowances", daysOffset:12 },
      { title:"Capital Gains Transactions Verification", taskType:"review", phase:"fieldwork", priority:"medium", description:"Verify capital gains/losses on investments, property, securities", daysOffset:15 },
      { title:"ICDS Compliance Check", taskType:"review", phase:"fieldwork", priority:"medium", description:"Income Computation and Disclosure Standards compliance review", daysOffset:18 },
      { title:"Prepare Draft Form 3CD", taskType:"compliance_task", phase:"fieldwork", priority:"critical", description:"Complete all 44 clauses of Form 3CD", daysOffset:20 },
      { title:"Internal Review of Form 3CD", taskType:"review", phase:"review", priority:"high", description:"Partner/manager review and sign-off on Form 3CD", daysOffset:25 },
      { title:"Upload Form 3CA/3CB & 3CD", taskType:"compliance_task", phase:"reporting", priority:"critical", description:"Upload tax audit report on income tax portal", daysOffset:30 },
    ],
  },
  {
    id: "gst_audit",
    label: "GST Audit",
    icon: "🧾",
    color: "border-amber-200 bg-amber-50",
    description: "GSTR-9 & GSTR-9C preparation — reconciliation, ITC verification, and filing",
    tasks: [
      { title:"GSTR-9 vs Books Reconciliation", taskType:"review", phase:"planning", priority:"critical", description:"Reconcile turnover and tax per GSTR-1/3B vs books", daysOffset:0 },
      { title:"Collect All GST Returns (GSTR-1, 3B)", taskType:"document_request", phase:"planning", priority:"high", description:"Download all filed returns for the FY from GST portal", daysOffset:3 },
      { title:"ITC Verification — GSTR-2A vs Purchase Register", taskType:"review", phase:"fieldwork", priority:"high", description:"Match ITC claimed in 3B with GSTR-2A/2B availability", daysOffset:7 },
      { title:"ITC Reversal Check (Rule 42/43)", taskType:"review", phase:"fieldwork", priority:"high", description:"Verify mandatory ITC reversals for exempt/personal use", daysOffset:10 },
      { title:"RCM Applicability Verification", taskType:"review", phase:"fieldwork", priority:"high", description:"Identify RCM transactions and verify tax paid on them", daysOffset:12 },
      { title:"E-Way Bill Compliance", taskType:"review", phase:"fieldwork", priority:"medium", description:"Verify e-way bill generation for eligible outward supplies", daysOffset:15 },
      { title:"Credit Note & Debit Note Verification", taskType:"review", phase:"fieldwork", priority:"medium", description:"Verify credit/debit notes are properly reflected in returns", daysOffset:18 },
      { title:"Prepare GSTR-9 Annual Return", taskType:"compliance_task", phase:"review", priority:"critical", description:"Compile and prepare the annual GST return GSTR-9", daysOffset:22 },
      { title:"Prepare GSTR-9C Reconciliation Statement", taskType:"compliance_task", phase:"review", priority:"critical", description:"Prepare certified reconciliation statement for audit", daysOffset:25 },
      { title:"File GSTR-9 & GSTR-9C", taskType:"compliance_task", phase:"reporting", priority:"critical", description:"File both returns on GST portal before deadline", daysOffset:30 },
    ],
  },
  {
    id: "internal_audit",
    label: "Internal Audit",
    icon: "🔍",
    color: "border-violet-200 bg-violet-50",
    description: "Risk-based internal audit — process review, controls testing, and reporting",
    tasks: [
      { title:"Define Audit Scope & Objectives", taskType:"review", phase:"planning", priority:"high", description:"Agree audit scope, objectives, and timeline with management", daysOffset:0 },
      { title:"Risk-Based Audit Plan", taskType:"review", phase:"planning", priority:"high", description:"Identify high-risk areas and develop the audit program", daysOffset:3 },
      { title:"Procurement & Vendor Management Audit", taskType:"review", phase:"fieldwork", priority:"medium", description:"Review procurement process, PO approvals, vendor selection", daysOffset:7 },
      { title:"Payroll & HR Audit", taskType:"review", phase:"fieldwork", priority:"high", description:"Verify payroll accuracy, attendance, statutory compliance", daysOffset:10 },
      { title:"Expense Claims Verification", taskType:"review", phase:"fieldwork", priority:"medium", description:"Review expense claim process, policy compliance, approvals", daysOffset:12 },
      { title:"IT Systems & Data Security Review", taskType:"review", phase:"fieldwork", priority:"high", description:"Review access controls, data security, system reliability", daysOffset:15 },
      { title:"Cash & Banking Controls Review", taskType:"review", phase:"fieldwork", priority:"high", description:"Verify cash management, bank reconciliation process, signatory controls", daysOffset:17 },
      { title:"Draft Internal Audit Report", taskType:"review", phase:"review", priority:"high", description:"Compile findings, observations, and recommendations", daysOffset:22 },
      { title:"Management Response Collection", taskType:"document_request", phase:"review", priority:"medium", description:"Obtain management responses to each finding", daysOffset:25 },
      { title:"Issue Final Internal Audit Report", taskType:"review", phase:"reporting", priority:"critical", description:"Issue report to Board/Audit Committee with action plan", daysOffset:30 },
    ],
  },
  {
    id: "roc_annual",
    label: "ROC Annual Filing",
    icon: "🏛️",
    color: "border-pink-200 bg-pink-50",
    description: "Annual ROC compliance — AGM, AOC-4, MGT-7, and Registrar filings",
    tasks: [
      { title:"Verify Register of Members & DIN", taskType:"document_request", phase:"planning", priority:"high", description:"Verify share capital, register of members, and director DINs", daysOffset:0 },
      { title:"Prepare Annual Accounts", taskType:"review", phase:"fieldwork", priority:"high", description:"Finalise audited financial statements for the year", daysOffset:5 },
      { title:"Board Meeting — Approve Accounts", taskType:"compliance_task", phase:"fieldwork", priority:"critical", description:"Convene Board meeting to approve financial statements", daysOffset:10 },
      { title:"Prepare Director's Report", taskType:"review", phase:"fieldwork", priority:"medium", description:"Draft Director's Report per Section 134 requirements", daysOffset:12 },
      { title:"AGM Notice Dispatch (21 days)", taskType:"compliance_task", phase:"review", priority:"high", description:"Dispatch AGM notice with 21 clear days to shareholders", daysOffset:15 },
      { title:"Conduct AGM", taskType:"compliance_task", phase:"review", priority:"critical", description:"Hold Annual General Meeting and pass required resolutions", daysOffset:22 },
      { title:"File AOC-4 (Financial Statements)", taskType:"compliance_task", phase:"reporting", priority:"critical", description:"File financial statements with ROC within 30 days of AGM", daysOffset:28 },
      { title:"File MGT-7 (Annual Return)", taskType:"compliance_task", phase:"reporting", priority:"critical", description:"File Annual Return with ROC within 60 days of AGM", daysOffset:35 },
    ],
  },
];

const SEED_CATEGORIES = [
  { id: "gst",        label: "GST Returns",       desc: "GSTR-1 & GSTR-3B (monthly)" },
  { id: "tds",        label: "TDS",               desc: "Monthly payment + quarterly returns" },
  { id: "income_tax", label: "Income Tax",         desc: "Advance tax, ITR, Tax Audit Report" },
  { id: "roc",        label: "ROC / MCA",          desc: "AGM, AOC-4, MGT-7, Audit Report" },
  { id: "pf_esi",    label: "PF / ESI",            desc: "Monthly PF/ESI payment" },
];

type Tab = "dashboard"|"clients"|"tasks"|"calendar"|"packages"|"trail"|"findings"|"workload"|"automation"|"collaboration";
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard",   icon: <Shield className="w-4 h-4" /> },
  { id: "clients",   label: "Clients",     icon: <Users className="w-4 h-4" /> },
  { id: "tasks",     label: "Tasks",       icon: <ClipboardList className="w-4 h-4" /> },
  { id: "findings",  label: "Findings",    icon: <Flag className="w-4 h-4" /> },
  { id: "calendar",  label: "Compliance",  icon: <CalendarDays className="w-4 h-4" /> },
  { id: "packages",  label: "Doc Packages",icon: <Package className="w-4 h-4" /> },
  { id: "workload",  label: "Team Workload",  icon: <BarChart3 className="w-4 h-4" /> },
  { id: "collaboration", label: "Collaboration", icon: <MessageCircle className="w-4 h-4" /> },
  { id: "automation",   label: "Automation Hub", icon: <Zap className="w-4 h-4" /> },
  { id: "trail",        label: "Audit Trail",   icon: <Activity className="w-4 h-4" /> },
];

/* ── findings helpers ── */
const SEV_CFG: Record<string, { label: string; color: string }> = {
  critical: { label: "Critical", color: "bg-red-100 text-red-700 border-red-200" },
  high:     { label: "High",     color: "bg-orange-100 text-orange-700 border-orange-200" },
  medium:   { label: "Medium",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  low:      { label: "Low",      color: "bg-green-100 text-green-700 border-green-200" },
};
const FINDING_STATUS_CFG: Record<string, { label: string; color: string }> = {
  open:        { label: "Open",        color: "bg-red-50 text-red-600 border-red-200" },
  in_progress: { label: "In Progress", color: "bg-amber-50 text-amber-600 border-amber-200" },
  resolved:    { label: "Resolved",    color: "bg-green-50 text-green-700 border-green-200" },
  closed:      { label: "Closed",      color: "bg-gray-100 text-gray-500 border-gray-200" },
};
const CATEGORIES = [
  { value: "financial",    label: "Financial" },
  { value: "compliance",   label: "Compliance" },
  { value: "operational",  label: "Operational" },
  { value: "it_security",  label: "IT Security" },
  { value: "tax",          label: "Tax" },
  { value: "other",        label: "Other" },
];

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
  return <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", c.color)}>{c.label}</span>;
}
function PriorityBadge({ priority }: { priority: string }) {
  const c = PRIORITY_CFG[priority] ?? PRIORITY_CFG.medium;
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1", c.color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />{c.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════
   COLLABORATION HUB COMPONENT
══════════════════════════════════════════════════════ */
const REQ_TYPE_CFG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  document:    { label: "Document Request",  icon: FileText,   color: "#7c3aed" },
  information: { label: "Information",       icon: HelpCircle, color: "#2563eb" },
  clarification:{ label: "Clarification",   icon: MessageSquare, color: "#0891b2" },
  approval:    { label: "Approval",          icon: ThumbsUp,   color: "#059669" },
};
const COLLAB_STATUS_CFG: Record<string, { label: string; badge: string; dot: string }> = {
  pending:      { label: "Pending",      badge: "bg-gray-100 text-gray-600",    dot: "bg-gray-400" },
  in_progress:  { label: "In Progress",  badge: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  submitted:    { label: "Submitted",    badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  under_review: { label: "Under Review", badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500" },
  completed:    { label: "Completed",    badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  overdue:      { label: "Overdue",      badge: "bg-red-100 text-red-700",      dot: "bg-red-500" },
  cancelled:    { label: "Cancelled",    badge: "bg-gray-100 text-gray-400",    dot: "bg-gray-300" },
};
const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high:     "bg-orange-100 text-orange-700",
  medium:   "bg-amber-100 text-amber-700",
  low:      "bg-gray-100 text-gray-500",
};
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:      ["in_progress", "cancelled"],
  in_progress:  ["submitted", "cancelled"],
  submitted:    ["under_review", "completed", "in_progress"],
  under_review: ["completed", "in_progress"],
  overdue:      ["in_progress", "completed", "cancelled"],
};

function timeAgoCollab(ts: string | Date) {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60_000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CollaborationHub({ clients, onCreateTask }: { clients: any[]; onCreateTask?: (prefill: { clientId: string; title: string; description: string; dueDate: string; taskType: string }) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType,   setFilterType]   = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [search,       setSearch]       = useState("");
  const [selectedId,   setSelectedId]   = useState<number | null>(null);
  const [showNew,      setShowNew]      = useState(false);
  const [newMsg,       setNewMsg]       = useState("");
  const [msgRole,      setMsgRole]      = useState<"auditor"|"client">("auditor");
  const [attachUrl,    setAttachUrl]    = useState("");
  const [attachName,   setAttachName]   = useState("");

  /* ── New request form state ── */
  const [nf, setNf] = useState({
    clientId: "", title: "", description: "", requestType: "document",
    priority: "medium", dueDate: "", createdBy: "Auditor",
  });

  /* ── Queries ── */
  const listParams: any = {};
  if (filterStatus !== "all") listParams.status = filterStatus;
  if (filterType   !== "all") listParams.requestType = filterType;
  if (filterClient !== "all") listParams.clientId = Number(filterClient);
  if (search) listParams.search = search;

  const { data: reqData, refetch: refetchReqs } = useListCollaborationRequests(listParams);
  const { data: summaryData } = useGetCollaborationSummary();
  const { data: detailData, refetch: refetchDetail } = useGetCollaborationRequest(selectedId ?? 0);

  const createReq  = useCreateCollaborationRequest();
  const updateReq  = useUpdateCollaborationRequest();
  const deleteReq  = useDeleteCollaborationRequest();
  const createMsg  = useCreateCollaborationMessage();

  const requests: any[] = (reqData as any) ?? [];
  const summary: any    = summaryData ?? {};
  const detail: any     = (detailData as any) ?? null;
  const messages: any[] = detail?.messages ?? [];

  function handleCreate() {
    if (!nf.clientId || !nf.title.trim()) {
      toast({ title: "Client and title are required", variant: "destructive" }); return;
    }
    createReq.mutate({ data: { ...nf, clientId: Number(nf.clientId) } } as any, {
      onSuccess: (r: any) => {
        toast({ title: "Request created" });
        setShowNew(false);
        setNf({ clientId: "", title: "", description: "", requestType: "document", priority: "medium", dueDate: "", createdBy: "Auditor" });
        setSelectedId(r.id);
        refetchReqs();
      },
    });
  }

  function handleStatusChange(id: number, newStatus: string, currentData: any) {
    updateReq.mutate({ id, data: { ...currentData, status: newStatus, updatedBy: "Auditor" } } as any, {
      onSuccess: () => {
        toast({ title: `Status → ${COLLAB_STATUS_CFG[newStatus]?.label ?? newStatus}` });
        refetchReqs(); if (selectedId === id) refetchDetail();
      },
    });
  }

  function handleSendMessage() {
    if (!selectedId || (!newMsg.trim() && !attachUrl.trim())) return;
    const attachments: any[] = [];
    if (attachUrl.trim()) attachments.push({ name: attachName.trim() || attachUrl, url: attachUrl.trim(), uploadedAt: new Date().toISOString() });

    createMsg.mutate({
      id: selectedId,
      data: {
        senderRole:  msgRole,
        senderName:  msgRole === "auditor" ? "Auditor" : "Client",
        message:     newMsg.trim() || null,
        messageType: "message",
        attachments: JSON.stringify(attachments),
      },
    } as any, {
      onSuccess: () => {
        setNewMsg(""); setAttachUrl(""); setAttachName("");
        refetchDetail(); refetchReqs();
        toast({ title: "Message sent" });
      },
    });
  }

  function handleDelete(id: number) {
    deleteReq.mutate({ id } as any, {
      onSuccess: () => {
        toast({ title: "Request deleted" });
        if (selectedId === id) setSelectedId(null);
        refetchReqs();
      },
    });
  }

  const selectedReq = detail?.request ?? requests.find(r => r.id === selectedId);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
        {[
          { key: "all",         label: "All",          count: summary.total ?? requests.length },
          { key: "pending",     label: "Pending",      count: summary.pending     ?? 0 },
          { key: "in_progress", label: "In Progress",  count: summary.inProgress  ?? 0 },
          { key: "submitted",   label: "Submitted",    count: summary.submitted   ?? 0 },
          { key: "under_review",label: "Review",       count: summary.underReview ?? 0 },
          { key: "completed",   label: "Completed",    count: summary.completed   ?? 0 },
          { key: "overdue",     label: "Overdue",      count: summary.overdue     ?? 0 },
        ].map(item => (
          <button key={item.key} onClick={() => setFilterStatus(item.key)}
            className={cn(
              "rounded-xl border px-3 py-2 text-left transition-colors",
              filterStatus === item.key
                ? item.key === "overdue" ? "border-red-300 bg-red-50" : "border-violet-300 bg-violet-50"
                : "border-gray-200 bg-white hover:border-violet-200"
            )}>
            <p className={cn("text-lg font-bold",
              item.key === "overdue" && item.count > 0 ? "text-red-600" :
              filterStatus === item.key ? "text-violet-700" : "text-gray-700"
            )}>{item.count}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{item.label}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-4 h-[calc(100vh-300px)] min-h-[500px]">
        {/* ── LEFT: Request list ── */}
        <div className="w-80 shrink-0 flex flex-col gap-2">
          {/* Filters */}
          <div className="flex gap-2">
            <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="h-8 rounded-xl text-xs flex-1" />
            <Button size="sm" className="h-8 rounded-xl bg-violet-600 hover:bg-violet-700 shrink-0 text-xs px-3"
              onClick={() => setShowNew(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />New
            </Button>
          </div>
          <div className="flex gap-1.5">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-7 rounded-xl text-xs flex-1">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(REQ_TYPE_CFG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="h-7 rounded-xl text-xs flex-1">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Request cards */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {requests.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                <Inbox className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">No requests yet</p>
                <p className="text-xs text-gray-400 mt-1">Create one to start collaborating</p>
              </div>
            ) : requests.map((req: any) => {
              const sc = COLLAB_STATUS_CFG[req.status] ?? COLLAB_STATUS_CFG.pending;
              const tc = REQ_TYPE_CFG[req.requestType] ?? REQ_TYPE_CFG.document;
              const Icon = tc.icon;
              const isSelected = req.id === selectedId;
              return (
                <div key={req.id} onClick={() => setSelectedId(req.id)}
                  className={cn(
                    "border rounded-xl px-3 py-2.5 cursor-pointer transition-all group",
                    isSelected ? "border-violet-300 bg-violet-50 shadow-sm" : "border-gray-200 bg-white hover:border-violet-200"
                  )}>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${tc.color}18` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: tc.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-1">{req.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{req.clientName ?? `Client #${req.clientId}`}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDelete(req.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-opacity shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5", sc.badge)}>
                      <span className={cn("w-1 h-1 rounded-full", sc.dot)} />{sc.label}
                    </span>
                    {req.priority !== "medium" && (
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", PRIORITY_BADGE[req.priority] ?? PRIORITY_BADGE.medium)}>
                        {req.priority}
                      </span>
                    )}
                    {req.dueDate && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full",
                        req.dueDate < today ? "bg-red-100 text-red-600 font-semibold" : "bg-gray-100 text-gray-500"
                      )}>
                        Due {req.dueDate}
                      </span>
                    )}
                    {req.messageCount > 0 && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <MessageSquare className="w-2.5 h-2.5" />{req.messageCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Detail / timeline ── */}
        <div className="flex-1 flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-white">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageCircle className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm font-semibold text-gray-500">Select a request</p>
              <p className="text-xs text-gray-400 mt-1">Choose a request from the list or create a new one</p>
            </div>
          ) : !detail ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="px-5 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {(() => {
                        const tc = REQ_TYPE_CFG[selectedReq?.requestType] ?? REQ_TYPE_CFG.document;
                        const Icon = tc.icon;
                        return (
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-4 h-4" style={{ color: tc.color }} />
                            <span className="text-[11px] font-semibold" style={{ color: tc.color }}>{tc.label}</span>
                          </div>
                        );
                      })()}
                      {(() => {
                        const sc = COLLAB_STATUS_CFG[selectedReq?.status] ?? COLLAB_STATUS_CFG.pending;
                        return (
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1", sc.badge)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />{sc.label}
                          </span>
                        );
                      })()}
                      {selectedReq?.priority !== "medium" && (
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", PRIORITY_BADGE[selectedReq?.priority] ?? "")}>
                          {selectedReq?.priority}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">{selectedReq?.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedReq?.clientName} ·{" "}
                      Created {selectedReq?.createdAt ? timeAgoCollab(selectedReq.createdAt) : "—"}
                      {selectedReq?.dueDate && ` · Due ${selectedReq.dueDate}`}
                    </p>
                  </div>
                  {/* Status action buttons + Create Task */}
                  <div className="flex gap-1.5 shrink-0 flex-wrap">
                    {onCreateTask && selectedReq && (
                      <button
                        onClick={() => onCreateTask({
                          clientId:    String(selectedReq.clientId),
                          title:       selectedReq.title,
                          description: selectedReq.description ?? "",
                          dueDate:     selectedReq.dueDate ?? "",
                          taskType:    selectedReq.requestType === "approval" ? "approval" : "document_request",
                        })}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1">
                        <ClipboardList className="w-3 h-3" />Create Task
                      </button>
                    )}
                    {(STATUS_TRANSITIONS[selectedReq?.status ?? "pending"] ?? []).map((s: string) => (
                      <button key={s} onClick={() => handleStatusChange(selectedReq.id, s, selectedReq)}
                        className={cn(
                          "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors",
                          s === "completed"  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" :
                          s === "cancelled"  ? "bg-gray-100 text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200" :
                          "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                        )}>
                        → {COLLAB_STATUS_CFG[s]?.label ?? s}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedReq?.description && (
                  <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2">{selectedReq.description}</p>
                )}
              </div>

              {/* Message timeline */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-400">No messages yet</div>
                )}
                {messages.map((msg: any) => {
                  const isAuditor   = msg.senderRole === "auditor";
                  const isSystem    = msg.messageType === "status_change" || msg.messageType === "system";
                  const attachs: any[] = (() => { try { return JSON.parse(msg.attachments || "[]"); } catch { return []; } })();

                  if (isSystem && msg.messageType === "status_change") {
                    return (
                      <div key={msg.id} className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px bg-gray-100" />
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 px-2 py-1 bg-gray-50 rounded-full shrink-0">
                          <CheckCheck className="w-3 h-3" />
                          <span className="font-semibold">{msg.senderName ?? "Auditor"}</span>
                          changed status:
                          <span className={cn("px-1.5 rounded-full", COLLAB_STATUS_CFG[msg.fromStatus]?.badge)}>{COLLAB_STATUS_CFG[msg.fromStatus]?.label ?? msg.fromStatus}</span>
                          →
                          <span className={cn("px-1.5 rounded-full", COLLAB_STATUS_CFG[msg.toStatus]?.badge)}>{COLLAB_STATUS_CFG[msg.toStatus]?.label ?? msg.toStatus}</span>
                          <span className="text-gray-300">· {timeAgoCollab(msg.createdAt)}</span>
                        </div>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                    );
                  }

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px bg-gray-100" />
                        <div className="text-[10px] text-gray-400 px-2 py-1 bg-violet-50 text-violet-500 rounded-full shrink-0 flex items-center gap-1">
                          <FilePlus2 className="w-3 h-3" />Request opened · {timeAgoCollab(msg.createdAt)}
                        </div>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={cn("flex gap-2.5", isAuditor ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5",
                        isAuditor ? "bg-violet-500" : "bg-blue-500"
                      )}>
                        {isAuditor ? "A" : "C"}
                      </div>
                      <div className={cn("max-w-[70%] space-y-1", isAuditor ? "items-end" : "items-start")}>
                        <div className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm",
                          isAuditor
                            ? "bg-violet-600 text-white rounded-tr-sm"
                            : "bg-gray-100 text-gray-800 rounded-tl-sm"
                        )}>
                          {msg.message && <p className="leading-relaxed">{msg.message}</p>}
                          {attachs.map((a: any, i: number) => (
                            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-1.5 mt-1.5 text-xs underline rounded-lg px-2 py-1",
                                isAuditor ? "bg-violet-500 text-violet-100" : "bg-white text-violet-600"
                              )}>
                              <Paperclip className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[200px]">{a.name || a.url}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                            </a>
                          ))}
                        </div>
                        <div className={cn("flex items-center gap-1 text-[10px] text-gray-400", isAuditor ? "flex-row-reverse" : "")}>
                          <span className="font-medium">{msg.senderName ?? (isAuditor ? "Auditor" : "Client")}</span>
                          <span>·</span>
                          <span>{timeAgoCollab(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message compose bar */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 shrink-0 space-y-2">
                {/* Role toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 font-medium">Sending as:</span>
                  <div className="flex gap-1">
                    {(["auditor", "client"] as const).map(role => (
                      <button key={role} onClick={() => setMsgRole(role)}
                        className={cn(
                          "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors capitalize",
                          msgRole === role
                            ? role === "auditor" ? "bg-violet-600 text-white border-violet-600" : "bg-blue-500 text-white border-blue-500"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        )}>
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSendMessage(); }}
                  placeholder="Type a message… (Ctrl+Enter to send)"
                  className="w-full text-sm rounded-xl border border-gray-200 bg-white px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
                <div className="flex items-center gap-2">
                  <Input value={attachUrl} onChange={e => setAttachUrl(e.target.value)}
                    placeholder="Attachment URL (Google Drive, SharePoint…)"
                    className="h-7 text-xs rounded-xl flex-1" />
                  {attachUrl && (
                    <Input value={attachName} onChange={e => setAttachName(e.target.value)}
                      placeholder="Display name" className="h-7 text-xs rounded-xl w-36" />
                  )}
                  <Button size="sm"
                    onClick={handleSendMessage}
                    disabled={createMsg.isPending || (!newMsg.trim() && !attachUrl.trim())}
                    className="h-7 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs px-3 shrink-0">
                    <Send className="w-3.5 h-3.5 mr-1" />Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── New Request Modal ── */}
      {showNew && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowNew(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <FilePlus2 className="w-5 h-5 text-violet-500" />New Collaboration Request
                </h3>
                <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Client *</label>
                  <Select value={nf.clientId} onValueChange={v => setNf(f => ({ ...f, clientId: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client…" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Title *</label>
                  <Input value={nf.title} onChange={e => setNf(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Bank statements for Q4 FY2025" className="rounded-xl" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Type</label>
                    <Select value={nf.requestType} onValueChange={v => setNf(f => ({ ...f, requestType: v }))}>
                      <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(REQ_TYPE_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Priority</label>
                    <Select value={nf.priority} onValueChange={v => setNf(f => ({ ...f, priority: v }))}>
                      <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["critical", "high", "medium", "low"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Due Date</label>
                  <Input type="date" value={nf.dueDate} onChange={e => setNf(f => ({ ...f, dueDate: e.target.value }))}
                    className="rounded-xl" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Description / Instructions</label>
                  <textarea rows={3} value={nf.description}
                    onChange={e => setNf(f => ({ ...f, description: e.target.value }))}
                    placeholder="What exactly do you need from the client?"
                    className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-violet-400" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700"
                  onClick={handleCreate} disabled={createReq.isPending}>
                  {createReq.isPending ? "Creating…" : "Create Request"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   AUTOMATION HUB COMPONENT
══════════════════════════════════════════════════════ */
const PRIORITY_COLORS: Record<string, { ring: string; badge: string; icon: string }> = {
  critical: { ring: "border-red-300 bg-red-50",      badge: "bg-red-100 text-red-700",    icon: "text-red-500" },
  high:     { ring: "border-orange-300 bg-orange-50", badge: "bg-orange-100 text-orange-700", icon: "text-orange-500" },
  medium:   { ring: "border-amber-300 bg-amber-50",   badge: "bg-amber-100 text-amber-700",  icon: "text-amber-500" },
  low:      { ring: "border-gray-200 bg-gray-50",     badge: "bg-gray-100 text-gray-500",   icon: "text-gray-400" },
};
const NOTIF_LABEL: Record<string, string> = {
  overdue_task:       "Overdue Task",
  overdue_compliance: "Overdue Compliance",
  deadline_tomorrow:  "Due Tomorrow",
  deadline_3days:     "Due in 3 Days",
  deadline_7days:     "Upcoming Deadline",
  query_followup:     "Query Follow-up",
  unassigned_tasks:   "Unassigned Tasks",
};
const RULE_TYPE_DESCS: Record<string, string> = {
  overdue_alert:       "Notify when tasks or deadlines are overdue",
  deadline_reminder:   "Advance warning before due dates",
  query_followup:      "Auto-remind on unanswered queries",
  escalation:          "Escalate priority for critical items",
  recurring_compliance:"Auto-create recurring compliance tasks",
};
const DEFAULT_RULES = [
  { name: "Overdue Task Alert",       ruleType: "overdue_alert",      description: "Create a notification when any task passes its due date" },
  { name: "Compliance Deadline (7d)", ruleType: "deadline_reminder",  description: "Warn 7 days before compliance deadlines" },
  { name: "Compliance Deadline (3d)", ruleType: "deadline_reminder",  description: "Warn 3 days before compliance deadlines" },
  { name: "Compliance Deadline (1d)", ruleType: "deadline_reminder",  description: "Critical alert 1 day before compliance deadlines" },
  { name: "Query Follow-up (3d)",     ruleType: "query_followup",     description: "Follow-up when client query has no response for 3+ days" },
  { name: "Unassigned Task Alert",    ruleType: "escalation",         description: "Alert when tasks remain unassigned after creation" },
];

function AutomationHub() {
  const { data: notifData, refetch: refetchNotifs } = useListNotifications({ limit: 50 } as any);
  const { data: summaryData, refetch: refetchSummary } = useGetNotificationSummary();
  const { data: rulesData, refetch: refetchRules } = useListAutomationRules({});
  const markAllRead  = useMarkAllNotificationsRead();
  const markRead     = useMarkNotificationRead();
  const dismissNotif = useDismissNotification();
  const createRule   = useCreateAutomationRule();
  const updateRule   = useUpdateAutomationRule();
  const deleteRule   = useDeleteAutomationRule();
  const runAuto      = useRunAutomation();
  const { toast }    = useToast();

  const notifs: any[]  = (notifData as any) ?? [];
  const summary: any   = summaryData ?? {};
  const rules: any[]   = (rulesData as any) ?? [];
  const unread         = notifs.filter(n => n.status === "unread");

  function handleRunNow() {
    runAuto.mutate({} as any, {
      onSuccess: (r: any) => {
        toast({ title: `Automation ran — ${r.created ?? 0} new notifications created` });
        refetchNotifs(); refetchSummary();
      },
      onError: () => toast({ title: "Automation run failed", variant: "destructive" }),
    });
  }

  function handleMarkAllRead() {
    markAllRead.mutate({} as any, { onSuccess: () => { refetchNotifs(); refetchSummary(); } });
  }

  function handleMarkRead(id: number) {
    markRead.mutate({ id } as any, { onSuccess: () => refetchNotifs() });
  }

  function handleDismiss(id: number) {
    dismissNotif.mutate({ id } as any, { onSuccess: () => refetchNotifs() });
  }

  function toggleRule(rule: any) {
    updateRule.mutate({ id: rule.id, data: { ...rule, isActive: !rule.isActive } } as any, {
      onSuccess: () => { toast({ title: `Rule ${rule.isActive ? "paused" : "activated"}` }); refetchRules(); },
    });
  }

  function handleDeleteRule(id: number) {
    deleteRule.mutate({ id } as any, {
      onSuccess: () => { toast({ title: "Rule deleted" }); refetchRules(); },
    });
  }

  function handleInstallDefaults() {
    let done = 0;
    DEFAULT_RULES.forEach(r => {
      createRule.mutate({ data: r } as any, {
        onSuccess: () => { done++; if (done === DEFAULT_RULES.length) { toast({ title: `${done} default rules installed` }); refetchRules(); } },
      });
    });
  }

  /* bar chart of alert categories */
  const byType: Record<string, number> = {};
  notifs.forEach(n => { byType[n.type] = (byType[n.type] ?? 0) + 1; });
  const sortedByType = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedByType[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      {/* Header + run button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-500" />Intelligent Automation Hub
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Automated monitoring, smart alerts, and compliance scheduling</p>
        </div>
        <div className="flex gap-2">
          {unread.length > 0 && (
            <Button size="sm" variant="outline" className="rounded-xl" onClick={handleMarkAllRead}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Mark All Read
            </Button>
          )}
          <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={handleRunNow}
            disabled={runAuto.isPending}>
            <Play className="w-3.5 h-3.5 mr-1" />
            {runAuto.isPending ? "Running…" : "Run Checks Now"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Critical",    count: summary.critical ?? 0, color: "text-red-600",    bg: "bg-red-50 border-red-200" },
          { label: "High",        count: summary.high     ?? 0, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
          { label: "Medium",      count: summary.medium   ?? 0, color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
          { label: "Total Unread",count: summary.total    ?? 0, color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
        ].map(item => (
          <div key={item.label} className={cn("rounded-xl border px-4 py-3", item.bg)}>
            <p className={cn("text-2xl font-bold", item.color)}>{item.count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.label} Alerts</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Alerts Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-violet-500" />Alert Feed
              {unread.length > 0 && (
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unread.length} unread
                </span>
              )}
            </h3>
            <span className="text-xs text-gray-400">{notifs.length} total</span>
          </div>

          {notifs.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm font-semibold text-gray-600">No Alerts</p>
              <p className="text-xs text-gray-400 mt-1">Click "Run Checks Now" to scan for issues</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {notifs.map((n: any) => {
                const pc = PRIORITY_COLORS[n.priority] ?? PRIORITY_COLORS.medium;
                const isUnread = n.status === "unread";
                return (
                  <div key={n.id} className={cn("border rounded-xl px-4 py-3 flex items-start gap-3 transition-colors group", pc.ring)}>
                    <AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", pc.icon)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", pc.badge)}>
                          {n.priority.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-gray-400">{NOTIF_LABEL[n.type] ?? n.type}</span>
                        {n.clientName && <span className="text-[10px] text-gray-400">· {n.clientName}</span>}
                        {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                      </div>
                      <p className="text-xs font-semibold text-gray-800">{n.title}</p>
                      {n.message && <p className="text-[11px] text-gray-500 mt-0.5">{n.message}</p>}
                      <p className="text-[10px] text-gray-300 mt-1">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : ""}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUnread && (
                        <button onClick={() => handleMarkRead(n.id)} title="Mark read"
                          className="p-1.5 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDismiss(n.id)} title="Dismiss"
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Automation Rules */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-violet-500" />Automation Rules
              <span className="text-gray-400 font-normal">({rules.filter(r => r.isActive).length} active)</span>
            </h3>
            {rules.length === 0 && (
              <Button size="sm" variant="outline"
                className="rounded-xl h-7 text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
                onClick={handleInstallDefaults}>
                <Plus className="w-3 h-3 mr-1" />Install Defaults
              </Button>
            )}
          </div>

          {rules.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center">
              <Zap className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">No Automation Rules</p>
              <p className="text-xs text-gray-400 mt-1 mb-3">Install default rules to get started</p>
              <Button size="sm" onClick={handleInstallDefaults} className="rounded-xl bg-violet-600 hover:bg-violet-700">
                <Plus className="w-3.5 h-3.5 mr-1" />Install Default Rules
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule: any) => (
                <div key={rule.id} className={cn(
                  "border rounded-xl px-4 py-3 flex items-start gap-3",
                  rule.isActive ? "border-violet-200 bg-violet-50/30" : "border-gray-200 bg-gray-50 opacity-60"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                    rule.isActive ? "bg-emerald-500" : "bg-gray-300")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{rule.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {RULE_TYPE_DESCS[rule.ruleType] ?? rule.description ?? rule.ruleType}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => toggleRule(rule)}
                      className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors",
                        rule.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200"
                      )}>
                      {rule.isActive ? "Active" : "Paused"}
                    </button>
                    <button onClick={() => handleDeleteRule(rule.id)}
                      className="p-1 rounded hover:bg-red-100 text-gray-300 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline"
                className="w-full rounded-xl border-dashed text-gray-400 hover:border-violet-300 hover:text-violet-600"
                onClick={handleInstallDefaults}>
                <Plus className="w-3.5 h-3.5 mr-1" />Re-install Default Rules
              </Button>
            </div>
          )}

          {/* How It Works */}
          <div className="mt-2 bg-violet-50 border border-violet-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-violet-800 mb-2">How Automation Works</p>
            <div className="space-y-1.5">
              {[
                "Runs every 5 minutes automatically",
                "Checks overdue tasks and compliance deadlines",
                "Generates smart notifications for auditors",
                "Tracks query follow-ups and unassigned tasks",
                "Deduplicates — no repeated alerts for the same issue",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-violet-700">
                  <CheckCircle2 className="w-3 h-3 text-violet-500 shrink-0" />{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Category breakdown bar chart */}
      {sortedByType.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Alert Breakdown by Category</h3>
          <div className="space-y-2">
            {sortedByType.map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-44 shrink-0">{NOTIF_LABEL[type] ?? type}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-600 w-8 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function AuditorWorkspace() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const initialTab = (new URLSearchParams(window.location.search).get("tab") ?? "dashboard") as Tab;
  const [tab, setTab] = useState<Tab>(TABS.some(t => t.id === initialTab) ? initialTab : "dashboard");

  /* ── queries ── */
  const { data: clients = [], refetch: refetchClients }   = useListAuditClients({});
  const { data: allTasks = [], refetch: refetchTasks }    = useListAuditTasks({});
  const { data: events = [],   refetch: refetchEvents }   = useListComplianceEvents({});
  const { data: allFindings = [], refetch: refetchFindings } = useListAuditFindings({});
  const { data: allCustomers = [] } = useListCustomers({});
  const { data: allVendors = [] }   = useListVendors({});
  const { data: allCollabRaw = [] } = useListCollaborationRequests({});
  const allCollab: any[] = allCollabRaw as any[];

  /* ── mutations ── */
  const createClient  = useCreateAuditClient();
  const updateClient  = useUpdateAuditClient();
  const deleteClient  = useDeleteAuditClient();
  const createTask    = useCreateAuditTask();
  const updateTask    = useUpdateAuditTask();
  const deleteTask    = useDeleteAuditTask();
  const updateStatus  = useUpdateAuditTaskStatus();
  const addComment    = useAddAuditTaskComment();
  const createEvent   = useCreateComplianceEvent();
  const updateEvent   = useUpdateComplianceEvent();
  const createFinding   = useCreateAuditFinding();
  const updateFinding   = useUpdateAuditFinding();
  const deleteFinding   = useDeleteAuditFinding();
  const bulkCreateTasks = useBulkCreateAuditTasks();
  const seedCompliance  = useSeedClientCompliance();

  /* ── template dialog state ── */
  const [templateDlg, setTemplateDlg] = useState<{
    open: boolean; step: 1|2|3; templateId: string|null; clientId: string; baseDate: string;
  }>({ open: false, step: 1, templateId: null, clientId: "", baseDate: today });

  function openTemplateDlg(preClientId = "") {
    setTemplateDlg({ open: true, step: 1, templateId: null, clientId: preClientId, baseDate: today });
  }

  function applyTemplate() {
    const tmpl = AUDIT_TEMPLATES.find(t => t.id === templateDlg.templateId);
    if (!tmpl || !templateDlg.clientId) { toast({ title: "Select client and template", variant: "destructive" }); return; }
    const base = new Date(templateDlg.baseDate);
    const tasks = tmpl.tasks.map(t => {
      const dd = new Date(base.getTime() + t.daysOffset * 86400000);
      return { clientId: Number(templateDlg.clientId), title: t.title, taskType: t.taskType, phase: t.phase, priority: t.priority, description: t.description, dueDate: dd.toISOString().split("T")[0] };
    });
    bulkCreateTasks.mutate({ data: { tasks } } as any, {
      onSuccess: (created: any) => {
        toast({ title: `${created.length} tasks created from "${tmpl.label}" template`, description: "Tasks are now visible in the Tasks tab" });
        setTemplateDlg(d => ({ ...d, open: false }));
        refetchTasks();
      },
      onError: () => toast({ title: "Failed to create tasks", variant: "destructive" }),
    });
  }

  /* ── seed compliance dialog state ── */
  const [seedDlg, setSeedDlg] = useState<{
    open: boolean; clientId: string; fy: string; categories: string[];
  }>({ open: false, clientId: "", fy: "2025-26", categories: ["gst","tds","income_tax","roc"] });

  function openSeedDlg(preClientId = "") {
    setSeedDlg({ open: true, clientId: preClientId, fy: "2025-26", categories: ["gst","tds","income_tax","roc"] });
  }

  function runSeedCompliance() {
    if (!seedDlg.clientId) { toast({ title: "Select a client", variant: "destructive" }); return; }
    if (seedDlg.categories.length === 0) { toast({ title: "Select at least one category", variant: "destructive" }); return; }
    seedCompliance.mutate({ id: Number(seedDlg.clientId), data: { fy: seedDlg.fy, categories: seedDlg.categories } } as any, {
      onSuccess: (res: any) => {
        toast({ title: `${res.created} compliance events generated for FY ${seedDlg.fy}`, description: "View in the Compliance Calendar tab" });
        setSeedDlg(d => ({ ...d, open: false }));
        refetchEvents();
      },
      onError: () => toast({ title: "Failed to generate compliance calendar", variant: "destructive" }),
    });
  }

  function invalidate() {
    refetchClients(); refetchTasks(); refetchEvents(); refetchFindings();
  }

  /* ── findings dialog ── */
  const emptyFinding = { clientId:"", title:"", description:"", category:"compliance", severity:"medium", status:"open", recommendation:"", managementResponse:"", period:"", dueDate:"", raisedBy:"", assignedTo:"" };
  const [findingDlg, setFindingDlg] = useState<{ open: boolean; edit?: any; form: typeof emptyFinding }>({ open: false, form: emptyFinding });
  const [findingFilter, setFindingFilter] = useState({ clientId:"", status:"", severity:"", category:"" });
  const [findingSearch, setFindingSearch] = useState("");
  const [expandedFinding, setExpandedFinding] = useState<number|null>(null);

  function openNewFinding() { setFindingDlg({ open: true, form: emptyFinding }); }
  function openEditFinding(f: any) {
    setFindingDlg({ open: true, edit: f, form: {
      clientId: String(f.clientId), title: f.title, description: f.description ?? "",
      category: f.category, severity: f.severity, status: f.status,
      recommendation: f.recommendation ?? "", managementResponse: f.managementResponse ?? "",
      period: f.period ?? "", dueDate: f.dueDate ?? "", raisedBy: f.raisedBy ?? "", assignedTo: f.assignedTo ?? "",
    }});
  }
  function saveFinding() {
    const { form, edit } = findingDlg;
    if (!form.clientId || !form.title.trim()) { toast({ title: "Client and title required", variant: "destructive" }); return; }
    const data: any = { ...form, clientId: Number(form.clientId) };
    if (edit) {
      updateFinding.mutate({ id: edit.id, data } as any, {
        onSuccess: () => { toast({ title: "Finding updated" }); setFindingDlg(d => ({ ...d, open: false })); refetchFindings(); },
      });
    } else {
      createFinding.mutate({ data } as any, {
        onSuccess: () => { toast({ title: "Finding created" }); setFindingDlg(d => ({ ...d, open: false })); refetchFindings(); },
      });
    }
  }
  function removeFinding(id: number) {
    if (!confirm("Delete this finding?")) return;
    deleteFinding.mutate({ id } as any, { onSuccess: () => { toast({ title: "Finding deleted" }); refetchFindings(); } });
  }

  /* ── computed ── */
  const openTasks     = allTasks.filter((t: any) => !["completed","archived"].includes(t.status));
  const overdueTasks  = allTasks.filter((t: any) => t.dueDate && t.dueDate < today && !["completed","archived"].includes(t.status));
  const activeClients = clients.filter((c: any) => c.status === "active");
  const pendingEvents = events.filter((e: any) => e.status === "pending");

  /* ── client dialog ── */
  const emptyClient = { name:"", pan:"", gstin:"", contactName:"", contactEmail:"", contactPhone:"", address:"", city:"", state:"", engagementTypes:[] as string[], notes:"" };
  const [clientDlg, setClientDlg] = useState<{ open: boolean; edit?: any; form: typeof emptyClient }>({ open: false, form: emptyClient });
  const [clientCreatedFor, setClientCreatedFor] = useState<"task"|"event"|null>(null);

  function openNewClient() { setClientCreatedFor(null); setClientDlg({ open: true, form: emptyClient }); }
  function openNewClientFrom(origin: "task"|"event") { setClientCreatedFor(origin); setClientDlg({ open: true, form: emptyClient }); }
  function openEditClient(c: any) {
    setClientCreatedFor(null);
    setClientDlg({ open: true, edit: c, form: { ...c, engagementTypes: parseTags(c.engagementTypes ?? "[]") } });
  }
  function saveClient() {
    const { form, edit } = clientDlg;
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    const data = { ...form, engagementTypes: form.engagementTypes };
    if (edit) {
      updateClient.mutate({ id: edit.id, data } as any, {
        onSuccess: () => { toast({ title: "Client updated" }); setClientDlg(d => ({ ...d, open: false })); invalidate(); },
      });
    } else {
      createClient.mutate({ data } as any, {
        onSuccess: (newClient: any) => {
          toast({ title: "Client created", description: newClient.name });
          setClientDlg(d => ({ ...d, open: false }));
          invalidate();
          const id = String(newClient.id);
          if (clientCreatedFor === "task")  setTaskDlg(d => ({ ...d, form: { ...d.form, clientId: id } }));
          if (clientCreatedFor === "event") setEventDlg(d => ({ ...d, form: { ...d.form, clientId: id } }));
          setClientCreatedFor(null);
        },
      });
    }
  }
  function removeClient(id: number) {
    if (!confirm("Delete this client? All their tasks will also be removed.")) return;
    deleteClient.mutate({ id } as any, {
      onSuccess: () => { toast({ title: "Client deleted" }); invalidate(); },
    });
  }

  /* ── task dialog ── */
  const emptyTask = { clientId:"", title:"", taskType:"document_request", description:"", instructions:"", priority:"medium", dueDate:"", assignee:"" };
  const [taskDlg, setTaskDlg] = useState<{ open: boolean; edit?: any; form: typeof emptyTask }>({ open: false, form: emptyTask });
  const [taskDetail, setTaskDetail] = useState<any>(null);
  const [commentMsg, setCommentMsg] = useState("");
  const [taskFilter, setTaskFilter] = useState({ clientId:"", status:"", priority:"" });
  const [taskView, setTaskView] = useState<"list"|"kanban"|"table">("list");
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [tableSort, setTableSort] = useState<{ col: string; dir: "asc"|"desc" }>({ col: "dueDate", dir: "asc" });
  const [quickAdd, setQuickAdd] = useState<{ open: boolean; title: string; clientId: string; priority: string; dueDate: string }>({ open: false, title: "", clientId: "", priority: "medium", dueDate: "" });
  const [kanbanAdd, setKanbanAdd] = useState<{ status: string; title: string } | null>(null);

  function openNewTask(clientId = "") { setTaskDlg({ open: true, form: { ...emptyTask, clientId } }); }
  function openEditTask(t: any) {
    setTaskDlg({ open: true, edit: t, form: { clientId: String(t.clientId), title: t.title, taskType: t.taskType, description: t.description ?? "", instructions: t.instructions ?? "", priority: t.priority, dueDate: t.dueDate ?? "", assignee: t.assignee ?? "" } });
  }
  function saveTask() {
    const { form, edit } = taskDlg;
    if (!form.clientId || !form.title.trim()) { toast({ title: "Client and title required", variant: "destructive" }); return; }
    const data = { ...form, clientId: Number(form.clientId) };
    if (edit) {
      updateTask.mutate({ id: edit.id, data } as any, {
        onSuccess: () => { toast({ title: "Task updated" }); setTaskDlg(d => ({ ...d, open: false })); invalidate(); },
      });
    } else {
      createTask.mutate({ data } as any, {
        onSuccess: () => { toast({ title: "Task created" }); setTaskDlg(d => ({ ...d, open: false })); invalidate(); },
      });
    }
  }
  function moveStatus(task: any, dir: 1|-1) {
    const idx = STATUS_FLOW.indexOf(task.status);
    const next = STATUS_FLOW[idx + dir];
    if (!next) return;
    updateStatus.mutate({ id: task.id, data: { status: next } } as any, {
      onSuccess: () => { invalidate(); if (taskDetail?.id === task.id) setTaskDetail((p: any) => ({ ...p, status: next })); },
    });
  }
  function removeTask(id: number) {
    if (!confirm("Delete this task?")) return;
    deleteTask.mutate({ id } as any, {
      onSuccess: () => { toast({ title: "Task deleted" }); invalidate(); setTaskDetail(null); },
    });
  }
  function sendComment(taskId: number) {
    if (!commentMsg.trim()) return;
    addComment.mutate({ id: taskId, data: { message: commentMsg, author: "Current User", authorType: "auditor" } } as any, {
      onSuccess: (newCmt: any) => {
        setCommentMsg("");
        setTaskDetail((p: any) => p ? { ...p, comments: [...(p.comments ?? []), newCmt] } : p);
      },
    });
  }

  /* ── filtered + sorted tasks ── */
  const filteredTasks = useMemo(() => {
    let t = allTasks as any[];
    if (taskFilter.clientId) t = t.filter(x => String(x.clientId) === taskFilter.clientId);
    if (taskFilter.status)   t = t.filter(x => x.status === taskFilter.status);
    if (taskFilter.priority) t = t.filter(x => x.priority === taskFilter.priority);
    return t;
  }, [allTasks, taskFilter]);

  const sortedTasks = useMemo(() => {
    const PRIO_ORDER: Record<string,number> = { critical:0, high:1, medium:2, low:3 };
    return [...filteredTasks].sort((a, b) => {
      let va: any, vb: any;
      if (tableSort.col === "priority") { va = PRIO_ORDER[a.priority]??9; vb = PRIO_ORDER[b.priority]??9; }
      else if (tableSort.col === "status") { va = STATUS_FLOW.indexOf(a.status); vb = STATUS_FLOW.indexOf(b.status); }
      else { va = a[tableSort.col] ?? ""; vb = b[tableSort.col] ?? ""; }
      return tableSort.dir === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
  }, [filteredTasks, tableSort]);

  function toggleTaskSel(id: number) {
    setSelectedTasks(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleAllTasks() {
    if (selectedTasks.size === filteredTasks.length) setSelectedTasks(new Set());
    else setSelectedTasks(new Set(filteredTasks.map((t: any) => t.id)));
  }
  function bulkSetStatus(status: string) {
    const ids = Array.from(selectedTasks);
    Promise.all(ids.map(id => new Promise(res => updateStatus.mutate({ id, data: { status } } as any, { onSuccess: res, onError: res }))))
      .then(() => { toast({ title: `${ids.length} tasks updated` }); invalidate(); setSelectedTasks(new Set()); });
  }
  function bulkDelete() {
    if (!confirm(`Delete ${selectedTasks.size} tasks?`)) return;
    const ids = Array.from(selectedTasks);
    Promise.all(ids.map(id => new Promise(res => deleteTask.mutate({ id } as any, { onSuccess: res, onError: res }))))
      .then(() => { toast({ title: `${ids.length} tasks deleted` }); invalidate(); setSelectedTasks(new Set()); setTaskDetail(null); });
  }
  function submitQuickAdd() {
    if (!quickAdd.title.trim()) return;
    const clientId = quickAdd.clientId || taskFilter.clientId;
    if (!clientId) { toast({ title: "Select a client first", variant: "destructive" }); return; }
    createTask.mutate({ data: { clientId: Number(clientId), title: quickAdd.title, taskType: "document_request", description: "", instructions: "", priority: quickAdd.priority, dueDate: quickAdd.dueDate, assignee: "" } } as any, {
      onSuccess: () => { toast({ title: "Task created" }); invalidate(); setQuickAdd(q => ({ ...q, title: "", dueDate: "", open: false })); },
    });
  }
  function submitKanbanAdd(status: string) {
    if (!kanbanAdd?.title.trim()) return;
    const clientId = taskFilter.clientId || (clients[0]?.id ? String(clients[0].id) : "");
    if (!clientId) { toast({ title: "Select a client filter first", variant: "destructive" }); return; }
    createTask.mutate({ data: { clientId: Number(clientId), title: kanbanAdd.title, taskType: "document_request", description: "", instructions: "", priority: "medium", dueDate: "", assignee: "", status } } as any, {
      onSuccess: () => { toast({ title: "Task created" }); invalidate(); setKanbanAdd(null); },
    });
  }

  const KANBAN_COL_CFG: Record<string,{ bg: string; border: string; dot: string; text: string }> = {
    created:      { bg:"bg-gray-50",    border:"border-gray-200",  dot:"bg-gray-400",   text:"text-gray-600" },
    assigned:     { bg:"bg-blue-50",   border:"border-blue-200",  dot:"bg-blue-500",   text:"text-blue-700" },
    in_progress:  { bg:"bg-amber-50",  border:"border-amber-200", dot:"bg-amber-500",  text:"text-amber-700" },
    under_review: { bg:"bg-violet-50", border:"border-violet-200",dot:"bg-violet-500", text:"text-violet-700" },
    completed:    { bg:"bg-emerald-50",border:"border-emerald-200",dot:"bg-emerald-500",text:"text-emerald-700" },
    archived:     { bg:"bg-gray-50",   border:"border-gray-200",  dot:"bg-gray-300",   text:"text-gray-400" },
  };

  /* ── event dialog ── */
  const emptyEvent = { clientId:"", eventType:"custom", title:"", period:"", dueDate:"", notes:"" };
  const [eventDlg, setEventDlg] = useState<{ open: boolean; edit?: any; form: typeof emptyEvent }>({ open: false, form: emptyEvent });
  const [calMonth, setCalMonth] = useState(() => today.slice(0, 7));
  const [calView, setCalView] = useState<"calendar"|"timeline">("calendar");

  function saveEvent() {
    const { form, edit } = eventDlg;
    if (!form.title || !form.dueDate) { toast({ title: "Title and due date required", variant: "destructive" }); return; }
    const data = { ...form, clientId: form.clientId ? Number(form.clientId) : undefined };
    if (edit) {
      updateEvent.mutate({ id: edit.id, data } as any, {
        onSuccess: () => { toast({ title: "Event updated" }); setEventDlg(d => ({ ...d, open: false })); invalidate(); },
      });
    } else {
      createEvent.mutate({ data } as any, {
        onSuccess: () => { toast({ title: "Event added" }); setEventDlg(d => ({ ...d, open: false })); invalidate(); },
      });
    }
  }

  /* ── package state (preserved) ── */
  const [fy, setFy] = useState("2025-26");
  const [period, setPeriod] = useState("");
  const [project, setProject] = useState("");
  const [customer, setCust] = useState("");
  const [vendor, setVendor] = useState("");
  const [applied, setApplied] = useState(false);
  const [selDocs, setSelDocs] = useState<Set<number>>(new Set());
  const [selInv, setSelInv]   = useState<Set<number>>(new Set());
  const [selBill, setSelBill] = useState<Set<number>>(new Set());
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ recipientEmail:"", recipientName:"", subject:"Audit Document Package", message:"Please find the attached audit document package for your review." });

  const { data: pkg, isLoading: pkgLoading, refetch: refetchPkg } = useQuery<any>({
    queryKey: ["auditor-package", fy, period, project, customer, vendor, applied],
    queryFn: () => { const p = new URLSearchParams(); if (applied) { p.set("fy",fy); if(period)p.set("period",period); if(project)p.set("project",project); if(customer)p.set("customer",customer); if(vendor)p.set("vendor",vendor); } return fetch(`/api/auditor/package?${p}`).then(r=>r.json()); },
  });
  const { data: shares = [] } = useQuery<any[]>({ queryKey: ["auditor-shares"], queryFn: () => fetch("/api/auditor/shares").then(r=>r.json()) });
  const shareMut = useMutation({
    mutationFn: (data: any) => fetch("/api/auditor/shares", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) }).then(r=>r.json()),
    onSuccess: (result: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ["auditor-shares"] });
      if (vars.shareType === "email") {
        if (result.status === "sent") toast({ title:"Email Sent", description:`Package emailed to ${vars.recipientEmail} successfully.` });
        else toast({ title:"Email not delivered", description:"SMTP not configured or delivery failed.", variant:"destructive" });
      }
    },
  });
  const totalSelected = selDocs.size + selInv.size + selBill.size;
  function handleDownload(format: "zip"|"pdf") {
    if (totalSelected === 0) { toast({ title:"No records selected", variant:"destructive" }); return; }
    shareMut.mutate({ shareType:"download", format, filterFY:fy, docIds:[...selDocs,...selInv,...selBill], docCount:totalSelected });
    toast({ title: `${format.toUpperCase()} Generated`, description:`${totalSelected} records packaged.` });
  }
  function handleEmail() {
    if (!emailForm.recipientEmail) { toast({ title:"Email required", variant:"destructive" }); return; }
    setEmailOpen(false);
    shareMut.mutate({ shareType:"email", format:"pdf", ...emailForm, filterFY:fy, docIds:[...selDocs,...selInv,...selBill], docCount:totalSelected });
  }

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-600" /> Audit Workspace
          </h1>
          <p className="text-sm text-muted-foreground">Manage audit clients, tasks, compliance calendar and document packages</p>
        </div>
        <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={() => { if (tab === "clients") openNewClient(); else if (tab === "tasks") openNewTask(); else if (tab === "calendar") setEventDlg({ open: true, form: emptyEvent }); else if (tab === "findings") openNewFinding(); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {tab === "clients" ? "New Client" : tab === "tasks" ? "New Task" : tab === "calendar" ? "Add Event" : tab === "findings" ? "Add Finding" : "New"}
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              tab === t.id ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")}>
            {t.icon}{t.label}
            {t.id === "tasks" && openTasks.length > 0 && <span className="bg-violet-100 text-violet-700 text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{openTasks.length}</span>}
            {t.id === "tasks" && overdueTasks.length > 0 && <span className="bg-red-100 text-red-700 text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{overdueTasks.length}</span>}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ── */}
      {tab === "dashboard" && (
        <div className="space-y-5">
          {/* KPI cards */}
          {(() => {
            const pendingCollab  = allCollab.filter((r: any) => ["pending","in_progress"].includes(r.status));
            const overdueCollab  = allCollab.filter((r: any) => r.dueDate && r.dueDate < today && !["completed","cancelled","overdue"].includes(r.status));
            return (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label:"Active Clients",      value: activeClients.length,  icon:<Building2 className="w-5 h-5 text-violet-500"/>, sub:`${clients.length} total`, color:"bg-violet-50 border-violet-100", onClick: () => setTab("clients") },
              { label:"Open Tasks",          value: openTasks.length,      icon:<ClipboardList className="w-5 h-5 text-blue-500"/>,   sub:"Pending completion",    color:"bg-blue-50 border-blue-100",   onClick: () => setTab("tasks") },
              { label:"Overdue Tasks",       value: overdueTasks.length,   icon:<AlertTriangle className="w-5 h-5 text-red-500"/>,    sub:"Need immediate action", color:"bg-red-50 border-red-100",     onClick: () => setTab("tasks") },
              { label:"Upcoming Deadlines",  value: pendingEvents.length,  icon:<CalendarDays className="w-5 h-5 text-amber-500"/>,   sub:"Compliance pending",    color:"bg-amber-50 border-amber-100", onClick: () => setTab("calendar") },
              { label:"Pending Requests",    value: pendingCollab.length,  icon:<MessageCircle className="w-5 h-5 text-violet-600"/>, sub: overdueCollab.length > 0 ? `${overdueCollab.length} overdue` : "Client collaboration", color: overdueCollab.length > 0 ? "bg-red-50 border-red-200" : "bg-violet-50 border-violet-100", onClick: () => setTab("collaboration") },
            ].map(k => (
              <Card key={k.label} className={cn("rounded-2xl border cursor-pointer hover:shadow-md transition-shadow", k.color)} onClick={(k as any).onClick}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm shrink-0">{k.icon}</div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                    <p className="text-xs font-semibold text-gray-700">{k.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Recent tasks */}
            <Card className="rounded-2xl border-gray-200 lg:col-span-2">
              <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-700">Recent Tasks</CardTitle>
                <button onClick={() => setTab("tasks")} className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3"/></button>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-gray-50">
                {allTasks.slice(0, 8).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => { setTaskDetail(t); setTab("tasks"); }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.clientName ?? `Client #${t.clientId}`} · Due {fmtDate(t.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
                {allTasks.length === 0 && <div className="py-10 text-center text-sm text-gray-400">No tasks yet. <button onClick={() => { openNewTask(); setTab("tasks"); }} className="text-violet-600 hover:underline">Create one</button></div>}
              </CardContent>
            </Card>

            {/* Upcoming compliance + collaboration deadlines */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-700">Upcoming Deadlines</CardTitle>
                <button onClick={() => setTab("calendar")} className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">Calendar <ArrowUpRight className="w-3 h-3"/></button>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-gray-50">
                {(() => {
                  const collabDue = allCollab
                    .filter((r: any) => r.dueDate && !["completed","cancelled"].includes(r.status))
                    .sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate))
                    .slice(0, 4);
                  const complianceDue = pendingEvents.slice(0, 4);
                  const combined = [
                    ...complianceDue.map((e: any) => ({ id: `c-${e.id}`, type: "compliance", label: e.eventType.toUpperCase(), title: e.title, dueDate: e.dueDate, isOverdue: e.dueDate < today, onClick: () => setTab("calendar") })),
                    ...collabDue.map((r: any) => ({ id: `r-${r.id}`, type: "request", label: "REQ", title: r.title, dueDate: r.dueDate, isOverdue: r.dueDate < today, onClick: () => setTab("collaboration") })),
                  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
                  if (combined.length === 0) return <div className="py-10 text-center text-sm text-gray-400">No upcoming deadlines</div>;
                  return combined.map(item => (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={item.onClick}>
                      <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded border mt-0.5 shrink-0",
                        item.type === "request" ? "bg-violet-50 text-violet-700 border-violet-200" : (EVENT_COLORS[item.label.toLowerCase()] ?? EVENT_COLORS.custom)
                      )}>{item.label}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{item.title}</p>
                        <p className={cn("text-xs mt-0.5", item.isOverdue ? "text-red-600 font-semibold" : "text-gray-400")}>
                          {item.isOverdue ? "OVERDUE · " : ""}{fmtDate(item.dueDate)}
                        </p>
                      </div>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── CLIENTS TAB ── */}
      {tab === "clients" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{clients.length} clients total · {activeClients.length} active</p>
            <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={openNewClient}><Plus className="w-3.5 h-3.5 mr-1" />New Client</Button>
          </div>

          {clients.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-gray-300">
              <CardContent className="py-16 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-500 mb-1">No audit clients yet</p>
                <p className="text-xs text-gray-400 mb-4">Add client companies you audit or provide compliance services to</p>
                <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={openNewClient}><Plus className="w-3.5 h-3.5 mr-1" />Add First Client</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {clients.map((c: any) => {
                const engs: string[] = parseTags(c.engagementTypes ?? "[]");
                const clientTasks    = (allTasks as any[]).filter((t: any) => t.clientId === c.id);
                const openTasks      = clientTasks.filter((t: any) => !["completed","archived"].includes(t.status));
                const overdueTasks   = clientTasks.filter((t: any) => t.dueDate && t.dueDate < new Date().toISOString().split("T")[0] && !["completed","archived"].includes(t.status));
                const clientFindings = (allFindings as any[]).filter((f: any) => f.clientId === c.id);
                const openFindings   = clientFindings.filter((f: any) => ["open","in_progress"].includes(f.status));
                const phase          = c.engagementPhase ?? "planning";
                const phaseLabels: Record<string, string> = { planning:"Planning", fieldwork:"Fieldwork", review:"Review", reporting:"Reporting", closed:"Closed" };
                const phaseColors: Record<string, string> = { planning:"bg-blue-100 text-blue-700", fieldwork:"bg-amber-100 text-amber-700", review:"bg-violet-100 text-violet-700", reporting:"bg-emerald-100 text-emerald-700", closed:"bg-gray-100 text-gray-500" };
                const clientCollabOpen2 = allCollab.filter((r: any) => r.clientId === c.id && !["completed","cancelled"].includes(r.status));
                const hasOverdueCollab = clientCollabOpen2.some((r: any) => r.dueDate && r.dueDate < today);
                const health = (overdueTasks.length > 0 || hasOverdueCollab) ? "critical" : openFindings.length > 0 ? "warning" : "healthy";
                return (
                <Card key={c.id} className={cn("rounded-2xl hover:shadow-md transition-shadow flex flex-col",
                  health === "critical" ? "border-red-200 shadow-sm shadow-red-50" : health === "warning" ? "border-amber-200" : "border-gray-200")}>
                  <CardContent className="p-4 flex flex-col gap-3 h-full">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Link href={`/auditor/clients/${c.id}`}>
                            <p className="font-semibold text-gray-800 hover:text-violet-700 cursor-pointer truncate">{c.name}</p>
                          </Link>
                          {c.gstin && <p className="text-xs font-mono text-gray-400 mt-0.5 truncate">{c.gstin}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {health === "critical" && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />OVERDUE
                            </span>
                          )}
                          {health === "warning" && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">
                              <AlertTriangle className="w-2.5 h-2.5" />REVIEW
                            </span>
                          )}
                          {health === "healthy" && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400" title="All clear" />
                          )}
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>{c.status}</span>
                          <button title="Start from Template" onClick={() => openTemplateDlg(String(c.id))} className="p-1 rounded hover:bg-violet-50 text-gray-400 hover:text-violet-600"><Sparkles className="w-3.5 h-3.5" /></button>
                          <button title="Seed Compliance Calendar" onClick={() => openSeedDlg(String(c.id))} className="p-1 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600"><CalendarCog className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openEditClient(c)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => removeClient(c.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      {c.contactName && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3"/>{c.contactName}{c.contactPhone ? ` · ${c.contactPhone}` : ""}</p>}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", phaseColors[phase] ?? phaseColors.planning)}>⬤ {phaseLabels[phase] ?? phase}</span>
                        {engs.slice(0, 2).map(e => <span key={e} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full border border-violet-100">{e}</span>)}
                        {engs.length > 2 && <span className="text-xs text-gray-400">+{engs.length - 2}</span>}
                      </div>
                      <Separator />
                      {(() => {
                        const clientCollabOpen = allCollab.filter((r: any) => r.clientId === c.id && !["completed","cancelled"].includes(r.status));
                        return (
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div>
                              <p className="text-base font-bold text-gray-700">{openTasks.length}</p>
                              <p className="text-[10px] text-gray-400 leading-tight">Open tasks</p>
                            </div>
                            <div>
                              <p className={cn("text-base font-bold", overdueTasks.length > 0 ? "text-red-600" : "text-gray-700")}>{overdueTasks.length}</p>
                              <p className="text-[10px] text-gray-400 leading-tight">Overdue</p>
                            </div>
                            <div>
                              <p className={cn("text-base font-bold", openFindings.length > 0 ? "text-orange-600" : "text-gray-700")}>{openFindings.length}</p>
                              <p className="text-[10px] text-gray-400 leading-tight">Findings</p>
                            </div>
                            <div
                              className="cursor-pointer hover:opacity-75"
                              onClick={() => { setTab("collaboration"); }}>
                              <p className={cn("text-base font-bold", clientCollabOpen.length > 0 ? "text-violet-600" : "text-gray-700")}>{clientCollabOpen.length}</p>
                              <p className="text-[10px] text-gray-400 leading-tight">Requests</p>
                            </div>
                          </div>
                        );
                      })()}
                      <Link href={`/auditor/clients/${c.id}`} className="mt-auto">
                        <Button size="sm" variant="outline" className="w-full rounded-xl text-violet-700 border-violet-200 hover:bg-violet-50 hover:border-violet-300 text-xs h-8">
                          Open Client Workspace <ArrowUpRight className="w-3 h-3 ml-1"/>
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TASKS TAB ── */}
      {tab === "tasks" && (
        <div className="space-y-4">

          {/* ── filter + view toggle bar ── */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={taskFilter.clientId} onValueChange={v => setTaskFilter(f => ({ ...f, clientId: v }))}>
              <SelectTrigger className="h-8 w-44 rounded-lg text-xs"><SelectValue placeholder="All clients" /></SelectTrigger>
              <SelectContent><SelectItem value="">All clients</SelectItem>{clients.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={taskFilter.status} onValueChange={v => setTaskFilter(f => ({ ...f, status: v }))}>
              <SelectTrigger className="h-8 w-40 rounded-lg text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="">All statuses</SelectItem>{STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{STATUS_CFG[s].label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={taskFilter.priority} onValueChange={v => setTaskFilter(f => ({ ...f, priority: v }))}>
              <SelectTrigger className="h-8 w-36 rounded-lg text-xs"><SelectValue placeholder="All priorities" /></SelectTrigger>
              <SelectContent><SelectItem value="">All priorities</SelectItem>{Object.entries(PRIORITY_CFG).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
            {(taskFilter.clientId || taskFilter.status || taskFilter.priority) && (
              <button onClick={() => setTaskFilter({ clientId:"", status:"", priority:"" })} className="text-xs text-gray-400 hover:text-gray-700 underline">Clear</button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}</span>
              {/* view toggle */}
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
                {([["list", List, "List"], ["kanban", LayoutGrid, "Board"], ["table", Table2, "Table"]] as const).map(([v, Icon, label]) => (
                  <button key={v} onClick={() => { setTaskView(v); setSelectedTasks(new Set()); setTaskDetail(null); }}
                    className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                      taskView === v ? "bg-white shadow-sm text-violet-700 border border-gray-200" : "text-gray-500 hover:text-gray-700")}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>
              {taskView === "list" && (
                <button onClick={() => setQuickAdd(q => ({ ...q, open: !q.open }))}
                  className={cn("h-8 px-3 rounded-xl border text-xs font-medium flex items-center gap-1 transition-all",
                    quickAdd.open ? "bg-violet-50 border-violet-300 text-violet-700" : "border-gray-200 text-gray-600 hover:border-violet-200 hover:text-violet-600")}>
                  <Zap className="w-3.5 h-3.5" />Quick Add
                </button>
              )}
              <Button size="sm" variant="outline" className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 h-8" onClick={() => openTemplateDlg(taskFilter.clientId)}>
                <Sparkles className="w-3.5 h-3.5 mr-1" />From Template
              </Button>
              <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700 h-8" onClick={() => openNewTask(taskFilter.clientId)}>
                <Plus className="w-3.5 h-3.5 mr-1" />New Task
              </Button>
            </div>
          </div>

          {/* ── bulk action bar ── */}
          {selectedTasks.size > 0 && (
            <div className="flex items-center gap-3 bg-violet-600 text-white rounded-xl px-4 py-2.5 shadow-lg">
              <CheckSquare className="w-4 h-4 shrink-0" />
              <span className="text-sm font-semibold">{selectedTasks.size} task{selectedTasks.size !== 1 ? "s" : ""} selected</span>
              <div className="flex items-center gap-2 ml-4 flex-wrap">
                <span className="text-xs text-violet-200">Move to:</span>
                {STATUS_FLOW.filter(s => !["archived"].includes(s)).map(s => (
                  <button key={s} onClick={() => bulkSetStatus(s)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-medium transition-all">
                    {STATUS_CFG[s].label}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={bulkDelete} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/80 hover:bg-red-500 font-medium flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />Delete
                </button>
                <button onClick={() => setSelectedTasks(new Set())} className="text-xs px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-medium">
                  ✕ Clear
                </button>
              </div>
            </div>
          )}

          {/* ── quick-add row (list view) ── */}
          {taskView === "list" && quickAdd.open && (
            <div className="flex items-center gap-2 bg-violet-50/60 border border-violet-200 rounded-xl px-4 py-3">
              <Zap className="w-4 h-4 text-violet-500 shrink-0" />
              <Input value={quickAdd.title} onChange={e => setQuickAdd(q => ({ ...q, title: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && submitQuickAdd()}
                placeholder="Task title… (press Enter to create)" autoFocus
                className="h-8 text-xs rounded-lg flex-1 border-violet-200 focus-visible:ring-violet-400" />
              <Select value={quickAdd.clientId || taskFilter.clientId} onValueChange={v => setQuickAdd(q => ({ ...q, clientId: v }))}>
                <SelectTrigger className="h-8 w-36 rounded-lg text-xs border-violet-200"><SelectValue placeholder="Client" /></SelectTrigger>
                <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={quickAdd.priority} onValueChange={v => setQuickAdd(q => ({ ...q, priority: v }))}>
                <SelectTrigger className="h-8 w-28 rounded-lg text-xs border-violet-200"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PRIORITY_CFG).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={quickAdd.dueDate} onChange={e => setQuickAdd(q => ({ ...q, dueDate: e.target.value }))}
                className="h-8 w-36 text-xs rounded-lg border-violet-200" />
              <Button size="sm" className="h-8 rounded-lg bg-violet-600 hover:bg-violet-700 px-3" onClick={submitQuickAdd}>Add</Button>
              <button onClick={() => setQuickAdd(q => ({ ...q, open: false }))} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
          )}

          {/* ══════════════════════════ LIST VIEW ══════════════════════════ */}
          {taskView === "list" && (
            <div className={cn("grid gap-4", taskDetail ? "grid-cols-5" : "grid-cols-1")}>
              <div className={cn("space-y-2", taskDetail ? "col-span-3" : "")}>
                {/* select-all row */}
                {filteredTasks.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-gray-400">
                    <button onClick={toggleAllTasks} className="flex items-center gap-1.5 hover:text-gray-600">
                      {selectedTasks.size === filteredTasks.length && filteredTasks.length > 0
                        ? <CheckSquare className="w-3.5 h-3.5 text-violet-600" />
                        : <Square className="w-3.5 h-3.5" />}
                      {selectedTasks.size > 0 ? `${selectedTasks.size} selected` : "Select all"}
                    </button>
                  </div>
                )}
                {filteredTasks.length === 0 ? (
                  <Card className="rounded-2xl border-dashed border-gray-300">
                    <CardContent className="py-14 text-center">
                      <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-500 mb-3">No tasks match your filters</p>
                      <Button size="sm" className="rounded-xl" onClick={() => openNewTask()}><Plus className="w-3.5 h-3.5 mr-1" />Create Task</Button>
                    </CardContent>
                  </Card>
                ) : filteredTasks.map((t: any) => {
                  const isOverdue = t.dueDate && t.dueDate < today && !["completed","archived"].includes(t.status);
                  const isFocused = taskDetail?.id === t.id;
                  const isBulkSel = selectedTasks.has(t.id);
                  return (
                    <div key={t.id}
                      onClick={() => setTaskDetail(isFocused ? null : t)}
                      className={cn("border rounded-xl px-4 py-3 cursor-pointer transition-all hover:shadow-sm",
                        isFocused ? "border-violet-300 bg-violet-50/40" : isBulkSel ? "border-violet-200 bg-violet-50/20" : "border-gray-200 bg-white hover:border-gray-300",
                        isOverdue && "border-red-200 bg-red-50/30")}>
                      <div className="flex items-start gap-3">
                        <button onClick={e => { e.stopPropagation(); toggleTaskSel(t.id); }} className="mt-0.5 shrink-0">
                          {isBulkSel ? <CheckSquare className="w-4 h-4 text-violet-600" /> : <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                            {isOverdue && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Overdue</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{t.clientName ?? `Client #${t.clientId}`} · {TASK_TYPE_LABELS[t.taskType] ?? t.taskType}</p>
                          {t.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{t.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.dueDate && <span className={cn("text-xs", isOverdue ? "text-red-600 font-semibold" : "text-gray-400")}>{fmtDate(t.dueDate)}</span>}
                          <PriorityBadge priority={t.priority} />
                          <StatusBadge status={t.status} />
                          <div className="flex gap-1">
                            <button onClick={e => { e.stopPropagation(); openEditTask(t); }} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={e => { e.stopPropagation(); removeTask(t.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* detail panel */}
              {taskDetail && (
                <div className="col-span-2">
                  <Card className="rounded-2xl border-gray-200 sticky top-4">
                    <CardHeader className="pb-3 border-b border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-gray-800 leading-snug">{taskDetail.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{taskDetail.clientName}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEditTask(taskDetail)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setTaskDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={taskDetail.status} />
                        <PriorityBadge priority={taskDetail.priority} />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Move Status</p>
                        <div className="flex gap-2">
                          <button onClick={() => moveStatus(taskDetail, -1)} disabled={STATUS_FLOW.indexOf(taskDetail.status) === 0}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1">
                            <ChevronLeft className="w-3 h-3" />Back
                          </button>
                          <button onClick={() => moveStatus(taskDetail, 1)} disabled={STATUS_FLOW.indexOf(taskDetail.status) === STATUS_FLOW.length - 1}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 disabled:opacity-40 flex items-center gap-1">
                            Advance<ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {taskDetail.instructions && (
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Instructions</p>
                          <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 leading-relaxed">{taskDetail.instructions}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div><span className="font-semibold text-gray-600">Due</span><br/>{fmtDate(taskDetail.dueDate)}</div>
                        <div><span className="font-semibold text-gray-600">Assignee</span><br/>{taskDetail.assignee || "—"}</div>
                        <div><span className="font-semibold text-gray-600">Type</span><br/>{TASK_TYPE_LABELS[taskDetail.taskType]}</div>
                        <div><span className="font-semibold text-gray-600">Created</span><br/>{fmtDate(taskDetail.createdAt)}</div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Comments ({(taskDetail.comments ?? []).length})</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {(taskDetail.comments ?? []).map((c: any) => (
                            <div key={c.id} className={cn("rounded-lg px-3 py-2 text-xs", c.authorType === "auditor" ? "bg-violet-50 border border-violet-100" : "bg-gray-50 border border-gray-100")}>
                              <p className="font-semibold text-gray-700 mb-0.5">{c.author} <span className="text-gray-400 font-normal">· {fmtDate(c.createdAt)}</span></p>
                              <p className="text-gray-600">{c.message}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input value={commentMsg} onChange={e => setCommentMsg(e.target.value)} placeholder="Add comment…" className="h-8 text-xs rounded-lg flex-1"
                            onKeyDown={e => e.key === "Enter" && sendComment(taskDetail.id)} />
                          <Button size="sm" className="h-8 rounded-lg bg-violet-600 hover:bg-violet-700 px-3" onClick={() => sendComment(taskDetail.id)}>
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════ KANBAN VIEW ══════════════════════════ */}
          {taskView === "kanban" && (
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
              {STATUS_FLOW.map(status => {
                const col = filteredTasks.filter((t: any) => t.status === status);
                const cfg = KANBAN_COL_CFG[status] ?? KANBAN_COL_CFG.created;
                const isAddingHere = kanbanAdd?.status === status;
                return (
                  <div key={status} className="flex-shrink-0 w-72 flex flex-col">
                    {/* column header */}
                    <div className={cn("rounded-xl border px-3 py-2 mb-2 flex items-center justify-between", cfg.bg, cfg.border)}>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                        <span className={cn("text-xs font-bold", cfg.text)}>{STATUS_CFG[status].label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-xs rounded-full px-1.5 py-0.5 font-bold bg-white/70 border", cfg.border, cfg.text)}>{col.length}</span>
                        <button onClick={() => setKanbanAdd(isAddingHere ? null : { status, title: "" })}
                          className={cn("p-0.5 rounded hover:bg-white/60 transition-all", cfg.text)}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {/* inline quick-add */}
                    {isAddingHere && (
                      <div className="mb-2 bg-white border border-violet-200 rounded-xl p-2.5 shadow-sm space-y-2">
                        <Input value={kanbanAdd.title} onChange={e => setKanbanAdd(k => k ? { ...k, title: e.target.value } : k)}
                          onKeyDown={e => { if (e.key === "Enter") submitKanbanAdd(status); if (e.key === "Escape") setKanbanAdd(null); }}
                          placeholder="Task title… (Enter to add)" autoFocus className="h-7 text-xs rounded-lg" />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setKanbanAdd(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2">Cancel</button>
                          <button onClick={() => submitKanbanAdd(status)} className="text-xs bg-violet-600 text-white px-3 py-1 rounded-lg hover:bg-violet-700">Add</button>
                        </div>
                      </div>
                    )}
                    {/* task cards */}
                    <div className="flex-1 space-y-2 min-h-16">
                      {col.length === 0 && !isAddingHere && (
                        <div className="border border-dashed border-gray-200 rounded-xl py-6 text-center">
                          <p className="text-xs text-gray-300">No tasks</p>
                        </div>
                      )}
                      {col.map((t: any) => {
                        const isOverdue = t.dueDate && t.dueDate < today && !["completed","archived"].includes(t.status);
                        const isFocused = taskDetail?.id === t.id;
                        return (
                          <div key={t.id}
                            onClick={() => setTaskDetail(isFocused ? null : t)}
                            className={cn("bg-white border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group",
                              isFocused ? "border-violet-400 shadow-md ring-1 ring-violet-200" : "border-gray-200 hover:border-gray-300",
                              isOverdue && "border-red-200 bg-red-50/20")}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="text-xs font-semibold text-gray-800 leading-snug flex-1 line-clamp-2">{t.title}</p>
                              {isOverdue && <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded-full font-bold uppercase shrink-0">OD</span>}
                            </div>
                            <p className="text-[11px] text-gray-400 mb-2 truncate">{t.clientName ?? `Client #${t.clientId}`}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <PriorityBadge priority={t.priority} />
                              {t.dueDate && <span className={cn("text-[10px]", isOverdue ? "text-red-600 font-semibold" : "text-gray-400")}>{fmtDate(t.dueDate)}</span>}
                            </div>
                            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              <button onClick={e => { e.stopPropagation(); moveStatus(t, -1); }} disabled={STATUS_FLOW.indexOf(t.status) === 0}
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button onClick={e => { e.stopPropagation(); moveStatus(t, 1); }} disabled={STATUS_FLOW.indexOf(t.status) === STATUS_FLOW.length - 1}
                                className="p-1 rounded hover:bg-violet-50 text-gray-400 hover:text-violet-600 disabled:opacity-30">
                                <ChevronRight className="w-3 h-3" />
                              </button>
                              <button onClick={e => { e.stopPropagation(); openEditTask(t); }} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════ TABLE VIEW ══════════════════════════ */}
          {taskView === "table" && (
            <div className={cn("grid gap-4", taskDetail ? "grid-cols-5" : "grid-cols-1")}>
              <div className={cn(taskDetail ? "col-span-3" : "")}>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="w-8 px-3 py-2.5">
                          <button onClick={toggleAllTasks}>
                            {selectedTasks.size === filteredTasks.length && filteredTasks.length > 0
                              ? <CheckSquare className="w-3.5 h-3.5 text-violet-600" />
                              : <Square className="w-3.5 h-3.5 text-gray-300" />}
                          </button>
                        </th>
                        {([["title","Task"], ["clientName","Client"], ["taskType","Type"], ["priority","Priority"], ["dueDate","Due"], ["status","Status"], ["assignee","Assignee"]] as const).map(([col, label]) => (
                          <th key={col} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none"
                            onClick={() => setTableSort(s => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }))}>
                            <div className="flex items-center gap-1">
                              {label}
                              {tableSort.col === col ? (tableSort.dir === "asc" ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />) : <Minus className="w-3 h-3 opacity-30" />}
                            </div>
                          </th>
                        ))}
                        <th className="px-3 py-2.5 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTasks.length === 0 ? (
                        <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">No tasks match your filters</td></tr>
                      ) : sortedTasks.map((t: any) => {
                        const isOverdue = t.dueDate && t.dueDate < today && !["completed","archived"].includes(t.status);
                        const isFocused = taskDetail?.id === t.id;
                        const isBulkSel = selectedTasks.has(t.id);
                        return (
                          <tr key={t.id} onClick={() => setTaskDetail(isFocused ? null : t)}
                            className={cn("border-b border-gray-100 cursor-pointer transition-colors",
                              isFocused ? "bg-violet-50" : isBulkSel ? "bg-violet-50/40" : isOverdue ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-gray-50/70")}>
                            <td className="px-3 py-2.5">
                              <button onClick={e => { e.stopPropagation(); toggleTaskSel(t.id); }}>
                                {isBulkSel ? <CheckSquare className="w-3.5 h-3.5 text-violet-600" /> : <Square className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />}
                              </button>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-gray-800 line-clamp-1">{t.title}</span>
                                {isOverdue && <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded-full font-bold uppercase shrink-0">OD</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-gray-500 truncate max-w-[120px]">{t.clientName ?? `#${t.clientId}`}</td>
                            <td className="px-3 py-2.5 text-gray-400">{TASK_TYPE_LABELS[t.taskType] ?? t.taskType}</td>
                            <td className="px-3 py-2.5"><PriorityBadge priority={t.priority} /></td>
                            <td className={cn("px-3 py-2.5 font-medium", isOverdue ? "text-red-600" : "text-gray-500")}>{fmtDate(t.dueDate)}</td>
                            <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                            <td className="px-3 py-2.5 text-gray-400">{t.assignee || <span className="text-gray-300">—</span>}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                <button onClick={e => { e.stopPropagation(); openEditTask(t); }} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="w-3 h-3" /></button>
                                <button onClick={e => { e.stopPropagation(); removeTask(t.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* detail panel (shared) */}
              {taskDetail && (
                <div className="col-span-2">
                  <Card className="rounded-2xl border-gray-200 sticky top-4">
                    <CardHeader className="pb-3 border-b border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-gray-800 leading-snug">{taskDetail.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{taskDetail.clientName}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEditTask(taskDetail)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setTaskDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={taskDetail.status} />
                        <PriorityBadge priority={taskDetail.priority} />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Move Status</p>
                        <div className="flex gap-2">
                          <button onClick={() => moveStatus(taskDetail, -1)} disabled={STATUS_FLOW.indexOf(taskDetail.status) === 0}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1">
                            <ChevronLeft className="w-3 h-3" />Back
                          </button>
                          <button onClick={() => moveStatus(taskDetail, 1)} disabled={STATUS_FLOW.indexOf(taskDetail.status) === STATUS_FLOW.length - 1}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 disabled:opacity-40 flex items-center gap-1">
                            Advance<ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {taskDetail.instructions && (
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Instructions</p>
                          <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 leading-relaxed">{taskDetail.instructions}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div><span className="font-semibold text-gray-600">Due</span><br/>{fmtDate(taskDetail.dueDate)}</div>
                        <div><span className="font-semibold text-gray-600">Assignee</span><br/>{taskDetail.assignee || "—"}</div>
                        <div><span className="font-semibold text-gray-600">Type</span><br/>{TASK_TYPE_LABELS[taskDetail.taskType]}</div>
                        <div><span className="font-semibold text-gray-600">Created</span><br/>{fmtDate(taskDetail.createdAt)}</div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Comments ({(taskDetail.comments ?? []).length})</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {(taskDetail.comments ?? []).map((c: any) => (
                            <div key={c.id} className={cn("rounded-lg px-3 py-2 text-xs", c.authorType === "auditor" ? "bg-violet-50 border border-violet-100" : "bg-gray-50 border border-gray-100")}>
                              <p className="font-semibold text-gray-700 mb-0.5">{c.author} <span className="text-gray-400 font-normal">· {fmtDate(c.createdAt)}</span></p>
                              <p className="text-gray-600">{c.message}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input value={commentMsg} onChange={e => setCommentMsg(e.target.value)} placeholder="Add comment…" className="h-8 text-xs rounded-lg flex-1"
                            onKeyDown={e => e.key === "Enter" && sendComment(taskDetail.id)} />
                          <Button size="sm" className="h-8 rounded-lg bg-violet-600 hover:bg-violet-700 px-3" onClick={() => sendComment(taskDetail.id)}>
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* kanban detail panel floats below board */}
          {taskView === "kanban" && taskDetail && (
            <Card className="rounded-2xl border-gray-200 mt-2">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-gray-800 leading-snug">{taskDetail.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{taskDetail.clientName} · <StatusBadge status={taskDetail.status} /></p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditTask(taskDetail)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setTaskDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-3 gap-6 text-sm">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Move Status</p>
                  <div className="flex gap-2">
                    <button onClick={() => moveStatus(taskDetail, -1)} disabled={STATUS_FLOW.indexOf(taskDetail.status) === 0}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1">
                      <ChevronLeft className="w-3 h-3" />Back
                    </button>
                    <button onClick={() => moveStatus(taskDetail, 1)} disabled={STATUS_FLOW.indexOf(taskDetail.status) === STATUS_FLOW.length - 1}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 disabled:opacity-40 flex items-center gap-1">
                      Advance<ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {taskDetail.instructions && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Instructions</p>
                      <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 leading-relaxed">{taskDetail.instructions}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div><span className="font-semibold text-gray-600">Due</span><br/>{fmtDate(taskDetail.dueDate)}</div>
                    <div><span className="font-semibold text-gray-600">Priority</span><br/><PriorityBadge priority={taskDetail.priority} /></div>
                    <div><span className="font-semibold text-gray-600">Type</span><br/>{TASK_TYPE_LABELS[taskDetail.taskType]}</div>
                    <div><span className="font-semibold text-gray-600">Assignee</span><br/>{taskDetail.assignee || "—"}</div>
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Comments ({(taskDetail.comments ?? []).length})</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto mb-2">
                    {(taskDetail.comments ?? []).map((c: any) => (
                      <div key={c.id} className={cn("rounded-lg px-3 py-2 text-xs", c.authorType === "auditor" ? "bg-violet-50 border border-violet-100" : "bg-gray-50 border border-gray-100")}>
                        <p className="font-semibold text-gray-700 mb-0.5">{c.author} <span className="text-gray-400 font-normal">· {fmtDate(c.createdAt)}</span></p>
                        <p className="text-gray-600">{c.message}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={commentMsg} onChange={e => setCommentMsg(e.target.value)} placeholder="Add comment…" className="h-8 text-xs rounded-lg flex-1"
                      onKeyDown={e => e.key === "Enter" && sendComment(taskDetail.id)} />
                    <Button size="sm" className="h-8 rounded-lg bg-violet-600 hover:bg-violet-700 px-3" onClick={() => sendComment(taskDetail.id)}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── COMPLIANCE CALENDAR TAB ── */}
      {tab === "calendar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { const d = new Date(calMonth + "-01"); d.setMonth(d.getMonth()-1); setCalMonth(d.toISOString().slice(0,7)); }} className="p-1.5 rounded-lg border hover:bg-gray-50"><ChevronLeft className="w-4 h-4"/></button>
              <p className="font-semibold text-gray-800 w-32 text-center">{new Date(calMonth + "-01").toLocaleDateString("en-IN", { month:"long", year:"numeric" })}</p>
              <button onClick={() => { const d = new Date(calMonth + "-01"); d.setMonth(d.getMonth()+1); setCalMonth(d.toISOString().slice(0,7)); }} className="p-1.5 rounded-lg border hover:bg-gray-50"><ChevronRight className="w-4 h-4"/></button>
            </div>
            <div className="flex items-center gap-2">
              {/* view toggle */}
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
                {([["calendar", CalendarDays, "Calendar"], ["timeline", GanttChart, "Timeline"]] as const).map(([v, Icon, label]) => (
                  <button key={v} onClick={() => setCalView(v)}
                    className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                      calView === v ? "bg-white shadow-sm text-violet-700 border border-gray-200" : "text-gray-500 hover:text-gray-700")}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50" onClick={() => openSeedDlg()}>
                <CalendarCog className="w-3.5 h-3.5 mr-1" />Seed Calendar
              </Button>
              <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={() => setEventDlg({ open: true, form: emptyEvent })}><Plus className="w-3.5 h-3.5 mr-1" />Add Event</Button>
            </div>
          </div>

          {/* ══ TIMELINE VIEW ══ */}
          {calView === "timeline" && (() => {
            const allEvents = (events as any[]).filter((e: any) => e.dueDate);
            const allRequests = (allCollab as any[]).filter((r: any) => r.dueDate && !["completed","cancelled"].includes(r.status));
            const combined = [
              ...allEvents.map((e: any) => ({
                id: `e-${e.id}`, date: e.dueDate, type: "event", subtype: e.eventType,
                label: (EVENT_TYPES.find((x: any) => x.value === e.eventType)?.label ?? e.eventType).toUpperCase(),
                title: e.title, client: e.clientName ?? "",
                status: e.status, isOverdue: e.dueDate < today && e.status === "pending",
                colorCls: EVENT_COLORS[e.eventType] ?? EVENT_COLORS.custom,
              })),
              ...allRequests.map((r: any) => ({
                id: `r-${r.id}`, date: r.dueDate, type: "request", subtype: "req",
                label: "REQ", title: r.title, client: r.clientName ?? `Client #${r.clientId}`,
                status: r.status, isOverdue: r.dueDate < today,
                colorCls: "bg-violet-50 text-violet-700 border-violet-200",
              })),
            ].sort((a, b) => a.date.localeCompare(b.date));

            const grouped = combined.reduce<Record<string, typeof combined>>((acc, item) => {
              (acc[item.date] ??= []).push(item); return acc;
            }, {});

            if (combined.length === 0) return (
              <Card className="rounded-2xl border-dashed border-gray-300">
                <CardContent className="py-12 text-center">
                  <CalendarRange className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500 mb-3">No events or deadlines yet</p>
                  <Button size="sm" className="rounded-xl" onClick={() => setEventDlg({ open: true, form: emptyEvent })}><Plus className="w-3.5 h-3.5 mr-1" />Add Event</Button>
                </CardContent>
              </Card>
            );

            return (
              <div className="relative space-y-0 pl-6">
                {/* vertical spine */}
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-violet-200 via-gray-200 to-transparent rounded-full" />
                {Object.entries(grouped).map(([date, items], gi) => {
                  const isPast = date < today;
                  const isToday = date === today;
                  return (
                    <div key={date} className="relative pb-6">
                      {/* dot on spine */}
                      <div className={cn("absolute -left-6 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        isToday ? "border-violet-500 bg-violet-100" : isPast ? "border-gray-300 bg-gray-100" : "border-violet-300 bg-white")}>
                        {isToday && <span className="w-2 h-2 rounded-full bg-violet-500" />}
                      </div>
                      {/* date label */}
                      <div className="flex items-center gap-2 mb-2 -ml-0.5">
                        <p className={cn("text-xs font-bold", isToday ? "text-violet-700" : isPast ? "text-gray-400" : "text-gray-700")}>
                          {isToday ? "Today — " : ""}{new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday:"short", day:"2-digit", month:"short", year:"numeric" })}
                        </p>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                          isPast ? "bg-gray-100 text-gray-500" : "bg-violet-50 text-violet-600")}>
                          {isPast ? "Past" : "Upcoming"}
                        </span>
                      </div>
                      {/* items for this date */}
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} onClick={() => item.type === "request" ? setTab("collaboration") : undefined}
                            className={cn("flex items-center gap-3 border rounded-xl px-4 py-3 bg-white hover:shadow-sm transition-all",
                              item.isOverdue ? "border-red-200 bg-red-50/20" : "border-gray-200",
                              item.type === "request" && "cursor-pointer")}>
                            <span className={cn("text-xs font-bold px-2 py-1 rounded-lg border shrink-0", item.colorCls)}>{item.label}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                              {item.client && <p className="text-xs text-gray-400">{item.client}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.isOverdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Overdue</span>}
                              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                                item.status === "filed" || item.status === "completed" ? "bg-green-100 text-green-700"
                                  : item.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ══ CALENDAR VIEW ══ */}
          {calView === "calendar" && (() => {
            const monthEvents   = (events as any[]).filter((e: any) => e.dueDate.startsWith(calMonth));
            const monthRequests = allCollab.filter((r: any) => r.dueDate?.startsWith(calMonth) && !["completed","cancelled"].includes(r.status));
            return (
              <div className="space-y-3">
                {/* Collaboration request deadlines */}
                {monthRequests.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-violet-500" />Collaboration Request Deadlines
                    </p>
                    <div className="space-y-2">
                      {monthRequests.map((r: any) => {
                        const isOverdue = r.dueDate < today;
                        const sc = COLLAB_STATUS_CFG[r.status] ?? COLLAB_STATUS_CFG.pending;
                        return (
                          <div key={r.id} className={cn("flex items-center gap-3 border rounded-xl px-4 py-3 bg-white hover:shadow-sm transition-all cursor-pointer", isOverdue && "border-red-200 bg-red-50/30")} onClick={() => setTab("collaboration")}>
                            <span className="text-xs font-bold px-2 py-1 rounded-lg border bg-violet-50 text-violet-700 border-violet-200 shrink-0">REQ</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800">{r.title}</p>
                              <p className="text-xs text-gray-400">{r.clientName ?? `Client #${r.clientId}`} · Due: {fmtDate(r.dueDate)}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Overdue</span>}
                              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1", sc.badge)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />{sc.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Compliance events */}
                {monthEvents.length === 0 && monthRequests.length === 0 ? (
                  <Card className="rounded-2xl border-dashed border-gray-300">
                    <CardContent className="py-12 text-center">
                      <CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-500 mb-3">No events or request deadlines for this month</p>
                      <Button size="sm" className="rounded-xl" onClick={() => setEventDlg({ open: true, form: { ...emptyEvent, dueDate: calMonth + "-20" } })}><Plus className="w-3.5 h-3.5 mr-1" />Add Event</Button>
                    </CardContent>
                  </Card>
                ) : monthEvents.length > 0 ? (
                  <div>
                    {monthRequests.length > 0 && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-amber-500" />Compliance Events</p>}
                    <div className="space-y-2">
                {monthEvents.map((e: any) => {
                  const isOverdue = e.dueDate < today && e.status === "pending";
                  return (
                    <div key={e.id} className={cn("flex items-center gap-3 border rounded-xl px-4 py-3 bg-white hover:shadow-sm transition-all", isOverdue && "border-red-200 bg-red-50/30")}>
                      <span className={cn("text-xs font-bold px-2 py-1 rounded-lg border shrink-0", EVENT_COLORS[e.eventType] ?? EVENT_COLORS.custom)}>
                        {(EVENT_TYPES.find(x => x.value === e.eventType)?.label ?? e.eventType).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{e.title}</p>
                        <p className="text-xs text-gray-400">{e.clientName ? `${e.clientName} · ` : ""}{e.period ? `Period: ${e.period} · ` : ""}Due: {fmtDate(e.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Overdue</span>}
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                          e.status === "filed" ? "bg-green-100 text-green-700" : e.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                          {e.status}
                        </span>
                        <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg"
                          onClick={() => { if (e.status !== "filed") updateEvent.mutate({ id: e.id, data: { ...e, status:"filed", filedDate: today } } as any, { onSuccess: () => { toast({ title:"Marked as filed" }); invalidate(); } }); }}>
                          {e.status === "filed" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600"/> : "Mark Filed"}
                        </Button>
                        <button onClick={() => setEventDlg({ open:true, edit:e, form:{ clientId:String(e.clientId??""), eventType:e.eventType, title:e.title, period:e.period??"", dueDate:e.dueDate, notes:e.notes??"" } })} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                  );
                })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── DOCUMENT PACKAGES TAB ── */}
      {tab === "packages" && (
        <div className="flex gap-4 -mt-2">
          {/* filter sidebar */}
          <aside className="w-60 border-r border-gray-100 pr-4 space-y-4 shrink-0">
            <div>
              <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-3 text-sm"><Filter className="w-4 h-4 text-violet-600"/>Package Filters</h2>
              <div className="space-y-3">
                <div><Label className="text-xs text-gray-500">Financial Year</Label>
                  <Select value={fy} onValueChange={setFy}><SelectTrigger className="mt-1 h-8 rounded-lg"><SelectValue/></SelectTrigger>
                    <SelectContent>{FY_OPTIONS.map(f=><SelectItem key={f} value={f}>FY {f}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs text-gray-500">GST Period</Label>
                  <Select value={period} onValueChange={setPeriod}><SelectTrigger className="mt-1 h-8 rounded-lg"><SelectValue placeholder="All periods"/></SelectTrigger>
                    <SelectContent><SelectItem value="">All periods</SelectItem>{Object.entries(MONTHS).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs text-gray-500">Customer</Label>
                  <Select value={customer} onValueChange={setCust}>
                    <SelectTrigger className="mt-1 h-8 rounded-lg"><SelectValue placeholder="All customers"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All customers</SelectItem>
                      {(allCustomers as any[]).map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs text-gray-500">Vendor</Label>
                  <Select value={vendor} onValueChange={setVendor}>
                    <SelectTrigger className="mt-1 h-8 rounded-lg"><SelectValue placeholder="All vendors"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All vendors</SelectItem>
                      {(allVendors as any[]).map((v: any) => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full rounded-xl" size="sm" onClick={()=>{ setApplied(true); refetchPkg(); }}><Search className="w-3.5 h-3.5 mr-1.5"/>Build Package</Button>
                {applied && <Button variant="ghost" size="sm" className="w-full text-gray-400 rounded-xl" onClick={()=>{ setApplied(false); setFy("2025-26"); setPeriod(""); setCust(""); setVendor(""); setSelDocs(new Set()); setSelInv(new Set()); setSelBill(new Set()); }}>Clear Filters</Button>}
              </div>
            </div>
            <Separator/>
            {pkg && (<div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Package Contents</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Documents</span><span>{pkg.summary?.docCount??0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Invoices</span><span>{pkg.summary?.invoiceCount??0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Bills</span><span>{pkg.summary?.billCount??0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Size</span><span>{fmtSize(pkg.summary?.totalSize??0)}</span></div>
              </div>
            </div>)}
            <Separator/>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Export</p>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start rounded-xl" onClick={()=>handleDownload("zip")}><FileArchive className="w-4 h-4 mr-2 text-orange-500"/>ZIP{totalSelected>0&&<Badge className="ml-auto text-xs">{totalSelected}</Badge>}</Button>
                <Button variant="outline" size="sm" className="w-full justify-start rounded-xl" onClick={()=>handleDownload("pdf")}><FileText className="w-4 h-4 mr-2 text-red-500"/>PDF Bundle{totalSelected>0&&<Badge className="ml-auto text-xs">{totalSelected}</Badge>}</Button>
                <Button size="sm" className="w-full justify-start rounded-xl bg-violet-600 hover:bg-violet-700" onClick={()=>setEmailOpen(true)}><Mail className="w-4 h-4 mr-2"/>Email to Auditor</Button>
              </div>
            </div>
          </aside>

          {/* main content */}
          <div className="flex-1 space-y-4">
            {totalSelected > 0 && (
              <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-violet-600"/><span className="text-sm font-medium text-violet-700">{totalSelected} records selected</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={()=>handleDownload("zip")}><FileArchive className="w-3.5 h-3.5 mr-1"/>ZIP</Button>
                  <Button size="sm" className="rounded-lg bg-violet-600 hover:bg-violet-700" onClick={()=>setEmailOpen(true)}><Mail className="w-3.5 h-3.5 mr-1"/>Email</Button>
                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={()=>{setSelDocs(new Set());setSelInv(new Set());setSelBill(new Set());}}>Clear</Button>
                </div>
              </div>
            )}
            {/* Documents */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2"><FolderOpen className="w-4 h-4 text-violet-600"/>Documents<Badge variant="outline">{pkg?.summary?.docCount??0}</Badge></CardTitle>
                <button onClick={()=>{ if(selDocs.size===(pkg?.docs?.length??0)&&(pkg?.docs?.length??0)>0)setSelDocs(new Set()); else setSelDocs(new Set(pkg?.docs?.map((d:any)=>d.id)??[])); }} className="text-xs text-violet-600 hover:underline">{selDocs.size===(pkg?.docs?.length??0)&&(pkg?.docs?.length??0)>0?"Deselect all":"Select all"}</button>
              </CardHeader>
              <CardContent className="p-0">
                {(!pkg?.docs||pkg.docs.length===0) ? <div className="py-10 text-center text-sm text-gray-400"><FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30"/>{applied?"No documents match":"Apply filters to build package"}</div>
                : <div className="divide-y">{pkg.docs.map((doc:any)=>(
                  <div key={doc.id} className={cn("flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50",selDocs.has(doc.id)&&"bg-violet-50/40")}>
                    <button onClick={()=>{const s=new Set(selDocs);s.has(doc.id)?s.delete(doc.id):s.add(doc.id);setSelDocs(s);}}>
                      {selDocs.has(doc.id)?<CheckSquare className="w-4 h-4 text-violet-600"/>:<Square className="w-4 h-4 text-gray-300"/>}
                    </button>
                    <FileText className="w-4 h-4 text-red-400 shrink-0"/><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{doc.name}</p><p className="text-xs text-gray-400">{fmtSize(doc.sizeBytes)} · {fmtDate(doc.createdAt)}</p></div>
                    <Badge className={cn("text-xs",CAT_COLORS[doc.docCategory]??CAT_COLORS.supporting)}>{CAT_LABELS[doc.docCategory]??doc.docCategory}</Badge>
                  </div>))}</div>}
              </CardContent>
            </Card>
            {/* Invoices + Bills */}
            <div className="grid grid-cols-2 gap-4">
              {[{label:"Sales Invoices",items:pkg?.invoices??[],sel:selInv,setSel:setSelInv,color:"text-blue-500"},{label:"Vendor Bills",items:pkg?.bills??[],sel:selBill,setSel:setSelBill,color:"text-purple-500"}].map(({label,items,sel,setSel,color})=>(
                <Card key={label} className="rounded-2xl border-gray-200">
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-gray-100">
                    <CardTitle className={cn("text-sm font-bold text-gray-700 flex items-center gap-2")}><FileCheck className={cn("w-4 h-4",color)}/>{label}<Badge variant="outline">{items.length}</Badge></CardTitle>
                    <button onClick={()=>{const all=new Set<number>(items.map((x:any)=>x.id as number));setSel(sel.size===all.size?new Set<number>():all);}} className="text-xs text-violet-600 hover:underline">{sel.size===items.length&&items.length>0?"Deselect":"Select all"}</button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {items.length===0?<div className="py-8 text-center text-xs text-gray-400">No records match</div>
                    :<div className="divide-y max-h-52 overflow-y-auto">{items.map((it:any)=>(
                      <div key={it.id} className={cn("flex items-center gap-2 px-3 py-2 hover:bg-gray-50",sel.has(it.id)&&"bg-violet-50/30")}>
                        <button onClick={()=>{const s=new Set(sel);s.has(it.id)?s.delete(it.id):s.add(it.id);setSel(s);}}>
                          {sel.has(it.id)?<CheckSquare className="w-3.5 h-3.5 text-violet-600"/>:<Square className="w-3.5 h-3.5 text-gray-300"/>}
                        </button>
                        <div className="flex-1 min-w-0"><p className="text-xs font-medium">{it.ref}</p><p className="text-xs text-gray-400 truncate">{it.party}</p></div>
                        <div className="text-right"><p className="text-xs font-semibold">{inrK(it.amount)}</p><p className="text-xs text-gray-400">{fmtDate(it.date)}</p></div>
                      </div>))}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Sharing history */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400"/>Sharing History<Badge variant="outline">{(shares as any[]).length}</Badge></CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(shares as any[]).length===0?<div className="py-10 text-center text-sm text-gray-400">No shares yet</div>
                :<div className="overflow-x-auto"><table className="w-full text-xs">
                  <thead><tr className="border-b bg-gray-50 text-gray-500 uppercase"><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Type</th><th className="text-left px-4 py-2">Recipient</th><th className="text-left px-4 py-2">FY</th><th className="text-left px-4 py-2">Records</th><th className="text-left px-4 py-2">Status</th></tr></thead>
                  <tbody>{(shares as any[]).map((s:any)=>(
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                      <td className="px-4 py-2.5"><span className={cn("px-2 py-0.5 rounded-full font-medium",s.shareType==="email"?"bg-blue-100 text-blue-700":"bg-orange-100 text-orange-700")}>{s.shareType}</span></td>
                      <td className="px-4 py-2.5 text-gray-600">{s.recipientEmail??"-"}</td>
                      <td className="px-4 py-2.5 text-gray-400">{s.filterFY??"-"}</td>
                      <td className="px-4 py-2.5 font-medium">{s.docCount}</td>
                      <td className="px-4 py-2.5"><span className={cn("px-2 py-0.5 rounded-full font-medium",s.status==="sent"?"bg-green-100 text-green-700":"bg-red-100 text-red-700")}>{s.status}</span></td>
                    </tr>))}</tbody>
                </table></div>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── FINDINGS TAB ── */}
      {tab === "findings" && (() => {
        const findings: any[] = allFindings as any[];
        const filtered = findings.filter(f =>
          (!findingFilter.clientId || String(f.clientId) === findingFilter.clientId) &&
          (!findingFilter.status   || f.status === findingFilter.status) &&
          (!findingFilter.severity || f.severity === findingFilter.severity) &&
          (!findingFilter.category || f.category === findingFilter.category) &&
          (!findingSearch || f.title.toLowerCase().includes(findingSearch.toLowerCase()) || (f.description ?? "").toLowerCase().includes(findingSearch.toLowerCase()))
        );
        const openCount     = findings.filter(f => f.status === "open").length;
        const criticalCount = findings.filter(f => f.severity === "critical").length;
        const highCount     = findings.filter(f => f.severity === "high").length;
        const resolvedCount = findings.filter(f => ["resolved","closed"].includes(f.status)).length;

        return (
          <div className="space-y-5">
            {/* KPI row */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Findings", value: findings.length, sub: "all time", color: "text-gray-800", bg: "bg-gray-50 border-gray-100" },
                { label: "Open",           value: openCount,       sub: "need attention", color: "text-red-600", bg: "bg-red-50 border-red-100" },
                { label: "Critical / High",value: `${criticalCount} / ${highCount}`, sub: "by severity", color: "text-orange-600", bg: "bg-orange-50 border-orange-100" },
                { label: "Resolved",       value: resolvedCount,   sub: "closed out", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
              ].map(k => (
                <div key={k.label} className={`rounded-xl border px-5 py-4 ${k.bg}`}>
                  <p className="text-xs text-gray-500 font-medium mb-1">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Filters bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 flex-1 max-w-xs shadow-sm">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input value={findingSearch} onChange={e => setFindingSearch(e.target.value)}
                  placeholder="Search findings…"
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent" />
              </div>
              <Select value={findingFilter.clientId} onValueChange={v => setFindingFilter(f => ({ ...f, clientId: v }))}>
                <SelectTrigger className="w-44 h-9 text-sm rounded-xl"><SelectValue placeholder="All Clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Clients</SelectItem>
                  {clients.map((c:any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={findingFilter.status} onValueChange={v => setFindingFilter(f => ({ ...f, status: v }))}>
                <SelectTrigger className="w-36 h-9 text-sm rounded-xl"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  {Object.entries(FINDING_STATUS_CFG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={findingFilter.severity} onValueChange={v => setFindingFilter(f => ({ ...f, severity: v }))}>
                <SelectTrigger className="w-36 h-9 text-sm rounded-xl"><SelectValue placeholder="All Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Severity</SelectItem>
                  {Object.entries(SEV_CFG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={findingFilter.category} onValueChange={v => setFindingFilter(f => ({ ...f, category: v }))}>
                <SelectTrigger className="w-40 h-9 text-sm rounded-xl"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Findings list */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
                <Flag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-500 mb-1">No findings yet</p>
                <p className="text-sm text-gray-400 mb-4">Record audit findings and observations here</p>
                <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={openNewFinding}><Plus className="w-4 h-4 mr-1.5"/>Add First Finding</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((f: any) => {
                  const sev     = SEV_CFG[f.severity] ?? SEV_CFG.medium;
                  const st      = FINDING_STATUS_CFG[f.status] ?? FINDING_STATUS_CFG.open;
                  const isOpen  = expandedFinding === f.id;
                  const cat     = CATEGORIES.find(c => c.value === f.category)?.label ?? f.category;
                  return (
                    <div key={f.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${f.severity === "critical" ? "border-red-200" : f.severity === "high" ? "border-orange-200" : "border-gray-100"}`}>
                      {/* Header row */}
                      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedFinding(isOpen ? null : f.id)}>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sev.color}`}>{sev.label}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800">{f.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {f.clientName && <span className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3"/>{f.clientName}</span>}
                            <span className="text-xs text-gray-400">{cat}</span>
                            {f.period && <span className="text-xs text-gray-400">· {f.period}</span>}
                            {f.dueDate && <span className="text-xs text-gray-400">· Due: {fmtDate(f.dueDate)}</span>}
                            {f.assignedTo && <span className="text-xs text-gray-500 flex items-center gap-1"><Eye className="w-3 h-3"/>{f.assignedTo}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                          <button onClick={e => { e.stopPropagation(); openEditFinding(f); }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); removeFinding(f.id); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50/30 space-y-3">
                          {f.description && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-1">Description</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{f.description}</p>
                            </div>
                          )}
                          {f.recommendation && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-1">Recommendation</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{f.recommendation}</p>
                            </div>
                          )}
                          {f.managementResponse && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-1">Management Response</p>
                              <p className="text-sm text-gray-700 italic whitespace-pre-wrap">{f.managementResponse}</p>
                            </div>
                          )}
                          <div className="flex gap-6 flex-wrap text-xs text-gray-400">
                            {f.raisedBy && <span>Raised by: <b className="text-gray-600">{f.raisedBy}</b></span>}
                            {f.resolvedDate && <span>Resolved: <b className="text-gray-600">{fmtDate(f.resolvedDate)}</b></span>}
                            <span>Created: <b className="text-gray-600">{fmtDate(f.createdAt)}</b></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── TEAM WORKLOAD TAB ── */}
      {tab === "workload" && (() => {
        const allTasksList = allTasks as any[];
        /* Group by assignee */
        const assigneeMap: Record<string, { tasks: any[] }> = {};
        allTasksList.forEach(t => {
          const key = t.assignee?.trim() || "Unassigned";
          if (!assigneeMap[key]) assigneeMap[key] = { tasks: [] };
          assigneeMap[key].tasks.push(t);
        });
        const rows = Object.entries(assigneeMap)
          .map(([name, { tasks }]) => {
            const open    = tasks.filter(t => !["completed","archived"].includes(t.status));
            const done    = tasks.filter(t => t.status === "completed");
            const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && !["completed","archived"].includes(t.status));
            const urgent  = tasks.filter(t => t.priority === "urgent" || t.priority === "high");
            const pct     = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;
            return { name, tasks, open, done, overdue, urgent, pct };
          })
          .sort((a,b) => b.open.length - a.open.length);
        const maxOpen = Math.max(...rows.map(r => r.open.length), 1);

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Team Workload</h2>
                <p className="text-xs text-gray-400 mt-0.5">Task distribution across {rows.length} assignees</p>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Open</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Overdue</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>Done</span>
              </div>
            </div>

            {rows.length === 0 ? (
              <Card className="rounded-2xl border-gray-200">
                <CardContent className="py-16 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
                  <p className="text-sm text-gray-400">No tasks assigned yet. Create tasks with assignee names to see workload distribution.</p>
                </CardContent>
              </Card>
            ) : rows.map(row => (
              <div key={row.name} className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      row.name === "Unassigned" ? "bg-gray-100 text-gray-400" : "bg-violet-100 text-violet-700")}>
                      {row.name === "Unassigned" ? "–" : row.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{row.name}</p>
                      <p className="text-xs text-gray-400">{row.tasks.length} task{row.tasks.length !== 1 ? "s" : ""} total</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-center shrink-0">
                    <div><p className="text-base font-bold text-amber-600">{row.open.length}</p><p className="text-[10px] text-gray-400">Open</p></div>
                    <div><p className="text-base font-bold text-red-500">{row.overdue.length}</p><p className="text-[10px] text-gray-400">Overdue</p></div>
                    <div><p className="text-base font-bold text-orange-500">{row.urgent.length}</p><p className="text-[10px] text-gray-400">High Priority</p></div>
                    <div><p className="text-base font-bold text-emerald-600">{row.done.length}</p><p className="text-[10px] text-gray-400">Done</p></div>
                    <div><p className="text-base font-bold text-violet-600">{row.pct}%</p><p className="text-[10px] text-gray-400">Complete</p></div>
                  </div>
                </div>
                {/* Capacity bar */}
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-400 rounded-l-full" style={{ width:`${(row.done.length/Math.max(row.tasks.length,1))*100}%` }}/>
                      <div className="h-full bg-amber-400" style={{ width:`${(row.open.filter(t=>!t.dueDate||t.dueDate>=today).length/Math.max(row.tasks.length,1))*100}%` }}/>
                      <div className="h-full bg-red-400" style={{ width:`${(row.overdue.length/Math.max(row.tasks.length,1))*100}%` }}/>
                    </div>
                    <div className="relative w-24 h-2 bg-gray-100 rounded-full shrink-0">
                      <div className="h-full bg-violet-400 rounded-full" style={{ width:`${(row.open.length/maxOpen)*100}%` }}/>
                    </div>
                    <span className="text-[10px] text-gray-400 w-16 text-right shrink-0">Relative load</span>
                  </div>
                </div>
                {/* Recent open tasks for this person */}
                {row.open.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {row.open.slice(0,3).map((t:any) => {
                      const isOverdue = t.dueDate && t.dueDate < today;
                      return (
                        <div key={t.id} className={cn("flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg",
                          isOverdue ? "bg-red-50 border border-red-100" : "bg-gray-50")}>
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                            t.priority==="urgent"?"bg-red-500":t.priority==="high"?"bg-orange-500":t.priority==="medium"?"bg-amber-400":"bg-green-400")}/>
                          <span className="flex-1 text-gray-700 truncate">{t.title}</span>
                          {t.clientName && <span className="text-gray-400 shrink-0">{t.clientName}</span>}
                          {t.dueDate && <span className={cn("shrink-0", isOverdue ? "text-red-600 font-semibold" : "text-gray-400")}>{t.dueDate}</span>}
                        </div>
                      );
                    })}
                    {row.open.length > 3 && <p className="text-[10px] text-gray-400 text-right px-3">+{row.open.length-3} more open tasks</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── COLLABORATION HUB TAB ── */}
      {tab === "collaboration" && (
        <CollaborationHub
          clients={clients as any[]}
          onCreateTask={(prefill) => {
            setTaskDlg({ open: true, form: { ...emptyTask, ...prefill } });
            setTab("tasks");
          }}
        />
      )}

      {/* ── AUTOMATION HUB TAB ── */}
      {tab === "automation" && <AutomationHub />}

      {/* ── AUDIT TRAIL TAB ── */}
      {tab === "trail" && (
        <Card className="rounded-2xl border-gray-200">
          <CardContent className="py-16 text-center">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600 mb-1">Audit Trail</p>
            <p className="text-xs text-gray-400 mb-5">Complete tamper-evident system activity log with entity and action filters</p>
            <Link href="/audit-logs">
              <Button className="rounded-xl bg-violet-600 hover:bg-violet-700">
                <ExternalLink className="w-4 h-4 mr-2" /> Open Audit Trail
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ══════════ DIALOGS ══════════ */}

      {/* Client dialog */}
      <Dialog open={clientDlg.open} onOpenChange={o => setClientDlg(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>{clientDlg.edit ? "Edit Client" : "New Audit Client"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Company Name *</Label><Input value={clientDlg.form.name} onChange={e=>setClientDlg(d=>({...d,form:{...d.form,name:e.target.value}}))} placeholder="ABC Pvt. Ltd." className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">PAN</Label><Input value={clientDlg.form.pan} onChange={e=>setClientDlg(d=>({...d,form:{...d.form,pan:e.target.value}}))} placeholder="AAAAA0000A" className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">GSTIN</Label><Input value={clientDlg.form.gstin} onChange={e=>setClientDlg(d=>({...d,form:{...d.form,gstin:e.target.value}}))} placeholder="27AAAAA0000A1Z5" className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Contact Name</Label><Input value={clientDlg.form.contactName} onChange={e=>setClientDlg(d=>({...d,form:{...d.form,contactName:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Contact Phone</Label><Input value={clientDlg.form.contactPhone} onChange={e=>setClientDlg(d=>({...d,form:{...d.form,contactPhone:e.target.value}}))} className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Contact Email</Label><Input value={clientDlg.form.contactEmail} onChange={e=>setClientDlg(d=>({...d,form:{...d.form,contactEmail:e.target.value}}))} type="email" className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">City</Label><Input value={clientDlg.form.city} onChange={e=>setClientDlg(d=>({...d,form:{...d.form,city:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">State</Label><Input value={clientDlg.form.state} onChange={e=>setClientDlg(d=>({...d,form:{...d.form,state:e.target.value}}))} className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">Engagement Types</Label>
              <div className="flex flex-wrap gap-2">
                {ENGAGEMENT_TYPES.map(et => {
                  const on = clientDlg.form.engagementTypes.includes(et);
                  return <button key={et} onClick={()=>setClientDlg(d=>({...d,form:{...d.form,engagementTypes:on?d.form.engagementTypes.filter(x=>x!==et):[...d.form.engagementTypes,et]}}))}
                    className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",on?"bg-violet-100 text-violet-700 border-violet-300":"bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300")}>{et}</button>;
                })}
              </div>
            </div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Notes</Label><Textarea value={clientDlg.form.notes} onChange={e=>setClientDlg(d=>({...d,form:{...d.form,notes:e.target.value}}))} rows={2} className="rounded-xl resize-none text-xs"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={()=>setClientDlg(d=>({...d,open:false}))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveClient} disabled={createClient.isPending||updateClient.isPending}>{clientDlg.edit?"Save Changes":"Create Client"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task dialog */}
      <Dialog open={taskDlg.open} onOpenChange={o => setTaskDlg(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>{taskDlg.edit ? "Edit Task" : "New Audit Task"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Client *</Label>
              <Select value={taskDlg.form.clientId} onValueChange={v => { if (v === "__new__") { openNewClientFrom("task"); return; } setTaskDlg(d=>({...d,form:{...d.form,clientId:v}})); }}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client…"/></SelectTrigger>
                <SelectContent>
                  {clients.map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  {clients.length === 0 && <div className="px-2 py-1.5 text-xs text-gray-400 italic">No clients yet</div>}
                  <SelectItem value="__new__" className="text-violet-600 font-semibold border-t mt-1">
                    + Create New Client
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Task Title *</Label><Input value={taskDlg.form.title} onChange={e=>setTaskDlg(d=>({...d,form:{...d.form,title:e.target.value}}))} placeholder="e.g. Upload purchase invoices for Q1" className="rounded-xl"/></div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Task Type</Label>
              <Select value={taskDlg.form.taskType} onValueChange={v=>setTaskDlg(d=>({...d,form:{...d.form,taskType:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{TASK_TYPES.map(t=><SelectItem key={t} value={t}>{TASK_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Priority</Label>
              <Select value={taskDlg.form.priority} onValueChange={v=>setTaskDlg(d=>({...d,form:{...d.form,priority:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{Object.entries(PRIORITY_CFG).map(([k,v])=><SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Due Date</Label><Input type="date" value={taskDlg.form.dueDate} onChange={e=>setTaskDlg(d=>({...d,form:{...d.form,dueDate:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Assignee</Label><Input value={taskDlg.form.assignee} onChange={e=>setTaskDlg(d=>({...d,form:{...d.form,assignee:e.target.value}}))} placeholder="Staff name" className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Description</Label><Input value={taskDlg.form.description} onChange={e=>setTaskDlg(d=>({...d,form:{...d.form,description:e.target.value}}))} placeholder="Brief description" className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Instructions for client</Label><Textarea value={taskDlg.form.instructions} onChange={e=>setTaskDlg(d=>({...d,form:{...d.form,instructions:e.target.value}}))} placeholder="Detailed instructions…" rows={3} className="rounded-xl resize-none text-xs"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={()=>setTaskDlg(d=>({...d,open:false}))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveTask} disabled={createTask.isPending||updateTask.isPending}>{taskDlg.edit?"Save Changes":"Create Task"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compliance event dialog */}
      <Dialog open={eventDlg.open} onOpenChange={o => setEventDlg(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>{eventDlg.edit ? "Edit Event" : "Add Compliance Event"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Title *</Label><Input value={eventDlg.form.title} onChange={e=>setEventDlg(d=>({...d,form:{...d.form,title:e.target.value}}))} placeholder="e.g. GSTR-1 July 2026" className="rounded-xl"/></div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Event Type</Label>
              <Select value={eventDlg.form.eventType} onValueChange={v=>setEventDlg(d=>({...d,form:{...d.form,eventType:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Client (optional)</Label>
              <Select value={eventDlg.form.clientId} onValueChange={v => { if (v === "__new__") { openNewClientFrom("event"); return; } setEventDlg(d=>({...d,form:{...d.form,clientId:v}})); }}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="All clients"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All clients</SelectItem>
                  {clients.map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  <SelectItem value="__new__" className="text-violet-600 font-semibold border-t mt-1">
                    + Create New Client
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Period (YYYY-MM)</Label><Input value={eventDlg.form.period} onChange={e=>setEventDlg(d=>({...d,form:{...d.form,period:e.target.value}}))} placeholder="2026-07" className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Due Date *</Label><Input type="date" value={eventDlg.form.dueDate} onChange={e=>setEventDlg(d=>({...d,form:{...d.form,dueDate:e.target.value}}))} className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Notes</Label><Input value={eventDlg.form.notes} onChange={e=>setEventDlg(d=>({...d,form:{...d.form,notes:e.target.value}}))} className="rounded-xl"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={()=>setEventDlg(d=>({...d,open:false}))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveEvent} disabled={createEvent.isPending||updateEvent.isPending}>{eventDlg.edit?"Save Changes":"Add Event"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Findings dialog */}
      <Dialog open={findingDlg.open} onOpenChange={o => setFindingDlg(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader><DialogTitle>{findingDlg.edit ? "Edit Finding" : "Add Audit Finding"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Client *</Label>
              <Select value={findingDlg.form.clientId} onValueChange={v => setFindingDlg(d => ({ ...d, form: { ...d.form, clientId: v } }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{(clients as any[]).map((c:any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Title *</Label>
              <Input value={findingDlg.form.title} onChange={e => setFindingDlg(d => ({ ...d, form: { ...d.form, title: e.target.value } }))} placeholder="e.g. GST Input Tax Credit mismatch in Q3" className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={findingDlg.form.category} onValueChange={v => setFindingDlg(d => ({ ...d, form: { ...d.form, category: v } }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Severity</Label>
              <Select value={findingDlg.form.severity} onValueChange={v => setFindingDlg(d => ({ ...d, form: { ...d.form, severity: v } }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={findingDlg.form.status} onValueChange={v => setFindingDlg(d => ({ ...d, form: { ...d.form, status: v } }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Period (FY / Quarter)</Label>
              <Input value={findingDlg.form.period} onChange={e => setFindingDlg(d => ({ ...d, form: { ...d.form, period: e.target.value } }))} placeholder="e.g. 2025-26 Q3" className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Due Date</Label>
              <Input type="date" value={findingDlg.form.dueDate} onChange={e => setFindingDlg(d => ({ ...d, form: { ...d.form, dueDate: e.target.value } }))} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Raised By</Label>
              <Input value={findingDlg.form.raisedBy} onChange={e => setFindingDlg(d => ({ ...d, form: { ...d.form, raisedBy: e.target.value } }))} placeholder="Auditor name" className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Assigned To</Label>
              <Input value={findingDlg.form.assignedTo} onChange={e => setFindingDlg(d => ({ ...d, form: { ...d.form, assignedTo: e.target.value } }))} placeholder="Team member" className="rounded-xl" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea value={findingDlg.form.description} onChange={e => setFindingDlg(d => ({ ...d, form: { ...d.form, description: e.target.value } }))} placeholder="Detailed description of the finding…" rows={3} className="rounded-xl resize-none text-sm" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Recommendation</Label>
              <Textarea value={findingDlg.form.recommendation} onChange={e => setFindingDlg(d => ({ ...d, form: { ...d.form, recommendation: e.target.value } }))} placeholder="Recommended corrective action…" rows={2} className="rounded-xl resize-none text-sm" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Management Response</Label>
              <Textarea value={findingDlg.form.managementResponse} onChange={e => setFindingDlg(d => ({ ...d, form: { ...d.form, managementResponse: e.target.value } }))} placeholder="Management's response to this finding…" rows={2} className="rounded-xl resize-none text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setFindingDlg(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveFinding} disabled={createFinding.isPending || updateFinding.isPending}>
              {findingDlg.edit ? "Save Changes" : "Add Finding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>Email Package to Auditor</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs font-semibold">Recipient Email *</Label><Input value={emailForm.recipientEmail} onChange={e=>setEmailForm(f=>({...f,recipientEmail:e.target.value}))} type="email" className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Recipient Name</Label><Input value={emailForm.recipientName} onChange={e=>setEmailForm(f=>({...f,recipientName:e.target.value}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Subject</Label><Input value={emailForm.subject} onChange={e=>setEmailForm(f=>({...f,subject:e.target.value}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Message</Label><Textarea value={emailForm.message} onChange={e=>setEmailForm(f=>({...f,message:e.target.value}))} rows={3} className="rounded-xl resize-none text-sm"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={()=>setEmailOpen(false)}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={handleEmail}><Send className="w-4 h-4 mr-1.5"/>Send Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ ENGAGEMENT TEMPLATE DIALOG ══════════════════════════════════ */}
      <Dialog open={templateDlg.open} onOpenChange={o => setTemplateDlg(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-violet-600" />
              {templateDlg.step === 1 ? "Choose Audit Template" : templateDlg.step === 2 ? "Configure Engagement" : "Preview & Create Tasks"}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1 — Pick template */}
          {templateDlg.step === 1 && (
            <div className="space-y-3 py-1">
              <p className="text-xs text-gray-500">Select the type of audit engagement. All standard tasks will be created automatically with the right phases and priorities.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AUDIT_TEMPLATES.map(tmpl => (
                  <button key={tmpl.id} onClick={() => setTemplateDlg(d => ({ ...d, templateId: tmpl.id }))}
                    className={cn("text-left p-4 rounded-xl border-2 transition-all hover:border-violet-300",
                      templateDlg.templateId === tmpl.id ? "border-violet-500 bg-violet-50" : tmpl.color)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{tmpl.icon}</span>
                      <span className="text-sm font-semibold text-gray-800">{tmpl.label}</span>
                      {templateDlg.templateId === tmpl.id && <CheckSquare2 className="w-4 h-4 text-violet-600 ml-auto" />}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{tmpl.description}</p>
                    <p className="text-xs font-medium text-gray-400 mt-2">{AUDIT_TEMPLATES.find(t => t.id === tmpl.id)?.tasks.length ?? 0} tasks across all phases</p>
                  </button>
                ))}
              </div>
              <DialogFooter className="pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setTemplateDlg(d => ({ ...d, open: false }))}>Cancel</Button>
                <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" disabled={!templateDlg.templateId}
                  onClick={() => setTemplateDlg(d => ({ ...d, step: 2 }))}>
                  Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 2 — Configure */}
          {templateDlg.step === 2 && (() => {
            const tmpl = AUDIT_TEMPLATES.find(t => t.id === templateDlg.templateId)!;
            return (
              <div className="space-y-4 py-1">
                <div className={cn("flex items-center gap-3 p-3 rounded-xl border-2", tmpl.color)}>
                  <span className="text-2xl">{tmpl.icon}</span>
                  <div><p className="text-sm font-semibold text-gray-800">{tmpl.label}</p><p className="text-xs text-gray-500">{tmpl.tasks.length} tasks will be created</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Client *</Label>
                    <Select value={templateDlg.clientId} onValueChange={v => setTemplateDlg(d => ({ ...d, clientId: v }))}>
                      <SelectTrigger className="rounded-xl text-sm"><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Engagement Start Date</Label>
                    <Input type="date" value={templateDlg.baseDate} onChange={e => setTemplateDlg(d => ({ ...d, baseDate: e.target.value }))} className="rounded-xl text-sm" />
                    <p className="text-xs text-gray-400">Task due dates are calculated from this date</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 max-h-52 overflow-y-auto space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Task preview:</p>
                  {tmpl.tasks.map((t, i) => {
                    const dd = templateDlg.baseDate
                      ? new Date(new Date(templateDlg.baseDate).getTime() + t.daysOffset * 86400000).toISOString().split("T")[0]
                      : null;
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium shrink-0", {
                          planning:"bg-blue-100 text-blue-700", fieldwork:"bg-amber-100 text-amber-700",
                          review:"bg-violet-100 text-violet-700", reporting:"bg-green-100 text-green-700",
                        }[t.phase] ?? "bg-gray-100 text-gray-600")}>{t.phase}</span>
                        <span className="text-gray-700 flex-1 truncate">{t.title}</span>
                        <span className="text-gray-400 shrink-0">{dd ? fmtDate(dd) : "—"}</span>
                      </div>
                    );
                  })}
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={() => setTemplateDlg(d => ({ ...d, step: 1 }))}>Back</Button>
                  <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" disabled={!templateDlg.clientId || bulkCreateTasks.isPending}
                    onClick={applyTemplate}>
                    {bulkCreateTasks.isPending ? "Creating…" : `Create ${tmpl.tasks.length} Tasks`}
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══ SEED COMPLIANCE DIALOG ══════════════════════════════════════ */}
      <Dialog open={seedDlg.open} onOpenChange={o => setSeedDlg(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarCog className="w-4 h-4 text-amber-600" />
              Auto-Seed Compliance Calendar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-gray-500">Generate a full year of statutory compliance deadlines for a client in one click. GST returns, TDS payments, advance tax, ROC filings, and more.</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Client *</Label>
                <Select value={seedDlg.clientId} onValueChange={v => setSeedDlg(d => ({ ...d, clientId: v }))}>
                  <SelectTrigger className="rounded-xl text-sm"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Financial Year</Label>
                <Select value={seedDlg.fy} onValueChange={v => setSeedDlg(d => ({ ...d, fy: v }))}>
                  <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["2026-27","2025-26","2024-25","2023-24"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Compliance Categories</Label>
              <div className="space-y-2">
                {SEED_CATEGORIES.map(cat => (
                  <label key={cat.id} className={cn("flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    seedDlg.categories.includes(cat.id) ? "border-violet-300 bg-violet-50" : "border-gray-200 hover:border-gray-300")}>
                    <input type="checkbox" checked={seedDlg.categories.includes(cat.id)}
                      onChange={e => setSeedDlg(d => ({
                        ...d, categories: e.target.checked
                          ? [...d.categories, cat.id]
                          : d.categories.filter(x => x !== cat.id)
                      }))}
                      className="mt-0.5 accent-violet-600" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{cat.label}</p>
                      <p className="text-xs text-gray-500">{cat.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {seedDlg.clientId && seedDlg.categories.length > 0 && (() => {
              const approxCount = seedDlg.categories.reduce((acc, cat) => {
                if (cat === "gst") return acc + 24;
                if (cat === "tds") return acc + 16;
                if (cat === "income_tax") return acc + 6;
                if (cat === "roc") return acc + 4;
                if (cat === "pf_esi") return acc + 12;
                return acc;
              }, 0);
              return (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span>~{approxCount} compliance events will be created for FY {seedDlg.fy}</span>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSeedDlg(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button className="rounded-xl bg-amber-600 hover:bg-amber-700" disabled={!seedDlg.clientId || seedDlg.categories.length === 0 || seedCompliance.isPending}
              onClick={runSeedCompliance}>
              {seedCompliance.isPending ? "Generating…" : "Seed Compliance Calendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
