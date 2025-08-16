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
import { Plus, Users, BookOpen, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
}

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
}

export default function LearningTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<LearningTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<LearningTemplate | null>(null);
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([]);
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showAssignUser, setShowAssignUser] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  
  // Form states
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    technology: ""
  });
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
    user_id: ""
  });

  useEffect(() => {
    fetchTemplates();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      fetchTemplateAssignments();
      fetchTemplateTasks();
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_templates')
        .select('*')
        .order('created_at', { ascending: false });

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

  const fetchTemplateAssignments = async () => {
    if (!selectedTemplate) return;

    try {
      const { data, error } = await supabase
        .from('template_assignments')
        .select('*')
        .eq('template_id', selectedTemplate.id);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      toast.error('Failed to fetch template assignments');
    }
  };

  const fetchTemplateTasks = async () => {
    if (!selectedTemplate) return;

    try {
      const { data, error } = await supabase
        .from('template_tasks')
        .select('*')
        .eq('template_id', selectedTemplate.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplateTasks(data || []);
    } catch (error) {
      toast.error('Failed to fetch template tasks');
    }
  };

  const createTemplate = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('learning_templates')
        .insert({
          ...newTemplate,
          created_by: user.id
        });

      if (error) throw error;
      
      toast.success('Learning template created successfully');
      setShowCreateTemplate(false);
      setNewTemplate({ name: "", description: "", technology: "" });
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to create learning template');
    }
  };

  const assignUserToTemplate = async () => {
    if (!user || !selectedTemplate || !selectedUserId) return;

    try {
      const { error } = await supabase
        .from('template_assignments')
        .insert({
          template_id: selectedTemplate.id,
          user_id: selectedUserId,
          assigned_by: user.id
        });

      if (error) throw error;
      
      toast.success('User assigned to template successfully');
      setShowAssignUser(false);
      setSelectedUserId("");
      fetchTemplateAssignments();
    } catch (error) {
      toast.error('Failed to assign user to template');
    }
  };

  const createTemplateTask = async () => {
    if (!user || !selectedTemplate || !newTask.user_id) return;

    try {
      const { error } = await supabase
        .from('template_tasks')
        .insert({
          template_id: selectedTemplate.id,
          ...newTask,
          created_by: user.id
        });

      if (error) throw error;
      
      toast.success('Template task created successfully');
      setShowCreateTask(false);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
        user_id: ""
      });
      fetchTemplateTasks();
    } catch (error) {
      toast.error('Failed to create template task');
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

  const getAssignedUsers = () => {
    return assignments.map(a => {
      const profile = teamMembers.find(tm => tm.user_id === a.user_id);
      return {
        user_id: a.user_id,
        full_name: profile?.full_name || 'Unknown',
        email: profile?.email || 'Unknown'
      };
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Learning Templates</h1>
          <p className="text-muted-foreground">Manage employee learning templates and assignments</p>
        </div>
        <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Java Full Stack"
                />
              </div>
              <div>
                <Label htmlFor="technology">Technology</Label>
                <Input
                  id="technology"
                  value={newTemplate.technology}
                  onChange={(e) => setNewTemplate({ ...newTemplate, technology: e.target.value })}
                  placeholder="e.g., Java, Python, .NET"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Describe the learning template..."
                />
              </div>
              <Button onClick={createTemplate} className="w-full">
                Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Templates</h2>
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className={`cursor-pointer transition-colors ${
                selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>{template.technology}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Template Details */}
        {selectedTemplate && (
          <>
            {/* Assigned Users */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Assigned Users</h2>
                <Dialog open={showAssignUser} onOpenChange={setShowAssignUser}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Users className="mr-2 h-4 w-4" />
                      Assign User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign User to Template</DialogTitle>
                      <DialogDescription>
                        Assign a team member to {selectedTemplate.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="user">Select User</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers
                              .filter(member => !getAssignedUsers().some(u => u.user_id === member.user_id))
                              .map((member) => (
                                <SelectItem key={member.user_id} value={member.user_id}>
                                  {member.full_name} ({member.email})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={assignUserToTemplate} className="w-full">
                        Assign User
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2">
                {getAssignedUsers().map((user) => (
                  <Card key={user.user_id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge variant="outline">
                          {templateTasks.filter(t => t.user_id === user.user_id).length} tasks
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Template Tasks */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Template Tasks</h2>
                <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Create Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Template Task</DialogTitle>
                      <DialogDescription>
                        Create a task for a user in {selectedTemplate.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="task-user">Assign to User</Label>
                        <Select value={newTask.user_id} onValueChange={(value) => setNewTask({ ...newTask, user_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAssignedUsers().map((user) => (
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
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                          placeholder="e.g., Learn Spring Boot"
                        />
                      </div>
                      <div>
                        <Label htmlFor="task-description">Description</Label>
                        <Textarea
                          id="task-description"
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                          placeholder="Describe the task..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="task-priority">Priority</Label>
                        <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
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
                          value={newTask.due_date}
                          onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                        />
                      </div>
                      <Button onClick={createTemplateTask} className="w-full">
                        Create Task
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2">
                {templateTasks.map((task) => {
                  const assignedUser = getAssignedUsers().find(u => u.user_id === task.user_id);
                  const StatusIcon = getStatusIcon(task.status);
                  return (
                    <Card key={task.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <StatusIcon className="h-4 w-4" />
                              <h3 className="font-medium">{task.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            <p className="text-sm font-medium">Assigned to: {assignedUser?.full_name || 'Unknown'}</p>
                            {task.due_date && (
                              <p className="text-sm text-muted-foreground">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Badge variant={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge variant={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}