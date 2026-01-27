import { useState, useEffect, useCallback } from "react";
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

export const usePersistentTimeClock = () => {
  const { user } = useAuth();
  const [activeEntry, setActiveEntry] = useState<TimeClockEntry | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Get stored active clock state
  const getStoredClockState = useCallback((): ActiveClockState | null => {
    try {
      const stored = localStorage.getItem(ACTIVE_CLOCK_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Store active clock state
  const storeClockState = useCallback((state: ActiveClockState | null) => {
    if (state) {
      localStorage.setItem(ACTIVE_CLOCK_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(ACTIVE_CLOCK_KEY);
    }
  }, []);

  // Calculate elapsed time from stored clock-in
  const calculateElapsedTime = useCallback(() => {
    const stored = getStoredClockState();
    if (stored?.clockInTime) {
      const clockIn = new Date(stored.clockInTime);
      const now = new Date();
      const diffMs = now.getTime() - clockIn.getTime();
      return Math.floor(diffMs / 1000);
    }
    return 0;
  }, [getStoredClockState]);

  // Fetch employee and active entry
  const fetchEmployeeData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get employee record
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!employee) {
        setIsLoading(false);
        return;
      }

      setEmployeeId(employee.id);

      // Check for active time clock entry
      const { data: activeEntryData } = await supabase
        .from('time_clock')
        .select('*')
        .eq('employee_id', employee.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .single();

      if (activeEntryData) {
        setActiveEntry(activeEntryData);
        
        // Store in localStorage for persistence
        storeClockState({
          entryId: activeEntryData.id,
          clockInTime: activeEntryData.clock_in!,
          employeeId: employee.id,
          shiftId: activeEntryData.shift_id
        });
        
        // Calculate initial elapsed time
        setElapsedSeconds(calculateElapsedTime());
      } else {
        setActiveEntry(null);
        storeClockState(null);
        setElapsedSeconds(0);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      
      // Try to recover from localStorage
      const stored = getStoredClockState();
      if (stored) {
        // Verify the entry still exists
        const { data } = await supabase
          .from('time_clock')
          .select('*')
          .eq('id', stored.entryId)
          .is('clock_out', null)
          .single();
        
        if (data) {
          setActiveEntry(data);
          setElapsedSeconds(calculateElapsedTime());
        } else {
          storeClockState(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, storeClockState, getStoredClockState, calculateElapsedTime]);

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
      storeClockState({
        entryId: data.id,
        clockInTime: data.clock_in!,
        employeeId,
        shiftId
      });
      setElapsedSeconds(0);
      
      toast.success('Clocked in successfully');
    } catch (error) {
      console.error('Error clocking in:', error);
      toast.error('Failed to clock in');
    }
  }, [employeeId, storeClockState]);

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

      setActiveEntry(null);
      storeClockState(null);
      setElapsedSeconds(0);
      
      toast.success(`Clocked out. Total: ${totalHours.toFixed(2)} hours`);
    } catch (error) {
      console.error('Error clocking out:', error);
      toast.error('Failed to clock out');
    }
  }, [activeEntry, storeClockState]);

  // Initial fetch
  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  // Update elapsed time every second
  useEffect(() => {
    if (!activeEntry) return;

    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsedTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeEntry, calculateElapsedTime]);

  // Format elapsed time
  const formatElapsedTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    activeEntry,
    employeeId,
    isLoading,
    elapsedSeconds,
    elapsedTimeFormatted: formatElapsedTime(elapsedSeconds),
    clockIn,
    clockOut,
    refetch: fetchEmployeeData
  };
};
