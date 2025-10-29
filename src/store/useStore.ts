import { deepFix } from '@/utils/fixMojibake';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoreState, Cliente, Product, Order, OP, Stage, ChecklistItem, StageStatus } from './types';
import { seedData } from './seedData';

interface StoreActions {
  // Clientes
  createCliente: (cliente: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCliente: (id: string, cliente: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;

  // Produtos
  createProduto: (produto: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduto: (id: string, produto: Partial<Product>) => void;
  deleteProduto: (id: string) => void;

  // Pedidos
  createOrder: (order: Omit<Order, 'createdAt' | 'updatedAt'>) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  archiveOrder: (id: string) => void;
  restoreOrder: (id: string) => void;

  // OPs
  createFromOrder: (order: Order) => string;
  updateOP: (id: string, patch: Partial<OP>) => void;
  deleteOP: (id: string) => void;

  // Stages
  addStage: (opId: string, name: string) => void;
  removeStage: (opId: string, stageId: string) => void;
  reorderStages: (opId: string, from: number, to: number) => void;
  updateStage: (opId: string, stageId: string, patch: Partial<Stage>) => void;

  // Checklist
  toggleChecklist: (opId: string, stageId: string, itemId: string, orderItemId?: string) => void;
  addChecklistItem: (opId: string, stageId: string, text: string, orderItemId?: string) => void;
  renameChecklistItem: (opId: string, stageId: string, itemId: string, text: string) => void;
  removeChecklistItem: (opId: string, stageId: string, itemId: string) => void;

  // Kanban
  moveStage: (opId: string, stageId: string, status: StageStatus, itemId?: string) => void;

  // Timer
  startTimer: (opId: string, stageId: string, itemId?: string) => void;
  pauseTimer: (opId: string, stageId: string, itemId?: string) => void;
  resetTimer: (opId: string, stageId: string, itemId?: string) => void;

        // Respons�veis  addResponsavel: (nome: string) => void;

  // Backup
  exportJSON: () => string;
  importJSON: (json: string) => void;
  resetToSeed: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      ...seedData,
      users: [{ id: 'u-admin', name: 'Admin Demo', email: 'admin@example.com', phone: '11999999999', roleId: 'admin', permissions: ['dashboard','clientes','produtos','pedidos','ops','kanban','financeiro','relatorios','config'], status: 'ativo', createdAt: Date.now(), updatedAt: Date.now() }],

      // Clientes
      createCliente: (cliente) =>
        set((state) => ({
          clientes: [
            ...state.clientes,
            {
              ...cliente,
              id: generateId(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          responsaveis: cliente.responsavel && !state.responsaveis.includes(cliente.responsavel)
            ? [...state.responsaveis, cliente.responsavel]
            : state.responsaveis,
        })),

      updateCliente: (id, cliente) =>
        set((state) => {
          const updated = state.clientes.map((c) =>
            c.id === id ? { ...c, ...cliente, updatedAt: new Date().toISOString() } : c
          );
          const novoResp = cliente.responsavel;
          const responsaveis = novoResp && !state.responsaveis.includes(novoResp)
            ? [...state.responsaveis, novoResp]
            : state.responsaveis;
          return { clientes: updated, responsaveis } as any;
        }),

      deleteCliente: (id) =>
        set((state) => ({
          clientes: state.clientes.filter((c) => c.id !== id),
        })),

      // Produtos
      createProduto: (produto) =>
        set((state) => ({
          produtos: [
            ...state.produtos,
            {
              ...produto,
              id: generateId(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateProduto: (id, produto) =>
        set((state) => ({
          produtos: state.produtos.map((p) =>
            p.id === id ? { ...p, ...produto, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deleteProduto: (id) =>
        set((state) => ({
          produtos: state.produtos.filter((p) => p.id !== id),
        })),

      // Pedidos
      createOrder: (order) =>
        set((state) => ({
          pedidos: [
            ...state.pedidos,
            {
              ...order,
              id: order.id || `PED-${generateId()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateOrder: (id, order) =>
        set((state) => ({
          pedidos: state.pedidos.map((o) =>
            o.id === id ? { ...o, ...order, updatedAt: new Date().toISOString() } : o
          ),
        })),

      deleteOrder: (id) =>
        set((state) => ({
          pedidos: state.pedidos.filter((o) => o.id !== id),
        })),

      archiveOrder: (id) =>
        set((state) => ({
          pedidos: state.pedidos.map((o) => (o.id === id ? { ...o, archived: true, archivedAt: new Date().toISOString(), status: o.status } : o)),
        })),

      restoreOrder: (id) =>
        set((state) => ({
          pedidos: state.pedidos.map((o) => (o.id === id ? { ...o, archived: false } : o)),
        })),

      // OPs
      createFromOrder: (order) => {
        const opId = `OP-${generateId()}`;
        set((state) => ({
          ops: [
            ...state.ops,
            {
              id: opId,
              orderId: order.id,
              clientName: order.clientName,
              slaISO: order.slaISO,
              publicada: false,
              // Enviar para OPS imediatamente ao criar
              status: 'OPS',
              sentToOps: true,
              sentToOpsAt: new Date().toISOString(),
              media: {
                photos: order.logos || [],
                mockups: order.mockups || [],
                arts: order.arts || [],
              },
              stages: [],
            },
          ],
        }));
        return opId;
      },

      updateOP: (id, patch) =>
        set((state) => ({
          ops: state.ops.map((op) => (op.id === id ? { ...op, ...patch } : op)),
        })),

      deleteOP: (id) =>
        set((state) => ({
          ops: state.ops.filter((op) => op.id !== id),
        })),

      // Stages
      addStage: (opId, name) =>
        set((state) => ({
          ops: state.ops.map((op) =>
            op.id === opId
              ? {
                  ...op,
                  stages: [
                    ...op.stages,
                    {
                      id: generateId(),
                      name,
                      kind: 'Interna',
                      checklist: [],
                      status: 'A Fazer',
                      cron: { running: false, totalMs: 0 },
                    },
                  ],
                }
              : op
          ),
        })),

      removeStage: (opId, stageId) =>
        set((state) => ({
          ops: state.ops.map((op) =>
            op.id === opId
              ? { ...op, stages: op.stages.filter((s) => s.id !== stageId) }
              : op
          ),
        })),

      reorderStages: (opId, from, to) =>
        set((state) => ({
          ops: state.ops.map((op) => {
            if (op.id !== opId) return op;
            const stages = [...op.stages];
            const [removed] = stages.splice(from, 1);
            stages.splice(to, 0, removed);
            return { ...op, stages };
          }),
        })),

      updateStage: (opId, stageId, patch) =>
        set((state) => ({
          ops: state.ops.map((op) =>
            op.id === opId
              ? {
                  ...op,
                  stages: op.stages.map((s) => (s.id === stageId ? { ...s, ...patch } : s)),
                }
              : op
          ),
        })),

      // Checklist
      toggleChecklist: (opId, stageId, itemId, orderItemId) =>
        set((state) => ({
          ops: state.ops.map((op) => {
            if (op.id !== opId) return op;
            // Preferir operar em op.items quando orderItemId (itemId do pedido) vier informado
            if (orderItemId && op.items && op.items.length) {
              const items = op.items.map((it) => {
                if (it.id !== orderItemId) return it;
                return {
                  ...it,
                  stages: (it.stages || []).map((s) =>
                    s.id === stageId
                      ? ({
                          ...s,
                          checklist: s.checklist.map((ci) => (ci.id === itemId ? { ...ci, done: !ci.done } : ci)),
                        } as any)
                      : s
                  ),
                };
              });
              return { ...op, items } as any;
            }
            // Legado: atualizar em op.stages
            return {
              ...op,
              stages: op.stages.map((s) =>
                s.id === stageId
                  ? { ...s, checklist: s.checklist.map((ci) => (ci.id === itemId ? { ...ci, done: !ci.done } : ci)) }
                  : s
              ),
            } as any;
          }),
        })),

      addChecklistItem: (opId, stageId, text, orderItemId) =>
        set((state) => ({
          ops: state.ops.map((op) => {
            if (op.id !== opId) return op;
            if (orderItemId && op.items && op.items.length) {
              const items = op.items.map((it) => {
                if (it.id !== orderItemId) return it;
                return {
                  ...it,
                  stages: (it.stages || []).map((s) =>
                    s.id === stageId
                      ? ({ ...s, checklist: [...s.checklist, { id: generateId(), text, done: false }] } as any)
                      : s
                  ),
                };
              });
              return { ...op, items } as any;
            }
            return {
              ...op,
              stages: op.stages.map((s) =>
                s.id === stageId
                  ? { ...s, checklist: [...s.checklist, { id: generateId(), text, done: false }] }
                  : s
              ),
            } as any;
          }),
        })),

      renameChecklistItem: (opId, stageId, itemId, text) =>
        set((state) => ({
          ops: state.ops.map((op) =>
            op.id === opId
              ? {
                  ...op,
                  stages: op.stages.map((s) =>
                    s.id === stageId
                      ? {
                          ...s,
                          checklist: s.checklist.map((item) =>
                            item.id === itemId ? { ...item, text } : item
                          ),
                        }
                      : s
                  ),
                }
              : op
          ),
        })),

      removeChecklistItem: (opId, stageId, itemId) =>
        set((state) => ({
          ops: state.ops.map((op) =>
            op.id === opId
              ? {
                  ...op,
                  stages: op.stages.map((s) =>
                    s.id === stageId
                      ? { ...s, checklist: s.checklist.filter((item) => item.id !== itemId) }
                      : s
                  ),
                }
              : op
          ),
        })),

      // Kanban
      moveStage: (opId, stageId, status, itemId) =>
        set((state) => ({
          ops: state.ops.map((op) => {
            if (op.id !== opId) return op;
            // Novo: operar em op.items[*].stages quando itemId fornecido
            if (itemId && op.items && op.items.length) {
              const items = op.items.map((it) => {
                if (it.id !== itemId) return it;
                return {
                  ...it,
                  stages: (it.stages || []).map((s) => (s.id === stageId ? { ...s, status } as any : s)),
                };
              });
              return { ...op, items } as any;
            }
            // Legado: manter atualiza��o em op.stages
            return {
              ...op,
              stages: op.stages.map((s) => (s.id === stageId ? { ...s, status } : s)),
            } as any;
          }),
        })),

      // Timer
      startTimer: (opId, stageId, itemId) =>
        set((state) => ({
          ops: state.ops.map((op) => {
            if (op.id !== opId) return op;
            if (itemId && op.items && op.items.length) {
              const items = op.items.map((it) => {
                if (it.id !== itemId) return it;
                return {
                  ...it,
                  stages: (it.stages || []).map((s) =>
                    s.id === stageId
                      ? ({
                          ...s,
                          cron: { running: true, startedAt: Date.now(), totalMs: (s as any)?.cron?.totalMs || 0 },
                          status: 'Em Execu��o',
                        } as any)
                      : s
                  ),
                };
              });
              return { ...op, items } as any;
            }
            return {
              ...op,
              stages: op.stages.map((s) =>
                s.id === stageId
                  ? { ...s, cron: { ...s.cron, running: true, startedAt: Date.now() }, status: 'Em Execu��o' }
                  : s
              ),
            } as any;
          }),
        })),

      pauseTimer: (opId, stageId, itemId) =>
        set((state) => ({
          ops: state.ops.map((op) => {
            if (op.id !== opId) return op;
            if (itemId && op.items && op.items.length) {
              const items = op.items.map((it) => {
                if (it.id !== itemId) return it;
                return {
                  ...it,
                  stages: (it.stages || []).map((s) => {
                    if (s.id !== stageId) return s;
                    const cron = (s as any).cron || { running: false, totalMs: 0 };
                    const elapsed = cron.startedAt ? Date.now() - cron.startedAt : 0;
                    return { ...s, cron: { running: false, startedAt: undefined, totalMs: (cron.totalMs || 0) + elapsed } } as any;
                  }),
                };
              });
              return { ...op, items } as any;
            }
            return {
              ...op,
              stages: op.stages.map((s) => {
                if (s.id !== stageId) return s;
                const elapsed = s.cron.startedAt ? Date.now() - s.cron.startedAt : 0;
                return { ...s, cron: { running: false, startedAt: undefined, totalMs: s.cron.totalMs + elapsed } };
              }),
            } as any;
          }),
        })),

      resetTimer: (opId, stageId, itemId) =>
        set((state) => ({
          ops: state.ops.map((op) => {
            if (op.id !== opId) return op;
            if (itemId && op.items && op.items.length) {
              const items = op.items.map((it) => {
                if (it.id !== itemId) return it;
                return {
                  ...it,
                  stages: (it.stages || []).map((s) => (s.id === stageId ? ({ ...s, cron: { running: false, totalMs: 0 } } as any) : s)),
                };
              });
              return { ...op, items } as any;
            }
            return { ...op, stages: op.stages.map((s) => (s.id === stageId ? { ...s, cron: { running: false, totalMs: 0 } } : s)) } as any;
          }),
        })),

      // Respons�veis
      addResponsavel: (nome) =>
        set((state) => ({
          responsaveis: state.responsaveis.includes(nome)
            ? state.responsaveis
            : [...state.responsaveis, nome],
        })),

      // Backup
      exportJSON: () => {
        const state = get();
        return JSON.stringify(
          {
            clientes: state.clientes,
            produtos: state.produtos,
            pedidos: state.pedidos,
            ops: state.ops,
            responsaveis: state.responsaveis,
          },
          null,
          2
        );
      },

      importJSON: (json) => {
        try {
          const data = JSON.parse(json);
          set({
            clientes: data.clientes || [],
            produtos: data.produtos || [],
            pedidos: data.pedidos || [],
            ops: data.ops || [],
            responsaveis: data.responsaveis || [],
          });
        } catch (error) {
          console.error('Erro ao importar JSON:', error);
        }
      },

      resetToSeed: () => set(seedData),
      // Users
      addUser: (user: any) => set((state: any) => ({ users: [...(state.users || []), user] })),
      updateUser: (id: string, patch: any) => set((state: any) => ({ users: (state.users || []).map((u: any) => (u.id === id ? { ...u, ...patch } : u)) })),
      deleteUser: (id: string) => set((state: any) => ({ users: (state.users || []).filter((u: any) => u.id !== id) })),

    }),
    {
      name: 'inovelite_v1',
    }
  )
);









