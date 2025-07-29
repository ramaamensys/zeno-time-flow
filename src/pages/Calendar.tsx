import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import DailyQuote from "@/components/DailyQuote";
import { format } from "date-fns";
import { Filter, X } from "lucide-react";

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

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  user_id: string;
}

const Calendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priority: "",
    eventType: "",
    userId: "",
  });
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
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [allEvents, filters]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    setUserRole(data?.role || "user");
  };

  const fetchUsers = async () => {
    if (!user) return;
    
    // Only fetch users if current user is super_admin or admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role === "super_admin" || roleData?.role === "admin") {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, user_id")
        .order("full_name");

      if (!error) {
        setUsers(data || []);
      }
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
      setAllEvents(data || []);
    }
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filteredEvents = [...allEvents];

    if (filters.priority) {
      filteredEvents = filteredEvents.filter(event => event.priority === filters.priority);
    }

    if (filters.eventType) {
      filteredEvents = filteredEvents.filter(event => event.event_type === filters.eventType);
    }

    if (filters.userId) {
      filteredEvents = filteredEvents.filter(event => event.user_id === filters.userId);
    }

    setEvents(filteredEvents);
  };

  const clearFilters = () => {
    setFilters({
      priority: "",
      eventType: "",
      userId: "",
    });
  };

  const handleUserEventClick = (userId: string) => {
    setFilters(prev => ({ ...prev, userId }));
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

    const eventData = {
      title: newEvent.title,
      description: newEvent.description || null,
      start_time: newEvent.start_time,
      end_time: newEvent.end_time || newEvent.start_time,
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
    fetchEvents();
  };

  const getUserName = (userId: string) => {
    const userProfile = users.find(u => u.user_id === userId);
    return userProfile?.full_name || userProfile?.email || "Unknown User";
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
    openEventDialog(date);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    openEventDialog(date, hour);
  };

  const handleDayTimeSlotClick = (hour: number) => {
    setSelectedHour(hour);
    openEventDialog(currentDate, hour);
  };

  const openEventDialog = (date?: Date, hour?: number) => {
    if (date) {
      const dateTime = new Date(date);
      if (hour !== undefined) {
        dateTime.setHours(hour, 0, 0, 0);
      }
      setNewEvent({
        ...newEvent,
        start_time: format(dateTime, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(dateTime.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
      });
    }
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <DailyQuote />
      
      <CalendarHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        view={view}
        onViewChange={setView}
        onNewEvent={() => openEventDialog()}
      />

      {/* Filters section - Only for super_admin and admin */}
      {(userRole === "super_admin" || userRole === "admin") && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Filters</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? "Hide" : "Show"}
              </Button>
            </div>
            
            {showFilters && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={filters.priority}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All priorities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Event Type</Label>
                    <Select
                      value={filters.eventType}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, eventType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All types</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>User</Label>
                    <Select
                      value={filters.userId}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All users</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                </div>
                
                {(filters.priority || filters.eventType || filters.userId) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {filters.priority && (
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                        Priority: {filters.priority}
                      </span>
                    )}
                    {filters.eventType && (
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                        Type: {filters.eventType}
                      </span>
                    )}
                    {filters.userId && (
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                        User: {getUserName(filters.userId)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          events={events}
          onDateClick={handleDateClick}
          onEditEvent={editEvent}
          onDeleteEvent={deleteEvent}
          onUserEventClick={(userRole === "super_admin" || userRole === "admin") ? handleUserEventClick : undefined}
          getUserName={(userRole === "super_admin" || userRole === "admin") ? getUserName : undefined}
        />
      )}

      {view === "week" && (
        <WeekView
          currentDate={currentDate}
          events={events}
          onTimeSlotClick={handleTimeSlotClick}
          onEditEvent={editEvent}
          onDeleteEvent={deleteEvent}
          onUserEventClick={(userRole === "super_admin" || userRole === "admin") ? handleUserEventClick : undefined}
          getUserName={(userRole === "super_admin" || userRole === "admin") ? getUserName : undefined}
        />
      )}

      {view === "day" && (
        <DayView
          currentDate={currentDate}
          events={events}
          onTimeSlotClick={handleDayTimeSlotClick}
          onEditEvent={editEvent}
          onDeleteEvent={deleteEvent}
          onUserEventClick={(userRole === "super_admin" || userRole === "admin") ? handleUserEventClick : undefined}
          getUserName={(userRole === "super_admin" || userRole === "admin") ? getUserName : undefined}
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
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="all_day"
                checked={newEvent.all_day}
                onChange={(e) => setNewEvent({ ...newEvent, all_day: e.target.checked })}
              />
              <Label htmlFor="all_day">All day event</Label>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={createEvent} className="w-full sm:w-auto">{editingEvent ? "Update Event" : "Create Event"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;