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
    // Filter habits that should be active today
    const activeTodayHabits = habits.filter(h => {
      if (h.frequency !== 'daily') return false;
      // If no start_date is set, show for all days (legacy habits)
      if (!h.start_date) return true;
      // Only include habits that start on or before today
      return h.start_date <= today;
    });
    const completedToday = activeTodayHabits.filter(h => getHabitCompletion(h.id, today)).length;
    const totalStreaks = habits.reduce((sum, h) => sum + h.current_streak, 0);

    return { completedToday, totalHabits: activeTodayHabits.length, totalStreaks };
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
    // Filter habits that should be active on the given date
    return habits
      .filter(h => {
        // If no start_date is set, show for all days (legacy habits)
        if (!h.start_date) return h.frequency === 'daily';
        
        // Only show habits that start on or before the selected date
        return h.frequency === 'daily' && h.start_date <= dateStr;
      })
      .map(habit => ({
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with modern gradient */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50"></div>
          <div className="relative flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Daily Routine/Habits
              </h1>
              <p className="text-lg text-muted-foreground">Build lasting habits, one day at a time</p>
              {selectedUserId && userRole && (userRole === 'admin' || userRole === 'super_admin') && (
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  <Users className="w-4 h-4 mr-2 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    Viewing: {users.find(u => u.id === selectedUserId)?.full_name}
                  </span>
                </div>
              )}
            </div>
            {(!selectedUserId || selectedUserId === user?.id) && (
              <Dialog open={isAddingHabit} onOpenChange={setIsAddingHabit}>
                <DialogTrigger asChild>
                  <Button className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Plus className="w-5 h-5 mr-2 relative z-10" />
                    <span className="relative z-10 font-medium">Add Habit</span>
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    Create New Habit
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                    <Input
                      id="title"
                      value={newHabit.title}
                      onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                      placeholder="e.g., Morning Exercise"
                      className="h-12 border-2 focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Description (optional)</Label>
                    <Input
                      id="description"
                      value={newHabit.description}
                      onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                      placeholder="e.g., 30 minutes of cardio"
                      className="h-12 border-2 focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                      <Select value={newHabit.category} onValueChange={(value) => setNewHabit({ ...newHabit, category: value })}>
                        <SelectTrigger className="h-12 border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frequency" className="text-sm font-medium">Frequency</Label>
                      <Select value={newHabit.frequency} onValueChange={(value: any) => setNewHabit({ ...newHabit, frequency: value })}>
                        <SelectTrigger className="h-12 border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={newHabit.start_date}
                        onChange={(e) => setNewHabit({ ...newHabit, start_date: e.target.value })}
                        className="h-12 border-2 focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start-time" className="text-sm font-medium">Start Time</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={newHabit.start_time}
                        onChange={(e) => setNewHabit({ ...newHabit, start_time: e.target.value })}
                        className="h-12 border-2 focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={newHabit.notes}
                      onChange={(e) => setNewHabit({ ...newHabit, notes: e.target.value })}
                      placeholder="Any additional notes about this habit..."
                      rows={3}
                      className="border-2 focus:border-primary/50 transition-colors resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Color</Label>
                    <div className="flex flex-wrap gap-3">
                      {colors.map(color => (
                        <button
                          key={color}
                          className={`w-10 h-10 rounded-full border-3 transition-all duration-200 hover:scale-110 ${
                            newHabit.color === color 
                              ? 'border-foreground shadow-lg scale-110' 
                              : 'border-border/30 hover:border-border/60'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewHabit({ ...newHabit, color })}
                        />
                      ))}
                    </div>
                  </div>
                  <Button 
                    onClick={createHabit} 
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg hover:shadow-xl font-medium text-base"
                  >
                    Create Habit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {/* Edit Habit Dialog */}
        <Dialog open={isEditingHabit} onOpenChange={setIsEditingHabit}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Edit Habit
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-sm font-medium">Title</Label>
                <Input
                  id="edit-title"
                  value={editHabitForm.title}
                  onChange={(e) => setEditHabitForm({ ...editHabitForm, title: e.target.value })}
                  placeholder="e.g., Morning Exercise"
                  className="h-12 border-2 focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm font-medium">Description (optional)</Label>
                <Input
                  id="edit-description"
                  value={editHabitForm.description}
                  onChange={(e) => setEditHabitForm({ ...editHabitForm, description: e.target.value })}
                  placeholder="e.g., 30 minutes of cardio"
                  className="h-12 border-2 focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category" className="text-sm font-medium">Category</Label>
                  <Select value={editHabitForm.category} onValueChange={(value) => setEditHabitForm({ ...editHabitForm, category: value })}>
                    <SelectTrigger className="h-12 border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-frequency" className="text-sm font-medium">Frequency</Label>
                  <Select value={editHabitForm.frequency} onValueChange={(value: any) => setEditHabitForm({ ...editHabitForm, frequency: value })}>
                    <SelectTrigger className="h-12 border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Color</Label>
                <div className="flex flex-wrap gap-3">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`w-10 h-10 rounded-full border-3 transition-all duration-200 hover:scale-110 ${
                        editHabitForm.color === color 
                          ? 'border-foreground shadow-lg scale-110' 
                          : 'border-border/30 hover:border-border/60'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditHabitForm({ ...editHabitForm, color })}
                    />
                  ))}
                </div>
              </div>
              <Button 
                onClick={updateHabit} 
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg hover:shadow-xl font-medium text-base"
              >
                Update Habit
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 hover:shadow-xl transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-8 relative">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Today's Progress</p>
                  <p className="text-4xl font-bold text-green-800 dark:text-green-200">{stats.completedToday}/{stats.totalHabits}</p>
                </div>
                <div className="p-4 rounded-2xl bg-green-500/20 group-hover:bg-green-500/30 transition-colors duration-300">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 hover:shadow-xl transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-8 relative">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Active Streaks</p>
                  <p className="text-4xl font-bold text-orange-800 dark:text-orange-200">{stats.totalStreaks}</p>
                </div>
                <div className="p-4 rounded-2xl bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors duration-300">
                  <Flame className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-xl transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-8 relative">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-primary/80">Completion Rate</p>
                  <p className="text-4xl font-bold text-primary">{stats.totalHabits > 0 ? Math.round((stats.completedToday / stats.totalHabits) * 100) : 0}%</p>
                </div>
                <div className="p-4 rounded-2xl bg-primary/20 group-hover:bg-primary/30 transition-colors duration-300">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Habits - Modern Design */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur overflow-hidden">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <Check className="w-6 h-6 text-primary" />
                  </div>
                  Today's Habits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {habits.filter(h => h.frequency === 'daily').length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-muted/30 to-muted/50 flex items-center justify-center">
                      <Check className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-muted-foreground mb-2">No daily habits yet</h3>
                    <p className="text-muted-foreground">Create your first habit to get started on your journey</p>
                  </div>
                 ) : (
                   <div className="space-y-3">
                     {habits
                       .filter(h => h.frequency === 'daily')
                       .filter(habit => {
                         // Hide completed habits from today's view unless viewing other user's habits
                         const isCompleted = getHabitCompletion(habit.id, new Date().toISOString().split('T')[0]);
                         return selectedUserId ? true : !isCompleted;
                       })
                       .map(habit => {
                         const isCompleted = getHabitCompletion(habit.id, new Date().toISOString().split('T')[0]);
                         return (
                           <div 
                             key={habit.id} 
                             className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-r from-card to-card/80 p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                           >
                             <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                             <div className="relative flex items-center justify-between">
                               <div className="flex items-center space-x-4">
                                 <div 
                                   className="w-6 h-6 rounded-full shadow-lg ring-2 ring-white/50" 
                                   style={{ backgroundColor: habit.color }}
                                 />
                                 <div className="space-y-1">
                                   <h4 className="font-semibold text-lg">{habit.title}</h4>
                                   {habit.description && (
                                     <p className="text-sm text-muted-foreground">{habit.description}</p>
                                   )}
                                   <div className="flex items-center space-x-4 mt-2">
                                     <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/30">
                                       <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                       <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                         {habit.current_streak} day streak
                                       </span>
                                     </div>
                                     <Badge 
                                       variant="outline" 
                                       className="bg-background/50 border-border/50"
                                       style={{ borderColor: habit.color + '40', color: habit.color }}
                                     >
                                       {categories.find(c => c.value === habit.category)?.label}
                                     </Badge>
                                   </div>
                                 </div>
                               </div>
                               <div className="flex items-center space-x-2">
                                 {/* Notes button - show for habit owner or admins */}
                                 {((!selectedUserId || selectedUserId === user?.id) || (userRole === 'admin' || userRole === 'super_admin')) && (
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => openNotesDialog(habit)}
                                     title="View/Edit Notes"
                                     className="hover:bg-primary/10 hover:text-primary transition-colors duration-200"
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
                                       className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-colors duration-200"
                                     >
                                       <Edit className="w-4 h-4" />
                                     </Button>
                                     <AlertDialog>
                                       <AlertDialogTrigger asChild>
                                         <Button 
                                           variant="ghost" 
                                           size="sm"
                                           className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors duration-200"
                                         >
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
                                   className={`transition-all duration-300 ${
                                     isCompleted 
                                       ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg scale-105" 
                                       : "hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                                   }`}
                                 >
                                   {isCompleted ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                 </Button>
                                 {isCompleted && (selectedUserId && selectedUserId !== user?.id) && (
                                   <Badge variant="default" className="bg-green-500 hover:bg-green-600 shadow-md">
                                     <Check className="w-3 h-3 mr-1" />
                                     Completed
                                   </Badge>
                                 )}
                               </div>
                             </div>
                           </div>
                         );
                       })
                   }
                 </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Habits - Modern Design */}
            {habits.filter(h => h.frequency === 'weekly').length > 0 && (
              <Card className="mt-8 border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur overflow-hidden">
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10">
                      <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    Weekly Habits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {habits.filter(h => h.frequency === 'weekly').map(habit => {
                    const progress = getWeeklyHabitProgress(habit.id);
                    const weekDays = getWeeklyCalendar();
                    const today = new Date();
                    
                    return (
                      <div 
                        key={habit.id} 
                        className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-r from-card to-card/80 p-6 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                              <div 
                                className="w-6 h-6 rounded-full shadow-lg ring-2 ring-white/50" 
                                style={{ backgroundColor: habit.color }}
                              />
                              <div className="space-y-1">
                                <h4 className="font-semibold text-lg">{habit.title}</h4>
                                {habit.description && (
                                  <p className="text-sm text-muted-foreground">{habit.description}</p>
                                )}
                                <div className="flex items-center space-x-4 mt-2">
                                  <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/30">
                                    <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                      {habit.current_streak} week streak
                                    </span>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className="bg-background/50 border-border/50"
                                    style={{ borderColor: habit.color + '40', color: habit.color }}
                                  >
                                    {categories.find(c => c.value === habit.category)?.label}
                                  </Badge>
                                  <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-950/30">
                                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                      {progress.completed}/{progress.total} days
                                    </span>
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
                                    className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-colors duration-200"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors duration-200"
                                      >
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
                          
                          {/* Modern Weekly Progress Bar */}
                          <div className="mb-6">
                            <div className="flex items-center justify-between text-sm font-medium mb-3">
                              <span className="text-foreground">Weekly Progress</span>
                              <span className="text-primary">{Math.round((progress.completed / progress.total) * 100)}%</span>
                            </div>
                            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
                                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Interactive Week Calendar */}
                          <div className="grid grid-cols-7 gap-3">
                            {weekDays.map((day, index) => {
                              const isCompleted = getHabitCompletion(habit.id, day.toISOString().split('T')[0]);
                              const isToday = day.toDateString() === today.toDateString();
                              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                              
                              return (
                                <div key={index} className="text-center space-y-2">
                                  <div className="text-xs font-medium text-muted-foreground">
                                    {dayNames[day.getDay()]}
                                  </div>
                                  <div className="text-sm font-semibold text-foreground">
                                    {day.getDate()}
                                  </div>
                                  <Button
                                    variant={isCompleted ? "default" : "outline"}
                                    size="sm"
                                    className={`w-full h-10 transition-all duration-300 ${
                                      isToday ? 'ring-2 ring-primary/50 scale-105' : ''
                                    } ${
                                      isCompleted 
                                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg' 
                                        : 'hover:bg-primary/10 hover:border-primary/50 hover:text-primary hover:scale-105'
                                    }`}
                                    onClick={() => (!selectedUserId || selectedUserId === user?.id) && toggleWeeklyHabitCompletion(habit.id, day)}
                                    disabled={selectedUserId && selectedUserId !== user?.id}
                                  >
                                    {isCompleted ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Modern Week Overview */}
          <div>
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur overflow-hidden">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10">
                    <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Interactive Week Calendar */}
                <div className="grid grid-cols-7 gap-2 text-center">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="font-semibold text-muted-foreground p-2 text-sm">{day}</div>
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
                        className={`group relative p-3 h-auto flex flex-col space-y-2 transition-all duration-300 hover:scale-105 ${
                          isToday && !isSelected ? 'ring-2 ring-primary/50' : ''
                        } ${
                          isSelected ? 'bg-gradient-to-br from-primary to-primary/80 shadow-lg' : ''
                        }`}
                        onClick={() => setSelectedWeekDate(isSelected ? null : dateStr)}
                      >
                        <div className="text-base font-semibold">{date.getDate()}</div>
                        <div className="relative">
                          <div 
                            className="w-3 h-3 rounded-full transition-all duration-300 group-hover:scale-110" 
                            style={{
                              backgroundColor: completionRate === 1 ? '#10b981' : 
                                             completionRate > 0.5 ? '#f59e0b' : 
                                             completionRate > 0 ? '#ef4444' : '#e5e5e5'
                            }} 
                          />
                          {completionRate > 0 && (
                            <div className="absolute inset-0 rounded-full animate-ping" style={{
                              backgroundColor: completionRate === 1 ? '#10b981' : 
                                             completionRate > 0.5 ? '#f59e0b' : '#ef4444',
                              opacity: 0.4
                            }} />
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>

                {/* Selected Day Details or Routines Overview */}
                {selectedWeekDate ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-lg">
                        Habits for {new Date(selectedWeekDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </h4>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {getDayHabits(selectedWeekDate).map(habit => (
                        <div 
                          key={habit.id} 
                          className="group flex items-center justify-between p-4 rounded-xl border border-border/50 bg-gradient-to-r from-background to-background/80 hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full shadow-sm" 
                              style={{ backgroundColor: habit.color }}
                            />
                            <span className={`font-medium ${habit.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {habit.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {habit.completed && (
                              <div className="p-1 rounded-full bg-green-100 dark:bg-green-950/30">
                                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                              </div>
                            )}
                            {(userRole === 'admin' || userRole === 'super_admin') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openNotesDialog(habit)}
                                className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                              >
                                <StickyNote className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10">
                        <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h4 className="font-semibold text-lg">Routines</h4>
                    </div>
                    <div className="space-y-3">
                      {habits
                        .sort((a, b) => b.best_streak - a.best_streak)
                        .slice(0, 5)
                        .map(habit => (
                          <div 
                            key={habit.id} 
                            className="group flex items-center justify-between p-3 rounded-xl border border-border/50 bg-gradient-to-r from-background to-background/80 hover:shadow-md transition-all duration-300"
                          >
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-3 h-3 rounded-full shadow-sm" 
                                style={{ backgroundColor: habit.color }}
                              />
                              <span className="font-medium text-foreground">{habit.title}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2 px-2 py-1 rounded-full bg-muted/50">
                                <Flame className="w-3 h-3 text-orange-500" />
                                <span className="text-sm font-medium text-muted-foreground">{habit.best_streak} days</span>
                              </div>
                              {(userRole === 'admin' || userRole === 'super_admin') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openNotesDialog(habit)}
                                  className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                                >
                                  <StickyNote className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
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
