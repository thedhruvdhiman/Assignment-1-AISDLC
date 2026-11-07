export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  status: 'available' | 'issued' | 'maintenance';
  created_at: string;
  updated_at: string;
}

export interface Member {
  _id: string;
  name: string;
  email: string;
  active_loans_count: number;
  created_at: string;
}

export interface Loan {
  _id: string;
  book_id: Book | string;
  member_id: Member | string;
  issue_date: string;
  due_date: string;
  return_date?: string | null;
  status: 'active' | 'overdue' | 'returned';
}

export interface ApiError {
  code: string;
  message: string;
}
