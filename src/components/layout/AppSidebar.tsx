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
        'fixed left-0 top-0 z-40 h-screen border-r transition-all duration-300 flex flex-col',
        'bg-white border-slate-100',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      <div
        className={cn(
          'h-16 flex items-center border-b border-slate-100 px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {collapsed ? <Logo variant="mark" size="md" /> : <Logo variant="full" size="md" />}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'text-slate-400 hover:text-slate-900',
            collapsed && 'absolute -right-3 border rounded-full bg-white border-slate-100'
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 py-5 px-4 space-y-1 overflow-y-auto custom-scrollbar">
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
                      'relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group w-full',
                      isSubItemActive(item)
                        ? 'bg-primary text-white shadow-[0_10px_22px_rgba(225,6,0,0.18)]'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 shrink-0', isSubItemActive(item) ? 'text-white' : item.iconColor)} />
                    <span className="text-sm font-semibold truncate flex-1 text-left">{item.label}</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-3 mt-1 space-y-1">
                  {item.subItems!.map((subItem) => {
                    const isSubActive = location.pathname === subItem.href;
                    const SubIcon = subItem.icon;

                    return (
                      <Link
                        key={subItem.href}
                        to={subItem.href}
                        className={cn(
                          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                          isSubActive
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                        )}
                      >
                        {isSubActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                        )}
                        {SubIcon && <SubIcon className={cn('h-4 w-4 shrink-0', subItem.iconColor)} />}
                        <span className="text-sm truncate">{subItem.label}</span>
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
                'relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-primary text-white font-semibold shadow-[0_10px_22px_rgba(225,6,0,0.18)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
              )}
              <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : item.iconColor, collapsed && 'mx-auto')} />
              {!collapsed && <span className="text-sm font-semibold truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          'border-t border-slate-100 p-4',
          collapsed ? 'flex flex-col items-center gap-2' : ''
        )}
      >
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
              {isAdmin ? (
                <Shield className="h-4 w-4 text-primary" />
              ) : (
                <UserCircle className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">Setor comercial</p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={logout}
          className={cn(
            'w-full text-slate-500 hover:text-destructive hover:bg-destructive/10',
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

