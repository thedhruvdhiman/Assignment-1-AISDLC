import { Schema, model } from 'mongoose';

const loanSchema = new Schema(
  {
    book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    member_id: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    issue_date: { type: Date, required: true },
    due_date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    return_date: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false },
);

loanSchema.index(
  { book_id: 1 },
  { unique: true, partialFilterExpression: { return_date: null } },
);
loanSchema.index({ member_id: 1, return_date: 1 });
loanSchema.index({ due_date: 1, return_date: 1 });

export const Loan = model('Loan', loanSchema);
