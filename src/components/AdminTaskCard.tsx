import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { TaskChat } from "@/components/TaskChat";
import { TaskNotes } from "@/components/TaskNotes";
import { CheckSquare, Flag, User, Edit, Plus, Calendar, ChevronDown, ChevronRight, X, Check, BookOpen, MessageCircle, Save, Trash2, PlayCircle, StopCircle, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Sub-task Notes Dialog Component

interface SubTaskNotesDialogProps {
  subTask: CalendarEvent;
  onUpdateNotes?: (taskId: string, notes: string, files?: string[]) => void;
}

const SubTaskNotesDialog = ({ subTask, onUpdateNotes }: SubTaskNotesDialogProps) => {
  const [subTaskNotes, setSubTaskNotes] = useState(subTask.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSubTaskNotes = async () => {
    if (onUpdateNotes) {
      setIsSaving(true);
      await onUpdateNotes(subTask.id, subTaskNotes);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">{subTask.title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-300">{subTask.description}</p>
      </div>
      <Textarea
        placeholder="Add notes for this sub-task..."
        value={subTaskNotes}
        onChange={(e) => setSubTaskNotes(e.target.value)}
        className="min-h-24"
      />
      <div className="flex justify-end space-x-2">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSaveSubTaskNotes} disabled={isSaving}>
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Save Notes
        </Button>
      </div>
    </div>
  );
};

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
  notes?: string | null;
  files?: string[];
  profiles?: {
    full_name: string | null;
    email: string;
  };
  sub_tasks?: CalendarEvent[];
}

interface AdminTaskCardProps {
  task: CalendarEvent;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onAddSubTask: (parentTask: CalendarEvent) => void;
  onEditTask: (task: CalendarEvent) => void;
  onViewDetails: (task: CalendarEvent) => void;
  onUpdateNotes?: (taskId: string, notes: string, files?: string[]) => void;
  onDeleteTask?: (taskId: string) => void;
  isAdmin: boolean;
  level?: number; // For nested indentation
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
};

export const AdminTaskCard = ({
  task,
  onToggleComplete,
  onAddSubTask,
  onEditTask,
  onViewDetails,
  onUpdateNotes,
  onDeleteTask,
  isAdmin,
  level = 0,
}: AdminTaskCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubTasksExpanded, setIsSubTasksExpanded] = useState(true);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [notes, setNotes] = useState(task.notes || "");
  const [files, setFiles] = useState<string[]>(task.files || []);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeWorkSession, setActiveWorkSession] = useState<any>(null);
  const [isStartingWork, setIsStartingWork] = useState(false);

  // Get current user and active work session
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        // Check for active work session
        const { data: sessions } = await supabase
          .from('task_work_sessions')
          .select('*')
          .eq('task_id', task.id)
          .eq('user_id', user.id)
          .is('end_time', null)
          .order('start_time', { ascending: false })
          .limit(1);
        
        if (sessions && sessions.length > 0) {
          setActiveWorkSession(sessions[0]);
        }
      }
    };
    getCurrentUser();
  }, [task.id]);
  
  const isCompleted = task.completed || false;
  const hasSubTasks = task.sub_tasks && task.sub_tasks.length > 0;
  const isTemplateTask = task.template_id !== null;

  const handleSaveNotes = async () => {
    if (onUpdateNotes) {
      setIsSavingNotes(true);
      await onUpdateNotes(task.id, notes, files);
      setIsSavingNotes(false);
      setIsNotesDialogOpen(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('task-attachments')
      .upload(fileName, file);

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(fileName);

    setFiles(prev => [...prev, publicUrl]);
    return publicUrl;
  };

  const handleFileRemove = async (fileUrl: string) => {
    try {
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const userFolder = urlParts[urlParts.length - 2];
      const filePath = `${userFolder}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('task-attachments')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
      }
    } catch (error) {
      console.error('Error parsing file URL for deletion:', error);
    }
    
    setFiles(prev => prev.filter(f => f !== fileUrl));
  };

  const getLocation = (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleStartWork = async () => {
    if (!currentUser) return;
    
    setIsStartingWork(true);
    try {
      const location = await getLocation();
      
      const { data, error } = await supabase
        .from('task_work_sessions')
        .insert({
          task_id: task.id,
          user_id: currentUser.id,
          start_location: location,
        })
        .select()
        .single();

      if (error) throw error;
      
      setActiveWorkSession(data);
      toast.success('Work session started! Location tracked.');
    } catch (error: any) {
      console.error('Error starting work session:', error);
      if (error.message.includes('Geolocation')) {
        toast.error('Please allow location access to track work sessions');
      } else {
        toast.error('Failed to start work session');
      }
    } finally {
      setIsStartingWork(false);
    }
  };

  const handleStopWork = async () => {
    if (!currentUser || !activeWorkSession) return;
    
    setIsStartingWork(true);
    try {
      const location = await getLocation();
      
      const { error } = await supabase
        .from('task_work_sessions')
        .update({
          end_time: new Date().toISOString(),
          end_location: location,
        })
        .eq('id', activeWorkSession.id);

      if (error) throw error;
      
      setActiveWorkSession(null);
      toast.success('Work session completed! Location tracked.');
    } catch (error: any) {
      console.error('Error stopping work session:', error);
      if (error.message.includes('Geolocation')) {
        toast.error('Please allow location access to complete work session');
      } else {
        toast.error('Failed to stop work session');
      }
    } finally {
      setIsStartingWork(false);
    }
  };

  const getIndentClass = (level: number) => {
    switch(level) {
      case 1: return 'ml-4';
      case 2: return 'ml-8';
      case 3: return 'ml-12';
      default: return level > 3 ? 'ml-16' : '';
    }
  };
  
  const indentClass = getIndentClass(level);
  const isSubTask = level > 0;
  
  return (
    <Card className={`group hover:shadow-md transition-all duration-200 ${
      isSubTask 
        ? 'bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/30 dark:to-purple-950/30 border-l-4 border-l-blue-500' 
        : 'bg-white dark:bg-gray-800'
    } border border-gray-200 dark:border-gray-700 ${indentClass}`}>
      <CardContent className="p-4">
        {/* Collapsed View */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(task.id, isCompleted);
              }}
              className="h-6 w-6 p-0"
            >
              {isCompleted ? (
                <CheckSquare className="h-5 w-5 text-green-600" />
              ) : (
                <div className="h-5 w-5 border-2 border-gray-300 rounded" />
              )}
            </Button>
            
            <div className="flex-1">
              <h3 className={`text-base font-semibold ${
                isCompleted ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'
              }`}>
                {task.title}
              </h3>
              <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                <span>Created {format(new Date(task.created_at), 'MMM dd, yyyy')}</span>
                {task.profiles && (
                  <>
                    <span>•</span>
                    <span>by {task.profiles.full_name || task.profiles.email}</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                {task.priority}
              </Badge>
              {isSubTask && (
                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200">
                  Sub-task
                </Badge>
              )}
              {isTemplateTask && (
                <Badge variant="outline" className="text-xs">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Template
                </Badge>
              )}
            </div>
            
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Header with Actions */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {task.title}
                </h2>
                <div className="flex items-center space-x-2 flex-wrap">
                  <Badge variant={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  {isSubTask && (
                    <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 text-blue-700 dark:text-blue-300 border-blue-300">
                      Sub-task
                    </Badge>
                  )}
                  {isCompleted && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckSquare className="mr-1 h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                  {isTemplateTask && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      <BookOpen className="mr-1 h-3 w-3" />
                      Template Task
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Top Right Actions */}
              <div className="flex items-center space-x-2">
                {isAdmin && !isTemplateTask && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTask(task);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSubTask(task);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Subtask
                    </Button>
                  </>
                )}
                <Button
                  variant={isCompleted ? "outline" : "default"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(task.id, isCompleted);
                  }}
                >
                  {isCompleted ? (
                    <>
                      <X className="mr-1 h-4 w-4" />
                      Mark Incomplete
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      Mark Complete
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Responsibilities/Description */}
            {task.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Responsibilities / Details
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              </div>
            )}

            {/* Attachments and Actions Section */}
            <div className="space-y-4">
              {/* Attachments */}
              {files.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Attachments
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {files.map((file, index) => (
                      <a
                        key={index}
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100"
                      >
                        Attachment {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Work Button */}
              {currentUser && task.user_id === currentUser.id && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Work Session
                  </h3>
                  <Button
                    variant={activeWorkSession ? "destructive" : "default"}
                    size="sm"
                    onClick={activeWorkSession ? handleStopWork : handleStartWork}
                    disabled={isStartingWork}
                    className="w-full sm:w-auto"
                  >
                    {isStartingWork ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : activeWorkSession ? (
                      <>
                        <StopCircle className="mr-2 h-4 w-4" />
                        Stop Work
                        <MapPin className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Start Work (Track Location)
                      </>
                    )}
                  </Button>
                  {activeWorkSession && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Working since {format(new Date(activeWorkSession.start_time), 'h:mm a')}
                    </p>
                  )}
                </div>
              )}

              {/* Notes Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Notes
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <TaskNotes
                    taskId={task.id}
                    taskTitle={task.title}
                    assignedUsers={isAdmin && task.profiles ? [{
                      user_id: task.user_id,
                      full_name: task.profiles.full_name,
                      email: task.profiles.email
                    }] : []}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>

              {/* Chat Section for Admin-Assigned Tasks */}
              {!isTemplateTask && currentUser && task.created_by && task.created_by !== task.user_id && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Communication
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <TaskChat
                      taskId={task.id}
                      taskTitle={task.title}
                      assignedUsers={isAdmin && task.profiles ? [{
                        user_id: task.user_id,
                        full_name: task.profiles.full_name,
                        email: task.profiles.email
                      }] : []}
                      isAdmin={isAdmin}
                    />
                  </div>
                </div>
              )}

              {/* Sub-tasks Section - Rendered as full task cards */}
              {hasSubTasks && (
                <div>
                  <Collapsible open={isSubTasksExpanded} onOpenChange={setIsSubTasksExpanded}>
                    <div className="border-t pt-4">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="flex items-center space-x-2 p-0 h-auto text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 mb-3">
                          {isSubTasksExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span>Sub-tasks ({task.sub_tasks!.length})</span>
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="space-y-3 mt-3">
                        {task.sub_tasks!.map((subTask) => (
                          <AdminTaskCard
                            key={subTask.id}
                            task={subTask}
                            onToggleComplete={onToggleComplete}
                            onAddSubTask={onAddSubTask}
                            onEditTask={onEditTask}
                            onViewDetails={onViewDetails}
                            onUpdateNotes={onUpdateNotes}
                            onDeleteTask={onDeleteTask}
                            isAdmin={isAdmin}
                            level={level + 1}
                          />
                        ))}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                </div>
              )}

              {/* Delete Button at Bottom - Admin Only */}
              {isAdmin && !isTemplateTask && onDeleteTask && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTask(task.id);
                    }}
                    className="w-full text-red-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Task
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
