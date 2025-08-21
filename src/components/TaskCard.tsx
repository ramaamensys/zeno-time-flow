import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { CheckSquare, Clock, Flag, MessageCircle, User, Edit, Trash2, Calendar, Save, BookOpen } from "lucide-react";
import { TaskChat } from "@/components/TaskChat";
import { TaskNotes } from "@/components/TaskNotes";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    completed: boolean;
    created_at: string;
    user_id: string;
    notes?: string;
    template_id?: string | null;
    files?: string[];
  };
  user?: {
    full_name: string | null;
    email: string;
  };
  isAdmin: boolean;
  isUserTask?: boolean;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onUpdateNotes?: (taskId: string, notes: string, files?: string[]) => void;
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onAssignTask?: (taskId: string) => void;
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

const getStatusIcon = (status: string, completed: boolean) => {
  if (completed || status === 'completed') return CheckSquare;
  if (status === 'in_progress') return Clock;
  return Flag;
};

export const TaskCard = ({
  task,
  user,
  isAdmin,
  isUserTask = false,
  onToggleComplete,
  onUpdateNotes,
  onEditTask,
  onDeleteTask,
  onAssignTask,
}: TaskCardProps) => {
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [notes, setNotes] = useState(task.notes || "");
  const [files, setFiles] = useState<string[]>(task.files || []);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Check if this is a template task that shouldn't be edited by users
  const isTemplateTask = task.template_id !== null;
  const canEditTask = isAdmin || (!isTemplateTask && isUserTask);
  const canToggleComplete = isUserTask || (isAdmin && !isTemplateTask);

  const StatusIcon = getStatusIcon(task.status, task.completed);
  const isCompleted = task.completed || task.status === 'completed';

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

  return (
    <Card className="group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Task Status Indicator */}
            <div className="mt-1">
              {canToggleComplete && onToggleComplete ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleComplete(task.id, isCompleted)}
                  className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {isCompleted ? (
                    <CheckSquare className="h-5 w-5 text-green-600" />
                  ) : (
                    <div className="h-5 w-5 border-2 border-gray-300 rounded transition-colors group-hover:border-blue-500" />
                  )}
                </Button>
              ) : (
                <div className={`w-3 h-3 rounded-full mt-2 ${
                  isCompleted ? 'bg-green-500' : 
                  task.status === 'in_progress' ? 'bg-yellow-500' : 
                  'bg-gray-400'
                }`} />
              )}
            </div>

            {/* Task Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className={`font-semibold text-sm ${
                  isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : 
                  'text-gray-900 dark:text-white'
                }`}>
                  {task.title}
                </h4>
                <div className="flex items-center space-x-1 ml-2">
                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                    {task.priority}
                  </Badge>
                  {isTemplateTask && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                      <BookOpen className="mr-1 h-3 w-3" />
                      Template
                    </Badge>
                  )}
                </div>
              </div>

              {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* Task Meta Information */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                  {user && (
                    <div className="flex items-center space-x-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {getInitials(user.full_name || user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.full_name || user.email.split('@')[0]}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Created {format(new Date(task.created_at), 'MMM dd')}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-1">
                  {/* Notes Dialog - Only for users with their own tasks or admins */}
                  {(isUserTask || isAdmin) && (
                    <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MessageCircle className={`h-3 w-3 ${task.notes || files.length > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
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
                              placeholder={canEditTask ? "Add your progress notes, challenges, or thoughts about this task..." : "View progress notes..."}
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              className="min-h-24"
                              disabled={!canEditTask}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Attachments</label>
                            <FileUpload
                              onFileUpload={handleFileUpload}
                              onFileRemove={handleFileRemove}
                              files={files}
                              disabled={!canEditTask}
                              maxFiles={5}
                            />
                          </div>
                          {canEditTask && (
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
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Chat and Notes for template tasks or admins */}
                  {(isUserTask || isAdmin) && (
                    <>
                      {/* TaskNotes Component */}
                      <TaskNotes
                        taskId={task.id}
                        taskTitle={task.title}
                        assignedUsers={user ? [{
                          user_id: task.user_id,
                          full_name: user.full_name,
                          email: user.email
                        }] : []}
                        isAdmin={isAdmin}
                      />
                      
                      {/* TaskChat Component */}
                      <TaskChat
                        taskId={task.id}
                        taskTitle={task.title}
                        assignedUsers={user ? [{
                          user_id: task.user_id,
                          full_name: user.full_name,
                          email: user.email
                        }] : []}
                        isAdmin={isAdmin}
                      />
                    </>
                  )}

                  {/* Admin Actions - Only show for non-template tasks or admins */}
                  {isAdmin && (
                    <>
                      {onEditTask && !isTemplateTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditTask(task.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                        </Button>
                      )}
                      
                      {onAssignTask && !isTemplateTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAssignTask(task.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <User className="h-3 w-3 text-gray-400 hover:text-green-500" />
                        </Button>
                      )}
                      
                      {onDeleteTask && !isTemplateTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteTask(task.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Notes Preview */}
              {task.notes && (
                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-1">
                    <MessageCircle className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300 line-clamp-2">{task.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};