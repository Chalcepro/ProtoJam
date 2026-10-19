import React from 'react';

// Small icons lucide has no match for: a mask, and the corner styles.
const Svg: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 14, children }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

// a box cutting a circle to its shape
export const MaskIcon: React.FC<{ size?: number }> = ({ size }) => (
  <Svg size={size}><rect x="2" y="2" width="12" height="12" rx="1.5" /><circle cx="8" cy="8" r="3.5" fill="currentColor" stroke="none" /></Svg>
);

// one corner, top-left, in each style
export const CornerRoundIcon: React.FC<{ size?: number }> = ({ size }) => (
  <Svg size={size}><path d="M3 14 V9 A6 6 0 0 1 9 3 H14" /></Svg>
);
export const CornerInverseIcon: React.FC<{ size?: number }> = ({ size }) => (
  <Svg size={size}><path d="M3 14 V9 A6 6 0 0 0 9 3 H14" /></Svg>
);
export const CornerBevelIcon: React.FC<{ size?: number }> = ({ size }) => (
  <Svg size={size}><path d="M3 14 V9 L9 3 H14" /></Svg>
);
// the wall carries on up; the top ramps up into it
export const CornerFlareIcon: React.FC<{ size?: number }> = ({ size }) => (
  <Svg size={size}><path d="M3 14 V2 C3 6 7 8 14 8" /></Svg>
);
