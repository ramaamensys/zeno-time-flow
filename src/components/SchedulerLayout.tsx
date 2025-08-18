import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, Settings, LogOut, Menu, BarChart3 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

interface SchedulerLayoutProps {
  children: React.ReactNode;
}

const SchedulerLayout = ({ children }: SchedulerLayoutProps) => {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/scheduler", icon: BarChart3 },
    { name: "Schedule", href: "/scheduler/schedule", icon: Calendar },
    { name: "Employees", href: "/scheduler/employees", icon: Users },
    { name: "Time Clock", href: "/scheduler/time-clock", icon: Clock },
    { name: "Settings", href: "/scheduler/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-64" : "w-16"} flex-shrink-0 transition-all duration-300 ease-in-out`}>
        <div className="flex flex-col h-full bg-card border-r">
          {/* Logo/Header */}
          <div className="flex items-center h-14 px-4 border-b">
            <div className="flex items-center gap-3">
              <img src="/lovable-uploads/dfd7bdde-fe82-4a7a-b7bd-d93fa625c987.png" alt="Logo" className="h-8 w-auto" />
              {sidebarOpen && (
                <span className="text-lg font-semibold text-foreground">Roster Joy</span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                              (item.href === "/scheduler" && location.pathname === "/scheduler");
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t p-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Scheduler App</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="flex items-center justify-between h-full px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2"
            >
              <Menu className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="h-8 w-8 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SchedulerLayout;