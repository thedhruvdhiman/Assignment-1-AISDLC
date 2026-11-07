import { api } from './client';
import type { Loan, Page } from './types';

export const issueBook = (book_id: string, member_id: string) =>
  api<Loan>('/loans/issue', { method: 'POST', body: JSON.stringify({ book_id, member_id }) });
export const returnLoan = (id: string) =>
  api<Loan>(`/loans/return/${id}`, { method: 'POST' });
export const listLoans = (page = 1, status?: string) =>
  api<Page<Loan>>(`/loans?page=${page}${status ? `&status=${encodeURIComponent(status)}` : ''}`);
export const listOverdueLoans = (page = 1) =>
  api<Page<Loan>>(`/loans/overdue?page=${page}`);
