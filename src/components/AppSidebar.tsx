import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  CheckSquare,
  Calendar,
  Timer,
  Target,
  User,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  GraduationCap,
  Building,
  Clock,
  UserCheck,
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

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userAppType, setUserAppType] = useState<string | null>(null);
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role, app_type')
        .eq('user_id', user.id);
      
      if (data && data.length > 0) {
        // Check for highest role priority: super_admin > operations_manager > admin > user
        const roles = data.map(item => item.role);
        const appTypes = data.map(item => item.app_type);
        
        if (roles.includes('super_admin')) {
          setUserRole('super_admin');
          setUserAppType('both'); // Super admins see everything
        } else if (roles.includes('operations_manager')) {
          setUserRole('operations_manager');
          // Operations managers see features based on their company type
          // IT operations managers see calendar + companies, non-IT see scheduler
          const appType = appTypes[0] || 'calendar';
          if (appType === 'calendar') {
            setUserAppType('calendar_plus'); // Special type for IT operations managers
          } else {
            setUserAppType('scheduler');
          }
        } else if (roles.includes('admin')) {
          setUserRole('admin');
          setUserAppType('both'); // Admins get access to both
        } else {
          setUserRole('user');
          setUserAppType(appTypes[0] || 'calendar'); // Regular users get their assigned app type
        }
      } else {
        setUserRole(null);
        setUserAppType('calendar'); // Default to calendar if no role found
      }
    };

    fetchUserData();
  }, [user]);

  const items = [
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Tasks", url: "/tasks", icon: CheckSquare },
    { title: "Focus Hours", url: "/focus", icon: Timer },
    { title: "Daily Routines", url: "/habits", icon: Target },
  ];

  const schedulerItems = [
    { title: "Companies", url: "/scheduler/companies", icon: Building },
    { title: "Schedule", url: "/scheduler/schedule", icon: Calendar },
    { title: "Employees", url: "/scheduler/employees", icon: UserCheck },
    { title: "Time Clock", url: "/scheduler/time-clock", icon: Clock },
  ];

  const bottomItems = [
    { title: "Account", url: "/account", icon: Settings },
    ...(userRole === 'super_admin' || userRole === 'admin' || userRole === 'operations_manager' ? [
      { title: "Check Lists", url: "/template", icon: GraduationCap }
    ] : []),
    ...(userRole === 'super_admin' ? [
      { title: "User Management", url: "/user-management", icon: Users }
    ] : [])
  ];

  const isActive = (path: string) => currentPath === path;
  const isExpanded = items.some((i) => isActive(i.url));
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        {/* Show Main Features for calendar users or admins */}
        {(userAppType === 'calendar' || userAppType === 'both' || userAppType === 'calendar_plus') && (
          <SidebarGroup>
            <SidebarGroupLabel>Main Features</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
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

        {/* Show Companies for IT Operations Managers and Scheduler users/admins */}
        {(userAppType === 'scheduler' || userAppType === 'both' || userAppType === 'calendar_plus') && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {userAppType === 'calendar_plus' ? 'Companies' : 'Scheduler'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {userAppType === 'calendar_plus' ? (
                  // IT Operations Manager - only show Companies
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/scheduler/companies" end className={getNavCls}>
                        <Building className="h-4 w-4" />
                        {!collapsed && <span>Companies</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  // Full scheduler menu for non-IT operations managers and admins
                  schedulerItems.map((item) => (
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

        {/* Always show Management section */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
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