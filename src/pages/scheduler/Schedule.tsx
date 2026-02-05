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
import { useScheduleTeams } from "@/hooks/useScheduleTeams";
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
import ConnecteamScheduleGrid from "@/components/scheduler/ConnecteamScheduleGrid";
import QuickShiftModal from "@/components/scheduler/QuickShiftModal";
import CreateTeamModal from "@/components/scheduler/CreateTeamModal";
import TeamSelector from "@/components/scheduler/TeamSelector";
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

  // Schedule Teams hook
  const { teams, loading: teamsLoading, createTeam, refetch: refetchTeams } = useScheduleTeams(isValidCompanySelected ? selectedCompany : undefined);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  // Availability hook for Connecteam-style scheduling
  const { 
    getAvailabilityStatus, 
    setEmployeeAvailability 
  } = useEmployeeAvailability(isValidCompanySelected ? selectedCompany : undefined, weekStart);

  const [employeeRecord, setEmployeeRecord] = useState<{ id: string; company_id: string; team_id?: string | null } | null>(null);
  const [fallbackNamesById, setFallbackNamesById] = useState<Record<string, string>>({});
  
  // For employee view: fetch ALL company employees from employees_public (so they see the full schedule)
  const [allCompanyEmployees, setAllCompanyEmployees] = useState<Employee[]>([]);
  const [loadingAllEmployees, setLoadingAllEmployees] = useState(false);

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
        } else if (roles.includes('employee') || roles.includes('house_keeping') || roles.includes('maintenance')) {
          // All operational staff (employee, house_keeping, maintenance) are treated the same
          computedRole = 'employee';
        } else {
          computedRole = 'user';
        }
      }

      setUserRole(computedRole);
      
      // Also check if user is an employee (use maybeSingle to avoid 406 when no record)
      const { data: empData } = await supabase
        .from('employees')
        .select('id, company_id, team_id')
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

        // Auto-select employee's team if they have one
        if (empData.team_id) {
          setSelectedTeamId(empData.team_id);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  // Note: coworker name resolution is handled via useCompanyEmployeeNames (SECURITY DEFINER RPC)

  // Grace period for marking shifts as missed (15 minutes) - defined here, used in effect below
  const GRACE_PERIOD_MINUTES = 15;

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

  // For employee view: fetch ALL employees via SECURITY DEFINER RPC (bypasses RLS for coworker visibility)
  useEffect(() => {
    const fetchAllCompanyEmployees = async () => {
      if (!employeeRecord?.company_id) return;
      
      setLoadingAllEmployees(true);
      try {
        // Use the new SECURITY DEFINER RPC to get all company employees
        const { data, error } = await supabase
          .rpc('get_company_employees_for_schedule', { _company_id: employeeRecord.company_id });
        
        if (error) throw error;
        
        // Map the RPC response to Employee type
        const mappedEmployees: Employee[] = (data || []).map((e: any) => ({
          id: e.id,
          first_name: e.first_name || '',
          last_name: e.last_name || '',
          email: '', // Not available in public view
          company_id: e.company_id,
          department_id: e.department_id,
          position: e.employee_position,
          status: e.employee_status || 'active',
          user_id: e.user_id,
          created_at: '',
          team_id: e.team_id
        }));
        
        setAllCompanyEmployees(mappedEmployees);
      } catch (error) {
        console.error('Error fetching all company employees:', error);
      } finally {
        setLoadingAllEmployees(false);
      }
    };

    if (userRole === 'employee' && employeeRecord?.company_id) {
      fetchAllCompanyEmployees();
    }
  }, [userRole, employeeRecord?.company_id]);

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

  // Check and mark missed shifts - only for managers, run once on load (not polling)
  // IMPORTANT: Only marks shifts as missed if they were created BEFORE their start_time.
  useEffect(() => {
    const checkAndMarkMissedShifts = async () => {
      // Only managers should run this check - employees can't update shifts due to RLS
      if (!isValidCompanySelected || !canManageShifts) return;
      
      try {
        const now = new Date();
        const graceThreshold = new Date(now.getTime() - GRACE_PERIOD_MINUTES * 60 * 1000);
        
        const { data: overdueShifts, error: fetchError } = await supabase
          .from('shifts')
          .select('id, employee_id, company_id, start_time, created_at')
          .eq('company_id', selectedCompany)
          .eq('status', 'scheduled')
          .eq('is_missed', false)
          .lt('start_time', graceThreshold.toISOString());
        
        if (fetchError || !overdueShifts || overdueShifts.length === 0) return;
        
        for (const shift of overdueShifts) {
          const shiftStartTime = new Date(shift.start_time);
          const shiftCreatedAt = new Date(shift.created_at);
          if (shiftCreatedAt > shiftStartTime) continue;
          
          const { data: clockEntry } = await supabase
            .from('time_clock')
            .select('id')
            .eq('shift_id', shift.id)
            .not('clock_in', 'is', null)
            .maybeSingle();
          
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
        
        refetchShifts();
      } catch (error) {
        console.error('Error checking missed shifts:', error);
      }
    };

    checkAndMarkMissedShifts();
  }, [selectedCompany, isValidCompanySelected, canManageShifts, refetchShifts, GRACE_PERIOD_MINUTES]);

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
    // Get company and team names for the header
    const companyName = schedulableCompanies.find(c => c.id === selectedCompany)?.name || 'Schedule';
    const teamName = selectedTeamId ? teams.find(t => t.id === selectedTeamId)?.name : undefined;
    
    // Filter employees for current view
    const filteredEmps = selectedTeamId 
      ? employees.filter(e => e.team_id === selectedTeamId)
      : employees;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print blocked",
        description: "Please allow popups to print the schedule.",
        variant: "destructive"
      });
      return;
    }
    
    // Helper function to format time
    const formatTime = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };
    
    // Helper function to format date
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    };
    
    // Build employee sections
    let employeeSections = '';
    filteredEmps.forEach(emp => {
      const empShifts = shifts.filter(s => s.employee_id === emp.id);
      if (empShifts.length === 0) return;
      
      const weeklyHours = empShifts.reduce((acc, s) => {
        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);
      
      let tableRows = '';
      weekDates.forEach((date, i) => {
        const dayShifts = empShifts.filter(s => {
          const sd = new Date(s.start_time);
          return sd.toDateString() === date.toDateString();
        });
        
        if (dayShifts.length === 0) {
          tableRows += '<tr class="no-shift"><td>' + days[i] + '</td><td>' + formatDate(date) + '</td><td>-</td><td>-</td><td>-</td></tr>';
        } else {
          dayShifts.forEach((s, si) => {
            const start = new Date(s.start_time);
            const end = new Date(s.end_time);
            const hours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1);
            const time = formatTime(s.start_time) + ' - ' + formatTime(s.end_time);
            
            tableRows += '<tr>';
            if (si === 0) {
              tableRows += '<td rowspan="' + dayShifts.length + '">' + days[i] + '</td>';
              tableRows += '<td rowspan="' + dayShifts.length + '">' + formatDate(date) + '</td>';
            }
            tableRows += '<td>' + time + '</td>';
            tableRows += '<td>' + hours + 'h</td>';
            tableRows += '<td>' + (s.notes || '-') + '</td>';
            tableRows += '</tr>';
          });
        }
      });
      
      employeeSections += '<div class="employee-section">';
      employeeSections += '<h3>' + emp.first_name + ' ' + emp.last_name + (emp.position ? ' (' + emp.position + ')' : '') + '</h3>';
      employeeSections += '<table><thead><tr><th style="width:60px">Day</th><th style="width:70px">Date</th><th>Shift Time</th><th style="width:50px">Hours</th><th>Notes</th></tr></thead>';
      employeeSections += '<tbody>' + tableRows + '</tbody></table>';
      employeeSections += '<div class="total-row">Weekly Total: ' + weeklyHours.toFixed(1) + ' hours (' + empShifts.length + ' shifts)</div>';
      employeeSections += '</div>';
    });
    
    // Build summary table header
    let summaryHeaders = '<th style="text-align:left">Employee</th>';
    weekDates.forEach((d, i) => {
      summaryHeaders += '<th>' + days[i] + '<br>' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' }) + '</th>';
    });
    summaryHeaders += '<th>Total</th>';
    
    // Build summary table rows
    let summaryRows = '';
    filteredEmps.filter(e => shifts.some(s => s.employee_id === e.id)).forEach(emp => {
      const empShifts = shifts.filter(s => s.employee_id === emp.id);
      const weeklyHours = empShifts.reduce((acc, s) => {
        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);
      
      summaryRows += '<tr><td>' + emp.first_name + ' ' + emp.last_name.charAt(0) + '.</td>';
      weekDates.forEach(date => {
        const dayShifts = empShifts.filter(s => {
          const sd = new Date(s.start_time);
          return sd.toDateString() === date.toDateString();
        });
        if (dayShifts.length === 0) {
          summaryRows += '<td>-</td>';
        } else {
          summaryRows += '<td>' + dayShifts.map(s => formatTime(s.start_time)).join('<br>') + '</td>';
        }
      });
      summaryRows += '<td style="font-weight:bold">' + weeklyHours.toFixed(0) + 'h</td></tr>';
    });
    
    const weekRange = weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' - ' + weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const printedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' at ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    
    const printContent = '<!DOCTYPE html><html><head><title>' + companyName + ' - Weekly Schedule</title>' +
      '<style>' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }' +
      'body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; padding: 15px; }' +
      'h1 { font-size: 18px; margin-bottom: 4px; }' +
      'h2 { font-size: 14px; font-weight: normal; color: #666; }' +
      'h3 { font-size: 13px; background: #e5e5e5; padding: 6px 10px; border: 1px solid #999; margin-top: 15px; }' +
      '.header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }' +
      '.meta { font-size: 12px; color: #666; margin-top: 4px; }' +
      'table { width: 100%; border-collapse: collapse; margin-top: 5px; }' +
      'th, td { border: 1px solid #666; padding: 5px 8px; text-align: left; }' +
      'th { background: #f0f0f0; font-weight: bold; }' +
      '.total-row { text-align: right; font-size: 11px; margin-top: 3px; padding-right: 5px; }' +
      '.summary { margin-top: 25px; page-break-before: always; }' +
      '.summary h3 { background: none; border: none; border-bottom: 2px solid #000; padding-left: 0; }' +
      '.summary th { background: #ddd; text-align: center; }' +
      '.summary td { text-align: center; font-size: 10px; }' +
      '.summary td:first-child { text-align: left; font-weight: bold; }' +
      '.footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9px; color: #999; text-align: center; }' +
      '.employee-section { page-break-inside: avoid; }' +
      '.no-shift { color: #999; }' +
      '@page { size: A4 portrait; margin: 10mm; }' +
      '</style></head><body>' +
      '<div class="header">' +
      '<h1>' + companyName + '</h1>' +
      (teamName ? '<h2>' + teamName + '</h2>' : '') +
      '<div class="meta">Weekly Schedule: ' + weekRange + '</div>' +
      '<div class="meta">Total: ' + shifts.length + ' shifts | ' + filteredEmps.length + ' employees</div>' +
      '</div>' +
      employeeSections +
      '<div class="summary"><h3>Weekly Summary</h3>' +
      '<table><thead><tr>' + summaryHeaders + '</tr></thead>' +
      '<tbody>' + summaryRows + '</tbody></table></div>' +
      '<div class="footer">Printed on ' + printedAt + ' | Zeno Time Flow</div>' +
      '</body></html>';
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
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

  // Check for shift conflicts (overlapping shifts for the same employee on the SAME day)
  const checkShiftConflict = useCallback((employeeId: string, startTime: Date, endTime: Date, excludeShiftId?: string): Shift | undefined => {
    return shifts.find(shift => {
      if (shift.employee_id !== employeeId) return false;
      if (excludeShiftId && shift.id === excludeShiftId) return false;
      
      const existingStart = new Date(shift.start_time);
      const existingEnd = new Date(shift.end_time);
      
      // First check if the shifts are on the same day (compare year, month, day)
      const sameDay = startTime.getFullYear() === existingStart.getFullYear() &&
                      startTime.getMonth() === existingStart.getMonth() &&
                      startTime.getDate() === existingStart.getDate();
      
      // If not on the same day, no conflict
      if (!sameDay) return false;
      
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
      team_id: selectedTeamId || employee?.team_id || undefined,
      start_time: shiftData.start_time,
      end_time: shiftData.end_time,
      break_minutes: shiftData.break_minutes,
      hourly_rate: employee?.hourly_rate || undefined,
      notes: shiftData.notes,
      status: 'scheduled'
    });
    setShowScheduleShifts(true);
  };

  // Handler for quick shift save multiple (copy to week feature)
  const handleQuickShiftSaveMultiple = async (shifts: Array<{
    employee_id: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes?: string;
  }>) => {
    const employee = employees.find(e => e.id === shifts[0]?.employee_id);
    
    // Create all shifts
    for (const shiftData of shifts) {
      await createShift({
        employee_id: shiftData.employee_id,
        company_id: selectedCompany,
        department_id: selectedDepartment !== "all" ? selectedDepartment : employee?.department_id || undefined,
        team_id: selectedTeamId || employee?.team_id || undefined,
        start_time: shiftData.start_time,
        end_time: shiftData.end_time,
        break_minutes: shiftData.break_minutes,
        hourly_rate: employee?.hourly_rate || undefined,
        notes: shiftData.notes,
        status: 'scheduled'
      });
    }
    
    setShowScheduleShifts(true);
    toast({
      title: "Shifts Created",
      description: `Successfully created ${shifts.length} shifts for the week.`
    });
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
    
    const { shiftSlots: savedSlots, week_start } = template.template_data;
    
    // Update shift slots if they were saved
    if (savedSlots && savedSlots.length > 0) {
      setShiftSlots(savedSlots);
    }
    
    // Check if the current week already matches the template's week
    // If so, just enable edit mode without recreating shifts
    const templateWeekStart = week_start ? new Date(week_start) : null;
    const currentWeekStart = getWeekStart(selectedWeek);
    
    const isSameWeek = templateWeekStart && 
      templateWeekStart.getFullYear() === currentWeekStart.getFullYear() &&
      templateWeekStart.getMonth() === currentWeekStart.getMonth() &&
      templateWeekStart.getDate() === currentWeekStart.getDate();
    
    if (isSameWeek) {
      // Already viewing this week - just enable edit mode without recreating shifts
      setEditingTemplate({
        id: template.id,
        name: template.name,
        description: template.description
      });
      setIsEditMode(true);
      
      toast({
        title: "Edit Mode Enabled",
        description: `You can now edit the schedule for "${template.name}". Click "Publish" when done.`
      });
      return;
    }
    
    // Navigate to the saved week (this will trigger a refetch of shifts for that week)
    if (week_start) {
      setSelectedWeek(new Date(week_start));
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
      description: `"${template.name}" is now loaded. Make changes and click "Publish" when done.`
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

  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <div className="h-full flex flex-col">
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
      
      {/* Page Header - Connecteam Style */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card no-print">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Schedule</h1>
        </div>
        
        {/* Management Controls - only for managers, not employees */}
        {!isEmployeeView && (
          <div className="flex items-center gap-3">
            {/* Organization dropdown - Only for super admins */}
            {userRole === 'super_admin' && (
              <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
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
              setSelectedDepartment("all");
            }}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-50">
                {schedulableCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Department dropdown */}
            {selectedCompany && departments.length > 0 && (
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
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
        )}
      </div>

      {/* Team Selector Bar - only for managers */}
      {!isEmployeeView && selectedCompany && (teams.length > 0 || canManageShifts) && (
        <div className="px-6 py-3 border-b bg-muted/20 no-print">
          <TeamSelector
            teams={teams}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(teamId) => {
              setSelectedTeamId(teamId);
              // For employees, they can only see their own team's schedule
              // For managers, null means all teams
            }}
            onCreateTeam={() => setShowCreateTeamModal(true)}
            canManage={canManageShifts}
            showAllOption={canManageShifts} // Only managers can see "All Teams"
          />
        </div>
      )}

      {/* Main Connecteam-Style Grid */}
      <div className="flex-1 p-4 overflow-hidden print-schedule">
        <ConnecteamScheduleGrid
          employees={(isEmployeeView ? allCompanyEmployees : employees).filter(e => {
            // Filter by department
            const deptMatch = selectedDepartment === "all" || e.department_id === selectedDepartment;
            // For employees, show all company employees (no team filter since employees_public doesn't have team_id)
            // For managers, filter by selected team or show all
            const teamMatch = isEmployeeView || selectedTeamId === null || (e as any).team_id === selectedTeamId;
            return deptMatch && teamMatch;
          })}
          shifts={(showScheduleShifts || isEmployeeView ? shifts : []).filter(s => {
            // Filter shifts by selected team
            if (selectedTeamId === null) return true;
            return (s as any).team_id === selectedTeamId;
          })}
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
          onNavigateWeek={navigateWeek}
          weekLabel={weekLabel}
          onToggleEditMode={() => setIsEditMode(!isEditMode)}
          onSaveSchedule={() => {
            setEditingTemplate(null);
            setShowSaveScheduleModal(true);
          }}
          onAddNewSchedule={() => setShowCreateShift(true)}
          onClearWeek={handleClearWeek}
          onDuplicateWeek={handleDuplicateWeek}
          onPrint={printSchedule}
          onDownload={downloadSchedule}
          isEmployeeView={isEmployeeView}
          currentEmployeeId={employeeRecord?.id}
        />
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
        weekDates={weekDates}
        onSave={handleQuickShiftSave}
        onSaveMultiple={handleQuickShiftSaveMultiple}
        checkShiftConflict={checkShiftConflict}
      />

      {/* Create Team Modal */}
      <CreateTeamModal
        open={showCreateTeamModal}
        onOpenChange={setShowCreateTeamModal}
        onCreateTeam={async (team) => {
          const result = await createTeam(team);
          if (result) {
            refetchTeams();
            // Auto-select the newly created team
            setSelectedTeamId(result.id);
          }
          return result;
        }}
      />
    </div>
  );
}