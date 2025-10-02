import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LogOut, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, signOut } = useAuth();
  const [locationEnabled, setLocationEnabled] = useState(() => {
    return localStorage.getItem('locationEnabled') === 'true';
  });

  const toggleLocation = () => {
    const newState = !locationEnabled;
    setLocationEnabled(newState);
    localStorage.setItem('locationEnabled', String(newState));
    
    if (newState) {
      toast.success('Location tracking enabled', {
        description: 'Your location will be included with notes'
      });
    } else {
      toast.info('Location tracking disabled');
    }
  };

  // Expose location state globally
  useEffect(() => {
    window.locationTrackingEnabled = locationEnabled;
  }, [locationEnabled]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="flex items-center justify-between h-full px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <div className="flex items-center gap-3">
                  <img src="/lovable-uploads/dfd7bdde-fe82-4a7a-b7bd-d93fa625c987.png" alt="Zeno TimeFlow Logo" className="h-14 w-auto" />
                  <span className="text-lg font-semibold text-foreground">Zeno Time Flow</span>
                  <Button
                    variant={locationEnabled ? "default" : "ghost"}
                    size="sm"
                    onClick={toggleLocation}
                    className="h-8 w-8 p-0"
                    title={locationEnabled ? "Location tracking enabled" : "Location tracking disabled"}
                  >
                    <MapPin className={`h-4 w-4 ${locationEnabled ? 'fill-current' : ''}`} />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="h-8 w-8 p-0"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>
          
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
