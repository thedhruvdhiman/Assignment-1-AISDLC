import { api } from './client';
import type { Member, Page } from './types';

export function listMembers(page = 1, pageSize = 20, archived?: boolean) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (archived !== undefined) params.set('archived', String(archived));
  return api<Page<Member>>(`/members?${params}`);
}
export const createMember = (input: { name: string; email: string }) =>
  api<Member>('/members', { method: 'POST', body: JSON.stringify(input) });
export const updateMember = (id: string, input: { name?: string; email?: string }) =>
  api<Member>(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
export const deleteMember = (id: string) =>
  api<void>(`/members/${id}`, { method: 'DELETE' });
export const restoreMember = (id: string) =>
  api<Member>(`/members/${id}/restore`, { method: 'POST' });
