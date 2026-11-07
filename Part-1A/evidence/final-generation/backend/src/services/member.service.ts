import { Types } from 'mongoose';
import { Member } from '../models/member.model';
import { Loan } from '../models/loan.model';
import { normalizeUniqueValue } from '../models/book.model';
import { HttpError } from '../middleware/error-handler';

export type MemberInput = { name: string; email: string };

function publicMember(member: Record<string, unknown>): Record<string, unknown> {
  const { email_normalized: _normalized, archived_at: _archived, ...fields } = member;
  return fields;
}

export async function createMember(input: MemberInput): Promise<Record<string, unknown>> {
  const member = await Member.create({
    ...input,
    email_normalized: normalizeUniqueValue(input.email),
  });
  return publicMember(member.toObject());
}

export async function getMember(id: string): Promise<Record<string, unknown>> {
  const member = await Member.findOne({ _id: id, archived_at: null }).lean();
  if (!member) throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found.');
  return publicMember(member as unknown as Record<string, unknown>);
}

export async function updateMember(
  id: string,
  input: Partial<MemberInput>,
): Promise<Record<string, unknown>> {
  const update: Record<string, unknown> = { ...input };
  if (input.email !== undefined) update.email_normalized = normalizeUniqueValue(input.email);
  const member = await Member.findOneAndUpdate(
    { _id: id, archived_at: null },
    { $set: update },
    { new: true, runValidators: true },
  ).lean();
  if (!member) throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found.');
  return publicMember(member as unknown as Record<string, unknown>);
}

export async function archiveMember(id: string): Promise<void> {
  const member = await Member.findOne({ _id: id, archived_at: null });
  if (!member) throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found.');
  if (member.active_loans_count > 0 || await Loan.exists({ member_id: id, return_date: null })) {
    throw new HttpError(409, 'MEMBER_HAS_ACTIVE_LOANS', 'Return active loans before archiving this member.');
  }
  member.archived_at = new Date();
  await member.save();
}

export async function restoreMember(id: string): Promise<Record<string, unknown>> {
  const member = await Member.findOneAndUpdate(
    { _id: id, archived_at: { $ne: null } },
    { $set: { archived_at: null } },
    { new: true, runValidators: true },
  ).lean();
  if (member) return publicMember(member as unknown as Record<string, unknown>);

  if (!await Member.exists({ _id: id })) {
    throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found.');
  }
  throw new HttpError(409, 'MEMBER_NOT_ARCHIVED', 'The member is already active.');
}

export async function listMembers(page: number, pageSize: number, archived = false) {
  const filter = { archived_at: archived ? { $ne: null } : null };
  const [items, total] = await Promise.all([
    Member.find(filter).sort({ name: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Member.countDocuments(filter),
  ]);
  return {
    items: items.map((item) => publicMember(item as unknown as Record<string, unknown>)),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function validObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toHexString() === id.toLowerCase();
}
