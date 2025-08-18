import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Plus, Users, Clock, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  
  // Sample data - will be replaced with actual Supabase queries
  const departments = [
    { id: "all", name: "All Departments" },
    { id: "kitchen", name: "Kitchen" },
    { id: "service", name: "Service" },
    { id: "management", name: "Management" }
  ];

  const employees = [
    { id: 1, name: "John Doe", department: "kitchen", avatar: null },
    { id: 2, name: "Jane Smith", department: "service", avatar: null },
    { id: 3, name: "Mike Johnson", department: "kitchen", avatar: null }
  ];

  const shifts = [
    { 
      id: 1, 
      employee_id: 1, 
      employee_name: "John Doe",
      day: 0, // Monday
      slot: "morning",
      status: "confirmed"
    },
    { 
      id: 2, 
      employee_id: 2, 
      employee_name: "Jane Smith",
      day: 0, // Monday  
      slot: "afternoon",
      status: "pending"
    }
  ];

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
    return shifts.filter(shift => shift.day === dayIndex && shift.slot === slotId);
  };

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
          <Button variant="outline">
            <LayoutTemplate className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button>
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
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
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
                      {dayShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/20"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {shift.employee_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="text-xs font-medium truncate">
                              {shift.employee_name}
                            </div>
                          </div>
                          <Badge 
                            variant={shift.status === 'confirmed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {shift.status}
                          </Badge>
                        </div>
                      ))}
                      {dayShifts.length === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-full min-h-[60px] border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-primary hover:text-primary"
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
              {employees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-3 p-2 rounded border">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{employee.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{employee.department}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Available
                  </Badge>
                </div>
              ))}
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
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-medium text-yellow-600">
                  {shifts.filter(s => s.status === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Coverage</span>
                <span className="font-medium">75%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}