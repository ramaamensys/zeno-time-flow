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
import { Plus, Calendar, Clock, Flag, CheckSquare, Trash2, Filter, User, X, ChevronRight, List, Edit, Check, ChevronDown, BookOpen, AlertCircle, RefreshCw, Target, TrendingUp, Sparkles, Zap } from "lucide-react";
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
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  event_type: string;
  created_at: string;
  user_id: string;
  created_by?: string;
  parent_task_id?: string | null;
  completed?: boolean | null;
  completed_at?: string | null;
  template_id?: string | null;
  notes?: string | null;
  files?: any;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
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
    taskType: "all",
    status: "all",
  });

  // Helper variable for admin permissions
  const isAdminUser = userRole === 'admin' || userRole === 'super_admin' || userRole === 'operations_manager';
  const [newEvent, setNewEvent] = useState({
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

  const [newSubTask, setNewSubTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    start_time: "",
    end_time: "",
    all_day: false,
    event_type: "task",
    assigned_user_id: "",
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
      if (userRole === 'user') {
        fetchUserTemplateTasks();
      }
      
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
    if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'operations_manager') {
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
        (payload) => {
          console.log('Real-time event received:', payload);
          setTimeout(() => {
            refreshData();
          }, 500);
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
      const roles = data.map(item => item.role);
      if (roles.includes('super_admin')) {
        setUserRole('super_admin');
      } else if (roles.includes('operations_manager')) {
        setUserRole('operations_manager');
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
    
    let eventsQuery = supabase.from("calendar_events").select(`
      *,
      created_by
    `);
    
    if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'operations_manager') {
      eventsQuery = eventsQuery.eq('user_id', user.id);
    } else {
      if (userRole === 'super_admin' || userRole === 'operations_manager') {
        eventsQuery = eventsQuery.is('template_id', null);
      } else {
        const { data: managedUsers } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('manager_id', user.id);
        
        const managedUserIds = managedUsers?.map(u => u.user_id) || [];
        const allowedUserIds = [...managedUserIds, user.id];
        
        eventsQuery = eventsQuery
          .in('user_id', allowedUserIds)
          .is('template_id', null);
      }
    }
    
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

    const userIds = [...new Set(eventsData?.map(event => event.user_id) || [])];
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    const eventsWithProfiles = eventsData?.map(event => ({
      ...event,
      profiles: profilesData?.find(profile => profile.user_id === event.user_id) || null
    })) || [];

    const primaryTasks = eventsWithProfiles.filter(event => !event.parent_task_id);
    const subTasks = eventsWithProfiles.filter(event => event.parent_task_id);

    const tasksWithSubTasks = primaryTasks.map(task => ({
      ...task,
      sub_tasks: subTasks.filter(subTask => subTask.parent_task_id === task.id)
    }));

    setEvents(tasksWithSubTasks);
    setIsLoading(false);
  };

  const fetchTeamMembers = async () => {
    if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'operations_manager') return;
    
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

    if (filters.taskType && filters.taskType !== "all") {
      switch (filters.taskType) {
        case "template":
          filtered = filtered.filter(event => event.template_id !== null);
          break;
        case "admin_assigned":
          if (userRole === 'user') {
            filtered = filtered.filter(event => 
              event.template_id === null && 
              event.user_id === user?.id &&
              event.created_by !== event.user_id
            );
          } else {
            filtered = filtered.filter(event => 
              event.template_id === null && 
              event.user_id !== user?.id &&
              event.created_by === user?.id
            );
          }
          break;
        case "personal":
          if (userRole === 'user') {
            filtered = filtered.filter(event => 
              event.template_id === null &&
              event.user_id === user?.id &&
              event.created_by === event.user_id
            );
          } else {
            filtered = filtered.filter(event => 
              event.template_id === null &&
              event.user_id === user?.id &&
              event.created_by === user?.id
            );
          }
          break;
      }
    }

    if (filters.status && filters.status !== "all") {
      switch (filters.status) {
        case "completed":
          filtered = filtered.filter(event => event.completed === true);
          break;
        case "pending":
          filtered = filtered.filter(event => event.completed !== true);
          break;
      }
    }

    if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'operations_manager') {
      if (filters.teamMember && filters.teamMember !== "all") {
        filtered = filtered.filter(event => event.user_id === filters.teamMember);
      }

      if (filters.priority && filters.priority !== "all") {
        filtered = filtered.filter(event => event.priority === filters.priority);
      }
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
      start_time: newEvent.start_time ? new Date(newEvent.start_time).toISOString() : new Date().toISOString(),
      end_time: newEvent.end_time ? new Date(newEvent.end_time).toISOString() : (newEvent.start_time ? new Date(newEvent.start_time).toISOString() : new Date().toISOString()),
      all_day: newEvent.all_day,
      event_type: newEvent.event_type,
      user_id: (isAdminUser && newEvent.assigned_user_id && newEvent.assigned_user_id !== "self") ? newEvent.assigned_user_id : user?.id,
      created_by: user?.id,
    };

    const { data: insertedTask, error } = await supabase.from("calendar_events").insert([eventData]).select().single();

    if (error) {
      toast({
        title: "Error creating event",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Task created successfully!",
        description: newEvent.title,
      });
      
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
      setIsDialogOpen(false);
      fetchEvents();
    }
  };

  const fetchUserTemplateTasks = async () => {
    if (!user || userRole !== 'user') return;
    
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('template_assignments')
        .select(`
          template_id,
          learning_templates!inner(
            id,
            name,
            description,
            technology
          )
        `)
        .eq('user_id', user.id);

      if (assignmentsError) {
        console.error('Error fetching template assignments:', assignmentsError);
        return;
      }

      if (!assignments || assignments.length === 0) {
        setTemplatesWithTasks([]);
        setTemplatesLoading(false);
        return;
      }

      const templatesData = await Promise.all(
        assignments.map(async (assignment) => {
          const { data: tasks, error: tasksError } = await supabase
            .from('template_tasks')
            .select('*')
            .eq('template_id', assignment.template_id)
            .eq('user_id', user.id);

          if (tasksError) {
            console.error('Error fetching template tasks:', tasksError);
            return null;
          }

          return {
            template: assignment.learning_templates,
            tasks: tasks || []
          };
        })
      );

      const validTemplatesData = templatesData.filter(item => item !== null) as TemplateWithTasks[];
      setTemplatesWithTasks(validTemplatesData);
    } catch (error) {
      console.error('Error in fetchUserTemplateTasks:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // AdminTaskCard callback functions
  const toggleTaskComplete = async (taskId: string, currentCompleted: boolean) => {
    try {
      const newCompleted = !currentCompleted;
      
      const { error } = await supabase
        .from('calendar_events')
        .update({ 
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null 
        })
        .eq('id', taskId);

      if (error) {
        toast({
          title: "Error updating task",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Update local state immediately for better UX
        setEvents(prevEvents => 
          prevEvents.map(event => 
            event.id === taskId 
              ? { ...event, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
              : event
          )
        );
        
        toast({
          title: newCompleted ? "Task completed!" : "Task reopened",
          description: "Task status updated successfully",
        });
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const openSubTaskDialog = (parentTask: CalendarEvent) => {
    setParentTaskForSubTask(parentTask);
    setIsSubTaskDialogOpen(true);
  };

  const openEditDialog = (task: CalendarEvent) => {
    setSelectedEvent(task);
    setIsEditDialogOpen(true);
  };

  const openDetailDialog = (task: CalendarEvent) => {
    setSelectedEvent(task);
    setIsDetailDialogOpen(true);
  };

  const updateTaskNotes = async (taskId: string, notes: string, files?: string[]) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ 
          notes,
          files: files || []
        })
        .eq('id', taskId);

      if (error) {
        toast({
          title: "Error updating notes",
          description: error.message,
          variant: "destructive",
        });
      } else {
        await fetchEvents();
        toast({
          title: "Notes updated",
          description: "Task notes saved successfully",
        });
      }
    } catch (error) {
      console.error('Error updating task notes:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', taskId);

      if (error) {
        toast({
          title: "Error deleting task",
          description: error.message,
          variant: "destructive",
        });
      } else {
        await fetchEvents();
        toast({
          title: "Task deleted",
          description: "Task removed successfully",
        });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const createSubTask = async () => {
    if (!newSubTask.title.trim() || !parentTaskForSubTask) {
      toast({
        title: "Title required",
        description: "Please enter a sub-task title",
        variant: "destructive",
      });
      return;
    }

    const subTaskData = {
      title: newSubTask.title,
      description: newSubTask.description || null,
      priority: newSubTask.priority,
      start_time: newSubTask.start_time ? new Date(newSubTask.start_time).toISOString() : new Date().toISOString(),
      end_time: newSubTask.end_time ? new Date(newSubTask.end_time).toISOString() : (newSubTask.start_time ? new Date(newSubTask.start_time).toISOString() : new Date().toISOString()),
      all_day: newSubTask.all_day,
      event_type: newSubTask.event_type,
      parent_task_id: parentTaskForSubTask.id,
      user_id: (isAdminUser && newSubTask.assigned_user_id && newSubTask.assigned_user_id !== "self") ? newSubTask.assigned_user_id : parentTaskForSubTask.user_id,
      created_by: user?.id,
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
        title: "Sub-task created successfully!",
        description: newSubTask.title,
      });
      
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
      setIsSubTaskDialogOpen(false);
      setParentTaskForSubTask(null);
      fetchEvents();
    }
  };

  const updateEvent = async (event: CalendarEvent | null) => {
    if (!event) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: event.title,
          description: event.description,
          priority: event.priority,
          start_time: event.start_time,
          end_time: event.end_time,
          all_day: event.all_day,
        })
        .eq('id', event.id);

      if (error) {
        toast({
          title: "Error updating task",
          description: error.message,
          variant: "destructive",
        });
      } else {
        await fetchEvents();
        setIsEditDialogOpen(false);
        setSelectedEvent(null);
        toast({
          title: "Task updated",
          description: "Task updated successfully",
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  if (isLoading) {
    console.log("Tasks page loading...", { user, userRole });
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-background via-background/95 to-primary/5">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Target className="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 animate-fade-in">
      {/* Modern Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-emerald-600/10 animate-pulse opacity-30"></div>
        <div className="relative px-6 py-12">
          <div className="flex justify-between items-start">
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm border border-primary/20 shadow-lg">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                    Tasks
                  </h1>
                  <p className="text-lg text-muted-foreground/80 font-medium">
                    Manage your tasks and events in one place
                  </p>
                </div>
              </div>
              
              {/* Quick Stats - removed per user request */}
            </div>
            
            <div className="flex gap-3 animate-scale-in">
              <Button 
                variant="outline"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90 hover:scale-105 transition-all duration-300 shadow-lg"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border-0">
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
                      <Label htmlFor="all-day">All day</Label>
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
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 space-y-8">
        {/* Modern Interactive Filters */}
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-card/80 via-card to-card/90 backdrop-blur-sm animate-scale-in">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <Filter className="h-5 w-5 text-primary" />
                </div>
                <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
                Filters
              </CardTitle>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                Smart Filtering
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="grid gap-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <List className="w-4 h-4 text-primary" />
                  Task Type
                </Label>
                <Select value={filters.taskType} onValueChange={(value) => setFilters({ ...filters, taskType: value })}>
                  <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="admin_assigned">Admin Assigned</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isAdminUser && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Team Member
                  </Label>
                  <Select value={filters.teamMember} onValueChange={(value) => setFilters({ ...filters, teamMember: value })}>
                    <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
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
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Flag className="w-4 h-4 text-primary" />
                  Priority
                </Label>
                <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
                  <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date Range
                </Label>
                <Select value={filters.dateRange} onValueChange={(value) => setFilters({ ...filters, dateRange: value })}>
                  <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  Status
                </Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Display */}
        {filteredEvents.length > 0 ? (
          <div className="space-y-4 animate-fade-in">
            {filteredEvents.map((event) => (
              <AdminTaskCard 
                key={event.id} 
                task={event}
                isAdmin={isAdminUser}
                onToggleComplete={toggleTaskComplete}
                onAddSubTask={openSubTaskDialog}
                onEditTask={openEditDialog}
                onViewDetails={openDetailDialog}
                onUpdateNotes={updateTaskNotes}
                onDeleteTask={deleteTask}
              />
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-card/50 via-card/30 to-card/50 backdrop-blur-sm animate-scale-in">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-6 rounded-full bg-gradient-to-br from-muted/50 to-muted/30 mb-6">
                <List className="w-12 h-12 text-muted-foreground/60" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-muted-foreground">No tasks found</h3>
              <p className="text-muted-foreground/80 mb-6 max-w-md">
                {events.length === 0 
                  ? "Get started by creating your first task" 
                  : "Try adjusting your filters to see more tasks"
                }
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Templates Section */}
        {userRole === 'user' && (
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-card/80 via-card to-card/90 backdrop-blur-sm animate-fade-in">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/20">
                  <BookOpen className="h-6 w-6 text-emerald-600" />
                </div>
                Templates
              </CardTitle>
              <CardDescription className="text-base">
                Track your progress on assigned templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : templatesWithTasks.length > 0 ? (
                <div className="space-y-6">
                  {templatesWithTasks.map(({ template, tasks }) => (
                    <div key={template.id} className="p-6 rounded-2xl bg-gradient-to-r from-background/50 to-background/30 border border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{template.name}</h3>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                          <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-primary/20">
                            {template.technology}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {tasks.filter(task => task.status === 'completed').length}/{tasks.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Tasks Completed</div>
                        </div>
                      </div>
                      <Progress 
                        value={tasks.length > 0 ? (tasks.filter(task => task.status === 'completed').length / tasks.length) * 100 : 0} 
                        className="h-2 bg-muted/50"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No templates assigned yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sub Task Dialog */}
        <Dialog open={isSubTaskDialogOpen} onOpenChange={setIsSubTaskDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Sub Task</DialogTitle>
              <DialogDescription>
                Add a sub-task to {parentTaskForSubTask?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {isAdminUser && (
                <div className="grid gap-2">
                  <Label>Assign to User</Label>
                  <Select
                    value={newSubTask.assigned_user_id}
                    onValueChange={(value) => setNewSubTask({ ...newSubTask, assigned_user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Same as parent task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Same as parent task</SelectItem>
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
                <Label htmlFor="sub-all-day">All day</Label>
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
              <Button onClick={createSubTask}>Create Sub Task</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Task Details Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedEvent?.title}</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <Badge variant={selectedEvent.priority === 'high' ? 'destructive' : selectedEvent.priority === 'medium' ? 'default' : 'secondary'} className="mt-1">
                      {selectedEvent.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={selectedEvent.completed ? 'default' : 'outline'} className="mt-1">
                      {selectedEvent.completed ? 'Completed' : 'Pending'}
                    </Badge>
                  </div>
                </div>

                {selectedEvent.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedEvent.description}</p>
                  </div>
                )}

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

                {selectedEvent.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notes</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedEvent.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update the task details below.
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
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
                  <Label htmlFor="edit-all-day">All day</Label>
                </div>

                {!selectedEvent.all_day && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-start-time">Start Time</Label>
                      <Input
                        id="edit-start-time"
                        type="datetime-local"
                        value={selectedEvent.start_time ? (() => {
                          const date = new Date(selectedEvent.start_time);
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const hours = String(date.getHours()).padStart(2, '0');
                          const minutes = String(date.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        })() : ""}
                        onChange={(e) => setSelectedEvent({ ...selectedEvent, start_time: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="edit-end-time">End Time</Label>
                      <Input
                        id="edit-end-time"
                        type="datetime-local"
                        value={selectedEvent.end_time ? (() => {
                          const date = new Date(selectedEvent.end_time);
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const hours = String(date.getHours()).padStart(2, '0');
                          const minutes = String(date.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        })() : ""}
                        onChange={(e) => setSelectedEvent({ ...selectedEvent, end_time: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => updateEvent(selectedEvent)}>
                Update Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Tasks;