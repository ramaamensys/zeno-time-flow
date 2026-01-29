import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShifts, useDepartments } from "@/hooks/useSchedulerDatabase";

interface CreateShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
}

const SHIFT_OPTIONS = [
  { id: "morning", name: "Morning Shift", startHour: 6, endHour: 14 },
  { id: "afternoon", name: "Afternoon Shift", startHour: 14, endHour: 22 },
  { id: "night", name: "Night Shift", startHour: 22, endHour: 6 }
];

export default function CreateShiftModal({ 
  open, 
  onOpenChange, 
  companyId
}: CreateShiftModalProps) {
  const { createShift } = useShifts();
  const { departments } = useDepartments(companyId);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    schedule_name: "",
    department_id: ""
  });

  // Get current week's Monday
  const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
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
        schedule_name: "",
        department_id: ""
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyId) {
      return;
    }

    setLoading(true);
    try {
      // Create all 3 shifts for each day (Mon-Sun) without employee assignment
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = weekDates[dayIndex];
        
        for (const shift of SHIFT_OPTIONS) {
          const startDateTime = new Date(date);
          startDateTime.setHours(shift.startHour, 0, 0, 0);
          
          const endDateTime = new Date(date);
          endDateTime.setHours(shift.endHour, 0, 0, 0);
          
          // If night shift crosses midnight, adjust end date
          if (shift.endHour < shift.startHour) {
            endDateTime.setDate(endDateTime.getDate() + 1);
          }
          
          await createShift({
            employee_id: undefined, // No employee - will be assigned via drag/drop
            company_id: companyId,
            department_id: formData.department_id || undefined,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            break_minutes: 30,
            notes: formData.schedule_name ? `Schedule: ${formData.schedule_name}` : undefined,
            status: 'scheduled'
          });
        }
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalShifts = 7 * 3; // 7 days × 3 shifts

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add New Schedule</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create a weekly schedule ({weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}) with Morning, Afternoon, and Night shifts
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Schedule Name */}
          <div className="space-y-2">
            <Label htmlFor="schedule_name">Schedule Name</Label>
            <Input
              id="schedule_name"
              value={formData.schedule_name}
              onChange={(e) => setFormData(prev => ({ ...prev, schedule_name: e.target.value }))}
              placeholder="e.g., Week 5 Schedule"
            />
          </div>

          {/* Department Selection */}
          <div className="space-y-2">
            <Label htmlFor="department">Department (Optional)</Label>
            <Select
              value={formData.department_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All departments" />
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

          {/* Summary */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium">Schedule Summary</p>
            <p className="text-xs text-muted-foreground mt-1">
              This will create {totalShifts} empty shift slots (7 days × 3 shifts per day). You can then drag and drop employees to assign them.
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
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}