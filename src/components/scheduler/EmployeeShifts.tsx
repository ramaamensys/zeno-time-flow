import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, MapPin, AlertTriangle, CheckCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, isTomorrow, isPast, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import CompanyMissedShifts from "./CompanyMissedShifts";

interface CompanyShift {
  id: string;
  employee_id: string;
  company_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  is_missed?: boolean;
  employees?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  departments?: {
    name: string;
  };
}

interface EmployeeShiftsProps {
  employeeId: string;
}

const GRACE_PERIOD_MINUTES = 15;

export default function EmployeeShifts({ employeeId }: EmployeeShiftsProps) {
  const [shifts, setShifts] = useState<any[]>([]);
  const [approvedReplacements, setApprovedReplacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Check if a shift should be considered missed (15 min past start, no clock-in, not already marked)
  const isShiftEffectivelyMissed = useCallback((shift: any): boolean => {
    // If already marked as missed in DB, it's missed
    if (shift.is_missed || shift.status === 'missed') {
      return true;
    }
    
    // Only check scheduled shifts
    if (shift.status !== 'scheduled') {
      return false;
    }
    
    const now = new Date();
    const startTime = new Date(shift.start_time);
    const graceThreshold = new Date(startTime.getTime() + GRACE_PERIOD_MINUTES * 60 * 1000);
    
    // If current time is past start_time + 15 minutes, consider it missed
    return now > graceThreshold;
  }, []);

  // Try to mark missed shifts in DB (will only work for users with update permission)
  const checkAndMarkMissedShifts = useCallback(async (): Promise<boolean> => {
    if (!employeeId) return false;
    
    let markedAny = false;
    
    try {
      const now = new Date();
      // Grace threshold = current time - 15 minutes
      const graceThreshold = new Date(now.getTime() - GRACE_PERIOD_MINUTES * 60 * 1000);
      
      console.log('Checking for missed shifts. Grace threshold:', graceThreshold.toISOString());
      
      // Find ALL scheduled shifts for this employee that started more than 15 min ago
      const { data: overdueShifts, error: fetchError } = await supabase
        .from('shifts')
        .select('id, employee_id, company_id, start_time')
        .eq('employee_id', employeeId)
        .eq('status', 'scheduled')
        .eq('is_missed', false)
        .lt('start_time', graceThreshold.toISOString());
      
      if (fetchError) {
        console.error('Error fetching overdue shifts:', fetchError);
        return false;
      }
      
      if (!overdueShifts || overdueShifts.length === 0) {
        console.log('No overdue shifts found');
        return false;
      }
      
      console.log('Found overdue shifts:', overdueShifts.length);
      
      // Check each shift for time clock entry
      for (const shift of overdueShifts) {
        const { data: clockEntry } = await supabase
          .from('time_clock')
          .select('id')
          .eq('shift_id', shift.id)
          .not('clock_in', 'is', null)
          .maybeSingle();
        
        // If no clock entry, try to mark as missed (may fail due to RLS)
        if (!clockEntry) {
          console.log('Attempting to mark shift as missed:', shift.id, 'start_time:', shift.start_time);
          const { error: updateError } = await supabase
            .from('shifts')
            .update({ 
              is_missed: true, 
              missed_at: now.toISOString(),
              status: 'missed'
            })
            .eq('id', shift.id);
          
          if (updateError) {
            console.log('Could not update shift in DB (RLS may prevent this):', updateError.message);
          } else {
            markedAny = true;
          }
        }
      }
    } catch (error) {
      console.error('Error checking missed shifts:', error);
    }
    
    return markedAny;
  }, [employeeId]);

  // Fetch shifts and approved replacements
  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // First get the employee's company
    const { data: employeeData } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', employeeId)
      .single();
    
    if (employeeData?.company_id) {
      setCompanyId(employeeData.company_id);
    }
    
    const today = addWeeks(new Date(), weekOffset);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    // Fetch own shifts
    const { data: ownShifts, error } = await supabase
      .from('shifts')
      .select(`
        *,
        companies(name),
        departments(name)
      `)
      .eq('employee_id', employeeId)
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', weekEnd.toISOString())
      .order('start_time', { ascending: true });
    
    if (!error) {
      setShifts(ownShifts || []);
    }
    
    // Fetch approved replacement shifts for this employee
    const { data: replacementShifts } = await supabase
      .from('shifts')
      .select(`
        *,
        companies(name),
        departments(name),
        employee:employees!shifts_employee_id_fkey(first_name, last_name)
      `)
      .eq('replacement_employee_id', employeeId)
      .not('replacement_approved_at', 'is', null)
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', weekEnd.toISOString())
      .order('start_time', { ascending: true });
    
    setApprovedReplacements(replacementShifts || []);
    setLoading(false);
  }, [employeeId, weekOffset]);

  // Fetch all company shifts for the team schedule view
  const [companyShifts, setCompanyShifts] = useState<CompanyShift[]>([]);
  const [loadingCompanyShifts, setLoadingCompanyShifts] = useState(false);
  const [scheduleTab, setScheduleTab] = useState<string>("my-shifts");

  const fetchCompanyShifts = useCallback(async () => {
    if (!companyId) return;
    
    setLoadingCompanyShifts(true);
    try {
      const today = addWeeks(new Date(), weekOffset);
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from('shifts')
        .select(`
          id, employee_id, company_id, start_time, end_time, status, notes, is_missed,
          employees!shifts_employee_id_fkey(id, first_name, last_name),
          departments(name)
        `)
        .eq('company_id', companyId)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setCompanyShifts(data || []);
    } catch (error) {
      console.error('Error fetching company shifts:', error);
    } finally {
      setLoadingCompanyShifts(false);
    }
  }, [companyId, weekOffset]);

  useEffect(() => {
    // Check for missed shifts first, then fetch data
    const runCheck = async () => {
      const markedAny = await checkAndMarkMissedShifts();
      await fetchData();
      await fetchCompanyShifts();
      // If we marked any shifts, refetch again to ensure UI is updated
      if (markedAny) {
        await fetchData();
      }
    };
    
    runCheck();
    
    // Set up interval to check for missed shifts every 30 seconds for quicker detection
    const intervalId = setInterval(async () => {
      const markedAny = await checkAndMarkMissedShifts();
      if (markedAny) {
        await fetchData();
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [checkAndMarkMissedShifts, fetchData, fetchCompanyShifts]);

  const getShiftStatusBadge = (shift: any) => {
    const startTime = parseISO(shift.start_time);
    const endTime = parseISO(shift.end_time);
    const now = new Date();
    
    // Check if shift is effectively missed (DB flag OR time-based detection)
    if (isShiftEffectivelyMissed(shift)) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Missed</Badge>;
    }
    if (shift.status === 'completed') {
      return <Badge variant="secondary">Completed</Badge>;
    }
    if (shift.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (isPast(endTime)) {
      return <Badge variant="secondary">Past</Badge>;
    }
    if (now >= startTime && now <= endTime) {
      return <Badge className="bg-green-500">In Progress</Badge>;
    }
    if (isToday(startTime)) {
      return <Badge variant="default">Today</Badge>;
    }
    if (isTomorrow(startTime)) {
      return <Badge variant="outline">Tomorrow</Badge>;
    }
    return <Badge variant="outline">Upcoming</Badge>;
  };

  // Use the real-time missed check for display purposes
  const isShiftMissed = (shift: any) => {
    return isShiftEffectivelyMissed(shift);
  };

  const getDayLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, 'EEEE');
  };

  // Group shifts by day
  const shiftsByDay = shifts.reduce((acc, shift) => {
    const dateKey = format(parseISO(shift.start_time), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(shift);
    return acc;
  }, {} as Record<string, any[]>);

  // Group approved replacements by day
  const replacementsByDay = approvedReplacements.reduce((acc, shift) => {
    const dateKey = format(parseISO(shift.start_time), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(shift);
    return acc;
  }, {} as Record<string, any[]>);

  // Group company shifts by day for team schedule view
  const companyShiftsByDay = companyShifts.reduce((acc, shift) => {
    const dateKey = format(parseISO(shift.start_time), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(shift);
    return acc;
  }, {} as Record<string, CompanyShift[]>);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  return (
    <div className="space-y-6">
    {/* Approved Replacement Shifts - Show at top */}
    {approvedReplacements.length > 0 && (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Approved Coverage Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            These shifts have been approved for you to cover. You can clock in from your dashboard.
          </p>
          <div className="space-y-3">
            {Object.entries(replacementsByDay).map(([dateKey, dayShifts]: [string, any[]]) => {
              const date = parseISO(dateKey);
              return (
                <div key={dateKey}>
                  <h4 className="font-medium mb-2 text-sm">
                    {getDayLabel(date)} - {format(date, 'MMMM d, yyyy')}
                  </h4>
                  {dayShifts.map((shift: any) => (
                    <div 
                      key={shift.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-green-500/10 border-green-500/30"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Approved
                        </Badge>
                        <div className="flex items-center gap-2 text-lg font-medium">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          {format(parseISO(shift.start_time), 'h:mm a')} - {format(parseISO(shift.end_time), 'h:mm a')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>Covering for: {shift.employee?.first_name} {shift.employee?.last_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {shift.companies?.name && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {shift.companies.name}
                          </span>
                        )}
                        {shift.departments?.name && (
                          <Badge variant="outline">{shift.departments.name}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    )}

    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="px-3 py-1 text-sm border rounded hover:bg-muted"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground px-2">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="px-3 py-1 text-sm border rounded hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={scheduleTab} onValueChange={setScheduleTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="my-shifts" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              My Shifts
            </TabsTrigger>
            <TabsTrigger value="team-schedule" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Schedule
            </TabsTrigger>
          </TabsList>

          {/* My Shifts Tab */}
          <TabsContent value="my-shifts">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading shifts...
              </div>
            ) : shifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No shifts scheduled for this week</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(shiftsByDay).map(([dateKey, dayShifts]: [string, any[]]) => {
                  const date = parseISO(dateKey);
                  return (
                    <div key={dateKey}>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <span className={isToday(date) ? "text-primary font-bold" : ""}>
                          {getDayLabel(date)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(date, 'MMMM d, yyyy')}
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {dayShifts.map((shift: any) => {
                          const missed = isShiftMissed(shift);
                          return (
                            <div 
                              key={shift.id} 
                              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                                missed 
                                  ? 'bg-destructive/10 border-destructive/30 hover:bg-destructive/20' 
                                  : 'bg-green-50 border-green-200 hover:bg-green-100'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                {missed && (
                                  <Badge variant="destructive" className="gap-1 uppercase font-bold animate-pulse">
                                    <AlertTriangle className="h-3 w-3" />
                                    Missed
                                  </Badge>
                                )}
                                <div className={`flex items-center gap-2 text-lg font-medium ${missed ? 'text-destructive' : ''}`}>
                                  <Clock className={`h-5 w-5 ${missed ? 'text-destructive' : 'text-muted-foreground'}`} />
                                  {format(parseISO(shift.start_time), 'h:mm a')} - {format(parseISO(shift.end_time), 'h:mm a')}
                                </div>
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  (You)
                                </Badge>
                                <div className="text-sm text-muted-foreground">
                                  {shift.companies?.name && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {shift.companies.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {shift.departments?.name && (
                                  <Badge variant="outline">{shift.departments.name}</Badge>
                                )}
                                {!missed && getShiftStatusBadge(shift)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Team Schedule Tab */}
          <TabsContent value="team-schedule">
            {loadingCompanyShifts ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading team schedule...
              </div>
            ) : companyShifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No team shifts scheduled for this week</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(companyShiftsByDay).map(([dateKey, dayShifts]) => {
                  const date = parseISO(dateKey);
                  return (
                    <div key={dateKey}>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <span className={isToday(date) ? "text-primary font-bold" : ""}>
                          {getDayLabel(date)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(date, 'MMMM d, yyyy')}
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                        </Badge>
                      </h3>
                      <div className="space-y-3">
                        {dayShifts.map((shift) => {
                          const isOwnShift = shift.employee_id === employeeId;
                          const missed = shift.is_missed || shift.status === 'missed';
                          return (
                            <div 
                              key={shift.id} 
                              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                                missed 
                                  ? 'bg-destructive/10 border-destructive/30' 
                                  : isOwnShift 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-muted/30 border-muted'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                {/* Employee Avatar */}
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                  isOwnShift ? 'bg-green-200 text-green-700' : 'bg-primary/10 text-primary'
                                }`}>
                                  <span className="text-sm font-medium">
                                    {shift.employees?.first_name?.[0]}{shift.employees?.last_name?.[0]}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium flex items-center gap-2">
                                    {shift.employees?.first_name} {shift.employees?.last_name}
                                    {isOwnShift && (
                                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                        (You)
                                      </Badge>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {format(parseISO(shift.start_time), 'h:mm a')} - {format(parseISO(shift.end_time), 'h:mm a')}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {shift.departments?.name && (
                                  <Badge variant="outline">{shift.departments.name}</Badge>
                                )}
                                {missed ? (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Missed
                                  </Badge>
                                ) : (
                                  getShiftStatusBadge(shift)
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    
    {/* Company Missed Shifts - Available for coverage */}
    {companyId && (
      <CompanyMissedShifts companyId={companyId} employeeId={employeeId} />
    )}
    </div>
  );
}
