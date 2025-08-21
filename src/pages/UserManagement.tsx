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
import { Loader2, Users, Plus, Edit, Trash2, Search, Filter, Mail } from "lucide-react";

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
    role: "user" as "user" | "admin" | "super_admin",
    app_type: "calendar" as "calendar" | "scheduler",
    manager_id: ""
  });
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  const { toast } = useToast();

  useEffect(() => {
    checkAuthorizationAndLoadUsers();
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

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin' | 'super_admin') => {
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
          app_type: newUser.app_type,
          manager_id: newUser.manager_id || null
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
      setNewUser({ email: "", full_name: "", role: "user", password: "", app_type: "calendar", manager_id: "" });
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
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editingUser.full_name,
          email: editingUser.email
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
                    <Select value={newUser.role} onValueChange={(value: "user" | "admin" | "super_admin") => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="app_type" className="text-right">
                      App Type
                    </Label>
                    <Select value={newUser.app_type} onValueChange={(value: "calendar" | "scheduler") => setNewUser({ ...newUser, app_type: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="calendar">Zeno Time Flow (Calendar)</SelectItem>
                        <SelectItem value="scheduler">Roster Joy (Scheduler)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newUser.role === "user" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="manager" className="text-right">
                        Assign Manager
                      </Label>
                      <Select value={newUser.manager_id} onValueChange={(value) => setNewUser({ ...newUser, manager_id: value })}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a manager (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No Manager</SelectItem>
                          {managers.map((manager) => (
                            <SelectItem key={manager.user_id} value={manager.user_id}>
                              {manager.full_name} ({manager.email})
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

            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>
                    Update user information.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="edit_email"
                      type="email"
                      value={editingUser?.email || ""}
                      onChange={(e) => setEditingUser(editingUser ? { ...editingUser, email: e.target.value } : null)}
                      className="col-span-3"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_full_name" className="text-right">
                      Full Name
                    </Label>
                    <Input
                      id="edit_full_name"
                      value={editingUser?.full_name || ""}
                      onChange={(e) => setEditingUser(editingUser ? { ...editingUser, full_name: e.target.value } : null)}
                      className="col-span-3"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={editUser}
                  >
                    Update User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {userProfile.user_id !== user?.id && userProfile.status === 'active' && (
                          <>
                            <Select
                              value={userProfile.role}
                              onValueChange={(value) => updateUserRole(userProfile.user_id, value as 'user' | 'admin' | 'super_admin')}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUser(userProfile);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteUser(userProfile.user_id, userProfile.email)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {userProfile.user_id === user?.id && (
                          <span className="text-sm text-muted-foreground">You</span>
                        )}
                        {userProfile.status === 'deleted' && userProfile.user_id !== user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reinviteUser(userProfile.email, userProfile.full_name, userProfile.role)}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Reinvite
                          </Button>
                        )}
                      </div>
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