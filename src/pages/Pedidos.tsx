import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { set as idbSet, get as idbGet, del as idbDel } from 'idb-keyval';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, FileText, Package, Image as ImageIcon, Download } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Order, OrderItem, Size } from '@/store/types';

export default function Pedidos() {
  const navigate = useNavigate();
  const { pedidos, clientes, produtos, createOrder, updateOrder, deleteOrder, createFromOrder, ops } =
    useStore() as any;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState<Partial<Order>>({
    id: '',
    status: 'Pré',
    items: [],
    logos: [],
    mockups: [],
    arts: [],
  });
  const [uploading, setUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  
  // Helpers para PDF Romaneio
  const MEDIA_PREFIX = (import.meta as any)?.env?.VITE_MEDIA_PREFIX || '/media/';

  const blobToDataUrl = (b: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(b);
    });

  const resolveMediaToDataUrl = async (srcOrKey: string): Promise<string | null> => {
    try {
      if (!srcOrKey) return null;
      if (/^https?:/i.test(srcOrKey)) {
        const res = await fetch(srcOrKey);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await blobToDataUrl(blob);
      }
      const fromIdb = await idbGet(srcOrKey);
      if (fromIdb instanceof Blob) {
        return await blobToDataUrl(fromIdb);
      }
      const tryPaths = [
        MEDIA_PREFIX ? `${MEDIA_PREFIX}${srcOrKey}` : null,
        `/${srcOrKey}`,
      ].filter(Boolean) as string[];
      for (const url of tryPaths) {
        try {
          const r = await fetch(url);
          if (r.ok) {
            const b = await r.blob();
            return await blobToDataUrl(b);
          }
        } catch {}
      }
      return null;
    } catch {
      return null;
    }
  };

  const makeQrDataUrl = async (text: string): Promise<string> => {
    // Geração de QR básica via canvas para evitar dependência externa
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Desenha um padrão simples + o texto do PED para identificação visual
    ctx.fillRect(16, 16, 8, 8);
    ctx.fillRect(104, 16, 8, 8);
    ctx.fillRect(16, 104, 8, 8);
    ctx.fillRect(104, 104, 8, 8);
    ctx.fillText(text.slice(0, 10), size / 2, size / 2);
    return canvas.toDataURL('image/png');
  };

  const generateRomaneioPdf = async (order: Order) => {
    const margin = 12; // mm
    const pageW = 210;
    const pageH = 297;
    const colImgWmm = 90; // ~90mm por coluna
    const gap = 4;
    const headerLine = (doc: jsPDF, x: number, y: number, text: string, size = 11, bold = false) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, x, y);
      return y + 6;
    };

    const totalItems = order.items.length || 1;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    for (let idx = 0; idx < totalItems; idx++) {
      if (idx > 0) doc.addPage();
      let y = margin;

      // Cabeçalho com PED-ID, QR, Cliente, Status/SLA
      const pedId = order.id;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`PED: ${pedId}`, margin, y);

      // QR do PED-ID
      try {
        const qr = await makeQrDataUrl(pedId);
        const qrSize = 28; // mm
        doc.addImage(qr, 'PNG', pageW - margin - qrSize, y - 10, qrSize, qrSize, undefined, 'FAST');
      } catch {}
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);

      const cliente = clientes.find((c) => c.nome === order.clientName);
      y = headerLine(doc, margin, y + 4, 'Cliente', 12, true);
      y = headerLine(doc, margin, y, `Nome: ${order.clientName || '-'}`);
      if (cliente) {
        const resp = (cliente as any).responsavel || (cliente as any).contato || '';
        const tel = (cliente as any).telefone || (cliente as any).phone || '';
        const end = (cliente as any).endereco || (cliente as any).address || '';
        if (resp) y = headerLine(doc, margin, y, `Responsável: ${resp}`);
        if (tel) y = headerLine(doc, margin, y, `Telefone: ${tel}`);
        if (end) y = headerLine(doc, margin, y, `Endereço: ${end}`);
      }

      const slaFmt = order.slaISO
        ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.slaISO))
        : '-';
      y = headerLine(doc, margin, y + 2, `Status: ${order.status || '-'}`);
      y = headerLine(doc, margin, y, `SLA: ${slaFmt}`);

      // Bloco do Item
      const item = order.items[idx];
      const prod = produtos.find((p) => p.id === item.productId);
      const ref = prod?.ref ? ` (${prod.ref})` : '';
      y = headerLine(doc, margin, y + 4, 'Item', 12, true);
      y = headerLine(doc, margin, y, `Produto: ${item.productName || prod?.name || ''}${ref}`);
      y = headerLine(doc, margin, y, `Cor: ${item.color || ''}`);
      // Acabamentos consolidados
      const colorData = prod?.colors.find((c) => c.colorName === item.color);
      const prodFinish = (prod as any)?.acabamento || (prod as any)?.finish || (prod as any)?.finishing || (prod as any)?.finishes;
      const colorFinish = (colorData as any)?.acabamento || (colorData as any)?.finish || (colorData as any)?.finishing || (colorData as any)?.finishes;
      const finishText = [prodFinish, colorFinish].flat().filter(Boolean).join('; ');
      if (finishText) y = headerLine(doc, margin, y, `Acabamentos: ${finishText}`);

      // Grade
      const gradeKeys = Object.keys(item.grade || {});
      if (gradeKeys.length) {
        y = headerLine(doc, margin, y + 2, 'Grade', 12, true);
        let row = '';
        gradeKeys.forEach((k, i) => {
          const cell = `${k}: ${(item.grade as any)[k] ?? 0}`;
          const next = (row ? row + ' | ' : '') + cell;
          if (next.length > 70) {
            y = headerLine(doc, margin, y, row);
            row = cell;
          } else {
            row = next;
          }
          if (i === gradeKeys.length - 1 && row) y = headerLine(doc, margin, y, row);
        });
      } else if ((item as any).isGift) {
        y = headerLine(doc, margin, y + 2, 'Grade', 12, true);
        y = headerLine(doc, margin, y, `Unitário: ${Object.values(item.grade || {}).reduce((a: any, b: any) => a + (b || 0), 0)}`);
      }

      const subtotal = Object.values(item.grade || {}).reduce((a: any, b: any) => a + (b || 0), 0);
      y = headerLine(doc, margin, y + 2, `Subtotal do item: ${subtotal}`, 11, true);

      // Seções de mídia
      const sections: { title: string; arr: string[] }[] = [
        { title: 'Mockups', arr: (item as any)?.mídia?.mockups || (item as any)?.media?.mockups || [] },
        { title: 'Fotos (Logos)', arr: (item as any)?.mídia?.photos || (item as any)?.media?.photos || [] },
        { title: 'Artes', arr: (item as any)?.mídia?.arts || (item as any)?.media?.arts || [] },
      ];

      // Cálculo de orçamento de altura para garantir tudo em 1 página
      const footerReserve = 10; // mm
      const availableForImages = Math.max(0, pageH - margin - footerReserve - y);
      const sectionsWithContent = sections.filter(s => (s.arr || []).length > 0).length || sections.length;
      const perSectionBudget = availableForImages / sectionsWithContent;

      for (const sec of sections) {
        const resolved = await Promise.all((sec.arr || []).map(resolveMediaToDataUrl));
        const list = resolved.filter(Boolean) as string[];
        y = headerLine(doc, margin, y + 4, sec.title, 12, true);
        if (list.length === 0) {
          y = headerLine(doc, margin, y, 'Nenhuma imagem', 10, false);
          continue;
        }
        let col = 0;
        let x = margin;
        let rowH = 0;
        let usedH = 0;
        const maxImgHThisSection = Math.max(40, Math.min(70, perSectionBudget / 2));

        for (const dataUrl of list) {
          // Mede imagem para manter proporção
          const img = new Image();
          await new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
            img.src = dataUrl;
          });
          const iw = img.naturalWidth || 100;
          const ih = img.naturalHeight || 100;
          let drawW = colImgWmm;
          let drawH = (ih / iw) * drawW;
          if (drawH > maxImgHThisSection) {
            drawH = maxImgHThisSection;
            drawW = (iw / ih) * drawH;
          }

          // Se exceder o orçamento de altura da seção, parar
          if (usedH + drawH > perSectionBudget) {
            break;
          }

          // posicionamento
          const curX = x;
          doc.addImage(dataUrl, 'PNG', curX, y, drawW, drawH, undefined, 'FAST');
          rowH = Math.max(rowH, drawH);
          col += 1;
          if (col >= 2) {
            col = 0;
            x = margin;
            y += rowH + 6;
            usedH += rowH + 6;
            rowH = 0;
          } else {
            x = margin + colImgWmm + gap;
          }
        }
        if (col !== 0) {
          y += rowH + 6;
          usedH += rowH + 6;
        }
      }

      // Rodapé Página X/Y
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const footer = `Página ${idx + 1}/${totalItems}`;
      doc.text(footer, pageW / 2, pageH - 6, { align: 'center' } as any);
    }

    doc.save(`romaneio-${order.id}.pdf`);
  };

  // Resolve antigo para UI (somente leitura)
  const resolveMidiaUrl = async (key: string): Promise<string> => {
    if (!key) return '';
    if (key.startsWith('http')) return key;
    // Try resolving from IndexedDB first (covers item_/produto_/cor_ when stored as blobs)
    try {
      const file = await idbGet(key);
      if (file instanceof Blob) {
        return URL.createObjectURL(file);
      }
    } catch {}
    // Product/Color keys: try configured public prefix
    if (key.startsWith('produto_') || key.startsWith('cor_')) {
      return `${MEDIA_PREFIX}${key}`;
    }
    // Fallback to root
    return `/${key}`;
  };

  const handleOpenDialog = (order?: Order) => {
    if (order) {
      setEditingOrder(order);
      setFormData(order);
    } else {
      setEditingOrder(null);
      const nextNum = (pedidos.length + 1).toString().padStart(3, '0');
      setFormData({
        id: `PED-${nextNum}`,
        status: 'Pré',
        items: [],
        logos: [],
        mockups: [],
        arts: [],
      });
    }
    setDialogOpen(true);
  };

  const handleSave = (generateOP = false) => {
    if (!formData.id?.trim()) {
      toast.error('Número do Pedido (PED-ID) é obrigatório');
      return;
    }

    if (formData.id.trim().length < 3 || formData.id.trim().length > 20) {
      toast.error('Número do Pedido deve ter entre 3 e 20 caracteres');
      return;
    }

    // Validate unique PED-ID
    const existingPedido = pedidos.find(
      (p) => p.id === formData.id?.trim() && p.id !== editingOrder?.id
    );
    if (existingPedido) {
      toast.error('Número do Pedido já existe! Use um ID único.');
      return;
    }

    if (!formData.clientName || !formData.slaISO) {
      toast.error('Cliente e SLA são obrigatórios');
      return;
    }

    if (formData.items?.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    let orderId: string;

    if (editingOrder) {
      updateOrder(editingOrder.id, formData);
      orderId = editingOrder.id;
      toast.success('Pedido atualizado!');

      // Se solicitado, também gerar OP ao salvar edição
      if (generateOP) {
        const opId = createFromOrder({ ...(formData as any), id: orderId } as Order);
        toast.success('OP criada! Redirecionando para o planner...');
        setTimeout(() => {
          navigate(`/ops/${opId}/planner`);
        }, 500);
      }
    } else {
      const newOrder: Order = {
        ...(formData as any),
        id: formData.id!.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      createOrder(newOrder);
      orderId = newOrder.id;
      toast.success('Pedido criado!');

      if (generateOP) {
        const opId = createFromOrder(newOrder);
        toast.success('OP criada! Redirecionando para o planner...');
        setTimeout(() => {
          navigate(`/ops/${opId}/planner`);
        }, 500);
      }
    }

    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm(`Confirma exclusão do pedido ${id}?`)) {
      deleteOrder(id);
      toast.success('Pedido excluído!');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...(formData.items || []),
        {
          productId: '',
          productName: '',
          color: '',
          grade: {},
        },
      ],
    });
  };

  const updateItem = (index: number, updates: Partial<OrderItem>) => {
    const items = [...(formData.items || [])];
    items[index] = { ...items[index], ...updates };
    
    // Se trocou produto ou cor, carregar mídia automaticamente
    if (updates.productId || updates.color) {
      const productId = updates.productId || items[index].productId;
      const colorName = updates.color || items[index].color;
      
      // Copia mídias do produto base ao escolher produto (suporta mídia/media)
      if (productId && updates.productId) {
        const product = produtos.find((p) => p.id === productId);
        const baseMedia = ((product as any)?.mídia || (product as any)?.media) || { photos: [], mockups: [], arts: [] };
        const current = items[index].mídia || { photos: [], mockups: [], arts: [] };
        items[index].mídia = {
          photos: [...(baseMedia.photos || []), ...(current.photos || [])],
          mockups: [...(baseMedia.mockups || []), ...(current.mockups || [])],
          arts: [...(baseMedia.arts || []), ...(current.arts || [])],
        } as any;
      }

      if (productId && colorName) {
        const product = produtos.find(p => p.id === productId);
        const colorData = product?.colors.find(c => c.colorName === colorName);
        
        if (colorData) {
          const midia = (colorData as any).mídia || (colorData as any).media || { photos: [], mockups: [], arts: [] } as any;
          const current = items[index].mídia || { photos: [], mockups: [], arts: [] };
          // Mescla sem duplicar
          const uniq = (arr: string[]) => Array.from(new Set(arr));
          items[index].mídia = {
            photos: uniq([...(current.photos || []), ...(midia.photos || [])]),
            mockups: uniq([...(current.mockups || []), ...(midia.mockups || [])]),
            arts: uniq([...(current.arts || []), ...(midia.arts || [])]),
          } as any;
          items[index].colorId = colorData.id;
          items[index].productRef = product?.ref;
        }
      }
    }
    // Reinicializa grade ao trocar produto/cor para refletir tamanhos da cor
    if (updates.productId || updates.color) {
      items[index].grade = {};
    }

    // Se trocar o produto, limpar cor selecionada para evitar value vazio inválido
    if (updates.productId) {
      items[index].color = '' as any;
    }
    
    setFormData({ ...formData, items });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items?.filter((_, i) => i !== index),
    });
  };

  // Helpers de tamanhos/grade para Uniforme
  const getColorMatrixSizes = (productId?: string, colorName?: string): Size[] => {
    const product = produtos.find((p) => p.id === productId);
    const color = product?.colors.find((c) => c.colorName === colorName);
    if (color?.matrix && Object.keys(color.matrix).length > 0) {
      return Object.keys(color.matrix) as Size[]; // usar exatamente os tamanhos configurados na cor
    }
    return product?.sizes || [];
  };

  const ensureItemSizes = (itemIndex: number) => {
    const items = [...(formData.items || [])];
    const item = items[itemIndex];
    if (!item) return;
    const currentKeys = Object.keys(item.grade || {});
    if (currentKeys.length === 0) {
      const initialSizes = getColorMatrixSizes(item.productId, item.color);
      const nextGrade: Partial<Record<Size, number>> = {};
      initialSizes.forEach((s) => (nextGrade[s] = 0));
      items[itemIndex].grade = nextGrade;
      setFormData({ ...formData, items });
    }
  };

  const addSizeToItem = (itemIndex: number, size: Size) => {
    const items = [...(formData.items || [])];
    const g = { ...(items[itemIndex].grade || {}) } as Partial<Record<Size, number>>;
    if (!(size in g)) {
      g[size] = 0;
      items[itemIndex].grade = g;
      setFormData({ ...formData, items });
    }
  };

  const removeSizeFromItem = (itemIndex: number, size: Size) => {
    const items = [...(formData.items || [])];
    const g = { ...(items[itemIndex].grade || {}) } as Partial<Record<Size, number>>;
    delete g[size];
    items[itemIndex].grade = g;
    setFormData({ ...formData, items });
  };

  const updateGrade = (itemIndex: number, size: Size, qty: number) => {
    const items = [...(formData.items || [])];
    items[itemIndex].grade = { ...items[itemIndex].grade, [size]: qty };
    setFormData({ ...formData, items });
  };

  const getItemTotal = (item: OrderItem) => {
    return Object.values(item.grade).reduce((sum, qty) => sum + (qty || 0), 0);
  };

  const getOrderTotal = () => {
    return (formData.items || []).reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  // Upload/remover mídia do pedido (fora dos itens) permanece conforme escopo; UI abaixo foi tornada somente leitura

  // Upload de mídia por item removido na UI de Pedidos (somente leitura)

  const MidiaGallery = ({ type, title }: { type: 'logos' | 'mockups' | 'arts'; title: string }) => {
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>{title}</Label>
        </div>
        {formData[type]?.length ? (
          <div className="grid grid-cols-4 gap-2">
            {(formData[type] || []).map((key, idx) => (
              <div key={key} className="relative group aspect-square border rounded-lg overflow-hidden">
                <img src={`${key.startsWith('http') ? '' : '/'}${key}`} alt={`${title} ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma imagem</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground mt-1">Gerencie os pedidos dos clientes</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Pedido
        </Button>
      </div>

      <div className="grid gap-4">
        {pedidos.map((pedido) => {
          const totalpeças = pedido.items.reduce(
            (sum, item) =>
              sum + Object.values(item.grade).reduce((s, qty) => s + (qty || 0), 0),
            0
          );

          return (
            <Card key={pedido.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-xl">{pedido.id}</CardTitle>
                      <Badge
                        variant={
                          pedido.status === 'Concluído' || pedido.status === 'Entregue'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {pedido.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {pedido.clientName} • SLA:{' '}
                      {format(new Date(pedido.slaISO), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(pedido)}
                      className="hover:bg-primary/10 hover:text-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(pedido.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>
                    {pedido.items.length} {pedido.items.length === 1 ? 'item' : 'itens'} • {totalpeças}{' '}
                    {totalpeças === 1 ? 'peça' : 'peças'}
                  </span>
                </div>

                {pedido.obs && (
                  <p className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">
                    {pedido.obs}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {pedidos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">Nenhum pedido cadastrado</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Pedido
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Editar Pedido' : 'Novo Pedido'}</DialogTitle>
            <DialogDescription>Configure o pedido e seus itens</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* PED-ID Manual */}
            <div className="grid gap-2">
              <Label>Número do Pedido (PED-ID) *</Label>
              <Input
                value={formData.id || ''}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="Ex: PED-001"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                ID único do pedido (3-20 caracteres)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Cliente *</Label>
                <Select
                  value={formData.clientName}
                  onValueChange={(value) => setFormData({ ...formData, clientName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.nome}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>SLA *</Label>
                <Input
                  type="datetime-local"
                  value={formData.slaISO ? formData.slaISO.slice(0, 16) : ''}
                  onChange={(e) =>
                    setFormData({ ...formData, slaISO: new Date(e.target.value).toISOString() })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pré">Pré</SelectItem>
                  <SelectItem value="Em produção">Em produção</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Itens do Pedido</Label>
                <Button type="button" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>

              {formData.items?.map((item, itemIndex) => {
                const selectedProduct = produtos.find((p) => p.id === item.productId);

                return (
                  <div key={itemIndex} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="grid gap-2 flex-1">
                        <Select
                          value={item.productId}
                          onValueChange={(value) => {
                            const product = produtos.find((p) => p.id === value);
                            updateItem(itemIndex, {
                              productId: value,
                              productName: product?.name || '',
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {produtos.map((produto) => (
                              <SelectItem key={produto.id} value={produto.id}>
                                {produto.name} ({produto.ref})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                    {selectedProduct && (
                        <div className="grid gap-2 w-48 relative z-50">
                          <Select
                            value={item.color}
                            onValueChange={(value) => {
                              // Aplica cor e deriva mídias + grade no mesmo ciclo
                              const productId = item.productId;
                              const product = produtos.find((p) => p.id === productId);
                              const colorData = product?.colors.find((c) => c.colorName === value);

                              const current = item.mídia || { photos: [], mockups: [], arts: [] } as any;
                              const baseMedia = ((product as any)?.mídia || (product as any)?.media) || { photos: [], mockups: [], arts: [] } as any;
                              const colorMedia = (colorData as any)?.mídia || (colorData as any)?.media || { photos: [], mockups: [], arts: [] } as any;
                              const uniq = (arr: string[]) => Array.from(new Set(arr));
                              const nextMidia = {
                                photos: uniq([...(current.photos || []), ...(baseMedia.photos || []), ...(colorMedia.photos || [])]),
                                mockups: uniq([...(current.mockups || []), ...(baseMedia.mockups || []), ...(colorMedia.mockups || [])]),
                                arts: uniq([...(current.arts || []), ...(baseMedia.arts || []), ...(colorMedia.arts || [])]),
                              } as any;

                              // Recria grade com base na cor
                              const allowedSizes = getColorMatrixSizes(productId, value);
                              const nextGrade: Partial<Record<Size, number>> = {};
                              allowedSizes.forEach((s) => (nextGrade[s as Size] = (item.grade as any)?.[s] ?? 0));

                              updateItem(itemIndex, { color: value, mídia: nextMidia as any, grade: nextGrade });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Cor" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedProduct.colors
                                .filter((c) => typeof c.colorName === 'string' && c.colorName.trim().length > 0)
                                .map((color) => (
                                  <SelectItem key={color.id} value={color.colorName}>
                                    {color.colorName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex items-center gap-2 ml-auto">
                        <Badge variant="secondary" className="whitespace-nowrap">
                          {getItemTotal(item)} peças
                        </Badge>
                        {item.mídia && (item.mídia.photos.length > 0 || item.mídia.mockups.length > 0 || item.mídia.arts.length > 0) && (
                          <Badge variant="outline" className="whitespace-nowrap">
                            {item.mídia.photos.length + item.mídia.mockups.length + item.mídia.arts.length} mídias
                          </Badge>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(itemIndex)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {selectedProduct && selectedProduct.type === 'Uniforme' && item.color && (
                      <div className="space-y-2 w-full">
                        {/* Garante inicialização das chaves da grade a partir da cor */}
                        {ensureItemSizes(itemIndex)}

                        <div className="grid grid-cols-5 gap-2">
                          {(() => {
                            const allowed = getColorMatrixSizes(item.productId, item.color);
                            const keys = Object.keys(item.grade || {});
                            const ordered = allowed.filter((k) => keys.includes(k));
                            return ordered.map((sizeKey) => (
                            <div key={sizeKey} className="grid gap-1">
                              <div className="flex items-center justify-center">
                                <Label className="text-xs text-center">{sizeKey}</Label>
                              </div>
                              <Input
                                type="number"
                                min="0"
                                value={(item.grade as any)[sizeKey] || ''}
                                onChange={(e) =>
                                  updateGrade(itemIndex, sizeKey as Size, parseInt(e.target.value) || 0)
                                }
                                className="text-center"
                              />
                            </div>
                          ));
                          })()}
                        </div>

                        {/* Sem adicionar tamanho manual: espelha Produtos */}
                      </div>
                    )}

                    {selectedProduct && selectedProduct.type === 'Brinde' && (
                      <div className="grid gap-2 w-48">
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min="0"
                          value={(item.grade as any)?.__unit__ || ''}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 0;
                            updateItem(itemIndex, { grade: { ...(item.grade || {}), __unit__: qty } as any });
                          }}
                        />
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label>Observações do item</Label>
                      <Textarea
                        value={item.notes || ''}
                        onChange={(e) => updateItem(itemIndex, { notes: e.target.value })}
                        rows={2}
                      />
                    </div>

                    {/* Galerias por item */}
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-semibold">Arquivos do Item</h4>
                      <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Fotos (Logos)</span>
                          </div>
                          <ItemGallery 
                            urls={item.mídia?.photos || []}
                            resolve={resolveMidiaUrl}
                            emptyText="Nenhuma imagem"
                            onOpen={(src)=>{ setLightboxSrc(src); setLightboxOpen(true);} }
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Mockups</span>
                          </div>
                          <ItemGallery 
                            urls={item.mídia?.mockups || []}
                            resolve={resolveMidiaUrl}
                            emptyText="Nenhuma imagem"
                            onOpen={(src)=>{ setLightboxSrc(src); setLightboxOpen(true);} }
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Artes</span>
                          </div>
                          <ItemGallery 
                            urls={item.mídia?.arts || []}
                            resolve={resolveMidiaUrl}
                            emptyText="Nenhuma imagem"
                            onOpen={(src)=>{ setLightboxSrc(src); setLightboxOpen(true);} }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Subtotal já exibido no topo ao lado das mídias */}
                  </div>
                );
              })}
            </div>

            {/* Arquivos do Pedido removidos: mídias agora são apenas por item (somente leitura) */}

            <div className="grid gap-2">
              <Label>Observações Gerais</Label>
              <Textarea
                value={formData.obs || ''}
                onChange={(e) => setFormData({ ...formData, obs: e.target.value })}
                rows={3}
              />
            </div>

            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-lg font-bold">Total do Pedido: {getOrderTotal()} peças</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                if (!formData?.id || !(formData.items || []).length) {
                  toast.error('Pedido inválido para PDF');
                  return;
                }
                try {
                  toast.message('Gerando PDF...', { description: formData.id });
                  await generateRomaneioPdf(formData as Order);
                  toast.success('PDF salvo');
                } catch (e) {
                  console.error(e);
                  toast.error('Falha ao gerar PDF');
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Salvar PDF
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="secondary" onClick={() => handleSave(false)}>
              Salvar
            </Button>
            <Button onClick={() => handleSave(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Salvar e Gerar OP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={(o)=>{ if(!o){ setLightboxOpen(false); setLightboxSrc(null);} }}>
        <DialogContent className="max-w-5xl bg-black/90 border-0">
          {lightboxSrc && (
            <div className="w-full h-full flex items-center justify-center">
              <img src={lightboxSrc} className="max-w-[90vw] max-h-[85vh] object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Read-only gallery for item-level arrays that may include IndexedDB keys
function ItemGallery({ urls, resolve, emptyText, onOpen }: { urls: string[]; resolve: (k: string)=>Promise<string>; emptyText: string; onOpen?: (src:string)=>void }) {
  const [resolved, setResolved] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const out: string[] = [];
      for (const k of urls) {
        out.push(await resolve(k));
      }
      if (mounted) setResolved(out);
    };
    load();
    return () => {
      mounted = false;
      // Revoke any blob: URLs
      resolved.forEach((u) => {
        if (u.startsWith('blob:')) URL.revokeObjectURL(u);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(urls)]);

  if (!urls?.length) {
    return (
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 border-2 border-dashed rounded p-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {resolved.map((u, i) => (
        <div key={`${u}-${i}`} className="relative">
          <img src={u} className="w-full h-20 object-cover rounded cursor-zoom-in" onClick={()=> onOpen && onOpen(u)} />
        </div>
      ))}
    </div>
  );
}








