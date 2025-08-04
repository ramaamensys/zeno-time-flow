import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, eachHourOfInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { getEventColor, getPriorityOverlay } from "@/utils/userColors";
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

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onTimeSlotClick: (date: Date, hour: number) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onToggleComplete?: (eventId: string, currentStatus: boolean) => void;
  onUserEventClick?: (userId: string) => void;
  getUserName?: (userId: string) => string;
}

export const WeekView = ({ currentDate, events, onTimeSlotClick, onEditEvent, onDeleteEvent, onToggleComplete, onUserEventClick, getUserName }: WeekViewProps) => {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForTimeSlot = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      
      // Only show event in its starting hour slot - check if event starts within this hour
      return isSameDay(eventStart, date) && 
             eventStart.getHours() === hour;
    });
  };

  const getEventHeight = (event: CalendarEvent) => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    const durationHours = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);
    // Each hour slot is 60px, so multiply duration by 60px per hour
    return Math.max(60, durationHours * 60);
  };

  const getEventStyling = (event: CalendarEvent, isOverdue: boolean) => {
    const eventColor = getEventColor(event.start_time, event.priority);
    const priorityOverlay = getPriorityOverlay(event.priority, isOverdue);
    return `${eventColor} ${priorityOverlay}`;
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
                  className="min-h-[60px] p-1 border-l border-border hover:bg-muted/30 cursor-pointer transition-colors relative"
                  onClick={() => onTimeSlotClick(day, hour)}
                >
                  {slotEvents.map((event) => {
                    const isOverdue = isEventOverdue(event);
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "text-xs p-1 rounded text-gray-800 mb-1 truncate cursor-pointer hover:opacity-80 absolute left-1 right-1 z-10",
                          getEventStyling(event, isOverdue)
                        )}
                        style={{ height: `${getEventHeight(event)}px` }}
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
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn("truncate text-xs", event.completed && "line-through opacity-60")}>{event.title}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {getUserName && (
                              <span className="text-xs opacity-75">
                                {getUserName(event.user_id).split(' ')[0]}
                              </span>
                            )}
                            <Button
                              size="icon"
                              variant={event.completed ? "default" : "secondary"}
                              className={cn(
                                "h-5 w-5 bg-white/90 hover:bg-white border border-gray-300 shadow-sm",
                                event.completed && "bg-green-500 border-green-500 text-white hover:bg-green-600"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleComplete?.(event.id, event.completed);
                              }}
                            >
                              <Check className="h-2.5 w-2.5" />
                            </Button>
                          </div>
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