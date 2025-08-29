import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, Timer, Target, Brain, Users, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FocusSession {
  id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  productivity_score: number | null;
  interruptions: number;
  notes: string | null;
  created_at: string;
}

const Focus = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  const [productivityScore, setProductivityScore] = useState(5);
  const [interruptions, setInterruptions] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      const initializeData = async () => {
        await checkUserRole();
        fetchSessions();
      };
      initializeData();
    }
  }, [user, selectedUserId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(seconds => seconds + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds]);

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

  const fetchSessions = async () => {
    if (!user) return;

    const targetUserId = selectedUserId || user.id;
    
    const { data, error } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq('user_id', targetUserId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      toast({
        title: "Error fetching sessions",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSessions(data || []);
    }
    setIsLoading(false);
  };

  const startSession = async () => {
    const { data, error } = await supabase
      .from("focus_sessions")
      .insert([{
        title: "Focus Session",
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // 25 minutes default
        user_id: user?.id,
        interruptions: 0,
        productivity_score: 0,
        notes: "",
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error starting session",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCurrentSession(data);
      setIsActive(true);
      setSeconds(0);
      setInterruptions(0);
      setNotes("");
      setProductivityScore(5);
      toast({
        title: "Focus session started",
        description: "Stay focused and productive!",
      });
    }
  };

  const pauseSession = () => {
    setIsActive(false);
  };

  const resumeSession = () => {
    setIsActive(true);
  };

  const stopSession = async () => {
    if (!currentSession) return;

    const endTime = new Date().toISOString();
    const duration = Math.floor(seconds / 60); // Convert to minutes

    const { error } = await supabase
      .from("focus_sessions")
      .update({
        end_time: endTime,
        duration,
        productivity_score: productivityScore,
        interruptions,
        notes: notes || null,
      })
      .eq("id", currentSession.id);

    if (error) {
      toast({
        title: "Error ending session",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Session completed",
        description: `Great work! You focused for ${duration} minutes.`,
      });
      setIsActive(false);
      setCurrentSession(null);
      setSeconds(0);
      setNotes("");
      setProductivityScore(5);
      setInterruptions(0);
      fetchSessions();
    }
  };

  const addInterruption = () => {
    setInterruptions(prev => prev + 1);
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const toggleNotesExpansion = (sessionId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50/30 to-purple-50/30 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 space-y-8 p-6">
        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Focus Hours
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Track your focus work time and efficiency
          </p>
          {selectedUserId && userRole && (userRole === 'admin' || userRole === 'super_admin') && (
            <p className="text-sm text-purple-600 mt-2 font-medium">
              Viewing focus hours for: {users.find(u => u.id === selectedUserId)?.full_name}
            </p>
          )}
        </div>

        {/* Focus Timer Card */}
        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white pb-8">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold">
              <Timer className="h-7 w-7" />
              Focus Timer
            </CardTitle>
            <CardDescription className="text-indigo-100 text-center text-lg">
              Begin a focus session to track your efficiency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 py-8">
            <div className="text-center">
              {/* Timer Display */}
              <div className="relative mb-8">
                <div className="text-7xl md:text-8xl font-mono font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 tracking-tight">
                  {formatTime(seconds)}
                </div>
                {currentSession && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              
              {/* Interruptions Counter */}
              {currentSession && (
                <div className="flex items-center justify-center gap-6 mb-8">
                  <div className="bg-gradient-to-r from-orange-100 to-red-100 px-6 py-3 rounded-2xl border border-orange-200">
                    <span className="text-orange-700 font-semibold">
                      Interruptions: {interruptions}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={addInterruption}
                    className="border-orange-300 text-orange-600 hover:bg-orange-50 rounded-xl h-12 px-6"
                  >
                    +1 Interruption
                  </Button>
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                {!currentSession && (!selectedUserId || selectedUserId === user?.id) ? (
                  <Button 
                    onClick={startSession} 
                    size="lg"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-14 px-8 text-lg font-semibold rounded-2xl"
                  >
                    <Play className="mr-3 h-5 w-5" />
                    Begin Productive Session
                  </Button>
                ) : currentSession ? (
                  <>
                    {isActive ? (
                      <Button 
                        onClick={pauseSession} 
                        variant="outline" 
                        size="lg"
                        className="border-2 border-orange-300 text-orange-600 hover:bg-orange-50 h-14 px-8 text-lg font-semibold rounded-2xl"
                      >
                        <Pause className="mr-3 h-5 w-5" />
                        Pause
                      </Button>
                    ) : (
                      <Button 
                        onClick={resumeSession} 
                        size="lg"
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-14 px-8 text-lg font-semibold rounded-2xl"
                      >
                        <Play className="mr-3 h-5 w-5" />
                        Resume
                      </Button>
                    )}
                    <Button 
                      onClick={stopSession} 
                      variant="destructive" 
                      size="lg"
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 h-14 px-8 text-lg font-semibold rounded-2xl"
                    >
                      <Square className="mr-3 h-5 w-5" />
                      Stop Session
                    </Button>
                  </>
                ) : selectedUserId && selectedUserId !== user?.id && (
                  <div className="bg-gray-100 px-6 py-4 rounded-2xl">
                    <p className="text-gray-600 font-medium">Viewing another user's sessions (read-only)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Session Notes */}
            {currentSession && (
              <div className="pt-8 border-t border-gray-200">
                <div className="max-w-2xl mx-auto space-y-4">
                  <Label htmlFor="session-notes" className="text-lg font-semibold text-gray-700">
                    Session Notes
                  </Label>
                  <Textarea
                    id="session-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What did you work on? Any insights or challenges?"
                    rows={4}
                    className="rounded-xl border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions Card */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold">
              <Brain className="h-7 w-7" />
              Recent Sessions
            </CardTitle>
            <CardDescription className="text-purple-100 text-center text-lg">
              Your focus session history
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Target className="h-12 w-12 text-purple-500" />
                </div>
                <p className="text-gray-600 text-lg max-w-md mx-auto">
                  No focus sessions yet. Begin your first session to track your productivity!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="group hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 rounded-2xl bg-gradient-to-r from-white to-gray-50/50 hover:from-indigo-50/50 hover:to-purple-50/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-lg text-gray-800">
                            {new Date(session.start_time).toLocaleDateString()}
                          </span>
                          <span className="text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-sm">
                            {new Date(session.start_time).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {/* Expandable Notes Section */}
                        {session.notes && (
                          <Collapsible>
                            <CollapsibleTrigger 
                              onClick={() => toggleNotesExpansion(session.id)}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors mt-3"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="text-sm font-medium">View Notes</span>
                              {expandedNotes.has(session.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-3">
                              <div className="bg-blue-50/80 p-4 rounded-lg border-l-4 border-blue-300">
                                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                  {session.notes}
                                </p>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm ml-6">
                        <div className="text-center">
                          <div className="font-bold text-xl text-indigo-600 mb-1">
                            {formatDuration(session.duration)}
                          </div>
                          <div className="text-gray-500 font-medium">Duration</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-xl text-orange-600 mb-1">
                            {session.interruptions}
                          </div>
                          <div className="text-gray-500 font-medium">Interruptions</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin User Filter */}
        {userRole && (userRole === 'admin' || userRole === 'super_admin') && (
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
              <CardTitle className="flex items-center justify-center gap-3 text-xl font-bold">
                <Users className="h-6 w-6" />
                View User Focus Sessions
                <Badge variant="secondary" className="ml-3 bg-white/20 text-white border-white/30">
                  Admin: {userRole}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-6 justify-center">
                <Label htmlFor="user-select" className="text-lg font-semibold text-gray-700">
                  Select User:
                </Label>
                <Select value={selectedUserId || 'my_sessions'} onValueChange={(value) => setSelectedUserId(value === 'my_sessions' ? null : value)}>
                  <SelectTrigger className="w-80 h-12 rounded-xl border-gray-200 bg-white">
                    <SelectValue placeholder="Select a user to view their focus sessions" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200 shadow-lg bg-white z-50">
                    <SelectItem value="my_sessions" className="rounded-lg">My Sessions</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id} className="rounded-lg">
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-4 py-2">
                  {users.length} users loaded
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Focus;
