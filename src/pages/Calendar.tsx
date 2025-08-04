import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import DailyQuote from "@/components/DailyQuote";
import { format } from "date-fns";

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


const Calendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    all_day: false,
    event_type: "other",
    priority: "medium",
  });

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchEvents();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    setUserRole(roleData?.role || null);
    
    // If user is super_admin or admin, fetch all user profiles
    if (roleData?.role === "super_admin" || roleData?.role === "admin") {
      fetchUserProfiles();
    }
  };

  const fetchUserProfiles = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email");

    if (profiles) {
      const profileMap: Record<string, string> = {};
      profiles.forEach(profile => {
        profileMap[profile.user_id] = profile.full_name || profile.email || "Unknown User";
      });
      setUserProfiles(profileMap);
    }
  };

  const fetchEvents = async () => {
    if (!user) return;

    // Check if user is super_admin or admin to see all events
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    let query = supabase
      .from("calendar_events")
      .select("*")
      .order("start_time", { ascending: true });

    // If not super_admin or admin, only show their own events
    if (roleData?.role !== "super_admin" && roleData?.role !== "admin") {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error fetching events",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  };

  const createEvent = async () => {
    if (!newEvent.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter an event title",
        variant: "destructive",
      });
      return;
    }

    if (!newEvent.start_time) {
      toast({
        title: "Start time required",
        description: "Please select a start time",
        variant: "destructive",
      });
      return;
    }

    // Convert local datetime to ISO string to preserve timezone
    const startTime = new Date(newEvent.start_time).toISOString();
    const endTime = newEvent.end_time ? new Date(newEvent.end_time).toISOString() : startTime;

    const eventData = {
      title: newEvent.title,
      description: newEvent.description || null,
      start_time: startTime,
      end_time: endTime,
      all_day: newEvent.all_day,
      event_type: newEvent.event_type,
      priority: newEvent.priority,
      user_id: user?.id,
    };

    if (editingEvent) {
      const { error } = await supabase
        .from("calendar_events")
        .update(eventData)
        .eq("id", editingEvent.id);

      if (error) {
        toast({
          title: "Error updating event",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Event updated",
          description: "Your event has been updated successfully",
        });
      }
    } else {
      const { error } = await supabase.from("calendar_events").insert([eventData]);

      if (error) {
        toast({
          title: "Error creating event",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Event created",
          description: "Your event has been created successfully",
        });
      }
    }

    setIsDialogOpen(false);
    setNewEvent({
      title: "",
      description: "",
      start_time: "",
      end_time: "",
      all_day: false,
      event_type: "other",
      priority: "medium",
    });
    setEditingEvent(null);
    fetchEvents(); // This will refresh events with updated times and trigger re-render
  };


  const deleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      toast({
        title: "Error deleting event",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Event deleted",
        description: "Your event has been deleted successfully",
      });
      fetchEvents();
      setIsDialogOpen(false);
      setEditingEvent(null);
    }
  };

  const toggleEventCompletion = async (eventId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("calendar_events")
      .update({ completed: !currentStatus })
      .eq("id", eventId);

    if (error) {
      toast({
        title: "Error updating event",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: !currentStatus ? "Event completed" : "Event marked incomplete",
        description: !currentStatus ? "Your event has been marked as completed" : "Your event has been marked as incomplete",
      });
      fetchEvents();
    }
  };

  const editEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description || "",
      start_time: format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"),
      all_day: event.all_day,
      event_type: event.event_type,
      priority: event.priority,
    });
    setIsDialogOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedHour(null);
    setEditingEvent(null); // Reset editing event when clicking on a date
    openEventDialog(date);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setEditingEvent(null); // Reset editing event when clicking on a time slot
    openEventDialog(date, hour);
  };

  const handleDayTimeSlotClick = (hour: number) => {
    setSelectedHour(hour);
    setEditingEvent(null); // Reset editing event when clicking on a time slot
    openEventDialog(currentDate, hour);
  };

  const openEventDialog = (date?: Date, hour?: number) => {
    // Reset form to default values
    const defaultEvent = {
      title: "",
      description: "",
      start_time: "",
      end_time: "",
      all_day: false,
      event_type: "other",
      priority: "medium",
    };
    
    if (date) {
      const dateTime = new Date(date);
      if (hour !== undefined) {
        dateTime.setHours(hour, 0, 0, 0);
      } else {
        // Use current time when no hour is specified (for monthly view)
        const now = new Date();
        dateTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
      }
      setNewEvent({
        ...defaultEvent,
        start_time: format(dateTime, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(dateTime.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
      });
    } else {
      // Default to current date and time when no specific date is selected
      const now = new Date();
      setNewEvent({
        ...defaultEvent,
        start_time: format(now, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(now.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
      });
    }
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DailyQuote />
      
      <CalendarHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        view={view}
        onViewChange={setView}
        onNewEvent={() => openEventDialog()}
      />

      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          events={events}
          onDateClick={handleDateClick}
          onEditEvent={editEvent}
          onDeleteEvent={deleteEvent}
        />
      )}

      {view === "week" && (
        <WeekView
          currentDate={currentDate}
          events={events}
          onTimeSlotClick={handleTimeSlotClick}
          onEditEvent={editEvent}
          onDeleteEvent={deleteEvent}
          onToggleComplete={toggleEventCompletion}
          getUserName={(userId) => userProfiles[userId]}
        />
      )}

      {view === "day" && (
        <DayView
          currentDate={currentDate}
          events={events}
          onTimeSlotClick={handleDayTimeSlotClick}
          onEditEvent={editEvent}
          onDeleteEvent={deleteEvent}
          onToggleComplete={toggleEventCompletion}
          getUserName={(userId) => userProfiles[userId]}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
            <DialogDescription>
              {editingEvent ? "Edit the event details below." : "Add a new event to your calendar. Fill in the details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editingEvent && (userRole === "super_admin" || userRole === "admin") && (
              <div className="grid gap-2">
                <Label>Created By</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {userProfiles[editingEvent.user_id] || "Unknown User"}
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Enter event title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Enter event description"
                className="min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Event Type</Label>
                <Select
                  value={newEvent.event_type}
                  onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={newEvent.priority}
                  onValueChange={(value) => setNewEvent({ ...newEvent, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                />
              </div>
              {!newEvent.all_day && (
                <div className="grid gap-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={newEvent.all_day}
                  onChange={(e) => setNewEvent({ ...newEvent, all_day: e.target.checked })}
                />
                <Label htmlFor="all_day">All day event</Label>
              </div>
              {editingEvent && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="completed"
                    checked={editingEvent.completed}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, completed: e.target.checked });
                      toggleEventCompletion(editingEvent.id, editingEvent.completed);
                    }}
                  />
                  <Label htmlFor="completed">Mark as completed</Label>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="flex gap-2">
              {editingEvent && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      Delete Event
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Event</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{editingEvent.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteEvent(editingEvent.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={createEvent} className="w-full sm:w-auto">{editingEvent ? "Update Event" : "Create Event"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;