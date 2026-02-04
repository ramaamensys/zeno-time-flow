import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ScheduleTeam {
  id: string;
  name: string;
  description: string | null;
  company_id: string;
  color: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useScheduleTeams(companyId: string | undefined) {
  const [teams, setTeams] = useState<ScheduleTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    if (!companyId) {
      setTeams([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_teams')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const createTeam = async (team: { name: string; description?: string; color?: string }) => {
    if (!companyId) return null;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('schedule_teams')
        .insert({
          name: team.name,
          description: team.description || null,
          color: team.color || '#3B82F6',
          company_id: companyId,
          created_by: userData.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Team Created',
        description: `"${team.name}" team has been created.`
      });

      await fetchTeams();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create team',
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateTeam = async (teamId: string, updates: { name?: string; description?: string; color?: string }) => {
    try {
      const { error } = await supabase
        .from('schedule_teams')
        .update(updates)
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: 'Team Updated',
        description: 'Team has been updated successfully.'
      });

      await fetchTeams();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update team',
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('schedule_teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: 'Team Deleted',
        description: 'Team has been deleted.'
      });

      await fetchTeams();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete team',
        variant: 'destructive'
      });
      return false;
    }
  };

  const assignEmployeeToTeam = async (employeeId: string, teamId: string | null) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ team_id: teamId })
        .eq('id', employeeId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign employee to team',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    teams,
    loading,
    refetch: fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    assignEmployeeToTeam
  };
}
