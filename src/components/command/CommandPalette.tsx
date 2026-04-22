import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/brand/Logo";
import {
  BrainCircuit,
  Briefcase,
  Calculator,
  CalendarDays,
  Eye,
  FileText,
  LayoutDashboard,
  Search,
  Target,
  UserPlus,
} from "lucide-react";

interface CommandAction {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
  roles?: string[];
}

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const actions: CommandAction[] = useMemo(
    () => [
      {
        id: "nav-dashboard",
        label: "Ir para Dashboard Comercial",
        icon: LayoutDashboard,
        action: () => navigate("/comercial/dashboards"),
        keywords: ["home", "inicio", "painel", "dashboard"],
      },
      {
        id: "nav-pipeline",
        label: "Ir para Pipeline",
        icon: Briefcase,
        action: () => navigate("/comercial/pipeline"),
        keywords: ["vendas", "negociacao", "kanban", "crm"],
      },
      {
        id: "nav-agenda",
        label: "Ir para Agenda",
        icon: CalendarDays,
        action: () => navigate("/comercial/agenda-great"),
        keywords: ["agenda", "reunioes", "calls"],
      },
      {
        id: "nav-metas",
        label: "Ir para Metas",
        icon: Target,
        action: () => navigate("/comercial/metas"),
        keywords: ["metas", "objetivos"],
      },
      {
        id: "nav-relatorios",
        label: "Ir para Relatorios",
        icon: FileText,
        action: () => navigate("/comercial/relatorios"),
        keywords: ["relatorios", "reports"],
      },
      {
        id: "nav-inteligencia",
        label: "Ir para Inteligencia Operacional",
        icon: BrainCircuit,
        action: () => navigate("/comercial/inteligencia-operacional"),
        keywords: ["inteligencia", "metricas", "operacional"],
      },
      {
        id: "nav-raio-x",
        label: "Ir para Raio X Closer",
        icon: Eye,
        action: () => navigate("/comercial/raio-x-closer"),
        keywords: ["raio x", "closer", "calls"],
      },
      {
        id: "nav-pre-venda",
        label: "Ir para Pre-venda",
        icon: UserPlus,
        action: () => navigate("/comercial/pre-venda"),
        keywords: ["sdr", "pre venda"],
      },
      {
        id: "nav-projecao",
        label: "Ir para Proje\u00e7\u00e3o",
        icon: Calculator,
        action: () => navigate("/comercial/projecao"),
        keywords: ["projecao", "simulacao", "meta"],
      },
      {
        id: "action-create-client",
        label: "Criar novo cliente",
        icon: UserPlus,
        action: () => navigate("/comercial/pipeline"),
        keywords: ["novo", "adicionar", "lead", "cliente"],
      },
    ],
    [navigate],
  );

  const filteredActions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return actions.filter((action) => {
      if (action.roles && user && !action.roles.includes(user.role)) return false;
      if (!query) return true;

      return (
        action.label.toLowerCase().includes(query) ||
        action.keywords?.some((keyword) => keyword.toLowerCase().includes(query))
      );
    });
  }, [actions, search, user]);

  const navigationActions = filteredActions.filter((action) => action.id.startsWith("nav-"));
  const quickActions = filteredActions.filter((action) => action.id.startsWith("action-"));

  const runAction = (action: CommandAction) => {
    action.action();
    close();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Logo variant="mark" size="sm" />
        <span className="text-sm text-muted-foreground">Command Palette</span>
      </div>
      <CommandInput
        placeholder="Buscar acoes comerciais..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6">
            <Search className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
          </div>
        </CommandEmpty>

        {quickActions.length > 0 && (
          <CommandGroup heading="Acoes rapidas">
            {quickActions.map((action) => (
              <CommandItem
                key={action.id}
                onSelect={() => runAction(action)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <action.icon className="h-4 w-4 text-primary" />
                </div>
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {navigationActions.length > 0 && (
          <CommandGroup heading="Navegacao comercial">
            {navigationActions.map((action) => (
              <CommandItem
                key={action.id}
                onSelect={() => runAction(action)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              >
                <action.icon className="h-4 w-4 text-muted-foreground" />
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
