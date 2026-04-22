import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, Megaphone } from 'lucide-react';

const REUNIAO_STAGES = ['FECHADO', 'PERDIDO', 'NEGOCIACAO', 'TAXA_INTERESSE'];

const STAGE_COLORS: Record<string, string> = {
  FECHADO: '#10b981',
  PERDIDO: '#ef4444',
  NEGOCIACAO: '#f59e0b',
  TAXA_INTERESSE: '#6366f1',
};

const STAGE_LABELS: Record<string, string> = {
  FECHADO: 'Fechado',
  PERDIDO: 'Perdido',
  NEGOCIACAO: 'Negociação',
  TAXA_INTERESSE: 'Taxa de Interesse',
};

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

interface PipelineClient {
  id: string;
  client_name: string;
  stage: string | null;
  criativo: string | null;
  vendedor: string | null;
  entrada: number | null;
  meeting_date: string | null;
  data_entrada: string | null;
  created_at: string;
}

interface DashboardClosersTabProps {
  clients: PipelineClient[];
}

export function DashboardClosersTab({ clients }: DashboardClosersTabProps) {
  // Filter only "reuniões realizadas" stages
  const reunioes = useMemo(() =>
    clients.filter(c => c.stage && REUNIAO_STAGES.includes(c.stage)),
    [clients]
  );

  // Group by criativo
  const criativoData = useMemo(() => {
    const grouped: Record<string, { total: number; fechados: number; perdidos: number; negociacao: number; taxaInteresse: number }> = {};
    reunioes.forEach(c => {
      const key = c.criativo || 'Sem criativo';
      if (!grouped[key]) grouped[key] = { total: 0, fechados: 0, perdidos: 0, negociacao: 0, taxaInteresse: 0 };
      grouped[key].total++;
      if (c.stage === 'FECHADO') grouped[key].fechados++;
      if (c.stage === 'PERDIDO') grouped[key].perdidos++;
      if (c.stage === 'NEGOCIACAO') grouped[key].negociacao++;
      if (c.stage === 'TAXA_INTERESSE') grouped[key].taxaInteresse++;
    });
    return Object.entries(grouped)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [reunioes]);

  // Top 15 for chart
  const chartData = useMemo(() => criativoData.slice(0, 15), [criativoData]);

  // Summary by stage
  const stageSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    REUNIAO_STAGES.forEach(s => { summary[s] = 0; });
    reunioes.forEach(c => {
      if (c.stage) summary[c.stage] = (summary[c.stage] || 0) + 1;
    });
    return summary;
  }, [reunioes]);

  // Group by closer
  const closerCriativoData = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {};
    reunioes.forEach(c => {
      const closer = c.vendedor || 'N/A';
      const criativo = c.criativo || 'Sem criativo';
      if (!grouped[closer]) grouped[closer] = {};
      grouped[closer][criativo] = (grouped[closer][criativo] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([closer, criativos]) => ({
        closer,
        total: Object.values(criativos).reduce((a, b) => a + b, 0),
        criativos: Object.entries(criativos)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.total - a.total);
  }, [reunioes]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {REUNIAO_STAGES.map(stage => (
          <Card key={stage}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{STAGE_LABELS[stage]}</p>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: STAGE_COLORS[stage] }}
                />
              </div>
              <p className="text-2xl font-bold mt-1">{stageSummary[stage] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total */}
      <Card>
        <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total de Reuniões Realizadas</p>
            <p className="text-3xl font-bold">{reunioes.length}</p>
          </div>
          <Badge variant="outline" className="text-sm">
            {criativoData.length} criativos distintos
          </Badge>
        </CardContent>
      </Card>

      {/* Bar Chart - Top criativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Reuniões Realizadas por Criativo (Top 15)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Reuniões realizadas = Fechadas + Perdidas + Em Negociação + Taxa de Interesse
          </p>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum dado disponível para o período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={180}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number, _name: string, props: { payload: typeof chartData[0] }) => {
                    const d = props.payload;
                    return [
                      <div key="tip" className="space-y-0.5">
                        <div>Total: <strong>{d.total}</strong></div>
                        <div className="text-emerald-600">Fechados: {d.fechados}</div>
                        <div className="text-red-500">Perdidos: {d.perdidos}</div>
                        <div className="text-amber-500">Negociação: {d.negociacao}</div>
                        <div className="text-indigo-500">Taxa Int.: {d.taxaInteresse}</div>
                      </div>,
                      '',
                    ];
                  }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Stacked bar chart by stage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Composição por Status (Top 15 Criativos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum dado disponível.</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="fechados" stackId="a" name="Fechados" fill={STAGE_COLORS.FECHADO} />
                <Bar dataKey="perdidos" stackId="a" name="Perdidos" fill={STAGE_COLORS.PERDIDO} />
                <Bar dataKey="negociacao" stackId="a" name="Negociação" fill={STAGE_COLORS.NEGOCIACAO} />
                <Bar dataKey="taxaInteresse" stackId="a" name="Taxa Int." fill={STAGE_COLORS.TAXA_INTERESSE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
            {REUNIAO_STAGES.map(s => (
              <div key={s} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STAGE_COLORS[s] }} />
                {STAGE_LABELS[s]}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table - full ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking Completo por Criativo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Criativo</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Fechados</TableHead>
                <TableHead className="text-center">Perdidos</TableHead>
                <TableHead className="text-center">Negociação</TableHead>
                <TableHead className="text-center">Taxa Int.</TableHead>
                <TableHead className="text-center">% Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criativoData.map(c => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium max-w-[200px] truncate">{c.name}</TableCell>
                  <TableCell className="text-center font-bold">{c.total}</TableCell>
                  <TableCell className="text-center text-emerald-600 font-bold">{c.fechados}</TableCell>
                  <TableCell className="text-center text-red-500">{c.perdidos}</TableCell>
                  <TableCell className="text-center text-amber-500">{c.negociacao}</TableCell>
                  <TableCell className="text-center text-indigo-500">{c.taxaInteresse}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {c.total > 0 ? ((c.fechados / c.total) * 100).toFixed(1) : '0'}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-closer breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {closerCriativoData.map(cd => (
          <Card key={cd.closer}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {cd.closer}
                <Badge variant="outline">{cd.total} reuniões</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {cd.criativos.slice(0, 8).map(c => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[200px] text-muted-foreground">{c.name}</span>
                    <span className="font-bold">{c.count}</span>
                  </div>
                ))}
                {cd.criativos.length > 8 && (
                  <p className="text-xs text-muted-foreground">+{cd.criativos.length - 8} outros</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
