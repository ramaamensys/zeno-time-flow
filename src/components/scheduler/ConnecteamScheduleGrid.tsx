import React, { useState, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  MoreHorizontal, 
  Clock, 
  AlertTriangle, 
  Check, 
  X, 
  Calendar,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  Settings,
  Bell,
  Trash2,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Employee, Shift } from '@/hooks/useSchedulerDatabase';
import { AvailabilityStatus } from '@/hooks/useEmployeeAvailability';
import { ScheduleTeam } from '@/hooks/useScheduleTeams';

interface ConnecteamScheduleGridProps {
  employees: Employee[];
  shifts: Shift[];
  teams?: ScheduleTeam[];
  weekDates: Date[];
  isEditMode: boolean;
  canManageShifts: boolean;
  getEmployeeName: (id: string) => string;
  getAvailabilityStatus: (employeeId: string, date: Date) => AvailabilityStatus;
  onDragStart: (e: React.DragEvent, employeeId: string, shift?: Shift) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, employeeId: string, dayIndex: number) => void;
  onDragEnd: () => void;
  onShiftClick: (shift: Shift) => void;
  onAddShift: (employeeId: string, dayIndex: number) => void;
  onDeleteShift: (shiftId: string) => void;
  onSetAvailability?: (employeeId: string, date: Date, status: AvailabilityStatus) => void;
  checkShiftConflict: (employeeId: string, startTime: Date, endTime: Date, excludeShiftId?: string) => Shift | undefined;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  weekLabel: string;
  onToggleEditMode: () => void;
  onSaveSchedule: () => void;
  onAddNewSchedule: () => void;
  onClearWeek: () => void;
  onDuplicateWeek: () => void;
  onPrint: () => void;
  onDownload: () => void;
  isEmployeeView?: boolean;
  currentEmployeeId?: string;
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const availabilityIcons: Record<AvailabilityStatus, React.ReactNode> = {
  available: <Check className="h-2.5 w-2.5 text-green-600" />,
  prefers_to_work: <Calendar className="h-2.5 w-2.5 text-blue-600" />,
  unavailable: <X className="h-2.5 w-2.5 text-red-600" />
};

export default function ConnecteamScheduleGrid({
  employees,
  shifts,
  teams = [],
  weekDates,
  isEditMode,
  canManageShifts,
  getEmployeeName,
  getAvailabilityStatus,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onShiftClick,
  onAddShift,
  onDeleteShift,
  onSetAvailability,
  checkShiftConflict,
  onNavigateWeek,
  weekLabel,
  onToggleEditMode,
  onSaveSchedule,
  onAddNewSchedule,
  onClearWeek,
  onDuplicateWeek,
  onPrint,
  onDownload,
  isEmployeeView = false,
  currentEmployeeId
}: ConnecteamScheduleGridProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get team color for an employee
  const getTeamColor = (teamId: string | null | undefined): string => {
    if (!teamId) return '#6B7280'; // Default gray for no team
    const team = teams.find(t => t.id === teamId);
    return team?.color || '#6B7280';
  };

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    const term = searchTerm.toLowerCase();
    return employees.filter(e => 
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  const getShiftsForEmployeeAndDay = (employeeId: string, date: Date): Shift[] => {
    return shifts.filter(shift => {
      if (shift.employee_id !== employeeId) return false;
      const shiftDate = new Date(shift.start_time);
      return isSameDay(shiftDate, date);
    });
  };

  const getShiftsForDay = (date: Date): Shift[] => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.start_time);
      return isSameDay(shiftDate, date);
    });
  };

  // Calculate day stats
  const getDayStats = (date: Date) => {
    const dayShifts = getShiftsForDay(date);
    const totalHours = dayShifts.reduce((acc, shift) => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return acc + hours;
    }, 0);
    const uniqueEmployees = new Set(dayShifts.map(s => s.employee_id)).size;
    
    return {
      hours: totalHours.toFixed(0),
      shifts: dayShifts.length,
      users: uniqueEmployees
    };
  };

  // Calculate weekly totals - for employees, only show their own stats
  const weeklyStats = useMemo(() => {
    let totalHours = 0;
    let totalShifts = 0;
    const uniqueUsers = new Set<string>();

    // Filter shifts for employee view - only count their own shifts
    const relevantShifts = isEmployeeView && currentEmployeeId 
      ? shifts.filter(s => s.employee_id === currentEmployeeId)
      : shifts;

    relevantShifts.forEach(shift => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      totalHours += hours;
      totalShifts++;
      uniqueUsers.add(shift.employee_id);
    });

    return {
      hours: totalHours.toFixed(0),
      shifts: totalShifts,
      users: uniqueUsers.size
    };
  }, [shifts, isEmployeeView, currentEmployeeId]);

  const formatShiftTime = (shift: Shift): string => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  const getShiftColor = (shift: Shift): string => {
    if (shift.is_missed) {
      return 'bg-red-500 text-white';
    }
    if (shift.status === 'completed') {
      return 'bg-green-500 text-white';
    }
    if (shift.status === 'in_progress') {
      return 'bg-blue-500 text-white';
    }
    // Default - tan/brown color like Connecteam
    return 'bg-amber-600 text-white';
  };

  const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date());
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {/* Week Selector */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-2 font-medium">
              <Calendar className="h-4 w-4" />
              {weekLabel}
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons - only for managers, not employees */}
        {!isEmployeeView && canManageShifts && (
          <div className="flex items-center gap-2">
            {/* Direct Action Buttons */}
            <Button variant="outline" size="sm" className="gap-1" onClick={onToggleEditMode}>
              <Edit className="h-4 w-4" />
              {isEditMode ? 'Exit Edit' : 'Edit'}
            </Button>
            
            <Button variant="outline" size="sm" className="gap-1" onClick={onDuplicateWeek}>
              <Plus className="h-4 w-4" />
              Duplicate
            </Button>
            
            <Button variant="outline" size="sm" className="gap-1" onClick={onPrint}>
              Print
            </Button>
            
            <Button variant="outline" size="sm" className="gap-1" onClick={onDownload}>
              Download
            </Button>
            
            <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={onClearWeek}>
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>

            {/* Publish Button */}
            <Button size="sm" className="bg-primary text-primary-foreground" onClick={onSaveSchedule}>
              Publish
            </Button>

            {/* Notification Bell */}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[900px]">
          {/* Header Row */}
          <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b bg-muted/20 sticky top-0 z-10">
            {/* Search Column */}
            <div className="p-2 border-r flex items-center">
              <div className="relative w-full">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search us..." 
                  className="pl-8 h-8 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Day Columns */}
            {weekDates.map((date, index) => {
              const stats = getDayStats(date);
              const today = isToday(date);
              
              return (
                <div 
                  key={index} 
                  className={cn(
                    "p-2 text-center border-r last:border-r-0 relative",
                    today && "bg-primary/10"
                  )}
                >
                  {/* Date with highlight for today */}
                  <div className={cn(
                    "inline-flex items-center justify-center rounded-full px-3 py-1 mb-1",
                    today ? "bg-destructive text-destructive-foreground font-bold" : "font-medium"
                  )}>
                    {days[index]} {format(date, 'd/M')}
                  </div>
                  
                  {/* Day Stats */}
                  <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {stats.hours}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" />
                      {stats.shifts}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Users className="h-3 w-3" />
                      {stats.users}
                    </span>
                  </div>
                  
                  {/* Today indicator line */}
                  {today && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-destructive rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Employee Rows */}
          <TooltipProvider>
            {filteredEmployees.map((employee) => (
              <div 
                key={employee.id} 
                className="grid grid-cols-[220px_repeat(7,1fr)] border-b last:border-b-0 hover:bg-muted/10 group/row"
              >
                {/* Employee Info Cell with Team Color */}
                <div className="p-3 border-r flex items-start gap-3">
                  {/* Team color indicator */}
                  <div 
                    className="w-1 self-stretch rounded-full mr-1"
                    style={{ backgroundColor: getTeamColor((employee as any).team_id) }}
                  />
                  <Avatar className="h-9 w-9">
                    <AvatarFallback 
                      className="text-white text-xs font-semibold"
                      style={{ backgroundColor: getTeamColor((employee as any).team_id) }}
                    >
                      {employee.first_name[0]}{employee.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {employee.first_name} {employee.last_name.charAt(0)}...
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />--
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" />0
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Users className="h-3 w-3" />0
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/row:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                {/* Day Cells */}
                {weekDates.map((date, dayIndex) => {
                  const cellId = `${employee.id}-${dayIndex}`;
                  const dayShifts = getShiftsForEmployeeAndDay(employee.id, date);
                  const availability = getAvailabilityStatus(employee.id, date);
                  const isHovered = hoveredCell === cellId;
                  const today = isToday(date);

                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        "p-1.5 border-r last:border-r-0 min-h-[90px] relative transition-colors",
                        today && "bg-primary/5",
                        isEditMode && canManageShifts && "cursor-pointer hover:bg-muted/30"
                      )}
                      onMouseEnter={() => setHoveredCell(cellId)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, employee.id, dayIndex)}
                      onClick={() => {
                        if (isEditMode && canManageShifts && dayShifts.length === 0) {
                          onAddShift(employee.id, dayIndex);
                        }
                      }}
                    >
                      {/* Shifts */}
                      <div className="space-y-1">
                        {dayShifts.map((shift) => {
                          const hasConflict = checkShiftConflict(
                            employee.id, 
                            new Date(shift.start_time), 
                            new Date(shift.end_time),
                            shift.id
                          );

                          return (
                            <div
                              key={shift.id}
                              draggable={isEditMode && canManageShifts}
                              onDragStart={(e) => onDragStart(e, employee.id, shift)}
                              onDragEnd={onDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                canManageShifts && onShiftClick(shift);
                              }}
                              className={cn(
                                "px-2 py-2 rounded-md text-xs cursor-pointer transition-all relative group/shift",
                                getShiftColor(shift),
                                isEditMode && "hover:opacity-90 hover:shadow-md",
                                hasConflict && "ring-2 ring-orange-400"
                              )}
                            >
                              {/* Shift number badge */}
                              <div className="absolute -top-1 -left-1 w-4 h-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[9px] font-bold">
                                1
                              </div>
                              
                              <div className="font-medium flex items-center gap-1 text-[11px]">
                                {formatShiftTime(shift)}
                                {shift.replacement_employee_id && (
                                  <Users className="h-3 w-3" />
                                )}
                              </div>
                              
                              {shift.notes && (
                                <div className="text-[10px] opacity-80 truncate mt-0.5">
                                  {shift.notes}
                                </div>
                              )}
                              
                              {hasConflict && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertTriangle className="absolute top-1 right-1 h-3 w-3 text-orange-300" />
                                  </TooltipTrigger>
                                  <TooltipContent>Overlapping shift</TooltipContent>
                                </Tooltip>
                              )}

                              {/* Delete button on hover */}
                              {isEditMode && canManageShifts && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover/shift:opacity-100 bg-black/20 hover:bg-black/40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteShift(shift.id);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add button on hover when empty */}
                      {isEditMode && canManageShifts && isHovered && dayShifts.length === 0 && (
                        <div className="absolute inset-1 flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-full w-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddShift(employee.id, dayIndex);
                            }}
                          >
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </TooltipProvider>

          {/* Empty State */}
          {filteredEmployees.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              {searchTerm ? 'No employees match your search.' : 'No employees found. Add employees to start scheduling.'}
            </div>
          )}
        </div>
      </div>

      {/* Weekly Summary Footer */}
      <div className="border-t bg-muted/30 p-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-medium text-sm">
            <span className="text-muted-foreground">
              {isEmployeeView ? 'My weekly summary' : 'Weekly summary'}
            </span>
            {!isEmployeeView && (
              <Button variant="ghost" size="icon" className="h-5 w-5">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className={cn(
            "flex-1 grid gap-4",
            isEmployeeView ? "grid-cols-2" : "grid-cols-5"
          )}>
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-md">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{isEmployeeView ? 'My Hours' : 'Hours'}</span>
              <span className="font-bold">{weeklyStats.hours}:00</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-md">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{isEmployeeView ? 'My Shifts' : 'Shifts'}</span>
              <span className="font-bold">{weeklyStats.shifts}</span>
            </div>
            {!isEmployeeView && (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-md">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Users</span>
                  <span className="font-bold">{weeklyStats.users}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-md">
                  <span className="text-sm text-muted-foreground">Labor</span>
                  <span className="font-bold">--</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-md">
                  <span className="text-sm text-muted-foreground">Sales</span>
                  <span className="font-bold">--</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
