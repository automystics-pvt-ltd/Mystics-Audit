import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Search, ChevronLeft, ChevronRight, UserCheck, UserX } from "lucide-react";

export default function Users() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: () => api.get<any>(`/admin/users?${params}`),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: any) => api.patch(`/admin/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast({ title: "User updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Platform Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All users across every tenant organisation</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search name or email…" className="pl-8 h-8 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <Card className="border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Active</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({length:10}).map((_,i) => (
                <tr key={i} className="border-b">
                  {Array.from({length:4}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && data?.users?.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {(u.name || u.email)?.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{u.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Select value={u.role ?? "viewer"} onValueChange={v => updateMut.mutate({ id: u.id, body: { role: v } })}>
                      <SelectTrigger className="h-7 w-32 text-xs border-0 bg-muted/50 focus:ring-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["owner","admin","accountant","viewer"].map(r => <SelectItem key={r} value={r} className="capitalize text-xs">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.isActive ?? true}
                        onCheckedChange={v => updateMut.mutate({ id: u.id, body: { isActive: v } })}
                        className="scale-75"
                      />
                      {u.isActive ? <UserCheck className="w-3.5 h-3.5 text-green-600" /> : <UserX className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !data?.users?.length && (
                <tr><td colSpan={4} className="text-center py-10 text-muted-foreground text-sm">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">{data.total} total users</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p-1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
              <span className="text-xs px-2">{page} / {data.pages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= data.pages} onClick={() => setPage(p => p+1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
