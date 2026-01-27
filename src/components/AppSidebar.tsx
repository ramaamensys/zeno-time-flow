import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  CheckSquare,
  Calendar,
  Timer,
  Target,
  Users,
  Settings,
  GraduationCap,
  Building,
  Clock,
  UserCheck,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type UserRole = 'user' | 'admin' | 'super_admin' | 'operations_manager' | 'manager' | 'candidate' | 'employee';

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userAppType, setUserAppType] = useState<string | null>(null);
  const [isEmployeeLinked, setIsEmployeeLinked] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role, app_type')
        .eq('user_id', user.id);
      
      // Check if user has employee record
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      setIsEmployeeLinked(!!employeeData);
      
      if (rolesData && rolesData.length > 0) {
        const roles = rolesData.map(item => item.role as UserRole);
        const appTypes = rolesData.map(item => item.app_type);
        
        // Determine primary role
        if (roles.includes('super_admin')) {
          setUserRole('super_admin');
          setUserAppType('both');
        } else if (roles.includes('operations_manager')) {
          setUserRole('operations_manager');
          const appType = appTypes[0] || 'calendar';
          setUserAppType(appType === 'calendar' ? 'calendar_plus' : 'scheduler');
        } else if (roles.includes('manager')) {
          setUserRole('manager');
          setUserAppType('calendar');
        } else if (roles.includes('admin')) {
          setUserRole('admin');
          setUserAppType('scheduler');
        } else if (roles.includes('employee')) {
          setUserRole('employee');
          setUserAppType('employee'); // Special app type for employees
        } else if (roles.includes('candidate')) {
          setUserRole('candidate');
          setUserAppType('candidate'); // Special app type for candidates
        } else {
          setUserRole('user');
          setUserAppType(appTypes[0] || 'calendar');
        }
      } else {
        setUserRole(null);
        setUserAppType('calendar');
      }
    };

    fetchUserData();
  }, [user]);

  // Main features - available to all users including candidates
  const mainItems = [
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Tasks", url: "/tasks", icon: CheckSquare },
    { title: "Focus Hours", url: "/focus", icon: Timer },
    { title: "Daily Routines", url: "/habits", icon: Target },
  ];

  // Employee-specific items (schedule view, time clock)
  const employeeItems = [
    { title: "My Dashboard", url: "/scheduler/my-dashboard", icon: LayoutDashboard },
    { title: "Schedule", url: "/scheduler/schedule", icon: Calendar },
    { title: "Time Clock", url: "/scheduler/time-clock", icon: Clock },
  ];

  // Admin scheduler items
  const schedulerAdminItems = [
    { title: "Companies", url: "/scheduler/companies", icon: Building },
    { title: "Schedule", url: "/scheduler/schedule", icon: Calendar },
    { title: "Employees", url: "/scheduler/employees", icon: UserCheck },
    { title: "Time Clock", url: "/scheduler/time-clock", icon: Clock },
  ];

  // Management items based on role
  const getManagementItems = () => {
    const items = [
      { title: "Account", url: "/account", icon: Settings },
    ];

    // Checklists for candidates, employees, managers, super_admins
    if (userRole === 'super_admin' || userRole === 'manager' || userRole === 'candidate' || userRole === 'employee') {
      items.push({ title: "Check Lists", url: "/template", icon: GraduationCap });
    }

    // User Management only for super_admin
    if (userRole === 'super_admin') {
      items.push({ title: "User Management", url: "/user-management", icon: Users });
    }

    return items;
  };

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  // Determine which sections to show
  const showMainFeatures = userRole === 'candidate' || userRole === 'employee' || 
    userRole === 'manager' || userRole === 'super_admin' || userRole === 'operations_manager' ||
    userAppType === 'calendar' || userAppType === 'both' || userAppType === 'calendar_plus';
  
  const showEmployeeSection = (userRole === 'employee' && isEmployeeLinked);
  
  const showSchedulerAdmin = userRole === 'super_admin' || userRole === 'admin' || 
    userRole === 'operations_manager' || userAppType === 'scheduler' || userAppType === 'both';
  
  // Candidates don't see scheduler/employee sections
  const isCandidate = userRole === 'candidate';

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        {/* Main Features - available to all */}
        {showMainFeatures && (
          <SidebarGroup>
            <SidebarGroupLabel>Main Features</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Employee Section - only for employees (not candidates) */}
        {showEmployeeSection && !isCandidate && (
          <SidebarGroup>
            <SidebarGroupLabel>My Work</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {employeeItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Scheduler Admin Section - for admins only, not candidates or regular employees */}
        {showSchedulerAdmin && !isCandidate && userRole !== 'employee' && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {userAppType === 'calendar_plus' ? 'Companies' : 'Scheduler'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {userAppType === 'calendar_plus' ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/scheduler/companies" end className={getNavCls}>
                        <Building className="h-4 w-4" />
                        {!collapsed && <span>Companies</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  schedulerAdminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end className={getNavCls}>
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Management Section - always visible */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getManagementItems().map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
