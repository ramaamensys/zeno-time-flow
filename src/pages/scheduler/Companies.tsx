import { useState, useEffect } from "react";
import { Plus, Building, UserCheck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCompanies } from "@/hooks/useSchedulerDatabase";
import { supabase } from "@/integrations/supabase/client";
import CreateCompanyModal from "@/components/scheduler/CreateCompanyModal";
import AssignManagerModal from "@/components/scheduler/AssignManagerModal";
import { toast } from "sonner";

export default function Companies() {
  const { user } = useAuth();
  const { companies, loading, fetchCompanies } = useCompanies();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (data && data.length > 0) {
        const roles = data.map(item => item.role);
        if (roles.includes('super_admin')) {
          setUserRole('super_admin');
        } else if (roles.includes('operations_manager')) {
          setUserRole('operations_manager');
        } else if (roles.includes('admin')) {
          setUserRole('admin');
        } else {
          setUserRole('user');
        }
      }
    };

    fetchUserRole();
  }, [user]);

  const canCreateCompany = userRole === 'super_admin' || userRole === 'operations_manager';
  const canAssignManager = userRole === 'super_admin' || userRole === 'operations_manager';

  const handleAssignManager = (company: any) => {
    setSelectedCompany(company);
    setShowAssignModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Company Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage companies, assign managers, and organize your workforce
            </p>
          </div>
          
          {canCreateCompany && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Company
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Card key={company.id} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: company.color || '#3b82f6' }}
                    >
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <CardDescription>{company.type}</CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={company.field_type === 'IT' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {company.field_type}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {company.address && (
                    <p><span className="font-medium">Address:</span> {company.address}</p>
                  )}
                  {company.phone && (
                    <p><span className="font-medium">Phone:</span> {company.phone}</p>
                  )}
                  {company.email && (
                    <p><span className="font-medium">Email:</span> {company.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  {company.operations_manager_id && (
                    <div className="flex items-center text-sm">
                      <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-muted-foreground">Operations Manager Assigned</span>
                    </div>
                  )}
                  {company.company_manager_id && (
                    <div className="flex items-center text-sm">
                      <UserCheck className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-muted-foreground">Company Manager Assigned</span>
                    </div>
                  )}
                </div>

                {canAssignManager && (
                  <div className="flex space-x-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignManager(company)}
                      className="flex-1"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {companies.length === 0 && (
          <div className="text-center py-12">
            <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No companies found</h3>
            <p className="text-muted-foreground mb-6">
              {canCreateCompany 
                ? "Create your first company to get started" 
                : "No companies have been created yet"
              }
            </p>
            {canCreateCompany && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Company
              </Button>
            )}
          </div>
        )}
      </div>

      <CreateCompanyModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          fetchCompanies();
          toast.success("Company created successfully!");
        }}
      />

      <AssignManagerModal 
        open={showAssignModal} 
        onOpenChange={setShowAssignModal}
        company={selectedCompany}
        onSuccess={() => {
          fetchCompanies();
          toast.success("Manager assigned successfully!");
        }}
      />
    </div>
  );
}