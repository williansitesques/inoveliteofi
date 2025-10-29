import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/store/useStore';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Package, 
  TrendingUp, 
  Users, 
  Calendar as CalendarIcon,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { format, differenceInHours, isPast, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMobile } from '@/hooks/use-mobile';

export default function Dashboard() {
  const isMobile = useMobile();
  const { pedidos, ops, loading } = useStore();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [periodFilter, setPeriodFilter] = useState('30');

  // Memoizar os pedidos filtrados para melhor performance
  const filteredPedidos = useMemo(() => pedidos.filter(pedido => {
    const pedidoDate = new Date(pedido.createdAt);
    return isWithinInterval(pedidoDate, {
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to)
    });
  }), [pedidos, dateRange]);

  const activeOrders = filteredPedidos.filter((p) => p.status !== 'Entregue').length;
  const activeOps = ops.filter((op) => op.publicada).length;
  
  const runningStages = ops
    .flatMap((op) => op.items?.flatMap(item => item.stages) || [])
    .filter((s) => s.status === 'Em Execução').length;

  const finishedLast7Days = pedidos.filter((p) => {
    if (p.status !== 'Concluído' && p.status !== 'Entregue') return false;
    const updatedDate = new Date(p.updatedAt);
    return updatedDate >= subDays(new Date(), 7);
  }).length;

  const overdueOps = ops.filter((op) => {
    if (!op.publicada) return false;
    const sla = new Date(op.slaISO);
    return isPast(sla);
  });

  const soonDueOps = ops.filter((op) => {
    if (!op.publicada) return false;
    const sla = new Date(op.slaISO);
    const hoursLeft = differenceInHours(sla, new Date());
    return hoursLeft > 0 && hoursLeft <= 24;
  });

  const thirdPartyStages = ops
    .flatMap((op) => op.items?.flatMap(item => item.stages) || [])
    .filter((s) => s.kind === 'Terceirizada' && s.status !== 'Pronto').length;

  const stats = [
    {
      title: 'Pedidos Ativos',
      value: activeOrders,
      icon: Package,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'OPs Ativas',
      value: activeOps,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Em Execução',
      value: runningStages,
      icon: TrendingUp,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Finalizados (7 dias)',
      value: finishedLast7Days,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Atrasados',
      value: overdueOps.length,
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'Em Terceirização',
      value: thirdPartyStages,
      icon: Clock,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema de produção</p>
        </div>
        
        <div className={`flex ${isMobile ? 'flex-col' : ''} items-center gap-4`}>
          <Select value={periodFilter} onValueChange={(value) => {
            setPeriodFilter(value);
            const today = new Date();
            const days = parseInt(value);
            setDateRange({
              from: subDays(today, days),
              to: today
            });
          }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 180 dias</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>Período Personalizado</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range: any) => range && setDateRange(range)}
                locale={ptBR}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <TooltipProvider key={stat.title}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    )}
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>Visualizar detalhes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Overdue */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              OPs Atrasadas
            </CardTitle>
            <CardDescription>SLA ultrapassado</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-[72px] w-full" />
                <Skeleton className="h-[72px] w-full" />
              </div>
            ) : overdueOps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma OP atrasada</p>
            ) : (
              <div className="space-y-2">
                {overdueOps.map((op) => {
                  const hoursOverdue = Math.abs(differenceInHours(new Date(op.slaISO), new Date()));
                  return (
                    <div
                      key={op.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div>
                        <p className="font-medium">{op.id}</p>
                        <p className="text-sm text-muted-foreground">{op.clientName}</p>
                      </div>
                      <Badge variant="destructive">{hoursOverdue}h atrasado</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Soon Due */}
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <Clock className="h-5 w-5" />
              Próximas a Vencer
            </CardTitle>
            <CardDescription>SLA ≤ 24 horas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-[72px] w-full" />
                <Skeleton className="h-[72px] w-full" />
              </div>
            ) : soonDueOps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma OP próxima do vencimento</p>
            ) : (
              <div className="space-y-2">
                {soonDueOps.map((op) => {
                  const hoursLeft = differenceInHours(new Date(op.slaISO), new Date());
                  return (
                    <div
                      key={op.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
                    >
                      <div>
                        <p className="font-medium">{op.id}</p>
                        <p className="text-sm text-muted-foreground">{op.clientName}</p>
                      </div>
                      <Badge className="bg-warning text-warning-foreground">{hoursLeft}h restantes</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
            <CardDescription>Status dos pedidos no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-[40px] w-full" />
                <Skeleton className="h-[40px] w-full" />
                <Skeleton className="h-[40px] w-full" />
                <Skeleton className="h-[40px] w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {['Pré-produção', 'Em Produção', 'Concluído', 'Entregue'].map(status => {
                  const count = filteredPedidos.filter(p => p.status === status).length;
                  const percentage = (count / filteredPedidos.length) * 100 || 0;
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{status}</span>
                        <span className="text-sm text-muted-foreground">{count} pedidos</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
            <CardDescription>Últimos pedidos criados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-[72px] w-full" />
                <Skeleton className="h-[72px] w-full" />
                <Skeleton className="h-[72px] w-full" />
                <Skeleton className="h-[72px] w-full" />
                <Skeleton className="h-[72px] w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPedidos
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map(pedido => {
                    const totalPecas = pedido.items.reduce(
                      (sum, item) => sum + Object.values(item.grade).reduce((s, qty) => s + (qty || 0), 0),
                      0
                    );
                    
                    return (
                      <div
                        key={pedido.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                      >
                        <div>
                          <p className="font-medium">{pedido.id}</p>
                          <p className="text-sm text-muted-foreground">{pedido.clientName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{pedido.status}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {totalPecas} {totalPecas === 1 ? 'peça' : 'peças'}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Taxa de Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[64px] w-full" />
            ) : (
              <div className="space-y-2">
                {(() => {
                  const concluded = filteredPedidos.filter(p => p.status === 'Concluído' || p.status === 'Entregue').length;
                  const total = filteredPedidos.length;
                  const rate = (concluded / total) * 100 || 0;
                  const prevRate = 75; // Taxa anterior (mock)
                  const improvement = rate - prevRate;

                  return (
                    <>
                      <p className="text-3xl font-bold">{rate.toFixed(1)}%</p>
                      <div className="flex items-center gap-2">
                        {improvement > 0 ? (
                          <div className="flex items-center text-success">
                            <ArrowUpRight className="h-4 w-4" />
                            <span className="text-sm">+{improvement.toFixed(1)}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-destructive">
                            <ArrowDownRight className="h-4 w-4" />
                            <span className="text-sm">{improvement.toFixed(1)}%</span>
                          </div>
                        )}
                        <span className="text-sm text-muted-foreground">vs. período anterior</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Tempo Médio de Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const completedOrders = filteredPedidos.filter(
                  p => p.status === 'Concluído' || p.status === 'Entregue'
                );
                const avgHours = completedOrders.reduce((sum, p) => {
                  const start = new Date(p.createdAt);
                  const end = new Date(p.updatedAt);
                  return sum + differenceInHours(end, start);
                }, 0) / completedOrders.length || 0;

                return (
                  <>
                    <p className="text-3xl font-bold">{Math.round(avgHours)}h</p>
                    <p className="text-sm text-muted-foreground">
                      Baseado em {completedOrders.length} pedidos concluídos
                    </p>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Taxa de Atraso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[64px] w-full" />
            ) : (
              <div className="space-y-2">
                {(() => {
                  const delayed = ops.filter(op => {
                    const sla = new Date(op.slaISO);
                    return isPast(sla);
                  }).length;
                  const total = ops.length;
                  const rate = (delayed / total) * 100 || 0;

                  return (
                    <>
                      <p className="text-3xl font-bold">{rate.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">
                        {delayed} OPs atrasadas de um total de {total}
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

