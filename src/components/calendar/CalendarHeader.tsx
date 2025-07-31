import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  view: "month" | "week" | "day";
  onViewChange: (view: "month" | "week" | "day") => void;
  onNewEvent: () => void;
}

export const CalendarHeader = ({ 
  currentDate, 
  onDateChange, 
  view, 
  onViewChange,
  onNewEvent 
}: CalendarHeaderProps) => {
  const handlePrevious = () => {
    switch (view) {
      case "month":
        onDateChange(subMonths(currentDate, 1));
        break;
      case "week":
        onDateChange(subWeeks(currentDate, 1));
        break;
      case "day":
        onDateChange(subDays(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case "month":
        onDateChange(addMonths(currentDate, 1));
        break;
      case "week":
        onDateChange(addWeeks(currentDate, 1));
        break;
      case "day":
        onDateChange(addDays(currentDate, 1));
        break;
    }
  };

  const getDateFormat = () => {
    switch (view) {
      case "month":
        return "MMMM yyyy";
      case "week":
        return "MMM dd, yyyy";
      case "day":
        return "EEEE, MMMM dd, yyyy";
      default:
        return "MMMM yyyy";
    }
  };

  return (
    <div className="calendar-card p-6 mb-8 calendar-fade-in">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button 
            onClick={onNewEvent}
            className="calendar-gradient-bg hover:opacity-90 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Event
          </Button>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrevious}
              className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNext}
              className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onDateChange(new Date())}
              className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-200 font-medium"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Today
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 bg-gradient-to-r from-primary/5 to-primary/10 px-4 py-3 rounded-lg border border-primary/20">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              {format(currentDate, getDateFormat())}
            </h1>
          </div>
          
          <Select value={view} onValueChange={onViewChange}>
            <SelectTrigger className="w-36 border-primary/20 hover:border-primary/40 transition-all duration-200 bg-gradient-to-r from-background to-primary/5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="calendar-scale-in">
              <SelectItem value="day" className="hover:bg-primary/10">
                📅 Day View
              </SelectItem>
              <SelectItem value="week" className="hover:bg-primary/10">
                📊 Week View
              </SelectItem>
              <SelectItem value="month" className="hover:bg-primary/10">
                🗓️ Month View
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};