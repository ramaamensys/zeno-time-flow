import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Handle sign out event
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, cleaning up...');
          setUser(null);
          setSession(null);
          
          // Use setTimeout to avoid potential routing conflicts
          setTimeout(() => {
            window.location.href = '/auth';
          }, 100);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const cleanupAuthState = () => {
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    // Remove from sessionStorage if in use
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const signOut = async () => {
    console.log('Signing out user...');
    
    try {
      // Clean up auth state first
      cleanupAuthState();
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Perform Supabase sign out (this will trigger the auth state change)
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.warn('Sign out error (continuing anyway):', error);
      }
      
      console.log('Sign out completed, redirecting to home...');
      
      // Force redirect to home page (Index)
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      
      // Force cleanup and redirect even if signOut fails
      cleanupAuthState();
      setUser(null);
      setSession(null);
      
      // Fallback redirect to home page
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};