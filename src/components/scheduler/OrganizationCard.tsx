import { useState } from "react";
import { Building2, ChevronDown, ChevronUp, Plus, Settings, Edit, UserCheck, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CompanyCard from "./CompanyCard";

interface Company {
  id: string;
  name: string;
  type: string;
  field_type?: string | null;
  color?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  operations_manager_id?: string | null;
  company_manager_id?: string | null;
  organization_id?: string | null;
}

interface Organization {
  id: string;
  name: string;
  color?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  operations_manager_id?: string | null;
  organization_manager_id?: string | null;
}

interface OrganizationCardProps {
  organization: Organization;
  companies: Company[];
  canEdit: boolean;
  canCreateCompany: boolean;
  onEditOrganization: (org: Organization) => void;
  onCreateCompany: (orgId: string) => void;
  onEditCompany: (company: Company) => void;
  onViewCompany: (company: Company) => void;
  onAssignManager: (company: Company) => void;
}

export default function OrganizationCard({
  organization,
  companies,
  canEdit,
  canCreateCompany,
  onEditOrganization,
  onCreateCompany,
  onEditCompany,
  onViewCompany,
  onAssignManager
}: OrganizationCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const orgCompanies = companies.filter(c => c.organization_id === organization.id);

  return (
    <Card className="border border-border/50 bg-gradient-to-br from-card to-card/95 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: organization.color || '#6366f1' }}
              >
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{organization.name}</h3>
                <CardDescription className="text-sm">
                  {orgCompanies.length} {orgCompanies.length === 1 ? 'company' : 'companies'}
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                    <DropdownMenuItem onClick={() => onEditOrganization(organization)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Organization
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {(organization.operations_manager_id || organization.organization_manager_id) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {organization.operations_manager_id && (
                <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Ops Manager
                </Badge>
              )}
              {organization.organization_manager_id && (
                <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Org Manager
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orgCompanies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  canEdit={canEdit}
                  onEdit={() => onEditCompany(company)}
                  onView={() => onViewCompany(company)}
                  onAssignManager={() => onAssignManager(company)}
                />
              ))}
              
              {canCreateCompany && (
                <Card 
                  className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer bg-muted/20 flex items-center justify-center min-h-[120px]"
                  onClick={() => onCreateCompany(organization.id)}
                >
                  <div className="text-center p-4">
                    <Plus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">Add Company</p>
                  </div>
                </Card>
              )}
            </div>

            {orgCompanies.length === 0 && !canCreateCompany && (
              <div className="text-center py-6 text-muted-foreground">
                <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No companies in this organization</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
