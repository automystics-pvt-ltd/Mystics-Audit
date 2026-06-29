import { useCreateUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const ROLES = ["Admin", "Manager", "Accountant", "Auditor", "Viewer"];
const DEPARTMENTS = ["Finance", "Accounts", "Sales", "Purchase", "Operations", "Management"];

export default function NewUser() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const mutation = useCreateUser();
  const [form, setForm] = useState({ name: "", email: "", role: "Accountant", department: "", phone: "", password: "" });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader><CardTitle>User Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1"><Label>Full Name *</Label><Input required value={form.name} onChange={set("name")} /></div>
            <div className="col-span-2 space-y-1"><Label>Email *</Label><Input required type="email" value={form.email} onChange={set("email")} /></div>
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select defaultValue="Accountant" onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} /></div>
            <div className="col-span-2 space-y-1">
              <Label>Temporary Password *</Label>
              <Input required type="password" value={form.password} onChange={set("password")} placeholder="Will be reset on first login" />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3 mt-4">
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create User"}</Button>
          <Link href="/users"><Button variant="outline" type="button">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
