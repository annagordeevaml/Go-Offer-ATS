import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, LogOut, User, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import logoImg from '../../images/logo/logo.png';

interface HeaderProps {
  activePage?: 'Star Catalogue' | 'My Jobs' | 'Analytics' | 'Benchmark';
}

const Header: React.FC<HeaderProps> = ({ activePage = 'Star Catalogue' }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const signOutButtonRef = useRef<HTMLButtonElement>(null);
  const { user, signOut } = useAuth();

  const navItems = [
    { label: 'Star Catalogue', active: activePage === 'Star Catalogue' },
    { label: 'My Jobs', active: activePage === 'My Jobs' },
    { label: 'Analytics', active: activePage === 'Analytics' },
    { label: 'Benchmark', active: activePage === 'Benchmark' },
  ];


  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isUserMenuOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close menu if clicking on buttons inside
      if (target.closest('button[data-sign-out]') || 
          target.closest('button[data-switch-user]') ||
          signOutButtonRef.current?.contains(target)) {
        console.log('Click detected on button - not closing menu');
        return;
      }
      
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
      
      // Check if click is outside user menu
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        console.log('Click outside user menu - closing');
        setIsUserMenuOpen(false);
      }
    };

    // Add listener with a delay to allow button clicks to process first
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 10);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isUserMenuOpen]);

  const handleSignOut = async (e?: React.MouseEvent) => {
    console.log('handleSignOut called', e);
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      console.log('Sign out clicked - starting logout process');
      setIsUserMenuOpen(false);
      
      // Import supabase directly
      const { supabase } = await import('../lib/supabaseClient');
      console.log('Supabase imported, signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
      }
      console.log('Sign out successful, clearing storage...');
      
      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('Storage cleared, redirecting...');
      // Force page reload to clear all state
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force logout even if there's an error
      setIsUserMenuOpen(false);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const handleSwitchUser = async (e?: React.MouseEvent) => {
    console.log('handleSwitchUser called', e);
    // Same as sign out - just different label
    await handleSignOut(e);
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    const parts = user.email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  const getUserDisplayName = () => {
    if (!user?.email) return 'User';
    return user.email.split('@')[0];
  };

  return (
    <header className="sticky top-0 z-50 relative">
      <div className="relative z-10 w-full mx-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src={logoImg} 
                alt="GoOffer Logo" 
                className="h-10 w-auto"
              />
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    // Dispatch custom event for navigation
                    window.dispatchEvent(new CustomEvent('navigate', { detail: item.label }));
                  }}
                  className={`text-[#e0e7ff] font-medium transition-colors duration-300 hover:text-white relative ${
                    item.active
                      ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-[#7C3AED] after:to-[#06B6D4]'
                      : ''
                  }`}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Temporary Logout Button - Visible and Prominent - Always Shown */}
            <button
              onClick={handleSignOut}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg transition-colors duration-200 flex items-center gap-2 mr-4 shadow-xl border-2 border-red-800"
              title="Logout (Temporary - Click to logout)"
              style={{ zIndex: 9999 }}
            >
              <LogOut className="w-5 h-5" />
              <span>LOGOUT</span>
            </button>

            {/* User Profile Dropdown */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-transparent"
                  aria-label="User menu"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] flex items-center justify-center text-white font-semibold">
                    {getUserInitials()}
                  </div>
                  <span className="hidden sm:block text-white font-medium">{getUserDisplayName()}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#e0e7ff] transition-transform duration-300 ${
                      isUserMenuOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 shadow-lg py-2 z-[1000]"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-xs text-white/70">{user.email}</p>
                    </div>
                    <button
                      data-switch-user="true"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Switch User button - onMouseDown');
                      }}
                      onClick={(e) => {
                        console.log('Switch User button clicked!');
                        e.preventDefault();
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                        // Close menu immediately
                        setIsUserMenuOpen(false);
                        // Execute action
                        handleSwitchUser(e).catch(console.error);
                      }}
                      type="button"
                      className="w-full text-left px-4 py-2 text-[#e0e7ff] hover:bg-white/10 hover:text-white transition-colors duration-300 flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      Switch User
                    </button>
                    <button
                      ref={signOutButtonRef}
                      data-sign-out="true"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Sign Out button - onMouseDown');
                      }}
                      onClick={(e) => {
                        console.log('Sign Out button clicked!');
                        e.preventDefault();
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                        // Close menu immediately
                        setIsUserMenuOpen(false);
                        // Execute action
                        handleSignOut(e).catch(console.error);
                      }}
                      type="button"
                      className="w-full text-left px-4 py-2 text-[#e0e7ff] hover:bg-white/10 hover:text-white transition-colors duration-300 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

