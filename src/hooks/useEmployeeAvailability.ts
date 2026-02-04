import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type AvailabilityStatus = 'available' | 'prefers_to_work' | 'unavailable';

export interface EmployeeAvailability {
  id: string;
  employee_id: string;
  company_id: string;
  date: string;
  status: AvailabilityStatus;
  start_time?: string;
  end_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useEmployeeAvailability(companyId?: string, weekStart?: Date) {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<EmployeeAvailability[]>([]);
  const [loading, setLoading] = useState(false);

  const isValidCompanyId = companyId && companyId !== 'all' && 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);

  const fetchAvailability = useCallback(async () => {
    if (!user || !isValidCompanyId) {
      setAvailability([]);
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from('employee_availability')
        .select('*')
        .eq('company_id', companyId);

      if (weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        query = query
          .gte('date', weekStart.toISOString().split('T')[0])
          .lt('date', weekEnd.toISOString().split('T')[0]);
      }

      const { data, error } = await query.order('date', { ascending: true });

      if (error) throw error;
      // Cast the status field to our type
      const typedData = (data || []).map(item => ({
        ...item,
        status: item.status as AvailabilityStatus
      }));
      setAvailability(typedData);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  }, [user, companyId, isValidCompanyId, weekStart]);

  const setEmployeeAvailability = async (
    employeeId: string, 
    date: Date, 
    status: AvailabilityStatus,
    notes?: string
  ) => {
    if (!user || !isValidCompanyId) return;

    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // Upsert - insert or update on conflict
      const { data, error } = await supabase
        .from('employee_availability')
        .upsert({
          employee_id: employeeId,
          company_id: companyId,
          date: dateStr,
          status,
          notes
        }, {
          onConflict: 'employee_id,date'
        })
        .select()
        .single();

      if (error) throw error;

      // Cast the status field
      const typedData: EmployeeAvailability = {
        ...data,
        status: data.status as AvailabilityStatus
      };

      setAvailability(prev => {
        const existing = prev.findIndex(a => a.employee_id === employeeId && a.date === dateStr);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = typedData;
          return updated;
        }
        return [...prev, typedData];
      });

      toast.success('Availability updated');
    } catch (error) {
      console.error('Error setting availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const getAvailabilityForEmployee = useCallback((employeeId: string, date: Date): EmployeeAvailability | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return availability.find(a => a.employee_id === employeeId && a.date === dateStr);
  }, [availability]);

  const getAvailabilityStatus = useCallback((employeeId: string, date: Date): AvailabilityStatus => {
    const av = getAvailabilityForEmployee(employeeId, date);
    return av?.status || 'available'; // Default to available if not set
  }, [getAvailabilityForEmployee]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return {
    availability,
    loading,
    setEmployeeAvailability,
    getAvailabilityForEmployee,
    getAvailabilityStatus,
    refetch: fetchAvailability
  };
}
