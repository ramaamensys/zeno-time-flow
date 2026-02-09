import React, { useState, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, 
  Clock, 
  AlertTriangle, 
  X, 
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Bell,
  Trash2,
  Edit,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Employee, Shift } from '@/hooks/useSchedulerDatabase';
import { AvailabilityStatus } from '@/hooks/useEmployeeAvailability';
import { ScheduleTeam } from '@/hooks/useScheduleTeams';

interface ConnecteamScheduleGridProps {
  onCreateShiftDirect?: (employeeId: string, dayIndex: number, startTime: string, endTime: string) => void;
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

const presetShifts = [
  { label: 'Morning (6AM-2PM)', startHour: 6, endHour: 14 },
  { label: 'Afternoon (2PM-10PM)', startHour: 14, endHour: 22 },
  { label: 'Night (10PM-6AM)', startHour: 22, endHour: 6 },
  { label: 'Day (9AM-5PM)', startHour: 9, endHour: 17 },
];

interface InlineShiftForm {
  dayIndex: number;
  selectedPreset: string;
  startTime: string;
  endTime: string;
  employeeId: string;
}

export default function ConnecteamScheduleGrid({
  onCreateShiftDirect,
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
  const [inlineForm, setInlineForm] = useState<InlineShiftForm | null>(null);

  const getTeamColor = (teamId: string | null | undefined): string => {
    if (!teamId) return '#6B7280';
    const team = teams.find(t => t.id === teamId);
    return team?.color || '#6B7280';
  };

  const getShiftsForDay = (date: Date): Shift[] => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.start_time);
      return isSameDay(shiftDate, date);
    });
  };

  const getDayStats = (date: Date) => {
    const dayShifts = getShiftsForDay(date);
    const totalHours = dayShifts.reduce((acc, shift) => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    const uniqueEmployees = new Set(dayShifts.map(s => s.employee_id)).size;
    return { hours: totalHours.toFixed(0), shifts: dayShifts.length, users: uniqueEmployees };
  };

  const weeklyStats = useMemo(() => {
    let totalHours = 0;
    let totalShifts = 0;
    const uniqueUsers = new Set<string>();
    const relevantShifts = isEmployeeView && currentEmployeeId 
      ? shifts.filter(s => s.employee_id === currentEmployeeId)
      : shifts;
    relevantShifts.forEach(shift => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      totalShifts++;
      uniqueUsers.add(shift.employee_id);
    });
    return { hours: totalHours.toFixed(0), shifts: totalShifts, users: uniqueUsers.size };
  }, [shifts, isEmployeeView, currentEmployeeId]);

  const formatShiftTime = (shift: Shift): string => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  const getShiftColor = (shift: Shift): string => {
    if (shift.is_missed) return 'bg-red-500 text-white';
    if (shift.status === 'completed') return 'bg-green-500 text-white';
    if (shift.status === 'in_progress') return 'bg-blue-500 text-white';
    return 'bg-amber-600 text-white';
  };

  const isToday = (date: Date): boolean => isSameDay(date, new Date());

  const handleStartInlineForm = (dayIndex: number) => {
    setInlineForm({
      dayIndex,
      selectedPreset: 'Morning (6AM-2PM)',
      startTime: '06:00',
      endTime: '14:00',
      employeeId: '',
    });
  };

  const handlePresetChange = (presetLabel: string) => {
    if (!inlineForm) return;
    const preset = presetShifts.find(p => p.label === presetLabel);
    if (preset) {
      setInlineForm({
        ...inlineForm,
        selectedPreset: presetLabel,
        startTime: `${String(preset.startHour).padStart(2, '0')}:00`,
        endTime: `${String(preset.endHour).padStart(2, '0')}:00`,
      });
    }
  };

  const handleInlineConfirm = () => {
    if (!inlineForm || !inlineForm.employeeId) return;
    if (onCreateShiftDirect) {
      onCreateShiftDirect(inlineForm.employeeId, inlineForm.dayIndex, inlineForm.startTime, inlineForm.endTime);
    } else {
      onAddShift(inlineForm.employeeId, inlineForm.dayIndex);
    }
    setInlineForm(null);
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
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

        {!isEmployeeView && canManageShifts && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={onToggleEditMode}>
              <Edit className="h-4 w-4" />
              {isEditMode ? 'Exit Edit' : 'Edit'}
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={onDuplicateWeek}>
              <Plus className="h-4 w-4" />
              Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={onPrint}>Print</Button>
            <Button variant="outline" size="sm" onClick={onDownload}>Download</Button>
            <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={onClearWeek}>
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground" onClick={onSaveSchedule}>
              Publish
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Day Columns Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 min-w-[1100px] h-full">
          <TooltipProvider>
            {weekDates.map((date, dayIndex) => {
              const stats = getDayStats(date);
              const today = isToday(date);
              const dayShifts = getShiftsForDay(date);

              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "border-r last:border-r-0 flex flex-col",
                    today && "bg-primary/5"
                  )}
                >
                  {/* Day Header */}
                  <div className={cn(
                    "p-2 text-center border-b sticky top-0 z-10 bg-muted/20",
                    today && "bg-primary/10"
                  )}>
                    <div className={cn(
                      "inline-flex items-center justify-center rounded-full px-3 py-1 mb-1",
                      today ? "bg-destructive text-destructive-foreground font-bold" : "font-medium"
                    )}>
                      {days[dayIndex]} {format(date, 'd/M')}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />{stats.hours}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" />{stats.shifts}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Users className="h-3 w-3" />{stats.users}
                      </span>
                    </div>
                    {today && (
                      <div className="mt-1 mx-auto w-3/4 h-1 bg-destructive rounded-full" />
                    )}
                  </div>

                  {/* Shift Cards */}
                  <div className="flex-1 p-2 space-y-2">
                    {dayShifts.map((shift) => {
                      const employeeName = getEmployeeName(shift.employee_id);
                      const employee = employees.find(e => e.id === shift.employee_id);

                      return (
                        <div
                          key={shift.id}
                          draggable={isEditMode && canManageShifts}
                          onDragStart={(e) => onDragStart(e, shift.employee_id, shift)}
                          onDragEnd={onDragEnd}
                          onClick={() => canManageShifts && onShiftClick(shift)}
                          className={cn(
                            "rounded-xl p-4 cursor-pointer transition-all relative group/shift shadow-sm",
                            getShiftColor(shift),
                            isEditMode && "hover:opacity-90 hover:shadow-md"
                          )}
                        >
                          {/* Time range */}
                          <div className="font-bold text-base mb-2 tracking-wide">
                            {formatShiftTime(shift)}
                          </div>

                          {/* Employee name */}
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback 
                                className="text-[10px] font-semibold"
                                style={{ 
                                  backgroundColor: getTeamColor((employee as any)?.team_id),
                                  color: 'white'
                                }}
                              >
                                {employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate">{employeeName}</span>
                          </div>

                          {shift.notes && (
                            <div className="text-xs opacity-80 truncate mt-2">
                              {shift.notes}
                            </div>
                          )}

                          {shift.replacement_employee_id && (
                            <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                              <Users className="h-3 w-3" /> Replacement assigned
                            </div>
                          )}

                          {/* Delete button */}
                          {isEditMode && canManageShifts && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover/shift:opacity-100 bg-black/20 hover:bg-black/40"
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

                    {/* Inline Add Shift Form */}
                    {inlineForm && inlineForm.dayIndex === dayIndex && (
                      <div className="rounded-xl border-2 border-dashed border-primary/60 p-4 bg-card shadow-lg space-y-3">
                        {/* Shift preset */}
                        <Select value={inlineForm.selectedPreset} onValueChange={handlePresetChange}>
                          <SelectTrigger className="h-10 text-sm bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border shadow-lg z-50">
                            {presetShifts.map((preset) => (
                              <SelectItem key={preset.label} value={preset.label}>
                                {preset.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Time inputs */}
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="time"
                            className="h-10 text-sm bg-background"
                            value={inlineForm.startTime}
                            onChange={(e) => setInlineForm({ ...inlineForm, startTime: e.target.value, selectedPreset: 'Custom' })}
                          />
                          <Input
                            type="time"
                            className="h-10 text-sm bg-background"
                            value={inlineForm.endTime}
                            onChange={(e) => setInlineForm({ ...inlineForm, endTime: e.target.value, selectedPreset: 'Custom' })}
                          />
                        </div>

                        {/* Employee dropdown */}
                        <Select 
                          value={inlineForm.employeeId} 
                          onValueChange={(val) => setInlineForm({ ...inlineForm, employeeId: val })}
                        >
                          <SelectTrigger className="h-10 text-sm bg-background">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border shadow-lg z-50">
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.first_name} {emp.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 h-10" 
                            onClick={handleInlineConfirm}
                            disabled={!inlineForm.employeeId}
                          >
                            <Check className="h-4 w-4 mr-1" /> Add
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-10 px-3"
                            onClick={() => setInlineForm(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Add Shift Button */}
                    {canManageShifts && (inlineForm === null || inlineForm.dayIndex !== dayIndex) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full border-2 border-dashed border-muted-foreground/20 hover:border-primary hover:bg-primary/5 text-muted-foreground"
                        onClick={() => handleStartInlineForm(dayIndex)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Shift
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        </div>
      </div>

      {/* Weekly Summary Footer */}
      <div className="border-t bg-muted/30 p-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-medium text-sm">
            <span className="text-muted-foreground">
              {isEmployeeView ? 'My weekly summary' : 'Weekly summary'}
            </span>
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
