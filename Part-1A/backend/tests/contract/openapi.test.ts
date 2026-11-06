import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const contract = readFileSync(
  resolve(__dirname, '../../../specs/001-book-library-management/contracts/openapi.yaml'),
  'utf8',
);

describe('OpenAPI contract', () => {
  it('declares every API route group and workflow path', () => {
    const paths = [
      '/auth/session',
      '/auth/login',
      '/auth/logout',
      '/health',
      '/books',
      '/books/{bookId}',
      '/members',
      '/members/{memberId}',
      '/loans',
      '/loans/issue',
      '/loans/overdue',
      '/loans/return/{loanId}',
      '/loans/{loanId}',
    ];
    for (const path of paths) {
      expect(contract).toContain(`  ${path}:\n`);
    }
  });

  it('resolves every schema, parameter, and response reference', () => {
    const references = [...contract.matchAll(/\$ref:\s*"#\/components\/(schemas|parameters|responses)\/([^"]+)"/g)];
    expect(references.length).toBeGreaterThan(0);
    for (const [, , name] of references) {
      expect(contract).toMatch(new RegExp(`^    ${name}:`, 'm'));
    }
  });

  it('documents atomic loan operations and catalog/member validation contracts', () => {
    expect(contract).toContain('required: [book_id, member_id]');
    expect(contract).toContain('description: Loan created and book/member state updated atomically.');
    expect(contract).toContain('description: Loan returned and book/member state updated atomically.');
    expect(contract).toContain('Case-insensitive partial match against title or author.');
    expect(contract).toContain('maximum: 100, default: 20');
    expect(contract).toContain('email: { type: string, format: email }');
    expect(contract).toContain('"409":');
    expect(contract).toContain('"201":');
    expect(contract).toContain('"400":');
    expect(contract).toContain('enum: [active, overdue, returned]');
    expect(contract).toContain('/loans/overdue:');
    expect(contract).toContain('/members/{memberId}:');
    expect(contract).toContain('/books/{bookId}:');
  });
});
