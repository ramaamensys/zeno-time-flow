import { useState, useEffect } from "react";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Phone, Mail, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanies, useDepartments, useEmployees, Employee } from "@/hooks/useSchedulerDatabase";
import { useUserRole } from "@/hooks/useUserRole";
import CreateCompanyModal from "@/components/scheduler/CreateCompanyModal";
import AddEmployeeModal from "@/components/scheduler/AddEmployeeModal";
import EditEmployeeModal from "@/components/scheduler/EditEmployeeModal";

export default function SchedulerEmployees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // User role hook
  const { isCompanyManager, isSuperAdmin, isOrganizationManager } = useUserRole();

  // Database hooks
  const { companies, loading: companiesLoading } = useCompanies();
  const { departments, loading: departmentsLoading } = useDepartments(selectedCompany === "all" ? undefined : selectedCompany);
  
  // For "all" employees, we need to fetch without company filter
  // Pass "all" to signal we want all employees, undefined would skip fetching
  const { employees, loading: employeesLoading, deleteEmployee, updateEmployee } = useEmployees(selectedCompany === "all" ? "all" : selectedCompany);
  // Set default company - for managers, auto-select their first company
  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      if (isCompanyManager && companies.length === 1) {
        // Managers typically have access to only their company
        setSelectedCompany(companies[0].id);
      } else {
        setSelectedCompany("all");
      }
    }
  }, [companies, selectedCompany, isCompanyManager]);

  const filteredEmployees = employees.filter(employee => {
    const fullName = `${employee.first_name} ${employee.last_name}`;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === "all" || 
                             employee.department_id === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return 'No Department';
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Unknown Department';
  };

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
      try {
        await deleteEmployee(employeeId);
      } catch (error) {
        console.error('Failed to delete employee:', error);
      }
    }
  };

  // For managers, get the first company they have access to for adding employees
  const getCompanyIdForNewEmployee = () => {
    if (selectedCompany && selectedCompany !== "all") {
      return selectedCompany;
    }
    // If "all" is selected but manager has companies, use the first one
    if (companies.length > 0) {
      return companies[0].id;
    }
    return "";
  };

  const canAddEmployee = getCompanyIdForNewEmployee() !== "";
  const canAddCompany = isSuperAdmin || isOrganizationManager;

  const isLoading = companiesLoading || departmentsLoading || employeesLoading;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage your team members and their information
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canAddCompany && (
            <Button variant="outline" onClick={() => setShowCreateCompany(true)}>
              <Building className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          )}
          <Button onClick={() => setShowCreateEmployee(true)} disabled={!canAddEmployee}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {employees.filter(e => e.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Hourly Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.length > 0 && employees.some(e => e.hourly_rate) ? (
                `$${(employees
                  .filter(e => e.hourly_rate)
                  .reduce((sum, e) => sum + (e.hourly_rate || 0), 0) / 
                  employees.filter(e => e.hourly_rate).length
                ).toFixed(2)}`
              ) : (
                'N/A'
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employee Directory</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[250px]"
                />
              </div>
              
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Department" />
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No employees found matching your search' : 
                     'No employees found. Add some employees to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => {
                  const fullName = `${employee.first_name} ${employee.last_name}`;
                  return (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {employee.first_name[0]}{employee.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{fullName}</div>
                            <div className="text-sm text-muted-foreground">
                              {employee.hire_date ? 
                                `Joined ${new Date(employee.hire_date).toLocaleDateString()}` :
                                'No hire date'
                              }
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {employee.email}
                          </div>
                          {employee.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {employee.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getDepartmentName(employee.department_id)}</Badge>
                      </TableCell>
                      <TableCell>{employee.position || 'No position'}</TableCell>
                      <TableCell className="font-medium">
                        {employee.hourly_rate ? `$${employee.hourly_rate.toFixed(2)}` : 'Not set'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(employee.status)}>
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedEmployee(employee);
                              setShowEditEmployee(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Employee
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteEmployee(employee.id, fullName)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Employee
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateCompanyModal 
        open={showCreateCompany} 
        onOpenChange={setShowCreateCompany} 
      />
      
      <AddEmployeeModal 
        open={showCreateEmployee} 
        onOpenChange={setShowCreateEmployee}
        companyId={getCompanyIdForNewEmployee()}
        companyName={companies.find(c => c.id === getCompanyIdForNewEmployee())?.name || "Company"}
      />

      <EditEmployeeModal
        open={showEditEmployee}
        onOpenChange={setShowEditEmployee}
        employee={selectedEmployee}
        companyId={selectedCompany}
        onUpdate={updateEmployee}
        onDelete={deleteEmployee}
      />
    </div>
  );
}