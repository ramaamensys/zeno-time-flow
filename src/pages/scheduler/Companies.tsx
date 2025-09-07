import { useState, useEffect } from "react";
import { Plus, Building, UserCheck, Settings, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useCompanies } from "@/hooks/useSchedulerDatabase";
import { supabase } from "@/integrations/supabase/client";
import CreateCompanyModal from "@/components/scheduler/CreateCompanyModal";
import EditCompanyModal from "@/components/scheduler/EditCompanyModal";
import CompanyDetailModal from "@/components/scheduler/CompanyDetailModal";
import AssignManagerModal from "@/components/scheduler/AssignManagerModal";
import { toast } from "sonner";

export default function Companies() {
  const { user } = useAuth();
  const { companies, loading, fetchCompanies } = useCompanies();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
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
        } else if (roles.includes('manager')) {
          setUserRole('manager');
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
  const canEditCompany = userRole === 'super_admin' || userRole === 'operations_manager';

  const handleAssignManager = (company: any) => {
    setSelectedCompany(company);
    setShowAssignModal(true);
  };

  const handleEditCompany = (company: any) => {
    setSelectedCompany(company);
    setShowEditModal(true);
  };

  const handleViewCompany = (company: any) => {
    setSelectedCompany(company);
    setShowDetailModal(true);
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
            <Card key={company.id} className="group hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/30 bg-gradient-to-br from-card to-card/95">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                      style={{ backgroundColor: company.color || '#3b82f6' }}
                    >
                      <Building className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        className="p-0 h-auto font-semibold text-lg text-left hover:text-primary transition-colors w-full justify-start"
                        onClick={() => handleViewCompany(company)}
                        title={company.name}
                      >
                        <span className="truncate block max-w-full">{company.name}</span>
                      </Button>
                      <CardDescription className="text-sm mt-1 truncate">{company.type}</CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          variant={company.field_type === 'IT' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {company.field_type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-70 hover:opacity-100">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                        <DropdownMenuItem onClick={() => handleViewCompany(company)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {canEditCompany && (
                          <DropdownMenuItem onClick={() => handleEditCompany(company)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Company
                          </DropdownMenuItem>
                        )}
                        {canAssignManager && (
                          <DropdownMenuItem onClick={() => handleAssignManager(company)}>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Assign Managers
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2 text-sm">
                  {company.address && (
                    <p className="flex items-start gap-2">
                      <span className="font-medium text-muted-foreground min-w-0 flex-shrink-0">Address:</span> 
                      <span className="text-foreground">{company.address}</span>
                    </p>
                  )}
                  {company.phone && (
                    <p className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">Phone:</span> 
                      <span className="text-foreground">{company.phone}</span>
                    </p>
                  )}
                  {company.email && (
                    <p className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">Email:</span> 
                      <span className="text-foreground">{company.email}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {company.operations_manager_id && (
                    <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Ops Manager
                    </Badge>
                  )}
                  {company.company_manager_id && (
                    <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Company Manager
                    </Badge>
                  )}
                </div>
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

      <EditCompanyModal 
        open={showEditModal} 
        onOpenChange={setShowEditModal}
        company={selectedCompany}
        onSuccess={() => {
          fetchCompanies();
          toast.success("Company updated successfully!");
        }}
      />

      <CompanyDetailModal 
        open={showDetailModal} 
        onOpenChange={setShowDetailModal}
        company={selectedCompany}
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