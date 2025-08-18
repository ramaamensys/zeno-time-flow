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
        // Get user's app type from user_roles table
        const { data, error } = await supabase
          .from('user_roles')
          .select('app_type')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user app type:', error);
          // Default to calendar app if no role found
          setAppType('calendar');
        } else {
          setAppType(data.app_type as AppType);
        }
      } catch (error) {
        console.error('Error in fetchUserAppType:', error);
        setAppType('calendar');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAppType();
  }, [user]);

  return { appType, isLoading };
};