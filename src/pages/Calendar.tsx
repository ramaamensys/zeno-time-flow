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
import { Plus, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const Calendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    all_day: false,
    event_type: "other",
  });

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .order("start_time", { ascending: true });

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

    const eventData = {
      title: newEvent.title,
      description: newEvent.description || null,
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
        start_time: "",
        end_time: "",
        all_day: false,
        event_type: "other",
      });
      fetchEvents();
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "meeting": return "default";
      case "task": return "secondary";
      case "personal": return "outline";
      case "other": return "destructive";
      default: return "default";
    }
  };

  const formatDateTime = (dateTime: string, allDay: boolean) => {
    const date = new Date(dateTime);
    if (allDay) {
      return date.toLocaleDateString();
    }
    return date.toLocaleString();
  };

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
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            Schedule and manage your events
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Event
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
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createEvent}>Create Event</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No events scheduled</CardTitle>
              <CardDescription className="text-center">
                Create your first event to start organizing your schedule
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    {event.description && (
                      <CardDescription>{event.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant={getEventTypeColor(event.event_type)}>
                    {event.event_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {formatDateTime(event.start_time, event.all_day)}
                  </div>
                  {!event.all_day && event.end_time && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(event.end_time).toLocaleTimeString()}
                    </div>
                  )}
                  {event.all_day && (
                    <Badge variant="outline">All Day</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Calendar;