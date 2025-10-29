import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { hash } from 'bcryptjs';

export type Role = 'admin' | 'gestor' | 'operador';
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  passwordHash: string;
  createdAt: number;
  lastLoginAt?: number;
  hidden?: boolean;
};

type UsersState = {
  users: User[];
  upsert: (u: Partial<User> & { email: string }) => Promise<void>;
  updateUser: (id: string, patch: Partial<Pick<User, 'name' | 'email' | 'role'>>) => void;
  setPassword: (userId: string, newPassword: string) => Promise<void>;
  toggleActive: (userId: string, on: boolean) => void;
  remove: (userId: string) => void;
  seedAdminIfNeeded: () => Promise<void>;
};

export const useUsers = create<UsersState>()(
  persist(
    (set, get) => ({
      users: [],
      updateUser(id, patch) {
        set({ users: get().users.map(u => u.id === id ? { ...u, ...patch } : u) });
      },
      async upsert(input) {
        const users = [...get().users];
        const idx = users.findIndex((u) => u.email === input.email);
        if (idx >= 0) {
          users[idx] = { ...users[idx], ...input, email: users[idx].email } as User;
        } else {
          users.push({
            id: crypto.randomUUID(),
            name: input.name || '',
            email: input.email.toLowerCase().trim(),
            role: (input.role as Role) || 'operador',
            active: input.active ?? true,
            passwordHash: (input as any).passwordHash || '',
            createdAt: Date.now(),
          });
        }
        set({ users });
      },
      async setPassword(userId, pwd) {
        const users = [...get().users];
        const i = users.findIndex((u) => u.id === userId);
        if (i < 0) throw new Error('Usuário não encontrado');
        users[i] = { ...users[i], passwordHash: await hash(pwd, 10) };
        set({ users });
      },
      toggleActive(userId, on) {
        const users = get().users.map((u) => (u.id === userId ? { ...u, active: on } : u));
        set({ users });
      },
      remove(userId) {
        const users = get().users.filter((u) => u.id !== userId);
        set({ users });
      },
      async seedAdminIfNeeded() {
        const email = 'admin@admin.com';
        const users = get().users;
        if (users.some((u) => u.email === email)) return;

        const hashFromEnv = (import.meta as any).env.VITE_ADMIN_HASH as string | undefined;
        if (hashFromEnv && hashFromEnv.startsWith('$2')) {
          await get().upsert({
            email,
            name: 'Administrador',
            role: 'admin',
            active: true,
            passwordHash: hashFromEnv,
            hidden: true,
          });
          return;
        }

        const pwd = (import.meta as any).env.VITE_ADMIN_PASSWORD as string | undefined;
        if (!pwd) throw new Error('Defina VITE_ADMIN_HASH ou VITE_ADMIN_PASSWORD para semear o admin');
        const passwordHash = await hash(pwd, 10);
        await get().upsert({
          email,
          name: 'Administrador',
          role: 'admin',
          active: true,
          passwordHash,
          hidden: true,
        });
      },
    }),
    { name: 'inove_users_v1' }
  )
);
