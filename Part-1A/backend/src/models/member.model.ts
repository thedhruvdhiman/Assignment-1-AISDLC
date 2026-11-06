import { Schema, model } from 'mongoose';
import { normalizeUniqueValue } from './book.model';

const memberSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1 },
    email: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    email_normalized: { type: String, required: true, unique: true },
    active_loans_count: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
      default: 0,
    },
    archived_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false },
);

memberSchema.pre('validate', function () {
  if (this.isModified('email')) this.email_normalized = normalizeUniqueValue(this.email);
});

export const Member = model('Member', memberSchema);
