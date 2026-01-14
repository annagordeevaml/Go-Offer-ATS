import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let subscription: any = null;
    
    // Set a shorter timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Auth check timeout - proceeding without session');
        setUser(null);
        setLoading(false);
      }
    }, 2000); // 2 second timeout - faster response

    // Try to get session with timeout
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve({ data: { session: null }, error: new Error('Timeout') }), 2000);
    });

    Promise.race([sessionPromise, timeoutPromise])
      .then((result: any) => {
        if (mounted) {
          clearTimeout(timeoutId);
          if (result?.data?.session) {
            setUser(result.data.session.user);
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      })
      .catch((error) => {
        if (mounted) {
          clearTimeout(timeoutId);
          console.error('Failed to get session:', error);
          setUser(null);
          setLoading(false);
        }
      });

    // Listen for auth changes with error handling
    try {
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          clearTimeout(timeoutId);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      });
      subscription = sub;
    } catch (error) {
      console.error('Failed to set up auth listener:', error);
      if (mounted) {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (e) {
          // Ignore unsubscribe errors
        }
      }
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('Starting sign out...');
      // Clear user state first
      setUser(null);
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      console.log('Sign out completed, redirecting...');
      // Force page reload to clear any cached state
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, clear local state and redirect
      setUser(null);
      window.location.href = '/';
    }
  };

  return {
    user,
    loading,
    signOut,
  };
};

