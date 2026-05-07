import React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('App crashed:', error);
    this.setState({ message: error.message || 'Erro desconhecido' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <h1 className="text-2xl font-bold text-foreground">Algo não carregou como esperado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A plataforma encontrou um erro ao abrir esta área. Atualize a página para tentar novamente.
            </p>
            {this.state.message && (
              <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
                  Detalhe do erro
                </p>
                <p className="mt-1 text-xs text-muted-foreground break-words">
                  {this.state.message}
                </p>
              </div>
            )}
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
