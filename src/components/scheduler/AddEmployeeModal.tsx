import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployees, Employee } from "@/hooks/useSchedulerDatabase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Users } from "lucide-react";

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

export default function AddEmployeeModal({ 
  open, 
  onOpenChange, 
  companyId, 
  companyName 
}: AddEmployeeModalProps) {
  const { createEmployee, updateEmployee } = useEmployees();
  const [loading, setLoading] = useState(false);
  const [employeeType, setEmployeeType] = useState<"existing" | "new">("new");
  const [unassignedEmployees, setUnassignedEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: ""
  });

  // Fetch unassigned employees when modal opens or type changes
  useEffect(() => {
    if (open && employeeType === "existing") {
      fetchUnassignedEmployees();
    }
  }, [open, employeeType]);

  const fetchUnassignedEmployees = async () => {
    setLoadingUnassigned(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .is('company_id', null)
        .order('first_name', { ascending: true });

      if (error) throw error;
      setUnassignedEmployees(data || []);
    } catch (error) {
      console.error('Error fetching unassigned employees:', error);
      toast.error('Failed to load unassigned employees');
    } finally {
      setLoadingUnassigned(false);
    }
  };

  const handleAssignExisting = async () => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    setLoading(true);
    try {
      await updateEmployee(selectedEmployeeId, { company_id: companyId });
      toast.success("Employee assigned to company successfully!");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning employee:', error);
      toast.error("Failed to assign employee");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists in employees
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('email')
        .eq('email', formData.email)
        .single();

      if (existingEmployee) {
        toast.error("An employee with this email already exists");
        setLoading(false);
        return;
      }

      // First create the user account via edge function
      const { data: userData, error: userError } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email.trim(),
          full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          role: 'employee',
          password: formData.password,
          app_type: 'scheduler'
        }
      });

      if (userError) {
        console.error('Error creating user:', userError);
        toast.error("Failed to create user account");
        setLoading(false);
        return;
      }

      // Create employee record linked to the user
      const employeeData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        company_id: companyId,
        position: "Employee",
        status: "active" as const,
        hire_date: new Date().toISOString().split('T')[0],
        user_id: userData?.user?.id || null
      };

      await createEmployee(employeeData);

      toast.success(`Employee added to ${companyName} successfully! Welcome email sent.`);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error("Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: ""
    });
    setEmployeeType("new");
    setSelectedEmployeeId("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Employee - {companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Type Selection */}
          <RadioGroup 
            value={employeeType} 
            onValueChange={(value: "existing" | "new") => setEmployeeType(value)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" />
              <Label htmlFor="existing" className="flex items-center gap-2 cursor-pointer">
                <Users className="w-4 h-4" />
                Existing Employee
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="flex items-center gap-2 cursor-pointer">
                <UserPlus className="w-4 h-4" />
                New Employee
              </Label>
            </div>
          </RadioGroup>

          {/* Existing Employee Selection */}
          {employeeType === "existing" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="existingEmployee">Select Unassigned Employee</Label>
                {loadingUnassigned ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : unassignedEmployees.length > 0 ? (
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select an employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2 p-4 bg-muted rounded-md">
                    No unassigned employees available. Create a new employee instead.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignExisting} 
                  disabled={loading || !selectedEmployeeId || loadingUnassigned}
                >
                  {loading ? "Assigning..." : "Assign to Company"}
                </Button>
              </div>
            </div>
          )}

          {/* New Employee Form */}
          {employeeType === "new" && (
            <form onSubmit={handleCreateNew} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Enter first name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password (min 6 characters)"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Employee"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
