// Permissões e papéis (mantidos para módulo de usuários)
export type Permission =
  | 'dashboard'
  | 'clientes'
  | 'produtos'
  | 'pedidos'
  | 'ops'
  | 'kanban'
  | 'financeiro'
  | 'relatorios'
  | 'config';

export type RoleId = 'admin' | 'producao' | 'comercial' | 'viewer';

export type Role = {
  id: RoleId;
  name: string;
  permissions: Permission[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleId: RoleId;
  permissions: Permission[];
  status: 'ativo' | 'inativo';
  createdAt: number;
  updatedAt: number;
};

export const ALL_PERMS: Permission[] = [
  'dashboard',
  'clientes',
  'produtos',
  'pedidos',
  'ops',
  'kanban',
  'financeiro',
  'relatorios',
  'config',
];

export const ROLES: Role[] = [
  { id: 'admin', name: 'Admin', permissions: ALL_PERMS },
  { id: 'producao', name: 'Produção', permissions: ['dashboard', 'ops', 'kanban', 'relatorios'] },
  { id: 'comercial', name: 'Comercial', permissions: ['dashboard', 'clientes', 'produtos', 'pedidos', 'relatorios'] },
  { id: 'viewer', name: 'Leitor', permissions: ['dashboard', 'relatorios'] },
];

// Tipos de Auth
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  roleId: RoleId;
  permissions: string[];
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
