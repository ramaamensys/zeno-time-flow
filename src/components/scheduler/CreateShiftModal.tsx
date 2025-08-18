import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShifts, useEmployees, useDepartments, Employee, Department } from "@/hooks/useSchedulerDatabase";

interface CreateShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  preSelectedDate?: Date;
  preSelectedSlot?: { id: string; startHour: number; endHour: number };
}

export default function CreateShiftModal({ 
  open, 
  onOpenChange, 
  companyId,
  preSelectedDate,
  preSelectedSlot 
}: CreateShiftModalProps) {
  const { createShift } = useShifts();
  const { employees } = useEmployees(companyId);
  const { departments } = useDepartments(companyId);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    employee_id: "",
    department_id: "",
    date: "",
    start_time: "",
    end_time: "",
    break_minutes: 30,
    hourly_rate: "",
    notes: "",
    status: "scheduled"
  });

  // Set default values when modal opens
  useEffect(() => {
    if (open) {
      const today = new Date();
      const defaultDate = preSelectedDate || today;
      const dateStr = defaultDate.toISOString().split('T')[0];
      
      let startTime = "09:00";
      let endTime = "17:00";
      
      if (preSelectedSlot) {
        startTime = `${preSelectedSlot.startHour.toString().padStart(2, '0')}:00`;
        endTime = `${preSelectedSlot.endHour.toString().padStart(2, '0')}:00`;
      }
      
      setFormData(prev => ({
        ...prev,
        date: dateStr,
        start_time: startTime,
        end_time: endTime
      }));
    }
  }, [open, preSelectedDate, preSelectedSlot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.date || !formData.start_time || !formData.end_time || !companyId) {
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${formData.date}T${formData.start_time}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.end_time}:00`);
      
      await createShift({
        employee_id: formData.employee_id,
        company_id: companyId,
        department_id: formData.department_id || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        break_minutes: formData.break_minutes,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
        notes: formData.notes || undefined,
        status: formData.status
      });
      
      onOpenChange(false);
      setFormData({
        employee_id: "",
        department_id: "",
        date: "",
        start_time: "",
        end_time: "",
        break_minutes: 30,
        hourly_rate: "",
        notes: "",
        status: "scheduled"
      });
    } catch (error) {
      console.error('Failed to create shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === formData.employee_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => {
                  const employee = employees.find(e => e.id === value);
                  setFormData(prev => ({
                    ...prev,
                    employee_id: value,
                    department_id: employee?.department_id || "",
                    hourly_rate: employee?.hourly_rate?.toString() || ""
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="break_minutes">Break Minutes</Label>
              <Input
                id="break_minutes"
                type="number"
                min="0"
                max="480"
                value={formData.break_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, break_minutes: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate">
                Hourly Rate {selectedEmployee?.hourly_rate && `(Default: $${selectedEmployee.hourly_rate})`}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes for this shift..."
              rows={3}
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
              disabled={loading || !formData.employee_id || !formData.date || !formData.start_time || !formData.end_time}
            >
              {loading ? "Creating..." : "Create Shift"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}