import { Search, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { NotificationsPopover } from '@/components/notifications/NotificationsPopover';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';

interface TopbarProps {
  title?: string;
  breadcrumb?: React.ReactNode;
}

export function Topbar({ title, breadcrumb }: TopbarProps) {
  const { open } = useCommandPalette();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-red-500/20 bg-gradient-to-r from-[#090b10] via-[#11131a] to-[#1a0b0d] px-8 text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex items-center gap-4">
        {breadcrumb || (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white/70">
              Comercial
            </span>
            {title && (
              <>
                <span className="text-sm text-white/30">/</span>
                <span className="text-sm font-semibold text-white">{title}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search / Command Palette Trigger */}
        <Button
          variant="ghost"
          onClick={open}
          className={cn(
            'hidden md:flex min-w-[210px] items-center justify-start gap-2 h-10 rounded-full px-4',
            'text-white/80 hover:text-white bg-white/8 hover:bg-white/14 border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.18)]'
          )}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Buscar...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md px-1.5 font-mono text-[10px] font-medium bg-white/12 text-white/70 border border-white/10">
            <Command className="h-3 w-3" />K
          </kbd>
        </Button>

        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={open}
          className="md:hidden text-white/75 hover:text-white hover:bg-white/10"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationsPopover />
      </div>
    </header>
  );
}
