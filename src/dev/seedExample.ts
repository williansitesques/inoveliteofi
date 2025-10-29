import { useUsers } from '@/store/users';
import { useStore } from '@/store/useStore';

export async function seedExampleData() {
  await useUsers.getState().seedAdminIfNeeded();
  const s = useStore.getState();
  const now = new Date().toISOString();

  const clienteId = crypto.randomUUID();
  s.setClientes([
    { id: clienteId, nome: 'Empresa Exemplo LTDA', responsavel: 'João Silva', createdAt: now, updatedAt: now } as any,
  ] as any);

  const prodId = crypto.randomUUID();
  s.setProdutos([
    {
      id: prodId,
      name: 'Camiseta DryFit',
      ref: 'CAM-001',
      type: 'Uniforme',
      active: true,
      description: 'Camiseta para treino',
      finishes: ['Silk'],
      sizes: ['P', 'M', 'G', 'GG'],
      colors: [
        { id: crypto.randomUUID(), colorName: 'Azul', colorHex: '#1e3a8a', media: { photos: [], mockups: [], arts: [] } },
      ],
      createdAt: now,
      updatedAt: now,
    } as any,
  ] as any);

  const orderId = crypto.randomUUID();
  s.setPedidos([
    {
      id: orderId,
      clientName: 'Empresa Exemplo LTDA',
      slaISO: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      status: 'Pré-produção',
      items: [
        { ProductId: prodId, ProductName: 'Camiseta DryFit', color: 'Azul', grade: { P: 10, M: 20, G: 15, GG: 8 } },
      ],
      logos: [],
      mockups: [],
      arts: [],
      createdAt: now,
      updatedAt: now,
    } as any,
  ] as any);

  s.setOPs([
    {
      id: crypto.randomUUID(),
      orderId,
      clientName: 'Empresa Exemplo LTDA',
      slaISO: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      publicada: true,
      items: [
        { id: crypto.randomUUID(), orderItemId: '1', productName: 'Camiseta DryFit', colorName: 'Azul', totalQty: 53, stages: [] } as any,
      ],
    } as any,
  ] as any);
}

