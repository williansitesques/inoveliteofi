import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { compare } from 'bcryptjs';
import { useUsers, User } from './users';

type AuthState = {
  me: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  exp?: number;
  attempts: Record<string, { count: number; until?: number }>;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      me: {
        id: '1',
        name: 'Admin',
        email: 'admin@admin.com',
        role: 'admin'
      },
      attempts: {},
      async hydrate() {
        await useUsers.getState().seedAdminIfNeeded();
      },
      async login(email, password, remember) {
        const key = email.toLowerCase().trim();
        const lock = get().attempts[key];
        const now = Date.now();
        if (lock?.until && lock.until > now) throw new Error('Muitas tentativas. Tente novamente mais tarde.');

        const u = useUsers.getState().users.find((x) => x.email === key);
        if (!u || !u.active) throw new Error('Credenciais inválidas');

        const ok = await compare(password, u.passwordHash);
        if (!ok) {
          const prev = get().attempts[key]?.count ?? 0;
          const count = prev + 1;
          const until = count >= 5 ? now + 5 * 60_000 : undefined;
          set({ attempts: { ...get().attempts, [key]: { count, until } } });
          throw new Error('Credenciais inválidas');
        }

        const exp = remember ? now + 7 * 24 * 60 * 60_000 : now + 8 * 60 * 60_000;
        set({ me: { id: u.id, name: u.name, email: u.email, role: u.role }, exp, attempts: { ...get().attempts, [key]: { count: 0 } } });
      },
      logout() {
        set({ me: null, exp: undefined });
      },
    }),
    { name: 'inove_auth_v1' }
  )
);
