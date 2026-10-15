import React from 'react';

export const NparteLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Book outline (Left) */}
    <path d="M12 75 V28 C12 28 25 22 45 45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 72 V31 C22 31 32 26 45 45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 68 V35 C32 35 38 31 45 45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 75 C25 75 38 82 45 90 V45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    
    {/* Network nodes (Right) */}
    <path d="M45 45 L58 25 L75 35 L65 58 L45 45" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M58 25 L75 15 L85 30 L75 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M65 58 L85 50 L85 30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    
    {/* Node points */}
    <circle cx="58" cy="25" r="3.5" fill="currentColor" />
    <circle cx="75" cy="35" r="3.5" fill="currentColor" />
    <circle cx="65" cy="58" r="3.5" fill="currentColor" />
    <circle cx="75" cy="15" r="3.5" fill="currentColor" />
    <circle cx="85" cy="30" r="3.5" fill="currentColor" />
    <circle cx="85" cy="50" r="3.5" fill="currentColor" />

    {/* Pulse line */}
    <path d="M65 58 L75 45 L80 60 L85 40 L90 52 L98 52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

    {/* Center node / Starburst */}
    <circle cx="45" cy="45" r="5" fill="#EAB308" />
    <path d="M28 45 L38 45 M34 36 L40 41 M33 55 L39 50" stroke="#EAB308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
