import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eye,
  FileText,
  BrainCircuit,
  LogOut,
  Shield,
  Target,
  TrendingUp,
  UserCircle,
  Zap,
} from 'lucide-react';

interface SubNavItem {
  label: string;
  href: string;
  icon?: React.ElementType;
  iconColor?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  iconColor?: string;
  subItems?: SubNavItem[];
}

const comercialNav: NavItem[] = [
  {
    label: 'Dashboard Comercial',
    href: '/comercial/dashboards',
    icon: BarChart3,
    iconColor: 'text-blue-500',
    subItems: [
      { label: 'Visão Geral', href: '/comercial/dashboards', icon: TrendingUp, iconColor: 'text-blue-500' },
      { label: 'Metas', href: '/comercial/metas', icon: Target, iconColor: 'text-rose-500' },
      { label: 'Relatórios', href: '/comercial/relatorios', icon: FileText, iconColor: 'text-slate-500' },
    ],
  },
  {
    label: 'Agendamentos',
    href: '/comercial/agenda-great',
    icon: CalendarDays,
    iconColor: 'text-purple-500',
    subItems: [
      { label: 'Agenda Great', href: '/comercial/agenda-great', icon: CalendarDays, iconColor: 'text-purple-500' },
      { label: 'Meta de Agendamentos', href: '/comercial/meta-agendamentos', icon: Target, iconColor: 'text-rose-500' },
      { label: 'CRM', href: '/comercial/pipeline', icon: Briefcase, iconColor: 'text-violet-500' },
    ],
  },
  {
    label: 'Raio X',
    href: '/comercial/raio-x-closer',
    icon: Eye,
    iconColor: 'text-rose-500',
    subItems: [
      { label: 'Closer', href: '/comercial/raio-x-closer', icon: Crosshair, iconColor: 'text-rose-500' },
      { label: 'Pre venda', href: '/comercial/pre-venda', icon: Zap, iconColor: 'text-indigo-500' },
    ],
  },
  { label: 'Inteligencia Operacional', href: '/comercial/inteligencia-operacional', icon: BrainCircuit, iconColor: 'text-emerald-500' },
  { label: 'Proje\u00e7\u00e3o', href: '/comercial/projecao', icon: Calculator, iconColor: 'text-cyan-500' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const isSubItemActive = (item: NavItem) =>
    item.subItems?.some((sub) => location.pathname === sub.href) ?? false;

  const isMenuOpen = (item: NavItem) => {
    if (openSubMenus[item.label] !== undefined) {
      return openSubMenus[item.label];
    }

    return isSubItemActive(item);
  };

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/5 transition-all duration-300',
        'bg-gradient-to-b from-[#0a1020] via-[#0b101b] to-[#090d16] text-white/70 shadow-[0_24px_80px_rgba(0,0,0,0.30)]',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      <div
        className={cn(
          'flex h-16 items-center border-b border-white/5 px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {collapsed ? <Logo variant="mark" size="md" theme="dark" /> : <Logo variant="full" size="md" theme="dark" />}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'text-white/50 hover:bg-white/10 hover:text-white',
            collapsed && 'absolute -right-3 rounded-full border border-white/10 bg-[#0b101b] text-white/70'
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5 custom-scrollbar">
        {comercialNav.map((item) => {
          const isActive = location.pathname === item.href && !item.subItems;
          const hasSubItems = Boolean(item.subItems?.length);
          const isOpen = isMenuOpen(item);
          const Icon = item.icon;

          if (hasSubItems && !collapsed) {
            return (
              <Collapsible
                key={item.label}
                open={isOpen}
                onOpenChange={() => toggleSubMenu(item.label)}
              >
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    'relative flex w-full items-center gap-3 overflow-hidden rounded-[16px] px-3 py-3 transition-all duration-200 group',
                    isSubItemActive(item)
                      ? 'bg-[#EA1010] text-white shadow-[0_10px_24px_rgba(255,0,0,0.30)]'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {isSubItemActive(item) && (
                    <span className="absolute left-0 top-0 h-full w-1 bg-[#FF3B3B]" />
                  )}
                  <Icon className={cn('h-5 w-5 shrink-0', isSubItemActive(item) ? 'text-white' : 'text-[#FF3B3B]')} />
                  <span className="flex-1 truncate text-left text-[13px] font-semibold">{item.label}</span>
                  <ChevronDown className={cn('h-4 w-4 text-white/35 transition-transform', isOpen && 'rotate-180')} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 pl-3">
                {item.subItems!.map((subItem) => {
                    const isSubActive = location.pathname === subItem.href;
                    const SubIcon = subItem.icon;

                    return (
                      <Link
                        key={subItem.href}
                        to={subItem.href}
                        className={cn(
                          'relative flex items-center gap-3 overflow-hidden rounded-[14px] px-3 py-2.5 text-[13px] transition-all duration-200',
                          isSubActive
                            ? 'bg-[#2A0F16] text-white font-semibold shadow-[inset_0_0_0_1px_rgba(255,59,59,0.15)]'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        {isSubActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#FF3B3B] rounded-r-full" />
                        )}
                        {SubIcon && <SubIcon className={cn('h-4 w-4 shrink-0', isSubActive ? 'text-[#FF3B3B]' : 'text-[#FF3B3B]/75')} />}
                        <span className="truncate">{subItem.label}</span>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'relative flex items-center gap-3 overflow-hidden rounded-[16px] px-3 py-3 transition-all duration-200 group',
                isActive
                  ? 'bg-[#EA1010] text-white font-semibold shadow-[0_10px_24px_rgba(255,0,0,0.30)]'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-0 h-full w-1 bg-[#FF3B3B]" />
              )}
              <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-[#FF3B3B]', collapsed && 'mx-auto')} />
              {!collapsed && <span className="truncate text-[13px] font-semibold">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          'border-t border-white/5 p-4',
          collapsed ? 'flex flex-col items-center gap-2' : ''
        )}
      >
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
              {isAdmin ? (
                <Shield className="h-4 w-4 text-[#FF3B3B]" />
              ) : (
                <UserCircle className="h-4 w-4 text-[#FF3B3B]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-white/50 truncate">Setor comercial</p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={logout}
          className={cn(
            'w-full text-white/70 hover:text-white hover:bg-[rgba(255,59,59,0.10)]',
            collapsed ? 'justify-center' : 'justify-start gap-2 h-9'
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}

