import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Check, Plus, Flame, Clock, Users, Edit, Trash2, StickyNote } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Habit {
  id: string;
  title: string;
  description?: string;
  category: string;
  frequency: 'daily' | 'weekly';
  target_count: number;
  current_streak: number;
  best_streak: number;
  created_at: string;
  color: string;
  notes?: string;
  start_date?: string;
  start_time?: string;
}

interface HabitCompletion {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
}

const Habits = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [isEditingHabit, setIsEditingHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeekDate, setSelectedWeekDate] = useState<string | null>(null);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [currentHabitForNotes, setCurrentHabitForNotes] = useState<Habit | null>(null);
  const [habitNotes, setHabitNotes] = useState('');

  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    category: 'health',
    frequency: 'daily' as const,
    target_count: 1,
    color: '#10b981',
    notes: '',
    start_date: new Date().toISOString().split('T')[0],
    start_time: '09:00'
  });

  const [editHabitForm, setEditHabitForm] = useState({
    title: '',
    description: '',
    category: 'health',
    frequency: 'daily' as 'daily' | 'weekly',
    target_count: 1,
    color: '#10b981'
  });

  const categories = [
    { value: 'health', label: 'Health & Fitness', color: '#10b981' },
    { value: 'productivity', label: 'Productivity', color: '#3b82f6' },
    { value: 'learning', label: 'Learning', color: '#8b5cf6' },
    { value: 'mindfulness', label: 'Mindfulness', color: '#f59e0b' },
    { value: 'social', label: 'Social', color: '#ef4444' },
    { value: 'creative', label: 'Creative', color: '#ec4899' }
  ];

  const colors = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899',
    '#14b8a6', '#6366f1', '#84cc16', '#f97316', '#06b6d4', '#a855f7'
  ];

  useEffect(() => {
    if (user) {
      const initializeData = async () => {
        await checkUserRole();
        loadHabits();
        loadCompletions();
      };
      initializeData();
    }
  }, [user, selectedUserId]);

  const checkUserRole = async () => {
    if (!user) return;

    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (error) {
        console.error('Error checking user role:', error);
        setUserRole('user');
        return;
      }
      
      console.log('User role set to:', roles?.role || 'user', 'for user:', user?.email);
      const role = roles?.role || 'user';
      setUserRole(role);
      
      // Load users if admin
      if (role === 'admin' || role === 'super_admin') {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error in checkUserRole:', error);
      setUserRole('user');
    }
  };

  const loadUsers = async () => {
    if (!user) return;

    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .neq('user_id', user.id) // Exclude current user from the list
        .order('full_name');

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      } else if (profiles) {
        setUsers(profiles.map(p => ({ 
          id: p.user_id, 
          full_name: p.full_name || p.email || 'Unknown', 
          email: p.email || '' 
        })));
        console.log('Loaded users:', profiles.length);
      }
    } catch (error) {
      console.error('Error in loadUsers:', error);
    }
  };

  const loadHabits = async () => {
    if (!user) return;

    const targetUserId = selectedUserId || user.id;
    
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading habits:', error);
      toast.error('Failed to load habits');
    } else {
      setHabits((data || []).map(habit => ({
        ...habit,
        frequency: habit.frequency as 'daily' | 'weekly'
      })));
    }
    setIsLoading(false);
  };

  const loadCompletions = async () => {
    if (!user) return;

    const targetUserId = selectedUserId || user.id;
    
    const { data, error } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Error loading completions:', error);
      toast.error('Failed to load habit completions');
    } else {
      setCompletions(data || []);
    }
  };

  const createHabit = async () => {
    if (!newHabit.title.trim()) {
      toast.error('Please enter a title for the habit');
      return;
    }

    const { error } = await supabase
      .from('habits')
      .insert([{
        title: newHabit.title,
        description: newHabit.description,
        category: newHabit.category,
        frequency: newHabit.frequency,
        target_count: newHabit.target_count,
        color: newHabit.color,
        notes: newHabit.notes,
        start_date: newHabit.start_date,
        start_time: newHabit.start_time,
        user_id: user?.id
      }]);

    if (error) {
      console.error('Error creating habit:', error);
      toast.error('Failed to create habit');
    } else {
      setNewHabit({
        title: '',
        description: '',
        category: 'health',
        frequency: 'daily',
        target_count: 1,
        color: '#10b981',
        notes: '',
        start_date: new Date().toISOString().split('T')[0],
        start_time: '09:00'
      });
      setIsAddingHabit(false);
      toast.success('Habit created successfully');
      loadHabits();
    }
  };

  const startEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setEditHabitForm({
      title: habit.title,
      description: habit.description || '',
      category: habit.category,
      frequency: habit.frequency,
      target_count: habit.target_count,
      color: habit.color
    });
    setIsEditingHabit(true);
  };

  const updateHabit = async () => {
    if (!editingHabit || !editHabitForm.title.trim()) {
      toast.error('Please enter a title for the habit');
      return;
    }

    const { error } = await supabase
      .from('habits')
      .update({
        title: editHabitForm.title,
        description: editHabitForm.description,
        category: editHabitForm.category,
        frequency: editHabitForm.frequency,
        target_count: editHabitForm.target_count,
        color: editHabitForm.color
      })
      .eq('id', editingHabit.id);

    if (error) {
      console.error('Error updating habit:', error);
      toast.error('Failed to update habit');
    } else {
      setIsEditingHabit(false);
      setEditingHabit(null);
      toast.success('Habit updated successfully');
      loadHabits();
    }
  };

  const deleteHabit = async (habitId: string) => {
    // First delete all completions for this habit
    const { error: completionsError } = await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId);

    if (completionsError) {
      console.error('Error deleting habit completions:', completionsError);
      toast.error('Failed to delete habit completions');
      return;
    }

    // Then delete the habit itself
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId);

    if (error) {
      console.error('Error deleting habit:', error);
      toast.error('Failed to delete habit');
    } else {
      toast.success('Habit deleted successfully');
      loadHabits();
      loadCompletions();
    }
  };

  const toggleHabitCompletion = async (habitId: string) => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const targetUserId = selectedUserId || user.id;
    const existingCompletion = completions.find(c => c.habit_id === habitId && c.date === today);
    
    if (existingCompletion) {
      const { error } = await supabase
        .from('habit_completions')
        .update({ completed: !existingCompletion.completed })
        .eq('id', existingCompletion.id);

      if (error) {
        console.error('Error updating completion:', error);
        toast.error('Failed to update habit completion');
        return;
      }
    } else {
      const { error } = await supabase
        .from('habit_completions')
        .insert([{
          habit_id: habitId,
          user_id: targetUserId,
          date: today,
          completed: true
        }]);

      if (error) {
        console.error('Error creating completion:', error);
        toast.error('Failed to mark habit as complete');
        return;
      }
    }

    // Update streak in habits table
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      const wasCompleted = existingCompletion?.completed || false;
      const isNowCompleted = !wasCompleted;
      
      const { error } = await supabase
        .from('habits')
        .update({
          current_streak: isNowCompleted ? habit.current_streak + 1 : Math.max(0, habit.current_streak - 1),
          best_streak: isNowCompleted && habit.current_streak + 1 > habit.best_streak ? habit.current_streak + 1 : habit.best_streak
        })
        .eq('id', habitId);

      if (error) {
        console.error('Error updating habit streak:', error);
      }
    }

    toast.success(existingCompletion?.completed ? 'Habit marked as incomplete' : 'Habit completed!');
    loadHabits();
    loadCompletions();
  };

  const getHabitCompletion = (habitId: string, date: string) => {
    return completions.find(c => c.habit_id === habitId && c.date === date)?.completed || false;
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const dailyHabits = habits.filter(h => h.frequency === 'daily');
    const completedToday = dailyHabits.filter(h => getHabitCompletion(h.id, today)).length;
    const totalStreaks = habits.reduce((sum, h) => sum + h.current_streak, 0);
    // Calculate perfect days (days where all daily habits were completed)
    const perfectDays = 0; // TODO: Calculate based on historical data

    return { completedToday, totalHabits: dailyHabits.length, totalStreaks, perfectDays };
  };

  const getWeeklyCalendar = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getWeeklyHabitProgress = (habitId: string) => {
    const weekDays = getWeeklyCalendar();
    const completedDays = weekDays.filter(day => {
      const dateStr = day.toISOString().split('T')[0];
      return getHabitCompletion(habitId, dateStr);
    }).length;
    return { completed: completedDays, total: 7 };
  };

  const toggleWeeklyHabitCompletion = async (habitId: string, date: Date) => {
    if (!user) return;

    const dateStr = date.toISOString().split('T')[0];
    const targetUserId = selectedUserId || user.id;
    const existingCompletion = completions.find(c => c.habit_id === habitId && c.date === dateStr);
    
    if (existingCompletion) {
      const { error } = await supabase
        .from('habit_completions')
        .update({ completed: !existingCompletion.completed })
        .eq('id', existingCompletion.id);

      if (error) {
        console.error('Error updating completion:', error);
        toast.error('Failed to update habit completion');
        return;
      }
    } else {
      const { error } = await supabase
        .from('habit_completions')
        .insert([{
          habit_id: habitId,
          user_id: targetUserId,
          date: dateStr,
          completed: true
        }]);

      if (error) {
        console.error('Error creating completion:', error);
        toast.error('Failed to mark habit as complete');
        return;
      }
    }

    toast.success(existingCompletion?.completed ? 'Day marked as incomplete' : 'Day completed!');
    loadCompletions();
  };

  const openNotesDialog = (habit: Habit) => {
    setCurrentHabitForNotes(habit);
    setHabitNotes(habit.notes || '');
    setIsNotesDialogOpen(true);
  };

  const saveHabitNotes = async () => {
    if (!currentHabitForNotes) return;

    const { error } = await supabase
      .from('habits')
      .update({ notes: habitNotes })
      .eq('id', currentHabitForNotes.id);

    if (error) {
      console.error('Error updating habit notes:', error);
      toast.error('Failed to save notes');
    } else {
      toast.success('Notes saved successfully');
      setIsNotesDialogOpen(false);
      setCurrentHabitForNotes(null);
      setHabitNotes('');
      loadHabits();
    }
  };

  const getDayHabits = (dateStr: string) => {
    const dailyHabits = habits.filter(h => h.frequency === 'daily');
    return dailyHabits.map(habit => ({
      ...habit,
      completed: getHabitCompletion(habit.id, dateStr)
    }));
  };

  const stats = getTodayStats();
  const weekDays = getWeeklyCalendar();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Daily Routine/Habits</h1>
            <p className="text-muted-foreground">Build lasting habits, one day at a time</p>
            {selectedUserId && userRole && (userRole === 'admin' || userRole === 'super_admin') && (
              <p className="text-sm text-muted-foreground mt-1">
                Viewing habits for: {users.find(u => u.id === selectedUserId)?.full_name}
              </p>
            )}
          </div>
          {(!selectedUserId || selectedUserId === user?.id) && (
            <Dialog open={isAddingHabit} onOpenChange={setIsAddingHabit}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Habit
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Habit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newHabit.title}
                    onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                    placeholder="e.g., Morning Exercise"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={newHabit.description}
                    onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                    placeholder="e.g., 30 minutes of cardio"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newHabit.category} onValueChange={(value) => setNewHabit({ ...newHabit, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={newHabit.frequency} onValueChange={(value: any) => setNewHabit({ ...newHabit, frequency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${newHabit.color === color ? 'border-foreground' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewHabit({ ...newHabit, color })}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={createHabit} className="w-full">
                  Create Habit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Edit Habit Dialog */}
        <Dialog open={isEditingHabit} onOpenChange={setIsEditingHabit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editHabitForm.title}
                  onChange={(e) => setEditHabitForm({ ...editHabitForm, title: e.target.value })}
                  placeholder="e.g., Morning Exercise"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description (optional)</Label>
                <Input
                  id="edit-description"
                  value={editHabitForm.description}
                  onChange={(e) => setEditHabitForm({ ...editHabitForm, description: e.target.value })}
                  placeholder="e.g., 30 minutes of cardio"
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editHabitForm.category} onValueChange={(value) => setEditHabitForm({ ...editHabitForm, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-frequency">Frequency</Label>
                <Select value={editHabitForm.frequency} onValueChange={(value: any) => setEditHabitForm({ ...editHabitForm, frequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${editHabitForm.color === color ? 'border-foreground' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditHabitForm({ ...editHabitForm, color })}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={updateHabit} className="w-full">
                Update Habit
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats Cards - Remove Perfect Days */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Progress</p>
                  <p className="text-2xl font-bold">{stats.completedToday}/{stats.totalHabits}</p>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Streaks</p>
                  <p className="text-2xl font-bold">{stats.totalStreaks}</p>
                </div>
                <Flame className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{stats.totalHabits > 0 ? Math.round((stats.completedToday / stats.totalHabits) * 100) : 0}%</p>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Habits */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Today's Habits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {habits.filter(h => h.frequency === 'daily').length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Check className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No daily habits created yet</p>
                      <p className="text-sm">Create your first habit to get started</p>
                    </div>
                   ) : (
                     habits
                       .filter(h => h.frequency === 'daily')
                       .filter(habit => {
                         // Hide completed habits from today's view unless viewing other user's habits
                         const isCompleted = getHabitCompletion(habit.id, new Date().toISOString().split('T')[0]);
                         return selectedUserId ? true : !isCompleted;
                       })
                       .map(habit => {
                         const isCompleted = getHabitCompletion(habit.id, new Date().toISOString().split('T')[0]);
                         return (
                           <div key={habit.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                             <div className="flex items-center space-x-4">
                               <div 
                                 className="w-4 h-4 rounded-full" 
                                 style={{ backgroundColor: habit.color }}
                               />
                               <div>
                                 <h4 className="font-medium">{habit.title}</h4>
                                 {habit.description && (
                                   <p className="text-sm text-muted-foreground">{habit.description}</p>
                                 )}
                                 <div className="flex items-center space-x-4 mt-1">
                                   <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                     <Flame className="w-3 h-3" />
                                     <span>{habit.current_streak} day streak</span>
                                   </div>
                                   <Badge variant="outline">
                                     {categories.find(c => c.value === habit.category)?.label}
                                   </Badge>
                                 </div>
                               </div>
                             </div>
                             <div className="flex items-center space-x-2">
                               {/* Notes button for admins */}
                               {(userRole === 'admin' || userRole === 'super_admin') && (
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => openNotesDialog(habit)}
                                 >
                                   <StickyNote className="w-4 h-4" />
                                 </Button>
                               )}
                               {(!selectedUserId || selectedUserId === user?.id) && (
                                 <>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => startEditHabit(habit)}
                                   >
                                     <Edit className="w-4 h-4" />
                                   </Button>
                                   <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                       <Button variant="ghost" size="sm">
                                         <Trash2 className="w-4 h-4" />
                                       </Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                       <AlertDialogHeader>
                                         <AlertDialogTitle>Delete Habit</AlertDialogTitle>
                                         <AlertDialogDescription>
                                           Are you sure you want to delete "{habit.title}"? This action cannot be undone and will remove all completion history.
                                         </AlertDialogDescription>
                                       </AlertDialogHeader>
                                       <AlertDialogFooter>
                                         <AlertDialogCancel>Cancel</AlertDialogCancel>
                                         <AlertDialogAction
                                           onClick={() => deleteHabit(habit.id)}
                                           className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                         >
                                           Delete
                                         </AlertDialogAction>
                                       </AlertDialogFooter>
                                     </AlertDialogContent>
                                   </AlertDialog>
                                 </>
                               )}
                               <Button
                                 variant={isCompleted ? "default" : "outline"}
                                 size="sm"
                                 onClick={() => toggleHabitCompletion(habit.id)}
                                 className={isCompleted ? "bg-green-500 hover:bg-green-600" : ""}
                               >
                                 {isCompleted ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                               </Button>
                               {isCompleted && (selectedUserId && selectedUserId !== user?.id) && (
                                 <Badge variant="default" className="bg-green-500">
                                   <Check className="w-3 h-3 mr-1" />
                                   Completed
                                 </Badge>
                               )}
                             </div>
                           </div>
                         );
                       })
                   )}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Habits */}
            {habits.filter(h => h.frequency === 'weekly').length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Weekly Habits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {habits.filter(h => h.frequency === 'weekly').map(habit => {
                      const progress = getWeeklyHabitProgress(habit.id);
                      const weekDays = getWeeklyCalendar();
                      const today = new Date();
                      
                      return (
                        <div key={habit.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: habit.color }}
                              />
                              <div>
                                <h4 className="font-medium">{habit.title}</h4>
                                {habit.description && (
                                  <p className="text-sm text-muted-foreground">{habit.description}</p>
                                )}
                                <div className="flex items-center space-x-4 mt-1">
                                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                    <Flame className="w-3 h-3" />
                                    <span>{habit.current_streak} week streak</span>
                                  </div>
                                  <Badge variant="outline">
                                    {categories.find(c => c.value === habit.category)?.label}
                                  </Badge>
                                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                    <Check className="w-3 h-3" />
                                    <span>{progress.completed}/{progress.total} days</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {(!selectedUserId || selectedUserId === user?.id) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditHabit(habit)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Habit</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{habit.title}"? This action cannot be undone and will remove all completion history.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteHabit(habit.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Weekly Progress Bar */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                              <span>Weekly Progress</span>
                              <span>{Math.round((progress.completed / progress.total) * 100)}%</span>
                            </div>
                            <Progress value={(progress.completed / progress.total) * 100} className="h-2" />
                          </div>
                          
                          {/* Interactive Week Calendar */}
                          <div className="grid grid-cols-7 gap-2">
                            {weekDays.map((day, index) => {
                              const isCompleted = getHabitCompletion(habit.id, day.toISOString().split('T')[0]);
                              const isToday = day.toDateString() === today.toDateString();
                              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                              
                              return (
                                <div key={index} className="text-center">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {dayNames[day.getDay()]}
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    {day.getDate()}
                                  </div>
                                  <Button
                                    variant={isCompleted ? "default" : "outline"}
                                    size="sm"
                                    className={`w-full h-8 ${isToday ? 'ring-2 ring-primary' : ''} ${
                                      isCompleted ? 'bg-green-500 hover:bg-green-600' : ''
                                    }`}
                                    onClick={() => (!selectedUserId || selectedUserId === user?.id) && toggleWeeklyHabitCompletion(habit.id, day)}
                                    disabled={selectedUserId && selectedUserId !== user?.id}
                                  >
                                    {isCompleted ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Week Overview */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                   {/* Week Calendar - Clickable */}
                   <div className="grid grid-cols-7 gap-1 text-center text-sm">
                     {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                       <div key={i} className="font-medium text-muted-foreground p-2">{day}</div>
                     ))}
                     {weekDays.map((date, i) => {
                       const dateStr = date.toISOString().split('T')[0];
                       const dailyHabits = habits.filter(h => h.frequency === 'daily');
                       const completedHabits = dailyHabits.filter(h => getHabitCompletion(h.id, dateStr));
                       const completionRate = dailyHabits.length > 0 ? completedHabits.length / dailyHabits.length : 0;
                       const isToday = dateStr === new Date().toISOString().split('T')[0];
                       const isSelected = selectedWeekDate === dateStr;
                       
                       return (
                         <Button
                           key={i}
                           variant={isSelected ? "default" : isToday ? "secondary" : "ghost"}
                           className={`p-2 h-auto flex flex-col ${isToday && !isSelected ? 'ring-2 ring-primary' : ''}`}
                           onClick={() => setSelectedWeekDate(isSelected ? null : dateStr)}
                         >
                           <div className="text-sm">{date.getDate()}</div>
                           <div className="w-2 h-2 mx-auto mt-1 rounded-full" style={{
                             backgroundColor: completionRate === 1 ? '#10b981' : 
                                            completionRate > 0.5 ? '#f59e0b' : 
                                            completionRate > 0 ? '#ef4444' : '#e5e5e5'
                           }} />
                         </Button>
                       );
                     })}
                   </div>

                   {/* Selected Day Habits or Routines List */}
                   {selectedWeekDate ? (
                     <div className="space-y-2">
                       <h4 className="font-medium">
                         Habits for {new Date(selectedWeekDate).toLocaleDateString('en-US', { 
                           weekday: 'long', 
                           month: 'short', 
                           day: 'numeric' 
                         })}
                       </h4>
                       <div className="space-y-2 max-h-60 overflow-y-auto">
                         {getDayHabits(selectedWeekDate).map(habit => (
                           <div key={habit.id} className="flex items-center justify-between p-2 border rounded text-sm">
                             <div className="flex items-center space-x-2">
                               <div 
                                 className="w-3 h-3 rounded-full" 
                                 style={{ backgroundColor: habit.color }}
                               />
                               <span className={habit.completed ? 'line-through' : ''}>{habit.title}</span>
                             </div>
                             <div className="flex items-center space-x-1">
                               {habit.completed && <Check className="w-3 h-3 text-green-500" />}
                               {(userRole === 'admin' || userRole === 'super_admin') && (
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => openNotesDialog(habit)}
                                   className="h-6 w-6 p-0"
                                 >
                                   <StickyNote className="w-3 h-3" />
                                 </Button>
                               )}
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <h4 className="font-medium">Routines</h4>
                       {habits
                         .sort((a, b) => b.best_streak - a.best_streak)
                         .slice(0, 3)
                         .map(habit => (
                           <div key={habit.id} className="flex items-center justify-between text-sm">
                             <div className="flex items-center space-x-2">
                               <div 
                                 className="w-2 h-2 rounded-full" 
                                 style={{ backgroundColor: habit.color }}
                               />
                               <span>{habit.title}</span>
                             </div>
                             <div className="flex items-center space-x-2">
                               <span className="text-muted-foreground">{habit.best_streak} days</span>
                               {(userRole === 'admin' || userRole === 'super_admin') && (
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => openNotesDialog(habit)}
                                   className="h-6 w-6 p-0"
                                 >
                                   <StickyNote className="w-3 h-3" />
                                 </Button>
                               )}
                             </div>
                           </div>
                         ))}
                     </div>
                   )}
                </div>
              </CardContent>
          </Card>
        </div>
        </div>

        {/* Admin User Filter */}
        {userRole && (userRole === 'admin' || userRole === 'super_admin') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                View User Habits
                <Badge variant="outline" className="ml-2">Admin: {userRole}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="user-select">Select User:</Label>
                <Select value={selectedUserId || 'my_habits'} onValueChange={(value) => setSelectedUserId(value === 'my_habits' ? null : value)}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a user to view their habits" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="my_habits">My Habits</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="secondary">{users.length} users loaded</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes Dialog */}
        <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Habit Notes - {currentHabitForNotes?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="habit-notes">Admin Notes</Label>
                <Textarea
                  id="habit-notes"
                  value={habitNotes}
                  onChange={(e) => setHabitNotes(e.target.value)}
                  placeholder="Add notes about this habit..."
                  rows={6}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveHabitNotes} className="flex-1">
                  Save Notes
                </Button>
                <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
      </div>
    </div>
  );
};

export default Habits;
