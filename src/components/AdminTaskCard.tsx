import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { CheckSquare, Clock, Flag, User, Edit, Plus, Calendar, ChevronDown, ChevronRight, X, Check, BookOpen, MessageCircle, Save } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  isAdmin,
}: AdminTaskCardProps) => {
  const [isSubTasksExpanded, setIsSubTasksExpanded] = useState(true);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [notes, setNotes] = useState(task.notes || "");
  const [files, setFiles] = useState<string[]>(task.files || []);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
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
    // Mock file upload - in real app, upload to storage and return URL
    const mockUrl = `uploads/${file.name}`;
    setFiles(prev => [...prev, mockUrl]);
    return mockUrl;
  };

  const handleFileRemove = (fileUrl: string) => {
    setFiles(prev => prev.filter(f => f !== fileUrl));
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
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                        <BookOpen className="mr-1 h-3 w-3" />
                        Template Task
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddSubTask(task)}
                        className="h-8"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Sub-task
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditTask(task)}
                        className="h-8"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>

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