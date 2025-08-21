import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Plus, Users, BookOpen, CheckCircle, Clock, AlertCircle, Edit, ChevronDown, ChevronRight, Trash2, Copy, User, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface LearningTemplate {
  id: string;
  name: string;
  description: string;
  technology: string;
  created_at: string;
}

interface TemplateAssignment {
  id: string;
  template_id: string;
  user_id: string;
  assigned_at: string;
}

interface TemplateTask {
  id: string;
  template_id: string;
  user_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date: string;
  created_at: string;
  parent_task_id?: string | null;
  sub_tasks?: TemplateTask[];
}

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
}

export default function LearningTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<LearningTemplate[]>([]);
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([]);
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  // Dialog states
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [showSubTaskDialog, setShowSubTaskDialog] = useState(false);
  const [showAssignTaskDialog, setShowAssignTaskDialog] = useState(false);
  const [showReassignTaskDialog, setShowReassignTaskDialog] = useState(false);
  const [showReassignSubTaskDialog, setShowReassignSubTaskDialog] = useState(false);
  
  // Selected states
  const [selectedTemplate, setSelectedTemplate] = useState<LearningTemplate | null>(null);
  const [selectedTask, setSelectedTask] = useState<TemplateTask | null>(null);
  const [parentTaskForSubTask, setParentTaskForSubTask] = useState<TemplateTask | null>(null);
  const [taskToAssign, setTaskToAssign] = useState<TemplateTask | null>(null);
  const [taskToReassign, setTaskToReassign] = useState<TemplateTask | null>(null);
  const [subTaskToReassign, setSubTaskToReassign] = useState<TemplateTask | null>(null);
  
  // Form states
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    technology: ""
  });
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]); // For multi-user assignment
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
    user_id: "",
    start_time: "",
    end_time: "",
    all_day: false,
    status: "pending"
  });
  const [subTaskForm, setSubTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
    start_time: "",
    end_time: "",
    all_day: false
  });

  useEffect(() => {
    checkUserRole();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (isAdmin !== null) {
      fetchTemplates();
    }
  }, [isAdmin]);

  useEffect(() => {
    // Fetch data for all expanded templates
    if (expandedTemplates.size > 0) {
      fetchAllTemplateData();
    }
  }, [expandedTemplates]);

  const checkUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;
      const hasAdminRole = data?.some(role => role.role === 'admin' || role.role === 'super_admin');
      setIsAdmin(hasAdminRole);
      setIsAuthorized(hasAdminRole);
    } catch (error) {
      setIsAdmin(false);
      setIsAuthorized(false);
    }
  };

  const fetchTemplates = async () => {
    if (!user) return;

    try {
      let query = supabase.from('learning_templates').select('*');

      if (!isAdmin) {
        // For regular users, only fetch templates they are assigned to
        const { data: userAssignments, error: assignmentError } = await supabase
          .from('template_assignments')
          .select('template_id')
          .eq('user_id', user.id);

        if (assignmentError) throw assignmentError;

        const templateIds = userAssignments?.map(a => a.template_id) || [];
        if (templateIds.length === 0) {
          setTemplates([]);
          setLoading(false);
          return;
        }

        query = query.in('id', templateIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      toast.error('Failed to fetch learning templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      toast.error('Failed to fetch team members');
    }
  };

  const fetchAllTemplateData = async () => {
    const templateIds = Array.from(expandedTemplates);
    if (templateIds.length === 0 || !user) return;

    try {
      // Fetch assignments for expanded templates
      let assignmentsQuery = supabase
        .from('template_assignments')
        .select('*')
        .in('template_id', templateIds);

      if (!isAdmin) {
        // For regular users, only fetch their own assignments
        assignmentsQuery = assignmentsQuery.eq('user_id', user.id);
      }

      const { data: assignmentsData, error: assignmentsError } = await assignmentsQuery;

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Fetch tasks from calendar_events for expanded templates
      let tasksQuery = supabase
        .from('calendar_events')
        .select('*')
        .in('template_id', templateIds)
        .not('template_id', 'is', null);

      if (!isAdmin) {
        // For regular users, only fetch their own tasks
        tasksQuery = tasksQuery.eq('user_id', user.id);
      }

      const { data: tasksData, error: tasksError } = await tasksQuery.order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Transform calendar_events to match TemplateTask interface  
      const transformedTasks = (tasksData || [])
        .map(task => ({
          id: task.id,
          template_id: task.template_id,
          user_id: task.user_id,
          title: task.title,
          description: task.description,
          priority: task.priority || 'medium',
          status: task.completed ? 'completed' : 'pending',
          due_date: task.start_time,
          created_by: task.user_id,
          created_at: task.created_at,
          updated_at: task.updated_at,
          parent_task_id: null // calendar_events doesn't have sub-tasks
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTemplateTasks(transformedTasks);
    } catch (error) {
      toast.error('Failed to fetch template data');
    }
  };

  const createTemplate = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('learning_templates')
        .insert({
          ...templateForm,
          created_by: user.id
        });

      if (error) throw error;
      
      toast.success('Learning template created successfully');
      setShowCreateTemplate(false);
      setTemplateForm({ name: "", description: "", technology: "" });
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to create learning template');
    }
  };

  const updateTemplate = async () => {
    if (!user || !selectedTemplate) return;

    try {
      const { error } = await supabase
        .from('learning_templates')
        .update({
          name: templateForm.name,
          description: templateForm.description,
          technology: templateForm.technology
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;
      
      toast.success('Learning template updated successfully');
      setShowEditTemplate(false);
      setSelectedTemplate(null);
      setTemplateForm({ name: "", description: "", technology: "" });
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to update learning template');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('learning_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      
      toast.success('Learning template deleted successfully');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete learning template');
    }
  };

  const assignUserToTemplate = async (templateId: string, userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('template_assignments')
        .insert({
          template_id: templateId,
          user_id: userId,
          assigned_by: user.id
        });

      if (error) throw error;
      
      toast.success('User assigned to template successfully');
      fetchAllTemplateData();
    } catch (error) {
      toast.error('Failed to assign user to template');
    }
  };

  const createTemplateTask = async (templateId: string) => {
    if (!user || !taskForm.title.trim()) return;

    try {
      // Fix date handling to avoid timezone issues
      let startTime = null;
      let endTime = null;
      
      if (taskForm.due_date) {
        // Create date in local timezone to avoid UTC conversion issues
        const [year, month, day] = taskForm.due_date.split('-').map(Number);
        const localDate = new Date(year, month - 1, day, 12, 0, 0); // Set to noon to avoid timezone issues
        startTime = localDate.toISOString();
        endTime = localDate.toISOString();
      }

      const taskData = {
        user_id: taskForm.user_id || user.id, // Use current admin user if no specific user selected
        title: taskForm.title,
        description: taskForm.description || null,
        priority: taskForm.priority,
        start_time: startTime,
        end_time: endTime,
        all_day: true, // Set to all day to avoid time display issues
        event_type: 'task',
        template_id: templateId,
      };

      const { error } = await supabase
        .from('calendar_events')
        .insert([taskData]);

      if (error) throw error;
      
      toast.success(taskForm.user_id ? 'Template task created and assigned to user' : 'Template task created (unassigned)');
      setShowCreateTask(false);
      resetTaskForm();
      fetchAllTemplateData();
    } catch (error) {
      toast.error('Failed to create template task');
    }
  };

  const createSubTask = async () => {
    if (!user || !parentTaskForSubTask || !subTaskForm.title.trim()) return;

    try {
      const subTaskData = {
        template_id: parentTaskForSubTask.template_id,
        title: subTaskForm.title,
        description: subTaskForm.description || null,
        priority: subTaskForm.priority,
        due_date: subTaskForm.due_date ? new Date(subTaskForm.due_date).toISOString() : null,
        user_id: parentTaskForSubTask.user_id,
        created_by: user.id,
        status: 'pending',
        parent_task_id: parentTaskForSubTask.id
      };

      const { error } = await supabase
        .from('template_tasks')
        .insert([subTaskData]);

      if (error) throw error;
      
      toast.success('Sub-task created successfully');
      setShowSubTaskDialog(false);
      resetSubTaskForm();
      setParentTaskForSubTask(null);
      fetchAllTemplateData();
    } catch (error) {
      toast.error('Failed to create sub-task');
    }
  };

  const updateTask = async () => {
    if (!selectedTask) return;

    try {
      // Fix date handling for updates too
      let startTime = null;
      let endTime = null;
      
      if (taskForm.due_date) {
        const [year, month, day] = taskForm.due_date.split('-').map(Number);
        const localDate = new Date(year, month - 1, day, 12, 0, 0);
        startTime = localDate.toISOString();
        endTime = localDate.toISOString();
      }

      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          start_time: startTime,
          end_time: endTime,
          all_day: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTask.id);

      if (error) throw error;
      
      toast.success('Task updated successfully');
      setShowEditTask(false);
      setSelectedTask(null);
      resetTaskForm();
      fetchAllTemplateData();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      // Delete all calendar events with the same title and template_id
      const taskToDelete = templateTasks.find(t => t.id === taskId);
      if (!taskToDelete) {
        throw new Error('Task not found');
      }

      console.log('Deleting task:', taskToDelete);

      // First, let's see what records actually exist
      const { data: existingCalendarEvents, error: fetchError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('template_id', taskToDelete.template_id);

      console.log('Existing calendar events for this template:', existingCalendarEvents);

      // Find matching records by title
      const matchingEvents = existingCalendarEvents?.filter(event => 
        event.title === taskToDelete.title
      ) || [];

      console.log('Matching events by title:', matchingEvents);

      // Delete each matching record by ID to be absolutely sure
      for (const event of matchingEvents) {
        const { error: deleteError } = await supabase
          .from('calendar_events')
          .delete()
          .eq('id', event.id);
        
        console.log(`Deleted event ${event.id}:`, deleteError);
      }

      // Also delete from template_tasks table
      const { error: templateError } = await supabase
        .from('template_tasks')
        .delete()
        .eq('template_id', taskToDelete.template_id)
        .eq('title', taskToDelete.title);

      console.log('Template tasks delete error:', templateError);
      
      // Clear local state and force refresh
      setTemplateTasks([]);
      setAssignments([]);
      
      // Force a complete data refresh
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
      await fetchAllTemplateData();
      
      // Also refresh the template list
      await fetchTemplates();
      
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Delete task error:', error);
      toast.error('Failed to delete task');
    }
  };

  const assignTaskToUser = async () => {
    if (!user || !taskToAssign || selectedUserIds.length === 0) return;

    try {
      // Create tasks for each selected user
      const taskPromises = selectedUserIds.map(userId => {
        const taskData = {
          user_id: userId,
          title: taskToAssign.title,
          description: taskToAssign.description || null,
          priority: taskToAssign.priority,
          start_time: taskToAssign.due_date ? new Date(taskToAssign.due_date).toISOString() : null,
          end_time: taskToAssign.due_date ? new Date(taskToAssign.due_date).toISOString() : null,
          all_day: true,
          event_type: 'task',
          template_id: taskToAssign.template_id,
        };

        return supabase
          .from('calendar_events')
          .insert([taskData]);
      });

      const results = await Promise.all(taskPromises);
      
      // Check if any failed
      const hasErrors = results.some(result => result.error);
      if (hasErrors) {
        throw new Error('Some assignments failed');
      }
      
      toast.success(`Task assigned to ${selectedUserIds.length} user(s) successfully`);
      setShowAssignTaskDialog(false);
      setTaskToAssign(null);
      setSelectedUserIds([]);
      fetchAllTemplateData();
    } catch (error) {
      toast.error('Failed to assign task to users');
    }
  };

  const reassignTask = async () => {
    if (!user || !taskToReassign || !selectedUserId) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ 
          user_id: selectedUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskToReassign.id);

      if (error) throw error;
      
      toast.success('Task reassigned successfully');
      setShowReassignTaskDialog(false);
      setTaskToReassign(null);
      setSelectedUserId("");
      fetchAllTemplateData();
    } catch (error) {
      toast.error('Failed to reassign task');
    }
  };

  const reassignSubTask = async () => {
    if (!user || !subTaskToReassign || !selectedUserId) return;

    try {
      const { error } = await supabase
        .from('template_tasks')
        .update({ user_id: selectedUserId })
        .eq('id', subTaskToReassign.id);

      if (error) throw error;
      
      toast.success('Sub-task reassigned successfully');
      setShowReassignSubTaskDialog(false);
      setSubTaskToReassign(null);
      setSelectedUserId("");
      fetchAllTemplateData();
    } catch (error) {
      toast.error('Failed to reassign sub-task');
    }
  };

  const removeUserFromTemplate = async (templateId: string, userId: string) => {
    try {
      // Remove template assignment
      const { error: assignmentError } = await supabase
        .from('template_assignments')
        .delete()
        .eq('template_id', templateId)
        .eq('user_id', userId);

      if (assignmentError) throw assignmentError;

      // Remove all calendar events (user task assignments) for this user and template
      const { error: calendarError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('template_id', templateId)
        .eq('user_id', userId);

      if (calendarError) throw calendarError;

      // Get all tasks for this template and user from template_tasks table
      const { data: userTasks, error: tasksError } = await supabase
        .from('template_tasks')
        .select('id')
        .eq('template_id', templateId)
        .eq('user_id', userId);

      if (tasksError) throw tasksError;

      // Remove user's tasks from template_tasks table 
      if (userTasks && userTasks.length > 0) {
        const taskIds = userTasks.map(task => task.id);
        const { error: deleteTasksError } = await supabase
          .from('template_tasks')
          .delete()
          .in('id', taskIds);

        if (deleteTasksError) throw deleteTasksError;
      }
      
      toast.success('User removed from template successfully');
      fetchAllTemplateData();
    } catch (error) {
      toast.error('Failed to remove user from template');
    }
  };

  const toggleTaskCompletion = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const isCompleted = newStatus === 'completed';
    
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ 
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success(`Task ${isCompleted ? 'completed' : 'reopened'}`);
      fetchAllTemplateData();
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const toggleTemplateExpanded = (templateId: string) => {
    setExpandedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const getAssignedUsers = (templateId: string) => {
    return assignments
      .filter(a => a.template_id === templateId)
      .map(a => {
        const profile = teamMembers.find(tm => tm.user_id === a.user_id);
        return {
          user_id: a.user_id,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email || 'Unknown'
        };
      });
  };

  const getTemplateTasks = (templateId: string) => {
    const tasks = templateTasks.filter(task => task.template_id === templateId);
    
    // Group tasks by title + description to avoid duplicates and count assigned users
    const groupedTasks = tasks.reduce((acc, task) => {
      // Skip tasks without user_id
      if (!task.user_id) return acc;
      
      const taskKey = `${task.title}_${task.description || ''}_${task.template_id}`;
      const existingTask = acc.find(t => `${t.title}_${t.description || ''}_${t.template_id}` === taskKey);
      
      if (existingTask) {
        // Task already exists, add this user to the assignedUserIds
        if (!existingTask.assignedUserIds) {
          existingTask.assignedUserIds = [existingTask.user_id];
        }
        if (!existingTask.assignedUserIds.includes(task.user_id)) {
          existingTask.assignedUserIds.push(task.user_id);
        }
      } else {
        // New task, add it with initial assigned user
        acc.push({
          ...task,
          assignedUserIds: [task.user_id]
        });
      }
      return acc;
    }, [] as (TemplateTask & { assignedUserIds?: string[] })[]);
    
    return groupedTasks;
  };

  const getUnassignedUsers = (templateId: string) => {
    const assignedUserIds = assignments
      .filter(a => a.template_id === templateId)
      .map(a => a.user_id);
    return teamMembers.filter(member => !assignedUserIds.includes(member.user_id));
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      description: "",
      priority: "medium",
      due_date: "",
      user_id: "",
      start_time: "",
      end_time: "",
      all_day: false,
      status: "pending"
    });
  };

  const resetSubTaskForm = () => {
    setSubTaskForm({
      title: "",
      description: "",
      priority: "medium",
      due_date: "",
      start_time: "",
      end_time: "",
      all_day: false
    });
  };

  const openEditTemplate = (template: LearningTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || "",
      technology: template.technology
    });
    setShowEditTemplate(true);
  };

  const openEditTask = (task: TemplateTask) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      due_date: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : "",
      user_id: task.user_id,
      start_time: "",
      end_time: "",
      all_day: false,
      status: task.status
    });
    setShowEditTask(true);
  };

  const openSubTaskDialog = (parentTask: TemplateTask) => {
    setParentTaskForSubTask(parentTask);
    setShowSubTaskDialog(true);
  };

  const openAssignTaskDialog = (task: TemplateTask) => {
    setTaskToAssign(task);
    setSelectedUserIds([]); // Reset multi-select
    setShowAssignTaskDialog(true);
  };

  const openReassignTaskDialog = (task: TemplateTask) => {
    setTaskToReassign(task);
    setShowReassignTaskDialog(true);
  };

  const openReassignSubTaskDialog = (subTask: TemplateTask) => {
    setSubTaskToReassign(subTask);
    setShowReassignSubTaskDialog(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
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
      case 'completed': return CheckCircle;
      case 'in_progress': return Clock;
      case 'pending': return AlertCircle;
      default: return AlertCircle;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage employee templates and assignments' : 'View your assigned templates and tasks'}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Learning Template</DialogTitle>
                <DialogDescription>
                  Create a new learning template for employee training
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Java Full Stack"
                  />
                </div>
                <div>
                  <Label htmlFor="technology">Technology</Label>
                  <Input
                    id="technology"
                    value={templateForm.technology}
                    onChange={(e) => setTemplateForm({ ...templateForm, technology: e.target.value })}
                    placeholder="e.g., Java, Python, .NET"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Describe the learning template..."
                  />
                </div>
                <Button onClick={createTemplate} className="w-full">
                  Create Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Templates with Collapsible Structure */}
      <div className="space-y-4">
        {templates.map((template) => {
          const isExpanded = expandedTemplates.has(template.id);
          const assignedUsers = getAssignedUsers(template.id);
          const templateTasksList = getTemplateTasks(template.id);
          const unassignedUsers = getUnassignedUsers(template.id);

          return (
            <Card key={template.id} className="w-full">
              <Collapsible 
                open={isExpanded} 
                onOpenChange={() => toggleTemplateExpanded(template.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Badge variant="outline">{template.technology}</Badge>
                            <span className="text-sm">
                              {assignedUsers.length} user{assignedUsers.length !== 1 ? 's' : ''} assigned
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                       <div className="flex items-center gap-2">
                         {isAdmin && (
                           <>
                             {/* Assign User Dropdown */}
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                                   <Users className="mr-2 h-4 w-4" />
                                   Assign User
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent>
                                 {unassignedUsers.length > 0 ? (
                                   unassignedUsers.map((member) => (
                                     <DropdownMenuItem
                                       key={member.user_id}
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         assignUserToTemplate(template.id, member.user_id);
                                       }}
                                     >
                                       {member.full_name} ({member.email})
                                     </DropdownMenuItem>
                                   ))
                                 ) : (
                                   <DropdownMenuItem disabled>
                                     All users assigned
                                   </DropdownMenuItem>
                                 )}
                               </DropdownMenuContent>
                             </DropdownMenu>
                             
                             {/* Template Actions */}
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                   <Edit className="h-4 w-4" />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent>
                                 <DropdownMenuItem onClick={(e) => {
                                   e.stopPropagation();
                                   openEditTemplate(template);
                                 }}>
                                   <Edit className="mr-2 h-4 w-4" />
                                   Edit Template
                                 </DropdownMenuItem>
                                 <DropdownMenuItem 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     deleteTemplate(template.id);
                                   }}
                                   className="text-destructive"
                                 >
                                   <Trash2 className="mr-2 h-4 w-4" />
                                   Delete Template
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </>
                         )}
                       </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                    )}
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       {/* Assigned Users */}
                       <div className="space-y-3">
                         <h3 className="font-semibold">Assigned Users</h3>
                         <div className="space-y-2">
                           {assignedUsers.map((user) => (
                             <Card key={user.user_id}>
                               <CardContent className="p-3">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-medium text-sm">{user.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {templateTasksList.filter(t => t.assignedUserIds?.includes(user.user_id)).length} tasks
                                        </Badge>
                                        {isAdmin && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                <MoreVertical className="h-3 w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                              <DropdownMenuItem 
                                                onClick={() => removeUserFromTemplate(template.id, user.user_id)}
                                                className="text-destructive"
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Remove User from Template
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                      </div>
                                    </div>
                               </CardContent>
                             </Card>
                           ))}
                           {assignedUsers.length === 0 && (
                             <p className="text-sm text-muted-foreground">No users assigned yet</p>
                           )}
                         </div>
                       </div>

                      {/* Template Tasks */}
                      <div className="space-y-3">
                         <div className="flex justify-between items-center">
                           <h3 className="font-semibold">Tasks</h3>
                           {isAdmin && (
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => {
                                 setSelectedTemplate(template);
                                 setShowCreateTask(true);
                               }}
                               disabled={false}
                             >
                               <Plus className="mr-2 h-4 w-4" />
                               Add Task
                             </Button>
                           )}
                         </div>
                         <div className="space-y-2 max-h-96 overflow-y-auto">
                           {templateTasksList.map((task) => {
                             const assignedUsers = getAssignedUsers(template.id);
                             const taskAssignedUsers = task.assignedUserIds 
                               ? assignedUsers.filter(u => task.assignedUserIds!.includes(u.user_id))
                               : [assignedUsers.find(u => u.user_id === task.user_id)].filter(Boolean);
                             
                             const StatusIcon = getStatusIcon(task.status);
                             return (
                               <Card key={task.id} className="border-l-4 border-l-primary/20">
                                 <CardContent className="p-3">
                                   <div className="flex justify-between items-start">
                                     <div className="flex-1">
                                       <div className="flex items-center gap-2 mb-1">
                                         <StatusIcon className="h-3 w-3" />
                                         <h4 className="font-medium text-sm">{task.title}</h4>
                                       </div>
                                       {task.description && (
                                         <p className="text-xs text-muted-foreground mb-1">{task.description}</p>
                                       )}
                                       <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                         <span>
                                           {task.assignedUserIds && task.assignedUserIds.length > 0
                                             ? (task.assignedUserIds.length === 1 
                                                 ? taskAssignedUsers[0]?.full_name || 'Unknown'
                                                 : `${task.assignedUserIds.length} users assigned`)
                                             : 'No users assigned'}
                                         </span>
                                         <span>• Created: {
                                           task.created_at 
                                             ? (new Date(task.created_at).toDateString() === new Date().toDateString() 
                                                 ? 'Today' 
                                                 : format(new Date(task.created_at), 'MMM dd'))
                                             : 'Unknown'
                                         }</span>
                                         {task.due_date && (
                                           <span>• Due: {format(new Date(task.due_date), 'MMM dd')}</span>
                                         )}
                                       </div>
                                     </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        <Badge variant={getPriorityColor(task.priority)} className="text-xs px-1 py-0">
                                          {task.priority}
                                        </Badge>
                                        <Switch
                                          checked={task.status === 'completed'}
                                          onCheckedChange={() => toggleTaskCompletion(task.id, task.status)}
                                        />
                                        {isAdmin && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                              <DropdownMenuItem onClick={() => openEditTask(task)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Task
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => openSubTaskDialog(task)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Sub-task
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => openAssignTaskDialog(task)}>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Assign to Users
                                              </DropdownMenuItem>
                                              {task.user_id && (
                                                <DropdownMenuItem onClick={() => openReassignTaskDialog(task)}>
                                                  <User className="mr-2 h-4 w-4" />
                                                  Reassign Task
                                                </DropdownMenuItem>
                                              )}
                                              <DropdownMenuItem 
                                                onClick={() => deleteTask(task.id)}
                                                className="text-destructive"
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Task
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                      </div>
                                   </div>
                                   
                                   {/* Sub-tasks */}
                                   {task.sub_tasks && task.sub_tasks.length > 0 && (
                                     <div className="mt-2 pl-4 border-l-2 border-muted space-y-1">
                                       {task.sub_tasks.map((subTask) => {
                                         const SubStatusIcon = getStatusIcon(subTask.status);
                                         return (
                                           <div key={subTask.id} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                                             <div className="flex items-center gap-2 flex-1">
                                               <SubStatusIcon className="h-3 w-3" />
                                               <span className="font-medium">{subTask.title}</span>
                                               {subTask.description && (
                                                 <span className="text-muted-foreground">- {subTask.description}</span>
                                               )}
                                             </div>
                                              <div className="flex items-center gap-1">
                                                <Badge variant={getPriorityColor(subTask.priority)} className="text-xs px-1 py-0">
                                                  {subTask.priority}
                                                </Badge>
                                                <Switch
                                                  checked={subTask.status === 'completed'}
                                                  onCheckedChange={() => toggleTaskCompletion(subTask.id, subTask.status)}
                                                />
                                                {isAdmin && (
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                        <MoreVertical className="h-3 w-3" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                      <DropdownMenuItem onClick={() => openReassignSubTaskDialog(subTask)}>
                                                        <User className="mr-2 h-4 w-4" />
                                                        Reassign Sub-task
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem onClick={() => openAssignTaskDialog(subTask)}>
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        Assign to Another User
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem 
                                                        onClick={() => deleteTask(subTask.id)}
                                                        className="text-destructive"
                                                      >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Sub-task
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                )}
                                              </div>
                                           </div>
                                         );
                                       })}
                                     </div>
                                   )}
                                 </CardContent>
                               </Card>
                             );
                           })}
                           {templateTasksList.length === 0 && (
                             <p className="text-sm text-muted-foreground">No tasks created yet</p>
                           )}
                         </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Edit Template Dialog */}
      <Dialog open={showEditTemplate} onOpenChange={setShowEditTemplate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Learning Template</DialogTitle>
            <DialogDescription>
              Update the learning template details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Template Name</Label>
              <Input
                id="edit-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="e.g., Java Full Stack"
              />
            </div>
            <div>
              <Label htmlFor="edit-technology">Technology</Label>
              <Input
                id="edit-technology"
                value={templateForm.technology}
                onChange={(e) => setTemplateForm({ ...templateForm, technology: e.target.value })}
                placeholder="e.g., Java, Python, .NET"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="Describe the learning template..."
              />
            </div>
            <Button onClick={updateTemplate} className="w-full">
              Update Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Template Task</DialogTitle>
            <DialogDescription>
              Create a task for a user in {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-user">Assign to User (Optional)</Label>
              <Select value={taskForm.user_id} onValueChange={(value) => setTaskForm({ ...taskForm, user_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user (or leave unassigned)" />
                </SelectTrigger>
                <SelectContent>
                  {getAssignedUsers(selectedTemplate?.id || '').map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="e.g., Learn Spring Boot"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Describe the task..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={taskForm.priority} onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}>
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
              <div>
                <Label htmlFor="task-due-date">Due Date</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={() => createTemplateTask(selectedTemplate?.id || '')} className="w-full">
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditTask} onOpenChange={setShowEditTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-task-title">Task Title</Label>
              <Input
                id="edit-task-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="e.g., Learn Spring Boot"
              />
            </div>
            <div>
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Describe the task..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-task-priority">Priority</Label>
                <Select value={taskForm.priority} onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}>
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
              <div>
                <Label htmlFor="edit-task-due-date">Due Date</Label>
                <Input
                  id="edit-task-due-date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={updateTask} className="w-full">
              Update Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Sub-task Dialog */}
      <Dialog open={showSubTaskDialog} onOpenChange={setShowSubTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sub-task</DialogTitle>
            <DialogDescription>
              Create a sub-task for "{parentTaskForSubTask?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subtask-title">Sub-task Title</Label>
              <Input
                id="subtask-title"
                value={subTaskForm.title}
                onChange={(e) => setSubTaskForm({ ...subTaskForm, title: e.target.value })}
                placeholder="e.g., Learn Spring Boot Basics"
              />
            </div>
            <div>
              <Label htmlFor="subtask-description">Description</Label>
              <Textarea
                id="subtask-description"
                value={subTaskForm.description}
                onChange={(e) => setSubTaskForm({ ...subTaskForm, description: e.target.value })}
                placeholder="Describe the sub-task..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subtask-priority">Priority</Label>
                <Select value={subTaskForm.priority} onValueChange={(value) => setSubTaskForm({ ...subTaskForm, priority: value })}>
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
              <div>
                <Label htmlFor="subtask-due-date">Due Date</Label>
                <Input
                  id="subtask-due-date"
                  type="date"
                  value={subTaskForm.due_date}
                  onChange={(e) => setSubTaskForm({ ...subTaskForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={createSubTask} className="w-full">
              Create Sub-task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Task to User(s) Dialog */}
      <Dialog open={showAssignTaskDialog} onOpenChange={setShowAssignTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task to Users</DialogTitle>
            <DialogDescription>
              Assign "{taskToAssign?.title}" to user(s) in the template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select User(s)</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {getAssignedUsers(taskToAssign?.template_id || '')
                  .filter(user => {
                    // Filter out users who already have this task assigned
                    if (!taskToAssign) return true;
                    const existingTask = templateTasks.find(t => 
                      t.template_id === taskToAssign.template_id &&
                      t.title === taskToAssign.title &&
                      t.description === taskToAssign.description &&
                      t.user_id === user.user_id
                    );
                    return !existingTask;
                  })
                  .map((user) => (
                  <div key={user.user_id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`user-${user.user_id}`}
                      checked={selectedUserIds.includes(user.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds([...selectedUserIds, user.user_id]);
                        } else {
                          setSelectedUserIds(selectedUserIds.filter(id => id !== user.user_id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`user-${user.user_id}`} className="text-sm font-normal cursor-pointer">
                      {user.full_name} ({user.email})
                    </Label>
                  </div>
                ))}
                {getAssignedUsers(taskToAssign?.template_id || '')
                  .filter(user => {
                    if (!taskToAssign) return true;
                    const existingTask = templateTasks.find(t => 
                      t.template_id === taskToAssign.template_id &&
                      t.title === taskToAssign.title &&
                      t.description === taskToAssign.description &&
                      t.user_id === user.user_id
                    );
                    return !existingTask;
                  }).length === 0 && (
                  <p className="text-sm text-muted-foreground">All users already have this task assigned</p>
                )}
              </div>
              {selectedUserIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedUserIds.length} user(s) selected
                </p>
              )}
            </div>
            <Button 
              onClick={assignTaskToUser} 
              className="w-full"
              disabled={selectedUserIds.length === 0}
            >
              Assign Task to {selectedUserIds.length} User(s)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Task Dialog */}
      <Dialog open={showReassignTaskDialog} onOpenChange={setShowReassignTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Task</DialogTitle>
            <DialogDescription>
              Reassign "{taskToReassign?.title}" to a different user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reassign-user">Select New User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {getAssignedUsers(taskToReassign?.template_id || '').map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={reassignTask} className="w-full">
              Reassign Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Sub-task Dialog */}
      <Dialog open={showReassignSubTaskDialog} onOpenChange={setShowReassignSubTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Sub-task</DialogTitle>
            <DialogDescription>
              Reassign "{subTaskToReassign?.title}" to a different user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reassign-subtask-user">Select New User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {getAssignedUsers(subTaskToReassign?.template_id || '').map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={reassignSubTask} className="w-full">
              Reassign Sub-task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}