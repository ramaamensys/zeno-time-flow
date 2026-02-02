import { useState, useEffect } from "react";
import { AlertTriangle, Clock, MapPin, UserCheck, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MissedShift {
  id: string;
  employee_id: string;
  company_id: string;
  start_time: string;
  end_time: string;
  status: string;
  is_missed: boolean;
  replacement_employee_id?: string;
  replacement_approved_at?: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  company?: {
    id: string;
    name: string;
  };
  department?: {
    name: string;
  };
}

interface CompanyMissedShiftsProps {
  companyId: string;
  employeeId: string;
}

export default function CompanyMissedShifts({ companyId, employeeId }: CompanyMissedShiftsProps) {
  const { user } = useAuth();
  const [missedShifts, setMissedShifts] = useState<MissedShift[]>([]);
  const [myRequests, setMyRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<MissedShift | null>(null);
  const [requesting, setRequesting] = useState(false);

  const fetchMissedShifts = async () => {
    if (!companyId || !employeeId) return;
    
    try {
      setLoading(true);
      
      // Fetch missed shifts from the same company (excluding own shifts)
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          employee:employees!shifts_employee_id_fkey(id, first_name, last_name),
          company:companies(id, name),
          department:departments(name)
        `)
        .eq('company_id', companyId)
        .eq('is_missed', true)
        .neq('employee_id', employeeId) // Exclude own missed shifts
        .is('replacement_employee_id', null) // Only show shifts without approved replacement
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      setMissedShifts(data || []);
      
      // Fetch my pending requests
      const { data: requests } = await supabase
        .from('shift_replacement_requests')
        .select('shift_id')
        .eq('replacement_employee_id', employeeId)
        .eq('status', 'pending');
      
      setMyRequests(requests?.map(r => r.shift_id) || []);
    } catch (error) {
      console.error('Error fetching missed shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissedShifts();
  }, [companyId, employeeId]);

  const handleRequestShift = async () => {
    if (!selectedShift || !user) return;
    
    try {
      setRequesting(true);
      
      // Check if already requested
      const { data: existing } = await supabase
        .from('shift_replacement_requests')
        .select('id')
        .eq('shift_id', selectedShift.id)
        .eq('replacement_employee_id', employeeId)
        .maybeSingle();
      
      if (existing) {
        toast.error('You have already requested this shift');
        setSelectedShift(null);
        return;
      }
      
      // Create replacement request
      const { error } = await supabase
        .from('shift_replacement_requests')
        .insert({
          shift_id: selectedShift.id,
          original_employee_id: selectedShift.employee_id,
          replacement_employee_id: employeeId,
          company_id: selectedShift.company_id,
          status: 'pending'
        });
      
      if (error) throw error;
      
      toast.success('Request sent to manager for approval');
      setSelectedShift(null);
      fetchMissedShifts();
    } catch (error) {
      console.error('Error requesting shift:', error);
      toast.error('Failed to send request');
    } finally {
      setRequesting(false);
    }
  };

  const hasRequested = (shiftId: string) => myRequests.includes(shiftId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading missed shifts...</div>
        </CardContent>
      </Card>
    );
  }

  if (missedShifts.length === 0) {
    return null; // Don't show the section if no missed shifts
  }

  return (
    <>
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Available Shifts to Cover
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            These shifts were missed by other employees. Click to request manager approval to cover them.
          </p>
          <div className="space-y-3">
            {missedShifts.map((shift) => (
              <div 
                key={shift.id} 
                className={`flex items-center justify-between p-4 border rounded-lg bg-destructive/10 border-destructive/30 hover:bg-destructive/20 transition-colors ${
                  hasRequested(shift.id) ? 'opacity-60' : 'cursor-pointer'
                }`}
                onClick={() => !hasRequested(shift.id) && setSelectedShift(shift)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-destructive">
                      {shift.employee?.first_name?.[0]}{shift.employee?.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-destructive">
                      {shift.employee?.first_name} {shift.employee?.last_name}'s Shift
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(shift.start_time), 'MMM d, h:mm a')} - {format(parseISO(shift.end_time), 'h:mm a')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {shift.department?.name && (
                    <Badge variant="outline">{shift.department.name}</Badge>
                  )}
                  {hasRequested(shift.id) ? (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Request Pending
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <Send className="h-3 w-3" />
                      Click to Request
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Request Confirmation Dialog */}
      <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Cover Shift</DialogTitle>
            <DialogDescription>
              You are requesting to cover this missed shift. The manager will be notified and must approve your request before you can clock in.
            </DialogDescription>
          </DialogHeader>
          
          {selectedShift && (
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  Originally assigned to: {selectedShift.employee?.first_name} {selectedShift.employee?.last_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(parseISO(selectedShift.start_time), 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(parseISO(selectedShift.start_time), 'h:mm a')} - {format(parseISO(selectedShift.end_time), 'h:mm a')}
                </span>
              </div>
              {selectedShift.company?.name && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedShift.company.name}</span>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedShift(null)}>
              Cancel
            </Button>
            <Button onClick={handleRequestShift} disabled={requesting}>
              {requesting ? 'Sending...' : 'Send Request to Manager'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
