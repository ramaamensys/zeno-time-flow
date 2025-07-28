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
  created_at: string;
}

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onTimeSlotClick: (date: Date, hour: number) => void;
}

export const WeekView = ({ currentDate, events, onTimeSlotClick }: WeekViewProps) => {
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
                  {slotEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-xs p-1 rounded text-white mb-1 truncate",
                        getEventTypeColor(event.event_type)
                      )}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};