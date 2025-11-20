import React from 'react';

const ConstellationOverlay: React.FC = () => {
  return (
    <svg
      className="hero-svg-constellation"
      viewBox="0 0 400 600"
      preserveAspectRatio="xMaxYMin meet"
    >
      {/* Constellation 1 - Top right */}
      <g opacity="0.3">
        <line x1="320" y1="80" x2="350" y2="120" stroke="white" strokeWidth="1" />
        <line x1="350" y1="120" x2="380" y2="100" stroke="white" strokeWidth="1" />
        <line x1="350" y1="120" x2="340" y2="160" stroke="white" strokeWidth="1" />
        <line x1="340" y1="160" x2="360" y2="180" stroke="white" strokeWidth="1" />
        <circle cx="320" cy="80" r="2" fill="white" opacity="0.7" />
        <circle cx="350" cy="120" r="2.5" fill="white" opacity="0.7" />
        <circle cx="380" cy="100" r="2" fill="white" opacity="0.7" />
        <circle cx="340" cy="160" r="2" fill="white" opacity="0.7" />
        <circle cx="360" cy="180" r="2" fill="white" opacity="0.7" />
      </g>

      {/* Constellation 2 - Middle right */}
      <g opacity="0.25">
        <line x1="280" y1="200" x2="310" y2="220" stroke="white" strokeWidth="1" />
        <line x1="310" y1="220" x2="340" y2="240" stroke="white" strokeWidth="1" />
        <line x1="310" y1="220" x2="300" y2="260" stroke="white" strokeWidth="1" />
        <line x1="340" y1="240" x2="360" y2="270" stroke="white" strokeWidth="1" />
        <line x1="300" y1="260" x2="320" y2="280" stroke="white" strokeWidth="1" />
        <circle cx="280" cy="200" r="2" fill="white" opacity="0.7" />
        <circle cx="310" cy="220" r="2.5" fill="white" opacity="0.7" />
        <circle cx="340" cy="240" r="2" fill="white" opacity="0.7" />
        <circle cx="300" cy="260" r="2" fill="white" opacity="0.7" />
        <circle cx="360" cy="270" r="2" fill="white" opacity="0.7" />
        <circle cx="320" cy="280" r="2" fill="white" opacity="0.7" />
      </g>

      {/* Constellation 3 - Lower right */}
      <g opacity="0.3">
        <line x1="300" y1="350" x2="330" y2="370" stroke="white" strokeWidth="1" />
        <line x1="330" y1="370" x2="360" y2="390" stroke="white" strokeWidth="1" />
        <line x1="330" y1="370" x2="320" y2="400" stroke="white" strokeWidth="1" />
        <line x1="360" y1="390" x2="380" y2="420" stroke="white" strokeWidth="1" />
        <line x1="320" y1="400" x2="340" y2="430" stroke="white" strokeWidth="1" />
        <circle cx="300" cy="350" r="2" fill="white" opacity="0.7" />
        <circle cx="330" cy="370" r="2.5" fill="white" opacity="0.7" />
        <circle cx="360" cy="390" r="2" fill="white" opacity="0.7" />
        <circle cx="320" cy="400" r="2" fill="white" opacity="0.7" />
        <circle cx="380" cy="420" r="2" fill="white" opacity="0.7" />
        <circle cx="340" cy="430" r="2" fill="white" opacity="0.7" />
      </g>

      {/* Constellation 4 - Bottom right */}
      <g opacity="0.25">
        <line x1="290" y1="480" x2="320" y2="500" stroke="white" strokeWidth="1" />
        <line x1="320" y1="500" x2="350" y2="520" stroke="white" strokeWidth="1" />
        <line x1="320" y1="500" x2="310" y2="540" stroke="white" strokeWidth="1" />
        <line x1="350" y1="520" x2="370" y2="550" stroke="white" strokeWidth="1" />
        <circle cx="290" cy="480" r="2" fill="white" opacity="0.7" />
        <circle cx="320" cy="500" r="2.5" fill="white" opacity="0.7" />
        <circle cx="350" cy="520" r="2" fill="white" opacity="0.7" />
        <circle cx="310" cy="540" r="2" fill="white" opacity="0.7" />
        <circle cx="370" cy="550" r="2" fill="white" opacity="0.7" />
      </g>

      {/* Additional scattered stars */}
      <g opacity="0.2">
        <circle cx="250" cy="150" r="1.5" fill="white" opacity="0.6" />
        <circle cx="270" cy="300" r="1.5" fill="white" opacity="0.6" />
        <circle cx="260" cy="450" r="1.5" fill="white" opacity="0.6" />
        <circle cx="240" cy="550" r="1.5" fill="white" opacity="0.6" />
      </g>
    </svg>
  );
};

export default ConstellationOverlay;

