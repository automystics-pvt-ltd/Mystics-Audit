import { useCreateUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertTriangle, Users } from "lucide-react";

const ROLES = ["Admin", "Manager", "Accountant", "Auditor", "Viewer"];
const DEPARTMENTS = ["Finance", "Accounts", "Sales", "Purchase", "Operations", "Management"];

export default function NewUser() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const mutation = useCreateUser();
  const [form, setForm] = useState({ name: "", email: "", role: "Accountant", department: "", phone: "", password: "" });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  // License check
  const { data: users } = useQuery({ queryKey: ["listUsers"], queryFn: () => fetch("/api/users").then(r => r.json()), select: (d: any[]) => d });
  const { data: license } = useQuery({
    queryKey: ["tenant-license"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      if (!res.ok) return null;
      const companies = await res.json();
      const org = companies?.[0];
      if (!org?.id) return null;
      const lr = await fetch(`/api/admin/tenants/${org.id}/license`);
      if (!lr.ok) return null;
      return lr.json();
    },
  });

  const currentUsers = Array.isArray(users) ? users.length : 0;
  const maxUsers = license?.maxUsers ?? 0;
  const atLimit = maxUsers > 0 && currentUsers >= maxUsers;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (atLimit) return;
    mutation.mutate({ data: form } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); navigate("/users"); },
    });
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/users"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">Add User</h1>
      </div>

      {/* License warning */}
      {maxUsers > 0 && (
        <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${atLimit ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-muted border-border"}`}>
          {atLimit ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <div>
            <p className="font-medium">{atLimit ? "License limit reached" : `${currentUsers} of ${maxUsers} user seats used`}</p>
            {atLimit && <p className="text-xs mt-0.5">You cannot add more users. Contact your administrator to upgrade your plan or increase the license limit.</p>}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader><CardTitle>User Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1"><Label>Full Name *</Label><Input required value={form.name} onChange={set("name")} disabled={atLimit} /></div>
            <div className="col-span-2 space-y-1"><Label>Email *</Label><Input required type="email" value={form.email} onChange={set("email")} disabled={atLimit} /></div>
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select defaultValue="Accountant" onValueChange={v => setForm(f => ({ ...f, role: v }))} disabled={atLimit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select onValueChange={v => setForm(f => ({ ...f, department: v }))} disabled={atLimit}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} disabled={atLimit} /></div>
            <div className="col-span-2 space-y-1">
              <Label>Temporary Password *</Label>
              <Input required type="password" value={form.password} onChange={set("password")} placeholder="Will be reset on first login" disabled={atLimit} />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3 mt-4">
          <Button type="submit" disabled={mutation.isPending || atLimit}>{mutation.isPending ? "Creating..." : "Create User"}</Button>
          <Link href="/users"><Button variant="outline" type="button">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
