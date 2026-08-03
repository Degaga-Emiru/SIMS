"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, UserCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardLoading } from "@/components/dashboard/loading";
import { ROLE_LABELS } from "@/types";
import type { Role } from "@/app/generated/prisma/enums";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";

interface EmployeeDetail {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  department: string | null;
  position: string | null;
  status: "ACTIVE" | "INACTIVE";
  image: string | null;
  lastLogin: string | null;
  createdAt: string;
  recentActivities: Array<{ action: string; entity: string; createdAt: string }>;
}

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: EmployeeDetail }>(`/employees/${id}`).then((res) => {
      setEmployee(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  async function handleAction(action: string) {
    try {
      const res = await api.patch(`/employees/${id}`, { action, generateTemporary: action === "reset-password", forcePasswordChange: true });
      if (action === "reset-password" && res.data.data?.temporaryPassword) {
        toast.success(`Temporary password: ${res.data.data.temporaryPassword}`, { duration: 10000 });
      } else {
        toast.success(`Employee ${action.replace("-", " ")}d`);
        const updated = await api.get<{ data: EmployeeDetail }>(`/employees/${id}`);
        setEmployee(updated.data.data);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  if (loading) return <DashboardLoading />;
  if (!employee) return <p className="text-muted-foreground">Employee not found.</p>;

  const initials = employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <Avatar className="h-24 w-24">
          {employee.image && <AvatarImage src={employee.image} />}
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{employee.name}</h1>
          <p className="text-muted-foreground">{employee.email}</p>
          <div className="flex gap-2 mt-2">
            <Badge>{ROLE_LABELS[employee.role]}</Badge>
            <Badge variant={employee.status === "ACTIVE" ? "success" : "secondary"}>{employee.status}</Badge>
          </div>
          <div className="flex gap-2 mt-4">
            {employee.status === "ACTIVE" ? (
              <Button variant="outline" size="sm" onClick={() => handleAction("deactivate")}>
                <UserX className="h-4 w-4 mr-1" /> Deactivate
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleAction("activate")}>
                <UserCheck className="h-4 w-4 mr-1" /> Activate
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => handleAction("reset-password")}>
              <KeyRound className="h-4 w-4 mr-1" /> Reset Password
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Employee Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Employee ID</span><span className="font-mono">{employee.employeeId}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{employee.phone ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span>{employee.department ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Position</span><span>{employee.position ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date Joined</span><span>{formatDate(employee.createdAt)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last Login</span><span>{employee.lastLogin ? formatDate(employee.lastLogin) : "Never"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activities</CardTitle></CardHeader>
          <CardContent>
            {employee.recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activities</p>
            ) : (
              <div className="space-y-3">
                {employee.recentActivities.map((a, i) => (
                  <div key={i} className="text-sm border-b pb-2 last:border-0">
                    <span className="font-medium">{a.action}</span> — {a.entity}
                    <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
