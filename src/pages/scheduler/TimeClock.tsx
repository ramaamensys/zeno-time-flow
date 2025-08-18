import { useState, useEffect } from "react";
import { Clock, Play, Square, Calendar, Download, Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export default function SchedulerTimeClock() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("today");
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadTimeClockData();
  }, [selectedPeriod]);

  const loadTimeClockData = async () => {
    try {
      // Load time clock entries
      const { data: timeData } = await (supabase as any)
        .from('time_clock')
        .select(`
          *,
          employees!inner(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      // Load employees for quick clock in
      const { data: employeesData } = await (supabase as any)
        .from('employees')
        .select('id, first_name, last_name, status')
        .eq('status', 'active')
        .limit(5);

      setTimeEntries(timeData || []);
      setEmployees(employeesData || []);
    } catch (error) {
      console.error('Error loading time clock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeEmployees = timeEntries.filter(entry => entry.clock_out === null);
  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  const avgHours = timeEntries.length > 0 ? totalHours / timeEntries.length : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'break': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Clock</h1>
          <p className="text-muted-foreground">
            Track employee time and manage attendance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Payroll Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Currently Clocked In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? <Skeleton className="h-8 w-12" /> : activeEmployees.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : totalHours.toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : avgHours.toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {loading ? <Skeleton className="h-8 w-12" /> : "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Currently Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array(2).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeEmployees.length > 0 ? (
              <div className="space-y-3">
                {activeEmployees.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {`${entry.employees?.first_name?.[0] || ''}${entry.employees?.last_name?.[0] || ''}`}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {`${entry.employees?.first_name || ''} ${entry.employees?.last_name || ''}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Clocked in at {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        Active
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Square className="h-4 w-4 mr-1" />
                        Clock Out
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No employees currently clocked in</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Clock In</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : employees.length > 0 ? (
              <div className="space-y-3">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {`${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium">
                        {`${employee.first_name || ''} ${employee.last_name || ''}`}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Play className="h-4 w-4 mr-1" />
                      Clock In
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active employees available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Time Entries</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Break Duration</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.length > 0 ? timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {`${entry.employees?.first_name?.[0] || ''}${entry.employees?.last_name?.[0] || ''}`}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-medium">
                          {`${entry.employees?.first_name || ''} ${entry.employees?.last_name || ''}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </TableCell>
                    <TableCell>
                      {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </TableCell>
                    <TableCell>{formatDuration(entry.break_end && entry.break_start ? 
                      Math.floor((new Date(entry.break_end).getTime() - new Date(entry.break_start).getTime()) / (1000 * 60)) : 0)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.total_hours > 0 ? `${entry.total_hours.toFixed(1)}h` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.clock_out ? 'secondary' : 'default'}>
                        {entry.clock_out ? 'completed' : 'active'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No time entries found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}