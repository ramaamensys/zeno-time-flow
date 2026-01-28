import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACTIVE_CLOCK_KEY = 'active_time_clock';

interface ActiveClockState {
  entryId: string;
  clockInTime: string;
  employeeId: string;
  shiftId?: string;
}

interface TimeClockEntry {
  id: string;
  clock_in: string | null;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_hours: number | null;
  overtime_hours: number | null;
}

// Get stored active clock state - works without auth
const getStoredClockState = (): ActiveClockState | null => {
  try {
    const stored = localStorage.getItem(ACTIVE_CLOCK_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Store active clock state
const storeClockState = (state: ActiveClockState | null) => {
  if (state) {
    localStorage.setItem(ACTIVE_CLOCK_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(ACTIVE_CLOCK_KEY);
  }
};

// Calculate elapsed time from stored clock-in - works without auth
const calculateElapsedTimeFromStorage = (): number => {
  const stored = getStoredClockState();
  if (stored?.clockInTime) {
    const clockIn = new Date(stored.clockInTime);
    const now = new Date();
    const diffMs = now.getTime() - clockIn.getTime();
    return Math.max(0, Math.floor(diffMs / 1000));
  }
  return 0;
};

// Format elapsed time
const formatElapsedTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const usePersistentTimeClock = () => {
  const { user } = useAuth();
  const [activeEntry, setActiveEntry] = useState<TimeClockEntry | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  // Initialize from localStorage immediately (before auth check)
  useEffect(() => {
    const stored = getStoredClockState();
    if (stored) {
      setElapsedSeconds(calculateElapsedTimeFromStorage());
      // Create a minimal activeEntry from stored state to show timer
      setActiveEntry({
        id: stored.entryId,
        clock_in: stored.clockInTime,
        clock_out: null,
        break_start: null,
        break_end: null,
        total_hours: null,
        overtime_hours: null
      });
    }
  }, []);

  // Start timer immediately if there's an active clock state
  useEffect(() => {
    const stored = getStoredClockState();
    
    if (stored) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Start the timer
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calculateElapsedTimeFromStorage());
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Fetch employee and verify active entry when user is available
  const fetchEmployeeData = useCallback(async () => {
    if (!user) {
      // Even without user, check localStorage for persisted timer
      const stored = getStoredClockState();
      if (stored) {
        setElapsedSeconds(calculateElapsedTimeFromStorage());
      }
      setIsLoading(false);
      return;
    }

    try {
      // Get employee record
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!employee) {
        setIsLoading(false);
        return;
      }

      setEmployeeId(employee.id);

      // Check for active time clock entry in database
      const { data: activeEntryData } = await supabase
        .from('time_clock')
        .select('*')
        .eq('employee_id', employee.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeEntryData) {
        setActiveEntry(activeEntryData);
        
        // Store in localStorage for persistence
        storeClockState({
          entryId: activeEntryData.id,
          clockInTime: activeEntryData.clock_in!,
          employeeId: employee.id,
          shiftId: activeEntryData.shift_id
        });
        
        // Calculate elapsed time
        setElapsedSeconds(calculateElapsedTimeFromStorage());
        
        // Ensure timer is running
        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            setElapsedSeconds(calculateElapsedTimeFromStorage());
          }, 1000);
        }
      } else {
        // No active entry in DB, clear local state
        setActiveEntry(null);
        storeClockState(null);
        setElapsedSeconds(0);
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      
      // Try to recover from localStorage
      const stored = getStoredClockState();
      if (stored) {
        setElapsedSeconds(calculateElapsedTimeFromStorage());
      }
    } finally {
      setIsLoading(false);
      hasInitialized.current = true;
    }
  }, [user]);

  // Clock in
  const clockIn = useCallback(async (shiftId?: string) => {
    if (!employeeId) {
      toast.error('Employee record not found');
      return;
    }

    try {
      const clockInTime = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('time_clock')
        .insert([{
          employee_id: employeeId,
          clock_in: clockInTime,
          shift_id: shiftId || null
        }])
        .select()
        .single();

      if (error) throw error;

      setActiveEntry(data);
      
      // Store in localStorage immediately
      storeClockState({
        entryId: data.id,
        clockInTime: data.clock_in!,
        employeeId,
        shiftId
      });
      
      // Reset elapsed seconds and start timer
      setElapsedSeconds(0);
      
      // Clear existing interval and start new one
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calculateElapsedTimeFromStorage());
      }, 1000);
      
      toast.success('Clocked in successfully');
      return data;
    } catch (error) {
      console.error('Error clocking in:', error);
      toast.error('Failed to clock in');
      throw error;
    }
  }, [employeeId]);

  // Clock out
  const clockOut = useCallback(async () => {
    if (!activeEntry) {
      toast.error('No active time entry found');
      return;
    }

    try {
      const clockOutTime = new Date();
      const clockIn = new Date(activeEntry.clock_in!);
      
      // Calculate total hours
      let totalMinutes = (clockOutTime.getTime() - clockIn.getTime()) / (1000 * 60);
      
      // Subtract break time if applicable
      if (activeEntry.break_start && activeEntry.break_end) {
        const breakStart = new Date(activeEntry.break_start);
        const breakEnd = new Date(activeEntry.break_end);
        const breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
        totalMinutes -= breakMinutes;
      }
      
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
      const overtimeHours = totalHours > 8 ? Math.round((totalHours - 8) * 100) / 100 : 0;

      const { error } = await supabase
        .from('time_clock')
        .update({
          clock_out: clockOutTime.toISOString(),
          total_hours: totalHours,
          overtime_hours: overtimeHours
        })
        .eq('id', activeEntry.id);

      if (error) throw error;

      // Clear state and localStorage
      setActiveEntry(null);
      storeClockState(null);
      setElapsedSeconds(0);
      
      // Stop the timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      toast.success(`Clocked out. Total: ${totalHours.toFixed(2)} hours`);
    } catch (error) {
      console.error('Error clocking out:', error);
      toast.error('Failed to clock out');
    }
  }, [activeEntry]);

  // Initial fetch when user changes
  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Check if currently clocked in (from localStorage - works without auth)
  const isClockedIn = (): boolean => {
    return getStoredClockState() !== null;
  };

  return {
    activeEntry,
    employeeId,
    isLoading,
    elapsedSeconds,
    elapsedTimeFormatted: formatElapsedTime(elapsedSeconds),
    clockIn,
    clockOut,
    refetch: fetchEmployeeData,
    isClockedIn
  };
};
