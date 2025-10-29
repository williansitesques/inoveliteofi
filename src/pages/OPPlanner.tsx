import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Plus,
  X,
  GripVertical,
  Save,
  Send,
  ArrowLeft,
  ShoppingCart,
  Scissors,
  Shirt,
  Paintbrush,
  Package2,
  CheckCircle,
  Archive,
  Truck,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Stage } from '@/store/types';
import type { StageStatus } from '@/store/types';

type ItemStages = Record<string, Stage[]>;

const STAGE_TEMPLATES = [
  { name: 'Compras', icon: ShoppingCart },
  { name: 'Corte', icon: Scissors },
  { name: 'Costura', icon: Shirt },
  { name: 'Estamparia', icon: Paintbrush },
  { name: 'Bordado', icon: Paintbrush },
  { name: 'Acabamento', icon: Package2 },
  { name: 'Qualidade', icon: CheckCircle },
  { name: 'Embalagem', icon: Archive },
  { name: 'Expedição', icon: Truck },
];

function SortableStageItem({
  stage,
  index,
  onEdit,
  onRemove,
}: {
  stage: Stage;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: (stage as any).id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-card border rounded-lg hover:shadow-md transition-shadow"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground" />
      </button>

      <div className="flex items-center gap-2 flex-1">
        <Badge variant="outline" className="font-mono">
          {index + 1}
        </Badge>
        <span className="font-medium">{(stage as any).name}</span>
        <Badge variant={(stage as any).kind === 'Interna' ? 'default' : 'secondary'}>
          {(stage as any).kind || 'Interna'}
        </Badge>
        {(stage as any).responsible && (
          <span className="text-sm text-muted-foreground">• {(stage as any).responsible}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="hover:bg-primary/10 hover:text-primary"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          onPointerDown={(e) => e.stopPropagation()}
          className="hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function OPPlanner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    ops,
    pedidos,
    responsaveis,
    updateOP,
    addResponsavel,
  } = useStore();

  const op = ops.find((o) => o.id === id);
  const pedido = pedidos.find((p) => p.id === op?.orderId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [newResponsavel, setNewResponsavel] = useState('');

  // Itens do pedido com id estável por item (produto+cor) e rótulos sem "undefined"
  const orderItems = useMemo(() => {
    if (!pedido) return [] as Array<{ id: string; label: string; totalQty: number; meta: { productName: string; colorName: string } }>;
    return pedido.items.map((orderItem, idx) => {
      const totalQty = Object.values(orderItem.grade || {}).reduce((s: number, q: any) => s + (q || 0), 0);
      const idKey = `${(orderItem as any).ProductId || (orderItem as any).productId}:${(orderItem as any).color}`;

      // Preferências de nomes conforme especificado
      const name = (orderItem as any).productName || (orderItem as any).ProductName || 'Produto';
      const color = (orderItem as any).colorName || (orderItem as any).color || 'Cor';
      const label = `Item ${idx + 1} — ${name} • ${color}`;

      return { id: idKey, label, totalQty, meta: { productName: name, colorName: color } };
    });
  }, [pedido]);

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [itemStages, setItemStages] = useState<ItemStages>({});

  // Migração/Setup local de itemStages + hidratar nomes e totais
  useEffect(() => {
    if (!pedido || !op) return;
    setItemStages((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const persisted: ItemStages | undefined = (op as any).itemStages;
      const initial: ItemStages = persisted ? { ...persisted } : {};
      orderItems.forEach(({ id: itemId }) => {
        if (!initial[itemId]) initial[itemId] = [];
      });
      if (!persisted && (op as any).stages && (op as any).stages.length > 0 && orderItems.length > 0) {
        const firstId = orderItems[0].id;
        if ((initial[firstId] || []).length === 0) initial[firstId] = (op as any).stages;
      }
      // Hidratar OP.items no formato único solicitado
      const items = orderItems.map(({ id, totalQty, meta }) => ({
        id,
        orderItemId: id,
        productName: meta.productName || '',
        colorName: meta.colorName || '',
        totalQty: Number.isFinite(totalQty) ? totalQty : 0,
        stages: initial[id] || [],
      }));
      (updateOP as any) && updateOP(op.id, { ...(op as any), items });
      return initial;
    });
  }, [pedido, op, orderItems]);

  // Item ativo padrão
  useEffect(() => {
    if (activeItemId) return;
    // Selecionar item via querystring se presente
    const sp = new URLSearchParams(window.location.search);
    const qsItem = sp.get('item');
    const qsStage = sp.get('stage');
    if (qsItem && orderItems.find((o) => o.id === qsItem)) {
      setActiveItemId(qsItem);
      // Abrir etapa se existir
      const stages = itemStages[qsItem] || [];
      const st = stages.find((s: any) => s.id === qsStage);
      if (st) {
        setEditingStage(st as any);
        setSheetOpen(true);
      }
      return;
    }
    if (orderItems.length > 0) setActiveItemId(orderItems[0].id);
  }, [orderItems, activeItemId, itemStages]);

  const activeStages = useMemo(() => {
    if (!activeItemId) return [] as Stage[];
    return itemStages[activeItemId] || [];
  }, [itemStages, activeItemId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!op) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4">OP não encontrada</p>
          <Button onClick={() => navigate('/ops')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para OPs
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeItemId) return;
    const list = itemStages[activeItemId] || [];
    const oldIndex = list.findIndex((s) => (s as any).id === active.id);
    const newIndex = list.findIndex((s) => (s as any).id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(list, oldIndex, newIndex);
    setItemStages((prev) => ({ ...prev, [activeItemId]: reordered }));
  };

  const handleAddStage = (name?: string) => {
    const stageName = name || newStageName;
    if (!stageName.trim()) {
      toast.error('Digite o nome da etapa');
      return;
    }
    if (!activeItemId) return;
    const newStage: any = {
      id: Math.random().toString(36).substring(2, 11),
      name: stageName,
      kind: 'Interna',
      status: 'A Fazer',
      cron: { running: false, totalMs: 0 },
      checklist: [],
    };
    setItemStages((prev) => ({
      ...prev,
      [activeItemId]: [...(prev[activeItemId] || []), newStage],
    }));
    // opcional: refletir no store op.items imediatamente
    const items = (op as any).items || [];
    const newItems = items.map((it: any) => (it.id === activeItemId ? { ...it, stages: [...(it.stages || []), newStage] } : it));
    updateOP(op.id, { ...(op as any), items: newItems });
    setNewStageName('');
    toast.success('Etapa adicionada!');
  };

  const handleRemoveStage = (stageId: string) => {
    if (!activeItemId) return;
    setItemStages((prev) => ({
      ...prev,
      [activeItemId]: (prev[activeItemId] || []).filter((s) => (s as any).id !== stageId),
    }));
    const items = (op as any).items || [];
    const newItems = items.map((it: any) => (it.id === activeItemId ? { ...it, stages: (it.stages || []).filter((s: any) => s.id !== stageId) } : it));
    updateOP(op.id, { ...(op as any), items: newItems });
    toast.success('Etapa removida!');
  };

  const handleOpenStageConfig = (stage: Stage) => {
    setEditingStage(stage);
    setSheetOpen(true);
  };

  const handleSaveStageConfig = () => {
    if (!editingStage || !activeItemId) return;
    // Mapear status detalhado para coluna do Kanban
    const mapped = mapStageToStatus(((editingStage as any).status || 'A Fazer') as any);
    const stagePatched = { ...(editingStage as any), status: mapped } as any;
    setItemStages((prev) => ({
      ...prev,
      [activeItemId]: (prev[activeItemId] || []).map((s) =>
        (s as any).id === (editingStage as any).id ? { ...s, ...stagePatched } : s
      ),
    }));
    const items = (op as any).items || [];
    const newItems = items.map((it: any) => (it.id === activeItemId ? { ...it, stages: (it.stages || []).map((s: any) => (s.id === (editingStage as any).id ? { ...s, ...stagePatched } : s)) } : it));
    updateOP(op.id, { ...(op as any), items: newItems });
    setSheetOpen(false);
    setEditingStage(null);
    toast.success('Etapa atualizada!');
  };

  const mapStageToStatus = (s: StageStatus): 'A Fazer' | 'Em Execução' | 'Finalizado' => {
    if (s === 'A Fazer') return 'A Fazer';
    if (s === 'Pronto') return 'Finalizado';
    return 'Em Execução';
  };

  const handleAddChecklist = () => {
    if (!editingStage || !newChecklistItem.trim()) return;
    setNewChecklistItem('');
    const updatedStage = {
      ...(editingStage as any),
      checklist: [
        ...(editingStage as any).checklist,
        { id: Math.random().toString(36).substring(7), text: newChecklistItem, done: false },
      ],
    } as Stage;
    setEditingStage(updatedStage);
    toast.success('Item adicionado!');
  };

  const handleSaveDraft = () => {
    // Persistir dentro de op.items[activeItemId].stages
    const items = (op as any).items || [];
    const newItems = items.map((it: any) => ({ ...it, stages: itemStages[it.id] || [] }));
    updateOP(op.id, { ...(op as any), items: newItems, itemStages });
    toast.success('Rascunho salvo!');
  };

  const handlePublish = () => {
    // Construir sempre os items a partir de orderItems + itemStages
    const builtItems = orderItems.map((o) => ({
      id: o.id,
      orderItemId: o.id,
      productName: o.meta.productName,
      colorName: o.meta.colorName,
      totalQty: o.totalQty,
      stages: itemStages[o.id] || [],
    }));
    const anyStages = builtItems.some((it) => (it.stages || []).length > 0);
    if (!anyStages) {
      toast.error('Adicione pelo menos uma etapa antes de publicar');
      return;
    }
    updateOP(op.id, { ...(op as any), publicada: true, items: builtItems, itemStages });
    toast.success('OP publicada no painel!');
    setTimeout(() => navigate('/kanban'), 300);
  };

  const getTotalPlanejado = () => {
    if (!pedido) return 0;
    return pedido.items.reduce(
      (sum, item) => sum + Object.values(item.grade).reduce((s, qty) => s + (qty || 0), 0),
      0
    );
  };

  const getStageTotal = (stage: any) => {
    const qty = getTotalPlanejado();
    const base = (stage.unitValue || 0) * qty;
    const freight = (stage.freightGo || 0) + (stage.freightBack || 0);
    const unexpected = stage.unexpected || 0;
    return base + freight + unexpected;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/ops')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button onClick={handlePublish}>
            <Send className="h-4 w-4 mr-2" />
            Publicar no Painel
          </Button>
        </div>
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {op.id}
                <span className="mx-2">•</span>
                <span className="text-xl text-muted-foreground">{op.orderId}</span>
                {op.publicada && <Badge className="ml-2">Publicada</Badge>}
              </CardTitle>
              <CardDescription className="mt-2 space-y-1">
                <div>Pedido: {op.orderId}</div>
                <div>Cliente: {op.clientName}</div>
                <div>SLA: {format(new Date(op.slaISO), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</div>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{getTotalPlanejado()} pçs</div>
              <div className="text-sm text-muted-foreground">Quantidade Planejada</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stage Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Construtor de Etapas</CardTitle>
          <CardDescription>Adicione e organize as etapas da produção</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Item */}
          {orderItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {orderItems.map((it) => (
                <Button
                  key={it.id}
                  variant={activeItemId === it.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveItemId(it.id)}
                >
                  {it.label}
                </Button>
              ))}
            </div>
          )}

          {/* Adição Manual */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome da etapa personalizada"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
            />
            <Button onClick={() => handleAddStage()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {/* Templates */}
          <div className="flex flex-wrap gap-2">
            {STAGE_TEMPLATES.map((template) => (
              <Button
                key={template.name}
                variant="outline"
                size="sm"
                onClick={() => handleAddStage(template.name)}
                className="hover:bg-primary/10"
              >
                <template.icon className="h-4 w-4 mr-2" />
                {template.name}
              </Button>
            ))}
          </div>

          {/* Lista de Etapas */}
          {activeStages.length > 0 && (
            <div className="space-y-2 mt-6">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={activeStages.map((s) => (s as any).id)} strategy={verticalListSortingStrategy}>
                  {activeStages.map((stage, index) => (
                    <SortableStageItem
                      key={(stage as any).id}
                      stage={stage}
                      index={index}
                      onEdit={() => handleOpenStageConfig(stage)}
                      onRemove={() => handleRemoveStage((stage as any).id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}

          {activeStages.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma etapa adicionada. Comece adicionando etapas acima.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stage Config Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurar Etapa</SheetTitle>
            <SheetDescription>{(editingStage as any)?.name}</SheetDescription>
          </SheetHeader>

          {editingStage && (
            <div className="grid gap-6 py-6">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select
                  value={(editingStage as any).kind || 'Interna'}
                  onValueChange={(value: 'Interna' | 'Terceirizada') =>
                    setEditingStage({ ...(editingStage as any), kind: value } as Stage)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interna">Interna</SelectItem>
                    <SelectItem value="Terceirizada">Terceirizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Responsável</Label>
                <div className="flex gap-2">
                  <Select
                    value={(editingStage as any).responsible}
                    onValueChange={(value) =>
                      setEditingStage({ ...(editingStage as any), responsible: value } as Stage)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {responsaveis.map((resp) => (
                        <SelectItem key={resp} value={resp}>
                          {resp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Novo responsável"
                    value={newResponsavel}
                    onChange={(e) => setNewResponsavel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newResponsavel.trim()) {
                        addResponsavel(newResponsavel);
                        setEditingStage({ ...(editingStage as any), responsible: newResponsavel } as Stage);
                        setNewResponsavel('');
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newResponsavel.trim()) {
                        addResponsavel(newResponsavel);
                        setEditingStage({ ...(editingStage as any), responsible: newResponsavel } as Stage);
                        setNewResponsavel('');
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

          <div className="grid gap-2">
            <Label>Valor por Unidade (R$)</Label>
            <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(editingStage as any).unitValue || ''}
                  onChange={(e) =>
                    setEditingStage({ ...(editingStage as any), unitValue: Number(e.target.value || 0) } as Stage)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Duração Prevista (min)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={(editingStage as any).plannedDurationMin ?? ''}
                  onChange={(e) =>
                    setEditingStage({ ...(editingStage as any), plannedDurationMin: Number(e.target.value || 0) } as Stage)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Prazo da Etapa</Label>
                <Input
                  type="datetime-local"
                  value={(editingStage as any).deadlineISO ? new Date((editingStage as any).deadlineISO).toISOString().slice(0,16) : ''}
                  onChange={(e) =>
                    setEditingStage({ ...(editingStage as any), deadlineISO: e.target.value ? new Date(e.target.value).toISOString() : undefined } as any)
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Frete (Ida)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(editingStage as any).freightGo || ''}
                    onChange={(e) =>
                      setEditingStage({ ...(editingStage as any), freightGo: Number(e.target.value || 0) } as Stage)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Frete (Volta)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(editingStage as any).freightBack || ''}
                    onChange={(e) =>
                      setEditingStage({ ...(editingStage as any), freightBack: Number(e.target.value || 0) } as Stage)
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Imprevistos (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(editingStage as any).unexpected || ''}
                  onChange={(e) =>
                    setEditingStage({ ...(editingStage as any), unexpected: Number(e.target.value || 0) } as Stage)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea
                  value={(editingStage as any).notes || ''}
                  onChange={(e) =>
                    setEditingStage({ ...(editingStage as any), notes: e.target.value } as Stage)
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Checklist da Etapa</Label>
                  <Badge variant="outline">
                    {editingStage.checklist.filter((i) => i.done).length}/{editingStage.checklist.length}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Novo item do checklist"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                  />
                  <Button size="sm" onClick={handleAddChecklist} onPointerDown={(e) => e.stopPropagation()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {editingStage.checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={() => {
                          setEditingStage({
                            ...(editingStage as any),
                            checklist: editingStage.checklist.map((i) =>
                              i.id === item.id ? { ...i, done: !i.done } : i
                            ),
                          } as Stage);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                      {editingChecklistId === item.id ? (
                        <Input
                          value={editingChecklistText}
                          onChange={(e) => setEditingChecklistText(e.target.value)}
                          onBlur={() => {
                            if (editingChecklistText.trim()) {
                              setEditingStage({
                                ...(editingStage as any),
                                checklist: editingStage.checklist.map((i) =>
                                  i.id === item.id ? { ...i, text: editingChecklistText } : i
                                ),
                              } as Stage);
                            }
                            setEditingChecklistId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className={`flex-1 ${item.done ? 'line-through text-muted-foreground' : ''}`}
                          onClick={() => {
                            setEditingChecklistId(item.id);
                            setEditingChecklistText(item.text);
                          }}
                        >
                          {item.text}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingStage({
                            ...(editingStage as any),
                            checklist: editingStage.checklist.filter((i) => i.id !== item.id),
                          } as Stage);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total da Etapa</span>
                  <span className="text-2xl font-bold text-primary">
                    R$ {getStageTotal(editingStage as any).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {(editingStage as any).unitValue && (
                    <div>
                      Custo unitário: R$ {(editingStage as any).unitValue} × {getTotalPlanejado()} pçs
                    </div>
                  )}
                  {((editingStage as any).freightGo || (editingStage as any).freightBack) && (
                    <div>
                      Frete: R$ {(((editingStage as any).freightGo || 0) + ((editingStage as any).freightBack || 0)).toFixed(2)}
                    </div>
                  )}
                  {(editingStage as any).unexpected && (
                    <div>Imprevisto: R$ {(editingStage as any).unexpected.toFixed(2)}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <SheetFooter>
            <Button onClick={handleSaveStageConfig}>Salvar Configuração</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
