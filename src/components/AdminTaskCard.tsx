import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { TaskChat } from "@/components/TaskChat";
import { CheckSquare, Clock, Flag, User, Edit, Plus, Calendar, ChevronDown, ChevronRight, X, Check, BookOpen, MessageCircle, Save, Trash2, PlayCircle, StopCircle, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Sub-task Notes Dialog Component
const SubTaskNotesDialog = ({ subTask, onUpdateNotes }: { subTask: CalendarEvent, onUpdateNotes?: (taskId: string, notes: string, files?: string[]) => void }) => {
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

const getStatusIcon = (completed: boolean) => {
  return completed ? CheckSquare : Flag;
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
}: AdminTaskCardProps) => {
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
  
  const StatusIcon = getStatusIcon(task.completed || false);
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

    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from('task-attachments')
      .upload(fileName, file);

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(fileName);

    setFiles(prev => [...prev, publicUrl]);
    return publicUrl;
  };

  const handleFileRemove = async (fileUrl: string) => {
    // Extract file path from URL to delete from storage
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

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            {/* Task Status Indicator */}
            <div className="mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleComplete(task.id, isCompleted)}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                {isCompleted ? (
                  <CheckSquare className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="h-5 w-5 border-2 border-gray-300 rounded transition-colors group-hover:border-blue-500" />
                )}
              </Button>
            </div>

            {/* Task Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-2 ${
                    isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : 
                    'text-gray-900 dark:text-white'
                  }`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center space-x-2 mb-3">
                    <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                      {task.priority}
                    </Badge>
                    {isCompleted && (
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckSquare className="mr-1 h-3 w-3" />
                        Completed
                      </Badge>
                    )}
                    {task.template_id && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200">
                        <BookOpen className="mr-1 h-3 w-3" />
                        Template Task
                      </Badge>
                    )}
                    {!task.template_id && currentUser && task.user_id === currentUser?.id && task.created_by !== task.user_id && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200">
                        <User className="mr-1 h-3 w-3" />
                        Admin Assigned
                      </Badge>
                    )}
                    {!task.template_id && isAdmin && task.user_id !== currentUser?.id && task.created_by !== task.user_id && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200">
                        <User className="mr-1 h-3 w-3" />
                        Admin Assigned
                      </Badge>
                    )}
                    {!task.template_id && isAdmin && task.user_id !== currentUser?.id && task.created_by === task.user_id && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200">
                        <User className="mr-1 h-3 w-3" />
                        {task.profiles?.full_name || task.profiles?.email || 'User Task'}
                      </Badge>
                    )}
                    {!task.template_id && currentUser && task.user_id === currentUser?.id && (!task.created_by || task.created_by === task.user_id) && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200">
                        <User className="mr-1 h-3 w-3" />
                        Personal Task
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  {task.description}
                </p>
              )}

              {/* Task Meta Information */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  {task.start_time && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {task.all_day 
                          ? format(new Date(task.start_time), "MMM dd, yyyy")
                          : format(new Date(task.start_time), "MMM dd, yyyy 'at' h:mm a")
                        }
                      </span>
                    </div>
                  )}
                  {isAdmin && task.profiles && (
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {getInitials(task.profiles.full_name || task.profiles.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{task.profiles.full_name || task.profiles.email}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {/* Work Session Tracking - Show for user's own tasks */}
                  {currentUser && task.user_id === currentUser.id && (
                    <Button
                      variant={activeWorkSession ? "destructive" : "default"}
                      size="sm"
                      onClick={activeWorkSession ? handleStopWork : handleStartWork}
                      disabled={isStartingWork}
                      className="h-8 opacity-100"
                    >
                      {isStartingWork ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                      ) : activeWorkSession ? (
                        <>
                          <StopCircle className="mr-1 h-3 w-3" />
                          Stop Work
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-1 h-3 w-3" />
                          Start Work
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button
                    variant={isCompleted ? "outline" : "default"}
                    size="sm"
                    onClick={() => onToggleComplete(task.id, isCompleted)}
                    className="h-8"
                  >
                    {isCompleted ? (
                      <>
                        <X className="mr-1 h-3 w-3" />
                        Mark Incomplete
                      </>
                    ) : (
                      <>
                        <Check className="mr-1 h-3 w-3" />
                        Mark Complete
                      </>
                    )}
                  </Button>
                  
                  {/* Notes Dialog */}
                  <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                      >
                        <MessageCircle className="mr-1 h-3 w-3" />
                        Notes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <MessageCircle className="h-5 w-5" />
                          <span>Task Notes & Files</span>
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">{task.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{task.description}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Progress Notes</label>
                          <Textarea
                            placeholder="View user's progress notes and add admin comments..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-24"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Attachments</label>
                          <FileUpload
                            onFileUpload={handleFileUpload}
                            onFileRemove={handleFileRemove}
                            files={files}
                            maxFiles={5}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveNotes} disabled={isSavingNotes}>
                            {isSavingNotes ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                            ) : (
                              <Save className="h-4 w-4 mr-1" />
                            )}
                            Save Notes
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {!isTemplateTask && (
                    <>
                      {(!task.sub_tasks || task.sub_tasks.length === 0) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAddSubTask(task)}
                          className="h-8"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Sub-task
                        </Button>
                      )}
                      
                      {/* Edit Button - Only for personal tasks (not admin-assigned) or admins */}
                      {(isAdmin || (!task.created_by || task.created_by === task.user_id)) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditTask(task)}
                          className="h-8"
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                      )}
                      
                      {/* Delete Button - Only for admins */}
                      {isAdmin && onDeleteTask && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteTask(task.id)}
                          className="h-8 text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                  
                   {/* Chat - Show for admin-assigned tasks (using created_by field) */}
                   {currentUser && task.created_by && task.created_by !== task.user_id && (
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
                   )}
                   
                   {/* Chat for template tasks */}
                   {task.template_id && (
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
                   )}
                </div>
              </div>

              {/* Active Work Session Indicator */}
              {activeWorkSession && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-green-600 animate-pulse" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Working since {format(new Date(activeWorkSession.start_time), 'h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">Location tracked</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Preview */}
              {task.notes && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-2">
                    <MessageCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Progress Notes:</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">{task.notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tasks Section */}
              {hasSubTasks && (
                <Collapsible open={isSubTasksExpanded} onOpenChange={setIsSubTasksExpanded}>
                  <div className="border-t pt-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2 p-0 h-auto text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        {isSubTasksExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span>Sub-tasks ({task.sub_tasks!.length})</span>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-3 space-y-2">
                       {task.sub_tasks!.map((subTask) => (
                         <div key={subTask.id} className="group/sub flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                           <div className="flex items-center space-x-3 flex-1">
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => onToggleComplete(subTask.id, subTask.completed || false)}
                               className="h-6 w-6 p-0"
                             >
                               {subTask.completed ? (
                                 <CheckSquare className="h-4 w-4 text-green-600" />
                               ) : (
                                 <div className="h-4 w-4 border border-gray-400 rounded transition-colors hover:border-blue-500" />
                               )}
                             </Button>
                             
                             <div className="flex-1 min-w-0">
                               <p className={`text-sm font-medium ${subTask.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                 {subTask.title}
                               </p>
                               {subTask.description && (
                                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subTask.description}</p>
                               )}
                             </div>
                           </div>
                           
                            <div className="flex items-center space-x-2">
                              <Badge variant={getPriorityColor(subTask.priority)} className="text-xs">
                                {subTask.priority}
                              </Badge>
                              
                              {/* Sub-task action buttons */}
                              <div className="flex items-center space-x-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                    >
                                      <MessageCircle className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                                    </Button>
                                  </DialogTrigger>
                                   <DialogContent className="sm:max-w-lg">
                                     <DialogHeader>
                                       <DialogTitle>Sub-task Notes</DialogTitle>
                                     </DialogHeader>
                                     <SubTaskNotesDialog 
                                       subTask={subTask} 
                                       onUpdateNotes={onUpdateNotes} 
                                     />
                                   </DialogContent>
                                </Dialog>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditTask(subTask)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                                </Button>
                              </div>
                              
                              {isAdmin && subTask.profiles && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                  <Avatar className="h-4 w-4">
                                    <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-teal-600 text-white">
                                      {getInitials(subTask.profiles.full_name || subTask.profiles.email)}
                                   </AvatarFallback>
                                 </Avatar>
                                 <span>{subTask.profiles.full_name || subTask.profiles.email}</span>
                               </div>
                             )}
                           </div>
                         </div>
                       ))}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};