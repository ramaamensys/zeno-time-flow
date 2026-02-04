import React, { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Clock, AlertTriangle, Check, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Employee, Shift } from '@/hooks/useSchedulerDatabase';
import { AvailabilityStatus } from '@/hooks/useEmployeeAvailability';

interface EmployeeScheduleGridProps {
  employees: Employee[];
  shifts: Shift[];
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
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const availabilityColors: Record<AvailabilityStatus, string> = {
  available: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
  prefers_to_work: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
  unavailable: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
};

const availabilityIcons: Record<AvailabilityStatus, React.ReactNode> = {
  available: <Check className="h-3 w-3 text-green-600" />,
  prefers_to_work: <Calendar className="h-3 w-3 text-blue-600" />,
  unavailable: <X className="h-3 w-3 text-red-600" />
};

const availabilityLabels: Record<AvailabilityStatus, string> = {
  available: 'Available',
  prefers_to_work: 'Prefers to work',
  unavailable: 'Unavailable'
};

export default function EmployeeScheduleGrid({
  employees,
  shifts,
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
  checkShiftConflict
}: EmployeeScheduleGridProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const getShiftsForEmployeeAndDay = (employeeId: string, date: Date): Shift[] => {
    return shifts.filter(shift => {
      if (shift.employee_id !== employeeId) return false;
      const shiftDate = new Date(shift.start_time);
      return isSameDay(shiftDate, date);
    });
  };

  const formatShiftTime = (shift: Shift): string => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    return `${format(start, 'h:mma')} - ${format(end, 'h:mma')}`.toLowerCase();
  };

  const getShiftColor = (shift: Shift): string => {
    if (shift.is_missed) {
      return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200';
    }
    if (shift.status === 'completed') {
      return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200';
    }
    if (shift.status === 'in_progress') {
      return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200';
    }
    // Default scheduled
    return 'bg-primary/10 border-primary/30 text-primary dark:bg-primary/20 dark:border-primary/40';
  };

  const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date());
  };

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header Row */}
        <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b bg-muted/50">
          <div className="p-3 font-semibold text-sm border-r">
            Employee
          </div>
          {weekDates.map((date, index) => (
            <div 
              key={index} 
              className={cn(
                "p-3 text-center border-r last:border-r-0",
                isToday(date) && "bg-primary/10"
              )}
            >
              <div className="font-semibold text-sm">{days[index]}</div>
              <div className={cn(
                "text-lg font-bold",
                isToday(date) && "text-primary"
              )}>
                {format(date, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Employee Rows */}
        {employees.map((employee) => (
          <div 
            key={employee.id} 
            className="grid grid-cols-[200px_repeat(7,1fr)] border-b last:border-b-0 hover:bg-muted/20"
          >
            {/* Employee Info Cell */}
            <div className="p-3 border-r flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {employee.first_name[0]}{employee.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {employee.first_name} {employee.last_name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {employee.position || 'Employee'}
                </div>
              </div>
            </div>

            {/* Day Cells */}
            {weekDates.map((date, dayIndex) => {
              const cellId = `${employee.id}-${dayIndex}`;
              const dayShifts = getShiftsForEmployeeAndDay(employee.id, date);
              const availability = getAvailabilityStatus(employee.id, date);
              const isHovered = hoveredCell === cellId;

              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "p-2 border-r last:border-r-0 min-h-[100px] relative transition-colors",
                    isToday(date) && "bg-primary/5",
                    isEditMode && "cursor-pointer hover:bg-muted/30",
                    availabilityColors[availability]
                  )}
                  onMouseEnter={() => setHoveredCell(cellId)}
                  onMouseLeave={() => setHoveredCell(null)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, employee.id, dayIndex)}
                >
                  {/* Availability Indicator */}
                  <div className="absolute top-1 right-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-1 rounded hover:bg-background/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSetAvailability && canManageShifts) {
                              // Cycle through availability
                              const nextStatus: AvailabilityStatus = 
                                availability === 'available' ? 'prefers_to_work' :
                                availability === 'prefers_to_work' ? 'unavailable' : 'available';
                              onSetAvailability(employee.id, date, nextStatus);
                            }
                          }}
                        >
                          {availabilityIcons[availability]}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{availabilityLabels[availability]}</p>
                        {canManageShifts && <p className="text-xs text-muted-foreground">Click to change</p>}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Shifts */}
                  <div className="space-y-1 mt-4">
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
                          onClick={() => canManageShifts && onShiftClick(shift)}
                          className={cn(
                            "px-2 py-1.5 rounded text-xs border cursor-pointer transition-all",
                            getShiftColor(shift),
                            isEditMode && "hover:shadow-md",
                            hasConflict && "ring-2 ring-orange-400"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatShiftTime(shift)}
                            </span>
                            {hasConflict && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Overlapping shift detected!</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {shift.is_missed && (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1 mt-1">
                              Missed
                            </Badge>
                          )}
                          {shift.replacement_employee_id && (
                            <div className="text-[10px] mt-1 text-muted-foreground">
                              Cover: {getEmployeeName(shift.replacement_employee_id).split(' ')[0]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Shift Button (shown on hover in edit mode) */}
                  {isEditMode && canManageShifts && isHovered && dayShifts.length < 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute bottom-1 left-1 right-1 h-7 text-xs bg-background/80 hover:bg-background"
                      onClick={() => onAddShift(employee.id, dayIndex)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Shift
                    </Button>
                  )}

                  {/* Empty state */}
                  {dayShifts.length === 0 && !isHovered && (
                    <div className="flex items-center justify-center h-full text-muted-foreground/50 text-xs mt-2">
                      —
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Empty State */}
        {employees.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No employees found. Add employees to start scheduling.
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
