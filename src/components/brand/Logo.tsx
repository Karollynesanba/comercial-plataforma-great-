import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'mark';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'default' | 'light';
}

const sizes = {
  sm: { full: 'h-6', mark: 'h-6 w-6' },
  md: { full: 'h-8', mark: 'h-8 w-8' },
  lg: { full: 'h-10', mark: 'h-10 w-10' },
  xl: { full: 'h-12', mark: 'h-12 w-12' },
};

export function Logo({ variant = 'full', className, size = 'md', theme = 'default' }: LogoProps) {
  const isLight = theme === 'light';
  const hexagonFill = isLight ? '#dc2626' : 'hsl(var(--primary))';

  if (variant === 'mark') {
    return (
      <div className={cn('relative', sizes[size].mark, className)}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Hexagon G Mark */}
          <path
            d="M24 4L42 14V34L24 44L6 34V14L24 4Z"
            fill={hexagonFill}
            className="drop-shadow-lg"
          />
          <text
            x="24"
            y="32"
            textAnchor="middle"
            fill="white"
            fontSize="24"
            fontWeight="800"
            fontFamily="Inter, sans-serif"
          >
            G
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={sizes[size].mark}>
        <path
          d="M24 4L42 14V34L24 44L6 34V14L24 4Z"
          fill={hexagonFill}
          className="drop-shadow-lg"
        />
        <text
          x="24"
          y="32"
          textAnchor="middle"
          fill="white"
          fontSize="24"
          fontWeight="800"
          fontFamily="Inter, sans-serif"
        >
          G
        </text>
      </svg>
      <div className="flex flex-col">
        <span className={cn(
          'font-bold tracking-tight leading-none',
          isLight ? 'text-gray-900' : '',
          size === 'sm' && 'text-lg',
          size === 'md' && 'text-xl',
          size === 'lg' && 'text-2xl',
          size === 'xl' && 'text-3xl',
        )}>
          Great
        </span>
        <span className={cn(
          'font-medium leading-none',
          isLight ? 'text-gray-500' : 'text-muted-foreground',
          size === 'sm' && 'text-[10px]',
          size === 'md' && 'text-xs',
          size === 'lg' && 'text-sm',
          size === 'xl' && 'text-base',
        )}>
          Assessoria
        </span>
      </div>
    </div>
  );
}

export function LogoLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <svg 
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-12 h-12 animate-spin-slow"
      >
        <path
          d="M24 4L42 14V34L24 44L6 34V14L24 4Z"
          fill="hsl(var(--primary))"
          className="drop-shadow-lg"
        />
        <text
          x="24"
          y="32"
          textAnchor="middle"
          fill="white"
          fontSize="24"
          fontWeight="800"
          fontFamily="Inter, sans-serif"
        >
          G
        </text>
      </svg>
    </div>
  );
}
