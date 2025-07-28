import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: string;
  created_at: string;
}

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
}

export const MonthView = ({ currentDate, events, onDateClick }: MonthViewProps) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return isSameDay(eventDate, date);
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "meeting": return "bg-blue-500";
      case "task": return "bg-green-500";
      case "personal": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="grid grid-cols-7 border border-border rounded-lg overflow-hidden">
      {/* Header row */}
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div key={day} className="p-3 bg-muted text-sm font-medium text-center border-b">
          {day}
        </div>
      ))}
      
      {/* Calendar grid */}
      {calendarDays.map((date, index) => {
        const dayEvents = getEventsForDate(date);
        const isCurrentMonth = isSameMonth(date, currentDate);
        const isCurrentDay = isToday(date);
        
        return (
          <div
            key={index}
            className={cn(
              "min-h-[120px] p-2 border-b border-r border-border cursor-pointer hover:bg-muted/50 transition-colors",
              !isCurrentMonth && "bg-muted/30 text-muted-foreground",
              isCurrentDay && "bg-primary/10"
            )}
            onClick={() => onDateClick(date)}
          >
            <div className={cn(
              "text-sm font-medium mb-1",
              isCurrentDay && "text-primary font-bold"
            )}>
              {format(date, "d")}
            </div>
            
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "text-xs p-1 rounded text-white truncate",
                    getEventTypeColor(event.event_type)
                  )}
                  title={event.title}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};