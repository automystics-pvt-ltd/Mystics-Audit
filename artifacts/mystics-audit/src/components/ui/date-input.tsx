import * as React from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center w-full">
        <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none z-10 shrink-0" />
        <input
          type="date"
          ref={ref}
          className={cn(
            // Base — matches shadcn Input exactly
            "flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-2 py-1 text-sm shadow-xs",
            "transition-colors placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Cross-browser: style the native picker trigger
            "[color-scheme:light]",
            "[&::-webkit-calendar-picker-indicator]:opacity-40",
            "[&::-webkit-calendar-picker-indicator]:hover:opacity-70",
            "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
            "[&::-webkit-calendar-picker-indicator]:w-4",
            "[&::-webkit-calendar-picker-indicator]:h-4",
            // Firefox
            "[&::-moz-calendar-picker-indicator]:opacity-40",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

DateInput.displayName = "DateInput";
export { DateInput };
