import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface MissedShift {
  id: string;
  employee_id: string;
  company_id: string;
  department_id?: string;
  start_time: string;
  end_time: string;
  status: string;
  is_missed: boolean;
  missed_at: string;
  replacement_employee_id?: string;
  replacement_approved_at?: string;
  replacement_started_at?: string;
  notes?: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  replacement_employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  company?: {
    id: string;
    name: string;
    organization_id?: string;
  };
}

export interface ReplacementRequest {
  id: string;
  shift_id: string;
  original_employee_id: string;
  replacement_employee_id: string;
  company_id: string;
  status: string;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer_notes?: string;
  shift?: MissedShift;
  original_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  replacement_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

const GRACE_PERIOD_MINUTES = 15;

export function useMissedShifts(companyId?: string, employeeCompanyId?: string) {
  const { user } = useAuth();
  const [missedShifts, setMissedShifts] = useState<MissedShift[]>([]);
  const [replacementRequests, setReplacementRequests] = useState<ReplacementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);

  // Get current user's employee ID once
  useEffect(() => {
    const getMyEmployee = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setMyEmployeeId(data?.id || null);
    };
    getMyEmployee();
  }, [user]);

  const fetchMissedShifts = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Determine which company to filter by
      const filterCompanyId = companyId && companyId !== 'all' ? companyId : employeeCompanyId;
      
      let query = supabase
        .from('shifts')
        .select(`
          *,
          employee:employees!shifts_employee_id_fkey(id, first_name, last_name, email),
          company:companies(id, name, organization_id)
        `)
        .eq('is_missed', true)
        .order('missed_at', { ascending: false });
      
      // Filter by company - required for employees to only see their company's shifts
      if (filterCompanyId) {
        query = query.eq('company_id', filterCompanyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Fetch replacement employee info for shifts that have one
      // Also filter out shifts where the current employee is the one who missed (can't replace yourself)
      const shiftsWithReplacements = await Promise.all(
        (data || [])
          .filter((shift: any) => shift.employee_id !== myEmployeeId) // Exclude own missed shifts
          .map(async (shift: any) => {
            if (shift.replacement_employee_id) {
              const { data: replEmployee } = await supabase
                .from('employees')
                .select('id, first_name, last_name, email')
                .eq('id', shift.replacement_employee_id)
                .single();
              return { ...shift, replacement_employee: replEmployee };
            }
            return shift;
          })
      );
      
      setMissedShifts(shiftsWithReplacements);
    } catch (error) {
      console.error('Error fetching missed shifts:', error);
      toast.error('Failed to load missed shifts');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplacementRequests = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('shift_replacement_requests')
        .select(`
          *,
          original_employee:employees!shift_replacement_requests_original_employee_id_fkey(id, first_name, last_name),
          replacement_employee:employees!shift_replacement_requests_replacement_employee_id_fkey(id, first_name, last_name)
        `)
        .order('requested_at', { ascending: false });
      
      if (companyId && companyId !== 'all') {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setReplacementRequests(data || []);
    } catch (error) {
      console.error('Error fetching replacement requests:', error);
    }
  };

  // Check for shifts that should be marked as missed (15 min grace period)
  const checkAndMarkMissedShifts = async () => {
    if (!user) return;
    
    try {
      const now = new Date();
      const graceThreshold = new Date(now.getTime() - GRACE_PERIOD_MINUTES * 60 * 1000);
      
      // Find scheduled shifts that have passed the grace period without clock-in
      const { data: overdueShifts, error: fetchError } = await supabase
        .from('shifts')
        .select('id, employee_id, company_id, start_time')
        .eq('status', 'scheduled')
        .eq('is_missed', false)
        .lt('start_time', graceThreshold.toISOString());
      
      if (fetchError) throw fetchError;
      
      if (!overdueShifts || overdueShifts.length === 0) return;
      
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
      
      // Refresh the missed shifts list
      await fetchMissedShifts();
    } catch (error) {
      console.error('Error checking missed shifts:', error);
    }
  };

  // Request to take over a missed shift
  const requestReplacement = async (shiftId: string, originalEmployeeId: string, companyIdForRequest: string) => {
    if (!user) return;
    
    try {
      // Get current user's employee record
      const { data: myEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!myEmployee) {
        toast.error('You must be an employee to request a shift replacement');
        return;
      }
      
      // Check if already requested
      const { data: existing } = await supabase
        .from('shift_replacement_requests')
        .select('id')
        .eq('shift_id', shiftId)
        .eq('replacement_employee_id', myEmployee.id)
        .maybeSingle();
      
      if (existing) {
        toast.error('You have already requested this shift');
        return;
      }
      
      const { error } = await supabase
        .from('shift_replacement_requests')
        .insert({
          shift_id: shiftId,
          original_employee_id: originalEmployeeId,
          replacement_employee_id: myEmployee.id,
          company_id: companyIdForRequest,
          status: 'pending'
        });
      
      if (error) throw error;
      
      toast.success('Replacement request submitted');
      await fetchReplacementRequests();
    } catch (error) {
      console.error('Error requesting replacement:', error);
      toast.error('Failed to submit replacement request');
    }
  };

  // Approve replacement request (manager action)
  const approveRequest = async (requestId: string) => {
    if (!user) return;
    
    try {
      // Get the request details
      const { data: request, error: fetchError } = await supabase
        .from('shift_replacement_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (fetchError || !request) throw fetchError || new Error('Request not found');
      
      // Update the request status
      const { error: updateRequestError } = await supabase
        .from('shift_replacement_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId);
      
      if (updateRequestError) throw updateRequestError;
      
      // Update the shift with replacement employee
      const { error: updateShiftError } = await supabase
        .from('shifts')
        .update({
          replacement_employee_id: request.replacement_employee_id,
          replacement_approved_at: new Date().toISOString()
        })
        .eq('id', request.shift_id);
      
      if (updateShiftError) throw updateShiftError;
      
      // Reject all other pending requests for this shift
      await supabase
        .from('shift_replacement_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewer_notes: 'Another replacement was approved'
        })
        .eq('shift_id', request.shift_id)
        .neq('id', requestId)
        .eq('status', 'pending');
      
      toast.success('Replacement approved');
      await fetchReplacementRequests();
      await fetchMissedShifts();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve replacement');
    }
  };

  // Reject replacement request (manager action)
  const rejectRequest = async (requestId: string, notes?: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('shift_replacement_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewer_notes: notes
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast.success('Replacement rejected');
      await fetchReplacementRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject replacement');
    }
  };

  // Mark replacement as started (employee starts working the shift)
  // Returns true if successful, so callers can trigger their own refetches
  const startReplacementShift = async (shiftId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Get employee record
      const { data: myEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!myEmployee) {
        toast.error('Employee record not found');
        return false;
      }
      
      // Verify this employee is the approved replacement
      const { data: shift } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .eq('replacement_employee_id', myEmployee.id)
        .single();
      
      if (!shift) {
        toast.error('You are not approved to work this shift');
        return false;
      }
      
      // Update shift with started timestamp AND change status to 'in_progress'
      // This ensures managers and super users see the update immediately
      const now = new Date();
      const { error: updateShiftError } = await supabase
        .from('shifts')
        .update({
          replacement_started_at: now.toISOString(),
          status: 'in_progress' // Update status so it reflects across all views
        })
        .eq('id', shiftId);
      
      if (updateShiftError) throw updateShiftError;
      
      // Create time clock entry for the replacement employee
      const { error: clockError } = await supabase
        .from('time_clock')
        .insert({
          employee_id: myEmployee.id,
          shift_id: shiftId,
          clock_in: now.toISOString(),
          notes: `Replacement shift - original employee: ${shift.employee_id}`
        });
      
      if (clockError) throw clockError;
      
      toast.success('Shift started successfully');
      await fetchMissedShifts();
      return true;
    } catch (error) {
      console.error('Error starting replacement shift:', error);
      toast.error('Failed to start shift');
      return false;
    }
  };

  useEffect(() => {
    fetchMissedShifts();
    fetchReplacementRequests();
    
    // Check for missed shifts every minute
    const intervalId = setInterval(checkAndMarkMissedShifts, 60000);
    
    // Initial check
    checkAndMarkMissedShifts();
    
    return () => clearInterval(intervalId);
  }, [user, companyId, employeeCompanyId, myEmployeeId]);

  return {
    missedShifts,
    replacementRequests,
    loading,
    myEmployeeId,
    requestReplacement,
    approveRequest,
    rejectRequest,
    startReplacementShift,
    refetch: () => {
      fetchMissedShifts();
      fetchReplacementRequests();
    }
  };
}
