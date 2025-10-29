import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Pause, CheckCircle, Clock, AlertTriangle, RotateCcw, CheckSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import type { StageStatus } from '@/store/types';

interface StageItemCard {
  opId: string;
  orderId: string;
  stageId: string;
  itemId: string;
  stageName: string;
  stageKind: 'Interna' | 'Terceirizada';
  productName: string;
  productRef: string;
  colorName: string;
  productType: 'Uniforme' | 'Brinde';
  plannedDurationMin?: number;
  slaISO: string;
  status: StageStatus;
  cron: { running: boolean; startedAt?: number; totalMs: number };
  plannedBySize?: Partial<Record<string, number>>;
  producedBySize?: Partial<Record<string, number>>;
  checklist: Array<{ id: string; text: string; done: boolean }>;
}

export default function Kanban() {
  const { ops, pedidos, produtos, moveStage, startTimer, pauseTimer, toggleChecklist, renameChecklistItem, addChecklistItem, removeChecklistItem, archiveOrder, loading } = useStore() as any;
  const [filter, setFilter] = useState('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [activeCard, setActiveCard] = useState<StageItemCard | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false); // deprecated
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checklistQuery, setChecklistQuery] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [, setTick] = useState(0);
  const [draggedCard, setDraggedCard] = useState<StageItemCard | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const publishedOps = ops.filter((op) => op.publicada);

  // Build cards a partir de op.items (por pedido → por item)
  const allCards: StageItemCard[] = [];
  publishedOps.forEach((op) => {
    const order = pedidos.find((p) => p.id === op.orderId);
    if (!order) return;
    const items: any[] = (op as any).items || [];
    items.forEach((item) => {
      (item.stages || []).forEach((stage: any) => {
        const produto = produtos.find((p) => p.name === item.productName || p.ref === item.productRef);
        const status = stage.status || 'A Fazer';
        const cron = stage.cron || { running: false, totalMs: 0 };
        allCards.push({
          opId: op.id,
          orderId: op.orderId,
          stageId: stage.id,
          itemId: item.id,
          stageName: stage.name || 'Etapa',
          stageKind: stage.kind || 'Interna',
          productName: item.productName || 'Produto',
          productRef: produto?.ref || item.productRef || '',
          colorName: item.colorName || 'Cor',
          productType: produto?.type || 'Uniforme',
          plannedDurationMin: stage.plannedDurationMin,
          slaISO: op.slaISO,
          status,
          cron,
          plannedBySize: item.qtyBySize,
          producedBySize: stage.producedBySize || {},
          checklist: stage.checklist || [],
        });
      });
    });
  });

  // Filter cards
  const filteredCards = allCards.filter((card) => {
    const matchesFilter =
      !filter ||
      card.orderId.toLowerCase().includes(filter.toLowerCase()) ||
      pedidos.find((p) => p.id === card.orderId)?.clientName.toLowerCase().includes(filter.toLowerCase()) ||
      card.stageName.toLowerCase().includes(filter.toLowerCase()) ||
      card.productName.toLowerCase().includes(filter.toLowerCase()) ||
      card.colorName.toLowerCase().includes(filter.toLowerCase());

    const isOverdue = new Date(card.slaISO) < new Date();
    const matchesOverdue = !showOverdueOnly || isOverdue;

    return matchesFilter && matchesOverdue;
  });

  // Group by order
  const orderIds = Array.from(new Set(filteredCards.map((c) => c.orderId)));
  const [openOrders, setOpenOrders] = useState<Record<string, boolean>>({});
  const toggleOrder = (orderId: string) =>
    setOpenOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));

  const getSLADays = (slaISO: string) => {
    const days = Math.ceil((new Date(slaISO).getTime() - Date.now()) / 86400000);
    if (days >= 1) return { label: `D-${days}`, color: days > 3 ? 'bg-success' : days === 3 ? 'bg-warning' : 'bg-warning/70' };
    return { label: `D+${Math.abs(days)}`, color: 'bg-destructive' };
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const formatCron = (cron: { running: boolean; startedAt?: number; totalMs: number }) => {
    let ms = cron.totalMs;
    if (cron.running && cron.startedAt) {
      ms += Date.now() - cron.startedAt;
    }
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const timeLeft = (deadlineISO?: string) => {
    if (!deadlineISO) return null;
    const diff = new Date(deadlineISO).getTime() - Date.now();
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    const s = Math.floor((abs % 60000) / 1000);
    const label = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    return { diff, label };
  };

  const timeLeftHuman = (iso?: string) => {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    const abs = Math.abs(diff);
    const days = Math.floor(abs / 86400000);
    const hours = Math.floor((abs % 86400000) / 3600000);
    const minutes = Math.floor((abs % 3600000) / 60000);
    const seconds = Math.floor((abs % 60000) / 1000);
    const core = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
    const label = days > 0 ? `${days}d ${core}` : core;
    return { diff, label };
  };

  const timeBadgeClass = (deadlineISO?: string) => {
    if (!deadlineISO) return '';
    const diff = new Date(deadlineISO).getTime() - Date.now();
    if (diff <= 0) return 'bg-destructive text-white';
    const total = new Date(deadlineISO).getTime() - (Date.now() - 24*3600000); // heurística, evita NaN
    const ratio = total ? diff / total : 1;
    const minutesLeft = diff / 60000;
    if (minutesLeft <= 15 || ratio < 0.1) return 'bg-destructive text-white';
    if (minutesLeft <= 60 || ratio < 0.25) return 'bg-amber-500 text-white';
    return 'bg-emerald-500 text-white';
  };

  const formatSummary = (planned?: Partial<Record<string, number>>, produced?: Partial<Record<string, number>>, type?: string) => {
    if (type === 'Brinde') {
      const p = Object.values(planned || {}).reduce((a, b) => a + b, 0);
      const pr = Object.values(produced || {}).reduce((a, b) => a + b, 0);
      return `Unitário ${p} / ${pr}`;
    }
    const sizes = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'G5'];
    return sizes
      .filter((s) => (planned?.[s] || 0) > 0)
      .map((s) => `${s} ${planned?.[s] || 0}/${produced?.[s] || 0}`)
      .join(' • ');
  };

  const handleDragStart = (event: DragStartEvent) => {
    const [orderId, stageId, itemId] = (event.active.id as string).split('::');
    const card = filteredCards.find((c) => c.orderId === orderId && c.stageId === stageId && c.itemId === itemId);
    setDraggedCard(card || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedCard(null);
    if (!over) return;

    const [orderId, stageId, itemId] = (active.id as string).split('::');
    const overId = over.id as string;
    // Novo formato de lane: orderId::itemId::lane::status
    if (!overId.includes('::lane::')) return;
    const [targetOrderId, targetItemId, , targetStatus] = overId.split('::');

    if (orderId !== targetOrderId || itemId !== targetItemId) {
      toast.error('Não é possível mover entre pedidos');
      return;
    }

    const newStatus = targetStatus as StageStatus;
    const card = filteredCards.find((c) => c.orderId === orderId && c.stageId === stageId && c.itemId === itemId);
    if (!card || card.status === newStatus) return;

    moveStage(card.opId, stageId, newStatus, itemId);
    toast.success('Etapa movida!');
  };

  const handleStart = (card: StageItemCard) => {
    startTimer(card.opId, card.stageId, card.itemId);
    moveStage(card.opId, card.stageId, 'Em Execução', card.itemId);
    toast.success('Iniciado!');
  };

  const handlePause = (card: StageItemCard) => {
    pauseTimer(card.opId, card.stageId, card.itemId);
    toast.success('Pausado!');
  };

  const handleResume = (card: StageItemCard) => {
    startTimer(card.opId, card.stageId, card.itemId);
    toast.success('Retomado!');
  };

  const handleConclude = (card: StageItemCard) => {
    const pending = card.checklist.filter((i) => !i.done).length;
    if (pending > 0) {
      toast.error('Finalize o checklist antes de concluir');
      return;
    }
    pauseTimer(card.opId, card.stageId, card.itemId);
    moveStage(card.opId, card.stageId, 'Finalizado', card.itemId);
    toast.success('Concluído!');
  };

  const lanes: StageStatus[] = ['A Fazer', 'Em Execução', 'Finalizado'];

  const DroppableLane = ({ orderId, itemId, status, children }: { orderId: string; itemId: string; status: StageStatus; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `${orderId}::${itemId}::lane::${status}`,
    });

    return (
      <div
        ref={setNodeRef}
        className={`min-h-[200px] p-4 rounded-lg border-2 transition-all ${
          isOver 
            ? 'bg-primary/5 border-primary' 
            : 'bg-card border-border'
        }`}
      >
        <h3 className="font-semibold text-sm text-foreground mb-3">{status}</h3>
        <div className="space-y-3">{children}</div>
      </div>
    );
  };

  const DraggableCard = ({ card }: { card: StageItemCard }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: `${card.orderId}::${card.stageId}::${card.itemId}`,
    });

    const style = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          opacity: isDragging ? 0.5 : 1,
        }
      : undefined;

    return (
      <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
        {renderCard(card)}
      </div>
    );
  };

  const renderCard = (card: StageItemCard) => {
    const sla = getSLADays(card.slaISO);
    const checkedCount = card.checklist.filter((i) => i.done).length;
    const totalCount = card.checklist.length;
    const left = timeLeft((card as any).deadlineISO);
    const leftClass = timeBadgeClass((card as any).deadlineISO);
    const slaLeft = timeLeftHuman(card.slaISO);
    
    // Botões baseados no estado do cronômetro
    const showInitiar = !card.cron.running && card.cron.totalMs === 0;
    const showPausar = card.cron.running;
    const showRetomar = !card.cron.running && card.cron.totalMs > 0 && card.status !== 'Finalizado';

    return (
      <Card
        key={`${card.orderId}::${card.stageId}::${card.itemId}`}
        id={`${card.orderId}::${card.stageId}::${card.itemId}`}
        className="cursor-pointer hover:shadow-lg transition-shadow bg-card border-border"
        onClick={() => {
          // Abrir configuração no Planner com item/stage via querystring
          window.location.href = `/ops/${card.opId}/planner?item=${encodeURIComponent(card.itemId)}&stage=${encodeURIComponent(card.stageId)}`;
        }}
      >
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{card.stageName}</span>
            <Badge variant={card.stageKind === 'Interna' ? 'default' : 'secondary'} className="text-xs">
              {card.stageKind}
            </Badge>
            <Badge variant={card.productType === 'Uniforme' ? 'outline' : 'default'} className="text-xs">
              {card.productType}
            </Badge>
          </div>

          <p className="text-sm text-foreground/70">
            {card.productName} • {card.colorName} ({card.productRef})
          </p>

          <div className="flex items-center gap-3 text-sm text-foreground">
            <div className="flex items-center gap-1 font-mono font-semibold">
              <Clock className="h-4 w-4" />
              <span>{formatCron(card.cron)}</span>
            </div>
            {card.plannedDurationMin && (
              <div className="flex items-center gap-1 text-foreground/70">
                <span>Prev: {formatDuration(card.plannedDurationMin)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`${sla.color} text-white`}>{sla.label}</Badge>
            <Badge variant="outline">
              Entrega: {new Date(card.slaISO).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </Badge>
            {slaLeft && (
              <Badge variant={slaLeft.diff >= 0 ? 'outline' : 'default'} className={slaLeft.diff < 0 ? 'bg-destructive text-white' : ''}>
                {slaLeft.diff >= 0 ? slaLeft.label : `+${slaLeft.label}`}
              </Badge>
            )}
            {left && (
              <Badge className={`${leftClass}`}>{left.diff >= 0 ? `T- ${left.label}` : `T+ ${left.label}`}</Badge>
            )}
          </div>

          <p className="text-xs text-foreground/70">{formatSummary(card.plannedBySize, card.producedBySize, card.productType)}</p>

          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              setActiveCard(card);
              setChecklistQuery('');
              setDialogOpen(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <CheckSquare className="h-4 w-4 mr-2" /> Checklist: {checkedCount}/{totalCount}
          </Button>

          <div className="flex gap-2 flex-wrap">
            {showInitiar && (
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStart(card);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Play className="h-4 w-4 mr-1" />
                Iniciar
              </Button>
            )}
            {showPausar && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePause(card);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pausar
              </Button>
            )}
            {showRetomar && (
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResume(card);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Retomar
              </Button>
            )}
            {card.status !== 'Finalizado' && (
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConclude(card);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Concluir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const aFazerCount = filteredCards.filter((c) => c.status === 'A Fazer').length;
  const emExecuçãoCount = filteredCards.filter((c) => c.status === 'Em Execução').length;
  const finalizadoCount = filteredCards.filter((c) => c.status === 'Finalizado').length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Painel de Produção</h1>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <Input 
          placeholder="Buscar por PED, Cliente, Etapa, Produto, Cor..." 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)} 
          className="max-w-md" 
          disabled={loading}
        />
        <Button 
          variant={showOverdueOnly ? 'default' : 'outline'} 
          onClick={() => setShowOverdueOnly(!showOverdueOnly)}
          disabled={loading}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Atrasados
        </Button>
        <Button 
          variant="outline" 
          onClick={() => (window.location.href = '/kanban/arquivados')}
          disabled={loading}
        >
          Arquivados
        </Button>
        <div className="flex gap-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-6 w-24" />
            ))
          ) : (
            <>
              <Badge variant="outline">A Fazer: {aFazerCount}</Badge>
              <Badge variant="outline">Em Execução: {emExecuçãoCount}</Badge>
              <Badge variant="outline">Finalizado: {finalizadoCount}</Badge>
            </>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-8 pb-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-48" />
                      <div className="ml-auto flex items-center gap-2">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-9 w-24" />
                      </div>
                    </CardTitle>
                  </CardHeader>
                </Card>
                <div className="grid grid-cols-3 gap-4">
                  {Array(3).fill(0).map((_, j) => (
                    <div key={j} className="min-h-[200px] p-4 rounded-lg bg-card border-2 border-border">
                      <Skeleton className="h-4 w-24 mb-3" />
                      <div className="space-y-3">
                        <Skeleton className="h-[180px] w-full" />
                        <Skeleton className="h-[180px] w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            orderIds.map((orderId) => {
              const order = pedidos.find((p) => p.id === orderId && !p.archived);
              if (!order) return null;

              const orderCards = filteredCards.filter((c) => c.orderId === orderId);
              const sla = getSLADays(order.slaISO);
              const isOpen = openOrders[orderId] ?? true;

              // Contagem de risco (amarelo) e atraso (vermelho) por pedido
              const riskCount = orderCards.filter((c) => {
                const dl = (c as any).deadlineISO as string | undefined;
                if (!dl) return false;
                const diff = new Date(dl).getTime() - Date.now();
                if (diff <= 0) return false;
                const minutesLeft = diff / 60000;
                const totalHeur = (24 * 60 + minutesLeft); // heurística simples
                const ratio = totalHeur ? minutesLeft / totalHeur : 1;
                return minutesLeft <= 60 || ratio < 0.25;
              }).length;
              const lateCount = orderCards.filter((c) => {
                const dl = (c as any).deadlineISO as string | undefined;
                if (!dl) return false;
                return new Date(dl).getTime() - Date.now() <= 0;
              }).length;

              return (
                <div key={orderId} className="w-full space-y-4">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleOrder(orderId)}>
                      <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                        <span>{orderId}</span>
                        <span>•</span>
                        <span className="text-base font-normal">{order.clientName}</span>
                        <div className="ml-auto flex items-center gap-2">
                          <Badge variant="outline" className="border-amber-500 text-amber-600">Em risco: {riskCount}</Badge>
                          <Badge variant="outline" className="border-destructive text-destructive">Atrasadas: {lateCount}</Badge>
                          <Badge className={`${sla.color} text-white`}>{sla.label}</Badge>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); archiveOrder(orderId); }}>Arquivar</Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  {isOpen && (
                    <div className="space-y-6">
                      {Array.from(new Map(orderCards.map((c) => [c.itemId, c])).values()).map((firstCardOfItem, idx) => {
                        const itemId = firstCardOfItem.itemId;
                        const itemCards = orderCards.filter((c) => c.itemId === itemId);
                        const anyCard = itemCards[0];
                        const qty = anyCard?.plannedBySize ? Object.values(anyCard.plannedBySize).reduce((a, b) => a + (b || 0), 0) : undefined;
                        return (
                          <div key={itemId} className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-foreground/80">
                              <span className="font-semibold">Item {idx + 1}</span>
                              <span>— {anyCard.productName} • {anyCard.colorName}</span>
                              {typeof qty === 'number' && <Badge variant="outline" className="ml-2">{qty} pçs</Badge>}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              {lanes.map((lane) => (
                                <DroppableLane key={lane} orderId={orderId} itemId={itemId} status={lane}>
                                  {itemCards
                                    .filter((c) => c.status === lane)
                                    .map((card) => (
                                      <DraggableCard key={`${card.orderId}::${card.stageId}::${card.itemId}`} card={card} />
                                    ))}
                                </DroppableLane>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DragOverlay>{draggedCard && renderCard(draggedCard)}</DragOverlay>
      </DndContext>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Checklist {activeCard ? `— ${activeCard.stageName}` : ''}
            </DialogTitle>
          </DialogHeader>
          {activeCard && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {/* Progresso derivado do estado atual do store */}
                  {(() => {
                    const op = ops.find((o: any) => o.id === activeCard.opId);
                    const it = op?.items?.find((i: any) => i.id === activeCard.itemId);
                    const st = it?.stages?.find((s: any) => s.id === activeCard.stageId);
                    const list = st?.checklist || [];
                    return `Progresso: ${list.filter((i: any) => i.done).length}/${list.length}`;
                  })()}
                </div>
                <div className="text-sm font-mono">{formatCron(activeCard.cron)}</div>
              </div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                placeholder="Buscar no checklist..."
                value={checklistQuery}
                onChange={(e) => setChecklistQuery(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-md border px-3 py-2 text-sm bg-background"
                  placeholder="Novo item do checklist"
                  value={editingItemId === '__new__' ? editingText : ''}
                  onChange={(e) => {
                    setEditingItemId('__new__');
                    setEditingText(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editingText.trim()) {
                      addChecklistItem(activeCard.opId, activeCard.stageId, editingText, activeCard.itemId);
                      setEditingItemId(null);
                      setEditingText('');
                    }
                    if (e.key === 'Escape') {
                      setEditingItemId(null);
                      setEditingText('');
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (editingText.trim()) {
                      addChecklistItem(activeCard.opId, activeCard.stageId, editingText, activeCard.itemId);
                      setEditingItemId(null);
                      setEditingText('');
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                {(() => {
                  const op = ops.find((o: any) => o.id === activeCard.opId);
                  const it = op?.items?.find((i: any) => i.id === activeCard.itemId);
                  const st = it?.stages?.find((s: any) => s.id === activeCard.stageId);
                  const list = st?.checklist || [];
                  return list;
                })()
                  .filter((i) => !checklistQuery || i.text.toLowerCase().includes(checklistQuery.toLowerCase()))
                  .map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={() => toggleChecklist(activeCard.opId, activeCard.stageId, item.id, activeCard.itemId)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {editingItemId === item.id ? (
                        <input
                          className="flex-1 rounded-md border px-2 py-1 text-sm bg-background"
                          value={editingText}
                          autoFocus
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingText.trim()) renameChecklistItem(activeCard.opId, activeCard.stageId, item.id, editingText);
                              setEditingItemId(null);
                            }
                            if (e.key === 'Escape') {
                              setEditingItemId(null);
                            }
                          }}
                          onBlur={() => {
                            if (editingText.trim()) renameChecklistItem(activeCard.opId, activeCard.stageId, item.id, editingText);
                            setEditingItemId(null);
                          }}
                        />
                      ) : (
                        <span
                          className={`flex-1 ${item.done ? 'line-through text-muted-foreground' : ''}`}
                          onDoubleClick={() => {
                            setEditingItemId(item.id);
                            setEditingText(item.text);
                          }}
                        >
                          {item.text}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeChecklistItem(activeCard.opId, activeCard.stageId, item.id);
                        }}
                        className="ml-auto text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
          <DialogFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!activeCard) return;
                  activeCard.checklist.forEach((i) => {
                    if (!i.done) toggleChecklist(activeCard.opId, activeCard.stageId, i.id, activeCard.itemId);
                  });
                }}
              >
                Marcar tudo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!activeCard) return;
                  activeCard.checklist.forEach((i) => {
                    if (i.done) toggleChecklist(activeCard.opId, activeCard.stageId, i.id, activeCard.itemId);
                  });
                }}
              >
                Limpar
              </Button>
            </div>
            <Button type="button" onClick={() => setDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

