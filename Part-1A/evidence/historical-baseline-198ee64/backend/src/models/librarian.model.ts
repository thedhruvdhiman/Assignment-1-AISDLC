import { Schema, model } from 'mongoose';

const librarianSchema = new Schema(
  {
    email_normalized: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    disabled_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false },
);

export const Librarian = model('Librarian', librarianSchema);
