import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, eachHourOfInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
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

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onTimeSlotClick: (date: Date, hour: number) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onUserEventClick?: (userId: string) => void;
  getUserName?: (userId: string) => string;
}

export const WeekView = ({ currentDate, events, onTimeSlotClick, onEditEvent, onDeleteEvent, onUserEventClick, getUserName }: WeekViewProps) => {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForTimeSlot = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      
      return isSameDay(eventStart, date) && 
             eventStart < slotEnd && 
             eventEnd > slotStart;
    });
  };

  const getEventStyling = (event: CalendarEvent, isOverdue: boolean) => {
    const userColor = getUserColor(event.user_id);
    const priorityOverlay = getPriorityOverlay(event.priority, isOverdue);
    return `${userColor} ${priorityOverlay}`;
  };

  const isEventOverdue = (event: CalendarEvent) => {
    const now = new Date();
    const eventDate = new Date(event.start_time);
    return eventDate < now && !event.all_day;
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-3 bg-muted"></div>
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="p-3 text-center bg-muted border-l">
            <div className="text-sm text-muted-foreground">{format(day, "EEE")}</div>
            <div className={cn(
              "text-lg font-semibold",
              isToday(day) && "text-primary"
            )}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-border">
            <div className="p-2 text-xs text-muted-foreground text-right bg-muted/50 border-r">
              {format(new Date().setHours(hour, 0, 0, 0), "h a")}
            </div>
            {weekDays.map((day) => {
              const slotEvents = getEventsForTimeSlot(day, hour);
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="min-h-[60px] p-1 border-l border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => onTimeSlotClick(day, hour)}
                >
                  {slotEvents.map((event) => {
                    const isOverdue = isEventOverdue(event);
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "text-xs p-1 rounded text-white mb-1 truncate cursor-pointer hover:opacity-80",
                          getEventStyling(event, isOverdue)
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
                            <span className="text-xs opacity-75">
                              {getUserName(event.user_id).split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};