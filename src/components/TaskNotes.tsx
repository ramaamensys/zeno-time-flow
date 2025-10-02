import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Send, Paperclip, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface TaskNote {
  id: string;
  task_id: string;
  user_id: string;
  author_id: string;
  note_text: string;
  files: string[];
  created_at: string;
  author_name?: string;
  is_admin_author?: boolean;
}

interface TaskNotesProps {
  taskId: string;
  taskTitle: string;
  assignedUsers: Array<{
    user_id: string;
    full_name: string | null;
    email: string;
  }>;
  isAdmin: boolean;
  currentUserId?: string;
  taskUserId?: string;
}

export const TaskNotes = ({ taskId, taskTitle, assignedUsers, isAdmin, currentUserId, taskUserId }: TaskNotesProps) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check location tracking status
  useEffect(() => {
    const checkLocationStatus = () => {
      const enabled = localStorage.getItem('locationEnabled') === 'true';
      setLocationEnabled(enabled);
    };
    
    checkLocationStatus();
    
    // Listen for changes
    const interval = setInterval(checkLocationStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Initialize selectedUser to first assigned user for admins
  useEffect(() => {
    if (isAdmin && assignedUsers.length > 0 && !selectedUser) {
      setSelectedUser(assignedUsers[0].user_id);
    }
  }, [isAdmin, assignedUsers, selectedUser]);

  useEffect(() => {
    if (user && isNotesOpen && (selectedUser || !isAdmin)) {
      fetchNotes();
    }
  }, [user, taskId, isNotesOpen, selectedUser]);

  const fetchNotes = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from('task_notes')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      // Filter based on user type and selection
      if (isAdmin && selectedUser) {
        // Admin viewing notes for specific user
        query = query.eq('user_id', selectedUser);
      } else if (!isAdmin) {
        // Regular user viewing their own notes
        query = query.eq('user_id', user.id);
      }

      const { data: notesData, error } = await query;

      if (error) throw error;

      // Get author profiles for notes
      const notesWithAuthors = await Promise.all(
        (notesData || []).map(async (note) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', note.author_id)
            .maybeSingle();

          // Check if author is admin
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', note.author_id);

          const isAdminAuthor = roleData?.some(r => r.role === 'super_admin' || r.role === 'manager');
          
          return {
            ...note,
            files: Array.isArray(note.files) ? (note.files as string[]) : [],
            author_name: profile?.full_name || profile?.email || (isAdminAuthor ? 'Manager' : 'User'),
            is_admin_author: isAdminAuthor
          };
        })
      );

      setNotes(notesWithAuthors);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    }
    setIsLoading(false);
  };

  const getLocation = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'ZenoTimeFlow/1.0'
                }
              }
            );
            
            if (!response.ok) {
              throw new Error('Geocoding failed');
            }
            
            const data = await response.json();
            const address = data.address;
            
            const parts = [];
            if (address.road) parts.push(address.road);
            if (address.neighbourhood || address.suburb) parts.push(address.neighbourhood || address.suburb);
            if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
            if (address.state) parts.push(address.state);
            
            const readableAddress = parts.length > 0 ? parts.join(', ') : `${latitude}, ${longitude}`;
            resolve(readableAddress);
          } catch (error) {
            console.error('Geocoding error:', error);
            resolve(`${latitude}, ${longitude}`);
          }
        },
        (error) => {
          reject(new Error('Unable to retrieve location'));
        }
      );
    });
  };

  const addNote = async () => {
    if (!user) return;
    if (!newNote.trim()) return;

    setIsSaving(true);
    try {
      const targetUserId = isAdmin ? selectedUser : user.id;
      if (!targetUserId) {
        toast.error('Please select a user');
        return;
      }

      // Get location if enabled
      let location = null;
      if (locationEnabled) {
        try {
          location = await getLocation();
        } catch (error: any) {
          console.error('Failed to get location:', error);
        }
      }

      // Upload files first
      const fileUrls: string[] = [];
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `notes/${user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('task-attachments')
          .upload(fileName, file);

        if (error) {
          console.error('File upload error:', error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(fileName);

        fileUrls.push(publicUrl);
      }

      // Append location to note if available
      let noteText = newNote.trim();
      if (location) {
        noteText += `\n\n📍 ${location}`;
      }

      // Create the note
      const { error } = await supabase
        .from('task_notes')
        .insert({
          task_id: taskId,
          user_id: targetUserId,
          author_id: user.id,
          note_text: noteText,
          files: fileUrls
        });

      if (error) throw error;

      setNewNote("");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await fetchNotes();
      toast.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
    setIsSaving(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-1" />
          Notes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Task Notes: {taskTitle}</span>
          </DialogTitle>
          
          {/* User Selection for Admins */}
          {isAdmin && assignedUsers.length > 0 && (
            <div className="mb-3">
              <label className="text-sm font-medium mb-2 block">Select User for Notes:</label>
              <Select value={selectedUser || ""} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {assignedUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground">
            {isAdmin 
              ? selectedUser 
                ? `Notes for: ${assignedUsers.find(u => u.user_id === selectedUser)?.full_name || assignedUsers.find(u => u.user_id === selectedUser)?.email}`
                : 'Select a user to view notes'
              : 'Your task notes and admin comments'
            }
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center flex-1">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Notes Display */}
            <ScrollArea className="flex-1 pr-2 mb-4">
              <div className="space-y-4 p-2">
                {notes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div>No notes yet</div>
                    <div className="text-sm">
                      {isAdmin ? 'Add notes for the selected user' : 'Add your first note or wait for admin comments'}
                    </div>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            note.is_admin_author 
                              ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                              : 'bg-gradient-to-br from-blue-500 to-teal-600 text-white'
                          }`}>
                            {getInitials(note.author_name || 'U')}
                          </div>
                          <span className="text-sm font-medium">{note.author_name}</span>
                          {note.is_admin_author && <Badge variant="outline" className="text-xs">Admin</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      
                      <div className="text-sm whitespace-pre-wrap">
                        {note.note_text.split('\n\n📍').map((part, index) => {
                          if (index === 0) {
                            return <div key={index}>{part}</div>;
                          }
                          return (
                            <div key={index} className="mt-3 pt-2 border-t border-gray-200">
                              <div className="flex items-start gap-1 text-xs text-gray-600">
                                <span className="text-base">📍</span>
                                <span className="flex-1">{part}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {note.files && note.files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {note.files.map((fileUrl, index) => (
                            <a
                              key={index}
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-blue-600 hover:text-blue-800 underline bg-blue-50 rounded px-2 py-1"
                            >
                              📎 {fileUrl.split('/').pop() || 'View attachment'}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            {/* File Preview */}
            {selectedFiles.length > 0 && (
              <div className="mb-3 p-2 bg-muted rounded-md">
                <div className="text-sm font-medium mb-2">Files to attach:</div>
                <div className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-4 w-4 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Add Note Section */}
            <div className="space-y-3 border-t pt-3">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={
                  isAdmin 
                    ? "Add a note for the selected user..."
                    : "Add your progress notes..."
                }
                className="min-h-20 resize-none"
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach files"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button 
                  size="sm" 
                  onClick={() => addNote()}
                  disabled={!newNote.trim() || isSaving || (isAdmin && !selectedUser)}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {isSaving ? 'Adding...' : 'Add Note'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};