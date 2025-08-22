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
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: string;
  created_at: string;
  user_id: string;
  created_by?: string;
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
    taskType: "all",
    status: "all",
  });

  const isAdminUser = userRole === 'admin' || userRole === 'super_admin';
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
    
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      eventsQuery = eventsQuery.eq('user_id', user.id);
    } else {
      if (userRole === 'super_admin') {
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

    if (userRole === 'admin' || userRole === 'super_admin') {
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

  if (isLoading) {
    console.log("Tasks page loading...", { user, userRole });
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
              
              {/* Quick Stats */}
              <div className="flex gap-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                  <CheckSquare className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {filteredEvents.filter(e => e.completed).length} Completed
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    {filteredEvents.filter(e => !e.completed).length} Active
                  </span>
                </div>
              </div>
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
                    <Sparkles className="mr-1 h-3 w-3" />
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
                event={event}
                isAdminView={isAdminUser}
                onRefresh={fetchEvents}
              />
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-card/50 via-card/30 to-card/50 backdrop-blur-sm animate-scale-in">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-6 rounded-full bg-gradient-to-br from-muted/50 to-muted/30 mb-6">
                <List className="w-12 h-12 text-muted-foreground/50" />
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
      </div>
    </div>
  );
};

export default Tasks;
