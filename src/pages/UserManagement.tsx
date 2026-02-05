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
import { Loader2, Users, Plus, Edit, Trash2, Search, Filter, Mail, Building, Building2 } from "lucide-react";

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
  organization_id?: string;
  company_id?: string;
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
    role: "employee" as "employee" | "house_keeping" | "maintenance" | "manager" | "operations_manager" | "super_admin",
    manager_id: "none",
    organization_id: "",
    company_id: ""
  });
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [operationsManagers, setOperationsManagers] = useState<UserProfile[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignCompanyDialogOpen, setIsAssignCompanyDialogOpen] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedUserForAssignment, setSelectedUserForAssignment] = useState<UserProfile | null>(null);
  
  // Multi-user assignment states
  const [selectedUsersForAssignment, setSelectedUsersForAssignment] = useState<string[]>([]);
  const [availableUsersForAssignment, setAvailableUsersForAssignment] = useState<UserProfile[]>([]);
  
  const [assignmentData, setAssignmentData] = useState({
    organization_id: "",
    company_id: "",
    role: "employee" as "employee" | "house_keeping" | "maintenance" | "manager" | "operations_manager" | "super_admin"
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

      // Add employees from employees table
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('user_id')
        .eq('status', 'active');

      if (employeesError) throw employeesError;

      employees?.forEach(employee => {
        if (employee.user_id) {
          assignedUserIds.add(employee.user_id);
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
    loadOrganizations();

    // Set up real-time subscriptions for auto-updates
    const profilesSubscription = supabase
      .channel('user_management_profiles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles'
      }, () => {
        loadUsers();
      })
      .subscribe();

    const rolesSubscription = supabase
      .channel('user_management_roles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_roles'
      }, () => {
        loadUsers();
        loadManagers();
        loadOperationsManagers();
      })
      .subscribe();

    const employeesSubscription = supabase
      .channel('user_management_employees')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'employees'
      }, () => {
        loadUsers();
      })
      .subscribe();

    return () => {
      profilesSubscription.unsubscribe();
      rolesSubscription.unsubscribe();
      employeesSubscription.unsubscribe();
    };
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
      // Get all profiles EXCEPT deleted ones
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          manager:manager_id (
            user_id,
            full_name
          )
        `)
        .neq('status', 'deleted') // Filter out deleted users
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Load all employee records (including those created by org managers/managers)
      const { data: employeeRows, error: employeesError } = await supabase
        .from('employees')
        .select('id, user_id, email, first_name, last_name, status, created_at')
        .eq('status', 'active');

      if (employeesError) throw employeesError;

      const employeeUserIds = new Set(
        (employeeRows ?? []).map((e) => e.user_id).filter(Boolean) as string[]
      );
      const employeeEmails = new Set(
        (employeeRows ?? [])
          .map((e) => e.email?.toLowerCase())
          .filter(Boolean) as string[]
      );

      // Create a map of employees by email for quick lookup
      const employeesByEmail = new Map(
        (employeeRows ?? []).map((e) => [e.email?.toLowerCase(), e])
      );

      // Then get roles for each profile
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          const isEmployee =
            employeeUserIds.has(profile.user_id) ||
            employeeEmails.has(profile.email?.toLowerCase());

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
            } else if (roles.includes('employee') || isEmployee) {
              highestRole = 'employee';
            } else if (roles.includes('user')) {
              highestRole = 'user';
            }
          } else if (isEmployee) {
            // If user_roles rows are missing, still treat linked employees as employees
            highestRole = 'employee';
          }

          return {
            ...profile,
            role: highestRole,
            manager_name: profile.manager?.full_name || null
          };
        })
      );

      // Find employees that don't have profiles yet (created by org managers/managers without auth accounts)
      const profileEmails = new Set(
        profiles.map(p => p.email?.toLowerCase()).filter(Boolean)
      );
      const profileUserIds = new Set(
        profiles.map(p => p.user_id).filter(Boolean)
      );

      const employeesWithoutProfiles = (employeeRows ?? []).filter(emp => {
        // Skip if employee already has a matching profile by user_id or email
        if (emp.user_id && profileUserIds.has(emp.user_id)) return false;
        if (emp.email && profileEmails.has(emp.email.toLowerCase())) return false;
        return true;
      });

      // Create virtual profile entries for employees without profiles
      const virtualProfiles = employeesWithoutProfiles.map(emp => ({
        id: emp.id,
        user_id: emp.user_id || emp.id, // Use employee id as fallback
        full_name: `${emp.first_name} ${emp.last_name}`.trim(),
        email: emp.email,
        created_at: emp.created_at,
        status: 'active',
        role: 'employee',
        manager_name: null,
        manager_id: null
      }));

      // Combine profiles with virtual profiles
      const allUsers = [...usersWithRoles, ...virtualProfiles];

      setUsers(allUsers);
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

  const loadOrganizations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'employee' | 'manager' | 'operations_manager' | 'super_admin') => {
    try {
      // First check if user already has a role entry
      const { data: existingRoles, error: checkError } = await supabase
        .from('user_roles')
        .select('id, role')
        .eq('user_id', userId);

      if (checkError) throw checkError;

      if (existingRoles && existingRoles.length > 0) {
        // Update existing role
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        // Insert new role if none exists
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: newRole,
            app_type: 'scheduler'
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      await loadUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
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
      // First check if user already exists (including deleted ones)
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('user_id, status')
        .eq('email', newUser.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw checkError;
      }

      if (existingProfile) {
        if (existingProfile.status === 'deleted') {
          // Reactivate the deleted user instead of creating duplicate
          const { error: reactivateError } = await supabase
            .from('profiles')
            .update({ 
              status: 'active',
              full_name: newUser.full_name,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', existingProfile.user_id);

          if (reactivateError) throw reactivateError;

          // Add the new role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: existingProfile.user_id,
              role: newUser.role,
              app_type: 'scheduler'
            });

          if (roleError) throw roleError;

          toast({
            title: "Success",
            description: "User reactivated successfully",
          });
        } else {
          // User already exists and is active
          toast({
            title: "Error",
            description: "User with this email already exists",
            variant: "destructive",
          });
          setIsCreating(false);
          return;
        }
      } else {
        // Create completely new user
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: newUser.email,
            full_name: newUser.full_name,
            role: newUser.role,
            password: newUser.password,
            app_type: 'scheduler',
            manager_id: newUser.manager_id && newUser.manager_id !== "none" ? newUser.manager_id : null
          }
        });

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }

        console.log('User creation response:', data);

        // Handle role-specific assignments
        if (data?.user?.id) {
          // For Organization Manager - assign to organization
          if (newUser.role === 'operations_manager' && newUser.organization_id) {
            const { error: orgError } = await supabase
              .from('organizations')
              .update({ organization_manager_id: data.user.id })
              .eq('id', newUser.organization_id);

            if (orgError) {
              console.error('Error assigning organization manager:', orgError);
              toast({
                title: "Warning",
                description: "User created but failed to assign to organization. Please assign manually.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Success",
                description: "User created and assigned as Organization Manager.",
              });
            }
          }
          // For Company Manager - assign to company
          else if (newUser.role === 'manager' && newUser.company_id) {
            const { error: companyError } = await supabase
              .from('companies')
              .update({ company_manager_id: data.user.id })
              .eq('id', newUser.company_id);

            if (companyError) {
              console.error('Error assigning company manager:', companyError);
              toast({
                title: "Warning",
                description: "User created but failed to assign to company. Please assign manually.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Success",
                description: "User created and assigned as Company Manager.",
              });
            }
          }
          // For Employee-type roles - create employee record
          else if ((newUser.role === 'employee' || newUser.role === 'house_keeping' || newUser.role === 'maintenance') && newUser.company_id) {
            const nameParts = newUser.full_name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Auto-assign team based on role
            let teamId: string | null = null;
            if (newUser.role === 'house_keeping' || newUser.role === 'maintenance') {
              const teamName = newUser.role === 'house_keeping' ? 'House Keeping' : 'Maintenance';
              const { data: team } = await supabase
                .from('schedule_teams')
                .select('id')
                .eq('company_id', newUser.company_id)
                .eq('name', teamName)
                .single();
              
              if (team) {
                teamId = team.id;
              } else {
                // Create the team if it doesn't exist
                const { data: newTeam } = await supabase
                  .from('schedule_teams')
                  .insert({
                    company_id: newUser.company_id,
                    name: teamName,
                    color: newUser.role === 'house_keeping' ? '#3B82F6' : '#EF4444'
                  })
                  .select('id')
                  .single();
                
                if (newTeam) {
                  teamId = newTeam.id;
                }
              }
            }
            
            const { error: employeeError } = await supabase
              .from('employees')
              .insert({
                user_id: data.user.id,
                email: newUser.email,
                first_name: firstName,
                last_name: lastName,
                company_id: newUser.company_id,
                team_id: teamId,
                status: 'active',
                hire_date: new Date().toISOString().split('T')[0]
              });

            if (employeeError) {
              console.error('Error creating employee record:', employeeError);
              toast({
                title: "Warning",
                description: "User created but failed to add to company. Please assign manually.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Success",
                description: "User created and added to company successfully.",
              });
            }
          } else {
            toast({
              title: "Success",
              description: "User created successfully. Welcome email will be sent shortly.",
            });
          }
        } else {
          toast({
            title: "Success",
            description: "User created successfully. Welcome email will be sent shortly.",
          });
        }
      }

      // Clear the form and close dialog
      setNewUser({ email: "", full_name: "", role: "employee", password: "", manager_id: "none", organization_id: "", company_id: "" });
      setIsDialogOpen(false);
      
      // Reload users to show the updated user list
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
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editingUser.full_name,
          email: editingUser.email
        })
        .eq('user_id', editingUser.user_id);

      if (error) throw error;

      // Update user role
      await updateUserRole(editingUser.user_id, editingUser.role as any);

      // Handle role-specific assignments
      // For Organization Manager - update organization assignment
      if (editingUser.role === 'operations_manager' && editingUser.organization_id) {
        // First, remove from any previously assigned organization
        await supabase
          .from('organizations')
          .update({ organization_manager_id: null })
          .eq('organization_manager_id', editingUser.user_id);
        
        // Then assign to new organization
        const { error: orgError } = await supabase
          .from('organizations')
          .update({ organization_manager_id: editingUser.user_id })
          .eq('id', editingUser.organization_id);

        if (orgError) {
          console.error('Error assigning organization manager:', orgError);
        }
      }
      
      // For Company Manager - update company assignment
      if (editingUser.role === 'manager' && editingUser.company_id) {
        // First, remove from any previously assigned company
        await supabase
          .from('companies')
          .update({ company_manager_id: null })
          .eq('company_manager_id', editingUser.user_id);
        
        // Then assign to new company
        const { error: companyError } = await supabase
          .from('companies')
          .update({ company_manager_id: editingUser.user_id })
          .eq('id', editingUser.company_id);

        if (companyError) {
          console.error('Error assigning company manager:', companyError);
        }
      }
      
      // Handle employee-type role company assignment (employee, house_keeping, maintenance)
      if ((editingUser.role === 'employee' || editingUser.role === 'house_keeping' || editingUser.role === 'maintenance') && editingUser.company_id) {
        // Auto-assign team based on role
        let teamId: string | null = null;
        if (editingUser.role === 'house_keeping' || editingUser.role === 'maintenance') {
          const teamName = editingUser.role === 'house_keeping' ? 'House Keeping' : 'Maintenance';
          const { data: team } = await supabase
            .from('schedule_teams')
            .select('id')
            .eq('company_id', editingUser.company_id)
            .eq('name', teamName)
            .single();
          
          if (team) {
            teamId = team.id;
          } else {
            // Create the team if it doesn't exist
            const { data: newTeam } = await supabase
              .from('schedule_teams')
              .insert({
                company_id: editingUser.company_id,
                name: teamName,
                color: editingUser.role === 'house_keeping' ? '#3B82F6' : '#EF4444'
              })
              .select('id')
              .single();
            
            if (newTeam) {
              teamId = newTeam.id;
            }
          }
        }
        
        // Check if employee record already exists
        const { data: existingEmployee } = await supabase
          .from('employees')
          .select('id, company_id')
          .or(`user_id.eq.${editingUser.user_id},email.eq.${editingUser.email}`)
          .single();

        if (existingEmployee) {
          // Update existing employee record with team assignment
          const { error: updateError } = await supabase
            .from('employees')
            .update({ 
              company_id: editingUser.company_id,
              team_id: teamId
            })
            .eq('id', existingEmployee.id);
          
          if (updateError) {
            console.error('Error updating employee company:', updateError);
          }
        } else {
          // Create new employee record
          const nameParts = editingUser.full_name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const { error: insertError } = await supabase
            .from('employees')
            .insert({
              user_id: editingUser.user_id,
              email: editingUser.email,
              first_name: firstName,
              last_name: lastName,
              company_id: editingUser.company_id,
              team_id: teamId,
              status: 'active',
              hire_date: new Date().toISOString().split('T')[0]
            });

          if (insertError) {
            console.error('Error creating employee record:', insertError);
          }
        }
      }

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
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This will completely remove them from the system and all company assignments.`)) {
      return;
    }

    try {
      console.log('Deleting user:', userId, userEmail);
      
      // 1. Clean up organization assignments - remove from operations_manager_id and organization_manager_id
      const { error: orgCleanupError } = await supabase
        .from('organizations')
        .update({ 
          operations_manager_id: null,
          organization_manager_id: null 
        })
        .or(`operations_manager_id.eq.${userId},organization_manager_id.eq.${userId}`);

      if (orgCleanupError) {
        console.error('Organization cleanup error:', orgCleanupError);
      }

      // 2. Clean up company assignments - remove from operations_manager_id and company_manager_id
      const { error: companyCleanupError } = await supabase
        .from('companies')
        .update({ 
          operations_manager_id: null,
          company_manager_id: null 
        })
        .or(`operations_manager_id.eq.${userId},company_manager_id.eq.${userId}`);

      if (companyCleanupError) {
        console.error('Company cleanup error:', companyCleanupError);
      }

      // 3. Delete employee records by user_id
      const { error: employeeError } = await supabase
        .from('employees')
        .delete()
        .eq('user_id', userId);

      if (employeeError) console.log('No employee record to clean up by user_id:', employeeError);

      // 3b. Also try to delete by email (for virtual employees without user_id)
      if (userEmail) {
        const { error: employeeEmailError } = await supabase
          .from('employees')
          .delete()
          .eq('email', userEmail);

        if (employeeEmailError) console.log('No employee record to clean up by email:', employeeEmailError);
      }

      // 4. Delete user roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error deleting user roles:', rolesError);
        // Continue with deletion even if roles cleanup fails
      }

      // 5. Delete calendar events
      const { error: eventsError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', userId);

      if (eventsError) console.log('No calendar events to clean up');

      // 6. Delete other user-related data
      const { error: habitsError } = await supabase
        .from('habits')
        .delete()
        .eq('user_id', userId);

      if (habitsError) console.log('No habits to clean up');

      const { error: focusError } = await supabase
        .from('focus_sessions')
        .delete()
        .eq('user_id', userId);

      if (focusError) console.log('No focus sessions to clean up');

      // 7. Finally mark profile as deleted (this maintains the record but marks it inactive)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ status: 'deleted' })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error marking profile as deleted:', profileError);
        throw profileError;
      }

      console.log('User deletion successful - all references cleaned up');

      // Force reload users data from server
      setUsers([]);
      await loadUsers();

      toast({
        title: "Success", 
        description: "User completely removed from system and all company assignments",
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
      // First get the company details to determine app_type based on field_type
      const { data: companyData, error: companyFetchError } = await supabase
        .from('companies')
        .select('field_type')
        .eq('id', assignmentData.company_id)
        .single();

      if (companyFetchError) throw companyFetchError;

      const appType = companyData.field_type === 'IT' ? 'calendar' : 'scheduler';

      // Process each selected user
      for (const userId of selectedUsersForAssignment) {
        // For operations_manager role, update the organization
        if (assignmentData.role === "operations_manager") {
          const { error: companyError } = await supabase
            .from('companies')
            .update({ operations_manager_id: userId })
            .eq('id', assignmentData.company_id);

          if (companyError) throw companyError;
        } else if (assignmentData.role === "manager") {
          // For manager role (company manager), update the company
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
        } else if (assignmentData.role === "super_admin") {
          // Super admin role - just add the role, no company assignment needed
        }

        // Update user role based on assignment and company type
        let finalRole: "user" | "admin" | "super_admin" | "operations_manager" | "manager" | "employee" = "employee";
        
        if (assignmentData.role === "operations_manager") {
          finalRole = "operations_manager";
        } else if (assignmentData.role === "manager") {
          finalRole = "manager";
        } else if (assignmentData.role === "employee") {
          finalRole = "employee";
        } else if (assignmentData.role === "super_admin") {
          finalRole = "super_admin";
        }
        
        // First, delete any existing roles for this user (both calendar and scheduler)
        const { error: deleteRoleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .in('app_type', ['calendar', 'scheduler']);

        if (deleteRoleError) throw deleteRoleError;

        // Then insert the new role with correct app_type based on company field_type
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: finalRole,
            app_type: appType
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
      setAssignmentData({ organization_id: "", company_id: "", role: "employee" });
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

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'operations_manager':
        return 'Organization Manager';
      case 'manager':
        return 'Company Manager';
      case 'employee':
        return 'Employee';
      case 'admin':
        return 'Admin';
      case 'user':
        return 'User';
      default:
        return role.replace('_', ' ');
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
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="house_keeping">House Keeping</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="manager">Company Manager</SelectItem>
                  <SelectItem value="operations_manager">Organization Manager</SelectItem>
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
                    <Select value={newUser.role} onValueChange={(value: "employee" | "house_keeping" | "maintenance" | "manager" | "operations_manager" | "super_admin") => setNewUser({ ...newUser, role: value, organization_id: "", company_id: "" })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="house_keeping">House Keeping</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="manager">Company Manager</SelectItem>
                          <SelectItem value="operations_manager">Organization Manager</SelectItem>
                          {currentUserRole === 'super_admin' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                        </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Show Organization dropdown for Organization Manager */}
                  {newUser.role === 'operations_manager' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="org_select" className="text-right">
                        Organization
                      </Label>
                      <Select 
                        value={newUser.organization_id} 
                        onValueChange={(value) => setNewUser({ ...newUser, organization_id: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Show Organization/Company dropdowns for Company Manager role */}
                  {newUser.role === 'manager' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="org_select" className="text-right">
                          Organization
                        </Label>
                        <Select 
                          value={newUser.organization_id} 
                          onValueChange={(value) => setNewUser({ ...newUser, organization_id: value, company_id: "" })}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="company_select" className="text-right">
                          Company
                        </Label>
                        <Select 
                          value={newUser.company_id} 
                          onValueChange={(value) => setNewUser({ ...newUser, company_id: value })}
                          disabled={!newUser.organization_id}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder={newUser.organization_id ? "Select company" : "Select organization first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {companies
                              .filter((company) => company.organization_id === newUser.organization_id)
                              .map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  
                  {/* Show Organization/Company dropdowns for Employee-type roles */}
                  {(newUser.role === 'employee' || newUser.role === 'house_keeping' || newUser.role === 'maintenance') && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="org_select" className="text-right">
                          Organization
                        </Label>
                        <Select 
                          value={newUser.organization_id} 
                          onValueChange={(value) => setNewUser({ ...newUser, organization_id: value, company_id: "" })}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="company_select" className="text-right">
                          Company
                        </Label>
                        <Select 
                          value={newUser.company_id} 
                          onValueChange={(value) => setNewUser({ ...newUser, company_id: value })}
                          disabled={!newUser.organization_id}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder={newUser.organization_id ? "Select company" : "Select organization first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {companies
                              .filter((company) => company.organization_id === newUser.organization_id)
                              .map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
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
                  <Building2 className="h-4 w-4 mr-2" />
                  Assign to Organization
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Assign User to Organization</DialogTitle>
                  <DialogDescription>
                    Select users and assign them to an organization/company with a specific role.
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
                          No available users to assign. All users are either already assigned or don't have the required permissions.
                        </div>
                      ) : (
                        availableUsersForAssignment.map((userItem) => (
                            <div
                              key={userItem.user_id}
                              className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                            >
                              <label className="flex items-center gap-3 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={selectedUsersForAssignment.includes(userItem.user_id)}
                                  onChange={(e) => {
                                    console.log('Checkbox changed for:', userItem.user_id, e.target.checked);
                                    toggleUserSelection(userItem.user_id);
                                  }}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{userItem.full_name}</div>
                                  <div className="text-xs text-muted-foreground">{userItem.email}</div>
                                </div>
                                <Badge variant={getRoleBadgeVariant(userItem.role)} className="text-xs">
                                  {userItem.role === 'admin' ? 'Admin (Unassigned)' : userItem.role.replace('_', ' ')}
                                </Badge>
                              </label>
                            </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="organization_select" className="text-right">
                      Organization
                    </Label>
                    <Select 
                      value={assignmentData.organization_id} 
                      onValueChange={(value) => setAssignmentData({ ...assignmentData, organization_id: value, company_id: "" })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="company_select" className="text-right">
                      Company
                    </Label>
                    <Select 
                      value={assignmentData.company_id} 
                      onValueChange={(value) => setAssignmentData({ ...assignmentData, company_id: value })}
                      disabled={!assignmentData.organization_id}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder={assignmentData.organization_id ? "Select a company" : "Select organization first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {companies
                          .filter((company) => company.organization_id === assignmentData.organization_id)
                          .map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
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
                      onValueChange={(value: "employee" | "manager" | "operations_manager" | "super_admin") => setAssignmentData({ ...assignmentData, role: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="house_keeping">House Keeping</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="manager">Company Manager</SelectItem>
                        <SelectItem value="operations_manager">Organization Manager</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
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
                    Assign {selectedUsersForAssignment.length} User{selectedUsersForAssignment.length !== 1 ? 's' : ''} to Organization
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                      {formatRoleLabel(userProfile.role)}
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          // Load current org/company based on role
                          let orgId: string | undefined;
                          let companyId: string | undefined;
                          
                          if (userProfile.role === 'operations_manager') {
                            // Find organization where this user is the manager
                            const org = organizations.find(o => o.organization_manager_id === userProfile.user_id);
                            orgId = org?.id;
                          } else if (userProfile.role === 'manager') {
                            // Find company where this user is the manager
                            const company = companies.find(c => c.company_manager_id === userProfile.user_id);
                            if (company) {
                              companyId = company.id;
                              orgId = company.organization_id;
                            }
                          } else if (userProfile.role === 'employee') {
                            const { data: employee } = await supabase
                              .from('employees')
                              .select('company_id')
                              .or(`user_id.eq.${userProfile.user_id},email.eq.${userProfile.email}`)
                              .single();
                            
                            if (employee?.company_id) {
                              companyId = employee.company_id;
                              const company = companies.find(c => c.id === companyId);
                              orgId = company?.organization_id;
                            }
                          }
                          
                          setEditingUser({ ...userProfile, organization_id: orgId, company_id: companyId });
                          setIsEditDialogOpen(true);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reinviteUser(userProfile.email, userProfile.full_name || '', userProfile.role)}
                        className="h-8 px-2"
                        title="Re-invite user"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteUser(userProfile.user_id, userProfile.email)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_full_name" className="text-right">
                  Full Name
                </Label>
                <Input
                  id="edit_full_name"
                  value={editingUser.full_name || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_role" className="text-right">
                  Role
                </Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value: "employee" | "manager" | "operations_manager" | "super_admin") => setEditingUser({ ...editingUser, role: value, organization_id: undefined, company_id: undefined })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="house_keeping">House Keeping</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="manager">Company Manager</SelectItem>
                    <SelectItem value="operations_manager">Organization Manager</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Show Organization dropdown for Organization Manager */}
              {editingUser.role === 'operations_manager' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_org_select" className="text-right">
                    Organization
                  </Label>
                  <Select 
                    value={editingUser.organization_id || ""} 
                    onValueChange={(value) => setEditingUser({ ...editingUser, organization_id: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Show Organization/Company dropdowns for Company Manager role */}
              {editingUser.role === 'manager' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_org_select" className="text-right">
                      Organization
                    </Label>
                    <Select 
                      value={editingUser.organization_id || ""} 
                      onValueChange={(value) => setEditingUser({ ...editingUser, organization_id: value, company_id: undefined })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_company_select" className="text-right">
                      Company
                    </Label>
                    <Select 
                      value={editingUser.company_id || ""} 
                      onValueChange={(value) => setEditingUser({ ...editingUser, company_id: value })}
                      disabled={!editingUser.organization_id}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder={editingUser.organization_id ? "Select company" : "Select organization first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {companies
                          .filter((company) => company.organization_id === editingUser.organization_id)
                          .map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              {/* Show Organization/Company dropdowns for Employee-type roles */}
              {(editingUser.role === 'employee' || editingUser.role === 'house_keeping' || editingUser.role === 'maintenance') && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_org_select" className="text-right">
                      Organization
                    </Label>
                    <Select 
                      value={editingUser.organization_id || ""} 
                      onValueChange={(value) => setEditingUser({ ...editingUser, organization_id: value, company_id: undefined })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_company_select" className="text-right">
                      Company
                    </Label>
                    <Select 
                      value={editingUser.company_id || ""} 
                      onValueChange={(value) => setEditingUser({ ...editingUser, company_id: value })}
                      disabled={!editingUser.organization_id}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder={editingUser.organization_id ? "Select company" : "Select organization first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {companies
                          .filter((company) => company.organization_id === editingUser.organization_id)
                          .map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={editUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}