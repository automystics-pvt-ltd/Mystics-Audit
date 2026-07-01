import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonRowsProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export default function SkeletonRows({ rows = 5, cols = 4, className }: SkeletonRowsProps) {
  return (
    <div className={cn("space-y-4 w-full", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-6 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export { SkeletonRows };
