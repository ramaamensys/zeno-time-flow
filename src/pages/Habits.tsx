import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Check, Plus, Flame, Trophy, Clock, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    category: 'health',
    frequency: 'daily' as const,
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
        color: '#10b981'
      });
      setIsAddingHabit(false);
      toast.success('Habit created successfully');
      loadHabits();
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
    const perfectDays = 5; // Mock data

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
            <h1 className="text-3xl font-bold text-foreground">Habits</h1>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-muted-foreground">Perfect Days</p>
                  <p className="text-2xl font-bold">{stats.perfectDays}</p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-500" />
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
                    habits.filter(h => h.frequency === 'daily').map(habit => {
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
                          {(!selectedUserId || selectedUserId === user?.id) && (
                            <Button
                              variant={isCompleted ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleHabitCompletion(habit.id)}
                              className={isCompleted ? "bg-green-500 hover:bg-green-600" : ""}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {isCompleted && (selectedUserId && selectedUserId !== user?.id) && (
                            <Badge variant="default" className="bg-green-500">
                              <Check className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
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
                  <div className="space-y-4">
                    {habits.filter(h => h.frequency === 'weekly').map(habit => {
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
                                  <span>{habit.current_streak} week streak</span>
                                </div>
                                <Badge variant="outline">
                                  {categories.find(c => c.value === habit.category)?.label}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {(!selectedUserId || selectedUserId === user?.id) && (
                            <Button
                              variant={isCompleted ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleHabitCompletion(habit.id)}
                              className={isCompleted ? "bg-green-500 hover:bg-green-600" : ""}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {isCompleted && (selectedUserId && selectedUserId !== user?.id) && (
                            <Badge variant="default" className="bg-green-500">
                              <Check className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
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
                  {/* Week Calendar */}
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
                      
                      return (
                        <div 
                          key={i} 
                          className={`p-2 rounded ${isToday ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                          <div className="text-sm">{date.getDate()}</div>
                          <div className="w-2 h-2 mx-auto mt-1 rounded-full" style={{
                            backgroundColor: completionRate === 1 ? '#10b981' : 
                                           completionRate > 0.5 ? '#f59e0b' : 
                                           completionRate > 0 ? '#ef4444' : '#e5e5e5'
                          }} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Best Streaks */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Best Streaks</h4>
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
                          <span className="text-muted-foreground">{habit.best_streak} days</span>
                        </div>
                      ))}
                  </div>
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
        
      </div>
    </div>
  );
};

export default Habits;