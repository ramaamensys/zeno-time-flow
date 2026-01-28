import { useNavigate } from "react-router-dom";
import { Bell, Clock, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";

interface ShiftReminderNotificationProps {
  shift: {
    id: string;
    start_time: string;
    end_time: string;
  };
  onStartShift: () => Promise<boolean>;
  onDismiss: () => void;
}

const ShiftReminderNotification = ({ 
  shift, 
  onStartShift, 
  onDismiss 
}: ShiftReminderNotificationProps) => {
  const navigate = useNavigate();

  const handleStartShift = async () => {
    const success = await onStartShift();
    if (success) {
      navigate('/scheduler/my-dashboard');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md mx-4 shadow-2xl border-2 border-primary/50 animate-in zoom-in-95 duration-300">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white hover:bg-white/20"
            onClick={onDismiss}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-full animate-pulse">
              <Bell className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">
                Shift Starting Soon
              </CardTitle>
              <p className="text-white/90 text-lg mt-1">
                Your shift starts in 5 minutes
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <Clock className="h-10 w-10 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Scheduled Time</p>
              <p className="text-xl font-bold">
                {format(parseISO(shift.start_time), 'h:mm a')} - {format(parseISO(shift.end_time), 'h:mm a')}
              </p>
            </div>
          </div>
          
          <Button 
            size="lg" 
            className="w-full gap-3 h-14 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            onClick={handleStartShift}
          >
            <Play className="h-6 w-6" />
            Start Shift
          </Button>
          
          <p className="text-center text-sm text-muted-foreground">
            Click "Start Shift" to clock in and begin tracking your time
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftReminderNotification;
