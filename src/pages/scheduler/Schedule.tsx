import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Plus, Users, Clock, Building, Edit, Trash2, MoreHorizontal, Download, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCompanies, useDepartments, useEmployees, useShifts, Shift, Employee } from "@/hooks/useSchedulerDatabase";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateCompanyModal from "@/components/scheduler/CreateCompanyModal";
import CreateShiftModal from "@/components/scheduler/CreateShiftModal";
import EditShiftModal from "@/components/scheduler/EditShiftModal";
import CreateEmployeeModal from "@/components/scheduler/CreateEmployeeModal";
import SlotEditModal from "@/components/scheduler/SlotEditModal";
import EditEmployeeModal from "@/components/scheduler/EditEmployeeModal";
import SaveScheduleModal from "@/components/scheduler/SaveScheduleModal";
import SavedSchedulesCard, { SavedSchedule } from "@/components/scheduler/SavedSchedulesCard";
import AssignShiftModal from "@/components/scheduler/AssignShiftModal";
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SchedulerSchedule() {
  const { user } = useAuth();
  
  // Predefined shift slots (mutable for editing)
  const [shiftSlots, setShiftSlots] = useState([
    { id: "morning", name: "Morning Shift", time: "6:00 AM - 2:00 PM", startHour: 6, endHour: 14 },
    { id: "afternoon", name: "Afternoon Shift", time: "2:00 PM - 10:00 PM", startHour: 14, endHour: 22 },
    { id: "night", name: "Night Shift", time: "10:00 PM - 6:00 AM", startHour: 22, endHour: 6 }
  ]);
  
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEditShift, setShowEditShift] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [preSelectedDate, setPreSelectedDate] = useState<Date | undefined>();
  const [preSelectedSlot, setPreSelectedSlot] = useState<{ id: string; name: string; time: string; startHour: number; endHour: number } | undefined>();
  const [draggedEmployee, setDraggedEmployee] = useState<string | null>(null);
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSlotEditModal, setShowSlotEditModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ id: string; name: string; time: string; startHour: number; endHour: number } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showSaveScheduleModal, setShowSaveScheduleModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [savedSchedulesRefresh, setSavedSchedulesRefresh] = useState(0);
  const [showScheduleShifts, setShowScheduleShifts] = useState(false); // Only show shifts when template is loaded or creating new
  const [showAssignShiftModal, setShowAssignShiftModal] = useState(false);
  const { toast } = useToast();
  
  // Database hooks
  const { companies, loading: companiesLoading } = useCompanies();
  const { departments, loading: departmentsLoading } = useDepartments(selectedCompany);
  const { employees, loading: employeesLoading, updateEmployee, deleteEmployee } = useEmployees(selectedCompany);
  const { shifts, loading: shiftsLoading, createShift, updateShift, deleteShift } = useShifts(selectedCompany, getWeekStart(selectedWeek));

  const [employeeRecord, setEmployeeRecord] = useState<{ id: string; company_id: string } | null>(null);
  
  // Fetch organizations for super admin
  useEffect(() => {
    const fetchOrganizations = async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      
      if (!error && data) {
        setOrganizations(data);
      }
    };

    if (userRole === 'super_admin') {
      fetchOrganizations();
    }
  }, [userRole]);

  // Fetch user role for access control
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (data && data.length > 0) {
        const roles = data.map(item => item.role);
        if (roles.includes('super_admin')) {
          setUserRole('super_admin');
        } else if (roles.includes('operations_manager')) {
          setUserRole('operations_manager');
        } else if (roles.includes('manager')) {
          setUserRole('manager');
        } else if (roles.includes('employee')) {
          setUserRole('employee');
        } else {
          setUserRole('user');
        }
      }
      
      // Also check if user is an employee
      const { data: empData } = await supabase
        .from('employees')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single();
      
      if (empData) {
        setEmployeeRecord(empData);
        // Auto-select employee's company
        if (!selectedCompany) {
          setSelectedCompany(empData.company_id);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  // Filter companies based on user role and access
  const availableCompanies = companies.filter(company => {
    // Super admins can see all companies, but filter by selected organization
    if (userRole === 'super_admin') {
      if (selectedOrganization) {
        return company.organization_id === selectedOrganization;
      }
      return true;
    }
    
    // Operations managers can see companies they manage
    if (userRole === 'operations_manager') {
      return company.operations_manager_id === user?.id;
    }
    
    // Company managers can see only their assigned company
    if (userRole === 'manager') {
      return company.company_manager_id === user?.id;
    }
    
    // Employees can see their company's schedule
    if (userRole === 'employee' && employeeRecord) {
      return company.id === employeeRecord.company_id;
    }
    
    // Regular users can't access scheduling
    return false;
  });

  // Check if user can manage shifts (admins only)
  const canManageShifts = userRole === 'super_admin' || userRole === 'operations_manager' || userRole === 'manager';
  const isEmployeeView = userRole === 'employee';

  // Use all available companies for scheduling (field_type filter removed)
  const schedulableCompanies = availableCompanies;

  // Reset selected company when organization changes (for super admin)
  useEffect(() => {
    if (userRole === 'super_admin' && selectedOrganization) {
      // Check if current company is still valid for the selected organization
      const companyStillValid = availableCompanies.some(c => c.id === selectedCompany);
      if (!companyStillValid) {
        setSelectedCompany("");
      }
    }
  }, [selectedOrganization, userRole, availableCompanies]);

  // Auto-select the first company if none is selected (and employee hasn't auto-selected theirs)
  useEffect(() => {
    if (schedulableCompanies.length > 0 && !selectedCompany) {
      setSelectedCompany(schedulableCompanies[0].id);
    }
  }, [schedulableCompanies, selectedCompany]);

  function getWeekStart(date: Date) {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const getWeekDates = (startDate: Date) => {
    const week = [];
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const weekDates = getWeekDates(selectedWeek);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(selectedWeek.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate);
  };

  const getShiftsForDayAndSlot = (dayIndex: number, slotId: string) => {
    // Don't show shifts unless showScheduleShifts is true (template loaded or employee dragged)
    // Exception: Employee view always shows their shifts
    if (!showScheduleShifts && !isEmployeeView) return [];
    
    const targetDate = weekDates[dayIndex];
    const slot = shiftSlots.find(s => s.id === slotId);
    
    if (!slot) return [];
    
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.start_time);
      const shiftHour = shiftDate.getHours();
      
      // Compare dates by year, month, and day to avoid timezone issues
      const sameDate = 
        shiftDate.getFullYear() === targetDate.getFullYear() &&
        shiftDate.getMonth() === targetDate.getMonth() &&
        shiftDate.getDate() === targetDate.getDate();
      
      if (!sameDate) return false;
      
      // For normal shifts (end > start), check if hour is within range
      if (slot.endHour > slot.startHour) {
        return shiftHour >= slot.startHour && shiftHour < slot.endHour;
      }
      
      // For overnight shifts (end < start, like night shift 22-6), 
      // match if hour is >= start OR hour < end
      return shiftHour >= slot.startHour || shiftHour < slot.endHour;
    });
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
  };

  const handleAddShift = (dayIndex: number, slotId: string) => {
    const date = weekDates[dayIndex];
    const slot = shiftSlots.find(s => s.id === slotId);
    if (slot) {
      setPreSelectedDate(date);
      setPreSelectedSlot(slot);
      setShowAssignShiftModal(true);
    }
  };

  const handleEditShift = (shift: Shift) => {
    setSelectedShift(shift);
    setShowEditShift(true);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, employeeId: string, shift?: Shift) => {
    e.dataTransfer.setData('employeeId', employeeId);
    if (shift) {
      e.dataTransfer.setData('shiftId', shift.id);
      setDraggedShift(shift);
    }
    setDraggedEmployee(employeeId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dayIndex: number, slotId: string) => {
    e.preventDefault();
    const employeeId = e.dataTransfer.getData('employeeId');
    const shiftId = e.dataTransfer.getData('shiftId');
    
    if (employeeId && selectedCompany) {
      // Enable showing shifts when employee is dragged
      setShowScheduleShifts(true);
      
      const date = weekDates[dayIndex];
      const slot = shiftSlots.find(s => s.id === slotId);
      
      if (slot) {
        const startDateTime = new Date(date);
        startDateTime.setHours(slot.startHour, 0, 0, 0);
        
        const endDateTime = new Date(date);
        endDateTime.setHours(slot.endHour, 0, 0, 0);
        
        // If night shift crosses midnight, adjust end date
        if (slot.endHour < slot.startHour) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        const employee = employees.find(e => e.id === employeeId);
        
        if (shiftId && draggedShift) {
          // Moving existing shift to new slot
          updateShift(shiftId, {
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            employee_id: employeeId,
          });
        } else {
          // Creating new shift
          createShift({
            employee_id: employeeId,
            company_id: selectedCompany,
            department_id: employee?.department_id || undefined,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            break_minutes: 30,
            hourly_rate: employee?.hourly_rate || undefined,
            status: 'scheduled'
          });
        }
      }
    }
    
    setDraggedEmployee(null);
    setDraggedShift(null);
  };

  const handleDragEnd = () => {
    setDraggedEmployee(null);
    setDraggedShift(null);
  };

  const printSchedule = () => {
    window.print();
  };

  const downloadSchedule = () => {
    const companyName = schedulableCompanies.find(c => c.id === selectedCompany)?.name || 'Schedule';
    const weekRange = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    
    // Create CSV content
    let csvContent = `${companyName} - Weekly Schedule (${weekRange})\n\n`;
    csvContent += 'Day,Shift,Employee,Start Time,End Time,Break (min),Status\n';
    
    shiftSlots.forEach(slot => {
      days.forEach((day, dayIndex) => {
        const dayShifts = getShiftsForDayAndSlot(dayIndex, slot.id);
        dayShifts.forEach(shift => {
          const employeeName = getEmployeeName(shift.employee_id);
          const startTime = new Date(shift.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const endTime = new Date(shift.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          csvContent += `${day},${slot.name},${employeeName},${startTime},${endTime},${shift.break_minutes || 0},${shift.status}\n`;
        });
      });
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName.replace(/\s+/g, '_')}_Schedule_${weekDates[0].toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleSlotSave = (slotId: string, updates: { name: string; startHour: number; endHour: number }) => {
    setShiftSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { 
            ...slot, 
            name: updates.name, 
            startHour: updates.startHour, 
            endHour: updates.endHour,
            time: `${updates.startHour}:00 - ${updates.endHour}:00`
          }
        : slot
    ));
  };

  const isLoading = companiesLoading || departmentsLoading || shiftsLoading;

  const handleOpenEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEditEmployee(true);
  };

  const handleEditEmployeeOpenChange = (open: boolean) => {
    setShowEditEmployee(open);
    if (!open) setSelectedEmployee(null);
  };

  // Prepare shifts data for saving
  const prepareShiftsForSave = () => {
    return shifts.map(shift => {
      const shiftDate = new Date(shift.start_time);
      const dayIndex = (shiftDate.getDay() + 6) % 7; // Convert to Monday-based index
      const startHour = shiftDate.getHours();
      const endDate = new Date(shift.end_time);
      const endHour = endDate.getHours();
      
      // Find which slot this shift belongs to
      const slot = shiftSlots.find(s => {
        if (s.endHour > s.startHour) {
          return startHour >= s.startHour && startHour < s.endHour;
        }
        return startHour >= s.startHour || startHour < s.endHour;
      });
      
      return {
        employee_id: shift.employee_id,
        employee_name: getEmployeeName(shift.employee_id),
        day_index: dayIndex,
        slot_id: slot?.id || 'morning',
        start_hour: startHour,
        end_hour: endHour,
        break_minutes: shift.break_minutes || 0,
        hourly_rate: shift.hourly_rate,
        department_id: shift.department_id
      };
    });
  };

  // Handle loading a saved schedule
  const handleLoadSchedule = async (template: any) => {
    if (!template.template_data) return;
    
    // Enable showing shifts when loading a template
    setShowScheduleShifts(true);
    
    const { shiftSlots: savedSlots, shifts: savedShifts, week_start } = template.template_data;
    
    // Update shift slots if they were saved
    if (savedSlots && savedSlots.length > 0) {
      setShiftSlots(savedSlots);
    }
    
    // Navigate to the saved week
    if (week_start) {
      setSelectedWeek(new Date(week_start));
    }
    
    // Recreate shifts from saved data
    if (savedShifts && savedShifts.length > 0) {
      // First delete existing shifts for this week
      for (const shift of shifts) {
        await deleteShift(shift.id);
      }
      
      // Then create new shifts from template
      const newWeekDates = getWeekDates(week_start ? new Date(week_start) : selectedWeek);
      
      for (const savedShift of savedShifts) {
        const date = newWeekDates[savedShift.day_index];
        const startDateTime = new Date(date);
        startDateTime.setHours(savedShift.start_hour, 0, 0, 0);
        
        const endDateTime = new Date(date);
        endDateTime.setHours(savedShift.end_hour, 0, 0, 0);
        
        // If night shift crosses midnight, adjust end date
        if (savedShift.end_hour < savedShift.start_hour) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
        
        await createShift({
          employee_id: savedShift.employee_id,
          company_id: selectedCompany,
          department_id: savedShift.department_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          break_minutes: savedShift.break_minutes,
          hourly_rate: savedShift.hourly_rate,
          status: 'scheduled'
        });
      }
      
      toast({
        title: "Schedule Loaded",
        description: `"${template.name}" has been applied.`
      });
    }
  };

  // Handle editing a saved schedule - load it into the grid for editing
  const handleEditSavedSchedule = async (template: any) => {
    if (!template.template_data) return;
    
    // Enable showing shifts when editing a template
    setShowScheduleShifts(true);
    
    const { shiftSlots: savedSlots, shifts: savedShifts, week_start } = template.template_data;
    
    // Update shift slots if they were saved
    if (savedSlots && savedSlots.length > 0) {
      setShiftSlots(savedSlots);
    }
    
    // Navigate to the saved week
    if (week_start) {
      setSelectedWeek(new Date(week_start));
    }
    
    // Delete existing shifts for this week first
    for (const shift of shifts) {
      try {
        await supabase
          .from('time_clock')
          .update({ shift_id: null })
          .eq('shift_id', shift.id);
        await deleteShift(shift.id);
      } catch (e) {
        console.error('Failed to delete shift:', shift.id, e);
      }
    }
    
    // Recreate shifts from saved data if any
    if (savedShifts && savedShifts.length > 0) {
      const newWeekDates = getWeekDates(week_start ? new Date(week_start) : selectedWeek);
      
      for (const savedShift of savedShifts) {
        const date = newWeekDates[savedShift.day_index];
        const startDateTime = new Date(date);
        startDateTime.setHours(savedShift.start_hour, 0, 0, 0);
        
        const endDateTime = new Date(date);
        endDateTime.setHours(savedShift.end_hour, 0, 0, 0);
        
        if (savedShift.end_hour < savedShift.start_hour) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
        
        await createShift({
          employee_id: savedShift.employee_id,
          company_id: selectedCompany,
          department_id: savedShift.department_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          break_minutes: savedShift.break_minutes,
          hourly_rate: savedShift.hourly_rate,
          status: 'scheduled'
        });
      }
    }
    
    // Set up template for saving updates
    setEditingTemplate({
      id: template.id,
      name: template.name,
      description: template.description
    });
    
    // Enable edit mode so they can modify
    setIsEditMode(true);
    
    toast({
      title: "Schedule Loaded for Editing",
      description: `"${template.name}" is now loaded. Make changes and click "Save Schedule" when done.`
    });
  };

  const handleScheduleSaved = async () => {
    setSavedSchedulesRefresh(prev => prev + 1);
    setEditingTemplate(null);
    
    // IMPORTANT: DO NOT delete shifts after saving!
    // Shifts must remain in the database so employees can see their scheduled shifts.
    // The schedule_templates table stores a copy/template for future use,
    // but the actual shifts table is the source of truth for employee schedules.
    
    // Auto-advance to next week - create a completely new week date
    const currentWeekStart = getWeekStart(selectedWeek);
    const nextWeekStart = new Date(currentWeekStart.getTime());
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    nextWeekStart.setHours(12, 0, 0, 0); // Set to noon to avoid timezone edge cases
    
    // Force state update with new Date object
    setSelectedWeek(new Date(nextWeekStart.getTime()));
    setIsEditMode(false); // Exit edit mode after saving
    setShowScheduleShifts(false); // Reset to hide shifts for the new week
    
    toast({
      title: "Schedule Saved",
      description: `Schedule saved! Employees can now view their shifts. Now viewing week of ${nextWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`
    });
  };

  // Handle copying a saved schedule to the currently selected week
  const handleCopyScheduleToCurrentWeek = async (template: SavedSchedule) => {
    if (!template.template_data) return;
    
    // Enable showing shifts when copying a template
    setShowScheduleShifts(true);
    
    const { shiftSlots: savedSlots, shifts: savedShifts } = template.template_data;
    
    // Update shift slots if they were saved
    if (savedSlots && savedSlots.length > 0) {
      setShiftSlots(savedSlots);
    }
    
    // Delete existing shifts for current week
    for (const shift of shifts) {
      await deleteShift(shift.id);
    }
    
    // Create new shifts using current week's dates (not the saved week)
    if (savedShifts && savedShifts.length > 0) {
      const currentWeekDates = getWeekDates(selectedWeek);
      
      for (const savedShift of savedShifts) {
        const date = currentWeekDates[savedShift.day_index];
        const startDateTime = new Date(date);
        startDateTime.setHours(savedShift.start_hour, 0, 0, 0);
        
        const endDateTime = new Date(date);
        endDateTime.setHours(savedShift.end_hour, 0, 0, 0);
        
        // If night shift crosses midnight, adjust end date
        if (savedShift.end_hour < savedShift.start_hour) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
        
        await createShift({
          employee_id: savedShift.employee_id,
          company_id: selectedCompany,
          department_id: savedShift.department_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          break_minutes: savedShift.break_minutes,
          hourly_rate: savedShift.hourly_rate,
          status: 'scheduled'
        });
      }
      
      toast({
        title: "Schedule Copied",
        description: `"${template.name}" has been copied to the current week. You can now modify and save it.`
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .print-schedule, .print-schedule * {
              visibility: visible;
            }
            .print-schedule {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `
      }} />
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEmployeeView ? 'Team Schedule' : 'Schedule Management'}
          </h1>
          <p className="text-muted-foreground">
            {isEmployeeView 
              ? 'View your team\'s schedule and shifts'
              : 'Manage employee schedules and shift assignments'}
          </p>
        </div>
      {canManageShifts && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreateShift(true)} disabled={!selectedCompany}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Schedule
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 ml-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">
                {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Organization dropdown - Only for super admins */}
          {userRole === 'super_admin' && (
            <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Company dropdown */}
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {schedulableCompanies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      {/* Main Layout: Schedule Grid + Employee Sidebar */}
      <div className={`grid grid-cols-1 ${canManageShifts ? 'xl:grid-cols-4' : ''} gap-6`}>
        {/* Schedule Grid - Takes 3/4 of the space for admins, full width for employees */}
        <div className={`${canManageShifts ? 'xl:col-span-3' : ''} print-schedule`}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <div className="flex gap-2 flex-wrap">
                  {canManageShifts && (
                    <>
                      <Button 
                        variant={isEditMode ? "secondary" : "outline"} 
                        size="sm"
                        onClick={() => setIsEditMode(!isEditMode)}
                        disabled={!selectedCompany}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {isEditMode ? "Exit Edit" : "Edit Schedule"}
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(null);
                          setShowSaveScheduleModal(true);
                        }}
                        disabled={!selectedCompany || shifts.length === 0}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save Schedule
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={printSchedule} disabled={!selectedCompany}>
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadSchedule} disabled={!selectedCompany}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={!selectedCompany}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Plus className="h-4 w-4 mr-2" />
                        Duplicate Week
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Calendar className="h-4 w-4 mr-2" />
                        Copy from Template
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Week
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-8 gap-2">
                {/* Header row */}
                <div className="font-medium text-sm text-muted-foreground p-2">
                  Shift / Day
                </div>
                {days.map((day, index) => (
                  <div key={day} className="font-medium text-sm text-center p-2 border rounded relative group">
                    <div>{day}</div>
                    <div className="text-xs text-muted-foreground">
                      {weekDates[index].getDate()}
                    </div>
                    {/* Day edit button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Day Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Multiple Shifts
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear Day
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {/* Shift rows */}
                {shiftSlots.map((slot) => (
                  <div key={slot.id} className="contents">
                    <div className="font-medium text-sm p-3 border rounded bg-muted/50 relative group">
                      <div>{slot.name}</div>
                      <div className="text-xs text-muted-foreground">{slot.time}</div>
                      {/* Slot edit button - only for admins */}
                      {canManageShifts && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingSlot(slot);
                            setShowSlotEditModal(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Slot Times
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            // TODO: Implement bulk assign functionality
                            alert('Bulk assign functionality coming soon!');
                          }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Bulk Assign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </div>
                    
                    {days.map((_, dayIndex) => {
                      const dayShifts = getShiftsForDayAndSlot(dayIndex, slot.id);
                      const isDropTarget = draggedEmployee !== null && isEditMode;
                      
                      return (
                        <div 
                          key={dayIndex} 
                          className={`min-h-[100px] border rounded p-2 space-y-1 transition-colors ${
                            isDropTarget && canManageShifts ? 'border-primary/50 bg-primary/5' : ''
                          }`}
                          onDragOver={canManageShifts && isEditMode ? handleDragOver : undefined}
                          onDrop={canManageShifts && isEditMode ? (e) => handleDrop(e, dayIndex, slot.id) : undefined}
                        >
                          {dayShifts.map((shift) => {
                            const employeeName = getEmployeeName(shift.employee_id);
                            const startTime = new Date(shift.start_time);
                            const endTime = new Date(shift.end_time);
                            const isMyShift = employeeRecord && shift.employee_id === employeeRecord.id;
                            
                            return (
                                <div
                                  key={shift.id}
                                  className={`group relative flex items-center gap-2 p-2 rounded border ${
                                    isMyShift 
                                      ? 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700 ring-2 ring-green-500/50' 
                                      : isEmployeeView
                                        ? 'bg-muted/50 border-muted-foreground/20'
                                        : 'bg-primary/10 border-primary/20'
                                  } ${isEditMode && canManageShifts ? 'cursor-move hover:bg-primary/20' : 'cursor-default'}`}
                                  onClick={isEditMode && canManageShifts ? () => handleEditShift(shift) : undefined}
                                  draggable={isEditMode && canManageShifts}
                                  onDragStart={isEditMode && canManageShifts ? (e) => handleDragStart(e, shift.employee_id, shift) : undefined}
                                  onDragEnd={isEditMode && canManageShifts ? handleDragEnd : undefined}
                                >
                                  <Avatar className={`h-6 w-6 ${isMyShift ? 'ring-2 ring-green-500' : ''}`}>
                                    <AvatarFallback className={`text-xs ${isMyShift ? 'bg-green-500 text-white' : ''}`}>
                                      {employeeName.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-medium truncate ${isMyShift ? 'text-green-700 dark:text-green-300' : ''}`}>
                                      {employeeName}
                                      {isMyShift && isEmployeeView && (
                                        <span className="ml-1 text-[10px] font-normal text-green-600 dark:text-green-400">(You)</span>
                                      )}
                                    </div>
                                  </div>
                                  {isEditMode && canManageShifts && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditShift(shift);
                                        }}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit Shift
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          deleteShift(shift.id);
                                        }}>
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete Shift
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                            );
                          })}
                          {dayShifts.length === 0 && canManageShifts && isEditMode && (
                            <div
                              className={`w-full h-full min-h-[60px] border-2 border-dashed rounded flex items-center justify-center transition-colors ${
                                isDropTarget 
                                  ? 'border-primary bg-primary/10 text-primary' 
                                  : 'border-muted-foreground/25 text-muted-foreground hover:border-primary hover:text-primary'
                              }`}
                            >
                              {isDropTarget ? (
                                <div className="text-xs text-center">
                                  Drop employee here<br/>
                                  <span className="text-xs opacity-70">{slot.time}</span>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full h-full"
                                  onClick={() => handleAddShift(dayIndex, slot.id)}
                                  disabled={!selectedCompany}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                          {dayShifts.length === 0 && canManageShifts && !isEditMode && (
                            <div className="w-full h-full min-h-[60px] border-2 border-dashed rounded flex items-center justify-center text-muted-foreground/50">
                              <span className="text-xs">Empty</span>
                            </div>
                          )}
                          {dayShifts.length === 0 && !canManageShifts && (
                            <div className="w-full h-full min-h-[60px] border-2 border-dashed rounded flex items-center justify-center text-muted-foreground/50">
                              <span className="text-xs">No shifts</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Available Employees (only for admins) */}
        {canManageShifts && (
        <div className="xl:col-span-1 no-print">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5" />
                Employees
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isEditMode ? 'Drag to schedule slots' : 'Enable Edit Mode to schedule'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center text-muted-foreground py-8">
                    Loading...
                  </div>
                ) : employees.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {!selectedCompany ? (
                      <div>
                        <p className="mb-2">Select a company</p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setShowCreateCompany(true)}
                        >
                          <Building className="h-3 w-3 mr-1" />
                          Add Company
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-2">No employees found</p>
                        <Button 
                          size="sm" 
                          onClick={() => setShowCreateEmployee(true)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Employee
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  employees
                    .filter(employee => selectedDepartment === "all" || employee.department_id === selectedDepartment)
                    .map((employee) => {
                      const department = departments.find(d => d.id === employee.department_id);
                      const isDragging = draggedEmployee === employee.id;
                      
                      return (
                        <div 
                          key={employee.id} 
                          className={`group flex flex-col gap-2 p-3 rounded border transition-all hover:shadow-sm ${
                            isDragging ? 'opacity-50 scale-95' : ''
                          } ${employee.status === 'active' ? 'border-green-200 bg-green-50/50' : 'border-gray-200'} ${
                            isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                          }`}
                          draggable={isEditMode}
                          onDragStart={isEditMode ? (e) => handleDragStart(e, employee.id) : undefined}
                          onDragEnd={isEditMode ? handleDragEnd : undefined}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEditEmployee(employee)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Employee
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  View Schedule
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              <Badge 
                                variant={employee.status === 'active' ? 'default' : 'secondary'} 
                                className="text-xs"
                              >
                                {employee.status}
                              </Badge>
                              {department && (
                                <Badge variant="outline" className="text-xs">
                                  {department.name}
                                </Badge>
                              )}
                            </div>
                            {employee.hourly_rate && (
                              <span className="text-xs font-medium text-green-600">
                                ${employee.hourly_rate}/hr
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        )}
      </div>
      {/* Schedule Summary */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Week Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Shifts:</span>
                <span className="font-medium">{shifts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmed:</span>
                <span className="font-medium text-green-600">
                  {shifts.filter(s => s.status === 'confirmed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheduled:</span>
                <span className="font-medium text-blue-600">
                  {shifts.filter(s => s.status === 'scheduled').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending:</span>
                <span className="font-medium text-yellow-600">
                  {shifts.filter(s => s.status === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Hours:</span>
                <span className="font-medium">
                  {shifts.reduce((total, shift) => {
                    const start = new Date(shift.start_time);
                    const end = new Date(shift.end_time);
                    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    return total + hours;
                  }, 0).toFixed(1)}h
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Schedules Section */}
      {canManageShifts && selectedCompany && (
        <div className="mt-6">
          <SavedSchedulesCard
            companyId={selectedCompany}
            onLoadSchedule={handleLoadSchedule}
            onEditSchedule={handleEditSavedSchedule}
            onCopyToCurrentWeek={handleCopyScheduleToCurrentWeek}
            currentWeekLabel={`${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            refreshTrigger={savedSchedulesRefresh}
          />
        </div>
      )}

      {/* Modals */}
      <CreateCompanyModal 
        open={showCreateCompany} 
        onOpenChange={setShowCreateCompany} 
      />
      
      <CreateShiftModal 
        open={showCreateShift} 
        onOpenChange={setShowCreateShift}
        companyId={selectedCompany}
        onScheduleCreated={() => setSavedSchedulesRefresh(prev => prev + 1)}
      />
      
      <EditShiftModal 
        open={showEditShift} 
        onOpenChange={setShowEditShift}
        shift={selectedShift}
        companyId={selectedCompany}
      />
      
      <CreateEmployeeModal 
        open={showCreateEmployee} 
        onOpenChange={setShowCreateEmployee}
        companyId={selectedCompany}
      />

      <EditEmployeeModal
        open={showEditEmployee}
        onOpenChange={handleEditEmployeeOpenChange}
        employee={selectedEmployee}
        companyId={selectedCompany}
        onUpdate={updateEmployee}
        onDelete={deleteEmployee}
      />
      
      <SlotEditModal 
        open={showSlotEditModal} 
        onOpenChange={setShowSlotEditModal}
        slot={editingSlot}
        onSave={handleSlotSave}
      />

      <SaveScheduleModal
        open={showSaveScheduleModal}
        onOpenChange={(open) => {
          setShowSaveScheduleModal(open);
          if (!open) setEditingTemplate(null);
        }}
        companyId={selectedCompany}
        shiftSlots={shiftSlots}
        shifts={prepareShiftsForSave()}
        weekStart={getWeekStart(selectedWeek)}
        existingTemplate={editingTemplate}
        onSaved={handleScheduleSaved}
      />

      {preSelectedDate && preSelectedSlot && (
        <AssignShiftModal
          open={showAssignShiftModal}
          onOpenChange={(open) => {
            setShowAssignShiftModal(open);
            if (!open) {
              setPreSelectedDate(undefined);
              setPreSelectedSlot(undefined);
            }
          }}
          companyId={selectedCompany}
          date={preSelectedDate}
          slot={preSelectedSlot}
          onShiftCreated={() => {
            setShowScheduleShifts(true);
          }}
        />
      )}
    </div>
  );
}