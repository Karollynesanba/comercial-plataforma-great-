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
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
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

const variantBorderClasses = {
  default: 'border-border',
  primary: 'border-primary/30',
  success: 'border-success/30',
  warning: 'border-warning/30',
  danger: 'border-destructive/30',
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
  className,
}: KPICardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn(
      'p-card rounded-lg border bg-card shadow-card card-hover',
      variantBorderClasses[variant],
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-caption text-muted-foreground">{label}</span>
        {icon && (
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', iconColorClasses[iconColor])}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-kpi text-foreground tabular-nums">
          {value}
        </p>

        {subtitle && (
          <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
        )}
        
        {(change !== undefined || changeLabel) && (
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-1 text-caption font-medium',
              trendColors[trend]
            )}>
              <TrendIcon className="h-3 w-3" />
              {change !== undefined && (
                <span>{change > 0 ? '+' : ''}{change}%</span>
              )}
            </div>
            {changeLabel && (
              <span className="text-caption text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
