import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Company {
  id: string;
  name: string;
  type: string;
  color?: string;
  address?: string;
  phone?: string;
  email?: string;
  field_type?: 'IT' | 'Non-IT';
  operations_manager_id?: string;
  company_manager_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  color?: string;
  company_id: string;
  created_at: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  hire_date?: string;
  hourly_rate?: number;
  status: string;
  company_id: string;
  department_id?: string;
  position?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  created_at: string;
}

export interface Shift {
  id: string;
  employee_id: string;
  company_id: string;
  department_id?: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  notes?: string;
  status: string;
  hourly_rate?: number;
  created_at: string;
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('companies')
        .insert([companyData])
        .select()
        .single();

      if (error) throw error;
      
      setCompanies(prev => [data, ...prev]);
      toast.success('Company created successfully');
      return data;
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error('Failed to create company');
      throw error;
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setCompanies(prev => prev.map(c => c.id === id ? data : c));
      toast.success('Company updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company');
      throw error;
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCompanies(prev => prev.filter(c => c.id !== id));
      toast.success('Company deleted successfully');
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('Failed to delete company');
      throw error;
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  return {
    companies,
    loading,
    createCompany,
    updateCompany,
    deleteCompany,
    refetch: fetchCompanies,
    fetchCompanies
  };
}

export function useDepartments(companyId?: string) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = async () => {
    try {
      let query = (supabase as any).from('departments').select('*');
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const createDepartment = async (departmentData: Omit<Department, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('departments')
        .insert([departmentData])
        .select()
        .single();

      if (error) throw error;
      
      setDepartments(prev => [data, ...prev]);
      toast.success('Department created successfully');
      return data;
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error('Failed to create department');
      throw error;
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [companyId]);

  return {
    departments,
    loading,
    createDepartment,
    refetch: fetchDepartments
  };
}

export function useEmployees(companyId?: string) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      let query = (supabase as any).from('employees').select('*');
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (employeeData: Omit<Employee, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('employees')
        .insert([employeeData])
        .select()
        .single();

      if (error) throw error;
      
      setEmployees(prev => [data, ...prev]);
      toast.success('Employee created successfully');
      return data;
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error('Failed to create employee');
      throw error;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setEmployees(prev => prev.map(e => e.id === id ? data : e));
      toast.success('Employee updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee');
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      // IMPORTANT: PostgREST can return 204 even when 0 rows are affected (e.g. RLS blocks visibility).
      // Request the deleted row back so we can detect a no-op delete and show a real error.
      const { data, error } = await (supabase as any)
        .from('employees')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) throw error;
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Delete failed: not authorized or employee not found');
      }

      setEmployees(prev => prev.filter(e => e.id !== id));
      toast.success('Employee deleted successfully');
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
      throw error;
    }
  };

  useEffect(() => {
    fetchEmployees();
    
    // Set up real-time subscription for employees
    const subscription = supabase
      .channel('employees_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'employees',
        filter: companyId ? `company_id=eq.${companyId}` : undefined
      }, () => {
        fetchEmployees();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [companyId]);

  return {
    employees,
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: fetchEmployees
  };
}

export function useShifts(companyId?: string, weekStart?: Date) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShifts = async () => {
    try {
      let query = (supabase as any).from('shifts').select('*');
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      if (weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        query = query
          .gte('start_time', weekStart.toISOString())
          .lt('start_time', weekEnd.toISOString());
      }
      
      const { data, error } = await query.order('start_time', { ascending: true });

      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Failed to fetch shifts');
    } finally {
      setLoading(false);
    }
  };

  const createShift = async (shiftData: Omit<Shift, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('shifts')
        .insert([shiftData])
        .select()
        .single();

      if (error) throw error;
      
      setShifts(prev => [...prev, data]);
      toast.success('Shift created successfully');
      return data;
    } catch (error) {
      console.error('Error creating shift:', error);
      toast.error('Failed to create shift');
      throw error;
    }
  };

  const updateShift = async (id: string, updates: Partial<Shift>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('shifts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setShifts(prev => prev.map(s => s.id === id ? data : s));
      toast.success('Shift updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error('Failed to update shift');
      throw error;
    }
  };

  const deleteShift = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('shifts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setShifts(prev => prev.filter(s => s.id !== id));
      toast.success('Shift deleted successfully');
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast.error('Failed to delete shift');
      throw error;
    }
  };

  useEffect(() => {
    fetchShifts();
    
    // Set up real-time subscription for shifts
    const subscription = supabase
      .channel('shifts_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'shifts',
        filter: companyId ? `company_id=eq.${companyId}` : undefined
      }, () => {
        fetchShifts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [companyId, weekStart]);

  return {
    shifts,
    loading,
    createShift,
    updateShift,
    deleteShift,
    refetch: fetchShifts
  };
}