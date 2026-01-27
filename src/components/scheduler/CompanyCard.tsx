import { Building, Settings, Edit, Eye, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Company {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  company_manager_id?: string | null;
}

interface CompanyCardProps {
  company: Company;
  canEdit: boolean;
  onEdit: () => void;
  onView: () => void;
  onAssignManager: () => void;
}

export default function CompanyCard({ company, canEdit, onEdit, onView, onAssignManager }: CompanyCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-primary/30 bg-background">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center shadow flex-shrink-0"
              style={{ backgroundColor: company.color || '#3b82f6' }}
            >
              <Building className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <Button
                variant="ghost"
                className="p-0 h-auto font-semibold text-sm text-left hover:text-primary transition-colors w-full justify-start"
                onClick={onView}
                title={company.name}
              >
                <span className="truncate block max-w-full">{company.name}</span>
              </Button>
              <CardDescription className="text-xs mt-0.5 truncate">{company.type}</CardDescription>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-70 hover:opacity-100">
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border shadow-lg">
              <DropdownMenuItem onClick={onView}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Company
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onAssignManager}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Assign Managers
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {company.type}
          </Badge>
          {company.company_manager_id && (
            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
              Manager Assigned
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
