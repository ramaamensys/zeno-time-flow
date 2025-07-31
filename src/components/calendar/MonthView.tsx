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
    const baseClasses = "calendar-event text-white font-medium";
    
    if (isOverdue) {
      return `${baseClasses} event-priority-urgent`;
    }
    
    switch (event.priority) {
      case "urgent":
        return `${baseClasses} event-priority-urgent`;
      case "high":
        return `${baseClasses} event-priority-high`;
      case "medium":
        return `${baseClasses} event-priority-medium`;
      case "low":
        return `${baseClasses} event-priority-low`;
      default:
        return `${baseClasses} event-priority-medium`;
    }
  };

  const isEventOverdue = (event: CalendarEvent) => {
    const now = new Date();
    const eventDate = new Date(event.start_time);
    return eventDate < now && !event.all_day;
  };

  return (
    <div className="calendar-card overflow-hidden calendar-slide-up">
      <div className="grid grid-cols-7">
        {/* Header row */}
        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, idx) => (
          <div key={day} className="calendar-header p-4 text-center font-semibold text-white">
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
                "calendar-day min-h-[140px] p-3 border-b border-r border-border/20 relative",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground opacity-60",
                isCurrentDay && "today",
                dayEvents.length > 0 && "has-events"
              )}
              onClick={() => onDateClick(date)}
            >
              <div className={cn(
                "text-sm font-semibold mb-2 flex items-center justify-center w-8 h-8 rounded-full",
                isCurrentDay && "bg-primary text-primary-foreground shadow-lg"
              )}>
                {format(date, "d")}
              </div>
              
              <div className="space-y-1.5">
                {dayEvents.slice(0, 3).map((event, eventIndex) => {
                  const isOverdue = isEventOverdue(event);
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        getEventStyling(event, isOverdue),
                        "calendar-scale-in truncate cursor-pointer group relative"
                      )}
                      style={{ animationDelay: `${eventIndex * 0.1}s` }}
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
                        <span className="truncate flex-1 text-xs">
                          {event.event_type === "meeting" && "🤝 "}
                          {event.event_type === "task" && "📋 "}
                          {event.event_type === "personal" && "👤 "}
                          {event.event_type === "other" && "📌 "}
                          {event.title}
                        </span>
                        {getUserName && (
                          <span className="text-xs opacity-80 ml-1 font-medium">
                            {getUserName(event.user_id).split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md"></div>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                    +{dayEvents.length - 3} more events
                  </div>
                )}
              </div>
              
              {/* Dot indicator for days with events */}
              {dayEvents.length > 0 && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full shadow-sm animate-pulse"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};