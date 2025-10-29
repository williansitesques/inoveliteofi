import type { AuthResponse, AuthUser } from '@/types/auth';

const BASE = '/api/auth';

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Credenciais inválidas');
  return res.json();
}

export async function me(): Promise<AuthUser> {
  const res = await fetch(`${BASE}/me`, { credentials: 'include' });
  if (!res.ok) throw new Error('Não autenticado');
  return res.json();
}

export async function logout(): Promise<void> {
  const res = await fetch(`${BASE}/logout`, { method: 'POST', credentials: 'include' });
  if (!res.ok && res.status !== 204) throw new Error('Falha ao sair');
}

export async function updateProfileApi(patch: Partial<Pick<AuthUser,'name'|'email'>>): Promise<AuthUser> {
  const res = await fetch(`${BASE}/profile`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Falha ao atualizar perfil');
  return res.json();
}
