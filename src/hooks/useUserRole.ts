import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'user' | 'admin' | 'super_admin' | 'operations_manager' | 'manager' | 'employee';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [allRoles, setAllRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
          
          // Determine primary role based on priority
          if (roles.includes('super_admin')) {
            setRole('super_admin');
          } else if (roles.includes('operations_manager')) {
            setRole('operations_manager');
          } else if (roles.includes('manager')) {
            setRole('manager');
          } else if (roles.includes('admin')) {
            setRole('admin');
          } else if (roles.includes('employee') || roles.includes('candidate' as any)) {
            setRole('employee');
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

    fetchUserRole();
  }, [user]);

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'operations_manager' || role === 'manager';
  const isEmployee = role === 'employee';
  const canManageShifts = role === 'admin' || role === 'super_admin' || role === 'operations_manager' || role === 'manager';

  return { 
    role, 
    allRoles, 
    isLoading, 
    isAdmin, 
    isEmployee, 
    canManageShifts 
  };
};
