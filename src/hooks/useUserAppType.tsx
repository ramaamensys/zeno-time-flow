import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AppType = 'calendar' | 'scheduler';

export const useUserAppType = () => {
  const { user } = useAuth();
  const [appType, setAppType] = useState<AppType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserAppType = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get user's roles to determine app access
        const { data, error } = await supabase
          .from('user_roles')
          .select('app_type, role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user app type:', error);
          // Default to showing app selector
          setAppType(null);
        } else if (data && data.length > 0) {
          // Check if user is admin (gets access to both apps)
          const isAdmin = data.some(role => role.role === 'admin' || role.role === 'super_admin');
          
          if (isAdmin) {
            // Admin gets app selector to choose - always show selector for admins
            setAppType(null);
          } else {
            // Check if regular user has multiple app access
            const uniqueAppTypes = [...new Set(data.map(role => role.app_type))];
            if (uniqueAppTypes.length > 1) {
              // User has access to multiple apps, show selector
              setAppType(null);
            } else {
              // Regular user gets their single assigned app
              setAppType(data[0].app_type as AppType);
            }
          }
        } else {
          // No role found, show app selector
          setAppType(null);
        }
      } catch (error) {
        console.error('Error in fetchUserAppType:', error);
        setAppType(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAppType();
  }, [user]);

  return { appType, isLoading };
};