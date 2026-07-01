import { cn } from "@/lib/utils";
import {
  Clock, CheckCircle2, AlertCircle, Receipt, XCircle,
  type LucideIcon,
} from "lucide-react";

interface StatusConfig {
  color: string;
  label: string;
  icon?: LucideIcon;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  draft:       { color: "bg-amber-100 text-amber-700 border-amber-200",       label: "Draft",       icon: Clock },
  posted:      { color: "bg-blue-100 text-blue-700 border-blue-200",          label: "Posted",      icon: CheckCircle2 },
  partial:     { color: "bg-violet-100 text-violet-700 border-violet-200",    label: "Partial",     icon: Receipt },
  paid:        { color: "bg-green-100 text-green-700 border-green-200",       label: "Paid",        icon: CheckCircle2 },
  cancelled:   { color: "bg-red-100 text-red-700 border-red-200",             label: "Cancelled",   icon: AlertCircle },
  overdue:     { color: "bg-red-100 text-red-700 border-red-200",             label: "Overdue",     icon: AlertCircle },
  submitted:   { color: "bg-amber-50 text-amber-700 border-amber-200",        label: "Submitted",   icon: Clock },
  approved:    { color: "bg-blue-50 text-blue-700 border-blue-200",           label: "Approved",    icon: CheckCircle2 },
  rejected:    { color: "bg-red-50 text-red-700 border-red-200",              label: "Rejected",    icon: XCircle },
  reimbursed:  { color: "bg-violet-50 text-violet-700 border-violet-200",     label: "Reimbursed",  icon: CheckCircle2 },
  active:      { color: "bg-green-100 text-green-700 border-green-200",       label: "Active",      icon: CheckCircle2 },
  inactive:    { color: "bg-gray-100 text-gray-500 border-gray-200",          label: "Inactive" },
  suspended:   { color: "bg-red-100 text-red-700 border-red-200",             label: "Suspended",   icon: AlertCircle },
  pending:     { color: "bg-amber-100 text-amber-700 border-amber-200",       label: "Pending",     icon: Clock },
  filed:       { color: "bg-green-100 text-green-700 border-green-200",       label: "Filed",       icon: CheckCircle2 },
  unfiled:     { color: "bg-gray-100 text-gray-500 border-gray-200",          label: "Unfiled" },
  received:    { color: "bg-green-100 text-green-700 border-green-200",       label: "Received",    icon: CheckCircle2 },
};

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ status, showIcon = false, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? {
    color: "bg-gray-100 text-gray-500 border-gray-200",
    label: status.charAt(0).toUpperCase() + status.slice(1),
  };
  const Icon = showIcon ? cfg.icon : undefined;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
        cfg.color,
        className,
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {cfg.label}
    </span>
  );
}
