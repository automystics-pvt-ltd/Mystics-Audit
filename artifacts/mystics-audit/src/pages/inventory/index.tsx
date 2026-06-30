import { useListItems } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  Plus, Search, AlertTriangle, Package, TrendingDown, Archive,
  RefreshCw, Download, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InventoryList() {
  const [search, setSearch]     = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [typeFilter, setType]   = useState("all");

  const { data, isLoading, refetch, isFetching } = useListItems(
    lowStock ? { lowStock: true } : search ? { search } : {},
  );
  const items: any[] = (data ?? []).filter((item: any) =>
    typeFilter === "all" || item.type === typeFilter,
  );

  const stats = {
    total:    items.length,
    lowStock: items.filter((i: any) => i.currentStock <= i.minimumStock).length,
    value:    items.reduce((s: number, i: any) => s + (i.stockValue || 0), 0),
    outOfStock: items.filter((i: any) => i.currentStock === 0).length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-muted-foreground">Item master, stock levels & valuation</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="rounded-xl">
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
        </Button>
        <Link href="/inventory/valuation">
          <Button size="sm" variant="outline" className="rounded-xl gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Valuation Report
          </Button>
        </Link>
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <Link href="/inventory/new">
          <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Item
          </Button>
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Items",      value: String(stats.total),              color: "from-violet-600 to-violet-700", Icon: Package },
          { label: "Stock Value",      value: formatCurrency(stats.value),      color: "from-blue-600 to-blue-700",     Icon: Archive },
          { label: "Low Stock Alerts", value: String(stats.lowStock),           color: stats.lowStock > 0 ? "from-amber-500 to-amber-600" : "from-emerald-500 to-emerald-600", Icon: AlertTriangle },
          { label: "Out of Stock",     value: String(stats.outOfStock),         color: stats.outOfStock > 0 ? "from-red-500 to-red-600" : "from-teal-500 to-teal-600", Icon: TrendingDown },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className={cn("rounded-2xl p-4 text-white bg-gradient-to-br", color)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-white/70">{label}</p>
                <p className="text-xl font-extrabold mt-1">{value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9 rounded-xl border-gray-200"
            placeholder="Search by name, SKU, or HSN…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setType}>
          <SelectTrigger className="w-32 rounded-xl border-gray-200"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="GOODS">Goods</SelectItem>
            <SelectItem value="SERVICE">Services</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={lowStock ? "default" : "outline"}
          size="sm"
          onClick={() => setLowStock(l => !l)}
          className={cn("rounded-xl gap-1.5", lowStock && "bg-amber-500 hover:bg-amber-600 text-white border-0")}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low Stock Only
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left   text-xs font-bold text-gray-500 uppercase tracking-wide">SKU</th>
              <th className="px-4 py-3 text-left   text-xs font-bold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left   text-xs font-bold text-gray-500 uppercase tracking-wide">HSN/SAC</th>
              <th className="px-4 py-3 text-left   text-xs font-bold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">GST%</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">Stock</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">Min Stock</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">Avg Cost</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">Selling Rate</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">Stock Value</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              : items.length === 0
                ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No inventory items found
                    </td>
                  </tr>
                )
                : items.map((item: any) => {
                    const isLow    = item.currentStock <= item.minimumStock;
                    const isZero   = item.currentStock === 0;
                    return (
                      <tr key={item.id} className={cn("border-b border-gray-50 transition-colors", isLow ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-gray-50/60")}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.sku || item.itemCode}</td>
                        <td className="px-4 py-3">
                          <Link href={`/inventory/${item.id}`}>
                            <span className="font-semibold text-gray-800 hover:text-violet-600 cursor-pointer">{item.name}</span>
                          </Link>
                          {item.group && <p className="text-xs text-gray-400 mt-0.5">{item.group}</p>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.hsnSac || item.hsnCode || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            item.type === "SERVICE" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700",
                          )}>
                            {item.type || "GOODS"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">{item.gstRate}%</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            "font-bold font-mono",
                            isZero ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-800",
                          )}>
                            {item.currentStock}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                          {isLow && !isZero && (
                            <span title="Low stock" className="ml-1"><AlertTriangle className="w-3 h-3 text-amber-500 inline" /></span>
                          )}
                          {isZero && (
                            <span className="ml-1 text-[10px] bg-red-100 text-red-600 rounded-full px-1.5 font-bold">OUT</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-500">{item.minimumStock || 0} {item.unit}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.averageCost ?? item.costPrice)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.sellingRate)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(item.stockValue)}</td>
                        <td className="px-4 py-3">
                          <Link href={`/inventory/${item.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs text-violet-600 hover:bg-violet-50">Edit</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
          </tbody>
          {!isLoading && items.length > 0 && (
            <tfoot className="bg-gray-50/80 border-t-2 border-gray-100">
              <tr>
                <td colSpan={9} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </td>
                <td className="px-4 py-3 text-right font-bold text-violet-700">
                  {formatCurrency(stats.value)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
