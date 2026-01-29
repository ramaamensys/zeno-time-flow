import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShifts, useEmployees, useDepartments } from "@/hooks/useSchedulerDatabase";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CreateShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  preSelectedDate?: Date;
  preSelectedSlot?: { id: string; startHour: number; endHour: number };
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
  const { employees } = useEmployees(companyId);
  const { departments } = useDepartments(companyId);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    schedule_name: "",
    selected_employees: [] as string[],
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
        selected_employees: [],
        department_id: ""
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.selected_employees.length === 0 || !companyId) {
      return;
    }

    setLoading(true);
    try {
      // Create all 3 shifts for each day (Mon-Sun) for each selected employee
      for (const employeeId of formData.selected_employees) {
        const employee = employees.find(e => e.id === employeeId);
        
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
              employee_id: employeeId,
              company_id: companyId,
              department_id: formData.department_id || employee?.department_id || undefined,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
              break_minutes: 30,
              hourly_rate: employee?.hourly_rate || undefined,
              notes: formData.schedule_name ? `Schedule: ${formData.schedule_name}` : undefined,
              status: 'scheduled'
            });
          }
        }
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_employees: prev.selected_employees.includes(employeeId)
        ? prev.selected_employees.filter(id => id !== employeeId)
        : [...prev.selected_employees, employeeId]
    }));
  };

  const removeEmployee = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_employees: prev.selected_employees.filter(id => id !== employeeId)
    }));
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown';
  };

  const totalShifts = formData.selected_employees.length * 7 * 3; // employees × days × shifts

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Schedule</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create a weekly schedule ({weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}) with all 3 shifts (Morning, Afternoon, Night)
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

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Select Employees *</Label>
            
            {/* Selected employees badges */}
            {formData.selected_employees.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.selected_employees.map(id => (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1">
                    {getEmployeeName(id)}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeEmployee(id)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Employee list */}
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                    formData.selected_employees.includes(employee.id) ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => toggleEmployee(employee.id)}
                >
                  <div>
                    <span className="font-medium">{employee.first_name} {employee.last_name}</span>
                    {employee.position && (
                      <span className="text-sm text-muted-foreground ml-2">- {employee.position}</span>
                    )}
                  </div>
                  {formData.selected_employees.includes(employee.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
              {employees.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No employees found</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.selected_employees.length} employee{formData.selected_employees.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Department Selection */}
          <div className="space-y-2">
            <Label htmlFor="department">Department (Optional)</Label>
            <Select
              value={formData.department_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use employee's department" />
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
          {formData.selected_employees.length > 0 && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-medium">Schedule Summary</p>
              <p className="text-xs text-muted-foreground mt-1">
                This will create {totalShifts} shifts ({formData.selected_employees.length} employee{formData.selected_employees.length !== 1 ? 's' : ''} × 7 days × 3 shifts)
              </p>
            </div>
          )}

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
              disabled={loading || formData.selected_employees.length === 0}
            >
              {loading ? "Creating..." : `Create Schedule`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
