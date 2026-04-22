import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <Button onClick={() => navigate("/comercial/pipeline")} className="gap-2">
        <Plus className="h-4 w-4" />
        Criar cliente
      </Button>
    </div>
  );
}
