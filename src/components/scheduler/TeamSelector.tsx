import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users } from 'lucide-react';
import { ScheduleTeam } from '@/hooks/useScheduleTeams';
import { cn } from '@/lib/utils';

interface TeamSelectorProps {
  teams: ScheduleTeam[];
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string | null) => void;
  onCreateTeam: () => void;
  canManage: boolean;
  showAllOption?: boolean;
}

export default function TeamSelector({
  teams,
  selectedTeamId,
  onSelectTeam,
  onCreateTeam,
  canManage,
  showAllOption = true
}: TeamSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {showAllOption && canManage && (
        <Button
          variant={selectedTeamId === null ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectTeam(null)}
          className="gap-1"
        >
          <Users className="h-3.5 w-3.5" />
          All Teams
        </Button>
      )}
      
      {teams.map((team) => (
        <Button
          key={team.id}
          variant={selectedTeamId === team.id ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectTeam(team.id)}
          className={cn(
            "gap-1.5",
            selectedTeamId === team.id && "ring-2 ring-offset-1"
          )}
          style={{
            ...(selectedTeamId === team.id ? {
              backgroundColor: team.color,
              borderColor: team.color,
            } : {
              borderColor: team.color,
            })
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: team.color }}
          />
          {team.name}
        </Button>
      ))}

      {canManage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreateTeam}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          New Team
        </Button>
      )}

      {teams.length === 0 && !canManage && (
        <Badge variant="secondary" className="text-muted-foreground">
          No teams configured
        </Badge>
      )}
    </div>
  );
}
