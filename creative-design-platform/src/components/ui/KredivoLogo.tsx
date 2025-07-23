import React from 'react';

interface KredivoLogoProps {
  size?: number;
  className?: string;
}

export default function KredivoLogo({ size = 32, className = '' }: KredivoLogoProps) {
  return (
    <img
      src="/kredivo-logo-new.jpg"
      alt="Kredivo Logo"
      width={size}
      height={size}
      className={className}
      style={{ 
        display: 'inline-block',
        objectFit: 'contain',
        backgroundColor: 'transparent'
      }}
    />
  );
}