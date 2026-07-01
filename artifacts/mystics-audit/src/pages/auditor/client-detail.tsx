import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetAuditClient, useUpdateAuditClient,
  useListAuditTasks, useCreateAuditTask, useUpdateAuditTask, useDeleteAuditTask, useUpdateAuditTaskStatus,
  useListAuditFindings, useCreateAuditFinding, useUpdateAuditFinding,
  useListComplianceEvents, useCreateComplianceEvent,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, CheckCircle2,
  Flag, ClipboardList, CalendarDays, AlertTriangle, Plus, ChevronRight,
  Pencil, Trash2, Clock, CheckSquare, FileText,
} from "lucide-react";

/* ── constants ── */
const today = new Date().toISOString().split("T")[0];
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const PHASES = [
  { id: "planning",   label: "Planning",   icon: <FileText className="w-4 h-4" />,     color: "bg-blue-500" },
  { id: "fieldwork",  label: "Fieldwork",  icon: <CheckSquare className="w-4 h-4" />,  color: "bg-amber-500" },
  { id: "review",     label: "Review",     icon: <Flag className="w-4 h-4" />,          color: "bg-violet-500" },
  { id: "reporting",  label: "Reporting",  icon: <ClipboardList className="w-4 h-4" />, color: "bg-emerald-500" },
  { id: "closed",     label: "Closed",     icon: <CheckCircle2 className="w-4 h-4" />,  color: "bg-gray-400" },
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

const TASK_TYPES = ["document_request", "compliance_task", "query", "review", "custom"];
const TASK_TYPE_LABELS: Record<string, string> = {
  document_request: "Document Request", compliance_task: "Compliance Task",
  query: "Query", review: "Review", custom: "Custom",
};
const EVENT_TYPES = [
  { value: "gstr1", label: "GSTR-1" }, { value: "gstr3b", label: "GSTR-3B" },
  { value: "tds_payment", label: "TDS Payment" }, { value: "tds_return", label: "TDS Return" },
  { value: "itr", label: "ITR Filing" }, { value: "roc", label: "ROC Filing" },
  { value: "advance_tax", label: "Advance Tax" }, { value: "custom", label: "Custom" },
];
const CATEGORIES = [
  { value: "financial", label: "Financial" }, { value: "compliance", label: "Compliance" },
  { value: "operational", label: "Operational" }, { value: "it_security", label: "IT Security" },
  { value: "tax", label: "Tax" }, { value: "other", label: "Other" },
];

type DetailTab = "overview" | "tasks" | "findings" | "compliance";

function parseTags(raw: string) { try { return JSON.parse(raw) ?? []; } catch { return []; } }

export default function AuditClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const { toast } = useToast();
  const [tab, setDetailTab] = useState<DetailTab>("overview");
  const [phaseFilter, setPhaseFilter] = useState("");

  /* ── data ── */
  const { data: client, refetch: refetchClient } = useGetAuditClient(clientId);
  const { data: tasks = [], refetch: refetchTasks }   = useListAuditTasks({ clientId } as any);
  const { data: findings = [], refetch: refetchFindings } = useListAuditFindings({ clientId } as any);
  const { data: events = [], refetch: refetchEvents }   = useListComplianceEvents({ clientId } as any);

  /* ── mutations ── */
  const updateClient  = useUpdateAuditClient();
  const createTask    = useCreateAuditTask();
  const updateTask    = useUpdateAuditTask();
  const deleteTask    = useDeleteAuditTask();
  const advanceStatus = useUpdateAuditTaskStatus();
  const createFinding = useCreateAuditFinding();
  const updateFinding = useUpdateAuditFinding();
  const createEvent   = useCreateComplianceEvent();

  /* ── derived ── */
  const c = client as any;
  const engs: string[] = c ? parseTags(c.engagementTypes ?? "[]") : [];
  const openTasks     = (tasks as any[]).filter(t => !["completed","archived"].includes(t.status));
  const overdueTasks  = (tasks as any[]).filter(t => t.dueDate && t.dueDate < today && !["completed","archived"].includes(t.status));
  const openFindings  = (findings as any[]).filter(f => f.status === "open" || f.status === "in_progress");
  const pendingEvents = (events as any[]).filter(e => e.status === "pending");
  const tasksByPhase  = PHASES.slice(0, 4).map(p => ({
    ...p,
    tasks: (tasks as any[]).filter(t => (t.phase ?? "planning") === p.id),
  }));

  /* ── phase update ── */
  function setEngagementPhase(phase: string) {
    if (!c) return;
    updateClient.mutate({ id: clientId, data: { ...c, engagementPhase: phase, engagementTypes: parseTags(c.engagementTypes ?? "[]") } } as any, {
      onSuccess: () => { toast({ title: `Phase updated to ${phase}` }); refetchClient(); },
    });
  }

  /* ── task dialog ── */
  const emptyTask = { title:"", taskType:"document_request", phase: "planning", priority:"medium", dueDate:"", assignee:"", description:"", instructions:"" };
  const [taskDlg, setTaskDlg] = useState<{ open: boolean; edit?: any; form: typeof emptyTask }>({ open: false, form: emptyTask });
  function openNewTask(phase = "planning") { setTaskDlg({ open: true, form: { ...emptyTask, phase } }); }
  function openEditTask(t: any) {
    setTaskDlg({ open: true, edit: t, form: {
      title: t.title, taskType: t.taskType, phase: t.phase ?? "planning",
      priority: t.priority, dueDate: t.dueDate ?? "", assignee: t.assignee ?? "",
      description: t.description ?? "", instructions: t.instructions ?? "",
    }});
  }
  function saveTask() {
    const { form, edit } = taskDlg;
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    const data: any = { ...form, clientId };
    if (edit) {
      updateTask.mutate({ id: edit.id, data } as any, {
        onSuccess: () => { toast({ title: "Task updated" }); setTaskDlg(d => ({ ...d, open: false })); refetchTasks(); },
      });
    } else {
      createTask.mutate({ data } as any, {
        onSuccess: () => { toast({ title: "Task created" }); setTaskDlg(d => ({ ...d, open: false })); refetchTasks(); },
      });
    }
  }
  function doAdvanceStatus(t: any) {
    const next = STATUS_NEXT[t.status];
    if (!next) return;
    advanceStatus.mutate({ id: t.id, data: { status: next } } as any, {
      onSuccess: () => { toast({ title: `Task → ${TASK_STATUS_CFG[next]?.label ?? next}` }); refetchTasks(); },
    });
  }

  /* ── finding dialog ── */
  const emptyFinding = { title:"", description:"", category:"compliance", severity:"medium", status:"open", recommendation:"", period:"", dueDate:"", raisedBy:"", assignedTo:"" };
  const [findDlg, setFindDlg] = useState<{ open: boolean; edit?: any; form: typeof emptyFinding }>({ open: false, form: emptyFinding });
  function openNewFinding() { setFindDlg({ open: true, form: emptyFinding }); }
  function openEditFinding(f: any) {
    setFindDlg({ open: true, edit: f, form: {
      title: f.title, description: f.description ?? "", category: f.category, severity: f.severity,
      status: f.status, recommendation: f.recommendation ?? "", period: f.period ?? "",
      dueDate: f.dueDate ?? "", raisedBy: f.raisedBy ?? "", assignedTo: f.assignedTo ?? "",
    }});
  }
  function saveFinding() {
    const { form, edit } = findDlg;
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    const data: any = { ...form, clientId };
    if (edit) {
      updateFinding.mutate({ id: edit.id, data } as any, {
        onSuccess: () => { toast({ title: "Finding updated" }); setFindDlg(d => ({ ...d, open: false })); refetchFindings(); },
      });
    } else {
      createFinding.mutate({ data } as any, {
        onSuccess: () => { toast({ title: "Finding recorded" }); setFindDlg(d => ({ ...d, open: false })); refetchFindings(); },
      });
    }
  }

  /* ── compliance event dialog ── */
  const emptyEvent = { title:"", eventType:"custom", period:"", dueDate:"", notes:"" };
  const [eventDlg, setEventDlg] = useState<{ open: boolean; form: typeof emptyEvent }>({ open: false, form: emptyEvent });
  function saveEvent() {
    const { form } = eventDlg;
    if (!form.title.trim() || !form.dueDate) { toast({ title: "Title and due date required", variant: "destructive" }); return; }
    createEvent.mutate({ data: { ...form, clientId } } as any, {
      onSuccess: () => { toast({ title: "Compliance event added" }); setEventDlg(d => ({ ...d, open: false })); refetchEvents(); },
    });
  }

  if (!c) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const currentPhaseIdx = PHASES.findIndex(p => p.id === (c.engagementPhase ?? "planning"));

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <Link href="/auditor">
          <Button variant="ghost" size="sm" className="rounded-xl shrink-0 mt-1">
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{c.name}</h1>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {c.gstin && <span className="text-xs font-mono text-gray-400">GSTIN: {c.gstin}</span>}
                    {c.pan  && <span className="text-xs font-mono text-gray-400">PAN: {c.pan}</span>}
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
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openNewTask()}><Plus className="w-3.5 h-3.5 mr-1"/>Task</Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={openNewFinding}><Flag className="w-3.5 h-3.5 mr-1"/>Finding</Button>
              <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={() => setEventDlg({ open: true, form: emptyEvent })}><CalendarDays className="w-3.5 h-3.5 mr-1"/>Compliance</Button>
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Audit Engagement Phase</h2>
          <span className="text-xs text-gray-400">Click to advance</span>
        </div>
        <div className="flex items-center gap-0 overflow-x-auto">
          {PHASES.map((phase, i) => {
            const isActive   = i === currentPhaseIdx;
            const isDone     = i < currentPhaseIdx;
            const isClickable = i === currentPhaseIdx + 1 || (currentPhaseIdx === PHASES.length - 1 && i === PHASES.length - 1);
            return (
              <div key={phase.id} className="flex items-center flex-1 min-w-0">
                <button
                  onClick={() => setEngagementPhase(phase.id)}
                  disabled={isDone || isActive}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center min-w-0",
                    isActive  ? "border-violet-500 bg-violet-50 shadow-sm" :
                    isDone    ? "border-emerald-300 bg-emerald-50 cursor-not-allowed" :
                    "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/30 cursor-pointer"
                  )}
                >
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white transition-colors",
                    isActive ? "bg-violet-500" : isDone ? "bg-emerald-500" : "bg-gray-200")}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-white">{phase.icon}</span>}
                  </div>
                  <span className={cn("text-xs font-semibold truncate max-w-full",
                    isActive ? "text-violet-700" : isDone ? "text-emerald-700" : "text-gray-400")}>{phase.label}</span>
                  <span className="text-xs text-gray-400">{tasksByPhase[i]?.tasks?.length ?? 0} tasks</span>
                </button>
                {i < PHASES.length - 1 && (
                  <div className={cn("h-0.5 w-4 shrink-0 mx-0.5", i < currentPhaseIdx ? "bg-emerald-400" : "bg-gray-200")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Open Tasks",     value: openTasks.length,    color: "text-blue-600",    bg: "bg-blue-50 border-blue-100",    icon: <ClipboardList className="w-4 h-4 text-blue-500" /> },
          { label: "Overdue",        value: overdueTasks.length, color: "text-red-600",     bg: "bg-red-50 border-red-100",      icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
          { label: "Open Findings",  value: openFindings.length, color: "text-orange-600",  bg: "bg-orange-50 border-orange-100",icon: <Flag className="w-4 h-4 text-orange-500" /> },
          { label: "Deadlines",      value: pendingEvents.length,color: "text-amber-600",   bg: "bg-amber-50 border-amber-100",  icon: <CalendarDays className="w-4 h-4 text-amber-500" /> },
        ].map(k => (
          <div key={k.label} className={cn("rounded-xl border px-4 py-3 flex items-center gap-3", k.bg)}>
            <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">{k.icon}</div>
            <div>
              <p className={cn("text-xl font-bold", k.color)}>{k.value}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["overview","tasks","findings","compliance"] as const).map(t => (
          <button key={t} onClick={() => setDetailTab(t)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
              tab === t ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")}>
            {t}
            {t === "tasks"    && openTasks.length > 0    && <span className="ml-1.5 bg-violet-100 text-violet-700 text-xs rounded-full px-1.5">{openTasks.length}</span>}
            {t === "findings" && openFindings.length > 0  && <span className="ml-1.5 bg-red-100 text-red-700 text-xs rounded-full px-1.5">{openFindings.length}</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Phase task summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Tasks by Phase</h3>
              <button onClick={() => setDetailTab("tasks")} className="text-xs text-violet-600 hover:underline">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {tasksByPhase.map(p => {
                const done = p.tasks.filter(t => t.status === "completed").length;
                const pct  = p.tasks.length > 0 ? Math.round((done / p.tasks.length) * 100) : 0;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", p.color)} />
                    <span className="text-sm font-medium text-gray-700 w-24 shrink-0">{p.label}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", p.color)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-20 text-right shrink-0">{done}/{p.tasks.length} done</span>
                  </div>
                );
              })}
              {(tasks as any[]).length === 0 && (
                <div className="py-10 text-center text-sm text-gray-400">
                  No tasks yet. <button onClick={() => openNewTask()} className="text-violet-600 hover:underline">Add one</button>
                </div>
              )}
            </div>
          </div>

          {/* Recent findings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Recent Findings</h3>
              <button onClick={() => setDetailTab("findings")} className="text-xs text-violet-600 hover:underline">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {(findings as any[]).slice(0, 6).map(f => {
                const sev = SEV_CFG[f.severity] ?? SEV_CFG.medium;
                return (
                  <div key={f.id} className="flex items-start gap-3 px-5 py-3">
                    <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", sev.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{f.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{f.category} · {sev.label}</p>
                    </div>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border shrink-0", FINDING_STATUS_CFG[f.status] ?? "")}>{f.status.replace("_", " ")}</span>
                  </div>
                );
              })}
              {(findings as any[]).length === 0 && (
                <div className="py-10 text-center text-sm text-gray-400">
                  No findings. <button onClick={openNewFinding} className="text-violet-600 hover:underline">Record one</button>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming compliance */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Compliance Deadlines</h3>
              <button onClick={() => setDetailTab("compliance")} className="text-xs text-violet-600 hover:underline">View all</button>
            </div>
            {pendingEvents.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No pending deadlines. <button onClick={() => setEventDlg({ open: true, form: emptyEvent })} className="text-violet-600 hover:underline">Add one</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {pendingEvents.slice(0, 6).map((e: any) => {
                  const isOverdue = e.dueDate < today;
                  return (
                    <div key={e.id} className={cn("flex items-start gap-3 px-5 py-4", isOverdue && "bg-red-50/30")}>
                      <CalendarDays className={cn("w-4 h-4 mt-0.5 shrink-0", isOverdue ? "text-red-500" : "text-amber-500")} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{e.title}</p>
                        <p className={cn("text-xs mt-0.5", isOverdue ? "text-red-600 font-semibold" : "text-gray-400")}>
                          {isOverdue ? "OVERDUE · " : "Due: "}{fmtDate(e.dueDate)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TASKS TAB ── */}
      {tab === "tasks" && (
        <div className="space-y-5">
          {/* Phase filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {["", ...PHASES.slice(0, 4).map(p => p.id)].map(p => {
              const ph = PHASES.find(x => x.id === p);
              const count = p === "" ? (tasks as any[]).length : (tasks as any[]).filter(t => (t.phase ?? "planning") === p).length;
              return (
                <button key={p} onClick={() => setPhaseFilter(p)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    phaseFilter === p ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-500 border-gray-200 hover:border-violet-300")}>
                  {ph && <div className={cn("w-1.5 h-1.5 rounded-full", ph.color)} />}
                  {p === "" ? "All Phases" : ph?.label}
                  <span className="opacity-70">{count}</span>
                </button>
              );
            })}
            <Button size="sm" className="ml-auto rounded-xl bg-violet-600 hover:bg-violet-700 h-8" onClick={() => openNewTask(phaseFilter || "planning")}>
              <Plus className="w-3.5 h-3.5 mr-1"/>New Task
            </Button>
          </div>

          {/* Tasks grouped by phase */}
          {(phaseFilter ? PHASES.filter(p => p.id === phaseFilter) : PHASES.slice(0, 4)).map(phase => {
            const phaseTasks = (tasks as any[]).filter(t => (t.phase ?? "planning") === phase.id);
            if (phaseTasks.length === 0 && phaseFilter) return null;
            return (
              <div key={phase.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", phase.color)} />
                  <h3 className="text-sm font-semibold text-gray-700">{phase.label}</h3>
                  <span className="text-xs text-gray-400">{phaseTasks.length} task{phaseTasks.length !== 1 ? "s" : ""}</span>
                  <button onClick={() => openNewTask(phase.id)} className="ml-auto text-xs text-violet-600 hover:underline flex items-center gap-0.5">
                    <Plus className="w-3 h-3"/>Add
                  </button>
                </div>
                {phaseTasks.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-center text-sm text-gray-400">
                    No {phase.label} tasks. <button onClick={() => openNewTask(phase.id)} className="text-violet-600 hover:underline">Add one</button>
                  </div>
                ) : phaseTasks.map((t: any) => {
                  const isOverdue = t.dueDate && t.dueDate < today && !["completed","archived"].includes(t.status);
                  const sc = TASK_STATUS_CFG[t.status] ?? { label: t.status, color: "bg-gray-100 text-gray-600" };
                  const nextStatus = STATUS_NEXT[t.status];
                  const nextLabel  = nextStatus ? TASK_STATUS_CFG[nextStatus]?.label : null;
                  return (
                    <div key={t.id} className={cn("bg-white border rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm hover:shadow transition-shadow",
                      isOverdue ? "border-red-200 bg-red-50/20" : "border-gray-200")}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                          {isOverdue && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Overdue</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", sc.color)}>{sc.label}</span>
                          <span className="text-xs text-gray-400">{TASK_TYPE_LABELS[t.taskType] ?? t.taskType}</span>
                          {t.assignee && <span className="text-xs text-gray-400">· {t.assignee}</span>}
                          {t.dueDate  && <span className={cn("text-xs", isOverdue ? "text-red-600 font-semibold" : "text-gray-400")}>· {fmtDate(t.dueDate)}</span>}
                        </div>
                        {t.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{t.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {nextLabel && (
                          <button onClick={() => doAdvanceStatus(t)}
                            className="h-7 px-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold border border-violet-200 flex items-center gap-1 transition-colors">
                            <ChevronRight className="w-3 h-3"/>→ {nextLabel}
                          </button>
                        )}
                        <button onClick={() => openEditTask(t)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FINDINGS TAB ── */}
      {tab === "findings" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{(findings as any[]).length} findings · {openFindings.length} open</p>
            <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={openNewFinding}><Plus className="w-3.5 h-3.5 mr-1"/>Add Finding</Button>
          </div>
          {(findings as any[]).length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
              <Flag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-400 mb-3">No findings recorded yet</p>
              <Button size="sm" onClick={openNewFinding} className="rounded-xl bg-violet-600 hover:bg-violet-700"><Plus className="w-3.5 h-3.5 mr-1"/>Record First Finding</Button>
            </div>
          ) : (findings as any[]).map(f => {
            const sev = SEV_CFG[f.severity] ?? SEV_CFG.medium;
            return (
              <div key={f.id} className={cn("bg-white border rounded-xl px-5 py-4 shadow-sm flex items-start gap-4",
                f.severity === "critical" ? "border-red-200" : f.severity === "high" ? "border-orange-200" : "border-gray-200")}>
                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", sev.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{f.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", sev.badge)}>{sev.label}</span>
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", FINDING_STATUS_CFG[f.status] ?? "")}>{f.status.replace("_"," ")}</span>
                        <span className="text-xs text-gray-400">{CATEGORIES.find(c => c.value === f.category)?.label ?? f.category}</span>
                        {f.dueDate && <span className="text-xs text-gray-400">· Due: {fmtDate(f.dueDate)}</span>}
                      </div>
                      {f.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{f.description}</p>}
                    </div>
                    <button onClick={() => openEditFinding(f)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 shrink-0"><Pencil className="w-3.5 h-3.5"/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── COMPLIANCE TAB ── */}
      {tab === "compliance" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{(events as any[]).length} events · {pendingEvents.length} pending</p>
            <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={() => setEventDlg({ open: true, form: emptyEvent })}><Plus className="w-3.5 h-3.5 mr-1"/>Add Event</Button>
          </div>
          {(events as any[]).length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
              <p className="text-sm text-gray-400 mb-3">No compliance events</p>
              <Button size="sm" onClick={() => setEventDlg({ open: true, form: emptyEvent })} className="rounded-xl bg-violet-600 hover:bg-violet-700"><Plus className="w-3.5 h-3.5 mr-1"/>Add First Event</Button>
            </div>
          ) : (events as any[]).map((e: any) => {
            const isOverdue = e.status === "pending" && e.dueDate < today;
            const isDone    = e.status === "filed";
            return (
              <div key={e.id} className={cn("bg-white border rounded-xl px-5 py-4 shadow-sm flex items-center gap-4",
                isOverdue ? "border-red-200 bg-red-50/10" : isDone ? "border-emerald-200 bg-emerald-50/10" : "border-gray-200")}>
                <CalendarDays className={cn("w-5 h-5 shrink-0", isOverdue ? "text-red-500" : isDone ? "text-emerald-500" : "text-amber-500")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{e.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>{e.eventType.toUpperCase()}</span>
                    {e.period  && <span>· {e.period}</span>}
                    <span className={cn(isOverdue ? "text-red-600 font-semibold" : "")}>· Due: {fmtDate(e.dueDate)}</span>
                  </div>
                </div>
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0",
                  isDone    ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  isOverdue ? "bg-red-50 text-red-600 border-red-200" :
                              "bg-amber-50 text-amber-600 border-amber-200")}>
                  {isDone ? "Filed" : isOverdue ? "Overdue" : "Pending"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Task Dialog ── */}
      <Dialog open={taskDlg.open} onOpenChange={o => setTaskDlg(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>{taskDlg.edit ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Title *</Label><Input value={taskDlg.form.title} onChange={e => setTaskDlg(d => ({ ...d, form: { ...d.form, title: e.target.value } }))} placeholder="Task title" className="rounded-xl"/></div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Phase</Label>
              <Select value={taskDlg.form.phase} onValueChange={v => setTaskDlg(d => ({ ...d, form: { ...d.form, phase: v } }))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{PHASES.slice(0,4).map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Task Type</Label>
              <Select value={taskDlg.form.taskType} onValueChange={v => setTaskDlg(d => ({ ...d, form: { ...d.form, taskType: v } }))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{TASK_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Priority</Label>
              <Select value={taskDlg.form.priority} onValueChange={v => setTaskDlg(d => ({ ...d, form: { ...d.form, priority: v } }))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Due Date</Label><Input type="date" value={taskDlg.form.dueDate} onChange={e => setTaskDlg(d => ({ ...d, form: { ...d.form, dueDate: e.target.value } }))} className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Assignee</Label><Input value={taskDlg.form.assignee} onChange={e => setTaskDlg(d => ({ ...d, form: { ...d.form, assignee: e.target.value } }))} placeholder="Name" className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Description</Label><Textarea value={taskDlg.form.description} onChange={e => setTaskDlg(d => ({ ...d, form: { ...d.form, description: e.target.value } }))} rows={2} className="rounded-xl resize-none text-sm"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setTaskDlg(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveTask}>{taskDlg.edit ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Finding Dialog ── */}
      <Dialog open={findDlg.open} onOpenChange={o => setFindDlg(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>{findDlg.edit ? "Edit Finding" : "Record Finding"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Title *</Label><Input value={findDlg.form.title} onChange={e => setFindDlg(d => ({ ...d, form: { ...d.form, title: e.target.value } }))} className="rounded-xl"/></div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={findDlg.form.category} onValueChange={v => setFindDlg(d => ({ ...d, form: { ...d.form, category: v } }))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Severity</Label>
              <Select value={findDlg.form.severity} onValueChange={v => setFindDlg(d => ({ ...d, form: { ...d.form, severity: v } }))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={findDlg.form.status} onValueChange={v => setFindDlg(d => ({ ...d, form: { ...d.form, status: v } }))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Period</Label><Input value={findDlg.form.period} onChange={e => setFindDlg(d => ({ ...d, form: { ...d.form, period: e.target.value } }))} placeholder="2025-26 Q3" className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Description</Label><Textarea value={findDlg.form.description} onChange={e => setFindDlg(d => ({ ...d, form: { ...d.form, description: e.target.value } }))} rows={2} className="rounded-xl resize-none text-sm" placeholder="Detailed description…"/></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs font-semibold">Recommendation</Label><Textarea value={findDlg.form.recommendation} onChange={e => setFindDlg(d => ({ ...d, form: { ...d.form, recommendation: e.target.value } }))} rows={2} className="rounded-xl resize-none text-sm" placeholder="Recommended action…"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setFindDlg(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveFinding}>{findDlg.edit ? "Save" : "Record"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Compliance Event Dialog ── */}
      <Dialog open={eventDlg.open} onOpenChange={o => setEventDlg(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Add Compliance Event</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs font-semibold">Title *</Label><Input value={eventDlg.form.title} onChange={e => setEventDlg(d => ({ ...d, form: { ...d.form, title: e.target.value } }))} className="rounded-xl"/></div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Type</Label>
              <Select value={eventDlg.form.eventType} onValueChange={v => setEventDlg(d => ({ ...d, form: { ...d.form, eventType: v } }))}>
                <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Period</Label><Input value={eventDlg.form.period} onChange={e => setEventDlg(d => ({ ...d, form: { ...d.form, period: e.target.value } }))} placeholder="2026-07" className="rounded-xl"/></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Due Date *</Label><Input type="date" value={eventDlg.form.dueDate} onChange={e => setEventDlg(d => ({ ...d, form: { ...d.form, dueDate: e.target.value } }))} className="rounded-xl"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEventDlg(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" onClick={saveEvent}>Add Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
