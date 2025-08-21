import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckSquare, Clock, Flag, MessageCircle, User, Edit, Trash2, Calendar, Save } from "lucide-react";
import { format } from "date-fns";

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
  };
  user?: {
    full_name: string | null;
    email: string;
  };
  isAdmin: boolean;
  isUserTask?: boolean;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onUpdateNotes?: (taskId: string, notes: string) => void;
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
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const StatusIcon = getStatusIcon(task.status, task.completed);
  const isCompleted = task.completed || task.status === 'completed';

  const handleSaveNotes = async () => {
    if (onUpdateNotes) {
      setIsSavingNotes(true);
      await onUpdateNotes(task.id, notes);
      setIsSavingNotes(false);
      setIsNotesDialogOpen(false);
    }
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Task Status Indicator */}
            <div className="mt-1">
              {isUserTask && onToggleComplete ? (
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
                          <MessageCircle className={`h-3 w-3 ${task.notes ? 'text-blue-500' : 'text-gray-400'}`} />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center space-x-2">
                            <MessageCircle className="h-5 w-5" />
                            <span>Task Notes</span>
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
                              placeholder={isUserTask ? "Add your progress notes, challenges, or thoughts about this task..." : "View user's progress notes..."}
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              className="min-h-24"
                              disabled={!isUserTask && !isAdmin}
                            />
                          </div>
                          {(isUserTask || isAdmin) && (
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

                  {/* Admin Actions */}
                  {isAdmin && (
                    <>
                      {onEditTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditTask(task.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                        </Button>
                      )}
                      
                      {onAssignTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAssignTask(task.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <User className="h-3 w-3 text-gray-400 hover:text-green-500" />
                        </Button>
                      )}
                      
                      {onDeleteTask && (
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