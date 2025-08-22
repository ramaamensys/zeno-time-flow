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
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
      {/* Left side - Create button and navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button 
          onClick={onNewEvent} 
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 h-12 px-6 rounded-xl font-semibold"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Create
        </Button>
        
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handlePrevious}
            className="h-10 w-10 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleNext}
            className="h-10 w-10 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onDateChange(new Date())}
            className="px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium text-gray-700"
          >
            Today
          </Button>
        </div>
      </div>
      
      {/* Right side - Date display and view selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          {format(currentDate, getDateFormat())}
        </h1>
        
        <Select value={view} onValueChange={onViewChange}>
          <SelectTrigger className="w-32 h-12 rounded-xl border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-gray-200 shadow-lg bg-white z-50">
            <SelectItem value="day" className="rounded-lg">Day</SelectItem>
            <SelectItem value="week" className="rounded-lg">Week</SelectItem>
            <SelectItem value="month" className="rounded-lg">Month</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};