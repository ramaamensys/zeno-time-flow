import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShifts, useEmployees, useDepartments } from "@/hooks/useSchedulerDatabase";
import { UserPlus } from "lucide-react";

interface AssignShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  date: Date;
  slot: {
    id: string;
    name: string;
    time: string;
    startHour: number;
    endHour: number;
  };
  preSelectedDepartmentId?: string;
  onShiftCreated?: () => void;
}

export default function AssignShiftModal({ 
  open, 
  onOpenChange, 
  companyId, 
  date,
  slot,
  preSelectedDepartmentId,
  onShiftCreated
}: AssignShiftModalProps) {
  const { createShift } = useShifts();
  const { employees } = useEmployees(companyId);
  const { departments } = useDepartments(companyId);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    employee_id: "",
    department_id: "",
    start_time: "",
    end_time: "",
    break_minutes: 30,
    hourly_rate: "",
    notes: "",
    status: "scheduled"
  });

  // Format hour to time string
  const formatHourToTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Initialize form when modal opens
  useEffect(() => {
    if (open && slot) {
      setFormData({
        employee_id: "",
        department_id: preSelectedDepartmentId || "",
        start_time: formatHourToTime(slot.startHour),
        end_time: formatHourToTime(slot.endHour),
        break_minutes: 30,
        hourly_rate: "",
        notes: "",
        status: "scheduled"
      });
    }
  }, [open, slot, preSelectedDepartmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee_id || !companyId) {
      return;
    }

    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const startDateTime = new Date(`${dateStr}T${formData.start_time}:00`);
      const endDateTime = new Date(`${dateStr}T${formData.end_time}:00`);
      
      // If night shift crosses midnight, adjust end date
      if (slot.endHour < slot.startHour) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const employee = employees.find(e => e.id === formData.employee_id);
      
      await createShift({
        employee_id: formData.employee_id,
        company_id: companyId,
        department_id: formData.department_id || employee?.department_id || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        break_minutes: formData.break_minutes,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : employee?.hourly_rate || undefined,
        notes: formData.notes || undefined,
        status: formData.status
      });
      
      onShiftCreated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === formData.employee_id);
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Shift
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {formattedDate} • {slot.name} ({slot.time})
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            <Select
              value={formData.employee_id}
              onValueChange={(value) => {
                const employee = employees.find(e => e.id === value);
                setFormData(prev => ({
                  ...prev,
                  employee_id: value,
                  department_id: prev.department_id || employee?.department_id || "",
                  hourly_rate: employee?.hourly_rate?.toString() || prev.hourly_rate
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an employee to assign" />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter(emp => !preSelectedDepartmentId || emp.department_id === preSelectedDepartmentId)
                  .map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name} 
                      {employee.position && ` - ${employee.position}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourly_rate">
              Hourly Rate {selectedEmployee?.hourly_rate && `($${selectedEmployee.hourly_rate})`}
            </Label>
            <Input
              id="hourly_rate"
              type="number"
              min="0"
              step="0.01"
              value={formData.hourly_rate}
              onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
              placeholder={selectedEmployee?.hourly_rate?.toString() || "15.00"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any notes for this shift..."
              rows={2}
            />
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
              disabled={loading || !formData.employee_id}
            >
              {loading ? "Assigning..." : "Assign Shift"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
