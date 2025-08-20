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
import { Play, Pause, Square, Timer, Target, Brain, Users } from "lucide-react";
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

  useEffect(() => {
    if (user) {
      checkUserRole();
      loadUsers();
      fetchSessions();
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

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    setUserRole(roles?.role || 'user');
  };

  const loadUsers = async () => {
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roles?.role === 'admin' || roles?.role === 'super_admin') {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (profiles) {
        setUsers(profiles.map(p => ({ id: p.user_id, full_name: p.full_name || p.email || 'Unknown', email: p.email || '' })));
      }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Focus Sessions</h1>
        <p className="text-muted-foreground">
          Track your focused work time and productivity
        </p>
        {selectedUserId && userRole && (userRole === 'admin' || userRole === 'super_admin') && (
          <p className="text-sm text-muted-foreground mt-1">
            Viewing focus sessions for: {users.find(u => u.id === selectedUserId)?.full_name}
          </p>
        )}
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Focus Timer
          </CardTitle>
          <CardDescription>
            Start a focus session to track your productive time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-6xl font-mono font-bold mb-4">
              {formatTime(seconds)}
            </div>
            
            {currentSession && (
              <div className="flex items-center justify-center gap-4 mb-4">
                <Badge variant="outline" className="text-sm">
                  Interruptions: {interruptions}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addInterruption}
                >
                  +1 Interruption
                </Button>
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              {!currentSession && (!selectedUserId || selectedUserId === user?.id) ? (
                <Button onClick={startSession} size="lg">
                  <Play className="mr-2 h-4 w-4" />
                  Start Focus Session
                </Button>
              ) : currentSession ? (
                <>
                  {isActive ? (
                    <Button onClick={pauseSession} variant="outline" size="lg">
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                  ) : (
                    <Button onClick={resumeSession} size="lg">
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </Button>
                  )}
                  <Button onClick={stopSession} variant="destructive" size="lg">
                    <Square className="mr-2 h-4 w-4" />
                    Stop Session
                  </Button>
                </>
              ) : selectedUserId && selectedUserId !== user?.id && (
                <p className="text-muted-foreground">Viewing another user's sessions (read-only)</p>
              )}
            </div>
          </div>

          {currentSession && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Productivity Score (1-10)</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={productivityScore}
                      onChange={(e) => setProductivityScore(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-8 text-center">{productivityScore}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-notes">Session Notes</Label>
                  <Textarea
                    id="session-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What did you work on? Any insights or challenges?"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Recent Sessions
          </CardTitle>
          <CardDescription>
            Your focus session history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No focus sessions yet. Start your first session to track your productivity!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {new Date(session.start_time).toLocaleDateString()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(session.start_time).toLocaleTimeString()}
                      </span>
                    </div>
                    {session.notes && (
                      <p className="text-sm text-muted-foreground">{session.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{formatDuration(session.duration)}</div>
                      <div className="text-muted-foreground">Duration</div>
                    </div>
                    {session.productivity_score && (
                      <div className="text-center">
                        <div className="font-medium">{session.productivity_score}/10</div>
                        <div className="text-muted-foreground">Score</div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="font-medium">{session.interruptions}</div>
                      <div className="text-muted-foreground">Interruptions</div>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              View User Focus Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="user-select">Select User:</Label>
              <Select value={selectedUserId || ''} onValueChange={(value) => setSelectedUserId(value || null)}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a user to view their focus sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">My Sessions</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Focus;