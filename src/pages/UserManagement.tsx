import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Plus, Edit, Trash2, Search, Filter, Mail, Building } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  status: string;
  role: string;
  manager_id?: string;
  manager_name?: string;
  field_type?: 'IT' | 'Non-IT';
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "user" as "user" | "admin" | "super_admin" | "operations_manager" | "manager",
    field_type: "IT" as "IT" | "Non-IT",
    manager_id: "none"
  });
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [operationsManagers, setOperationsManagers] = useState<UserProfile[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignCompanyDialogOpen, setIsAssignCompanyDialogOpen] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedUserForAssignment, setSelectedUserForAssignment] = useState<UserProfile | null>(null);
  
  // Multi-user assignment states
  const [selectedUsersForAssignment, setSelectedUsersForAssignment] = useState<string[]>([]);
  const [availableUsersForAssignment, setAvailableUsersForAssignment] = useState<UserProfile[]>([]);
  
  const [assignmentData, setAssignmentData] = useState({
    company_id: "",
    role: "operations_manager" as "operations_manager" | "admin" | "employee"
  });

  useEffect(() => {
    if (isAssignCompanyDialogOpen) {
      loadAvailableUsers();
    }
  }, [isAssignCompanyDialogOpen, users, companies]);

  const loadAvailableUsers = async () => {
    try {
      // Get all users who are already assigned to companies
      const assignedUserIds = new Set();
      
      // Add operations managers and company managers from companies
      companies.forEach(company => {
        if (company.operations_manager_id) {
          assignedUserIds.add(company.operations_manager_id);
        }
        if (company.company_manager_id) {
          assignedUserIds.add(company.company_manager_id);
        }
      });

      // Filter users to show only unassigned ones
      const availableUsers = users.filter(userProfile => {
        // Exclude current user (super admin doing the assignment)
        if (userProfile.user_id === user?.id) {
          return false;
        }
        
        // Exclude users who are already assigned to companies
        if (assignedUserIds.has(userProfile.user_id)) {
          return false;
        }
        
        // Only show active users
        if (userProfile.status !== 'active') {
          return false;
        }
        
        // Show users and admins (potential candidates for assignment)
        return ['user', 'admin'].includes(userProfile.role);
      });

      setAvailableUsersForAssignment(availableUsers);
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  };
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  const { toast } = useToast();

  useEffect(() => {
    checkAuthorizationAndLoadUsers();
    loadCompanies();
  }, [user]);

  const checkAuthorizationAndLoadUsers = async () => {
    if (!user) return;

    try {
      // Check if user is super admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isSuperAdmin = roles?.some(r => r.role === 'super_admin') || false;
      const isRamaAdmin = user.email === 'rama.k@amensys.com';
      
      if (isSuperAdmin || isRamaAdmin) {
        setIsAuthorized(true);
        setCurrentUserRole('super_admin');
        await loadUsers();
        await loadManagers();
        await loadOperationsManagers();
      } else {
        setIsAuthorized(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Get all profiles including manager information
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          manager:manager_id (
            user_id,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Then get roles for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          // Determine highest priority role
          let highestRole = 'user';
          if (rolesData && rolesData.length > 0) {
            const roles = rolesData.map(r => r.role);
            if (roles.includes('super_admin')) {
              highestRole = 'super_admin';
            } else if (roles.includes('operations_manager')) {
              highestRole = 'operations_manager';
            } else if (roles.includes('manager')) {
              highestRole = 'manager';
            } else if (roles.includes('admin')) {
              highestRole = 'admin';
            } else if (roles.includes('user')) {
              highestRole = 'user';
            }
          }

          return {
            ...profile,
            role: highestRole,
            manager_name: profile.manager?.full_name || null
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      // Get all users with admin role (potential managers)
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', adminRoles.map(r => r.user_id))
          .eq('status', 'active');

        if (adminProfiles) {
          setManagers(adminProfiles.map(profile => ({
            ...profile,
            role: 'admin'
          })));
        }
      }
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const loadOperationsManagers = async () => {
    try {
      // Get all users with operations_manager role
      const { data: opsManagerRoles } = await supabase
        .from('user_roles')
        .select('user_id, app_type')
        .eq('role', 'operations_manager');

      if (opsManagerRoles && opsManagerRoles.length > 0) {
        const { data: opsManagerProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', opsManagerRoles.map(r => r.user_id))
          .eq('status', 'active');

        if (opsManagerProfiles) {
          // Map profiles with their app_type (field_type)
          const profilesWithFieldType = opsManagerProfiles.map(profile => {
            const roleData = opsManagerRoles.find(r => r.user_id === profile.user_id);
            const fieldType = roleData?.app_type === 'calendar' ? 'IT' : 'Non-IT';
            return {
              ...profile,
              role: 'operations_manager',
              field_type: fieldType as 'IT' | 'Non-IT'
            };
          });
          setOperationsManagers(profilesWithFieldType);
        }
      }
    } catch (error) {
      console.error('Error loading operations managers:', error);
    }
  };

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin' | 'super_admin' | 'operations_manager' | 'manager') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      await loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Call the create-user edge function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          password: newUser.password,
          app_type: newUser.field_type === "IT" ? "calendar" : "scheduler",
          manager_id: newUser.manager_id && newUser.manager_id !== "none" ? newUser.manager_id : null
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('User creation response:', data);

      toast({
        title: "Success",
        description: "User created successfully. Welcome email will be sent shortly.",
      });

      // Clear the form and close dialog
      setNewUser({ email: "", full_name: "", role: "user", password: "", field_type: "IT", manager_id: "none" });
      setIsDialogOpen(false);
      
      // Reload users to show the new user
      await loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const editUser = async () => {
    if (!editingUser) return;

    try {
      // Determine final manager_id
      let finalManagerId = editingUser.manager_id === "none" ? null : editingUser.manager_id;
      
      // If editing an admin, set super admin as their manager
      if (editingUser.role === 'admin') {
        const { data: superAdminData, error: superAdminError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'super_admin')
          .limit(1)
          .single();
          
        if (superAdminData && !superAdminError) {
          finalManagerId = superAdminData.user_id;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editingUser.full_name,
          email: editingUser.email,
          manager_id: finalManagerId
        })
        .eq('user_id', editingUser.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setIsEditDialogOpen(false);
      setEditingUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This will mark the user as deleted.`)) {
      return;
    }

    try {
      console.log('Deleting user:', userId, userEmail);
      
      // Mark user as deleted in profiles table
      const { error, data } = await supabase
        .from('profiles')
        .update({ status: 'deleted' })
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Deletion error:', error);
        throw error;
      }

      console.log('Deletion successful, updated records:', data);

      // Force reload users data from server
      setUsers([]);
      await loadUsers();

      toast({
        title: "Success", 
        description: "User marked as deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const reinviteUser = async (userEmail: string, userFullName: string, userRole: string) => {
    try {
      // Generate a temporary password for reinvitation
      const tempPassword = Math.random().toString(36).slice(-12);
      
      // Send reinvite email
      const { error } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: userEmail,
          full_name: userFullName,
          role: userRole,
          password: tempPassword,
          isReinvite: true
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Reinvitation email sent to ${userEmail}`,
      });
    } catch (error: any) {
      console.error('Error sending reinvitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reinvitation email",
        variant: "destructive",
      });
    }
  };

  const assignUsersToCompany = async () => {
    if (selectedUsersForAssignment.length === 0 || !assignmentData.company_id) {
      toast({
        title: "Error",
        description: "Please select at least one user and a company",
        variant: "destructive",
      });
      return;
    }

    try {
      // Process each selected user
      for (const userId of selectedUsersForAssignment) {
        // For operations_manager role, update the company
        if (assignmentData.role === "operations_manager") {
          const { error: companyError } = await supabase
            .from('companies')
            .update({ operations_manager_id: userId })
            .eq('id', assignmentData.company_id);

          if (companyError) throw companyError;
        } else if (assignmentData.role === "admin") {
          // For admin role (company manager), update the company
          const { error: companyError } = await supabase
            .from('companies')
            .update({ company_manager_id: userId })
            .eq('id', assignmentData.company_id);

          if (companyError) throw companyError;
        } else if (assignmentData.role === "employee") {
          // For employee role, create employee record
          // First get the user profile data
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', userId)
            .single();

          if (profileError) throw profileError;

          if (userProfile) {
            const { error: employeeError } = await supabase
              .from('employees')
              .insert({
                user_id: userId,
                first_name: userProfile.full_name?.split(' ')[0] || '',
                last_name: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
                email: userProfile.email || '',
                company_id: assignmentData.company_id,
                status: 'active'
              });

            if (employeeError) throw employeeError;
          }
        }

        // Update user role - for employee, we keep them as 'user' role but with scheduler app_type
        let finalRole: "user" | "admin" | "super_admin" | "operations_manager" | "manager" = "user";
        
        if (assignmentData.role === "operations_manager") {
          finalRole = "operations_manager";
        } else if (assignmentData.role === "admin") {
          finalRole = "manager"; // Company managers get the manager role
        } else if (assignmentData.role === "employee") {
          finalRole = "user"; // Employees are users with scheduler access
        }
        
        // First, delete any existing scheduler role for this user
        const { error: deleteRoleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('app_type', 'scheduler');

        if (deleteRoleError) throw deleteRoleError;

        // Then insert the new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: finalRole,
            app_type: 'scheduler'
          });

        if (roleError) throw roleError;
      }

      const userCount = selectedUsersForAssignment.length;
      toast({
        title: "Success",
        description: `${userCount} user${userCount > 1 ? 's' : ''} assigned to company as ${assignmentData.role.replace('_', ' ')} successfully`,
      });

      setIsAssignCompanyDialogOpen(false);
      setSelectedUserForAssignment(null);
      setSelectedUsersForAssignment([]);
      setAssignmentData({ company_id: "", role: "operations_manager" });
      await loadUsers();
    } catch (error: any) {
      console.error('Error assigning users to company:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign users to company",
        variant: "destructive",
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    console.log('Toggling user selection for:', userId);
    console.log('Current selected users:', selectedUsersForAssignment);
    
    setSelectedUsersForAssignment(prev => {
      const newSelection = prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      console.log('New selection:', newSelection);
      return newSelection;
    });
  };

  const selectAllUsers = () => {
    const availableUserIds = availableUsersForAssignment.map(user => user.user_id);
    setSelectedUsersForAssignment(availableUserIds);
  };

  const clearUserSelection = () => {
    setSelectedUsersForAssignment([]);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'deleted':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'operations_manager':
        return 'default';
      case 'manager':
        return 'default';
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // Filter users based on search term, role, and status
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesStatus = selectedStatus === "all" || user.status === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Users className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only super administrators can access user management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage users and their roles in the system.
        </p>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Filter */}
            <div className="flex-1">
              <Label htmlFor="search" className="text-sm font-medium">
                Search Users
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className="w-full sm:w-48">
              <Label htmlFor="role-filter" className="text-sm font-medium">
                Filter by Role
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="operations_manager">Operations Manager</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-48">
              <Label htmlFor="status-filter" className="text-sm font-medium">
                Filter by Status
              </Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({filteredUsers.length} of {users.length})
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account and assign a role.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="col-span-3"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="full_name" className="text-right">
                      Full Name
                    </Label>
                    <Input
                      id="full_name"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      className="col-span-3"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="col-span-3"
                      placeholder="Temporary password"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
                    <Select value={newUser.role} onValueChange={(value: "user" | "admin" | "super_admin" | "operations_manager" | "manager") => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          {currentUserRole === 'super_admin' && <SelectItem value="manager">Manager</SelectItem>}
                          {currentUserRole === 'super_admin' && <SelectItem value="operations_manager">Operations Manager</SelectItem>}
                          {currentUserRole === 'super_admin' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="field_type" className="text-right">
                      Field
                    </Label>
                    <Select value={newUser.field_type} onValueChange={(value: "IT" | "Non-IT") => setNewUser({ ...newUser, field_type: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="Non-IT">Non-IT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newUser.role === "manager" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="operations_manager" className="text-right">
                        Operations Manager
                      </Label>
                      <Select 
                        value={newUser.manager_id} 
                        onValueChange={(value) => setNewUser({ ...newUser, manager_id: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select operations manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Manager</SelectItem>
                          {operationsManagers
                            .filter(manager => manager.field_type === newUser.field_type)
                            .map((manager) => (
                            <SelectItem key={manager.user_id} value={manager.user_id}>
                              {manager.full_name} ({manager.field_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={createUser}
                    disabled={isCreating}
                  >
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAssignCompanyDialogOpen} onOpenChange={setIsAssignCompanyDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Building className="h-4 w-4 mr-2" />
                  Assign to Company
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Assign User to Company</DialogTitle>
                  <DialogDescription>
                    Select a user and assign them to a company with a specific role.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Available Users ({selectedUsersForAssignment.length} selected)
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={selectAllUsers}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearUserSelection}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {availableUsersForAssignment.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No available users to assign. All users are either already assigned to companies or don't have the required permissions.
                        </div>
                      ) : (
                        availableUsersForAssignment.map((user) => (
                            <div
                              key={user.user_id}
                              className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                            >
                              <label className="flex items-center gap-3 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={selectedUsersForAssignment.includes(user.user_id)}
                                  onChange={(e) => {
                                    console.log('Checkbox changed for:', user.user_id, e.target.checked);
                                    toggleUserSelection(user.user_id);
                                  }}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{user.full_name}</div>
                                  <div className="text-xs text-muted-foreground">{user.email}</div>
                                </div>
                                <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                                  {user.role === 'admin' ? 'Admin (Unassigned)' : user.role.replace('_', ' ')}
                                </Badge>
                              </label>
                            </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="company_select" className="text-right">
                      Company
                    </Label>
                    <Select 
                      value={assignmentData.company_id} 
                      onValueChange={(value) => setAssignmentData({ ...assignmentData, company_id: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name} ({company.field_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assignment_role" className="text-right">
                      Role
                    </Label>
                    <Select 
                      value={assignmentData.role} 
                      onValueChange={(value: "operations_manager" | "admin" | "employee") => setAssignmentData({ ...assignmentData, role: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operations_manager">Operations Manager</SelectItem>
                        <SelectItem value="admin">Company Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={assignUsersToCompany}
                    disabled={selectedUsersForAssignment.length === 0 || !assignmentData.company_id}
                  >
                    Assign {selectedUsersForAssignment.length} User{selectedUsersForAssignment.length !== 1 ? 's' : ''} to Company
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found matching the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((userProfile) => (
                <TableRow key={userProfile.id}>
                  <TableCell className="font-medium">
                    {userProfile.full_name || 'No name'}
                  </TableCell>
                  <TableCell>{userProfile.email}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(userProfile.status)}>
                      {userProfile.status.charAt(0).toUpperCase() + userProfile.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(userProfile.role)}>
                      {userProfile.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {userProfile.manager_name ? (
                      <span className="text-sm">{userProfile.manager_name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No manager</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(userProfile.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}