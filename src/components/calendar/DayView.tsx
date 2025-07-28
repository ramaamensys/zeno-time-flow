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
  created_at: string;
}

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onTimeSlotClick: (hour: number) => void;
}

export const DayView = ({ currentDate, events, onTimeSlotClick }: DayViewProps) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      const eventHour = eventDate.getHours();
      const isSameDay = eventDate.toDateString() === currentDate.toDateString();
      return isSameDay && eventHour === hour;
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
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-2 rounded text-white",
                        getEventTypeColor(event.event_type)
                      )}
                    >
                      <div className="font-medium">{event.title}</div>
                      {event.description && (
                        <div className="text-xs opacity-90 mt-1">{event.description}</div>
                      )}
                      <div className="text-xs opacity-75 mt-1">
                        {format(new Date(event.start_time), "h:mm a")} - {format(new Date(event.end_time), "h:mm a")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};