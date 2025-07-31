import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, Flag, CheckSquare, Trash2, Filter, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface TeamMember {
  user_id: string;
  full_name: string | null;
  email: string;
}

const Tasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    teamMember: "",
    priority: "",
    dateRange: "",
  });
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    priority: "medium",
    start_time: "",
    end_time: "",
    all_day: false,
    event_type: "task",
  });

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchTeamMembers();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const fetchEvents = async () => {
    // First get the events
    const { data: eventsData, error: eventsError } = await supabase
      .from("calendar_events")
      .select("*")
      .order("start_time", { ascending: true });

    if (eventsError) {
      toast({
        title: "Error fetching events",
        description: eventsError.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Then get the profiles for the users
    const userIds = [...new Set(eventsData?.map(event => event.user_id) || [])];
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    // Combine the data
    const eventsWithProfiles = eventsData?.map(event => ({
      ...event,
      profiles: profilesData?.find(profile => profile.user_id === event.user_id) || null
    })) || [];

    setEvents(eventsWithProfiles);
    setIsLoading(false);
  };

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email");

    if (error) {
      console.error("Error fetching team members:", error);
    } else {
      setTeamMembers(data || []);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    if (filters.teamMember) {
      filtered = filtered.filter(event => event.user_id === filters.teamMember);
    }

    if (filters.priority) {
      filtered = filtered.filter(event => event.priority === filters.priority);
    }

    if (filters.dateRange) {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      switch (filters.dateRange) {
        case "today":
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.start_time);
            const startOfEventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
            return startOfEventDay.getTime() === startOfToday.getTime();
          });
          break;
        case "week":
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.start_time);
            return eventDate >= today && eventDate <= weekFromNow;
          });
          break;
        case "month":
          const monthFromNow = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.start_time);
            return eventDate >= today && eventDate <= monthFromNow;
          });
          break;
      }
    }

    setFilteredEvents(filtered);
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
      priority: newEvent.priority,
      start_time: newEvent.start_time,
      end_time: newEvent.end_time || newEvent.start_time,
      all_day: newEvent.all_day,
      event_type: newEvent.event_type,
      user_id: user?.id,
    };

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
      setIsDialogOpen(false);
      setNewEvent({
        title: "",
        description: "",
        priority: "medium",
        start_time: "",
        end_time: "",
        all_day: false,
        event_type: "task",
      });
      fetchEvents();
    }
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
        description: "The event has been deleted successfully",
      });
      setIsDetailDialogOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "task": return "default";
      case "meeting": return "outline";
      case "reminder": return "secondary";
      default: return "secondary";
    }
  };

  const clearFilters = () => {
    setFilters({
      teamMember: "",
      priority: "",
      dateRange: "",
    });
  };

  const hasActiveFilters = filters.teamMember || filters.priority || filters.dateRange;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and events in one place
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>
                Add a new event to your calendar. Fill in the details below.
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
                />
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
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={newEvent.end_time}
                  onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createEvent}>Create Event</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Team Member</Label>
              <Select
                value={filters.teamMember}
                onValueChange={(value) => setFilters({ ...filters, teamMember: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All team members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All team members</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={filters.priority}
                onValueChange={(value) => setFilters({ ...filters, priority: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters({ ...filters, dateRange: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="grid gap-4">
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">
                {hasActiveFilters ? "No tasks match your filters" : "No events yet"}
              </CardTitle>
              <CardDescription className="text-center">
                {hasActiveFilters 
                  ? "Try adjusting your filters to see more tasks"
                  : "Create your first event to get started with your productivity journey"
                }
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <Card 
              key={event.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedEvent(event);
                setIsDetailDialogOpen(true);
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {event.all_day ? (
                          format(new Date(event.start_time), "MMM dd, yyyy")
                        ) : (
                          format(new Date(event.start_time), "MMM dd, h:mm a")
                        )}
                      </div>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {event.profiles?.full_name || event.profiles?.email || "Unknown"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  {selectedEvent.title}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteEvent(selectedEvent.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedEvent.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <div className="mt-1">
                      <Badge variant={getPriorityColor(selectedEvent.priority)}>
                        <Flag className="w-3 h-3 mr-1" />
                        {selectedEvent.priority}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <div className="mt-1">
                      <Badge variant={getEventTypeColor(selectedEvent.event_type)}>
                        {selectedEvent.event_type}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Date & Time</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedEvent.all_day ? (
                      format(new Date(selectedEvent.start_time), "EEEE, MMMM dd, yyyy")
                    ) : (
                      <>
                        {format(new Date(selectedEvent.start_time), "EEEE, MMMM dd, yyyy 'at' h:mm a")}
                        {selectedEvent.end_time && selectedEvent.end_time !== selectedEvent.start_time && (
                          <> - {format(new Date(selectedEvent.end_time), "h:mm a")}</>
                        )}
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Created by</Label>
                  <div className="flex items-center mt-1">
                    <User className="w-4 h-4 mr-2" />
                    <span className="text-sm">
                      {selectedEvent.profiles?.full_name || selectedEvent.profiles?.email || "Unknown"}
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Created on</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(selectedEvent.created_at), "MMMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;