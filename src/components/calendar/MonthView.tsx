import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getUserColor, getPriorityOverlay } from "@/utils/userColors";

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

  const getEventStyling = (event: CalendarEvent, isOverdue: boolean) => {
    const baseClasses = "rounded-md px-2 py-1 text-xs font-medium";
    
    if (isOverdue) {
      return `${baseClasses} bg-red-600 text-white animate-pulse`;
    }
    
    switch (event.priority) {
      case "urgent":
        return `${baseClasses} bg-red-500 text-white`;
      case "high":
        return `${baseClasses} bg-orange-500 text-white`;
      case "medium":
        return `${baseClasses} bg-blue-500 text-white`;
      case "low":
        return `${baseClasses} bg-green-500 text-white`;
      default:
        return `${baseClasses} bg-gray-500 text-white`;
    }
  };

  const isEventOverdue = (event: CalendarEvent) => {
    const now = new Date();
    const eventDate = new Date(event.start_time);
    return eventDate < now && !event.all_day;
  };

  return (
    <div className="bg-card rounded-lg shadow-lg overflow-hidden">
      <div className="grid grid-cols-7">
        {/* Header row */}
        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, idx) => (
          <div key={day} className="bg-primary text-primary-foreground p-4 text-center font-semibold">
            <div className="hidden md:block">{day}</div>
            <div className="md:hidden">{day.slice(0, 3)}</div>
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
                "min-h-[140px] p-3 border-b border-r border-border hover:bg-accent/50 cursor-pointer transition-colors",
                !isCurrentMonth && "bg-muted/50 text-muted-foreground",
                isCurrentDay && "bg-accent border-2 border-primary"
              )}
              onClick={() => onDateClick(date)}
            >
              <div className={cn(
                "text-sm font-semibold mb-2",
                isCurrentDay && "text-primary"
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
                        getEventStyling(event, isOverdue),
                        "truncate cursor-pointer"
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
                        <span className="truncate flex-1">
                          {event.event_type === "meeting" && "🤝 "}
                          {event.event_type === "task" && "📋 "}
                          {event.event_type === "personal" && "👤 "}
                          {event.event_type === "other" && "📌 "}
                          {event.title}
                        </span>
                        {getUserName && (
                          <span className="text-xs opacity-80 ml-1">
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
    </div>
  );
};