import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        // Sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        if (data.user) {
          onAuthSuccess();
        }
      } else {
        // Sign up - without email confirmation, grant access immediately
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            // Disable email confirmation requirement
            data: {
              email_confirm: false
            }
          },
        });

        if (signUpError) {
          console.error('Sign up error:', signUpError);
          
          // Handle disabled email provider
          if (
            signUpError.message?.includes('Email signups are disabled') ||
            signUpError.code === 'email_provider_disabled' ||
            (signUpError.status === 400 && signUpError.message?.includes('Email signups'))
          ) {
            throw new Error('Email signups are disabled. Please enable Email provider in Supabase Dashboard: Authentication → Providers → Email → Enable');
          }
          
          throw signUpError;
        }
        
        // After registration, grant access immediately (without email confirmation)
        if (data.user) {
          // Automatically sign in after registration
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (signInError) {
            console.error('Auto sign-in error:', signInError);
            // If auto sign-in failed but user was created - switch to login
            setMessage('Account created successfully! Please sign in with your credentials.');
            setTimeout(() => {
              setIsLogin(true);
              setMessage(null);
            }, 3000);
          } else if (signInData.user) {
            // Successful sign-in - grant access
            onAuthSuccess();
          }
        } else {
          // If user was not created, show error
          throw new Error('Failed to create account. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('Auth error details:', {
        error: err,
        message: err?.message,
        status: err?.status,
        statusText: err?.statusText,
        name: err?.name,
        stack: err?.stack,
      });
      
      // Better error messages
      let errorMessage = 'An error occurred. Please try again.';
      
      // Check for specific error types
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Handle network errors with more specific guidance
      if (
        errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
        err?.name === 'TypeError' ||
        err?.status === 0
      ) {
        if (errorMessage.includes('ERR_NAME_NOT_RESOLVED') || err?.status === 0) {
          errorMessage = 'Cannot connect to Supabase. Please check:\n1. Verify Supabase Project URL in Dashboard (Settings → API)\n2. Update VITE_SUPABASE_URL in .env.local with correct URL\n3. Check if project is active (not paused/deleted)\n4. Restart dev server after updating .env.local';
        } else {
          errorMessage = 'Network error. Please check:\n1. Your internet connection\n2. Supabase URL and API key in .env.local\n3. Browser console (F12) for detailed error\n4. Restart dev server after changing .env.local\n5. Supabase URL Configuration: http://localhost:3000';
        }
      }
      
      // Handle CORS errors
      if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
        errorMessage = 'CORS error. Please check Supabase project settings and ensure your domain is allowed.';
      }
      
      // Handle disabled email provider
      if (
        errorMessage.includes('Email signups are disabled') ||
        err?.code === 'email_provider_disabled' ||
        (err?.status === 400 && errorMessage.includes('email'))
      ) {
        errorMessage = 'Email signups are disabled. Please:\n1. Go to Supabase Dashboard\n2. Authentication → Providers → Email\n3. Click "Enable" to activate Email provider\n4. Save and try again';
      }
      
      // Handle email sending errors
      if (errorMessage.includes('confirmation email') || errorMessage.includes('Error sending')) {
        errorMessage = 'Email service error. Solutions:\n1. Disable email confirmation in Supabase (Authentication → Settings)\n2. Configure email provider in Supabase Dashboard\n3. Check email templates configuration';
      }
      
      // Handle 500 errors
      if (err?.status === 500) {
        if (errorMessage.includes('email')) {
          errorMessage = 'Email service error (500). Please:\n1. Go to Supabase Dashboard → Authentication → Settings\n2. Disable "Enable email confirmations" for testing\n3. Or configure email provider properly';
        } else {
          errorMessage = 'Server error (500). Please check Supabase project status and configuration.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0b2e] via-[#2d1b4e] to-[#1a0b2e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-white/70 text-sm">
              {isLogin ? 'Sign in to access your job postings' : 'Sign up to get started'}
            </p>
          </div>

          {/* Error/Message Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
              {message}
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-[0_0_25px_rgba(124,58,237,0.7)] transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {isLogin ? (
                    <>
                      <LogIn className="w-5 h-5" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Sign Up
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              className="text-white/70 hover:text-white transition-colors text-sm"
            >
              {isLogin ? (
                <>
                  Don't have an account? <span className="text-[#7C3AED] font-semibold">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account? <span className="text-[#7C3AED] font-semibold">Sign in</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

