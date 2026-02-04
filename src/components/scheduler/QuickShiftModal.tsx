import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Employee, Shift } from '@/hooks/useSchedulerDatabase';
import { AlertTriangle, Copy } from 'lucide-react';

interface QuickShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  date: Date | null;
  weekDates?: Date[];
  onSave: (shiftData: {
    employee_id: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes?: string;
  }) => void;
  onSaveMultiple?: (shifts: Array<{
    employee_id: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes?: string;
  }>) => void;
  checkShiftConflict: (employeeId: string, startTime: Date, endTime: Date) => Shift | undefined;
}

const presetShifts = [
  { label: 'Morning (6am - 2pm)', startHour: 6, endHour: 14 },
  { label: 'Afternoon (2pm - 10pm)', startHour: 14, endHour: 22 },
  { label: 'Night (10pm - 6am)', startHour: 22, endHour: 6 },
  { label: 'Day (9am - 5pm)', startHour: 9, endHour: 17 },
  { label: 'Custom', startHour: -1, endHour: -1 }
];

export default function QuickShiftModal({
  open,
  onOpenChange,
  employee,
  date,
  weekDates,
  onSave,
  onSaveMultiple,
  checkShiftConflict
}: QuickShiftModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('Morning (6am - 2pm)');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('14:00');
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [conflict, setConflict] = useState<Shift | undefined>();
  const [copyToWeek, setCopyToWeek] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // Calculate the week dates from the selected date if not provided
  const computedWeekDates = weekDates || (() => {
    if (!date) return [];
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  })();

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    if (open) {
      // Reset form
      setSelectedPreset('Morning (6am - 2pm)');
      setStartTime('06:00');
      setEndTime('14:00');
      setBreakMinutes(30);
      setNotes('');
      setConflict(undefined);
      setCopyToWeek(false);
      setSelectedDays([]);
    }
  }, [open]);

  useEffect(() => {
    // Check for conflicts when times change
    if (employee && date) {
      const startDateTime = new Date(date);
      const [startH, startM] = startTime.split(':').map(Number);
      startDateTime.setHours(startH, startM, 0, 0);

      const endDateTime = new Date(date);
      const [endH, endM] = endTime.split(':').map(Number);
      endDateTime.setHours(endH, endM, 0, 0);

      // Handle overnight shifts
      if (endH < startH) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const existingConflict = checkShiftConflict(employee.id, startDateTime, endDateTime);
      setConflict(existingConflict);
    }
  }, [employee, date, startTime, endTime, checkShiftConflict]);

  const handlePresetChange = (presetLabel: string) => {
    setSelectedPreset(presetLabel);
    const preset = presetShifts.find(p => p.label === presetLabel);
    if (preset && preset.startHour >= 0) {
      setStartTime(`${String(preset.startHour).padStart(2, '0')}:00`);
      setEndTime(`${String(preset.endHour).padStart(2, '0')}:00`);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const selectAllDays = () => {
    if (!date) return;
    // Select all days except the current one (since it will be created anyway)
    const currentDayIndex = computedWeekDates.findIndex(d => isSameDay(d, date));
    const allOtherDays = computedWeekDates
      .map((_, i) => i)
      .filter(i => i !== currentDayIndex);
    setSelectedDays(allOtherDays);
  };

  const handleSave = () => {
    if (!employee || !date) return;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    // Create the primary shift
    const startDateTime = new Date(date);
    startDateTime.setHours(startH, startM, 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endH, endM, 0, 0);

    // Handle overnight shifts
    if (endH < startH) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    if (copyToWeek && selectedDays.length > 0 && onSaveMultiple) {
      // Create shifts for all selected days
      const allShifts = [];
      
      // Add the current day first
      allShifts.push({
        employee_id: employee.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        break_minutes: breakMinutes,
        notes: notes || undefined
      });

      // Add shifts for selected days
      for (const dayIndex of selectedDays) {
        const targetDate = computedWeekDates[dayIndex];
        if (!targetDate || isSameDay(targetDate, date)) continue;

        const targetStart = new Date(targetDate);
        targetStart.setHours(startH, startM, 0, 0);

        const targetEnd = new Date(targetDate);
        targetEnd.setHours(endH, endM, 0, 0);

        if (endH < startH) {
          targetEnd.setDate(targetEnd.getDate() + 1);
        }

        allShifts.push({
          employee_id: employee.id,
          start_time: targetStart.toISOString(),
          end_time: targetEnd.toISOString(),
          break_minutes: breakMinutes,
          notes: notes || undefined
        });
      }

      onSaveMultiple(allShifts);
    } else {
      // Save single shift
      onSave({
        employee_id: employee.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        break_minutes: breakMinutes,
        notes: notes || undefined
      });
    }

    onOpenChange(false);
  };

  if (!employee || !date) return null;

  const currentDayIndex = computedWeekDates.findIndex(d => isSameDay(d, date));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Shift</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Employee & Date Info */}
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <div>
              <div className="font-medium">{employee.first_name} {employee.last_name}</div>
              <div className="text-sm text-muted-foreground">
                {format(date, 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
          </div>

          {/* Conflict Warning */}
          {conflict && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg text-orange-800 dark:text-orange-200">
              <AlertTriangle className="h-4 w-4" />
              <div className="text-sm">
                <span className="font-medium">Shift conflict!</span> This employee already has a shift during this time.
              </div>
            </div>
          )}

          {/* Preset Selection */}
          <div className="space-y-2">
            <Label>Shift Type</Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presetShifts.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input 
                type="time" 
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setSelectedPreset('Custom');
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input 
                type="time" 
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setSelectedPreset('Custom');
                }}
              />
            </div>
          </div>

          {/* Break Duration */}
          <div className="space-y-2">
            <Label>Break Duration (minutes)</Label>
            <Select 
              value={String(breakMinutes)} 
              onValueChange={(v) => setBreakMinutes(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No break</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Copy to Week Option */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="copyToWeek" 
                checked={copyToWeek}
                onCheckedChange={(checked) => setCopyToWeek(checked === true)}
              />
              <Label htmlFor="copyToWeek" className="flex items-center gap-2 cursor-pointer">
                <Copy className="h-4 w-4" />
                Copy this shift to other days
              </Label>
            </div>

            {copyToWeek && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Select days to copy:</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={selectAllDays}
                    className="h-6 text-xs"
                  >
                    Select All
                  </Button>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {computedWeekDates.map((weekDate, index) => {
                    const isCurrentDay = index === currentDayIndex;
                    const isSelected = selectedDays.includes(index);
                    
                    return (
                      <Button
                        key={index}
                        type="button"
                        variant={isCurrentDay ? "default" : isSelected ? "secondary" : "outline"}
                        size="sm"
                        className={`h-8 px-2 text-xs ${isCurrentDay ? 'cursor-not-allowed opacity-70' : ''}`}
                        onClick={() => !isCurrentDay && toggleDay(index)}
                        disabled={isCurrentDay}
                      >
                        {dayNames[index]} {format(weekDate, 'd')}
                        {isCurrentDay && <span className="ml-1 text-[10px]">(current)</span>}
                      </Button>
                    );
                  })}
                </div>
                {selectedDays.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Will create {selectedDays.length + 1} shifts total (including today)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {copyToWeek && selectedDays.length > 0 
              ? `Add ${selectedDays.length + 1} Shifts`
              : 'Add Shift'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
