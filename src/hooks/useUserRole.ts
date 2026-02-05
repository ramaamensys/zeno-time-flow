import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Role Hierarchy:
 * 1. Super Admin - Full access to entire application (all orgs, companies, employees)
 * 2. Organization Manager (operations_manager enum) - Access to assigned organization only
 * 3. Company Manager (manager enum) - Access to assigned company only  
 * 4. Employee - Access to own profile and assigned tasks only
 */
export type UserRole = 'user' | 'admin' | 'super_admin' | 'operations_manager' | 'manager' | 'employee' | 'house_keeping' | 'maintenance';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [allRoles, setAllRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, app_type')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } else if (data && data.length > 0) {
        const roles = data.map(r => r.role as UserRole);
        setAllRoles(roles);
        
        // Determine primary role based on hierarchy priority
        if (roles.includes('super_admin')) {
          setRole('super_admin');
        } else if (roles.includes('operations_manager')) {
          setRole('operations_manager'); // Organization Manager
        } else if (roles.includes('manager')) {
          setRole('manager'); // Company Manager
        } else if (roles.includes('admin')) {
          setRole('admin');
        } else if (roles.includes('employee')) {
          setRole('employee');
        } else if (roles.includes('house_keeping')) {
          setRole('house_keeping');
        } else if (roles.includes('maintenance')) {
          setRole('maintenance');
        } else {
          setRole('user');
        }
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRole();

    // Set up real-time subscription for user_roles changes
    if (user) {
      const subscription = supabase
        .channel(`user_roles_changes_${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`
        }, () => {
          // Refetch roles when changes occur
          fetchUserRole();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  // Super Admin, Organization Manager (operations_manager), and Company Manager (manager) have admin privileges
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'operations_manager' || role === 'manager';
  // Employees, house_keeping, and maintenance are all operational staff with same access level
  const isEmployee = role === 'employee' || role === 'house_keeping' || role === 'maintenance';
  const isSuperAdmin = role === 'super_admin';
  const isOrganizationManager = role === 'operations_manager';
  const isCompanyManager = role === 'manager';
  const canManageShifts = role === 'admin' || role === 'super_admin' || role === 'operations_manager' || role === 'manager';

  return { 
    role, 
    allRoles, 
    isLoading, 
    isAdmin, 
    isEmployee,
    isSuperAdmin,
    isOrganizationManager,
    isCompanyManager,
    canManageShifts 
  };
};
