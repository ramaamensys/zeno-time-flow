import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Plus, Users, Clock, LayoutTemplate, Building, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCompanies, useDepartments, useEmployees, useShifts, Shift } from "@/hooks/useSchedulerDatabase";
import CreateCompanyModal from "@/components/scheduler/CreateCompanyModal";
import CreateShiftModal from "@/components/scheduler/CreateShiftModal";
import EditShiftModal from "@/components/scheduler/EditShiftModal";
import CreateEmployeeModal from "@/components/scheduler/CreateEmployeeModal";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Predefined shift slots
const SHIFT_SLOTS = [
  { id: "morning", name: "Morning Shift", time: "6:00 AM - 2:00 PM", startHour: 6, endHour: 14 },
  { id: "afternoon", name: "Afternoon Shift", time: "2:00 PM - 10:00 PM", startHour: 14, endHour: 22 },
  { id: "night", name: "Night Shift", time: "10:00 PM - 6:00 AM", startHour: 22, endHour: 6 }
];

export default function SchedulerSchedule() {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [showEditShift, setShowEditShift] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [preSelectedDate, setPreSelectedDate] = useState<Date | undefined>();
  const [preSelectedSlot, setPreSelectedSlot] = useState<{ id: string; startHour: number; endHour: number } | undefined>();
  
  // Database hooks
  const { companies, loading: companiesLoading } = useCompanies();
  const { departments, loading: departmentsLoading } = useDepartments(selectedCompany);
  const { employees, loading: employeesLoading } = useEmployees(selectedCompany);
  const { shifts, loading: shiftsLoading } = useShifts(selectedCompany, getWeekStart(selectedWeek));

  // Set first company as default when companies load
  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0].id);
    }
  }, [companies, selectedCompany]);

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
    const targetDate = weekDates[dayIndex];
    const slot = SHIFT_SLOTS.find(s => s.id === slotId);
    
    if (!slot) return [];
    
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.start_time);
      const shiftHour = shiftDate.getHours();
      
      // Check if shift is on the same date and within the slot time range
      return (
        shiftDate.toDateString() === targetDate.toDateString() &&
        shiftHour >= slot.startHour &&
        (slot.endHour > slot.startHour ? shiftHour < slot.endHour : shiftHour >= slot.startHour || shiftHour < slot.endHour)
      );
    });
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
  };

  const handleAddShift = (dayIndex: number, slotId: string) => {
    const date = weekDates[dayIndex];
    const slot = SHIFT_SLOTS.find(s => s.id === slotId);
    setPreSelectedDate(date);
    setPreSelectedSlot(slot);
    setShowCreateShift(true);
  };

  const handleEditShift = (shift: Shift) => {
    setSelectedShift(shift);
    setShowEditShift(true);
  };

  const isLoading = companiesLoading || departmentsLoading || employeesLoading || shiftsLoading;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Management</h1>
          <p className="text-muted-foreground">
            Manage employee schedules and shift assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCreateCompany(true)}>
            <Building className="h-4 w-4 mr-2" />
            Add Company
          </Button>
          <Button variant="outline" onClick={() => setShowCreateEmployee(true)} disabled={!selectedCompany}>
            <Users className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
          <Button onClick={() => setShowCreateShift(true)} disabled={!selectedCompany}>
            <Plus className="h-4 w-4 mr-2" />
            Add Shift
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
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
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-2">
            {/* Header row */}
            <div className="font-medium text-sm text-muted-foreground p-2">
              Shift / Day
            </div>
            {days.map((day, index) => (
              <div key={day} className="font-medium text-sm text-center p-2 border rounded">
                <div>{day}</div>
                <div className="text-xs text-muted-foreground">
                  {weekDates[index].getDate()}
                </div>
              </div>
            ))}

            {/* Shift rows */}
            {SHIFT_SLOTS.map((slot) => (
              <div key={slot.id} className="contents">
                <div className="font-medium text-sm p-3 border rounded bg-muted/50">
                  <div>{slot.name}</div>
                  <div className="text-xs text-muted-foreground">{slot.time}</div>
                </div>
                {days.map((_, dayIndex) => {
                  const dayShifts = getShiftsForDayAndSlot(dayIndex, slot.id);
                  return (
                    <div key={dayIndex} className="min-h-[100px] border rounded p-2 space-y-1">
                      {dayShifts.map((shift) => {
                        const employeeName = getEmployeeName(shift.employee_id);
                        const startTime = new Date(shift.start_time);
                        const endTime = new Date(shift.end_time);
                        
                        return (
                          <div
                            key={shift.id}
                            className="group relative flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20"
                            onClick={() => handleEditShift(shift)}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {employeeName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">
                                {employeeName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {startTime.toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })} - {endTime.toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })}
                              </div>
                            </div>
                            <Badge 
                              variant={shift.status === 'confirmed' ? 'default' : 
                                      shift.status === 'scheduled' ? 'secondary' : 
                                      shift.status === 'pending' ? 'outline' : 'destructive'}
                              className="text-xs"
                            >
                              {shift.status}
                            </Badge>
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
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                      {dayShifts.length === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-full min-h-[60px] border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-primary hover:text-primary"
                          onClick={() => handleAddShift(dayIndex, slot.id)}
                          disabled={!selectedCompany}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-4">Loading employees...</div>
              ) : employees.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  {!selectedCompany ? 'Select a company to view employees' : 'No employees found'}
                </div>
              ) : (
                employees
                  .filter(employee => selectedDepartment === "all" || employee.department_id === selectedDepartment)
                  .map((employee) => {
                    const department = departments.find(d => d.id === employee.department_id);
                    return (
                      <div key={employee.id} className="flex items-center gap-3 p-2 rounded border">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {employee.first_name[0]}{employee.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{employee.first_name} {employee.last_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {employee.position}{department && ` • ${department.name}`}
                          </div>
                        </div>
                        <Badge 
                          variant={employee.status === 'active' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {employee.status}
                        </Badge>
                      </div>
                    );
                  })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Shifts</span>
                <span className="font-medium">{shifts.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Confirmed</span>
                <span className="font-medium text-green-600">
                  {shifts.filter(s => s.status === 'confirmed').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Scheduled</span>
                <span className="font-medium text-blue-600">
                  {shifts.filter(s => s.status === 'scheduled').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-medium text-yellow-600">
                  {shifts.filter(s => s.status === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Hours</span>
                <span className="font-medium">
                  {shifts.reduce((total, shift) => {
                    const start = new Date(shift.start_time);
                    const end = new Date(shift.end_time);
                    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    return total + hours;
                  }, 0).toFixed(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <CreateCompanyModal 
        open={showCreateCompany} 
        onOpenChange={setShowCreateCompany} 
      />
      
      <CreateShiftModal 
        open={showCreateShift} 
        onOpenChange={setShowCreateShift}
        companyId={selectedCompany}
        preSelectedDate={preSelectedDate}
        preSelectedSlot={preSelectedSlot}
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
    </div>
  );
}