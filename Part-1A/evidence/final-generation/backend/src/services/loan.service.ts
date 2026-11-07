import mongoose, { Types } from 'mongoose';
import { Book } from '../models/book.model';
import { Loan } from '../models/loan.model';
import { Member } from '../models/member.model';
import { HttpError } from '../middleware/error-handler';
import { calculateDueDate, todayInTimeZone } from './due-date.service';

function loanStatus(returnDate: Date | null, dueDate: string, today: string) {
  if (returnDate) return 'returned';
  return dueDate < today ? 'overdue' : 'active';
}

function withStatus<T extends { return_date?: Date | null; due_date: string }>(
  loan: T,
  today: string,
) {
  return { ...loan, status: loanStatus(loan.return_date ?? null, loan.due_date, today) };
}

export async function issueBook(bookId: string, memberId: string, timeZone: string) {
  const issueDate = new Date();
  const dueDate = calculateDueDate(issueDate, timeZone);
  return mongoose.connection.transaction(async (session) => {
    const book = await Book.findOneAndUpdate(
      { _id: bookId, status: 'available', archived_at: null },
      { $set: { status: 'issued' } },
      { new: true, session },
    );
    if (!book) {
      const exists = await Book.exists({ _id: bookId }).session(session);
      if (!exists) throw new HttpError(404, 'BOOK_NOT_FOUND', 'Book not found.');
      throw new HttpError(400, 'BOOK_UNAVAILABLE', 'Only an available book can be issued.');
    }
    const member = await Member.findOneAndUpdate(
      { _id: memberId, archived_at: null },
      { $inc: { active_loans_count: 1 } },
      { new: true, session },
    );
    if (!member) throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found.');
    const [loan] = await Loan.create(
      [{ book_id: book._id, member_id: member._id, issue_date: issueDate, due_date: dueDate }],
      { session },
    );
    return withStatus(loan.toObject(), todayInTimeZone(timeZone));
  });
}

export async function returnLoan(loanId: string, timeZone: string) {
  return mongoose.connection.transaction(async (session) => {
    const loan = await Loan.findById(loanId).session(session);
    if (!loan) throw new HttpError(404, 'LOAN_NOT_FOUND', 'Loan not found.');
    if (loan.return_date) throw new HttpError(409, 'LOAN_ALREADY_RETURNED', 'This loan has already been returned.');
    const returnDate = new Date();
    const updated = await Loan.findOneAndUpdate(
      { _id: loanId, return_date: null },
      { $set: { return_date: returnDate } },
      { new: true, session },
    );
    if (!updated) throw new HttpError(409, 'LOAN_ALREADY_RETURNED', 'This loan has already been returned.');
    const book = await Book.updateOne(
      { _id: loan.book_id, status: 'issued' },
      { $set: { status: 'available' } },
      { session },
    );
    const member = await Member.updateOne(
      { _id: loan.member_id, active_loans_count: { $gt: 0 } },
      { $inc: { active_loans_count: -1 } },
      { session },
    );
    if (book.modifiedCount !== 1 || member.modifiedCount !== 1) {
      throw new Error('Loan, book, and member state is inconsistent; transaction aborted.');
    }
    return withStatus(updated.toObject(), todayInTimeZone(timeZone));
  });
}

export async function getLoan(loanId: string, timeZone: string) {
  const loan = await Loan.findById(loanId)
    .populate('book_id', 'title author isbn category status archived_at')
    .populate('member_id', 'name email archived_at')
    .lean();
  if (!loan) throw new HttpError(404, 'LOAN_NOT_FOUND', 'Loan not found.');
  return withStatus(loan, todayInTimeZone(timeZone));
}

export async function listLoans(
  query: { status?: string; overdueOnly?: boolean; page: number; pageSize: number },
  timeZone: string,
) {
  const today = todayInTimeZone(timeZone);
  const filter: Record<string, unknown> = {};
  if (query.overdueOnly || query.status === 'overdue') {
    filter.return_date = null;
    filter.due_date = { $lt: today };
  } else if (query.status === 'returned') {
    filter.return_date = { $ne: null };
  } else if (query.status === 'active') {
    filter.return_date = null;
    filter.due_date = { $gte: today };
  }
  const [items, total] = await Promise.all([
    Loan.find(filter)
      .sort({ due_date: 1, _id: 1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .populate('book_id', 'title author isbn category status archived_at')
      .populate('member_id', 'name email archived_at')
      .lean(),
    Loan.countDocuments(filter),
  ]);
  return {
    items: items.map((loan) => withStatus(loan, today)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

export function validateLoanObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toHexString() === id.toLowerCase();
}
