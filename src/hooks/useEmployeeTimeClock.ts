import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TimeClockEntry {
  id: string;
  employee_id: string;
  shift_id?: string;
  clock_in: string | null;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_hours: number | null;
  overtime_hours: number | null;
  notes: string | null;
  clock_in_location?: { lat: number; lng: number; address?: string };
  clock_out_location?: { lat: number; lng: number; address?: string };
  created_at: string;
  updated_at: string;
}

export interface EmployeeRecord {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  company_id: string;
  department_id?: string;
  position?: string;
  hourly_rate?: number;
}

export function useEmployeeTimeClock() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [activeEntry, setActiveEntry] = useState<TimeClockEntry | null>(null);
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (data) {
        const roles = data.map(r => r.role);
        setIsAdmin(roles.includes('super_admin') || roles.includes('admin') || roles.includes('operations_manager') || roles.includes('manager'));
      }
    };
    
    checkRole();
  }, [user]);

  // Get employee record for current user
  useEffect(() => {
    const fetchEmployee = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        // User might not be an employee
        console.log('No employee record found for user');
        setLoading(false);
        return;
      }
      
      setEmployee(data as EmployeeRecord);
    };
    
    fetchEmployee();
  }, [user]);

  // Fetch time entries for employee
  const fetchEntries = useCallback(async () => {
    if (!employee) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('time_clock')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      setEntries(data || []);
      
      // Find active entry (clocked in but not out)
      const active = data?.find(entry => entry.clock_in && !entry.clock_out);
      setActiveEntry(active || null);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Get current location
  const getCurrentLocation = (): Promise<{ lat: number; lng: number; address?: string }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // Clock in with location
  const clockIn = async (shiftId?: string) => {
    if (!employee) {
      toast.error('No employee record found');
      return;
    }
    
    try {
      let location = null;
      try {
        location = await getCurrentLocation();
        toast.success('Location captured');
      } catch (locError) {
        console.warn('Could not get location:', locError);
        toast.warning('Clocking in without location');
      }
      
      const { data, error } = await supabase
        .from('time_clock')
        .insert([{
          employee_id: employee.id,
          shift_id: shiftId,
          clock_in: new Date().toISOString(),
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Log location separately if captured
      if (location && user) {
        await supabase.from('location_logs').insert([{
          user_id: user.id,
          location_address: `Clock In - Lat: ${location.lat}, Lng: ${location.lng}`,
          coordinates: location,
        }]);
      }
      
      setActiveEntry(data);
      setEntries(prev => [data, ...prev]);
      toast.success('Clocked in successfully');
      
      return data;
    } catch (error) {
      console.error('Error clocking in:', error);
      toast.error('Failed to clock in');
      throw error;
    }
  };

  // Clock out with location and auto-calculate hours
  const clockOut = async () => {
    if (!activeEntry) {
      toast.error('No active clock-in entry found');
      return;
    }
    
    try {
      let location = null;
      try {
        location = await getCurrentLocation();
        toast.success('Location captured');
      } catch (locError) {
        console.warn('Could not get location:', locError);
        toast.warning('Clocking out without location');
      }
      
      const clockOutTime = new Date();
      const clockInTime = new Date(activeEntry.clock_in!);
      
      // Calculate total hours (subtract break time if any)
      let totalMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60);
      
      // Subtract break time if there was a break
      if (activeEntry.break_start && activeEntry.break_end) {
        const breakStart = new Date(activeEntry.break_start);
        const breakEnd = new Date(activeEntry.break_end);
        const breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
        totalMinutes -= breakMinutes;
      }
      
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
      const overtimeHours = totalHours > 8 ? Math.round((totalHours - 8) * 100) / 100 : 0;
      
      const { data, error } = await supabase
        .from('time_clock')
        .update({
          clock_out: clockOutTime.toISOString(),
          total_hours: totalHours,
          overtime_hours: overtimeHours,
        })
        .eq('id', activeEntry.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log location if captured
      if (location && user) {
        await supabase.from('location_logs').insert([{
          user_id: user.id,
          location_address: `Clock Out - Lat: ${location.lat}, Lng: ${location.lng}`,
          coordinates: location,
        }]);
      }
      
      setActiveEntry(null);
      setEntries(prev => prev.map(e => e.id === data.id ? data : e));
      toast.success(`Clocked out. Total: ${totalHours.toFixed(2)} hours`);
      
      return data;
    } catch (error) {
      console.error('Error clocking out:', error);
      toast.error('Failed to clock out');
      throw error;
    }
  };

  // Start break
  const startBreak = async () => {
    if (!activeEntry) return;
    
    try {
      const { data, error } = await supabase
        .from('time_clock')
        .update({ break_start: new Date().toISOString() })
        .eq('id', activeEntry.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setActiveEntry(data);
      setEntries(prev => prev.map(e => e.id === data.id ? data : e));
      toast.success('Break started');
    } catch (error) {
      console.error('Error starting break:', error);
      toast.error('Failed to start break');
    }
  };

  // End break
  const endBreak = async () => {
    if (!activeEntry) return;
    
    try {
      const { data, error } = await supabase
        .from('time_clock')
        .update({ break_end: new Date().toISOString() })
        .eq('id', activeEntry.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setActiveEntry(data);
      setEntries(prev => prev.map(e => e.id === data.id ? data : e));
      toast.success('Break ended');
    } catch (error) {
      console.error('Error ending break:', error);
      toast.error('Failed to end break');
    }
  };

  // Calculate total hours for a period
  const calculatePeriodHours = (periodEntries: TimeClockEntry[]) => {
    return periodEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  };

  return {
    employee,
    activeEntry,
    entries,
    loading,
    isAdmin,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    refetch: fetchEntries,
    calculatePeriodHours,
  };
}

// Hook for admin to view all employees' time entries
export function useAdminTimeClock(companyId?: string, dateRange?: { start: Date; end: Date }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllEntries = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    
    try {
      let query = supabase
        .from('time_clock')
        .select(`
          *,
          employees!inner(
            id,
            first_name,
            last_name,
            email,
            company_id,
            department_id,
            position,
            hourly_rate
          )
        `)
        .eq('employees.company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (dateRange) {
        query = query
          .gte('clock_in', dateRange.start.toISOString())
          .lte('clock_in', dateRange.end.toISOString());
      }
      
      const { data, error } = await query.limit(500);
      
      if (error) throw error;
      
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching all time entries:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, dateRange]);

  useEffect(() => {
    fetchAllEntries();
  }, [fetchAllEntries]);

  // Calculate total hours by employee
  const getHoursByEmployee = () => {
    const hoursByEmployee: Record<string, { name: string; hours: number; overtime: number; entries: number }> = {};
    
    entries.forEach(entry => {
      const empId = entry.employee_id;
      const empName = `${entry.employees?.first_name || ''} ${entry.employees?.last_name || ''}`.trim();
      
      if (!hoursByEmployee[empId]) {
        hoursByEmployee[empId] = { name: empName, hours: 0, overtime: 0, entries: 0 };
      }
      
      hoursByEmployee[empId].hours += entry.total_hours || 0;
      hoursByEmployee[empId].overtime += entry.overtime_hours || 0;
      hoursByEmployee[empId].entries += 1;
    });
    
    return hoursByEmployee;
  };

  return {
    entries,
    loading,
    refetch: fetchAllEntries,
    getHoursByEmployee,
  };
}
