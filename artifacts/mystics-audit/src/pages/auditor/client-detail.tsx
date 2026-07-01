import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import {
  useGetAuditClient, useUpdateAuditClient,
  useListAuditTasks, useCreateAuditTask, useUpdateAuditTask, useUpdateAuditTaskStatus,
  useListAuditFindings, useCreateAuditFinding, useUpdateAuditFinding,
  useListComplianceEvents, useCreateComplianceEvent, useUpdateComplianceEvent,
  useListAuditQueries, useCreateAuditQuery, useUpdateAuditQuery, useDeleteAuditQuery,
  useListAuditWorkingPapers, useCreateAuditWorkingPaper, useUpdateAuditWorkingPaper, useDeleteAuditWorkingPaper,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, CheckCircle2,
  Flag, ClipboardList, CalendarDays, AlertTriangle, Plus, ChevronRight,
  Pencil, Trash2, FileText, MessageSquare, BookOpen, Sparkles,
  CheckSquare, BarChart3, Circle, ChevronDown, ChevronUp,
} from "lucide-react";

/* ── constants ── */
const today = new Date().toISOString().split("T")[0];
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const PHASES = [
  { id: "planning",   label: "Planning",   icon: <FileText className="w-4 h-4"/>,      color: "bg-blue-500" },
  { id: "fieldwork",  label: "Fieldwork",  icon: <CheckSquare className="w-4 h-4"/>,   color: "bg-amber-500" },
  { id: "review",     label: "Review",     icon: <Flag className="w-4 h-4"/>,           color: "bg-violet-500" },
  { id: "reporting",  label: "Reporting",  icon: <ClipboardList className="w-4 h-4"/>, color: "bg-emerald-500" },
  { id: "closed",     label: "Closed",     icon: <CheckCircle2 className="w-4 h-4"/>,  color: "bg-gray-400" },
];

const SEV_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  critical: { label: "Critical", dot: "bg-red-500",    badge: "bg-red-100 text-red-700 border-red-200" },
  high:     { label: "High",     dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700 border-orange-200" },
  medium:   { label: "Medium",   dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700 border-amber-200" },
  low:      { label: "Low",      dot: "bg-green-500",  badge: "bg-green-100 text-green-700 border-green-200" },
};
const FINDING_STATUS_CFG: Record<string, string> = {
  open:        "bg-red-50 text-red-600 border-red-200",
  in_progress: "bg-amber-50 text-amber-600 border-amber-200",
  resolved:    "bg-green-50 text-green-700 border-green-200",
  closed:      "bg-gray-100 text-gray-500 border-gray-200",
};
const TASK_STATUS_CFG: Record<string, { label: string; color: string }> = {
  created:           { label: "Created",          color: "bg-gray-100 text-gray-600" },
  assigned:          { label: "Assigned",          color: "bg-blue-100 text-blue-600" },
  in_progress:       { label: "In Progress",       color: "bg-amber-100 text-amber-600" },
  under_review:      { label: "Under Review",      color: "bg-violet-100 text-violet-600" },
  changes_requested: { label: "Changes Requested", color: "bg-orange-100 text-orange-600" },
  completed:         { label: "Completed",         color: "bg-green-100 text-green-600" },
  archived:          { label: "Archived",          color: "bg-gray-200 text-gray-400" },
};
const STATUS_NEXT: Record<string, string> = {
  created: "assigned", assigned: "in_progress", in_progress: "under_review",
  under_review: "completed", changes_requested: "in_progress",
};
const TASK_TYPES = ["document_request","compliance_task","query","review","custom"];
const TASK_TYPE_LABELS: Record<string, string> = {
  document_request:"Document Request", compliance_task:"Compliance Task",
  query:"Query", review:"Review", custom:"Custom",
};
const QUERY_TYPES = [
  { value:"information_request", label:"Information Request" },
  { value:"document_request",    label:"Document Request" },
  { value:"clarification",       label:"Clarification" },
  { value:"discrepancy",         label:"Discrepancy" },
  { value:"action_required",     label:"Action Required" },
];
const QUERY_STATUS_CFG: Record<string, { label: string; color: string }> = {
  raised:       { label: "Raised",       color: "bg-blue-100 text-blue-700" },
  sent:         { label: "Sent",         color: "bg-indigo-100 text-indigo-700" },
  acknowledged: { label: "Acknowledged", color: "bg-amber-100 text-amber-700" },
  responded:    { label: "Responded",    color: "bg-teal-100 text-teal-700" },
  under_review: { label: "Under Review", color: "bg-violet-100 text-violet-700" },
  closed:       { label: "Closed",       color: "bg-green-100 text-green-700" },
};
const QUERY_STATUS_NEXT: Record<string, string> = {
  raised:"sent", sent:"acknowledged", acknowledged:"responded",
  responded:"under_review", under_review:"closed",
};
const WP_SECTIONS = [
  { id:"planning",           label:"Planning" },
  { id:"internal_controls",  label:"Internal Controls" },
  { id:"substantive",        label:"Substantive Testing" },
  { id:"financial_reporting",label:"Financial Reporting" },
  { id:"closing",            label:"Closing" },
];
const WP_STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft:        { label: "Draft",        color: "bg-gray-100 text-gray-600" },
  prepared:     { label: "Prepared",     color: "bg-blue-100 text-blue-700" },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-700" },
  reviewed:     { label: "Reviewed",     color: "bg-violet-100 text-violet-700" },
  approved:     { label: "Approved",     color: "bg-green-100 text-green-700" },
};
const WP_STATUS_NEXT: Record<string, string> = {
  draft:"prepared", prepared:"under_review", under_review:"reviewed", reviewed:"approved",
};
const CATEGORIES = [
  { value:"financial",    label:"Financial" },
  { value:"compliance",   label:"Compliance" },
  { value:"operational",  label:"Operational" },
  { value:"it_security",  label:"IT Security" },
  { value:"tax",          label:"Tax" },
  { value:"other",        label:"Other" },
];
const EVENT_TYPES = [
  { value:"gstr1",       label:"GSTR-1" },
  { value:"gstr3b",      label:"GSTR-3B" },
  { value:"tds_payment", label:"TDS Payment" },
  { value:"tds_return",  label:"TDS Return" },
  { value:"itr",         label:"ITR Filing" },
  { value:"roc",         label:"ROC Filing" },
  { value:"advance_tax", label:"Advance Tax" },
  { value:"pf",          label:"PF Payment" },
  { value:"esi",         label:"ESI Payment" },
  { value:"custom",      label:"Custom" },
];

/* Standard compliance templates for auto-generation */
const STD_COMPLIANCE: Record<string, { title: string; eventType: string; offset: number }[]> = {
  gst: [
    { title:"GSTR-1 (Monthly)",  eventType:"gstr1",  offset: 11 },
    { title:"GSTR-3B (Monthly)", eventType:"gstr3b", offset: 20 },
  ],
  tds: [
    { title:"TDS Payment",      eventType:"tds_payment", offset: 7 },
    { title:"TDS Return (Q1)",  eventType:"tds_return",  offset: 31 },
  ],
  income_tax: [
    { title:"Advance Tax Q1",   eventType:"advance_tax", offset: 15 },
    { title:"Advance Tax Q2",   eventType:"advance_tax", offset: 45 },
    { title:"Advance Tax Q3",   eventType:"advance_tax", offset: 75 },
    { title:"Advance Tax Q4",   eventType:"advance_tax", offset: 105 },
    { title:"ITR Filing",       eventType:"itr",         offset: 120 },
  ],
  roc: [
    { title:"Annual Return (MGT-7)", eventType:"roc", offset: 60 },
    { title:"Financial Statements",  eventType:"roc", offset: 90 },
  ],
  pf_esi: [
    { title:"PF Payment",  eventType:"pf",  offset: 15 },
    { title:"ESI Payment", eventType:"esi", offset: 15 },
  ],
};

type DetailTab = "overview" | "tasks" | "findings" | "compliance" | "queries" | "working_papers";
function parseTags(raw: string) { try { return JSON.parse(raw) ?? []; } catch { return []; } }

/* ── Ring progress component ── */
function Ring({ pct, size = 56, stroke = 5, color = "#7c3aed" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
    </svg>
  );
}

export default function AuditClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const { toast } = useToast();
  const [tab, setDetailTab] = useState<DetailTab>("overview");
  const [phaseFilter, setPhaseFilter] = useState("");
  const [expandedQuery, setExpandedQuery] = useState<number | null>(null);
  const [expandedWP, setExpandedWP] = useState<number | null>(null);
  const [autoGenDlg, setAutoGenDlg] = useState(false);
  const [autoGenSelected, setAutoGenSelected] = useState<Record<string, boolean>>({ gst:true, tds:true, income_tax:false, roc:false, pf_esi:false });
  const [autoGenPeriod, setAutoGenPeriod] = useState(new Date().toISOString().substring(0,7));

  /* ── queries ── */
  const { data: client, refetch: refetchClient } = useGetAuditClient(clientId);
  const { data: tasks = [],    refetch: refetchTasks }    = useListAuditTasks({ clientId } as any);
  const { data: findings = [], refetch: refetchFindings } = useListAuditFindings({ clientId } as any);
  const { data: events = [],   refetch: refetchEvents }   = useListComplianceEvents({ clientId } as any);
  const { data: queries = [],  refetch: refetchQueries }  = useListAuditQueries({ clientId } as any);
  const { data: wps = [],      refetch: refetchWPs }      = useListAuditWorkingPapers({ clientId } as any);

  /* ── mutations ── */
  const updateClient    = useUpdateAuditClient();
  const createTask      = useCreateAuditTask();
  const updateTask      = useUpdateAuditTask();
  const advanceStatus   = useUpdateAuditTaskStatus();
  const createFinding   = useCreateAuditFinding();
  const updateFinding   = useUpdateAuditFinding();
  const createEvent     = useCreateComplianceEvent();
  const updateEvent     = useUpdateComplianceEvent();
  const createQuery     = useCreateAuditQuery();
  const updateQuery     = useUpdateAuditQuery();
  const deleteQuery     = useDeleteAuditQuery();
  const createWP        = useCreateAuditWorkingPaper();
  const updateWP        = useUpdateAuditWorkingPaper();
  const deleteWP        = useDeleteAuditWorkingPaper();

  /* ── derived ── */
  const c = client as any;
  const engs: string[] = c ? parseTags(c.engagementTypes ?? "[]") : [];

  const tasksList    = tasks    as any[];
  const findingsList = findings as any[];
  const eventsList   = events   as any[];
  const queriesList  = queries  as any[];
  const wpsList      = wps      as any[];

  const openTasks      = tasksList.filter(t => !["completed","archived"].includes(t.status));
  const overdueTasks   = tasksList.filter(t => t.dueDate && t.dueDate < today && !["completed","archived"].includes(t.status));
  const openFindings   = findingsList.filter(f => ["open","in_progress"].includes(f.status));
  const pendingEvents  = eventsList.filter(e => e.status === "pending");
  const openQueries    = queriesList.filter(q => q.status !== "closed");
  const approvedWPs    = wpsList.filter(wp => wp.status === "approved").length;

  const tasksByPhase = PHASES.slice(0,4).map(p => ({
    ...p, tasks: tasksList.filter(t => (t.phase ?? "planning") === p.id),
  }));

  /* Progress percentages */
  const taskPct    = tasksList.length > 0    ? Math.round((tasksList.filter(t => t.status === "completed").length / tasksList.length) * 100) : 0;
  const findPct    = findingsList.length > 0  ? Math.round((findingsList.filter(f => ["resolved","closed"].includes(f.status)).length / findingsList.length) * 100) : 0;
  const queryPct   = queriesList.length > 0   ? Math.round((queriesList.filter(q => q.status === "closed").length / queriesList.length) * 100) : 0;
  const wpPct      = wpsList.length > 0       ? Math.round((wpsList.filter(wp => wp.status === "approved").length / wpsList.length) * 100) : 0;

  /* ── phase update ── */
  function setEngagementPhase(phase: string) {
    if (!c) return;
    updateClient.mutate({ id: clientId, data: { ...c, engagementPhase: phase, engagementTypes: parseTags(c.engagementTypes ?? "[]") } } as any, {
      onSuccess: () => { toast({ title: `Phase → ${phase}` }); refetchClient(); },
    });
  }

  /* ── task dialog ── */
  const emptyTask = { title:"", taskType:"document_request", phase:"planning", priority:"medium", dueDate:"", assignee:"", description:"", instructions:"" };
  const [taskDlg, setTaskDlg] = useState<{ open:boolean; edit?:any; form:typeof emptyTask }>({ open:false, form:emptyTask });
  function openNewTask(phase = "planning") { setTaskDlg({ open:true, form:{...emptyTask, phase} }); }
  function openEditTask(t: any) {
    setTaskDlg({ open:true, edit:t, form:{
      title:t.title, taskType:t.taskType, phase:t.phase??"planning",
      priority:t.priority, dueDate:t.dueDate??"", assignee:t.assignee??"",
      description:t.description??"", instructions:t.instructions??"",
    }});
  }
  function saveTask() {
    const { form, edit } = taskDlg;
    if (!form.title.trim()) { toast({ title:"Title required", variant:"destructive" }); return; }
    const data: any = { ...form, clientId };
    if (edit) {
      updateTask.mutate({ id:edit.id, data } as any, {
        onSuccess: () => { toast({ title:"Task updated" }); setTaskDlg(d=>({...d,open:false})); refetchTasks(); },
      });
    } else {
      createTask.mutate({ data } as any, {
        onSuccess: () => { toast({ title:"Task created" }); setTaskDlg(d=>({...d,open:false})); refetchTasks(); },
      });
    }
  }
  function doAdvanceStatus(t: any) {
    const next = STATUS_NEXT[t.status];
    if (!next) return;
    advanceStatus.mutate({ id:t.id, data:{status:next} } as any, {
      onSuccess: () => { toast({ title:`→ ${TASK_STATUS_CFG[next]?.label}` }); refetchTasks(); },
    });
  }

  /* ── finding dialog ── */
  const emptyFinding = { title:"", description:"", category:"compliance", severity:"medium", status:"open", recommendation:"", period:"", dueDate:"", raisedBy:"", assignedTo:"" };
  const [findDlg, setFindDlg] = useState<{ open:boolean; edit?:any; form:typeof emptyFinding }>({ open:false, form:emptyFinding });
  function openNewFinding() { setFindDlg({ open:true, form:emptyFinding }); }
  function openEditFinding(f: any) {
    setFindDlg({ open:true, edit:f, form:{
      title:f.title, description:f.description??"", category:f.category, severity:f.severity,
      status:f.status, recommendation:f.recommendation??"", period:f.period??"",
      dueDate:f.dueDate??"", raisedBy:f.raisedBy??"", assignedTo:f.assignedTo??"",
    }});
  }
  function saveFinding() {
    const { form, edit } = findDlg;
    if (!form.title.trim()) { toast({ title:"Title required", variant:"destructive" }); return; }
    const data: any = { ...form, clientId };
    if (edit) {
      updateFinding.mutate({ id:edit.id, data } as any, {
        onSuccess: () => { toast({ title:"Finding updated" }); setFindDlg(d=>({...d,open:false})); refetchFindings(); },
      });
    } else {
      createFinding.mutate({ data } as any, {
        onSuccess: () => { toast({ title:"Finding recorded" }); setFindDlg(d=>({...d,open:false})); refetchFindings(); },
      });
    }
  }

  /* ── compliance event dialog ── */
  const emptyEvent = { title:"", eventType:"custom", period:"", dueDate:"", notes:"" };
  const [eventDlg, setEventDlg] = useState<{ open:boolean; form:typeof emptyEvent }>({ open:false, form:emptyEvent });
  function saveEvent() {
    const { form } = eventDlg;
    if (!form.title.trim() || !form.dueDate) { toast({ title:"Title and due date required", variant:"destructive" }); return; }
    createEvent.mutate({ data:{ ...form, clientId } } as any, {
      onSuccess: () => { toast({ title:"Event added" }); setEventDlg(d=>({...d,open:false})); refetchEvents(); },
    });
  }
  function markFiled(e: any) {
    updateEvent.mutate({ id:e.id, data:{ ...e, status:"filed", filedDate:today } } as any, {
      onSuccess: () => { toast({ title:"Marked as filed" }); refetchEvents(); },
    });
  }

  /* ── auto-generate compliance ── */
  function runAutoGenerate() {
    const base = new Date(autoGenPeriod + "-01");
    const tasks: Array<{ title:string; eventType:string; dueDate:string; period:string }> = [];
    Object.entries(autoGenSelected).forEach(([key, on]) => {
      if (!on) return;
      (STD_COMPLIANCE[key] ?? []).forEach(tpl => {
        const d = new Date(base);
        d.setDate(d.getDate() + tpl.offset);
        tasks.push({ title:tpl.title, eventType:tpl.eventType, dueDate:d.toISOString().split("T")[0], period:autoGenPeriod });
      });
    });
    if (!tasks.length) { toast({ title:"Select at least one category", variant:"destructive" }); return; }
    let done = 0;
    tasks.forEach(t => {
      createEvent.mutate({ data:{ ...t, clientId } } as any, {
        onSuccess: () => { done++; if (done === tasks.length) { toast({ title:`${done} compliance events created` }); setAutoGenDlg(false); refetchEvents(); } },
      });
    });
  }

  /* ── query dialog ── */
  const emptyQuery = { title:"", description:"", queryType:"information_request", status:"raised", priority:"medium", dueDate:"", raisedBy:"", assignedTo:"", period:"", clientResponse:"", auditorNote:"", queryNo:"" };
  const [queryDlg, setQueryDlg] = useState<{ open:boolean; edit?:any; form:typeof emptyQuery }>({ open:false, form:emptyQuery });
  function openNewQuery() { setQueryDlg({ open:true, form:emptyQuery }); }
  function openEditQuery(q: any) {
    setQueryDlg({ open:true, edit:q, form:{
      title:q.title, description:q.description??"", queryType:q.queryType, status:q.status,
      priority:q.priority, dueDate:q.dueDate??"", raisedBy:q.raisedBy??"",
      assignedTo:q.assignedTo??"", period:q.period??"",
      clientResponse:q.clientResponse??"", auditorNote:q.auditorNote??"", queryNo:q.queryNo??"",
    }});
  }
  function saveQuery() {
    const { form, edit } = queryDlg;
    if (!form.title.trim()) { toast({ title:"Title required", variant:"destructive" }); return; }
    const data: any = { ...form, clientId };
    if (edit) {
      updateQuery.mutate({ id:edit.id, data } as any, {
        onSuccess: () => { toast({ title:"Query updated" }); setQueryDlg(d=>({...d,open:false})); refetchQueries(); },
      });
    } else {
      createQuery.mutate({ data } as any, {
        onSuccess: () => { toast({ title:"Query raised" }); setQueryDlg(d=>({...d,open:false})); refetchQueries(); },
      });
    }
  }
  function advanceQuery(q: any) {
    const next = QUERY_STATUS_NEXT[q.status];
    if (!next) return;
    updateQuery.mutate({ id:q.id, data:{ ...q, status:next } } as any, {
      onSuccess: () => { toast({ title:`Query → ${QUERY_STATUS_CFG[next]?.label}` }); refetchQueries(); },
    });
  }

  /* ── working paper dialog ── */
  const emptyWP = { title:"", wpNo:"", section:"planning", description:"", preparedBy:"", reviewedBy:"", status:"draft", riskArea:"", assertions:"", conclusion:"", period:"" };
  const [wpDlg, setWpDlg] = useState<{ open:boolean; edit?:any; form:typeof emptyWP }>({ open:false, form:emptyWP });
  function openNewWP(section = "planning") { setWpDlg({ open:true, form:{...emptyWP, section} }); }
  function openEditWP(wp: any) {
    setWpDlg({ open:true, edit:wp, form:{
      title:wp.title, wpNo:wp.wpNo??"", section:wp.section, description:wp.description??"",
      preparedBy:wp.preparedBy??"", reviewedBy:wp.reviewedBy??"", status:wp.status,
      riskArea:wp.riskArea??"", assertions:wp.assertions??"", conclusion:wp.conclusion??"", period:wp.period??"",
    }});
  }
  function saveWP() {
    const { form, edit } = wpDlg;
    if (!form.title.trim()) { toast({ title:"Title required", variant:"destructive" }); return; }
    const data: any = { ...form, clientId };
    if (edit) {
      updateWP.mutate({ id:edit.id, data } as any, {
        onSuccess: () => { toast({ title:"Working paper updated" }); setWpDlg(d=>({...d,open:false})); refetchWPs(); },
      });
    } else {
      createWP.mutate({ data } as any, {
        onSuccess: () => { toast({ title:"Working paper created" }); setWpDlg(d=>({...d,open:false})); refetchWPs(); },
      });
    }
  }
  function advanceWP(wp: any) {
    const next = WP_STATUS_NEXT[wp.status];
    if (!next) return;
    updateWP.mutate({ id:wp.id, data:{ ...wp, status:next } } as any, {
      onSuccess: () => { toast({ title:`WP → ${WP_STATUS_CFG[next]?.label}` }); refetchWPs(); },
    });
  }

  if (!c) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const currentPhaseIdx = PHASES.findIndex(p => p.id === (c.engagementPhase ?? "planning"));

  /* ─────── RENDER ─────── */
  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Link href="/auditor">
          <Button variant="ghost" size="sm" className="rounded-xl shrink-0 mt-1"><ArrowLeft className="w-4 h-4 mr-1"/>Back</Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-violet-600"/>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{c.name}</h1>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {c.gstin && <span className="text-xs font-mono text-gray-400">GSTIN: {c.gstin}</span>}
                    {c.pan   && <span className="text-xs font-mono text-gray-400">PAN: {c.pan}</span>}
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500")}>{c.status}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-gray-500">
                {c.contactName  && <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/>{c.contactName}</span>}
                {c.contactPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/>{c.contactPhone}</span>}
                {c.contactEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3"/>{c.contactEmail}</span>}
                {c.city         && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{c.city}{c.state ? `, ${c.state}` : ""}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap justify-end">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openNewTask()}><Plus className="w-3.5 h-3.5 mr-1"/>Task</Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={openNewFinding}><Flag className="w-3.5 h-3.5 mr-1"/>Finding</Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={openNewQuery}><MessageSquare className="w-3.5 h-3.5 mr-1"/>Query</Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openNewWP()}><BookOpen className="w-3.5 h-3.5 mr-1"/>WP</Button>
              <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={() => setEventDlg({ open:true, form:emptyEvent })}><CalendarDays className="w-3.5 h-3.5 mr-1"/>Compliance</Button>
            </div>
          </div>
          {engs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {engs.map(e => <span key={e} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full border border-violet-100">{e}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* ── Engagement Phase Pipeline ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Audit Engagement Phase</h2>
          <span className="text-xs text-gray-400">Click next phase to advance</span>
        </div>
        <div className="flex items-center gap-0">
          {PHASES.map((phase, i) => {
            const isActive = i === currentPhaseIdx;
            const isDone   = i < currentPhaseIdx;
            return (
              <div key={phase.id} className="flex items-center flex-1 min-w-0">
                <button
                  onClick={() => !isDone && !isActive && setEngagementPhase(phase.id)}
                  disabled={isDone || isActive}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border-2 transition-all text-center",
                    isActive ? "border-violet-500 bg-violet-50 shadow-sm" :
                    isDone   ? "border-emerald-300 bg-emerald-50 cursor-not-allowed" :
                               "border-gray-200 bg-white hover:border-violet-300 cursor-pointer"
                  )}>
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center",
                    isActive ? "bg-violet-500 text-white" : isDone ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400")}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5"/> : phase.icon}
                  </div>
                  <span className={cn("text-xs font-semibold truncate max-w-full",
                    isActive ? "text-violet-700" : isDone ? "text-emerald-700" : "text-gray-400")}>{phase.label}</span>
                  <span className="text-[10px] text-gray-400">{tasksByPhase[i]?.tasks?.length ?? 0} tasks</span>
                </button>
                {i < PHASES.length-1 && (
                  <div className={cn("h-0.5 w-3 shrink-0 mx-0.5", i < currentPhaseIdx ? "bg-emerald-400" : "bg-gray-200")}/>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label:"Open Tasks",    value:openTasks.length,    color:"text-blue-600",   bg:"bg-blue-50 border-blue-100",   icon:<ClipboardList className="w-4 h-4 text-blue-500"/> },
          { label:"Overdue",       value:overdueTasks.length, color:"text-red-600",    bg:"bg-red-50 border-red-100",     icon:<AlertTriangle className="w-4 h-4 text-red-500"/> },
          { label:"Open Findings", value:openFindings.length, color:"text-orange-600", bg:"bg-orange-50 border-orange-100",icon:<Flag className="w-4 h-4 text-orange-500"/> },
          { label:"Deadlines",     value:pendingEvents.length,color:"text-amber-600",  bg:"bg-amber-50 border-amber-100", icon:<CalendarDays className="w-4 h-4 text-amber-500"/> },
          { label:"Open Queries",  value:openQueries.length,  color:"text-indigo-600", bg:"bg-indigo-50 border-indigo-100",icon:<MessageSquare className="w-4 h-4 text-indigo-500"/> },
          { label:"WPs Approved",  value:approvedWPs,         color:"text-emerald-600",bg:"bg-emerald-50 border-emerald-100",icon:<BookOpen className="w-4 h-4 text-emerald-500"/> },
        ].map(k => (
          <div key={k.label} className={cn("rounded-xl border px-3 py-2.5 flex items-center gap-2.5", k.bg)}>
            <div className="p-1.5 bg-white rounded-lg shadow-sm shrink-0">{k.icon}</div>
            <div>
              <p className={cn("text-lg font-bold leading-none", k.color)}>{k.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
        {(["overview","tasks","findings","compliance","queries","working_papers"] as const).map(t => {
          const labels: Record<DetailTab,string> = { overview:"Overview", tasks:"Tasks", findings:"Findings", compliance:"Compliance", queries:"Queries", working_papers:"Working Papers" };
          const badge: Partial<Record<DetailTab,number>> = { tasks:openTasks.length||0, findings:openFindings.length||0, queries:openQueries.length||0 };
          return (
            <button key={t} onClick={() => setDetailTab(t)}
              className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                tab === t ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")}>
              {labels[t]}
              {(badge[t] ?? 0) > 0 && <span className="ml-1.5 bg-violet-100 text-violet-700 text-xs rounded-full px-1.5">{badge[t]}</span>}
            </button>
          );
        })}
      </div>

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Progress rings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Engagement Progress</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label:"Tasks Complete",   pct:taskPct,  color:"#7c3aed", total:tasksList.length,    done:tasksList.filter(t=>t.status==="completed").length },
                { label:"Findings Resolved",pct:findPct,  color:"#ea580c", total:findingsList.length,  done:findingsList.filter(f=>["resolved","closed"].includes(f.status)).length },
                { label:"Queries Closed",   pct:queryPct, color:"#4f46e5", total:queriesList.length,   done:queriesList.filter(q=>q.status==="closed").length },
                { label:"WPs Approved",     pct:wpPct,    color:"#059669", total:wpsList.length,       done:approvedWPs },
              ].map(item => (
                <div key={item.label} className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <Ring pct={item.pct} color={item.color}/>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">{item.pct}%</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-700">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.done}/{item.total}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Phase tasks */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Tasks by Phase</h3>
                <button onClick={() => setDetailTab("tasks")} className="text-xs text-violet-600 hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50">
                {tasksByPhase.map(p => {
                  const done = p.tasks.filter(t => t.status === "completed").length;
                  const pct  = p.tasks.length > 0 ? Math.round((done/p.tasks.length)*100) : 0;
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", p.color)}/>
                      <span className="text-sm font-medium text-gray-700 w-24 shrink-0">{p.label}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", p.color)} style={{ width:`${pct}%` }}/>
                      </div>
                      <span className="text-xs text-gray-400 w-16 text-right shrink-0">{done}/{p.tasks.length}</span>
                    </div>
                  );
                })}
                {tasksList.length === 0 && <div className="py-8 text-center text-sm text-gray-400">No tasks yet</div>}
              </div>
            </div>

            {/* Recent queries */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Recent Queries</h3>
                <button onClick={() => setDetailTab("queries")} className="text-xs text-violet-600 hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50">
                {queriesList.slice(0,5).map(q => {
                  const sc = QUERY_STATUS_CFG[q.status] ?? QUERY_STATUS_CFG.raised;
                  return (
                    <div key={q.id} className="flex items-center gap-3 px-5 py-3">
                      <MessageSquare className="w-4 h-4 text-gray-300 shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{q.title}</p>
                        <p className="text-xs text-gray-400">{QUERY_TYPES.find(x=>x.value===q.queryType)?.label ?? q.queryType}</p>
                      </div>
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", sc.color)}>{sc.label}</span>
                    </div>
                  );
                })}
                {queriesList.length === 0 && <div className="py-8 text-center text-sm text-gray-400">No queries yet. <button onClick={openNewQuery} className="text-violet-600 hover:underline">Raise one</button></div>}
              </div>
            </div>

            {/* Recent findings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Recent Findings</h3>
                <button onClick={() => setDetailTab("findings")} className="text-xs text-violet-600 hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50">
                {findingsList.slice(0,5).map(f => {
                  const sev = SEV_CFG[f.severity] ?? SEV_CFG.medium;
                  return (
                    <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", sev.dot)}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{f.title}</p>
                        <p className="text-xs text-gray-400">{f.category} · {sev.label}</p>
                      </div>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border shrink-0", FINDING_STATUS_CFG[f.status]??"")}>{f.status.replace("_"," ")}</span>
                    </div>
                  );
                })}
                {findingsList.length === 0 && <div className="py-8 text-center text-sm text-gray-400">No findings yet</div>}
              </div>
            </div>

            {/* Upcoming deadlines */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Upcoming Deadlines</h3>
                <button onClick={() => setDetailTab("compliance")} className="text-xs text-violet-600 hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50">
                {pendingEvents.slice(0,5).map((e:any) => {
                  const isOverdue = e.dueDate < today;
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                      <CalendarDays className={cn("w-4 h-4 shrink-0", isOverdue ? "text-red-500" : "text-amber-500")}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{e.title}</p>
                        <p className={cn("text-xs", isOverdue ? "text-red-600 font-semibold" : "text-gray-400")}>Due: {fmtDate(e.dueDate)}</p>
                      </div>
                      {isOverdue && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">Overdue</span>}
                    </div>
                  );
                })}
                {pendingEvents.length === 0 && <div className="py-8 text-center text-sm text-gray-400">No pending deadlines</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TASKS TAB ═══════════ */}
      {tab === "tasks" && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            {["", ...PHASES.slice(0,4).map(p=>p.id)].map(p => {
              const ph = PHASES.find(x=>x.id===p);
              const count = p==="" ? tasksList.length : tasksList.filter(t=>(t.phase??"planning")===p).length;
              return (
                <button key={p} onClick={()=>setPhaseFilter(p)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    phaseFilter===p ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-500 border-gray-200 hover:border-violet-300")}>
                  {ph && <div className={cn("w-1.5 h-1.5 rounded-full", ph.color)}/>}
                  {p==="" ? "All" : ph?.label}
                  <span className="opacity-70">{count}</span>
                </button>
              );
            })}
            <Button size="sm" className="ml-auto rounded-xl bg-violet-600 hover:bg-violet-700 h-8" onClick={()=>openNewTask(phaseFilter||"planning")}>
              <Plus className="w-3.5 h-3.5 mr-1"/>New Task
            </Button>
          </div>
          {(phaseFilter ? PHASES.filter(p=>p.id===phaseFilter) : PHASES.slice(0,4)).map(phase => {
            const phaseTasks = tasksList.filter(t=>(t.phase??"planning")===phase.id);
            if (phaseTasks.length===0 && phaseFilter) return null;
            return (
              <div key={phase.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", phase.color)}/>
                  <h3 className="text-sm font-semibold text-gray-700">{phase.label}</h3>
                  <span className="text-xs text-gray-400">{phaseTasks.length} task{phaseTasks.length!==1?"s":""}</span>
                  <button onClick={()=>openNewTask(phase.id)} className="ml-auto text-xs text-violet-600 hover:underline flex items-center gap-0.5"><Plus className="w-3 h-3"/>Add</button>
                </div>
                {phaseTasks.length===0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-center text-sm text-gray-400">
                    No {phase.label} tasks. <button onClick={()=>openNewTask(phase.id)} className="text-violet-600 hover:underline">Add one</button>
                  </div>
                ) : phaseTasks.map((t:any) => {
                  const isOverdue = t.dueDate && t.dueDate < today && !["completed","archived"].includes(t.status);
                  const sc = TASK_STATUS_CFG[t.status] ?? { label:t.status, color:"bg-gray-100 text-gray-600" };
                  const nextStatus = STATUS_NEXT[t.status];
                  const nextLabel  = nextStatus ? TASK_STATUS_CFG[nextStatus]?.label : null;
                  return (
                    <div key={t.id} className={cn("bg-white border rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm",
                      isOverdue ? "border-red-200 bg-red-50/20" : "border-gray-200")}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                          {isOverdue && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">OVERDUE</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", sc.color)}>{sc.label}</span>
                          <span className="text-xs text-gray-400">{TASK_TYPE_LABELS[t.taskType]??t.taskType}</span>
                          {t.assignee && <span className="text-xs text-gray-400">· {t.assignee}</span>}
                          {t.dueDate  && <span className={cn("text-xs", isOverdue ? "text-red-600 font-semibold" : "text-gray-400")}>· {fmtDate(t.dueDate)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {nextLabel && (
                          <button onClick={()=>doAdvanceStatus(t)}
                            className="h-7 px-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold border border-violet-200 flex items-center gap-1 transition-colors">
                            <ChevronRight className="w-3 h-3"/>→ {nextLabel}
                          </button>
                        )}
                        <button onClick={()=>openEditTask(t)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════ FINDINGS TAB ═══════════ */}
      {tab === "findings" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{findingsList.length} findings · {openFindings.length} open</p>
            <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={openNewFinding}><Plus className="w-3.5 h-3.5 mr-1"/>Add Finding</Button>
          </div>
          {findingsList.length===0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
              <Flag className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
              <p className="text-sm text-gray-400 mb-3">No findings recorded yet</p>
              <Button size="sm" onClick={openNewFinding} className="rounded-xl bg-violet-600 hover:bg-violet-700"><Plus className="w-3.5 h-3.5 mr-1"/>Record First Finding</Button>
            </div>
          ) : findingsList.map(f => {
            const sev = SEV_CFG[f.severity] ?? SEV_CFG.medium;
            return (
              <div key={f.id} className={cn("bg-white border rounded-xl px-5 py-4 shadow-sm flex items-start gap-4",
                f.severity==="critical" ? "border-red-200" : f.severity==="high" ? "border-orange-200" : "border-gray-200")}>
                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", sev.dot)}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{f.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", sev.badge)}>{sev.label}</span>
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", FINDING_STATUS_CFG[f.status]??"")}>{f.status.replace("_"," ")}</span>
                        <span className="text-xs text-gray-400">{CATEGORIES.find(c=>c.value===f.category)?.label??f.category}</span>
                      </div>
                      {f.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{f.description}</p>}
                    </div>
                    <button onClick={()=>openEditFinding(f)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 shrink-0"><Pencil className="w-3.5 h-3.5"/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════ COMPLIANCE TAB ═══════════ */}
      {tab === "compliance" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">{eventsList.length} events · {pendingEvents.length} pending</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50" onClick={()=>setAutoGenDlg(true)}>
                <Sparkles className="w-3.5 h-3.5 mr-1"/>Auto-generate Deadlines
              </Button>
              <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={()=>setEventDlg({open:true,form:emptyEvent})}><Plus className="w-3.5 h-3.5 mr-1"/>Add Event</Button>
            </div>
          </div>
          {eventsList.length===0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
              <p className="text-sm text-gray-400 mb-3">No compliance events</p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" className="rounded-xl border-violet-200 text-violet-700" onClick={()=>setAutoGenDlg(true)}><Sparkles className="w-3.5 h-3.5 mr-1"/>Auto-generate</Button>
                <Button size="sm" onClick={()=>setEventDlg({open:true,form:emptyEvent})} className="rounded-xl bg-violet-600 hover:bg-violet-700"><Plus className="w-3.5 h-3.5 mr-1"/>Add Event</Button>
              </div>
            </div>
          ) : eventsList.map((e:any) => {
            const isOverdue = e.status==="pending" && e.dueDate < today;
            const isDone    = e.status==="filed";
            return (
              <div key={e.id} className={cn("bg-white border rounded-xl px-5 py-4 shadow-sm flex items-center gap-4",
                isOverdue ? "border-red-200 bg-red-50/10" : isDone ? "border-emerald-200 bg-emerald-50/10" : "border-gray-200")}>
                <CalendarDays className={cn("w-5 h-5 shrink-0", isOverdue ? "text-red-500" : isDone ? "text-emerald-500" : "text-amber-500")}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{e.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>{e.eventType.toUpperCase()}</span>
                    {e.period && <span>· {e.period}</span>}
                    <span className={cn(isOverdue?"text-red-600 font-semibold":"")}>· Due: {fmtDate(e.dueDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isDone && (
                    <button onClick={()=>markFiled(e)}
                      className="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3"/>Mark Filed
                    </button>
                  )}
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border",
                    isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    isOverdue ? "bg-red-50 text-red-600 border-red-200" :
                               "bg-amber-50 text-amber-600 border-amber-200")}>
                    {isDone ? "Filed" : isOverdue ? "Overdue" : "Pending"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════ QUERIES TAB ═══════════ */}
      {tab === "queries" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">{queriesList.length} queries · {openQueries.length} open</p>
            <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={openNewQuery}><Plus className="w-3.5 h-3.5 mr-1"/>Raise Query</Button>
          </div>
          {queriesList.length===0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
              <p className="text-sm text-gray-400 mb-3">No queries raised yet</p>
              <Button size="sm" onClick={openNewQuery} className="rounded-xl bg-violet-600 hover:bg-violet-700"><Plus className="w-3.5 h-3.5 mr-1"/>Raise First Query</Button>
            </div>
          ) : queriesList.map(q => {
            const sc      = QUERY_STATUS_CFG[q.status] ?? QUERY_STATUS_CFG.raised;
            const nextSt  = QUERY_STATUS_NEXT[q.status];
            const nextLbl = nextSt ? QUERY_STATUS_CFG[nextSt]?.label : null;
            const isExpanded = expandedQuery === q.id;
            return (
              <div key={q.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-start gap-3 px-5 py-4">
                  <MessageSquare className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {q.queryNo && <p className="text-[10px] text-gray-400 font-mono mb-0.5">#{q.queryNo}</p>}
                        <p className="text-sm font-semibold text-gray-800">{q.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", sc.color)}>{sc.label}</span>
                          <span className="text-xs text-gray-400">{QUERY_TYPES.find(x=>x.value===q.queryType)?.label??q.queryType}</span>
                          {q.dueDate && <span className={cn("text-xs", q.dueDate<today && q.status!=="closed" ? "text-red-600 font-semibold":"text-gray-400")}>· Due: {fmtDate(q.dueDate)}</span>}
                          {q.assignedTo && <span className="text-xs text-gray-400">· {q.assignedTo}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {nextLbl && (
                          <button onClick={()=>advanceQuery(q)}
                            className="h-7 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 flex items-center gap-1">
                            <ChevronRight className="w-3 h-3"/>→ {nextLbl}
                          </button>
                        )}
                        <button onClick={()=>openEditQuery(q)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5"/></button>
                        <button onClick={()=>setExpandedQuery(isExpanded ? null : q.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 space-y-3">
                    {q.description && <div><p className="text-xs font-semibold text-gray-500 mb-1">Query Description</p><p className="text-sm text-gray-700">{q.description}</p></div>}
                    {q.clientResponse && (
                      <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-teal-700 mb-1">Client Response</p>
                        <p className="text-sm text-teal-900">{q.clientResponse}</p>
                      </div>
                    )}
                    {q.auditorNote && (
                      <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-violet-700 mb-1">Auditor's Note</p>
                        <p className="text-sm text-violet-900">{q.auditorNote}</p>
                      </div>
                    )}
                    {!q.description && !q.clientResponse && !q.auditorNote && (
                      <p className="text-xs text-gray-400 text-center py-2">No additional details</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════ WORKING PAPERS TAB ═══════════ */}
      {tab === "working_papers" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">{wpsList.length} working papers · {approvedWPs} approved</p>
            <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={()=>openNewWP()}><Plus className="w-3.5 h-3.5 mr-1"/>New Working Paper</Button>
          </div>
          {wpsList.length===0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
              <p className="text-sm text-gray-400 mb-3">No working papers yet</p>
              <Button size="sm" onClick={()=>openNewWP()} className="rounded-xl bg-violet-600 hover:bg-violet-700"><Plus className="w-3.5 h-3.5 mr-1"/>Create First WP</Button>
            </div>
          ) : WP_SECTIONS.map(section => {
            const sectionWPs = wpsList.filter(wp => wp.section === section.id);
            if (sectionWPs.length === 0) return null;
            const approved = sectionWPs.filter(wp => wp.status === "approved").length;
            const pct = Math.round((approved/sectionWPs.length)*100);
            return (
              <div key={section.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-violet-400 shrink-0"/>
                  <h3 className="text-sm font-semibold text-gray-700">{section.label}</h3>
                  <span className="text-xs text-gray-400">{sectionWPs.length} papers</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width:`${pct}%`}}/>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{approved}/{sectionWPs.length} approved</span>
                  <button onClick={()=>openNewWP(section.id)} className="text-xs text-violet-600 hover:underline flex items-center gap-0.5 shrink-0"><Plus className="w-3 h-3"/>Add</button>
                </div>
                {sectionWPs.map((wp:any) => {
                  const sc      = WP_STATUS_CFG[wp.status] ?? WP_STATUS_CFG.draft;
                  const nextSt  = WP_STATUS_NEXT[wp.status];
                  const nextLbl = nextSt ? WP_STATUS_CFG[nextSt]?.label : null;
                  const isExp   = expandedWP === wp.id;
                  return (
                    <div key={wp.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="flex items-start gap-3 px-5 py-4">
                        <FileText className="w-4 h-4 text-gray-300 mt-0.5 shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              {wp.wpNo && <p className="text-[10px] text-gray-400 font-mono mb-0.5">{wp.wpNo}</p>}
                              <p className="text-sm font-semibold text-gray-800">{wp.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", sc.color)}>{sc.label}</span>
                                {wp.preparedBy && <span className="text-xs text-gray-400">Prepared: {wp.preparedBy}</span>}
                                {wp.reviewedBy && <span className="text-xs text-gray-400">· Reviewed: {wp.reviewedBy}</span>}
                                {wp.period && <span className="text-xs text-gray-400">· {wp.period}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {nextLbl && (
                                <button onClick={()=>advanceWP(wp)}
                                  className="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 flex items-center gap-1">
                                  <ChevronRight className="w-3 h-3"/>→ {nextLbl}
                                </button>
                              )}
                              <button onClick={()=>openEditWP(wp)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5"/></button>
                              <button onClick={()=>setExpandedWP(isExp?null:wp.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                                {isExp ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {isExp && (
                        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {wp.description && <div><p className="text-xs font-semibold text-gray-500 mb-1">Description</p><p className="text-sm text-gray-700">{wp.description}</p></div>}
                          {wp.riskArea    && <div><p className="text-xs font-semibold text-gray-500 mb-1">Risk Area</p><p className="text-sm text-gray-700">{wp.riskArea}</p></div>}
                          {wp.assertions  && <div><p className="text-xs font-semibold text-gray-500 mb-1">Assertions</p><p className="text-sm text-gray-700">{wp.assertions}</p></div>}
                          {wp.conclusion  && <div className="md:col-span-2 bg-emerald-50 border border-emerald-100 rounded-lg p-3"><p className="text-xs font-semibold text-emerald-700 mb-1">Conclusion</p><p className="text-sm text-emerald-900">{wp.conclusion}</p></div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {/* Add buttons per section for empty sections */}
          <div className="border-2 border-dashed border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2 font-semibold">Add working paper to section:</p>
            <div className="flex flex-wrap gap-2">
              {WP_SECTIONS.map(s => (
                <button key={s.id} onClick={()=>openNewWP(s.id)}
                  className="text-xs px-3 py-1.5 rounded-full border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors">
                  + {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ DIALOGS ══════════════════ */}

      {/* Task dialog */}
      <Dialog open={taskDlg.open} onOpenChange={o=>setTaskDlg(d=>({...d,open:o}))}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>{taskDlg.edit?"Edit Task":"New Task"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Title *</Label><Input value={taskDlg.form.title} onChange={e=>setTaskDlg(d=>({...d,form:{...d.form,title:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Phase</Label>
              <Select value={taskDlg.form.phase} onValueChange={v=>setTaskDlg(d=>({...d,form:{...d.form,phase:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{PHASES.slice(0,4).map(p=><SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Type</Label>
              <Select value={taskDlg.form.taskType} onValueChange={v=>setTaskDlg(d=>({...d,form:{...d.form,taskType:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{TASK_TYPES.map(t=><SelectItem key={t} value={t}>{TASK_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Priority</Label>
              <Select value={taskDlg.form.priority} onValueChange={v=>setTaskDlg(d=>({...d,form:{...d.form,priority:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Due Date</Label><Input type="date" value={taskDlg.form.dueDate} onChange={e=>setTaskDlg(d=>({...d,form:{...d.form,dueDate:e.target.value}}))} className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Assignee</Label><Input value={taskDlg.form.assignee} onChange={e=>setTaskDlg(d=>({...d,form:{...d.form,assignee:e.target.value}}))} className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Description</Label><Textarea value={taskDlg.form.description} onChange={e=>setTaskDlg(d=>({...d,form:{...d.form,description:e.target.value}}))} rows={2} className="rounded-xl resize-none text-sm"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={()=>setTaskDlg(d=>({...d,open:false}))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveTask}>{taskDlg.edit?"Save":"Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finding dialog */}
      <Dialog open={findDlg.open} onOpenChange={o=>setFindDlg(d=>({...d,open:o}))}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>{findDlg.edit?"Edit Finding":"Record Finding"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Title *</Label><Input value={findDlg.form.title} onChange={e=>setFindDlg(d=>({...d,form:{...d.form,title:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Category</Label>
              <Select value={findDlg.form.category} onValueChange={v=>setFindDlg(d=>({...d,form:{...d.form,category:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c=><SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Severity</Label>
              <Select value={findDlg.form.severity} onValueChange={v=>setFindDlg(d=>({...d,form:{...d.form,severity:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Status</Label>
              <Select value={findDlg.form.status} onValueChange={v=>setFindDlg(d=>({...d,form:{...d.form,status:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Period</Label><Input value={findDlg.form.period} onChange={e=>setFindDlg(d=>({...d,form:{...d.form,period:e.target.value}}))} placeholder="2025-26 Q3" className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Description</Label><Textarea value={findDlg.form.description} onChange={e=>setFindDlg(d=>({...d,form:{...d.form,description:e.target.value}}))} rows={2} className="rounded-xl resize-none text-sm"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Recommendation</Label><Textarea value={findDlg.form.recommendation} onChange={e=>setFindDlg(d=>({...d,form:{...d.form,recommendation:e.target.value}}))} rows={2} className="rounded-xl resize-none text-sm"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={()=>setFindDlg(d=>({...d,open:false}))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveFinding}>{findDlg.edit?"Save":"Record"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compliance event dialog */}
      <Dialog open={eventDlg.open} onOpenChange={o=>setEventDlg(d=>({...d,open:o}))}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Add Compliance Event</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs font-semibold">Title *</Label><Input value={eventDlg.form.title} onChange={e=>setEventDlg(d=>({...d,form:{...d.form,title:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Type</Label>
              <Select value={eventDlg.form.eventType} onValueChange={v=>setEventDlg(d=>({...d,form:{...d.form,eventType:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Period</Label><Input value={eventDlg.form.period} onChange={e=>setEventDlg(d=>({...d,form:{...d.form,period:e.target.value}}))} placeholder="2026-07" className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Due Date *</Label><Input type="date" value={eventDlg.form.dueDate} onChange={e=>setEventDlg(d=>({...d,form:{...d.form,dueDate:e.target.value}}))} className="rounded-xl"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={()=>setEventDlg(d=>({...d,open:false}))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveEvent}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-generate compliance dialog */}
      <Dialog open={autoGenDlg} onOpenChange={setAutoGenDlg}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-violet-500"/>Auto-generate Compliance Deadlines</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Base Period</Label>
              <Input type="month" value={autoGenPeriod} onChange={e=>setAutoGenPeriod(e.target.value)} className="rounded-xl"/>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-2 block">Applicable Laws</Label>
              <div className="space-y-2">
                {[
                  { key:"gst",        label:"GST (GSTR-1, GSTR-3B)",             count:2 },
                  { key:"tds",        label:"TDS (Payment + Return)",             count:2 },
                  { key:"income_tax", label:"Income Tax (Advance Tax + ITR)",     count:5 },
                  { key:"roc",        label:"ROC (Annual Return + Fin. Stmt.)",   count:2 },
                  { key:"pf_esi",     label:"PF & ESI Payments",                 count:2 },
                ].map(opt => (
                  <label key={opt.key} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                    autoGenSelected[opt.key] ? "border-violet-300 bg-violet-50" : "border-gray-200 bg-white hover:border-gray-300")}>
                    <input type="checkbox" checked={autoGenSelected[opt.key]??false}
                      onChange={e=>setAutoGenSelected(s=>({...s,[opt.key]:e.target.checked}))} className="accent-violet-600"/>
                    <span className="text-sm font-medium text-gray-700 flex-1">{opt.label}</span>
                    <span className="text-xs text-gray-400">{opt.count} events</span>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
              Events will be generated starting from the selected period. Due dates are calculated from standard statutory timelines.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={()=>setAutoGenDlg(false)}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={runAutoGenerate}><Sparkles className="w-3.5 h-3.5 mr-1"/>Generate Deadlines</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Query dialog */}
      <Dialog open={queryDlg.open} onOpenChange={o=>setQueryDlg(d=>({...d,open:o}))}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>{queryDlg.edit?"Edit Query":"Raise Query"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1"><Label className="text-xs font-semibold">Query No.</Label><Input value={queryDlg.form.queryNo} onChange={e=>setQueryDlg(d=>({...d,form:{...d.form,queryNo:e.target.value}}))} placeholder="Q-001" className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Type</Label>
              <Select value={queryDlg.form.queryType} onValueChange={v=>setQueryDlg(d=>({...d,form:{...d.form,queryType:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{QUERY_TYPES.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Title *</Label><Input value={queryDlg.form.title} onChange={e=>setQueryDlg(d=>({...d,form:{...d.form,title:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Priority</Label>
              <Select value={queryDlg.form.priority} onValueChange={v=>setQueryDlg(d=>({...d,form:{...d.form,priority:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Due Date</Label><Input type="date" value={queryDlg.form.dueDate} onChange={e=>setQueryDlg(d=>({...d,form:{...d.form,dueDate:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Raised By</Label><Input value={queryDlg.form.raisedBy} onChange={e=>setQueryDlg(d=>({...d,form:{...d.form,raisedBy:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Assigned To</Label><Input value={queryDlg.form.assignedTo} onChange={e=>setQueryDlg(d=>({...d,form:{...d.form,assignedTo:e.target.value}}))} className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Description</Label><Textarea value={queryDlg.form.description} onChange={e=>setQueryDlg(d=>({...d,form:{...d.form,description:e.target.value}}))} rows={2} className="rounded-xl resize-none text-sm"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Client Response</Label><Textarea value={queryDlg.form.clientResponse} onChange={e=>setQueryDlg(d=>({...d,form:{...d.form,clientResponse:e.target.value}}))} rows={2} className="rounded-xl resize-none text-sm" placeholder="Response received from client…"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Auditor's Note</Label><Textarea value={queryDlg.form.auditorNote} onChange={e=>setQueryDlg(d=>({...d,form:{...d.form,auditorNote:e.target.value}}))} rows={2} className="rounded-xl resize-none text-sm"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={()=>setQueryDlg(d=>({...d,open:false}))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveQuery}>{queryDlg.edit?"Save":"Raise"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Working paper dialog */}
      <Dialog open={wpDlg.open} onOpenChange={o=>setWpDlg(d=>({...d,open:o}))}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>{wpDlg.edit?"Edit Working Paper":"New Working Paper"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1"><Label className="text-xs font-semibold">WP No.</Label><Input value={wpDlg.form.wpNo} onChange={e=>setWpDlg(d=>({...d,form:{...d.form,wpNo:e.target.value}}))} placeholder="WP-101" className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Section</Label>
              <Select value={wpDlg.form.section} onValueChange={v=>setWpDlg(d=>({...d,form:{...d.form,section:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{WP_SECTIONS.map(s=><SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Title *</Label><Input value={wpDlg.form.title} onChange={e=>setWpDlg(d=>({...d,form:{...d.form,title:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Prepared By</Label><Input value={wpDlg.form.preparedBy} onChange={e=>setWpDlg(d=>({...d,form:{...d.form,preparedBy:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Reviewed By</Label><Input value={wpDlg.form.reviewedBy} onChange={e=>setWpDlg(d=>({...d,form:{...d.form,reviewedBy:e.target.value}}))} className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Status</Label>
              <Select value={wpDlg.form.status} onValueChange={v=>setWpDlg(d=>({...d,form:{...d.form,status:v}}))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{Object.entries(WP_STATUS_CFG).map(([k,v])=><SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Period</Label><Input value={wpDlg.form.period} onChange={e=>setWpDlg(d=>({...d,form:{...d.form,period:e.target.value}}))} placeholder="2026-Q1" className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Risk Area</Label><Input value={wpDlg.form.riskArea} onChange={e=>setWpDlg(d=>({...d,form:{...d.form,riskArea:e.target.value}}))} className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Description / Scope</Label><Textarea value={wpDlg.form.description} onChange={e=>setWpDlg(d=>({...d,form:{...d.form,description:e.target.value}}))} rows={2} className="rounded-xl resize-none text-sm"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Assertions</Label><Input value={wpDlg.form.assertions} onChange={e=>setWpDlg(d=>({...d,form:{...d.form,assertions:e.target.value}}))} placeholder="Completeness, Accuracy, Existence…" className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Conclusion</Label><Textarea value={wpDlg.form.conclusion} onChange={e=>setWpDlg(d=>({...d,form:{...d.form,conclusion:e.target.value}}))} rows={2} className="rounded-xl resize-none text-sm"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={()=>setWpDlg(d=>({...d,open:false}))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveWP}>{wpDlg.edit?"Save":"Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
