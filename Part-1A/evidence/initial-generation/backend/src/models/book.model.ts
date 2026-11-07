import { Schema, model } from 'mongoose';

export const normalizeUniqueValue = (value: string): string =>
  value.trim().toLocaleLowerCase('en-US');

const bookSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1 },
    author: { type: String, required: true, trim: true, minlength: 1 },
    isbn: { type: String, required: true, trim: true, minlength: 1 },
    isbn_normalized: { type: String, required: true, unique: true },
    category: { type: String, required: true, trim: true, minlength: 1 },
    status: {
      type: String,
      enum: ['available', 'issued', 'maintenance'],
      default: 'available',
      required: true,
    },
    archived_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

bookSchema.pre('validate', function () {
  if (this.isModified('isbn')) this.isbn_normalized = normalizeUniqueValue(this.isbn);
});

bookSchema.index({ status: 1, category: 1, title: 1, _id: 1 });
bookSchema.index({ created_at: -1, _id: 1 });

export const Book = model('Book', bookSchema);
