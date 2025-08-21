import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Plus, Settings, BookOpen, TrendingUp, Calendar, ChevronRight, MessageCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TaskChat } from "@/components/TaskChat";
import { TaskNotes } from "@/components/TaskNotes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { supabase } from "@/integrations/supabase/client";

interface LearningTemplate {
  id: string;
  name: string;
  description: string;
  technology: string;
  created_at: string;
}

interface TeamMember {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface TemplateTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  user_id: string;
  completed: boolean;
  created_at: string;
  notes?: string;
  files?: string[];
}

interface TemplateCardProps {
  template: LearningTemplate;
  assignedUsers: TeamMember[];
  tasks: TemplateTask[];
  unassignedUsers: TeamMember[];
  isExpanded: boolean;
  isAdmin: boolean;
  onToggleExpanded: () => void;
  onAssignUser: (userId: string) => void;
  onRemoveUser: (userId: string) => void;
  onAddTask: () => void;
  onEditTemplate: () => void;
  onDeleteTemplate?: () => void;
  onToggleTaskComplete?: (taskId: string, completed: boolean) => void;
  onEditTask?: (task: TemplateTask) => void;
  onReassignTask?: (task: TemplateTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onUpdateTaskNotes?: (taskId: string, notes: string, files?: string[]) => void;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getTechnologyColor = (technology: string) => {
  const colors = {
    'React': 'bg-blue-500',
    'Node.js': 'bg-green-500',
    'Python': 'bg-yellow-500',
    'Java': 'bg-red-500',
    'JavaScript': 'bg-purple-500',
    'TypeScript': 'bg-indigo-500',
    'PHP': 'bg-pink-500',
    'C#': 'bg-orange-500',
    'Go': 'bg-teal-500',
    'Rust': 'bg-gray-500',
  };
  return colors[technology as keyof typeof colors] || 'bg-slate-500';
};

const getProgress = (tasks: TemplateTask[]) => {
  if (tasks.length === 0) return 0;
  const completedTasks = tasks.filter(task => task.completed || task.status === 'completed').length;
  return Math.round((completedTasks / tasks.length) * 100);
};

export const TemplateCard = ({
  template,
  assignedUsers,
  tasks,
  unassignedUsers,
  isExpanded,
  isAdmin,
  onToggleExpanded,
  onAssignUser,
  onRemoveUser,
  onAddTask,
  onEditTemplate,
  onDeleteTemplate,
  onToggleTaskComplete,
  onEditTask,
  onReassignTask,
  onDeleteTask,
  onUpdateTaskNotes,
}: TemplateCardProps) => {
  const progress = getProgress(tasks);
  const completedTasks = tasks.filter(task => task.completed || task.status === 'completed').length;
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className={`w-16 h-16 rounded-2xl ${getTechnologyColor(template.technology)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
              <BookOpen className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                {template.name}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {template.description || "No description available"}
              </CardDescription>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {template.technology}
                </Badge>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Users className="h-4 w-4 mr-1" />
                  {assignedUsers.length} user{assignedUsers.length !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {completedTasks}/{tasks.length} completed
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="shadow-sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Assign User
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {unassignedUsers.length > 0 ? (
                      unassignedUsers.map((member) => (
                        <DropdownMenuItem
                          key={member.user_id}
                          onClick={() => onAssignUser(member.user_id)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(member.full_name || member.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.full_name}</div>
                              <div className="text-xs text-gray-500">{member.email}</div>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>
                        All users assigned
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="shadow-sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEditTemplate} className="cursor-pointer">
                      Edit Template
                    </DropdownMenuItem>
                    {onDeleteTemplate && (
                      <DropdownMenuItem onClick={onDeleteTemplate} className="cursor-pointer text-red-600">
                        Delete Template
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            
            <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="shadow-sm">
                  <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{progress}%</span>
          </div>
          <Progress 
            value={progress} 
            className="h-2 bg-gray-200 dark:bg-gray-700" 
          />
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Assigned Users Section */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Assigned Users ({assignedUsers.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {assignedUsers.map((user) => {
                  const userTasks = tasks.filter(task => task.user_id === user.user_id);
                  const userProgress = getProgress(userTasks);
                  
                  return (
                    <div key={user.user_id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {getInitials(user.full_name || user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{user.full_name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Settings className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => onRemoveUser(user.user_id)}
                                className="cursor-pointer text-red-600"
                              >
                                Remove from template
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          {userTasks.filter(t => t.completed || t.status === 'completed').length}/{userTasks.length} tasks
                        </span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{userProgress}%</span>
                      </div>
                      <Progress value={userProgress} className="h-1 mt-1" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tasks Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Tasks ({tasks.length})
                </h4>
                {isAdmin && (
                  <Button onClick={onAddTask} size="sm" variant="outline" className="shadow-sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
                )}
              </div>
              
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No tasks created yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map((task) => {
                    const assignedUser = assignedUsers.find(u => u.user_id === task.user_id);
                    return (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleTaskComplete?.(task.id, task.completed)}
                            className="h-6 w-6 p-0 shrink-0"
                          >
                            {task.completed || task.status === 'completed' ? (
                              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 border-2 border-gray-400 rounded-full" />
                            )}
                          </Button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm truncate ${
                              task.completed || task.status === 'completed' ? 'line-through text-gray-500' : ''
                            }`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-gray-500 mt-1 truncate">{task.description}</p>
                            )}
                            {assignedUser && (
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                <Users className="h-3 w-3 mr-1" />
                                {assignedUser.full_name}
                              </div>
                            )}
                          </div>
                        </div>
                         <div className="flex items-center space-x-2 shrink-0">
                           <Badge 
                             variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} 
                             className="text-xs"
                           >
                             {task.priority}
                           </Badge>
                           <Badge 
                             variant={task.completed || task.status === 'completed' ? 'default' : 'outline'} 
                             className="text-xs"
                           >
                             {task.completed || task.status === 'completed' ? 'Completed' : 'Pending'}
                           </Badge>
                           
                            {isAdmin && (
                              <>
                                 {/* Notes Button */}
                                 <TaskNotes
                                   taskId={task.id}
                                   taskTitle={task.title}
                                   assignedUsers={assignedUsers}
                                   isAdmin={isAdmin}
                                 />
                                 
                                 {/* Chat Button */}
                                 <TaskChat
                                   taskId={task.id}
                                   taskTitle={task.title}
                                   assignedUsers={assignedUsers}
                                   isAdmin={isAdmin}
                                 />
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <Settings className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem 
                                      onClick={() => onEditTask?.(task)}
                                      className="cursor-pointer"
                                    >
                                      Edit Task
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => onToggleTaskComplete?.(task.id, task.completed)}
                                      className="cursor-pointer"
                                    >
                                      Mark as {task.completed || task.status === 'completed' ? 'Pending' : 'Completed'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => onReassignTask?.(task)}
                                      className="cursor-pointer"
                                    >
                                      Reassign Task
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => onDeleteTask?.(task.id)}
                                      className="cursor-pointer text-red-600"
                                    >
                                      Delete Task
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                         </div>
                      </div>
                    );
                  })}
                  {tasks.length > 5 && (
                    <div className="text-center py-2">
                      <span className="text-sm text-gray-500">+{tasks.length - 5} more tasks...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};