import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { parseISO, differenceInMinutes, isToday } from "date-fns";
import { usePersistentTimeClock } from "@/hooks/usePersistentTimeClock";

interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
}

const CALENDAR_NOTIFICATION_KEY = 'calendar_shift_notifications_shown';

export const useCalendarShiftNotification = () => {
  const { user } = useAuth();
  const { clockIn, activeEntry } = usePersistentTimeClock();
  const [upcomingShift, setUpcomingShift] = useState<Shift | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationShift, setNotificationShift] = useState<Shift | null>(null);

  // Get already shown notifications from localStorage
  const getShownNotifications = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(CALENDAR_NOTIFICATION_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Mark notification as shown
  const markNotificationShown = useCallback((shiftId: string) => {
    const shown = getShownNotifications();
    if (!shown.includes(shiftId)) {
      shown.push(shiftId);
      // Keep only last 50 notifications
      const trimmed = shown.slice(-50);
      localStorage.setItem(CALENDAR_NOTIFICATION_KEY, JSON.stringify(trimmed));
    }
  }, [getShownNotifications]);

  // Check if notification was already shown
  const wasNotificationShown = useCallback((shiftId: string): boolean => {
    const shown = getShownNotifications();
    return shown.includes(shiftId);
  }, [getShownNotifications]);

  // Start shift handler
  const startShift = useCallback(async (): Promise<boolean> => {
    if (notificationShift) {
      try {
        await clockIn(notificationShift.id);
        setShowNotification(false);
        setNotificationShift(null);
        return true;
      } catch (error) {
        console.error('Error starting shift:', error);
        return false;
      }
    }
    return false;
  }, [notificationShift, clockIn]);

  // Dismiss notification
  const dismissNotification = useCallback(() => {
    setShowNotification(false);
    if (notificationShift) {
      markNotificationShown(`${notificationShift.id}-dismissed`);
    }
  }, [notificationShift, markNotificationShown]);

  // Check for upcoming shifts
  const checkUpcomingShifts = useCallback(async () => {
    if (!user || activeEntry) return; // Don't show if already clocked in

    try {
      // Get employee record for current user
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!employee) return;

      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Get today's shifts for this employee
      const { data: shifts } = await supabase
        .from('shifts')
        .select('id, start_time, end_time, status')
        .eq('employee_id', employee.id)
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`)
        .order('start_time', { ascending: true });

      if (!shifts || shifts.length === 0) {
        setUpcomingShift(null);
        return;
      }

      // Find the next upcoming shift
      for (const shift of shifts) {
        const startTime = parseISO(shift.start_time);
        const minutesUntilStart = differenceInMinutes(startTime, now);

        // Check if shift is exactly 5 minutes away (within 30 second window)
        if (minutesUntilStart <= 5 && minutesUntilStart >= 0) {
          setUpcomingShift(shift);
          
          // Show notification if not already shown
          const notificationKey = `${shift.id}-${today}`;
          if (!wasNotificationShown(notificationKey)) {
            setShowNotification(true);
            setNotificationShift(shift);
            markNotificationShown(notificationKey);
          }
          return;
        }
      }

      setUpcomingShift(null);
    } catch (error) {
      console.error('Error checking upcoming shifts:', error);
    }
  }, [user, activeEntry, wasNotificationShown, markNotificationShown]);

  // Check shifts every 30 seconds
  useEffect(() => {
    checkUpcomingShifts();
    
    const interval = setInterval(checkUpcomingShifts, 30000);
    
    return () => clearInterval(interval);
  }, [checkUpcomingShifts]);

  return { 
    upcomingShift, 
    showNotification, 
    notificationShift,
    startShift, 
    dismissNotification 
  };
};
