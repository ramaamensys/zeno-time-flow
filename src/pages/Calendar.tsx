import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import DailyQuote from "@/components/DailyQuote";
import ShiftReminderNotification from "@/components/calendar/ShiftReminderNotification";
import ShiftAlertBanner from "@/components/calendar/ShiftAlertBanner";
import { useCalendarShiftNotification } from "@/hooks/useCalendarShiftNotification";
import { usePersistentTimeClock } from "@/hooks/usePersistentTimeClock";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface Shift {
  id: string;
  employee_id: string;
  company_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  company?: {
    name: string;
  };
}

// Interface that calendar views expect
interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: string;
  priority: string;
  created_at: string;
  user_id: string;
  completed: boolean;
  parent_task_id: string | null;
}

const Calendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { role, isLoading: roleLoading } = useUserRole();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // Check if user is super_admin - they get a standard calendar without employee link
  const isSuperAdmin = role === 'super_admin';

  // Shift notification hook
  const { 
    showNotification, 
    notificationShift, 
    dismissedShift,
    startShift, 
    startShiftFromBanner,
    dismissNotification 
  } = useCalendarShiftNotification();

  // Time clock hook to check if already clocked in
  const { activeEntry } = usePersistentTimeClock();

  // Fetch employee ID - skip for super_admin
  useEffect(() => {
    const fetchEmployeeId = async () => {
      if (!user || isSuperAdmin) {
        setIsLoading(false);
        return;
      }
      
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (employee) {
        setEmployeeId(employee.id);
      }
    };
    
    fetchEmployeeId();
  }, [user, isSuperAdmin]);

  // Fetch shifts for the current employee - skip for super_admin
  useEffect(() => {
    const fetchShifts = async () => {
      if (isSuperAdmin) {
        setIsLoading(false);
        return;
      }
      
      if (!employeeId) {
        setIsLoading(false);
        return;
      }

      try {
        // Get date range based on view
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);

        const { data, error } = await supabase
          .from('shifts')
          .select(`
            *,
            companies (name)
          `)
          .eq('employee_id', employeeId)
          .gte('start_time', monthStart.toISOString())
          .lte('start_time', monthEnd.toISOString())
          .order('start_time', { ascending: true });

        if (error) {
          toast({
            title: "Error fetching shifts",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setShifts(data || []);
        }
      } catch (error) {
        console.error('Error fetching shifts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShifts();

    // Set up real-time subscription for shifts
    const channel = supabase
      .channel('shifts-calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts',
          filter: `employee_id=eq.${employeeId}`
        },
        () => {
          fetchShifts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, currentDate, toast, isSuperAdmin]);

  // Convert shifts to calendar event format
  const shiftEvents: CalendarEvent[] = shifts.map(shift => ({
    id: shift.id,
    title: shift.company?.name || 'Shift',
    description: shift.notes || null,
    start_time: shift.start_time,
    end_time: shift.end_time,
    all_day: false,
    event_type: 'shift',
    priority: shift.status === 'confirmed' ? 'high' : 'medium',
    created_at: shift.start_time,
    user_id: user?.id || '',
    completed: shift.status === 'completed',
    parent_task_id: null,
  }));

  // Handler for viewing shift details (read-only)
  const handleViewShift = (event: CalendarEvent) => {
    const shift = shifts.find(s => s.id === event.id);
    if (shift) {
      toast({
        title: "Shift Details",
        description: `${format(new Date(shift.start_time), 'MMM d, h:mm a')} - ${format(new Date(shift.end_time), 'h:mm a')}${shift.notes ? `\n${shift.notes}` : ''}`,
      });
    }
  };

  // Dummy handlers since shifts are read-only for employees
  const handleDateClick = () => {
    // Employees can't create shifts
  };

  const handleTimeSlotClick = () => {
    // Employees can't create shifts  
  };

  if (isLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Super admin sees standard calendar without employee requirement
  // Non-super admins need an employee record to see shifts
  if (!isSuperAdmin && !employeeId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Employee Record</h2>
            <p className="text-muted-foreground">
              Your account is not linked to an employee record. Please contact your administrator to view your shifts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 relative">
      {/* Shift Reminder Notification - only for employees */}
      {!isSuperAdmin && showNotification && notificationShift && (
        <ShiftReminderNotification
          shift={notificationShift}
          onStartShift={startShift}
          onDismiss={dismissNotification}
        />
      )}

      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 space-y-6 p-6">
        {/* Shift Alert Banner - shows when notification was dismissed but shift is still upcoming */}
        {!isSuperAdmin && !showNotification && dismissedShift && !activeEntry && (
          <ShiftAlertBanner
            shift={dismissedShift}
            onStartShift={startShiftFromBanner}
          />
        )}

        <DailyQuote />
        
        {/* Info Card - different message for super_admin */}
        {!isSuperAdmin && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                This calendar shows your scheduled shifts. Shifts are assigned by your manager.
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Calendar Header - without create button functionality */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
              <button 
                className="h-10 w-10 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                onClick={() => {
                  switch (view) {
                    case "month":
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
                      break;
                    case "week":
                      setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
                      break;
                    case "day":
                      setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
                      break;
                  }
                }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                className="h-10 w-10 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                onClick={() => {
                  switch (view) {
                    case "month":
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
                      break;
                    case "week":
                      setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
                      break;
                    case "day":
                      setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
                      break;
                  }
                }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button 
                className="px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium text-gray-700"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {format(currentDate, view === "month" ? "MMMM yyyy" : view === "week" ? "MMM dd, yyyy" : "EEEE, MMMM dd, yyyy")}
            </h1>
            
            <select 
              value={view} 
              onChange={(e) => setView(e.target.value as "month" | "week" | "day")}
              className="w-32 h-12 rounded-xl border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white px-3"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>

        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            events={shiftEvents}
            onDateClick={handleDateClick}
            onEditEvent={handleViewShift}
          />
        )}

        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            events={shiftEvents}
            onTimeSlotClick={handleTimeSlotClick}
            onEditEvent={handleViewShift}
          />
        )}

        {view === "day" && (
          <DayView
            currentDate={currentDate}
            events={shiftEvents}
            onTimeSlotClick={handleTimeSlotClick}
            onEditEvent={handleViewShift}
          />
        )}
      </div>
    </div>
  );
};

export default Calendar;
