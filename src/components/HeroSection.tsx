import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <div className="relative w-full py-20 px-4 sm:px-6 lg:px-8" style={{ border: 'none', outline: 'none', boxShadow: 'none' }}>
      <div className="relative z-10 max-w-7xl mx-auto text-center">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
          Find your Super Star
        </h1>
        <p className="text-xl sm:text-2xl text-[#e0e7ff] max-w-5xl mx-auto leading-relaxed whitespace-normal">
          Behind every successful product stands a person.<br />
          Explore candidate stories and discover the superstar ready to power your team.
        </p>
      </div>
    </div>
  );
};

export default HeroSection;

