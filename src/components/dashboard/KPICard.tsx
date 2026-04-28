import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  iconColor?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  featured?: boolean;
  appearance?: 'filled' | 'surface';
  sparklineValues?: number[];
  className?: string;
}

const iconColorClasses = {
  default: 'text-muted-foreground bg-surface-2',
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  danger: 'text-destructive bg-destructive/10',
  info: 'text-info bg-info/10',
};

const trendColors = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
};

const filledVariantClasses = {
  default: 'border-transparent bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white',
  primary: 'border-transparent bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600 text-white',
  success: 'border-transparent bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white',
  warning: 'border-transparent bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-white',
  danger: 'border-transparent bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 text-white',
  info: 'border-transparent bg-gradient-to-br from-sky-600 via-cyan-500 to-blue-500 text-white',
};

const surfaceTopClasses = {
  default: 'bg-slate-200',
  primary: 'bg-violet-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
};

const surfaceIconClasses = {
  default: 'text-slate-500 bg-slate-100',
  primary: 'text-violet-600 bg-violet-50',
  success: 'text-emerald-600 bg-emerald-50',
  warning: 'text-amber-600 bg-amber-50',
  danger: 'text-rose-600 bg-rose-50',
  info: 'text-sky-600 bg-sky-50',
};

export function KPICard({
  label,
  value,
  subtitle,
  change,
  changeLabel,
  trend = 'neutral',
  icon,
  iconColor = 'default',
  variant = 'default',
  featured = false,
  appearance = 'filled',
  sparklineValues,
  className,
}: KPICardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const isFeatured = featured;
  const isFilled = appearance === 'filled' || isFeatured;
  const sparklinePath = sparklineValues && sparklineValues.length > 1
    ? sparklineValues.map((value, index) => {
        const max = Math.max(...sparklineValues, 1);
        const min = Math.min(...sparklineValues, 0);
        const range = Math.max(max - min, 1);
        const x = (index / (sparklineValues.length - 1)) * 100;
        const y = 100 - (((value - min) / range) * 76 + 12);
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      }).join(' ')
    : '';

  return (
    <div className={cn(
      'group relative overflow-hidden rounded-[22px] border p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)]',
      isFeatured
        ? 'border-transparent bg-gradient-to-br from-[#ff3b3b] via-[#e10600] to-[#b30000] text-white shadow-[0_10px_30px_rgba(255,0,0,0.2)]'
        : isFilled
          ? filledVariantClasses[variant]
          : 'border-transparent bg-white text-foreground',
      className
    )}>
      {!isFilled && !isFeatured && (
        <div className={cn('absolute inset-x-0 top-0 h-1.5', surfaceTopClasses[variant])} />
      )}

      <div className="flex items-start justify-between mb-3">
        <span className={cn('text-[11px] font-medium uppercase tracking-[0.24em]', isFilled ? 'text-white/80' : 'text-muted-foreground')}>{label}</span>
        {icon && (
          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center shadow-sm',
              isFilled
                ? 'bg-white/15 text-white'
                : surfaceIconClasses[variant]
            )}
          >
            {icon}
          </div>
        )}
      </div>
      
      <div className="space-y-1 relative">
        <p className={cn('text-[2rem] font-semibold leading-none tracking-tight tabular-nums md:text-[2.15rem]', isFilled ? 'text-white' : 'text-foreground')}>
          {value}
        </p>

        {subtitle && (
          <p className={cn('text-xs leading-snug', isFilled ? 'text-white/80' : 'text-muted-foreground')}>{subtitle}</p>
        )}
        
        {(change !== undefined || changeLabel) && (
          <div className="flex items-center gap-2 pt-1">
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              isFilled ? 'text-white/90' : trendColors[trend]
            )}>
              <TrendIcon className="h-3 w-3" />
              {change !== undefined && (
                <span>{change > 0 ? '+' : ''}{change}%</span>
              )}
            </div>
            {changeLabel && (
              <span className={cn('text-caption', isFilled ? 'text-white/80' : 'text-muted-foreground')}>{changeLabel}</span>
            )}
          </div>
        )}
      </div>

      {sparklinePath && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className={cn(
            'pointer-events-none absolute bottom-1 right-1 h-16 w-28 opacity-55',
            isFeatured
              ? 'text-white/35'
              : isFilled
                ? 'text-white/35'
                : 'text-slate-300/50'
          )}
        >
          <defs>
            <linearGradient id={`kpi-gradient-${label.replace(/\s+/g, '-').toLowerCase()}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            d={sparklinePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
