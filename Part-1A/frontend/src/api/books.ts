import { api } from './client';
import type { Book, Page } from './types';

export type BookQuery = {
  q?: string;
  category?: string;
  status?: string;
  sort?: string;
  direction?: string;
  archived?: boolean;
  page?: number;
  pageSize?: number;
};

export function listBooks(query: BookQuery = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return api<Page<Book>>(`/books?${params}`);
}

export const getBook = (id: string) => api<Book>(`/books/${id}`);
export const createBook = (input: Omit<Book, '_id' | 'created_at' | 'updated_at'>) =>
  api<Book>('/books', { method: 'POST', body: JSON.stringify(input) });
export const updateBook = (id: string, input: Partial<Book>) =>
  api<Book>(`/books/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
export const deleteBook = (id: string) => api<void>(`/books/${id}`, { method: 'DELETE' });
export const restoreBook = (id: string) =>
  api<Book>(`/books/${id}/restore`, { method: 'POST' });
