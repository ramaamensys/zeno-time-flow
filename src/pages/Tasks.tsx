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
import { Switch } from "@/components/ui/switch";
import { Plus, Calendar, Clock, Flag, CheckSquare, Trash2, Filter, User, X, ChevronRight, List, Edit, Check, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  parent_task_id?: string | null;
  completed?: boolean;
  completed_at?: string | null;
  profiles?: {
    full_name: string | null;
    email: string;
  };
  sub_tasks?: CalendarEvent[];
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubTaskDialogOpen, setIsSubTaskDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [parentTaskForSubTask, setParentTaskForSubTask] = useState<CalendarEvent | null>(null);
  const [filters, setFilters] = useState({
    teamMember: "all",
    priority: "all",
    dateRange: "all",
  });
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    priority: "medium",
    start_time: "",
    end_time: "",
    all_day: false,
    event_type: "task",
    is_primary_task: false,
    assigned_user_id: "", // For admin task assignment
  });

  const [newSubTask, setNewSubTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    start_time: "",
    end_time: "",
    all_day: false,
    event_type: "task",
    assigned_user_id: "", // For admin sub-task assignment
  });

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (user && userRole !== null) {
      fetchEvents();
      setupRealtimeSubscription();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'super_admin') {
      fetchTeamMembers();
    }
  }, [userRole]);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events'
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchUserRole = async () => {
    if (!user) {
      console.log("No user found for role fetch");
      return;
    }
    
    console.log("Fetching user role for:", user.id);
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    console.log("User roles data:", data);
    
    if (data && data.length > 0) {
      // Check for highest role priority: super_admin > admin > user
      const roles = data.map(item => item.role);
      if (roles.includes('super_admin')) {
        setUserRole('super_admin');
      } else if (roles.includes('admin')) {
        setUserRole('admin');
      } else {
        setUserRole('user');
      }
    } else {
      setUserRole('user');
    }
  };

  const fetchEvents = async () => {
    if (!user || userRole === null) return;
    
    // First get the events based on user role
    let eventsQuery = supabase.from("calendar_events").select("*");
    
    // Admin/super_admin see all tasks, regular users see only their own
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      eventsQuery = eventsQuery.eq('user_id', user.id);
    }
    // For admins, don't filter - show all events
    
    const { data: eventsData, error: eventsError } = await eventsQuery
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

    // Combine the data and organize into hierarchy
    const eventsWithProfiles = eventsData?.map(event => ({
      ...event,
      profiles: profilesData?.find(profile => profile.user_id === event.user_id) || null
    })) || [];

    // Organize events into hierarchical structure
    const primaryTasks = eventsWithProfiles.filter(event => !event.parent_task_id);
    const subTasks = eventsWithProfiles.filter(event => event.parent_task_id);

    // Attach sub-tasks to their parent tasks
    const tasksWithSubTasks = primaryTasks.map(task => ({
      ...task,
      sub_tasks: subTasks.filter(subTask => subTask.parent_task_id === task.id)
    }));

    setEvents(tasksWithSubTasks);
    setIsLoading(false);
  };

  const fetchTeamMembers = async () => {
    // Only fetch team members for admins
    if (userRole !== 'admin' && userRole !== 'super_admin') return;
    
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

    // Only apply filters for admins
    if (userRole === 'admin' || userRole === 'super_admin') {

      if (filters.teamMember && filters.teamMember !== "all") {
        filtered = filtered.filter(event => event.user_id === filters.teamMember);
      }

      if (filters.priority && filters.priority !== "all") {
        filtered = filtered.filter(event => event.priority === filters.priority);
      }

      if (filters.dateRange && filters.dateRange !== "all") {
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

    const eventData = {
      title: newEvent.title,
      description: newEvent.description || null,
      priority: newEvent.priority,
      // Convert datetime-local to proper timestamp without timezone conversion (optional now)
      start_time: newEvent.start_time ? new Date(newEvent.start_time).toISOString() : null,
      end_time: newEvent.end_time ? new Date(newEvent.end_time).toISOString() : (newEvent.start_time ? new Date(newEvent.start_time).toISOString() : null),
      all_day: newEvent.all_day,
      event_type: newEvent.event_type,
      // If admin is assigning task, use assigned_user_id, otherwise use current user
      user_id: (isAdminUser && newEvent.assigned_user_id) ? newEvent.assigned_user_id : user?.id,
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
        is_primary_task: false,
        assigned_user_id: "",
      });
      fetchEvents();
    }
  };

  const createSubTask = async () => {
    if (!newSubTask.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a sub-task title",
        variant: "destructive",
      });
      return;
    }

    if (!parentTaskForSubTask) {
      toast({
        title: "Parent task required",
        description: "No parent task selected for this sub-task",
        variant: "destructive",
      });
      return;
    }

    const subTaskData = {
      title: newSubTask.title,
      description: newSubTask.description || null,
      priority: newSubTask.priority,
      // Convert datetime-local to proper timestamp without timezone conversion (optional now)
      start_time: newSubTask.start_time ? new Date(newSubTask.start_time).toISOString() : null,
      end_time: newSubTask.end_time ? new Date(newSubTask.end_time).toISOString() : (newSubTask.start_time ? new Date(newSubTask.start_time).toISOString() : null),
      all_day: newSubTask.all_day,
      event_type: newSubTask.event_type,
      // Ensure the sub-task gets the same user_id as the parent task for RLS compliance
      user_id: parentTaskForSubTask.user_id,
      parent_task_id: parentTaskForSubTask.id,
    };

    const { error } = await supabase.from("calendar_events").insert([subTaskData]);

    if (error) {
      toast({
        title: "Error creating sub-task",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sub-task created",
        description: "Your sub-task has been created successfully",
      });
      setIsSubTaskDialogOpen(false);
      setNewSubTask({
        title: "",
        description: "",
        priority: "medium",
        start_time: "",
        end_time: "",
        all_day: false,
        event_type: "task",
        assigned_user_id: "",
      });
      setParentTaskForSubTask(null);
      fetchEvents();
    }
  };

  const openSubTaskDialog = (parentTask: CalendarEvent) => {
    setParentTaskForSubTask(parentTask);
    setIsSubTaskDialogOpen(true);
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

  const updateEvent = async (updatedEvent: CalendarEvent) => {
    const { error } = await supabase
      .from("calendar_events")
      .update({
        title: updatedEvent.title,
        description: updatedEvent.description,
        priority: updatedEvent.priority,
        start_time: updatedEvent.start_time,
        end_time: updatedEvent.end_time,
        all_day: updatedEvent.all_day,
        event_type: updatedEvent.event_type,
      })
      .eq("id", updatedEvent.id);

    if (error) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Task updated",
        description: "The task has been updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    }
  };

  const toggleTaskCompletion = async (eventId: string, completed: boolean) => {
    const { error } = await supabase
      .from("calendar_events")
      .update({
        completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", eventId);

    if (error) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: completed ? "Task completed" : "Task reopened",
        description: completed 
          ? "The task has been marked as completed" 
          : "The task has been reopened",
      });
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
      teamMember: "all",
      priority: "all",
      dateRange: "all",
    });
  };

  const hasActiveFilters = filters.teamMember !== "all" || filters.priority !== "all" || filters.dateRange !== "all";

  if (isLoading) {
    console.log("Tasks page loading...", { user, userRole });
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log("Tasks page rendering", { user, userRole, eventsCount: events.length, filteredEventsCount: filteredEvents.length });

  const isAdminUser = userRole === 'admin' || userRole === 'super_admin';

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
            <Button className="bg-black hover:bg-gray-800 text-white">
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to your calendar. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="primary-task"
                  checked={newEvent.is_primary_task}
                  onCheckedChange={(checked) => setNewEvent({ ...newEvent, is_primary_task: checked })}
                />
                <Label htmlFor="primary-task">Primary Task</Label>
              </div>

              {/* User Assignment - Only for Admins */}
              {isAdminUser && (
                <div className="grid gap-2">
                  <Label>Assign to User</Label>
                  <Select
                    value={newEvent.assigned_user_id}
                    onValueChange={(value) => setNewEvent({ ...newEvent, assigned_user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to myself" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user?.id ?? "self"}>Assign to myself</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.full_name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Enter task description"
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
                <Label htmlFor="start_time">Start Time (Optional)</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_time">End Time (Optional)</Label>
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
              <Button onClick={createEvent}>Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sub-task Creation Dialog */}
        <Dialog open={isSubTaskDialogOpen} onOpenChange={setIsSubTaskDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Sub-task</DialogTitle>
              <DialogDescription>
                Add a sub-task to "{parentTaskForSubTask?.title}". Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* User Assignment - Only for Admins */}
              {isAdminUser && (
                <div className="grid gap-2">
                  <Label>Assign to User</Label>
                  <Select
                    value={newSubTask.assigned_user_id}
                    onValueChange={(value) => setNewSubTask({ ...newSubTask, assigned_user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to myself" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user?.id ?? "self"}>Assign to myself</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.full_name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="sub-title">Title</Label>
                <Input
                  id="sub-title"
                  value={newSubTask.title}
                  onChange={(e) => setNewSubTask({ ...newSubTask, title: e.target.value })}
                  placeholder="Enter sub-task title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-description">Description</Label>
                <Textarea
                  id="sub-description"
                  value={newSubTask.description}
                  onChange={(e) => setNewSubTask({ ...newSubTask, description: e.target.value })}
                  placeholder="Enter sub-task description"
                />
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={newSubTask.priority}
                  onValueChange={(value) => setNewSubTask({ ...newSubTask, priority: value })}
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
                  value={newSubTask.event_type}
                  onValueChange={(value) => setNewSubTask({ ...newSubTask, event_type: value })}
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
                <Label htmlFor="sub-start_time">Start Time (Optional)</Label>
                <Input
                  id="sub-start_time"
                  type="datetime-local"
                  value={newSubTask.start_time}
                  onChange={(e) => setNewSubTask({ ...newSubTask, start_time: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-end_time">End Time (Optional)</Label>
                <Input
                  id="sub-end_time"
                  type="datetime-local"
                  value={newSubTask.end_time}
                  onChange={(e) => setNewSubTask({ ...newSubTask, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsSubTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createSubTask}>Create Sub-task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      
      {/* Admin Filters - Only show for admins */}
      {isAdminUser && (
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
                  onValueChange={(value) => setFilters({ ...filters, teamMember: value })}
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
                  onValueChange={(value) => setFilters({ ...filters, priority: value })}
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
                  onValueChange={(value) => setFilters({ ...filters, dateRange: value })}
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
      )}

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
            <div key={event.id} className="space-y-2">
              {/* Primary Task */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                     <div className="space-y-1 flex-1">
                       <div className="flex items-center space-x-2">
                         <CardTitle className="text-lg">{event.title}</CardTitle>
                         <Badge variant={getPriorityColor(event.priority)}>
                           <Flag className="w-3 h-3 mr-1" />
                           {event.priority}
                         </Badge>
                         <Badge variant={getEventTypeColor(event.event_type)}>
                           {event.event_type}
                         </Badge>
                         {/* Show "Assigned" badge if task was assigned by admin */}
                         {event.user_id !== user?.id && (
                           <Badge variant="outline" className="text-xs">
                             Assigned
                           </Badge>
                         )}
                       </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
       <Calendar className="w-4 h-4 mr-1" />
       {event.all_day ? (
         <>
           {format(new Date(event.start_time), "MMM dd, yyyy")}
           {event.end_time && event.end_time !== event.start_time && (
             <> - {format(new Date(event.end_time), "MMM dd, yyyy")}</>
           )}
         </>
       ) : (
         <>
           {(() => {
             // Parse the stored ISO string and treat it as if it were local time
             // This compensates for the timezone offset issue
             const startTime = new Date(event.start_time);
             const endTime = new Date(event.end_time);
             
             // Get timezone offset and adjust the display
             const timezoneOffset = startTime.getTimezoneOffset() * 60000;
             const adjustedStart = new Date(startTime.getTime() + timezoneOffset);
             const adjustedEnd = new Date(endTime.getTime() + timezoneOffset);
             
             return (
               <>
                 {format(adjustedStart, "MMM dd, h:mm a")}
                 {event.end_time && event.end_time !== event.start_time && (
                   <>
                     {" - "}
                     {adjustedStart.toDateString() === adjustedEnd.toDateString()
                       ? format(adjustedEnd, "h:mm a")
                       : format(adjustedEnd, "MMM dd, h:mm a")}
                   </>
                 )}
               </>
             );
           })()}
         </>
       )}
                         </div>
                         {/* Only show user info for admins */}
                         {isAdminUser && (
                           <div className="flex items-center">
                             <User className="w-4 h-4 mr-1" />
                             {event.profiles?.full_name || event.profiles?.email || "Unknown"}
                           </div>
                         )}
                       </div>
                     </div>
                     <div className="flex gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => toggleTaskCompletion(event.id, !event.completed)}
                         className={event.completed ? "bg-green-100 text-green-800" : ""}
                       >
                         <Check className="w-4 h-4 mr-1" />
                         {event.completed ? "Completed" : "Mark Complete"}
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           setSelectedEvent(event);
                           setIsEditDialogOpen(true);
                         }}
                       >
                         <Edit className="w-4 h-4 mr-1" />
                         Edit
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => openSubTaskDialog(event)}
                       >
                         <Plus className="w-4 h-4 mr-1" />
                         Add Sub-task
                       </Button>
                     </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Sub-tasks Collapsible */}
              {event.sub_tasks && event.sub_tasks.length > 0 && (
                <Collapsible className="ml-6">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start p-2">
                      <ChevronDown className="h-4 w-4 mr-2" />
                      <span>Sub-tasks ({event.sub_tasks.length})</span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2">
                    {event.sub_tasks.map((subTask) => (
                      <Card 
                        key={subTask.id} 
                        className="hover:shadow-sm transition-shadow bg-muted/30 border-l-4 border-l-primary"
                      >
                        <CardHeader className="py-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center space-x-2">
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                <CardTitle className={`text-base ${subTask.completed ? 'line-through opacity-60' : ''}`}>
                                  {subTask.title}
                                </CardTitle>
                                <Badge variant={getPriorityColor(subTask.priority)} className="text-xs">
                                  {subTask.priority}
                                </Badge>
                                {subTask.completed && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    Completed
                                  </Badge>
                                )}
                              </div>
                              {subTask.start_time && (
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground ml-6">
                                  <div className="flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {subTask.all_day ? (
                                      <>
                                        {format(new Date(subTask.start_time), "MMM dd")}
                                        {subTask.end_time && subTask.end_time !== subTask.start_time && (
                                          <> - {format(new Date(subTask.end_time), "MMM dd")}</>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {(() => {
                                          const startTime = new Date(subTask.start_time);
                                          const endTime = new Date(subTask.end_time);
                                          const timezoneOffset = startTime.getTimezoneOffset() * 60000;
                                          const adjustedStart = new Date(startTime.getTime() + timezoneOffset);
                                          const adjustedEnd = new Date(endTime.getTime() + timezoneOffset);
                                          
                                          return (
                                            <>
                                              {format(adjustedStart, "MMM dd, h:mm a")}
                                              {subTask.end_time && subTask.end_time !== subTask.start_time && (
                                                <>
                                                  {" - "}
                                                  {adjustedStart.toDateString() === adjustedEnd.toDateString()
                                                    ? format(adjustedEnd, "h:mm a")
                                                    : format(adjustedEnd, "MMM dd, h:mm a")}
                                                </>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleTaskCompletion(subTask.id, !subTask.completed)}
                                className={subTask.completed ? "bg-green-100 text-green-800" : ""}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                {subTask.completed ? "Done" : "Complete"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedEvent(subTask);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ))
        )}
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between pr-12">
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
                         {(() => {
                           const startTime = new Date(selectedEvent.start_time);
                           const endTime = new Date(selectedEvent.end_time);
                           const timezoneOffset = startTime.getTimezoneOffset() * 60000;
                           const adjustedStart = new Date(startTime.getTime() + timezoneOffset);
                           const adjustedEnd = new Date(endTime.getTime() + timezoneOffset);
                           
                           return (
                             <>
                               {format(adjustedStart, "EEEE, MMMM dd, yyyy 'at' h:mm a")}
                               {selectedEvent.end_time && selectedEvent.end_time !== selectedEvent.start_time && (
                                 <> - {format(adjustedEnd, "h:mm a")}</>
                               )}
                             </>
                           );
                         })()}
                       </>
                     )}
                   </p>
                 </div>

                 {/* Only show creator info for admins */}
                 {isAdminUser && (
                   <div>
                     <Label className="text-sm font-medium">Created by</Label>
                     <div className="flex items-center mt-1">
                       <User className="w-4 h-4 mr-2" />
                       <span className="text-sm">
                         {selectedEvent.profiles?.full_name || selectedEvent.profiles?.email || "Unknown"}
                       </span>
                     </div>
                   </div>
                 )}

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

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>
                  Update the details of "{selectedEvent.title}".
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={selectedEvent.title}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
                    placeholder="Enter task title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={selectedEvent.description || ""}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
                    placeholder="Enter task description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select
                    value={selectedEvent.priority}
                    onValueChange={(value) => setSelectedEvent({ ...selectedEvent, priority: value })}
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
                    value={selectedEvent.event_type}
                    onValueChange={(value) => setSelectedEvent({ ...selectedEvent, event_type: value })}
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
                  <Label htmlFor="edit-start_time">Start Time</Label>
                  <Input
                    id="edit-start_time"
                    type="datetime-local"
                    value={selectedEvent.start_time ? format(new Date(selectedEvent.start_time), "yyyy-MM-dd'T'HH:mm") : ""}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, start_time: new Date(e.target.value).toISOString() })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-end_time">End Time</Label>
                  <Input
                    id="edit-end_time"
                    type="datetime-local"
                    value={selectedEvent.end_time ? format(new Date(selectedEvent.end_time), "yyyy-MM-dd'T'HH:mm") : ""}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, end_time: new Date(e.target.value).toISOString() })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => updateEvent(selectedEvent)}>
                  Update Task
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
