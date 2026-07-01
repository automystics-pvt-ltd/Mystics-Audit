import { useState } from "react";
import { Check, ChevronsUpDown, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface EntityOption {
  id: number;
  label: string;
  sublabel?: string;
  meta?: string;
}

interface Props {
  options: EntityOption[];
  selectedId?: number | null;
  onSelect: (item: EntityOption) => void;
  onClear?: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export function EntityCombobox({
  options,
  selectedId,
  onSelect,
  onClear,
  placeholder = "Search…",
  searchPlaceholder = "Type to search…",
  emptyText = "No results found",
  className,
  disabled,
  error,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = options.find(o => o.id === selectedId);

  const filtered = options.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.label.toLowerCase().includes(q) ||
      (o.sublabel ?? "").toLowerCase().includes(q) ||
      (o.meta ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            "flex items-center justify-between w-full h-9 px-3 text-sm",
            "bg-background border rounded-lg text-left",
            "hover:bg-accent/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            error ? "border-red-400" : "border-input",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-medium text-gray-800 truncate">{selected.label}</span>
              {selected.sublabel && (
                <span className="text-xs text-muted-foreground font-mono truncate shrink-0">{selected.sublabel}</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
          <span className="flex items-center gap-0.5 ml-1 shrink-0">
            {selected && onClear ? (
              <span
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), onClear(), setOpen(false))}
                onClick={e => { e.stopPropagation(); onClear(); setOpen(false); }}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            ) : null}
            <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-72 shadow-xl rounded-xl" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b border-gray-100 px-3">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              className="h-9 text-sm border-none focus:ring-0 px-0"
            />
          </div>
          <CommandList className="max-h-60">
            <CommandEmpty>
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">{emptyText}</p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filtered.map(opt => (
                <CommandItem
                  key={opt.id}
                  value={String(opt.id)}
                  onSelect={() => { onSelect(opt); setSearch(""); setOpen(false); }}
                  className="flex items-start gap-2 px-3 py-2 cursor-pointer"
                >
                  <Check className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", selectedId === opt.id ? "opacity-100 text-violet-600" : "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{opt.label}</p>
                    {(opt.sublabel || opt.meta) && (
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {[opt.sublabel, opt.meta].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
