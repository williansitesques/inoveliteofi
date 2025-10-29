export type Size = "PP" | "P" | "M" | "G" | "GG" | "G1" | "G2" | "G3" | "G4" | "G5" | string;

export interface Cliente {
  id: string;
  nome: string;
  doc?: string;
  responsavel: string;
  whats?: string;
  email?: string;
  cep?: string;
  enderecoRua?: string;
  enderecoNumero?: string;
  enderecoComp?: string;
  enderecoBairro?: string;
  enderecoCidade?: string;
  enderecoUF?: string;
  endereco?: string; // deprecated, kept for backwards compatibility
  obs?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaGallery {
  photos: string[];
  mockups: string[];
  arts: string[];
}

export interface ProductColor {
  id: string;
  colorName: string;
  colorHex?: string;
  media: MediaGallery;
  matrix?: Partial<Record<Size, { qty?: number }>>;
  qty?: number;
}

export interface Product {
  id: string;
  name: string;
  ref: string;
  type: "Uniforme" | "Brinde";
  active: boolean;
  description?: string;
  finishes: string[];
  sizes: Size[];
  colors: ProductColor[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  ProductId: string;
  ProductName: string;
  ProductRef?: string;
  color: string;
  colorId?: string;
  media?: MediaGallery;
  grade: Partial<Record<Size, number>>;
  notes?: string;
}

export interface Order {
  id: string;
  clientName: string;
  slaISO: string;
  status: "Pré-produção" | "Em Produção" | "Concluído" | "Entregue";
  items: OrderItem[];
  logos: string[];
  mockups: string[];
  arts: string[];
  obs?: string;
  archived?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export type StageStatus =
  | "A Fazer"
  | "Em Execução"
  | "Pausada"
  | "Aguardando Insumo"
  | "Terceirizado-Ida"
  | "Terceirizado"
  | "Terceirizado-Volta"
  | "Qualidade"
  | "Embalagem"
  | "Pronto";

export interface Stage {
  id: string;
  name: string;
  order: number;
  status: StageStatus;
  type: "Interna" | "Terceirizada";
  assigneeId?: string;
  workstation?: string;
  plannedMinutes?: number;
  targetPerHour?: number;
  outsourcedPartner?: string;
  freightOut?: number;
  freightBack?: number;
  trackingCode?: string;
  returnEtaISO?: string;
  partialOut?: number;
  partialBack?: number;
  qtyBySizeDone?: Partial<Record<Size, number>>;
  checklist: { id: string; text: string; done: boolean }[];
  timer: { running: boolean; startedAt?: number; totalMs: number };
  history: Array<{ at: number; user: string; action: string; meta?: any }>;
  doneQty?: number;
  plannedDurationMin?: number;
  byItem?: Record<string, {
    plannedBySize?: Partial<Record<Size, number>>;
    ProducedBySize?: Partial<Record<Size, number>>;
    cron?: { running: boolean; startedAt?: number; totalMs: number };
    status?: StageStatus;
  }>;
}export interface OP {
  id: string;
  orderId: string;
  clientName: string;
  slaISO: string;
  publicada: boolean;
  stages: Stage[];
  mídia?: {
    photos?: string[];
    mockups?: string[];
    arts?: string[];
  };
  items?: Array<{
    id: string;
    orderItemId: string;
    productName: string;
    productRef?: string;
    colorName: string;
    qtyBySize?: Partial<Record<Size, number>>;
    totalQty: number;
    stages: Stage[];
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreState {
  clientes: Cliente[];
  produtos: Product[];
  pedidos: Order[];
  ops: OP[];
  responsaveis: string[];
  users: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    roleId: string;
    permissions: string[];
    status: 'ativo' | 'inativo';
    createdAt: number | string;
    updatedAt: number | string;
  }>;
}










