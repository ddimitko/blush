import React from 'react';

interface LunaraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

const LunaraLogo: React.FC<LunaraLogoProps> = ({ 
  size = 'md', 
  variant = 'full',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  // Lunara Icon - Elegant crescent moon with star
  const LunaraIcon = () => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClasses[size]} ${className}`}
    >
      {/* Crescent Moon */}
      <path
        d="M20 4C20 4 12 6 12 16C12 26 20 28 20 28C15.5817 28 12 24.4183 12 20V12C12 7.58172 15.5817 4 20 4Z"
        fill="#BFA054"
        fillOpacity="0.9"
      />
      
      {/* Inner glow */}
      <path
        d="M18 6C18 6 13 7.5 13 16C13 24.5 18 26 18 26C15.2386 26 13 23.7614 13 21V11C13 8.23858 15.2386 6 18 6Z"
        fill="#FFFFFF"
        fillOpacity="0.3"
      />
      
      {/* Star accent */}
      <g transform="translate(22, 8)">
        <path
          d="M4 0L4.89806 2.76393H7.80423L5.45308 4.47214L6.35114 7.23607L4 5.52786L1.64886 7.23607L2.54692 4.47214L0.195774 2.76393H3.10194L4 0Z"
          fill="#BFA054"
          transform="scale(0.6)"
        />
      </g>
      
      {/* Subtle sparkle */}
      <circle cx="8" cy="10" r="1" fill="#BFA054" fillOpacity="0.6" />
      <circle cx="24" cy="20" r="0.5" fill="#BFA054" fillOpacity="0.4" />
    </svg>
  );

  // Text component
  const LunaraText = () => (
    <span 
      className={`font-serif font-bold tracking-wide ${textSizeClasses[size]} text-neutral-800`}
      style={{ 
        background: 'linear-gradient(135deg, #333333 0%, #BFA054 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}
    >
      Lunara
    </span>
  );

  if (variant === 'icon') {
    return <LunaraIcon />;
  }

  if (variant === 'text') {
    return <LunaraText />;
  }

  // Full logo with icon and text
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <LunaraIcon />
      <LunaraText />
    </div>
  );
};

export default LunaraLogo;
