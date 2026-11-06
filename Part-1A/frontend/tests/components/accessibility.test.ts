import axe from 'axe-core';
import { flushPromises, mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.vue';

const mocks = vi.hoisted(() => ({
  sessionState: vi.fn(),
  setCsrfToken: vi.fn(),
  clearSessionState: vi.fn(),
  api: vi.fn(),
  listBooks: vi.fn(),
  listMembers: vi.fn(),
  listLoans: vi.fn(),
  listOverdueLoans: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({
  api: mocks.api,
  clearSessionState: mocks.clearSessionState,
  sessionState: mocks.sessionState,
  setCsrfToken: mocks.setCsrfToken,
}));

vi.mock('../../src/api/books', () => ({
  createBook: vi.fn(),
  deleteBook: vi.fn(),
  listBooks: mocks.listBooks,
  updateBook: vi.fn(),
}));

vi.mock('../../src/api/members', () => ({
  createMember: vi.fn(),
  deleteMember: vi.fn(),
  listMembers: mocks.listMembers,
  updateMember: vi.fn(),
}));

vi.mock('../../src/api/loans', () => ({
  issueBook: vi.fn(),
  listLoans: mocks.listLoans,
  listOverdueLoans: mocks.listOverdueLoans,
  returnLoan: vi.fn(),
}));

const emptyPage = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoAccessibilityViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: wcagTags },
  });
  expect(results.violations.map(({ id, help }) => `${id}: ${help}`)).toEqual([]);
}

function relativeLuminance(color: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(foreground: string, background: string): number {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (luminances[0]! + 0.05) / (luminances[1]! + 0.05);
}

describe('WCAG 2.2 AA accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionState.mockResolvedValue({ authenticated: false, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({
      items: [{
        _id: 'book-1',
        title: 'The Book',
        author: 'Author',
        isbn: 'ISBN-1',
        category: 'Fiction',
        status: 'available',
        created_at: '',
        updated_at: '',
      }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    mocks.listMembers.mockResolvedValue({
      items: [{ _id: 'member-1', name: 'Reader', email: 'reader@example.com', active_loans_count: 0 }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    mocks.listLoans.mockResolvedValue({
      items: [{
        _id: 'loan-1',
        book_id: { _id: 'book-1', title: 'The Book', author: 'Author' },
        member_id: { _id: 'member-1', name: 'Reader' },
        issue_date: '2026-03-01T00:00:00.000Z',
        due_date: '2026-03-15',
        status: 'active',
      }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    mocks.listOverdueLoans.mockResolvedValue(emptyPage);
  });

  it('audits the sign-in screen and authenticated catalog', async () => {
    const wrapper = mount(App, { attachTo: document.body });
    await flushPromises();
    await expectNoAccessibilityViolations(wrapper.element);

    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    await wrapper.unmount();
    const authenticatedWrapper = mount(App, { attachTo: document.body });
    await flushPromises();
    await expectNoAccessibilityViolations(authenticatedWrapper.element);

    await authenticatedWrapper.get('nav button:nth-child(2)').trigger('click');
    await flushPromises();
    await expectNoAccessibilityViolations(authenticatedWrapper.element);
    const issueButton = authenticatedWrapper.findAll('button').find((button) => button.text() === 'Issue');
    if (!issueButton) throw new Error('Issue button was not rendered.');
    await issueButton.trigger('click');
    await flushPromises();
    await expectNoAccessibilityViolations(authenticatedWrapper.element);

    await authenticatedWrapper.get('nav button:nth-child(3)').trigger('click');
    await flushPromises();
    await expectNoAccessibilityViolations(authenticatedWrapper.element);
    await authenticatedWrapper.get('nav button:nth-child(4)').trigger('click');
    await flushPromises();
    await expectNoAccessibilityViolations(authenticatedWrapper.element);
    const returnButton = authenticatedWrapper.findAll('button').find((button) => button.text() === 'Return');
    if (!returnButton) throw new Error('Return button was not rendered.');
    await returnButton.trigger('click');
    await flushPromises();
    await expectNoAccessibilityViolations(authenticatedWrapper.element);
    await authenticatedWrapper.get('nav button:nth-child(5)').trigger('click');
    await flushPromises();
    await expectNoAccessibilityViolations(authenticatedWrapper.element);
    authenticatedWrapper.unmount();
  });

  it('keeps the interface palette above WCAG AA text and focus contrast thresholds', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    const pairs = [
      ['#233044', '#f5f7fa'],
      ['#ffffff', '#145a55'],
      ['#ffffff', '#0e4541'],
      ['#35455a', '#f5f7fa'],
      ['#145a55', '#e4efed'],
      ['#4a5b70', '#edf1f5'],
      ['#6b7787', '#ffffff'],
      ['#743529', '#ffffff'],
      ['#8a4b00', '#f5f7fa'],
    ];
    for (const [foreground, background] of pairs) {
      for (const color of [foreground, background]) {
        expect(color === '#ffffff'
          ? /\bwhite\b|#fff(?:fff)?\b/i.test(styles)
          : styles.includes(color)).toBe(true);
      }
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
