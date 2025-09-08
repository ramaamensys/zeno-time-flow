import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserCheck, User } from "lucide-react";

interface AssignManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: any;
  onSuccess: () => void;
}

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
}

export default function AssignManagerModal({ 
  open, 
  onOpenChange, 
  company, 
  onSuccess 
}: AssignManagerModalProps) {
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [availableOpsManagers, setAvailableOpsManagers] = useState<Profile[]>([]);
  const [operationsManager, setOperationsManager] = useState("");
  const [companyManager, setCompanyManager] = useState("");

  useEffect(() => {
    if (open && company) {
      fetchAvailableUsers();
      setOperationsManager(company.operations_manager_id || "");
      setCompanyManager(company.company_manager_id || "");
    }
  }, [open, company]);

  const fetchAvailableUsers = async () => {
    try {
      // Fetch all active users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .neq('user_id', company?.created_by || '')
        .neq('status', 'deleted') // Exclude deleted users
        .eq('status', 'active') // Only show active users
        .order('full_name');

      if (!profiles) {
        setAvailableUsers([]);
        setAvailableOpsManagers([]);
        return;
      }

      // Set all users for company manager dropdown
      setAvailableUsers(profiles);

      // For operations manager dropdown, filter by company field_type
      const expectedAppType = company?.field_type === 'IT' ? 'calendar' : 'scheduler';
      
      // Get operations managers with matching app_type
      const { data: operationsManagers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'operations_manager')
        .eq('app_type', expectedAppType);

      const operationsManagerIds = new Set(operationsManagers?.map(om => om.user_id) || []);

      // Filter profiles to only show matching operations managers
      const filteredOpsManagers = profiles.filter(profile => 
        operationsManagerIds.has(profile.user_id)
      );

      setAvailableOpsManagers(filteredOpsManagers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load available users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setLoading(true);

    try {
      const updates: any = {};
      
      if (operationsManager !== company.operations_manager_id) {
        updates.operations_manager_id = (operationsManager && operationsManager !== "none") ? operationsManager : null;
        
        // Assign operations_manager role with proper app_type based on company field_type
        if (operationsManager && operationsManager !== "none") {
          const appType = company.field_type === 'IT' ? 'calendar' : 'scheduler';
          await supabase
            .from('user_roles')
            .upsert({ 
              user_id: operationsManager, 
              role: 'operations_manager',
              app_type: appType
            });
        }
      }
      
      if (companyManager !== company.company_manager_id) {
        updates.company_manager_id = (companyManager && companyManager !== "none") ? companyManager : null;
        
        // Assign admin role for company manager with proper app_type
        if (companyManager && companyManager !== "none") {
          const appType = company.field_type === 'IT' ? 'calendar' : 'scheduler';
          await supabase
            .from('user_roles')
            .upsert({ 
              user_id: companyManager, 
              role: 'admin',
              app_type: appType
            });
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('companies')
          .update(updates)
          .eq('id', company.id);

        if (error) throw error;
      }

      onSuccess();
      onOpenChange(false);
      toast.success('Managers assigned successfully!');
    } catch (error) {
      console.error('Error assigning managers:', error);
      toast.error('Failed to assign managers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOperationsManager("");
    setCompanyManager("");
  };

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Assign Managers - {company.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="operations-manager" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Operations Manager ({company.field_type} only)
              </Label>
              <Select
                value={operationsManager}
                onValueChange={setOperationsManager}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select operations manager" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="none">No operations manager</SelectItem>
                  {availableOpsManagers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableOpsManagers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No {company.field_type} operations managers found. Create one in User Management first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-manager" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Company Manager
              </Label>
              <Select
                value={companyManager}
                onValueChange={setCompanyManager}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select company manager" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="none">No company manager</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Assigning..." : "Assign Managers"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}