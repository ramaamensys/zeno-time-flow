import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, AlertCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";

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

export default function UserTemplateTasks() {
  const { user } = useAuth();
  const [templatesWithTasks, setTemplatesWithTasks] = useState<TemplateWithTasks[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserTemplateTasks();
  }, []);

  const fetchUserTemplateTasks = async () => {
    if (!user) return;

    try {
      // First, get all template assignments for the user
      const { data: assignments, error: assignmentsError } = await supabase
        .from('template_assignments')
        .select('template_id')
        .eq('user_id', user.id);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        setLoading(false);
        return;
      }

      const templateIds = assignments.map(a => a.template_id);

      // Get template details
      const { data: templates, error: templatesError } = await supabase
        .from('learning_templates')
        .select('*')
        .in('id', templateIds);

      if (templatesError) throw templatesError;

      // Get tasks from calendar_events for each template
      const { data: tasks, error: tasksError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .in('template_id', templateIds)
        .not('template_id', 'is', null)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Combine templates with their tasks, transforming calendar_events to TemplateTask format
      const templatesWithTasksData: TemplateWithTasks[] = (templates || []).map(template => ({
        template,
        tasks: (tasks || []).filter(task => task.template_id === template.id).map(task => ({
          id: task.id,
          template_id: task.template_id!,
          title: task.title,
          description: task.description || '',
          priority: task.priority,
          status: task.completed ? 'completed' : 'pending',
          due_date: task.start_time || '',
          created_at: task.created_at
        }))
      }));

      setTemplatesWithTasks(templatesWithTasksData);
    } catch (error) {
      toast.error('Failed to fetch template tasks');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const completed = newStatus === 'completed';
      const { error } = await supabase
        .from('calendar_events')
        .update({ 
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null 
        })
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success('Task status updated');
      fetchUserTemplateTasks();
    } catch (error) {
      toast.error('Failed to update task status');
    }
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

  const getTemplateProgress = (tasks: TemplateTask[]) => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (templatesWithTasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Learning Templates Assigned</h3>
          <p className="text-muted-foreground">
            You don't have any learning templates assigned yet. Check back later or contact your manager.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Learning Templates</h2>
        <p className="text-muted-foreground">Track your progress on assigned learning templates</p>
      </div>

      {templatesWithTasks.map(({ template, tasks }) => (
        <Card key={template.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{template.name}</CardTitle>
                <CardDescription className="text-sm">
                  {template.technology} • {tasks.length} tasks
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {getTemplateProgress(tasks)}%
                </div>
                <p className="text-sm text-muted-foreground">Complete</p>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={getTemplateProgress(tasks)} className="h-2" />
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.map((task) => {
                const StatusIcon = getStatusIcon(task.status);
                return (
                  <Card key={task.id} className="border-l-4 border-l-primary/20">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusIcon className="h-4 w-4" />
                            <h4 className="font-medium">{task.title}</h4>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                          )}
                          {task.due_date && (
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <div className="flex gap-2">
                            <Badge variant={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge variant={getStatusColor(task.status)}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            {task.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTaskStatus(task.id, 'in_progress')}
                              >
                                Start
                              </Button>
                            )}
                            {task.status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() => updateTaskStatus(task.id, 'completed')}
                              >
                                Complete
                              </Button>
                            )}
                            {task.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTaskStatus(task.id, 'in_progress')}
                              >
                                Reopen
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}