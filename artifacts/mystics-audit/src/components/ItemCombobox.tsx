import { useState } from "react";
import { Check, ChevronsUpDown, Search, X, Package, AlertTriangle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ItemOption {
  id: number;
  name: string;
  itemCode?: string;
  hsnSac?: string;
  unit?: string;
  gstRate?: number;
  sellingRate?: number;
  purchaseRate?: number;
  currentStock?: number;
  minimumStock?: number;
  type?: string;
  isActive?: boolean;
}

interface Props {
  items: ItemOption[];
  selectedId?: number | null;
  onSelect: (item: ItemOption) => void;
  onClear?: () => void;
  onCreateNew?: (name: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rateMode?: "selling" | "purchase";
}

export function ItemCombobox({
  items,
  selectedId,
  onSelect,
  onClear,
  onCreateNew,
  placeholder = "Search item…",
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const activeItems = items.filter(it => it.isActive !== false);
  const selected = activeItems.find(it => it.id === selectedId);

  const filtered = activeItems.filter(it => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      it.name.toLowerCase().includes(q) ||
      (it.itemCode ?? "").toLowerCase().includes(q) ||
      (it.hsnSac ?? "").toLowerCase().includes(q)
    );
  });

  function handleCreateNew() {
    onCreateNew?.(search.trim());
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between text-xs rounded-lg font-normal border-gray-200",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected ? selected.name : placeholder}
          </span>
          <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
            {selected && onClear && (
              <span
                role="button"
                tabIndex={0}
                onClick={e => { e.stopPropagation(); onClear(); }}
                onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); onClear?.(); } }}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronsUpDown className="w-3 h-3 text-gray-400" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-xl shadow-xl border border-gray-200" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center px-3 border-b border-gray-100">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" />
            <CommandInput
              placeholder="Search by name, code or HSN…"
              value={search}
              onValueChange={setSearch}
              className="h-9 text-xs border-0 shadow-none focus:ring-0"
            />
          </div>
          <CommandList className="max-h-64 overflow-y-auto">
            <CommandEmpty className="py-5 text-center">
              <Package className="w-6 h-6 mx-auto mb-2 text-gray-300" />
              <p className="text-xs text-muted-foreground mb-3">
                {search.trim() ? `No items match "${search}"` : "No items in catalog"}
              </p>
              {onCreateNew && (
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {search.trim() ? `Add "${search}" to catalog` : "Add new item to catalog"}
                </button>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map(item => {
                const isLow = (item.currentStock ?? 0) <= (item.minimumStock ?? 0);
                const isZero = (item.currentStock ?? 0) === 0;
                return (
                  <CommandItem
                    key={item.id}
                    value={String(item.id)}
                    onSelect={() => { onSelect(item); setOpen(false); setSearch(""); }}
                    className="flex items-start gap-2 px-3 py-2 cursor-pointer"
                  >
                    <Check
                      className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-violet-600", selectedId === item.id ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-800 truncate">{item.name}</span>
                        {item.type === "SERVICE" && (
                          <span className="text-[9px] bg-blue-100 text-blue-700 rounded-full px-1.5 font-bold flex-shrink-0">SVC</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.itemCode && (
                          <span className="text-[10px] font-mono text-gray-400">{item.itemCode}</span>
                        )}
                        {item.hsnSac && (
                          <span className="text-[10px] text-gray-400">HSN: {item.hsnSac}</span>
                        )}
                        {item.type !== "SERVICE" && (
                          <span className={cn(
                            "text-[10px] font-bold flex items-center gap-0.5",
                            isZero ? "text-red-500" : isLow ? "text-amber-500" : "text-emerald-600",
                          )}>
                            {isLow && <AlertTriangle className="w-2.5 h-2.5" />}
                            {item.currentStock ?? 0} {item.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-mono text-gray-600">
                        {item.gstRate ?? 18}% GST
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {/* Create new option at bottom when search has text and items found */}
            {onCreateNew && search.trim() && filtered.length > 0 && (
              <div className="border-t border-gray-100 p-2">
                <button
                  onClick={handleCreateNew}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors font-semibold"
                >
                  <PlusCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Add "{search}" as a new item
                </button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
