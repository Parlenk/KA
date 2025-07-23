import React from 'react';

interface KredivoLogoCssProps {
  size?: number;
  className?: string;
}

export default function KredivoLogoCss({ size = 32, className = '' }: KredivoLogoCssProps) {
  const logoStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    display: 'inline-block',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'bold',
    fontSize: `${size * 0.6}px`,
    color: '#1FB6FF',
    lineHeight: `${size}px`,
    textAlign: 'center'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: '60%',
    height: '8%',
    backgroundColor: '#FF6B47',
    transform: 'rotate(-30deg)',
    borderRadius: '1px'
  };

  return (
    <div style={logoStyle} className={className}>
      K
      <div style={overlayStyle}></div>
    </div>
  );
}