import { useState, useEffect } from "react";
import { Clock, Calendar, CheckCircle, MapPin, Play, Square, Coffee, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEmployeeTimeClock } from "@/hooks/useEmployeeTimeClock";
import { usePersistentTimeClock } from "@/hooks/usePersistentTimeClock";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, parseISO } from "date-fns";
import EmployeeShifts from "@/components/scheduler/EmployeeShifts";
import EmployeeTasks from "@/components/scheduler/EmployeeTasks";
import EmployeeHours from "@/components/scheduler/EmployeeHours";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { 
    employee, 
    entries, 
    loading, 
    startBreak, 
    endBreak,
    calculatePeriodHours,
    refetch: refetchEntries
  } = useEmployeeTimeClock();
  
  // Use persistent time clock for clock in/out and timer - this persists across sessions
  const { 
    activeEntry, 
    elapsedTimeFormatted, 
    clockIn, 
    clockOut,
    refetch: refetchPersistent 
  } = usePersistentTimeClock();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shifts, setShifts] = useState<any[]>([]);
  const [todayShift, setTodayShift] = useState<any>(null);

  // Update clock every second (for current time display)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Fetch employee's shifts
  useEffect(() => {
    const fetchShifts = async () => {
      if (!employee) return;
      
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      
      const { data } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time', { ascending: true });
      
      setShifts(data || []);
      
      // Find today's shift
      const todaysShift = data?.find(shift => {
        const shiftDate = parseISO(shift.start_time);
        return isToday(shiftDate);
      });
      setTodayShift(todaysShift);
    };
    
    fetchShifts();
  }, [employee]);

  // Calculate hours for different periods
  const todayEntries = entries.filter(e => {
    if (!e.clock_in) return false;
    return isToday(parseISO(e.clock_in));
  });
  
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEntries = entries.filter(e => {
    if (!e.clock_in) return false;
    const clockIn = parseISO(e.clock_in);
    return clockIn >= weekStart && clockIn <= weekEnd;
  });
  
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthEntries = entries.filter(e => {
    if (!e.clock_in) return false;
    const clockIn = parseISO(e.clock_in);
    return clockIn >= monthStart && clockIn <= monthEnd;
  });

  const todayHours = calculatePeriodHours(todayEntries);
  const weekHours = calculatePeriodHours(weekEntries);
  const monthHours = calculatePeriodHours(monthEntries);

  // Check if on break
  const isOnBreak = activeEntry?.break_start && !activeEntry?.break_end;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Not an Employee</CardTitle>
            <CardDescription>
              Your account is not linked to an employee record. Please contact your administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {employee.first_name}!
          </h1>
          <p className="text-muted-foreground">
            {format(currentTime, 'EEEE, MMMM d, yyyy')} • {format(currentTime, 'h:mm:ss a')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-lg">
              {employee.first_name[0]}{employee.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{employee.first_name} {employee.last_name}</p>
            <p className="text-sm text-muted-foreground">{employee.position || 'Employee'}</p>
          </div>
        </div>
      </div>

      {/* Clock In/Out Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2">
                {activeEntry ? 'Currently Clocked In' : 'Not Clocked In'}
              </h2>
              {activeEntry && (
                <div className="flex items-center gap-4 text-lg">
                  <span className="font-mono text-3xl font-bold text-primary">
                    {elapsedTimeFormatted}
                  </span>
                  <Badge variant={isOnBreak ? "secondary" : "default"} className="text-sm">
                    {isOnBreak ? "On Break" : "Working"}
                  </Badge>
                </div>
              )}
              {todayShift && !activeEntry && (
                <p className="text-muted-foreground mt-2">
                  Scheduled: {format(parseISO(todayShift.start_time), 'h:mm a')} - {format(parseISO(todayShift.end_time), 'h:mm a')}
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              {!activeEntry ? (
                <Button 
                  size="lg" 
                  className="gap-2"
                  onClick={async () => {
                    await clockIn(todayShift?.id);
                    refetchEntries();
                  }}
                >
                  <Play className="h-5 w-5" />
                  Clock In
                  <MapPin className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <>
                  {!isOnBreak ? (
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="gap-2"
                      onClick={startBreak}
                    >
                      <Coffee className="h-5 w-5" />
                      Start Break
                    </Button>
                  ) : (
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="gap-2"
                      onClick={endBreak}
                    >
                      <Coffee className="h-5 w-5" />
                      End Break
                    </Button>
                  )}
                  <Button 
                    size="lg" 
                    variant="destructive"
                    className="gap-2"
                    onClick={async () => {
                      await clockOut();
                      refetchEntries();
                    }}
                    disabled={isOnBreak}
                  >
                    <Square className="h-5 w-5" />
                    Clock Out
                    <MapPin className="h-4 w-4 ml-1" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">{todayEntries.length} entries</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">{weekEntries.length} entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">{monthEntries.length} entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Upcoming Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="shifts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shifts" className="gap-2">
            <Calendar className="h-4 w-4" />
            My Shifts
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <FileText className="h-4 w-4" />
            My Tasks
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="h-4 w-4" />
            My Hours
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts">
          <EmployeeShifts employeeId={employee.id} />
        </TabsContent>

        <TabsContent value="tasks">
          <EmployeeTasks userId={user?.id || ''} />
        </TabsContent>

        <TabsContent value="hours">
          <EmployeeHours entries={entries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
