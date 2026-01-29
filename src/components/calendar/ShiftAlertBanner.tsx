import { useNavigate } from "react-router-dom";
import { Bell, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { useState } from "react";

interface ShiftAlertBannerProps {
  shift: {
    id: string;
    start_time: string;
    end_time: string;
  };
  onStartShift: () => Promise<boolean>;
}

const ShiftAlertBanner = ({ shift, onStartShift }: ShiftAlertBannerProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartShift = async () => {
    setIsLoading(true);
    try {
      const success = await onStartShift();
      if (success) {
        // Navigate to employee dashboard after successful clock in
        navigate('/scheduler/my-dashboard');
      }
    } catch (error) {
      console.error('Error starting shift:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-top duration-300">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full animate-pulse">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-lg">Shift Starting Soon!</p>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <Clock className="h-4 w-4" />
              <span>
                {format(parseISO(shift.start_time), 'h:mm a')} - {format(parseISO(shift.end_time), 'h:mm a')}
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          size="sm"
          className="gap-2 bg-white text-orange-600 hover:bg-white/90 font-semibold shadow-md"
          onClick={handleStartShift}
          disabled={isLoading}
        >
          <Play className="h-4 w-4" />
          {isLoading ? 'Starting...' : 'Start Shift'}
        </Button>
      </div>
    </div>
  );
};

export default ShiftAlertBanner;
