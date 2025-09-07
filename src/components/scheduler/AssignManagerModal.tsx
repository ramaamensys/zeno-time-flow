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
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .neq('user_id', company?.created_by || '')
        .neq('status', 'deleted') // Exclude deleted users
        .eq('status', 'active') // Only show active users
        .order('full_name');

      setAvailableUsers(profiles || []);
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
        updates.operations_manager_id = operationsManager || null;
        
        // Assign operations_manager role with proper app_type based on company field_type
        if (operationsManager) {
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
        updates.company_manager_id = companyManager || null;
        
        // Assign admin role for company manager with proper app_type
        if (companyManager) {
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
                Operations Manager
              </Label>
              <Select
                value={operationsManager}
                onValueChange={setOperationsManager}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operations manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No operations manager</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select company manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No company manager</SelectItem>
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