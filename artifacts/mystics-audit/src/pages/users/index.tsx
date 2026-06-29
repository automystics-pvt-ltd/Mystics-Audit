import { useListUsers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Plus, Shield } from "lucide-react";

const ROLE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  Admin: "default", Manager: "secondary", Accountant: "outline",
};

export default function UsersList() {
  const { data } = useListUsers({});
  const users: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-muted-foreground text-sm">{users.length} users</p>
        </div>
        <Link href="/users/new"><Button><Plus className="w-4 h-4 mr-2" />Add User</Button></Link>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>2FA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u: any) => (
              <TableRow key={u.id} className="hover:bg-muted/50">
                <TableCell>
                  <Link href={`/users/${u.id}`} className="font-medium text-primary hover:underline">{u.name}</Link>
                </TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_COLORS[u.role] ?? "outline"} className="flex items-center gap-1 w-fit">
                    {u.role === "Admin" && <Shield className="w-3 h-3" />}{u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.department || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.lastLogin ? formatDate(u.lastLogin) : "Never"}</TableCell>
                <TableCell><Badge variant={u.isActive ? "default" : "destructive"}>{u.isActive ? "Active" : "Suspended"}</Badge></TableCell>
                <TableCell>{u.twoFactorEnabled ? <Badge variant="outline" className="text-green-600 border-green-600">Enabled</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
              </TableRow>
            ))}
            {users.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No users found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
