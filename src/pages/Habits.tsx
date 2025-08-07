import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Check, Plus, Flame, Trophy, Target, TrendingUp, Star } from 'lucide-react';
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

  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    category: 'health',
    frequency: 'daily' as const,
    target_count: 1,
    color: 'emerald'
  });

  const categories = [
    { value: 'health', label: 'Health & Fitness', icon: '💪', gradient: 'from-emerald-500 to-teal-500' },
    { value: 'productivity', label: 'Productivity', icon: '⚡', gradient: 'from-blue-500 to-indigo-500' },
    { value: 'learning', label: 'Learning', icon: '📚', gradient: 'from-purple-500 to-violet-500' },
    { value: 'mindfulness', label: 'Mindfulness', icon: '🧘', gradient: 'from-amber-500 to-orange-500' },
    { value: 'social', label: 'Social', icon: '👥', gradient: 'from-pink-500 to-rose-500' },
    { value: 'creative', label: 'Creative', icon: '🎨', gradient: 'from-cyan-500 to-blue-500' }
  ];

  const colorOptions = [
    { name: 'emerald', class: 'bg-emerald-500' },
    { name: 'blue', class: 'bg-blue-500' },
    { name: 'purple', class: 'bg-purple-500' },
    { name: 'amber', class: 'bg-amber-500' },
    { name: 'pink', class: 'bg-pink-500' },
    { name: 'cyan', class: 'bg-cyan-500' },
    { name: 'red', class: 'bg-red-500' },
    { name: 'green', class: 'bg-green-500' }
  ];

  useEffect(() => {
    if (user) {
      loadHabits();
      loadCompletions();
    }
  }, [user]);

  const loadHabits = async () => {
    const mockHabits: Habit[] = [
      {
        id: '1',
        title: 'Morning Workout',
        description: '30 minutes of strength training',
        category: 'health',
        frequency: 'daily',
        target_count: 1,
        current_streak: 8,
        best_streak: 15,
        created_at: '2024-01-01',
        color: 'emerald'
      },
      {
        id: '2',
        title: 'Read Books',
        description: 'Read for 30 minutes daily',
        category: 'learning',
        frequency: 'daily',
        target_count: 1,
        current_streak: 12,
        best_streak: 20,
        created_at: '2024-01-01',
        color: 'purple'
      },
      {
        id: '3',
        title: 'Meditation',
        description: '10 minutes mindfulness practice',
        category: 'mindfulness',
        frequency: 'daily',
        target_count: 1,
        current_streak: 5,
        best_streak: 18,
        created_at: '2024-01-01',
        color: 'amber'
      }
    ];
    setHabits(mockHabits);
  };

  const loadCompletions = async () => {
    const today = new Date().toISOString().split('T')[0];
    const mockCompletions: HabitCompletion[] = [
      { id: '1', habit_id: '1', date: today, completed: true },
      { id: '2', habit_id: '2', date: today, completed: true },
      { id: '3', habit_id: '3', date: today, completed: false }
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
      color: 'emerald'
    });
    setIsAddingHabit(false);
    toast.success('Habit created successfully! 🎉');
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

    toast.success(existingCompletion?.completed ? 'Habit unmarked' : 'Great job! 🎉');
  };

  const getHabitCompletion = (habitId: string, date: string) => {
    return completions.find(c => c.habit_id === habitId && c.date === date)?.completed || false;
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const dailyHabits = habits.filter(h => h.frequency === 'daily');
    const completedToday = dailyHabits.filter(h => getHabitCompletion(h.id, today)).length;
    const totalStreaks = habits.reduce((sum, h) => sum + h.current_streak, 0);
    const bestStreak = Math.max(...habits.map(h => h.best_streak), 0);
    const completionRate = dailyHabits.length > 0 ? Math.round((completedToday / dailyHabits.length) * 100) : 0;

    return { completedToday, totalHabits: dailyHabits.length, totalStreaks, bestStreak, completionRate };
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Modern Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-sm">
            <Star className="w-4 h-4" />
            Build Better Habits
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Your Habit Journey
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Transform your life one habit at a time. Track progress, build streaks, and achieve your goals.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Today's Progress</p>
                  <p className="text-3xl font-bold text-emerald-600">{stats.completedToday}/{stats.totalHabits}</p>
                  <div className="w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                  <Target className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 bg-gradient-to-br from-orange-500/10 to-red-600/5 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Active Streaks</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.totalStreaks}</p>
                  <p className="text-xs text-orange-600/80">days combined</p>
                </div>
                <div className="p-3 bg-orange-500/20 rounded-2xl">
                  <Flame className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-yellow-500/10 to-amber-600/5 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Best Streak</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.bestStreak}</p>
                  <p className="text-xs text-yellow-600/80">personal record</p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-2xl">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-indigo-600/5 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Completion Rate</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.completionRate}%</p>
                  <p className="text-xs text-blue-600/80">today's success</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Habits */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold">Today's Habits</CardTitle>
                  <Dialog open={isAddingHabit} onOpenChange={setIsAddingHabit}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Habit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create New Habit</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="title">Habit Name</Label>
                          <Input
                            id="title"
                            value={newHabit.title}
                            onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                            placeholder="e.g., Morning Workout"
                            className="border-muted"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={newHabit.description}
                            onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                            placeholder="e.g., 30 minutes of exercise"
                            className="border-muted"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select value={newHabit.category} onValueChange={(value) => setNewHabit({ ...newHabit, category: value })}>
                            <SelectTrigger className="border-muted">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  <div className="flex items-center gap-2">
                                    <span>{cat.icon}</span>
                                    {cat.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Color</Label>
                          <div className="flex flex-wrap gap-2">
                            {colorOptions.map(color => (
                              <button
                                key={color.name}
                                className={`w-8 h-8 rounded-full ${color.class} border-2 transition-all duration-200 ${newHabit.color === color.name ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                                onClick={() => setNewHabit({ ...newHabit, color: color.name })}
                              />
                            ))}
                          </div>
                        </div>
                        
                        <Button onClick={createHabit} className="w-full bg-gradient-to-r from-primary to-secondary">
                          Create Habit
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {habits.filter(h => h.frequency === 'daily').length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 mx-auto bg-muted/50 rounded-full flex items-center justify-center">
                      <Target className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">No habits yet</h3>
                      <p className="text-sm text-muted-foreground">Create your first habit to start building better routines</p>
                    </div>
                  </div>
                ) : (
                  habits.filter(h => h.frequency === 'daily').map(habit => {
                    const isCompleted = getHabitCompletion(habit.id, new Date().toISOString().split('T')[0]);
                    const category = categories.find(c => c.value === habit.category);
                    const colorClass = colorOptions.find(c => c.name === habit.color)?.class || 'bg-primary';
                    
                    return (
                      <div key={habit.id} className={`group p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${isCompleted ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-background hover:bg-muted/50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-medium ${isCompleted ? 'line-through text-green-700 dark:text-green-400' : ''}`}>
                                  {habit.title}
                                </h4>
                                <span className="text-lg">{category?.icon}</span>
                              </div>
                              {habit.description && (
                                <p className="text-sm text-muted-foreground mt-1">{habit.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-sm">
                                  <Flame className="w-3 h-3 text-orange-500" />
                                  <span className="text-muted-foreground">{habit.current_streak} days</span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {category?.label}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant={isCompleted ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleHabitCompletion(habit.id)}
                            className={`transition-all duration-300 ${isCompleted ? 'bg-green-500 hover:bg-green-600 text-white' : 'hover:bg-primary hover:text-primary-foreground'}`}
                          >
                            <Check className={`w-4 h-4 transition-transform duration-200 ${isCompleted ? 'scale-110' : ''}`} />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Week Overview */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div key={index} className="text-center text-xs font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((date, index) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dateStr = date.toISOString().split('T')[0];
                    const dailyHabits = habits.filter(h => h.frequency === 'daily');
                    const completedHabits = dailyHabits.filter(h => getHabitCompletion(h.id, dateStr)).length;
                    const completion = dailyHabits.length > 0 ? (completedHabits / dailyHabits.length) * 100 : 0;
                    
                    return (
                      <div
                        key={index}
                        className={`aspect-square p-1 rounded-lg text-center text-sm transition-all duration-200 ${
                          isToday ? 'bg-primary text-primary-foreground font-bold' : 
                          completion === 100 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          completion > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                          'bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="text-xs">{date.getDate()}</span>
                          {completion > 0 && (
                            <div className="w-1 h-1 bg-current rounded-full mt-1" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Best Streaks */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top Streaks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {habits
                    .sort((a, b) => b.current_streak - a.current_streak)
                    .slice(0, 3)
                    .map((habit, index) => {
                      const category = categories.find(c => c.value === habit.category);
                      const colorClass = colorOptions.find(c => c.name === habit.color)?.class || 'bg-primary';
                      
                      return (
                        <div key={habit.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                            <div>
                              <p className="text-sm font-medium">{habit.title}</p>
                              <p className="text-xs text-muted-foreground">{category?.label}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Flame className="w-3 h-3 text-orange-500" />
                            {habit.current_streak}
                          </div>
                        </div>
                      );
                    })}
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