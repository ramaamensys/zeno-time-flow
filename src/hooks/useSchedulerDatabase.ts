import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Organization {
  id: string;
  name: string;
  color?: string;
  address?: string;
  phone?: string;
  email?: string;
  operations_manager_id?: string;
  organization_manager_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

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
  organization_id?: string;
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
  company_id: string | null;
  department_id?: string;
  team_id?: string | null;
  position?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  created_at: string;
  user_id?: string | null;
}

export interface Shift {
  id: string;
  employee_id: string;
  company_id: string;
  department_id?: string;
  team_id?: string | null;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  notes?: string;
  status: string;
  hourly_rate?: number;
  created_at: string;
  // Missed shift tracking fields
  is_missed?: boolean;
  missed_at?: string;
  replacement_employee_id?: string;
  replacement_approved_at?: string;
  replacement_started_at?: string;
}

export interface ShiftReplacementRequest {
  id: string;
  shift_id: string;
  original_employee_id: string;
  replacement_employee_id: string;
  company_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer_notes?: string;
  created_at: string;
  updated_at: string;
}

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    try {
      // RLS policies will automatically filter based on user role:
      // - Super admins see all organizations
      // - Organization managers only see their assigned organization
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (orgData: Omit<Organization, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .insert([orgData])
        .select()
        .single();

      if (error) throw error;
      
      setOrganizations(prev => [data, ...prev]);
      toast.success('Organization created successfully');
      return data;
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error('Failed to create organization');
      throw error;
    }
  };

  const updateOrganization = async (id: string, updates: Partial<Organization>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setOrganizations(prev => prev.map(o => o.id === id ? data : o));
      toast.success('Organization updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
      throw error;
    }
  };

  const deleteOrganization = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setOrganizations(prev => prev.filter(o => o.id !== id));
      toast.success('Organization deleted successfully');
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Failed to delete organization');
      throw error;
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return {
    organizations,
    loading,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    refetch: fetchOrganizations,
    fetchOrganizations
  };
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      // RLS policies will automatically filter based on user role:
      // - Super admins see all companies
      // - Organization managers see companies in their organization
      // - Company managers see only their assigned company
      // - Employees see only their company
      const { data, error } = await (supabase as any)
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

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
      
      // Only filter by company_id if it's a valid UUID (not "all" or empty)
      const isValidUuid = companyId && companyId !== 'all' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);
      
      if (isValidUuid) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query.order('name', { ascending: true });

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
  const [loading, setLoading] = useState(false);
  // Use ref to track fetched company to avoid stale closure issues
  const fetchedCompanyRef = React.useRef<string | undefined>(undefined);
  const isMountedRef = React.useRef(true);

  // Check if companyId is a valid UUID (not empty)
  const isValidCompanyId = companyId && companyId !== '' && 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);
  
  // "all" is a special case - fetch all employees
  const fetchAll = companyId === 'all';

  const fetchEmployees = async (targetCompanyId: string | undefined, forceRefresh = false) => {
    // Handle "all" case - fetch all employees without company filter
    const shouldFetchAll = targetCompanyId === 'all';
    
    // Validate the target company ID (unless fetching all)
    const isValid = shouldFetchAll || (targetCompanyId && targetCompanyId !== '' && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetCompanyId));
    
    if (!isValid) {
      if (isMountedRef.current) {
        setEmployees([]);
        setLoading(false);
        fetchedCompanyRef.current = undefined;
      }
      return;
    }

    // Skip if already fetched for this company (unless forced)
    if (!forceRefresh && fetchedCompanyRef.current === targetCompanyId) {
      return;
    }
    
    try {
      if (isMountedRef.current) {
        setLoading(true);
      }
      
      let query = (supabase as any)
        .from('employees')
        .select('*')
        .order('first_name', { ascending: true });
      
      // Only filter by company if not fetching all
      if (!shouldFetchAll) {
        query = query.eq('company_id', targetCompanyId);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      if (isMountedRef.current) {
        setEmployees(data || []);
        fetchedCompanyRef.current = targetCompanyId;
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
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
    isMountedRef.current = true;
    
    // Only clear employees if switching to a different valid company or to invalid
    if (companyId !== fetchedCompanyRef.current) {
      // Don't reset to empty immediately - let fetch handle it to avoid flicker
      fetchEmployees(companyId, false);
    }
    
    // Set up real-time subscription if we have a valid company ID or fetching all
    let subscription: ReturnType<typeof supabase.channel> | null = null;
    
    if (isValidCompanyId || fetchAll) {
      const channelName = fetchAll ? 'employees_changes_all' : `employees_changes_${companyId}`;
      const subscriptionConfig: any = { 
        event: '*', 
        schema: 'public', 
        table: 'employees'
      };
      
      // Only add filter if not fetching all
      if (!fetchAll && companyId) {
        subscriptionConfig.filter = `company_id=eq.${companyId}`;
      }
      
      subscription = supabase
        .channel(channelName)
        .on('postgres_changes', subscriptionConfig, (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              setEmployees(prev => prev.filter(e => e.id !== deletedId));
            }
          } else {
            fetchEmployees(companyId, true);
          }
        })
        .subscribe();
    }

    return () => {
      isMountedRef.current = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [companyId, isValidCompanyId, fetchAll]);

  return {
    employees,
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: () => fetchEmployees(companyId, true)
  };
}

export function useShifts(companyId?: string, weekStart?: Date) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if companyId is a valid UUID (not "all" or empty)
  const isValidCompanyId = companyId && companyId !== 'all' && 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);

  const fetchShifts = async () => {
    // Only fetch if we have a valid company ID - otherwise return empty array
    if (!isValidCompanyId) {
      setShifts([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('shifts')
        .select('*')
        .eq('company_id', companyId);
      
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