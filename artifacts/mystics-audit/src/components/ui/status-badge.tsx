import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;

  const s = status.toLowerCase();
  let variantClass = "bg-gray-100 text-gray-700 hover:bg-gray-100";

  if (["pending"].includes(s)) {
    variantClass = "bg-amber-100 text-amber-700 hover:bg-amber-100";
  } else if (["approved", "active", "paid", "posted", "filed", "completed"].includes(s)) {
    variantClass = "bg-green-100 text-green-700 hover:bg-green-100";
  } else if (["rejected", "overdue", "cancelled", "failed"].includes(s)) {
    variantClass = "bg-red-100 text-red-700 hover:bg-red-100";
  } else if (["submitted", "review", "in_progress"].includes(s)) {
    variantClass = "bg-blue-100 text-blue-700 hover:bg-blue-100";
  } else if (["suspended", "inactive"].includes(s)) {
    variantClass = "bg-orange-100 text-orange-700 hover:bg-orange-100";
  }

  return (
    <Badge variant="outline" className={cn("capitalize font-medium border-transparent", variantClass, className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export { StatusBadge };
