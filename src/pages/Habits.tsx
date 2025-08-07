import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Check, Plus, Flame, Trophy, Clock } from 'lucide-react';
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
      loadHabits();
      loadCompletions();
    }
  }, [user, selectedDate]);

  const loadHabits = async () => {
    // Mock data for habits since we don't have a dedicated table
    const mockHabits: Habit[] = [
      {
        id: '1',
        title: 'Morning Exercise',
        description: '30 minutes of cardio or strength training',
        category: 'health',
        frequency: 'daily',
        target_count: 1,
        current_streak: 5,
        best_streak: 12,
        created_at: '2024-01-01',
        color: '#10b981'
      },
      {
        id: '2',
        title: 'Read for 30 minutes',
        description: 'Read books or articles to expand knowledge',
        category: 'learning',
        frequency: 'daily',
        target_count: 1,
        current_streak: 3,
        best_streak: 8,
        created_at: '2024-01-01',
        color: '#8b5cf6'
      },
      {
        id: '3',
        title: 'Meditation',
        description: '10 minutes of mindfulness meditation',
        category: 'mindfulness',
        frequency: 'daily',
        target_count: 1,
        current_streak: 7,
        best_streak: 15,
        created_at: '2024-01-01',
        color: '#f59e0b'
      },
      {
        id: '4',
        title: 'Weekly Review',
        description: 'Review goals and plan for the upcoming week',
        category: 'productivity',
        frequency: 'weekly',
        target_count: 1,
        current_streak: 2,
        best_streak: 4,
        created_at: '2024-01-01',
        color: '#3b82f6'
      }
    ];
    setHabits(mockHabits);
  };

  const loadCompletions = async () => {
    // Mock data for completions
    const today = new Date().toISOString().split('T')[0];
    const mockCompletions: HabitCompletion[] = [
      { id: '1', habit_id: '1', date: today, completed: true },
      { id: '2', habit_id: '2', date: today, completed: false },
      { id: '3', habit_id: '3', date: today, completed: true },
      { id: '4', habit_id: '4', date: today, completed: false }
    ];
    setCompletions(mockCompletions);
  };

  const createHabit = async () => {
    if (!newHabit.title.trim()) {
      toast.error('Please enter a title for the habit');
      return;
    }

    const habit: Habit = {
      id: Date.now().toString(),
      title: newHabit.title,
      description: newHabit.description,
      category: newHabit.category,
      frequency: newHabit.frequency,
      target_count: newHabit.target_count,
      current_streak: 0,
      best_streak: 0,
      created_at: new Date().toISOString(),
      color: newHabit.color
    };

    setHabits([...habits, habit]);
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
  };

  const toggleHabitCompletion = (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const existingCompletion = completions.find(c => c.habit_id === habitId && c.date === today);
    
    if (existingCompletion) {
      setCompletions(completions.map(c => 
        c.id === existingCompletion.id 
          ? { ...c, completed: !c.completed }
          : c
      ));
    } else {
      const newCompletion: HabitCompletion = {
        id: Date.now().toString(),
        habit_id: habitId,
        date: today,
        completed: true
      };
      setCompletions([...completions, newCompletion]);
    }

    // Update streak
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      const wasCompleted = existingCompletion?.completed || false;
      const isNowCompleted = !wasCompleted;
      
      setHabits(habits.map(h => 
        h.id === habitId 
          ? { 
              ...h, 
              current_streak: isNowCompleted ? h.current_streak + 1 : Math.max(0, h.current_streak - 1),
              best_streak: isNowCompleted && h.current_streak + 1 > h.best_streak ? h.current_streak + 1 : h.best_streak
            }
          : h
      ));
    }

    toast.success(existingCompletion?.completed ? 'Habit marked as incomplete' : 'Habit completed!');
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Habits</h1>
            <p className="text-muted-foreground">Build lasting habits, one day at a time</p>
          </div>
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
                          <Button
                            variant={isCompleted ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleHabitCompletion(habit.id)}
                            className={isCompleted ? "bg-green-500 hover:bg-green-600" : ""}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
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
                          <Button
                            variant={isCompleted ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleHabitCompletion(habit.id)}
                            className={isCompleted ? "bg-green-500 hover:bg-green-600" : ""}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
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
      </div>
    </div>
  );
};

export default Habits;