import { api } from './client';
import type { Member, Page } from './types';

export function listMembers(page = 1, pageSize = 20) {
  return api<Page<Member>>(`/members?page=${page}&pageSize=${pageSize}`);
}
export const createMember = (input: { name: string; email: string }) =>
  api<Member>('/members', { method: 'POST', body: JSON.stringify(input) });
export const updateMember = (id: string, input: { name?: string; email?: string }) =>
  api<Member>(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
export const deleteMember = (id: string) =>
  api<void>(`/members/${id}`, { method: 'DELETE' });
