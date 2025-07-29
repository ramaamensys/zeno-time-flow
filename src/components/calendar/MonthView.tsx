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
  priority: string;
  created_at: string;
  user_id: string;
}

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onUserEventClick?: (userId: string) => void;
  getUserName?: (userId: string) => string;
}

export const MonthView = ({ currentDate, events, onDateClick, onEditEvent, onDeleteEvent, onUserEventClick, getUserName }: MonthViewProps) => {
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

  const getPriorityColor = (priority: string, isOverdue: boolean) => {
    if (isOverdue) return "bg-red-600";
    
    switch (priority) {
      case "urgent": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-blue-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const isEventOverdue = (event: CalendarEvent) => {
    const now = new Date();
    const eventDate = new Date(event.start_time);
    return eventDate < now && !event.all_day;
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
              {dayEvents.slice(0, 3).map((event) => {
                const isOverdue = isEventOverdue(event);
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80",
                      getPriorityColor(event.priority, isOverdue)
                    )}
                    title={`${event.title} (${event.priority} priority)${isOverdue ? ' - OVERDUE' : ''}${getUserName && onUserEventClick ? ` - ${getUserName(event.user_id)}` : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUserEventClick && e.ctrlKey) {
                        onUserEventClick(event.user_id);
                      } else {
                        onEditEvent?.(event);
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onDeleteEvent?.(event.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{event.title}</span>
                      {getUserName && (
                        <span className="text-xs opacity-75 ml-1">
                          {getUserName(event.user_id).split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
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