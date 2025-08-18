import { Calendar, Users, Clock, TrendingUp, AlertTriangle, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function SchedulerDashboard() {
  const [createScheduleModalOpen, setCreateScheduleModalOpen] = useState(false);
  
  // Placeholder data - will integrate with actual Supabase later
  const stats = {
    totalEmployees: 24,
    activeShifts: 8,
    totalHours: 156,
    pendingRequests: 3
  };

  const todayShifts = [
    { id: 1, employee: "John Doe", department: "Kitchen", time: "6:00 AM - 2:00 PM", status: "in_progress" },
    { id: 2, employee: "Jane Smith", department: "Service", time: "2:00 PM - 10:00 PM", status: "scheduled" }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Roster Joy - your employee scheduling hub
          </p>
        </div>
        <Button onClick={() => setCreateScheduleModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Schedule
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeShifts}</div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">
              Need approval
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Shifts</CardTitle>
            <CardDescription>
              Overview of scheduled shifts for today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayShifts.map((shift) => (
              <div key={shift.id} className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>{shift.employee.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{shift.employee}</p>
                  <p className="text-xs text-muted-foreground">{shift.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{shift.time}</p>
                  <Badge variant={shift.status === 'in_progress' ? 'default' : 'secondary'}>
                    {shift.status === 'in_progress' ? 'Active' : 'Scheduled'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Frequently used actions for schedule management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              View Full Schedule
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="h-4 w-4 mr-2" />
              Manage Employees
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Clock className="h-4 w-4 mr-2" />
              Time Clock Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}