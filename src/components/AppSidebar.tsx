import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
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
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (data && data.length > 0) {
        // Check for highest role priority: super_admin > admin > user
        const roles = data.map(item => item.role);
        if (roles.includes('super_admin')) {
          setUserRole('super_admin');
        } else if (roles.includes('admin')) {
          setUserRole('admin');
        } else {
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [user]);

  const items = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Tasks", url: "/tasks", icon: CheckSquare },
    { title: "Focus Hours", url: "/focus", icon: Timer },
    { title: "Daily Routines", url: "/habits", icon: Target },
    { title: "Account", url: "/account", icon: Settings },
    ...(userRole === 'super_admin' || userRole === 'admin' ? [
      { title: "Check Lists", url: "/template", icon: GraduationCap }
    ] : []),
    ...(userRole === 'super_admin' ? [
      { title: "User Management", url: "/user-management", icon: Users }
    ] : [])
  ];

  const schedulerItems = [
    { title: "Scheduler Dashboard", url: "/scheduler", icon: BarChart3 },
    { title: "Schedule", url: "/scheduler/schedule", icon: Calendar },
    { title: "Employees", url: "/scheduler/employees", icon: UserCheck },
    { title: "Time Clock", url: "/scheduler/time-clock", icon: Clock },
    { title: "Settings", url: "/scheduler/settings", icon: Settings },
  ];

  const isActive = (path: string) => currentPath === path;
  const isExpanded = items.some((i) => isActive(i.url));
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
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

        <SidebarGroup>
          <SidebarGroupLabel>Scheduler</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {schedulerItems.map((item) => (
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