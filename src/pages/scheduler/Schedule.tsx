import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight, Plus, Users, Clock, Building, Edit, Trash2, MoreHorizontal, Download, Printer, Save, AlertTriangle, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanies, useDepartments, useEmployees, useShifts, Shift, Employee } from "@/hooks/useSchedulerDatabase";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompanyEmployeeNames } from "@/hooks/useCompanyEmployeeNames";
import { useEmployeeAvailability, AvailabilityStatus } from "@/hooks/useEmployeeAvailability";
import CreateCompanyModal from "@/components/scheduler/CreateCompanyModal";
import CreateShiftModal from "@/components/scheduler/CreateShiftModal";
import EditShiftModal from "@/components/scheduler/EditShiftModal";

import SlotEditModal from "@/components/scheduler/SlotEditModal";
import EditEmployeeModal from "@/components/scheduler/EditEmployeeModal";
import SaveScheduleModal from "@/components/scheduler/SaveScheduleModal";
import SavedSchedulesCard, { SavedSchedule } from "@/components/scheduler/SavedSchedulesCard";
import AssignShiftModal from "@/components/scheduler/AssignShiftModal";
import MissedShiftRequestModal from "@/components/scheduler/MissedShiftRequestModal";
import EmployeeScheduleGrid from "@/components/scheduler/EmployeeScheduleGrid";
import QuickShiftModal from "@/components/scheduler/QuickShiftModal";
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SchedulerSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
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
  const [missedShiftToRequest, setMissedShiftToRequest] = useState<{
    id: string;
    employee_id: string;
    company_id: string;
    start_time: string;
    end_time: string;
    employeeName: string;
    companyName?: string;
    departmentName?: string;
  } | null>(null);
  const [myPendingRequests, setMyPendingRequests] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'employee' | 'slot'>('employee'); // New: Connecteam-style view toggle
  const [showQuickShiftModal, setShowQuickShiftModal] = useState(false);
  const [quickShiftEmployee, setQuickShiftEmployee] = useState<Employee | null>(null);
  const [quickShiftDate, setQuickShiftDate] = useState<Date | null>(null);
  const { toast } = useToast();
  
  // Check if selectedCompany is a valid UUID (not empty or "all")
  const isValidCompanySelected = selectedCompany && selectedCompany !== '' && selectedCompany !== 'all' && 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedCompany);
  
  // Memoize weekStart to prevent creating new Date objects on every render
  const weekStart = React.useMemo(() => {
    const start = new Date(selectedWeek);
    start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday
    start.setHours(0, 0, 0, 0);
    return start;
  }, [selectedWeek]);
  
  // Database hooks - only pass company ID when valid
  const { companies, loading: companiesLoading, refetch: refetchCompanies } = useCompanies();
  const { departments, loading: departmentsLoading } = useDepartments(isValidCompanySelected ? selectedCompany : undefined);
  const { employees, loading: employeesLoading, updateEmployee, deleteEmployee, refetch: refetchEmployees } = useEmployees(isValidCompanySelected ? selectedCompany : undefined);
  const { shifts, loading: shiftsLoading, createShift, updateShift, deleteShift, refetch: refetchShifts } = useShifts(isValidCompanySelected ? selectedCompany : undefined, weekStart);

  // Availability hook for Connecteam-style scheduling
  const { 
    getAvailabilityStatus, 
    setEmployeeAvailability 
  } = useEmployeeAvailability(isValidCompanySelected ? selectedCompany : undefined, weekStart);

  const [employeeRecord, setEmployeeRecord] = useState<{ id: string; company_id: string } | null>(null);
  const [fallbackNamesById, setFallbackNamesById] = useState<Record<string, string>>({});

  const companyIdForNames = useMemo(() => {
    if (isValidCompanySelected) return selectedCompany;
    return employeeRecord?.company_id || null;
  }, [employeeRecord?.company_id, isValidCompanySelected, selectedCompany]);

  const { namesById: employeeNamesById } = useCompanyEmployeeNames(companyIdForNames);

  // Fallback name resolution: if RPC returns empty/missing for some IDs, try employees_public.
  // This prevents persistent "Unknown" labels when the logged-in user's email doesn't exactly match.
  useEffect(() => {
    if (!user) return;

    const missing = new Set<string>();
    for (const s of shifts) {
      if (s?.employee_id && !employeeNamesById.get(s.employee_id) && !fallbackNamesById[s.employee_id]) {
        missing.add(s.employee_id);
      }
      const repl = (s as any)?.replacement_employee_id;
      if (repl && !employeeNamesById.get(repl) && !fallbackNamesById[repl]) {
        missing.add(repl);
      }
    }

    const ids = Array.from(missing).filter(Boolean);
    if (ids.length === 0) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('employees_public')
        .select('id, first_name, last_name')
        .in('id', ids);

      if (cancelled || error || !Array.isArray(data)) return;

      const next: Record<string, string> = {};
      for (const row of data as any[]) {
        if (!row?.id) continue;
        const first = String(row?.first_name ?? "").trim();
        const last = String(row?.last_name ?? "").trim();
        const full = `${first} ${last}`.trim();
        if (full) next[String(row.id)] = full;
      }
      if (!cancelled && Object.keys(next).length > 0) {
        setFallbackNamesById((prev) => ({ ...prev, ...next }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employeeNamesById, fallbackNamesById, shifts, user]);
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
      
      let computedRole: string = 'user';
      if (data && data.length > 0) {
        const roles = data.map(item => item.role);
        if (roles.includes('super_admin')) {
          computedRole = 'super_admin';
        } else if (roles.includes('operations_manager')) {
          computedRole = 'operations_manager';
        } else if (roles.includes('manager')) {
          computedRole = 'manager';
        } else if (roles.includes('employee')) {
          computedRole = 'employee';
        } else {
          computedRole = 'user';
        }
      }

      setUserRole(computedRole);
      
      // Also check if user is an employee (use maybeSingle to avoid 406 when no record)
      const { data: empData } = await supabase
        .from('employees')
        .select('id, company_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (empData) {
        setEmployeeRecord(empData);

        // Fallback: if the user has an employee record but no explicit 'employee' role
        // in user_roles, treat them as employee for schedule display purposes.
        if (computedRole === 'user') {
          setUserRole('employee');
        }

        // Auto-select employee's company
        if (!selectedCompany) {
          setSelectedCompany(empData.company_id);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  // Note: coworker name resolution is handled via useCompanyEmployeeNames (SECURITY DEFINER RPC)

  // Grace period for marking shifts as missed (15 minutes)
  const GRACE_PERIOD_MINUTES = 15;

  // Check and mark missed shifts automatically (runs every minute)
  // IMPORTANT: Only marks shifts as missed if they were created BEFORE their start_time.
  // Shifts created retroactively (for past dates) should NOT be auto-marked as missed.
  useEffect(() => {
    const checkAndMarkMissedShifts = async () => {
      if (!isValidCompanySelected) return;
      
      try {
        const now = new Date();
        const graceThreshold = new Date(now.getTime() - GRACE_PERIOD_MINUTES * 60 * 1000);
        
        // Find scheduled shifts that have passed the grace period without clock-in
        // Also include created_at to filter out retroactively created shifts
        const { data: overdueShifts, error: fetchError } = await supabase
          .from('shifts')
          .select('id, employee_id, company_id, start_time, created_at')
          .eq('company_id', selectedCompany)
          .eq('status', 'scheduled')
          .eq('is_missed', false)
          .lt('start_time', graceThreshold.toISOString());
        
        if (fetchError || !overdueShifts || overdueShifts.length === 0) return;
        
        // Check each shift for time clock entry
        for (const shift of overdueShifts) {
          // Skip shifts that were created AFTER their start_time (retroactively added)
          // These are intentionally added for past dates and should not be auto-marked as missed
          const shiftStartTime = new Date(shift.start_time);
          const shiftCreatedAt = new Date(shift.created_at);
          if (shiftCreatedAt > shiftStartTime) {
            continue; // Skip retroactively created shifts
          }
          
          const { data: clockEntry } = await supabase
            .from('time_clock')
            .select('id')
            .eq('shift_id', shift.id)
            .not('clock_in', 'is', null)
            .maybeSingle();
          
          // If no clock entry, mark as missed
          if (!clockEntry) {
            await supabase
              .from('shifts')
              .update({ 
                is_missed: true, 
                missed_at: now.toISOString(),
                status: 'missed'
              })
              .eq('id', shift.id);
          }
        }
        
        // Refetch shifts to update the display
        refetchShifts();
      } catch (error) {
        console.error('Error checking missed shifts:', error);
      }
    };

    // Run immediately and then every minute
    checkAndMarkMissedShifts();
    const intervalId = setInterval(checkAndMarkMissedShifts, 60000);
    
    return () => clearInterval(intervalId);
  }, [selectedCompany, isValidCompanySelected, refetchShifts]);

  // Fetch my pending replacement requests
  useEffect(() => {
    const fetchMyRequests = async () => {
      if (!employeeRecord?.id) return;
      
      const { data: requests } = await supabase
        .from('shift_replacement_requests')
        .select('shift_id')
        .eq('replacement_employee_id', employeeRecord.id)
        .eq('status', 'pending');
      
      setMyPendingRequests(requests?.map(r => r.shift_id) || []);
    };

    fetchMyRequests();
  }, [employeeRecord?.id]);

  // Filter companies based on user role and access
  const availableCompanies = companies.filter(company => {
    // Super admins: companies only show AFTER selecting an organization
    if (userRole === 'super_admin') {
      // Only show companies if organization is selected
      if (!selectedOrganization) {
        return false;
      }
      return company.organization_id === selectedOrganization;
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

  // No need for manual refetch - hooks handle company changes internally

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
      
      // Filter by department if selected (not "all")
      if (selectedDepartment && selectedDepartment !== "all") {
        if (shift.department_id !== selectedDepartment) return false;
      }
      
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
    if (!employeeId) return 'Unassigned';

    const fallbackName = fallbackNamesById[employeeId];
    if (fallbackName) return fallbackName;

    // First check the regular employees list (for managers)
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      return `${employee.first_name} ${employee.last_name}`;
    }
    const nameFromMap = employeeNamesById.get(employeeId);
    if (nameFromMap) return nameFromMap;
    // Last resort: avoid rendering "Unknown"/"U…" pills.
    return 'Employee';
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
      // Require department selection when departments exist
      if (departments.length > 0 && (!selectedDepartment || selectedDepartment === "all")) {
        toast({
          title: "Department Required",
          description: "Please select a department before scheduling shifts.",
          variant: "destructive"
        });
        setDraggedEmployee(null);
        setDraggedShift(null);
        return;
      }
      
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
        // Use selected department, or fall back to employee's department
        const departmentId = selectedDepartment !== "all" ? selectedDepartment : employee?.department_id;
        
        if (shiftId && draggedShift) {
          // Moving existing shift to new slot
          updateShift(shiftId, {
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            employee_id: employeeId,
            department_id: departmentId,
          });
        } else {
          // Creating new shift
          createShift({
            employee_id: employeeId,
            company_id: selectedCompany,
            department_id: departmentId || undefined,
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

  // Only show loading for employees sidebar - don't include shiftsLoading to avoid flicker
  const isEmployeeSidebarLoading = employeesLoading;

  const handleOpenEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEditEmployee(true);
  };

  const handleEditEmployeeOpenChange = (open: boolean) => {
    setShowEditEmployee(open);
    if (!open) setSelectedEmployee(null);
  };

  // Check for shift conflicts (overlapping shifts for the same employee)
  const checkShiftConflict = useCallback((employeeId: string, startTime: Date, endTime: Date, excludeShiftId?: string): Shift | undefined => {
    return shifts.find(shift => {
      if (shift.employee_id !== employeeId) return false;
      if (excludeShiftId && shift.id === excludeShiftId) return false;
      
      const existingStart = new Date(shift.start_time);
      const existingEnd = new Date(shift.end_time);
      
      // Check for overlap: new shift starts before existing ends AND new shift ends after existing starts
      return startTime < existingEnd && endTime > existingStart;
    });
  }, [shifts]);

  // Handler for employee grid drag & drop (Connecteam-style)
  const handleEmployeeGridDrop = (e: React.DragEvent, employeeId: string, dayIndex: number) => {
    e.preventDefault();
    const draggedEmpId = e.dataTransfer.getData('employeeId');
    const shiftId = e.dataTransfer.getData('shiftId');
    
    if (shiftId && draggedShift) {
      // Moving an existing shift to a new day/employee
      const date = weekDates[dayIndex];
      const shiftStartDate = new Date(draggedShift.start_time);
      const shiftEndDate = new Date(draggedShift.end_time);
      
      // Calculate new times keeping the same hours
      const newStart = new Date(date);
      newStart.setHours(shiftStartDate.getHours(), shiftStartDate.getMinutes(), 0, 0);
      
      const newEnd = new Date(date);
      newEnd.setHours(shiftEndDate.getHours(), shiftEndDate.getMinutes(), 0, 0);
      
      // Handle overnight shifts
      if (shiftEndDate.getDate() !== shiftStartDate.getDate()) {
        newEnd.setDate(newEnd.getDate() + 1);
      }
      
      updateShift(shiftId, {
        employee_id: employeeId,
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString()
      });
    }
    
    setDraggedEmployee(null);
    setDraggedShift(null);
  };

  // Handler for adding shift from grid click
  const handleAddShiftFromGrid = (employeeId: string, dayIndex: number) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setQuickShiftEmployee(employee);
      setQuickShiftDate(weekDates[dayIndex]);
      setShowQuickShiftModal(true);
    }
  };

  // Handler for quick shift save
  const handleQuickShiftSave = async (shiftData: {
    employee_id: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes?: string;
  }) => {
    const employee = employees.find(e => e.id === shiftData.employee_id);
    await createShift({
      employee_id: shiftData.employee_id,
      company_id: selectedCompany,
      department_id: selectedDepartment !== "all" ? selectedDepartment : employee?.department_id || undefined,
      start_time: shiftData.start_time,
      end_time: shiftData.end_time,
      break_minutes: shiftData.break_minutes,
      hourly_rate: employee?.hourly_rate || undefined,
      notes: shiftData.notes,
      status: 'scheduled'
    });
    setShowScheduleShifts(true);
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

  // Clear all shifts for the current week
  const handleClearWeek = async () => {
    if (!selectedCompany || shifts.length === 0) {
      toast({
        title: "No Shifts",
        description: "There are no shifts to clear for this week.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Unlink time clock entries first to avoid foreign key issues
      for (const shift of shifts) {
        await supabase
          .from('time_clock')
          .update({ shift_id: null })
          .eq('shift_id', shift.id);
        
        await deleteShift(shift.id);
      }
      
      setShowScheduleShifts(false);
      
      toast({
        title: "Week Cleared",
        description: "All shifts for this week have been removed."
      });
    } catch (error) {
      console.error('Error clearing week:', error);
      toast({
        title: "Error",
        description: "Failed to clear week. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Duplicate current week to next week
  const handleDuplicateWeek = async () => {
    if (!selectedCompany || shifts.length === 0) {
      toast({
        title: "No Shifts",
        description: "There are no shifts to duplicate.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get next week's dates
      const nextWeekStart = new Date(getWeekStart(selectedWeek));
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const nextWeekDates = getWeekDates(nextWeekStart);
      
      // Create shifts for next week based on current week
      for (const shift of shifts) {
        const shiftDate = new Date(shift.start_time);
        const dayIndex = (shiftDate.getDay() + 6) % 7; // Monday-based
        
        const startDateTime = new Date(nextWeekDates[dayIndex]);
        startDateTime.setHours(shiftDate.getHours(), shiftDate.getMinutes(), 0, 0);
        
        const endDate = new Date(shift.end_time);
        const endDateTime = new Date(nextWeekDates[dayIndex]);
        endDateTime.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);
        
        // Handle overnight shifts
        if (endDate.getDate() !== shiftDate.getDate()) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
        
        await createShift({
          employee_id: shift.employee_id,
          company_id: selectedCompany,
          department_id: shift.department_id || undefined,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          break_minutes: shift.break_minutes || 0,
          hourly_rate: shift.hourly_rate || undefined,
          status: 'scheduled'
        });
      }
      
      // Navigate to next week
      setSelectedWeek(nextWeekStart);
      
      toast({
        title: "Week Duplicated",
        description: `${shifts.length} shifts have been copied to next week.`
      });
    } catch (error) {
      console.error('Error duplicating week:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate week. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Clear a specific day
  const handleClearDay = async (dayIndex: number) => {
    const targetDate = weekDates[dayIndex];
    const dayShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.start_time);
      return (
        shiftDate.getFullYear() === targetDate.getFullYear() &&
        shiftDate.getMonth() === targetDate.getMonth() &&
        shiftDate.getDate() === targetDate.getDate()
      );
    });

    if (dayShifts.length === 0) {
      toast({
        title: "No Shifts",
        description: "There are no shifts to clear for this day."
      });
      return;
    }

    try {
      for (const shift of dayShifts) {
        await supabase
          .from('time_clock')
          .update({ shift_id: null })
          .eq('shift_id', shift.id);
        await deleteShift(shift.id);
      }
      
      toast({
        title: "Day Cleared",
        description: `${dayShifts.length} shifts removed from ${days[dayIndex]}.`
      });
    } catch (error) {
      console.error('Error clearing day:', error);
      toast({
        title: "Error",
        description: "Failed to clear day.",
        variant: "destructive"
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
          <Select value={selectedCompany} onValueChange={(value) => {
            setSelectedCompany(value);
            setSelectedDepartment("all"); // Reset department when company changes
          }}>
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

          {/* Department dropdown - Only show when company is selected */}
          {selectedCompany && departments.length > 0 && (
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Select department *" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>


      {/* Main Layout: Schedule Grid + Employee Sidebar */}
      <div className={`grid grid-cols-1 ${canManageShifts ? 'xl:grid-cols-4' : ''} gap-6`}>
        {/* Schedule Grid - Takes 3/4 of the space for admins, full width for employees */}
        <div className={`${canManageShifts ? 'xl:col-span-3' : ''} print-schedule`}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <span>{weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  
                  {/* View Mode Toggle */}
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'employee' | 'slot')} className="hidden sm:block">
                    <TabsList className="h-8">
                      <TabsTrigger value="employee" className="text-xs px-3 h-7">
                        <Users className="h-3 w-3 mr-1" />
                        By Employee
                      </TabsTrigger>
                      <TabsTrigger value="slot" className="text-xs px-3 h-7">
                        <LayoutGrid className="h-3 w-3 mr-1" />
                        By Shift
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
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
                    <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                      <DropdownMenuItem onClick={handleDuplicateWeek} disabled={shifts.length === 0}>
                        <Plus className="h-4 w-4 mr-2" />
                        Duplicate Week
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={handleClearWeek} 
                        disabled={shifts.length === 0}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Week
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Employee-based view (Connecteam-style) */}
              {viewMode === 'employee' ? (
                <EmployeeScheduleGrid
                  employees={employees.filter(e => selectedDepartment === "all" || e.department_id === selectedDepartment)}
                  shifts={showScheduleShifts || isEmployeeView ? shifts : []}
                  weekDates={weekDates}
                  isEditMode={isEditMode}
                  canManageShifts={canManageShifts}
                  getEmployeeName={getEmployeeName}
                  getAvailabilityStatus={getAvailabilityStatus}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleEmployeeGridDrop}
                  onDragEnd={handleDragEnd}
                  onShiftClick={(shift) => {
                    setSelectedShift(shift);
                    setShowEditShift(true);
                  }}
                  onAddShift={handleAddShiftFromGrid}
                  onDeleteShift={deleteShift}
                  onSetAvailability={setEmployeeAvailability}
                  checkShiftConflict={checkShiftConflict}
                />
              ) : (
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
                    {/* Day edit button - only show for managers in edit mode */}
                    {canManageShifts && isEditMode && (
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
                      <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                        <DropdownMenuItem 
                          onClick={() => handleClearDay(index)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear Day
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    )}
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
                            const isMissed = (shift as any).is_missed === true;
                            const hasReplacement = !!(shift as any).replacement_employee_id;
                            const replacementName = hasReplacement ? getEmployeeName((shift as any).replacement_employee_id) : null;
                            const replacementStarted = !!(shift as any).replacement_started_at;
                            const shiftStatus = shift.status;
                            
                            // Determine if the shift is being actively covered
                            const isReplacementActive = replacementStarted || shiftStatus === 'in_progress';
                            
                            // Check if this is a coworker's missed shift that employee can request
                            const isCoworkerMissedShift = isEmployeeView && isMissed && !isMyShift && !hasReplacement && employeeRecord;
                            const hasPendingRequest = myPendingRequests.includes(shift.id);
                            const canRequestShift = isCoworkerMissedShift && !hasPendingRequest;
                            
                            // Get company and department names for the request modal
                            const company = schedulableCompanies.find(c => c.id === shift.company_id);
                            const department = departments.find(d => d.id === shift.department_id);
                            
                            const handleShiftClick = () => {
                              if (isEditMode && canManageShifts) {
                                handleEditShift(shift);
                              } else if (canRequestShift) {
                                setMissedShiftToRequest({
                                  id: shift.id,
                                  employee_id: shift.employee_id,
                                  company_id: shift.company_id || '',
                                  start_time: shift.start_time,
                                  end_time: shift.end_time,
                                  employeeName,
                                  companyName: company?.name,
                                  departmentName: department?.name
                                });
                              }
                            };
                            
                            // Determine the card styling based on shift state
                            const getShiftCardStyle = () => {
                              // If replacement is active, show green (in progress) styling
                              if (isReplacementActive) {
                                return 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700';
                              }
                              // If missed but has pending replacement, show yellow/warning
                              if (isMissed && hasReplacement && !isReplacementActive) {
                                return 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700';
                              }
                              // If missed without replacement
                              if (isMissed) {
                                return 'bg-destructive/10 border-destructive/30 dark:bg-destructive/20 dark:border-destructive/50';
                              }
                              // Current user's shift
                              if (isMyShift) {
                                return 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700 ring-2 ring-green-500/50';
                              }
                              // Employee view of other's shifts
                              if (isEmployeeView) {
                                return 'bg-muted/50 border-muted-foreground/20';
                              }
                              // Default
                              return 'bg-primary/10 border-primary/20';
                            };
                            
                            return (
                              <TooltipProvider key={shift.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`group relative flex flex-col gap-1 p-2 rounded border ${getShiftCardStyle()} ${isEditMode && canManageShifts ? 'cursor-move hover:bg-primary/20' : ''} ${
                                        canRequestShift ? 'cursor-pointer hover:bg-destructive/20 hover:border-destructive/50' : ''
                                      } ${hasPendingRequest ? 'opacity-60' : ''}`}
                                      onClick={handleShiftClick}
                                      draggable={isEditMode && canManageShifts && !isMissed}
                                      onDragStart={isEditMode && canManageShifts && !isMissed ? (e) => handleDragStart(e, shift.employee_id, shift) : undefined}
                                      onDragEnd={isEditMode && canManageShifts ? handleDragEnd : undefined}
                                    >
                                  {/* Original Employee Row */}
                                  <div className="flex items-center gap-2">
                                    <Avatar className={`h-6 w-6 ${isMyShift ? 'ring-2 ring-green-500' : ''} ${isMissed ? 'opacity-50' : ''}`}>
                                      <AvatarFallback className={`text-xs ${isMyShift ? 'bg-green-500 text-white' : ''} ${isMissed ? 'bg-red-300' : ''}`}>
                                        {employeeName.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className={`text-xs font-medium truncate ${
                                        isMissed 
                                          ? 'line-through text-red-600 dark:text-red-400' 
                                          : isMyShift 
                                            ? 'text-green-700 dark:text-green-300' 
                                            : ''
                                      }`}>
                                        {employeeName}
                                        {isMyShift && isEmployeeView && (
                                          <span className="ml-1 text-[10px] font-normal text-green-600 dark:text-green-400">(You)</span>
                                        )}
                                      </div>
                                    </div>
                                      {/* Show status badge based on shift state */}
                                      {isMissed && !hasReplacement && (
                                        <Badge variant="destructive" className="text-[10px] h-4 px-1">Missed</Badge>
                                      )}
                                      {isMissed && hasReplacement && isReplacementActive && (
                                        <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-green-500/20 text-green-700">Covered</Badge>
                                      )}
                                      {isMissed && hasReplacement && !isReplacementActive && (
                                        <Badge variant="destructive" className="text-[10px] h-4 px-1">Missed</Badge>
                                      )}
                                      {hasPendingRequest && (
                                        <Badge variant="secondary" className="text-[10px] h-4 px-1">Requested</Badge>
                                      )}
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
                                    
                                    {/* Replacement Employee Row (if applicable) */}
                                    {hasReplacement && replacementName && (
                                      <div className="flex items-center gap-2 pt-1 border-t border-dashed mt-1">
                                        <Avatar className={`h-5 w-5 ${isReplacementActive ? 'ring-2 ring-green-500' : 'ring-1 ring-yellow-400'}`}>
                                          <AvatarFallback className={`text-[10px] ${isReplacementActive ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                                            {replacementName.split(' ').map(n => n[0]).join('')}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <div className={`text-[10px] font-medium truncate ${isReplacementActive ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                                            {replacementName}
                                          </div>
                                        </div>
                                        <Badge variant="secondary" className={`text-[9px] h-3.5 px-1 ${
                                          isReplacementActive 
                                            ? 'bg-green-500/20 text-green-700' 
                                            : 'bg-yellow-500/20 text-yellow-700'
                                        }`}>
                                          {isReplacementActive ? 'Clocked In' : 'Approved'}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                {canRequestShift && (
                                  <TooltipContent>
                                    <p>Click to request covering this shift</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
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
              )}
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
                {isEmployeeSidebarLoading ? (
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
                          onClick={() => navigate('/scheduler/user-management')}
                        >
                          <Users className="h-3 w-3 mr-1" />
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
          preSelectedDepartmentId={selectedDepartment !== "all" ? selectedDepartment : undefined}
          onShiftCreated={() => {
            setShowScheduleShifts(true);
          }}
        />
      )}

      {/* Missed Shift Request Modal for Employees */}
      {employeeRecord && (
        <MissedShiftRequestModal
          shift={missedShiftToRequest}
          employeeId={employeeRecord.id}
          onClose={() => setMissedShiftToRequest(null)}
          onSuccess={() => {
            // Refresh pending requests
            supabase
              .from('shift_replacement_requests')
              .select('shift_id')
              .eq('replacement_employee_id', employeeRecord.id)
              .eq('status', 'pending')
              .then(({ data }) => {
                setMyPendingRequests(data?.map(r => r.shift_id) || []);
              });
          }}
        />
      )}

      {/* Quick Shift Modal for Connecteam-style grid */}
      <QuickShiftModal
        open={showQuickShiftModal}
        onOpenChange={setShowQuickShiftModal}
        employee={quickShiftEmployee}
        date={quickShiftDate}
        onSave={handleQuickShiftSave}
        checkShiftConflict={checkShiftConflict}
      />
    </div>
  );
}