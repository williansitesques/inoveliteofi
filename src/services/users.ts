import type { User } from '@/types/auth';

const BASE = '/api/users';

// Helper to consistently handle responses and errors
async function handleApiResponse(res: Response) {
  // If the request was not successful, parse the JSON body for an error message
  if (!res.ok) {
    let errorMessage = `Falha na requisição: Status ${res.status}`;
    try {
      // Try to get a more specific error message from the response body
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // The body might not be JSON, which is fine. The status text might be enough.
      errorMessage = `Falha na requisição: ${res.statusText} (Status ${res.status})`;
    }
    // Throw an error with the detailed message
    throw new Error(errorMessage);
  }

  // If the response is OK, but there's no content (like for a DELETE request)
  if (res.status === 204) {
    return null;
  }

  // Otherwise, parse and return the JSON body
  return res.json();
}

export async function listUsers(q?: string): Promise<User[]> {
  const url = new URL(BASE, window.location.origin);
  if (q) url.searchParams.set('q', q);
  const res = await fetch(url, { credentials: 'include' });
  return handleApiResponse(res);
}

export async function createUser(payload: {
  name: string;
  email: string;
  phone?: string;
  roleId: User['roleId'];
  permissions: User['permissions'];
  password: string;
}): Promise<User> {
  const res = await fetch(BASE, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleApiResponse(res);
}

export async function updateUser(id: string, patch: Partial<Omit<User, 'id'>> & { password?: string }) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return handleApiResponse(res);
}

export async function deleteUser(id: string) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleApiResponse(res);
}
