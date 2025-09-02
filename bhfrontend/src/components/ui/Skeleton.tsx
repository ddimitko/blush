import React, { memo } from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = memo(({
  className,
  variant = 'default',
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-gray-200';
  
  const variants = {
    default: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
  };
  
  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={cn(
        baseClasses,
        variants[variant],
        animations[animation],
        className
      )}
    />
  );
});

Skeleton.displayName = 'Skeleton';

// Skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = memo(({
  lines = 1,
  className
}) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={cn(
          'h-4',
          i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
        )}
      />
    ))}
  </div>
));

SkeletonText.displayName = 'SkeletonText';

export const SkeletonCard: React.FC<{ className?: string }> = memo(({ className }) => (
  <div className={cn('card-elegant p-4 space-y-4', className)}>
    <Skeleton className="aspect-[4/3] w-full" />
    <div className="space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <SkeletonText lines={2} />
    </div>
  </div>
));

SkeletonCard.displayName = 'SkeletonCard';

export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = memo(({
  size = 'md',
  className
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <Skeleton
      variant="circular"
      className={cn(sizes[size], className)}
    />
  );
});

SkeletonAvatar.displayName = 'SkeletonAvatar';

export const SkeletonButton: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = memo(({
  size = 'md',
  className
}) => {
  const sizes = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-28',
  };

  return (
    <Skeleton className={cn(sizes[size], className)} />
  );
});

SkeletonButton.displayName = 'SkeletonButton';

export const SkeletonTable: React.FC<{ rows?: number; cols?: number; className?: string }> = memo(({
  rows = 5,
  cols = 4,
  className
}) => (
  <div className={cn('space-y-3', className)}>
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 w-full" />
        ))}
      </div>
    ))}
  </div>
));

SkeletonTable.displayName = 'SkeletonTable';

export default Skeleton;
