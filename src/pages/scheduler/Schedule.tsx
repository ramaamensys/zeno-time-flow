import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Plus, Users, Clock, Building, Edit, Trash2, MoreHorizontal, Download, Printer } from "lucide-react";
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
  const [draggedEmployee, setDraggedEmployee] = useState<string | null>(null);
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Database hooks
  const { companies, loading: companiesLoading } = useCompanies();
  const { departments, loading: departmentsLoading } = useDepartments(selectedCompany);
  const { employees, loading: employeesLoading } = useEmployees(selectedCompany);
  const { shifts, loading: shiftsLoading, createShift, updateShift, deleteShift } = useShifts(selectedCompany, getWeekStart(selectedWeek));

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
      const date = weekDates[dayIndex];
      const slot = SHIFT_SLOTS.find(s => s.id === slotId);
      
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
    const companyName = companies.find(c => c.id === selectedCompany)?.name || 'Schedule';
    const weekRange = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    
    // Create CSV content
    let csvContent = `${companyName} - Weekly Schedule (${weekRange})\n\n`;
    csvContent += 'Day,Shift,Employee,Start Time,End Time,Break (min),Status\n';
    
    SHIFT_SLOTS.forEach(slot => {
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

  const isLoading = companiesLoading || departmentsLoading || shiftsLoading;

  return (
    <div className="space-y-6 p-6 print-schedule">
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
          <Button variant="outline" onClick={printSchedule} disabled={!selectedCompany}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={downloadSchedule} disabled={!selectedCompany}>
            <Download className="h-4 w-4 mr-2" />
            Download
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {employees.filter(e => e.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Week's Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Layout: Schedule Grid + Employee Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Schedule Grid - Takes 3/4 of the space */}
        <div className="xl:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Weekly Schedule</span>
                <div className="flex gap-2">
                  <Button 
                    variant={isEditMode ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setIsEditMode(!isEditMode)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {isEditMode ? "Exit Edit" : "Edit Schedule"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
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
                {SHIFT_SLOTS.map((slot) => (
                  <div key={slot.id} className="contents">
                    <div className="font-medium text-sm p-3 border rounded bg-muted/50 relative group">
                      <div>{slot.name}</div>
                      <div className="text-xs text-muted-foreground">{slot.time}</div>
                      {/* Slot edit button */}
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
                            Edit Slot Times
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Plus className="h-4 w-4 mr-2" />
                            Bulk Assign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {days.map((_, dayIndex) => {
                      const dayShifts = getShiftsForDayAndSlot(dayIndex, slot.id);
                      const isDropTarget = draggedEmployee !== null;
                      
                      return (
                        <div 
                          key={dayIndex} 
                          className={`min-h-[100px] border rounded p-2 space-y-1 transition-colors ${
                            isDropTarget ? 'border-primary/50 bg-primary/5' : ''
                          }`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, dayIndex, slot.id)}
                        >
                          {dayShifts.map((shift) => {
                            const employeeName = getEmployeeName(shift.employee_id);
                            const startTime = new Date(shift.start_time);
                            const endTime = new Date(shift.end_time);
                            
                            return (
                                <div
                                  key={shift.id}
                                  className="group relative flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/20 cursor-move hover:bg-primary/20"
                                  onClick={() => handleEditShift(shift)}
                                  draggable={isEditMode}
                                  onDragStart={(e) => handleDragStart(e, shift.employee_id, shift)}
                                  onDragEnd={handleDragEnd}
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
                                  </div>
                                  <Badge 
                                    variant={shift.status === 'confirmed' ? 'default' : 
                                            shift.status === 'scheduled' ? 'secondary' : 
                                            shift.status === 'pending' ? 'outline' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {shift.status}
                                  </Badge>
                                  {isEditMode && (
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
                          {dayShifts.length === 0 && (
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
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Available Employees */}
        <div className="xl:col-span-1 no-print">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5" />
                Employees
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Drag to schedule slots
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
                          className={`group flex flex-col gap-2 p-3 rounded border cursor-grab active:cursor-grabbing transition-all hover:shadow-sm ${
                            isDragging ? 'opacity-50 scale-95' : ''
                          } ${employee.status === 'active' ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, employee.id)}
                          onDragEnd={handleDragEnd}
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
                                <DropdownMenuItem>
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