import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, eachHourOfInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

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
}

export const WeekView = ({ currentDate, events, onTimeSlotClick, onEditEvent, onDeleteEvent }: WeekViewProps) => {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForTimeSlot = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      const eventHour = eventDate.getHours();
      return isSameDay(eventDate, date) && eventHour === hour;
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
                          getPriorityColor(event.priority, isOverdue)
                        )}
                        title={`${event.title} (${event.priority} priority)${isOverdue ? ' - OVERDUE' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEvent?.(event);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onDeleteEvent?.(event.id);
                        }}
                      >
                        {event.title}
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