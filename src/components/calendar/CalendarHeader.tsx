import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";

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
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <Button onClick={onNewEvent}>
          <Plus className="mr-2 h-4 w-4" />
          Create
        </Button>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => onDateChange(new Date())}>
            Today
          </Button>
        </div>
        
        <h1 className="text-2xl font-semibold">
          {format(currentDate, getDateFormat())}
        </h1>
      </div>
      
      <Select value={view} onValueChange={onViewChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Day</SelectItem>
          <SelectItem value="week">Week</SelectItem>
          <SelectItem value="month">Month</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};