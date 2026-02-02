import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, isTomorrow, isPast, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import CompanyMissedShifts from "./CompanyMissedShifts";

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

  // Check and mark missed shifts automatically
  const checkAndMarkMissedShifts = useCallback(async () => {
    if (!employeeId) return;
    
    try {
      const now = new Date();
      const graceThreshold = new Date(now.getTime() - GRACE_PERIOD_MINUTES * 60 * 1000);
      
      // Find scheduled shifts that have passed the grace period without clock-in
      const { data: overdueShifts, error: fetchError } = await supabase
        .from('shifts')
        .select('id, employee_id, company_id, start_time')
        .eq('employee_id', employeeId)
        .eq('status', 'scheduled')
        .eq('is_missed', false)
        .lt('start_time', graceThreshold.toISOString());
      
      if (fetchError || !overdueShifts || overdueShifts.length === 0) return;
      
      // Check each shift for time clock entry
      for (const shift of overdueShifts) {
        const { data: clockEntry } = await supabase
          .from('time_clock')
          .select('id')
          .eq('shift_id', shift.id)
          .not('clock_in', 'is', null)
          .maybeSingle();
        
        // If no clock entry, mark as missed
        if (!clockEntry) {
          await supabase
            .from('shifts')
            .update({ 
              is_missed: true, 
              missed_at: now.toISOString(),
              status: 'missed'
            })
            .eq('id', shift.id);
        }
      }
    } catch (error) {
      console.error('Error checking missed shifts:', error);
    }
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

  useEffect(() => {
    // Check for missed shifts first, then fetch data
    checkAndMarkMissedShifts().then(() => fetchData());
    
    // Set up interval to check for missed shifts every minute
    const intervalId = setInterval(checkAndMarkMissedShifts, 60000);
    
    return () => clearInterval(intervalId);
  }, [checkAndMarkMissedShifts, fetchData]);

  const getShiftStatusBadge = (shift: any) => {
    const startTime = parseISO(shift.start_time);
    const endTime = parseISO(shift.end_time);
    const now = new Date();
    
    // Check if shift is missed
    if (shift.is_missed || shift.status === 'missed') {
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

  const isShiftMissed = (shift: any) => {
    return shift.is_missed || shift.status === 'missed';
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Schedule
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
                              : 'bg-card hover:bg-muted/50'
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
      </CardContent>
    </Card>
    
    {/* Company Missed Shifts - Available for coverage */}
    {companyId && (
      <CompanyMissedShifts companyId={companyId} employeeId={employeeId} />
    )}
    </div>
  );
}
