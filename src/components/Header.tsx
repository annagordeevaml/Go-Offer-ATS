import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import logoImg from '../../images/logo/logo.png';

interface HeaderProps {
  activePage?: 'Search' | 'My Jobs' | 'Analytics';
}

const Header: React.FC<HeaderProps> = ({ activePage = 'Search' }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: 'Search', active: activePage === 'Search' },
    { label: 'My Jobs', active: activePage === 'My Jobs' },
    { label: 'Analytics', active: activePage === 'Analytics' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50">
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

            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-transparent"
                aria-label="User menu"
                aria-expanded={isDropdownOpen}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] flex items-center justify-center text-white font-semibold">
                  AG
                </div>
                <span className="hidden sm:block text-white font-medium">Anna Gordeeva</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#e0e7ff] transition-transform duration-300 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 shadow-lg py-2">
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="block px-4 py-2 text-[#e0e7ff] hover:bg-white/10 hover:text-white transition-colors duration-300"
                  >
                    Profile
                  </a>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="block px-4 py-2 text-[#e0e7ff] hover:bg-white/10 hover:text-white transition-colors duration-300"
                  >
                    Settings
                  </a>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="block px-4 py-2 text-[#e0e7ff] hover:bg-white/10 hover:text-white transition-colors duration-300"
                  >
                    Logout
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

