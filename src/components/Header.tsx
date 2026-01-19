import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import logoImg from '../../images/logo/logo.png';

interface HeaderProps {
  activePage?: 'Star Catalogue' | 'My Jobs' | 'Analytics' | 'Benchmark';
}

const Header: React.FC<HeaderProps> = ({ activePage = 'Star Catalogue' }) => {
  const navItems = [
    { label: 'Star Catalogue', active: activePage === 'Star Catalogue' },
    { label: 'My Jobs', active: activePage === 'My Jobs' },
    { label: 'Analytics', active: activePage === 'Analytics' },
    { label: 'Benchmark', active: activePage === 'Benchmark' },
  ];

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

            {/* User placeholder - будет восстановлено с Supabase */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] flex items-center justify-center text-white font-semibold">
                U
              </div>
              <span className="hidden sm:block text-white font-medium">User</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
