import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '@/components/command/CommandPalette';
import { CommandPaletteProvider } from '@/hooks/useCommandPalette';

export function AppLayout() {
  return (
    <CommandPaletteProvider>
      <div className="min-h-screen bg-[#F7F7F9]">
        <AppSidebar />
        <div className="pl-[260px] transition-all duration-300">
          <Topbar />
          <main className="mx-auto w-full max-w-[1500px] px-8 py-7">
            <Outlet />
          </main>
        </div>
        <CommandPalette />
      </div>
    </CommandPaletteProvider>
  );
}
