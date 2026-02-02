import { useState, useEffect } from "react";
import { Calendar, Clock, Users, Building, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, parseISO, isWithinInterval, isSameDay } from "date-fns";

interface Shift {
  id: string;
  employee_id: string;
  company_id: string;
  department_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  break_minutes: number | null;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  company?: {
    id: string;
    name: string;
    organization_id: string;
  };
  department?: {
    name: string;
  };
}

interface TimeClockEntry {
  id: string;
  employee_id: string;
  shift_id: string | null;
  clock_in: string | null;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_hours: number | null;
  notes: string | null;
  employee?: {
    first_name: string;
    last_name: string;
  };
}

interface Organization {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  organization_id: string;
}

type ViewMode = "daily" | "weekly" | "monthly";

export default function EmployeeSchedule() {
  const { user } = useAuth();
  const { role, isSuperAdmin, isOrganizationManager, isCompanyManager } = useUserRole();
  
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeClockEntries, setTimeClockEntries] = useState<TimeClockEntry[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedOrganization, setSelectedOrganization] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Check access - only managers and above can access
  const hasAccess = isSuperAdmin || isOrganizationManager || isCompanyManager;

  useEffect(() => {
    if (hasAccess) {
      loadFilters();
      loadData();
    }
  }, [user, role, hasAccess, selectedOrganization, selectedCompany, viewMode, currentDate]);

  const loadFilters = async () => {
    if (!user) return;

    try {
      // Load organizations based on role
      if (isSuperAdmin) {
        const { data } = await supabase.from('organizations').select('id, name').order('name');
        setOrganizations(data || []);
      } else if (isOrganizationManager) {
        const { data } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('organization_manager_id', user.id);
        setOrganizations(data || []);
      }

      // Load companies based on role and selected organization
      let companyQuery = supabase.from('companies').select('id, name, organization_id').order('name');
      
      if (isSuperAdmin) {
        if (selectedOrganization !== 'all') {
          companyQuery = companyQuery.eq('organization_id', selectedOrganization);
        }
      } else if (isOrganizationManager) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id')
          .eq('organization_manager_id', user.id);
        const orgIds = orgs?.map(o => o.id) || [];
        if (orgIds.length > 0) {
          companyQuery = companyQuery.in('organization_id', orgIds);
        }
      } else if (isCompanyManager) {
        companyQuery = companyQuery.eq('company_manager_id', user.id);
      }

      const { data: companiesData } = await companyQuery;
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const getDateRange = () => {
    switch (viewMode) {
      case 'daily':
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
      case 'weekly':
        return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  };

  const loadData = async () => {
    if (!user || !hasAccess) return;
    setLoading(true);

    try {
      const { start, end } = getDateRange();
      
      // Build shifts query with role-based filtering
      let shiftsQuery = supabase
        .from('shifts')
        .select(`
          *,
          employee:employees!shifts_employee_id_fkey(id, first_name, last_name, email),
          company:companies(id, name, organization_id),
          department:departments(name)
        `)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      // Apply role-based company filter
      if (isCompanyManager) {
        const { data: managerCompanies } = await supabase
          .from('companies')
          .select('id')
          .eq('company_manager_id', user.id);
        const companyIds = managerCompanies?.map(c => c.id) || [];
        if (companyIds.length > 0) {
          shiftsQuery = shiftsQuery.in('company_id', companyIds);
        }
      } else if (isOrganizationManager) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id')
          .eq('organization_manager_id', user.id);
        const orgIds = orgs?.map(o => o.id) || [];
        
        const { data: orgCompanies } = await supabase
          .from('companies')
          .select('id')
          .in('organization_id', orgIds);
        const companyIds = orgCompanies?.map(c => c.id) || [];
        if (companyIds.length > 0) {
          shiftsQuery = shiftsQuery.in('company_id', companyIds);
        }
      }

      // Apply UI filter selections
      if (selectedCompany !== 'all') {
        shiftsQuery = shiftsQuery.eq('company_id', selectedCompany);
      } else if (selectedOrganization !== 'all' && isSuperAdmin) {
        const { data: orgCompanies } = await supabase
          .from('companies')
          .select('id')
          .eq('organization_id', selectedOrganization);
        const companyIds = orgCompanies?.map(c => c.id) || [];
        if (companyIds.length > 0) {
          shiftsQuery = shiftsQuery.in('company_id', companyIds);
        }
      }

      const { data: shiftsData } = await shiftsQuery;
      setShifts(shiftsData || []);

      // Load time clock entries for the same period
      const shiftIds = (shiftsData || []).map(s => s.id).filter(Boolean);
      
      if (shiftIds.length > 0) {
        const { data: clockData } = await supabase
          .from('time_clock')
          .select(`
            *,
            employee:employees(first_name, last_name)
          `)
          .in('shift_id', shiftIds);
        setTimeClockEntries(clockData || []);
      } else {
        setTimeClockEntries([]);
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'daily':
        setCurrentDate(prev => addDays(prev, direction === 'next' ? 1 : -1));
        break;
      case 'weekly':
        setCurrentDate(prev => addWeeks(prev, direction === 'next' ? 1 : -1));
        break;
      case 'monthly':
        setCurrentDate(prev => addMonths(prev, direction === 'next' ? 1 : -1));
        break;
    }
  };

  const getAttendanceStatus = (shift: Shift): { status: string; color: string } => {
    const clockEntry = timeClockEntries.find(tc => tc.shift_id === shift.id);
    const now = new Date();
    const shiftStart = parseISO(shift.start_time);
    const shiftEnd = parseISO(shift.end_time);

    if (!clockEntry) {
      if (now < shiftStart) {
        return { status: 'Not Started', color: 'bg-gray-500' };
      }
      if (now > shiftEnd) {
        return { status: 'Absent', color: 'bg-red-500' };
      }
      return { status: 'Not Started', color: 'bg-gray-500' };
    }

    if (clockEntry.clock_in && clockEntry.clock_out) {
      return { status: 'Completed', color: 'bg-green-500' };
    }

    if (clockEntry.break_start && !clockEntry.break_end) {
      return { status: 'On Break', color: 'bg-yellow-500' };
    }

    if (clockEntry.clock_in) {
      const clockInTime = parseISO(clockEntry.clock_in);
      const lateThreshold = new Date(shiftStart.getTime() + 15 * 60 * 1000); // 15 min grace
      
      if (clockInTime > lateThreshold) {
        return { status: 'Late', color: 'bg-orange-500' };
      }
      return { status: 'Started', color: 'bg-blue-500' };
    }

    return { status: 'Not Started', color: 'bg-gray-500' };
  };

  const formatTimeRange = (start: string, end: string) => {
    return `${format(parseISO(start), 'h:mm a')} - ${format(parseISO(end), 'h:mm a')}`;
  };

  const getDateRangeLabel = () => {
    const { start, end } = getDateRange();
    switch (viewMode) {
      case 'daily':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'weekly':
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      case 'monthly':
        return format(currentDate, 'MMMM yyyy');
    }
  };

  // Group shifts by date for display
  const groupedShifts = shifts.reduce((acc, shift) => {
    const dateKey = format(parseISO(shift.start_time), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to view employee schedules.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Employee Schedule
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor employee schedules, shifts, and attendance
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            {/* Organization Filter - Only for Super Admin */}
            {isSuperAdmin && organizations.length > 0 && (
              <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                <SelectTrigger className="w-[200px]">
                  <Building className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Company Filter - Only show if more than one company available */}
            {companies.length > 1 && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[200px]">
                  <Building className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Show company name if only one company (company manager) */}
            {companies.length === 1 && (
              <Badge variant="secondary" className="px-3 py-1.5">
                <Building className="h-4 w-4 mr-2" />
                {companies[0].name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {getDateRangeLabel()}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>
      </div>

      {/* Schedule Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : shifts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Shifts Found</h3>
            <p className="text-muted-foreground">
              There are no scheduled shifts for this period.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedShifts).map(([dateKey, dayShifts]) => (
            <Card key={dateKey}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                  <Badge variant="secondary" className="ml-2">
                    {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dayShifts.map(shift => {
                    const clockEntry = timeClockEntries.find(tc => tc.shift_id === shift.id);
                    const attendance = getAttendanceStatus(shift);
                    
                    return (
                      <div 
                        key={shift.id} 
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors gap-4"
                      >
                        {/* Employee Info */}
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {shift.employee?.first_name?.[0]}{shift.employee?.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {shift.employee?.first_name} {shift.employee?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {shift.company?.name}
                              {shift.department?.name && ` • ${shift.department.name}`}
                            </p>
                          </div>
                        </div>

                        {/* Shift Time */}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {formatTimeRange(shift.start_time, shift.end_time)}
                          </span>
                        </div>

                        {/* Clock In/Out Times */}
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-20">Clock In:</span>
                            <span className={clockEntry?.clock_in ? "text-green-600" : "text-muted-foreground"}>
                              {clockEntry?.clock_in 
                                ? format(parseISO(clockEntry.clock_in), 'h:mm a')
                                : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-20">Clock Out:</span>
                            <span className={clockEntry?.clock_out ? "text-green-600" : "text-muted-foreground"}>
                              {clockEntry?.clock_out 
                                ? format(parseISO(clockEntry.clock_out), 'h:mm a')
                                : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Break Times */}
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-20">Break Start:</span>
                            <span className={clockEntry?.break_start ? "text-yellow-600" : "text-muted-foreground"}>
                              {clockEntry?.break_start 
                                ? format(parseISO(clockEntry.break_start), 'h:mm a')
                                : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-20">Break End:</span>
                            <span className={clockEntry?.break_end ? "text-yellow-600" : "text-muted-foreground"}>
                              {clockEntry?.break_end 
                                ? format(parseISO(clockEntry.break_end), 'h:mm a')
                                : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Total Hours & Status */}
                        <div className="flex items-center gap-3">
                          {clockEntry?.total_hours && (
                            <Badge variant="outline">
                              {clockEntry.total_hours.toFixed(2)} hrs
                            </Badge>
                          )}
                          <Badge className={`${attendance.color} text-white`}>
                            {attendance.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Statistics */}
      {!loading && shifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Period Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{shifts.length}</p>
                <p className="text-sm text-muted-foreground">Total Shifts</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {shifts.filter(s => getAttendanceStatus(s).status === 'Completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {shifts.filter(s => getAttendanceStatus(s).status === 'Started').length}
                </p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {shifts.filter(s => getAttendanceStatus(s).status === 'Late').length}
                </p>
                <p className="text-sm text-muted-foreground">Late</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {shifts.filter(s => getAttendanceStatus(s).status === 'Absent').length}
                </p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
