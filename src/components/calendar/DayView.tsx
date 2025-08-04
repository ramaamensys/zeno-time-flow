import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { getUserColor, getPriorityOverlay } from "@/utils/userColors";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  completed: boolean;
}

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onTimeSlotClick: (hour: number) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onToggleComplete?: (eventId: string, currentStatus: boolean) => void;
  onUserEventClick?: (userId: string) => void;
  getUserName?: (userId: string) => string;
}

export const DayView = ({ currentDate, events, onTimeSlotClick, onEditEvent, onDeleteEvent, onToggleComplete, onUserEventClick, getUserName }: DayViewProps) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      const eventHour = eventDate.getHours();
      const isSameDay = eventDate.toDateString() === currentDate.toDateString();
      // Only show event in its starting hour slot
      return isSameDay && eventHour === hour;
    });
  };

  const getEventHeight = (event: CalendarEvent) => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    const durationHours = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);
    // Each hour slot is 80px, so multiply duration by 80px per hour
    return Math.max(80, durationHours * 80);
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
                className="flex-1 min-h-[80px] p-2 hover:bg-muted/30 cursor-pointer transition-colors relative"
                onClick={() => onTimeSlotClick(hour)}
              >
                {hourEvents.map((event) => {
                  const isOverdue = isEventOverdue(event);
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "p-2 rounded text-gray-800 cursor-pointer hover:opacity-80 absolute left-2 right-2 z-10",
                        getEventStyling(event, isOverdue)
                      )}
                      style={{ height: `${getEventHeight(event)}px` }}
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
                        <span className={cn("font-medium", event.completed && "line-through opacity-60")}>{event.title}</span>
                        <div className="flex items-center gap-1">
                          {getUserName && (
                            <span className="text-xs opacity-75">
                              {getUserName(event.user_id)}
                            </span>
                          )}
                          <Button
                            size="icon"
                            variant={event.completed ? "default" : "secondary"}
                            className={cn(
                              "h-6 w-6 flex-shrink-0 bg-white/90 hover:bg-white border border-gray-300 shadow-sm",
                              event.completed && "bg-green-500 border-green-500 text-white hover:bg-green-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleComplete?.(event.id, event.completed);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        {event.priority} priority{isOverdue ? ' - OVERDUE' : ''}{event.completed ? ' - COMPLETED' : ''}
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
          );
        })}
      </div>
    </div>
  );
};