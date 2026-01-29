import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShifts, useEmployees, useDepartments } from "@/hooks/useSchedulerDatabase";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  preSelectedDate?: Date;
  preSelectedSlot?: { id: string; startHour: number; endHour: number };
}

const SHIFT_OPTIONS = [
  { id: "morning", name: "Morning Shift", time: "6:00 AM - 2:00 PM", startHour: 6, endHour: 14 },
  { id: "afternoon", name: "Afternoon Shift", time: "2:00 PM - 10:00 PM", startHour: 14, endHour: 22 },
  { id: "night", name: "Night Shift", time: "10:00 PM - 6:00 AM", startHour: 22, endHour: 6 }
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CreateShiftModal({ 
  open, 
  onOpenChange, 
  companyId
}: CreateShiftModalProps) {
  const { createShift } = useShifts();
  const { employees } = useEmployees(companyId);
  const { departments } = useDepartments(companyId);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    employee_id: "",
    department_id: "",
    selectedShift: "morning",
    selectedDays: [true, true, true, true, true, false, false] // Mon-Fri by default
  });

  // Get current week's Monday
  const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const getWeekDates = () => {
    const monday = getWeekStart();
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        employee_id: "",
        department_id: "",
        selectedShift: "morning",
        selectedDays: [true, true, true, true, true, false, false]
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee_id || !companyId) {
      return;
    }

    // Check if at least one day is selected
    if (!formData.selectedDays.some(d => d)) {
      return;
    }

    setLoading(true);
    try {
      const shift = SHIFT_OPTIONS.find(s => s.id === formData.selectedShift);
      if (!shift) return;

      const employee = employees.find(e => e.id === formData.employee_id);
      
      // Create shifts for each selected day
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        if (!formData.selectedDays[dayIndex]) continue;
        
        const date = weekDates[dayIndex];
        const startDateTime = new Date(date);
        startDateTime.setHours(shift.startHour, 0, 0, 0);
        
        const endDateTime = new Date(date);
        endDateTime.setHours(shift.endHour, 0, 0, 0);
        
        // If night shift crosses midnight, adjust end date
        if (shift.endHour < shift.startHour) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
        
        await createShift({
          employee_id: formData.employee_id,
          company_id: companyId,
          department_id: formData.department_id || undefined,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          break_minutes: 30,
          hourly_rate: employee?.hourly_rate || undefined,
          status: 'scheduled'
        });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (index: number) => {
    setFormData(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.map((d, i) => i === index ? !d : d)
    }));
  };

  const selectAllDays = () => {
    setFormData(prev => ({
      ...prev,
      selectedDays: [true, true, true, true, true, true, true]
    }));
  };

  const selectWeekdays = () => {
    setFormData(prev => ({
      ...prev,
      selectedDays: [true, true, true, true, true, false, false]
    }));
  };

  const selectedDaysCount = formData.selectedDays.filter(d => d).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Schedule</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create a weekly schedule for an employee ({weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            <Select
              value={formData.employee_id}
              onValueChange={(value) => {
                const employee = employees.find(e => e.id === value);
                setFormData(prev => ({
                  ...prev,
                  employee_id: value,
                  department_id: employee?.department_id || ""
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name} - {employee.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Selection */}
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              value={formData.department_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shift Selection */}
          <div className="space-y-2">
            <Label>Shift Type *</Label>
            <div className="grid grid-cols-1 gap-2">
              {SHIFT_OPTIONS.map((shift) => (
                <div
                  key={shift.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.selectedShift === shift.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, selectedShift: shift.id }))}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{shift.name}</span>
                    <span className="text-sm text-muted-foreground">{shift.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Day Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Days *</Label>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectWeekdays}>
                  Weekdays
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={selectAllDays}>
                  All Days
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day, index) => (
                <div
                  key={day}
                  className={`flex flex-col items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                    formData.selectedDays[index]
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleDay(index)}
                >
                  <Checkbox
                    checked={formData.selectedDays[index]}
                    className="mb-1"
                  />
                  <span className="text-xs font-medium">{day}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {weekDates[index].getDate()}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedDaysCount} day{selectedDaysCount !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.employee_id || selectedDaysCount === 0}
            >
              {loading ? "Creating..." : `Create ${selectedDaysCount} Shift${selectedDaysCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
