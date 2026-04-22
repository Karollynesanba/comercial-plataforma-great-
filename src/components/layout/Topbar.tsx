import { Search, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { NotificationsPopover } from '@/components/notifications/NotificationsPopover';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface TopbarProps {
  title?: string;
  breadcrumb?: React.ReactNode;
}

export function Topbar({ title, breadcrumb }: TopbarProps) {
  const { open } = useCommandPalette();

  return (
    <header className="h-16 border-b border-slate-100 bg-white/95 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        {breadcrumb || (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Comercial
            </span>
            {title && (
              <>
                <span className="text-sm text-muted-foreground/50">/</span>
                <span className="text-sm font-semibold text-foreground">{title}</span>
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
          className="hidden md:flex items-center gap-2 min-w-[210px] justify-start h-10 rounded-full px-4 text-muted-foreground hover:text-foreground bg-[#f6f6f7] hover:bg-slate-100 border border-slate-100 shadow-none"
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Buscar...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md px-1.5 font-mono text-[10px] font-medium bg-white text-muted-foreground">
            <Command className="h-3 w-3" />K
          </kbd>
        </Button>

        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={open}
          className="md:hidden text-muted-foreground hover:text-foreground"
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
