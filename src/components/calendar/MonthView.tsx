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
    const baseClasses = "rounded-md px-3 py-1 text-xs font-medium text-white";
    
    if (isOverdue) {
      return `${baseClasses} bg-red-500`;
    }
    
    switch (event.priority) {
      case "urgent":
        return `${baseClasses} bg-red-500`;
      case "high":
        return `${baseClasses} bg-orange-500`;
      case "medium":
        return `${baseClasses} bg-blue-500`;
      case "low":
        return `${baseClasses} bg-green-500`;
      default:
        return `${baseClasses} bg-gray-500`;
    }
  };

  const isEventOverdue = (event: CalendarEvent) => {
    const now = new Date();
    const eventDate = new Date(event.start_time);
    return eventDate < now && !event.all_day;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="grid grid-cols-7">
        {/* Header row */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
          <div key={day} className="bg-gray-50 border-b border-gray-200 p-3 text-center font-medium text-gray-600 text-sm">
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
                "min-h-[120px] p-2 border-b border-r border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors relative",
                !isCurrentMonth && "bg-gray-50/50 text-gray-400",
                isCurrentDay && "bg-blue-50"
              )}
              onClick={() => onDateClick(date)}
            >
              <div className={cn(
                "text-sm font-medium mb-2 w-7 h-7 flex items-center justify-center rounded-full",
                isCurrentDay && "bg-blue-500 text-white"
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
                        "truncate cursor-pointer hover:opacity-90 transition-opacity"
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
                          {event.title}
                        </span>
                        {getUserName && (
                          <span className="text-xs opacity-80 ml-1">
                            {getUserName(event.user_id)?.split(' ')[0] || 'User'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-600">
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