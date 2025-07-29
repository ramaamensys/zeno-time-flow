import { format, isToday } from "date-fns";
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

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onTimeSlotClick: (hour: number) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export const DayView = ({ currentDate, events, onTimeSlotClick, onEditEvent, onDeleteEvent }: DayViewProps) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      const eventHour = eventDate.getHours();
      const isSameDay = eventDate.toDateString() === currentDate.toDateString();
      return isSameDay && eventHour === hour;
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
      <div className="p-4 bg-muted border-b">
        <div className="text-sm text-muted-foreground">{format(currentDate, "EEEE")}</div>
        <div className={cn(
          "text-2xl font-bold",
          isToday(currentDate) && "text-primary"
        )}>
          {format(currentDate, "MMMM d, yyyy")}
        </div>
      </div>

      {/* Time slots */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div key={hour} className="flex border-b border-border">
              <div className="w-20 p-3 text-xs text-muted-foreground text-right bg-muted/50 border-r">
                {format(new Date().setHours(hour, 0, 0, 0), "h a")}
              </div>
              <div
                className="flex-1 min-h-[80px] p-2 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onTimeSlotClick(hour)}
              >
                <div className="space-y-1">
                  {hourEvents.map((event) => {
                    const isOverdue = isEventOverdue(event);
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "p-2 rounded text-white cursor-pointer hover:opacity-80",
                          getPriorityColor(event.priority, isOverdue)
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEvent?.(event);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onDeleteEvent?.(event.id);
                        }}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {event.priority} priority{isOverdue ? ' - OVERDUE' : ''}
                        </div>
                        {event.description && (
                          <div className="text-xs opacity-90 mt-1">{event.description}</div>
                        )}
                        <div className="text-xs opacity-75 mt-1">
                          {format(new Date(event.start_time), "h:mm a")} - {format(new Date(event.end_time), "h:mm a")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};