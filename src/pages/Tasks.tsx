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
import { Plus, Calendar, Clock, Flag, CheckSquare, Trash2, Filter, User, X, ChevronRight, List, Edit, Check, ChevronDown, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { AdminTaskCard } from "@/components/AdminTaskCard";
import { Progress } from "@/components/ui/progress";
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
  template_id?: string | null;
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

interface TemplateTask {
  id: string;
  template_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date: string;
  created_at: string;
}

interface LearningTemplate {
  id: string;
  name: string;
  description: string;
  technology: string;
}

interface TemplateWithTasks {
  template: LearningTemplate;
  tasks: TemplateTask[];
}

const Tasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [templatesWithTasks, setTemplatesWithTasks] = useState<TemplateWithTasks[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubTaskDialogOpen, setIsSubTaskDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [parentTaskForSubTask, setParentTaskForSubTask] = useState<CalendarEvent | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
      const cleanup = setupRealtimeSubscription();
      // Fetch templates for users only
      if (userRole === 'user') {
        fetchUserTemplateTasks();
      }
      
      // Setup page visibility change listener for refresh
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('Page became visible, refreshing tasks...');
          refreshData();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        cleanup();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
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
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'calendar_events'
        },
        (payload) => {
          console.log('Real-time event received:', payload);
          // Force refresh when any calendar_events change occurs
          setTimeout(() => {
            refreshData();
          }, 500); // Small delay to ensure database consistency
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const refreshData = async () => {
    console.log('Refreshing all task data...');
    await fetchEvents();
    if (userRole === 'user') {
      await fetchUserTemplateTasks();
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    toast({
      title: "Refreshed",
      description: "Task data has been refreshed",
    });
    setTimeout(() => setIsRefreshing(false), 1000);
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
      user_id: (isAdminUser && newEvent.assigned_user_id && newEvent.assigned_user_id !== "self") ? newEvent.assigned_user_id : user?.id,
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

    // For RLS compliance: 
    // - If current user is the parent task owner, use current user's ID
    // - If admin is creating sub-task for another user, use admin's ID but assign to parent task
    const currentUserId = user?.id;
    const taskOwnerId = parentTaskForSubTask.user_id;
    
    // Check if current user can create sub-task for this parent
    if (!isAdminUser && currentUserId !== taskOwnerId) {
      toast({
        title: "Permission denied",
        description: "You can only create sub-tasks for your own tasks",
        variant: "destructive",
      });
      return;
    }

    const subTaskData = {
      title: newSubTask.title,
      description: newSubTask.description || null,
      priority: newSubTask.priority,
      start_time: newSubTask.start_time ? new Date(newSubTask.start_time).toISOString() : null,
      end_time: newSubTask.end_time ? new Date(newSubTask.end_time).toISOString() : (newSubTask.start_time ? new Date(newSubTask.start_time).toISOString() : null),
      all_day: newSubTask.all_day,
      event_type: newSubTask.event_type,
      // Use assigned user ID if specified and not "task-owner", otherwise use current user
      user_id: (isAdminUser && newSubTask.assigned_user_id && newSubTask.assigned_user_id !== "task-owner") ? newSubTask.assigned_user_id : currentUserId,
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
        completed: !completed,
        completed_at: !completed ? new Date().toISOString() : null 
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
        title: "Task updated",
        description: `Task marked as ${!completed ? "completed" : "pending"}`,
      });
      fetchEvents();
    }
  };

  const openEventDetails = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailDialogOpen(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  const fetchUserTemplateTasks = async () => {
    if (!user) {
      setTemplatesLoading(false);
      return;
    }

    try {
      // First, get template assignments for this user
      const { data: assignments, error: assignmentError } = await supabase
        .from('template_assignments')
        .select('template_id')
        .eq('user_id', user.id);

      if (assignmentError) {
        console.error('Error fetching template assignments:', assignmentError);
        setTemplatesLoading(false);
        return;
      }

      if (!assignments || assignments.length === 0) {
        setTemplatesWithTasks([]);
        setTemplatesLoading(false);
        return;
      }

      const templateIds = assignments.map(a => a.template_id);

      // Get templates info
      const { data: templates, error: templatesError } = await supabase
        .from('learning_templates')
        .select('*')
        .in('id', templateIds);

      if (templatesError) {
        console.error('Error fetching templates:', templatesError);
        setTemplatesLoading(false);
        return;
      }

      // Get tasks for these templates from calendar_events
      const { data: tasks, error: tasksError } = await supabase
        .from('calendar_events')
        .select('*')
        .in('template_id', templateIds)
        .eq('user_id', user.id)
        .not('template_id', 'is', null);

      if (tasksError) {
        console.error('Error fetching template tasks:', tasksError);
        setTemplatesLoading(false);
        return;
      }

      // Combine templates with their tasks
      const templatesWithTasksData = (templates || []).map(template => ({
        template,
        tasks: (tasks || []).filter(task => task.template_id === template.id).map(task => ({
          id: task.id,
          template_id: task.template_id,
          title: task.title,
          description: task.description || '',
          priority: task.priority || 'medium',
          status: task.completed ? 'completed' : 'pending',
          due_date: task.start_time,
          created_at: task.created_at,
        }))
      }));

      setTemplatesWithTasks(templatesWithTasksData);
    } catch (error) {
      console.error('Error in fetchUserTemplateTasks:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const updateTemplateTaskStatus = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from('calendar_events')
      .update({ 
        completed: completed,
        completed_at: completed ? new Date().toISOString() : null 
      })
      .eq('id', taskId);

    if (error) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Task updated",
        description: `Task marked as ${completed ? "completed" : "pending"}`,
      });
      fetchUserTemplateTasks();
      fetchEvents(); // Also refresh main events
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckSquare;
      case 'in_progress': return Clock;
      case 'pending': return Flag;
      default: return Flag;
    }
  };

  const getTemplateProgress = (tasks: TemplateTask[]) => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

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
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
                        <SelectItem value="self">Assign to myself</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.full_name} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter task title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter task description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newEvent.priority} onValueChange={(value) => setNewEvent({ ...newEvent, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="all-day"
                    checked={newEvent.all_day}
                    onCheckedChange={(checked) => setNewEvent({ ...newEvent, all_day: checked })}
                  />
                  <Label htmlFor="all-day">All Day</Label>
                </div>

                {!newEvent.all_day && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="start-time">Start Time</Label>
                      <Input
                        id="start-time"
                        type="datetime-local"
                        value={newEvent.start_time}
                        onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="end-time">End Time</Label>
                      <Input
                        id="end-time"
                        type="datetime-local"
                        value={newEvent.end_time}
                        onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createEvent}>Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                    <SelectValue placeholder="Assign to task owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task-owner">Assign to task owner</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="sub-title">Title *</Label>
              <Input
                id="sub-title"
                placeholder="Enter sub-task title"
                value={newSubTask.title}
                onChange={(e) => setNewSubTask({ ...newSubTask, title: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sub-description">Description</Label>
              <Textarea
                id="sub-description"
                placeholder="Enter sub-task description"
                value={newSubTask.description}
                onChange={(e) => setNewSubTask({ ...newSubTask, description: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sub-priority">Priority</Label>
              <Select value={newSubTask.priority} onValueChange={(value) => setNewSubTask({ ...newSubTask, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="sub-all-day"
                checked={newSubTask.all_day}
                onCheckedChange={(checked) => setNewSubTask({ ...newSubTask, all_day: checked })}
              />
              <Label htmlFor="sub-all-day">All Day</Label>
            </div>

            {!newSubTask.all_day && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="sub-start-time">Start Time</Label>
                  <Input
                    id="sub-start-time"
                    type="datetime-local"
                    value={newSubTask.start_time}
                    onChange={(e) => setNewSubTask({ ...newSubTask, start_time: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sub-end-time">End Time</Label>
                  <Input
                    id="sub-end-time"
                    type="datetime-local"
                    value={newSubTask.end_time}
                    onChange={(e) => setNewSubTask({ ...newSubTask, end_time: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsSubTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createSubTask}>Create Sub-task</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Filters - Only show for admins */}
      {isAdminUser && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Team Member</Label>
                <Select value={filters.teamMember} onValueChange={(value) => setFilters({ ...filters, teamMember: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Date Range</Label>
                <Select value={filters.dateRange} onValueChange={(value) => setFilters({ ...filters, dateRange: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Next 7 Days</SelectItem>
                    <SelectItem value="month">Next 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <List className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-4">
                {events.length === 0 
                  ? "Get started by creating your first task" 
                  : "Try adjusting your filters to see more tasks"
                }
              </p>
              {events.length === 0 && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Task
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredEvents.map((event) => (
              <AdminTaskCard
                key={event.id}
                task={event}
                onToggleComplete={toggleTaskCompletion}
                onAddSubTask={openSubTaskDialog}
                onEditTask={openEventDetails}
                onViewDetails={openEventDetails}
                isAdmin={isAdminUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Templates Section - Only for Regular Users (not admins) */}
      {userRole === 'user' && (
        <div className="space-y-6">
          <div className="border-t pt-6">
            <h2 className="text-2xl font-bold mb-2">Learning Templates</h2>
            <p className="text-muted-foreground mb-6">Track your progress on assigned learning templates</p>
            
            {templatesLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : templatesWithTasks.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No learning templates assigned</h3>
                  <p className="text-muted-foreground">
                    Contact your administrator to get assigned to learning templates
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {templatesWithTasks.map(({ template, tasks }) => {
                  const progress = getTemplateProgress(tasks);
                  const completedTasks = tasks.filter(task => task.status === 'completed').length;
                  
                  return (
                    <Card key={template.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center space-x-2">
                              <BookOpen className="h-5 w-5" />
                              <span>{template.name}</span>
                            </CardTitle>
                            <CardDescription>
                              {template.description && (
                                <span className="mr-4">{template.description}</span>
                              )}
                              {template.technology && (
                                <Badge variant="outline">{template.technology}</Badge>
                              )}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground mb-1">
                              {completedTasks} of {tasks.length} tasks completed
                            </div>
                            <div className="w-32">
                              <Progress value={progress} className="h-2" />
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {tasks.length > 0 && (
                        <CardContent>
                          <div className="space-y-3">
                            {tasks.map((task) => {
                              const StatusIcon = getStatusIcon(task.status);
                              return (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updateTemplateTaskStatus(task.id, task.status !== 'completed')}
                                      className="h-6 w-6 p-0"
                                    >
                                      {task.status === 'completed' ? (
                                        <CheckSquare className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <div className="h-4 w-4 border border-muted-foreground/50 rounded" />
                                      )}
                                    </Button>
                                    <div>
                                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                        {task.title}
                                      </p>
                                      {task.description && (
                                        <p className="text-xs text-muted-foreground">{task.description}</p>
                                      )}
                                      {task.due_date && (
                                        <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                                          <Calendar className="h-3 w-3" />
                                          <span>Due: {format(new Date(task.due_date), "MMM dd, yyyy")}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                      {task.priority}
                                    </Badge>
                                    <Badge variant={getStatusColor(task.status)} className="text-xs">
                                      <StatusIcon className="mr-1 h-3 w-3" />
                                      {task.status}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <span>{selectedEvent.title}</span>
                  <Badge variant={getPriorityColor(selectedEvent.priority)}>{selectedEvent.priority}</Badge>
                </DialogTitle>
                <DialogDescription>
                  Task details and actions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selectedEvent.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedEvent.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">{selectedEvent.priority}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedEvent.completed ? "Completed" : "Pending"}
                    </p>
                  </div>
                </div>

                {selectedEvent.start_time && (
                  <div>
                    <Label className="text-sm font-medium">
                      {selectedEvent.all_day ? "Date" : "Start Time"}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedEvent.all_day 
                        ? format(new Date(selectedEvent.start_time), "MMMM dd, yyyy")
                        : format(new Date(selectedEvent.start_time), "MMMM dd, yyyy 'at' h:mm a")
                      }
                    </p>
                  </div>
                )}

                {!selectedEvent.all_day && selectedEvent.end_time && (
                  <div>
                    <Label className="text-sm font-medium">End Time</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(selectedEvent.end_time), "MMMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}

                {isAdminUser && selectedEvent.profiles && (
                  <div>
                    <Label className="text-sm font-medium">Assigned to</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedEvent.profiles.full_name || selectedEvent.profiles.email}
                    </p>
                  </div>
                )}

                {selectedEvent.completed_at && (
                  <div>
                    <Label className="text-sm font-medium">Completed on</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(selectedEvent.completed_at), "MMMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Created on</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(selectedEvent.created_at), "MMMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="destructive"
                  onClick={() => deleteEvent(selectedEvent.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => openEditDialog(selectedEvent)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
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
                  Make changes to your task here.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={selectedEvent.title}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={selectedEvent.description || ""}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select value={selectedEvent.priority} onValueChange={(value) => setSelectedEvent({ ...selectedEvent, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-all-day"
                    checked={selectedEvent.all_day}
                    onCheckedChange={(checked) => setSelectedEvent({ ...selectedEvent, all_day: checked })}
                  />
                  <Label htmlFor="edit-all-day">All Day</Label>
                </div>

                {!selectedEvent.all_day && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-start-time">Start Time</Label>
                      <Input
                        id="edit-start-time"
                        type="datetime-local"
                        value={selectedEvent.start_time ? new Date(selectedEvent.start_time).toISOString().slice(0, 16) : ""}
                        onChange={(e) => setSelectedEvent({ ...selectedEvent, start_time: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="edit-end-time">End Time</Label>
                      <Input
                        id="edit-end-time"
                        type="datetime-local"
                        value={selectedEvent.end_time ? new Date(selectedEvent.end_time).toISOString().slice(0, 16) : ""}
                        onChange={(e) => setSelectedEvent({ ...selectedEvent, end_time: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                      />
                    </div>
                  </>
                )}
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
