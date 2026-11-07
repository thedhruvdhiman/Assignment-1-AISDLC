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
      '/books/{bookId}/restore',
      '/members',
      '/members/{memberId}',
      '/members/{memberId}/restore',
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
    expect(contract).toContain('/books/{bookId}/restore:');
    expect(contract).toContain('/members/{memberId}/restore:');
    expect(contract).toContain('name: archived');
    expect(contract).toContain('description: Select archived records when true; active records are returned by default.');

    const bookRestore = contract.split('  /books/{bookId}/restore:\n')[1]?.split('  /members:\n')[0];
    const memberRestore = contract.split('  /members/{memberId}/restore:\n')[1]?.split('  /members/{memberId}:\n')[0];
    expect(bookRestore).toContain('    post:');
    expect(bookRestore).toContain('        - sessionCookie: []\n          csrfToken: []');
    expect(bookRestore).toContain('        "200":');
    expect(bookRestore).toContain('        "409":');
    expect(memberRestore).toContain('    post:');
    expect(memberRestore).toContain('        - sessionCookie: []\n          csrfToken: []');
    expect(memberRestore).toContain('        "200":');
    expect(memberRestore).toContain('        "409":');
  });
});
