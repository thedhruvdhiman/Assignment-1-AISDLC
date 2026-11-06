import { mount } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.vue';

const mocks = vi.hoisted(() => ({
  sessionState: vi.fn(),
  setCsrfToken: vi.fn(),
  clearSessionState: vi.fn(),
  api: vi.fn(),
  createBook: vi.fn(),
  createMember: vi.fn(),
  listBooks: vi.fn(),
  updateBook: vi.fn(),
  listMembers: vi.fn(),
  updateMember: vi.fn(),
  issueBook: vi.fn(),
  listLoans: vi.fn(),
  listOverdueLoans: vi.fn(),
  returnLoan: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({
  api: mocks.api,
  sessionState: mocks.sessionState,
  setCsrfToken: mocks.setCsrfToken,
  clearSessionState: mocks.clearSessionState,
}));

vi.mock('../../src/api/books', () => ({
  createBook: mocks.createBook,
  deleteBook: vi.fn(),
  listBooks: mocks.listBooks,
  updateBook: mocks.updateBook,
}));

vi.mock('../../src/api/members', () => ({
  createMember: mocks.createMember,
  deleteMember: vi.fn(),
  listMembers: mocks.listMembers,
  updateMember: mocks.updateMember,
}));

vi.mock('../../src/api/loans', () => ({
  issueBook: mocks.issueBook,
  listLoans: mocks.listLoans,
  listOverdueLoans: mocks.listOverdueLoans,
  returnLoan: mocks.returnLoan,
}));

describe('library application requirements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('does not request or render catalog data before authentication', async () => {
    mocks.sessionState.mockResolvedValue({ authenticated: false, csrf_token: 'csrf' });
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.get('h1').text()).toBe('Librarian sign in');
    expect(wrapper.find('input[type="search"]').exists()).toBe(false);
    expect(wrapper.find('table').exists()).toBe(false);
    expect(mocks.listBooks).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('signs in before loading the librarian dashboard and signs out cleanly', async () => {
    mocks.sessionState.mockResolvedValue({ authenticated: false, csrf_token: 'csrf-before' });
    mocks.api.mockResolvedValue({ authenticated: true, csrf_token: 'csrf-after' });
    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('input[autocomplete="username"]').setValue('librarian@example.com');
    await wrapper.get('input[autocomplete="current-password"]').setValue('secret-password');
    await wrapper.get('.signin form').trigger('submit');
    await flushPromises();

    expect(mocks.api).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'librarian@example.com', password: 'secret-password' }),
    });
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
    expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(false);

    await wrapper.get('.topbar > button:last-child').trigger('click');
    await flushPromises();
    expect(wrapper.get('h1').text()).toBe('Librarian sign in');
    expect(wrapper.find('table').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps the login screen and reports failed credentials', async () => {
    mocks.sessionState.mockResolvedValue({ authenticated: false, csrf_token: 'csrf' });
    mocks.api.mockRejectedValue(new Error('Email or password is incorrect.'));
    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('input[autocomplete="username"]').setValue('librarian@example.com');
    await wrapper.get('input[autocomplete="current-password"]').setValue('wrong-password');
    await wrapper.get('.signin form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('h1').text()).toBe('Librarian sign in');
    expect(wrapper.get('[role="alert"]').text()).toContain('incorrect');
    expect(mocks.listBooks).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('renders labeled search and availability controls after authentication', async () => {
    const wrapper = mount(App);
    await flushPromises();
    expect(wrapper.find('label').text()).toContain('Search title or author');
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
    expect(wrapper.find('select').text()).toContain('Available');
    wrapper.unmount();
  });

  it('returns to sign-in and clears dashboard data when the session expires', async () => {
    const wrapper = mount(App);
    await flushPromises();
    window.dispatchEvent(new Event('library:unauthorized'));
    await flushPromises();

    expect(wrapper.get('h1').text()).toBe('Librarian sign in');
    expect(wrapper.find('table').exists()).toBe(false);
    expect(wrapper.get('[role="alert"]').text()).toContain('session has expired');
    wrapper.unmount();
  });

  it('applies search and status filters and announces an empty result', async () => {
    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('input[type="search"]').setValue('Dune');
    await flushPromises();
    await wrapper.get('select').setValue('issued');
    await flushPromises();

    expect(mocks.listBooks).toHaveBeenLastCalledWith({
      q: 'Dune',
      category: '',
      status: 'issued',
      sort: 'title',
      direction: 'asc',
      page: 1,
    });
    expect(wrapper.get('[role="status"]').text()).toContain('No books match');
    wrapper.unmount();
  });

  it('pages and sorts catalog results deterministically', async () => {
    const book = {
      _id: 'book-1',
      title: 'The Book',
      author: 'Author',
      isbn: 'ISBN-1',
      category: 'Fiction',
      status: 'available',
      created_at: '',
      updated_at: '',
    };
    mocks.listBooks.mockResolvedValue({
      items: [book],
      page: 1,
      pageSize: 20,
      total: 21,
      totalPages: 2,
    });

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('.pager button:last-child').trigger('click');
    await flushPromises();
    expect(mocks.listBooks).toHaveBeenLastCalledWith({
      q: '',
      category: '',
      status: '',
      sort: 'title',
      direction: 'asc',
      page: 2,
    });
    const selects = wrapper.findAll('select');
    await selects[1].setValue('created_at');
    await flushPromises();
    await selects[2].setValue('desc');
    await flushPromises();
    expect(mocks.listBooks).toHaveBeenLastCalledWith({
      q: '',
      category: '',
      status: '',
      sort: 'created_at',
      direction: 'desc',
      page: 2,
    });
    wrapper.unmount();
  });

  it('lets a librarian edit an existing book', async () => {
    const book = {
      _id: 'book-1',
      title: 'Original title',
      author: 'Author',
      isbn: 'ISBN-1',
      category: 'Fiction',
      status: 'available',
      created_at: '',
      updated_at: '',
    };
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({
      items: [book],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    mocks.updateBook.mockResolvedValue({ ...book, title: 'Updated title' });

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('nav button:nth-child(2)').trigger('click');
    const editButton = wrapper.findAll('button').find((button) => button.text() === 'Edit');
    if (!editButton) throw new Error('Book edit button was not rendered.');
    await editButton.trigger('click');
    const form = wrapper.get('section[aria-labelledby="edit-book-heading"] form');
    await form.get('input').setValue('Updated title');
    await form.trigger('submit');
    await flushPromises();

    expect(mocks.updateBook).toHaveBeenCalledWith('book-1', {
      title: 'Updated title',
      author: 'Author',
      isbn: 'ISBN-1',
      category: 'Fiction',
    });
    wrapper.unmount();
  });

  it('shows duplicate book errors in the management form', async () => {
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    mocks.createBook.mockRejectedValue(new Error('Duplicate ISBN'));

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('nav button:nth-child(2)').trigger('click');
    const form = wrapper.get('section.form-panel form');
    const inputs = form.findAll('input');
    expect(inputs.every((input) => input.attributes('required') !== undefined)).toBe(true);
    await inputs[0].setValue('New title');
    await inputs[1].setValue('Author');
    await inputs[2].setValue('ISBN');
    await inputs[3].setValue('Fiction');
    await form.trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain('Duplicate ISBN');
    wrapper.unmount();
  });

  it('adds a book after sign-in and refreshes the inventory', async () => {
    const book = {
      _id: 'book-new',
      title: 'New Title',
      author: 'New Author',
      isbn: 'ISBN-NEW',
      category: 'Fiction',
      status: 'available',
      created_at: '',
      updated_at: '',
    };
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({ items: [book], page: 1, pageSize: 20, total: 1, totalPages: 1 });
    mocks.createBook.mockResolvedValue(book);

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('nav button:nth-child(2)').trigger('click');
    const form = wrapper.get('section.form-panel form');
    const inputs = form.findAll('input');
    await inputs[0].setValue(book.title);
    await inputs[1].setValue(book.author);
    await inputs[2].setValue(book.isbn);
    await inputs[3].setValue(book.category);
    await form.trigger('submit');
    await flushPromises();

    expect(mocks.createBook).toHaveBeenCalledWith({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      status: 'available',
    });
    expect(mocks.listBooks.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(wrapper.text()).toContain(book.title);
    wrapper.unmount();
  });

  it('confirms book issue and displays the due date', async () => {
    const book = {
      _id: 'book-1',
      title: 'The Book',
      author: 'Author',
      isbn: 'ISBN-1',
      category: 'Fiction',
      status: 'available',
      created_at: '',
      updated_at: '',
    };
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({ items: [book], page: 1, pageSize: 20, total: 1, totalPages: 1 });
    mocks.listMembers.mockResolvedValue({
      items: [{ _id: 'member-1', name: 'Reader', email: 'reader@example.com', active_loans_count: 0 }],
      page: 1,
      pageSize: 100,
      total: 1,
      totalPages: 1,
    });
    mocks.issueBook.mockResolvedValue({ _id: 'loan-1', due_date: '2026-03-15' });

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('nav button:nth-child(2)').trigger('click');
    const issueButton = wrapper.findAll('button').find((button) => button.text() === 'Issue');
    if (!issueButton) throw new Error('Issue button was not rendered.');
    await issueButton.trigger('click');
    await flushPromises();
    await wrapper.get('dialog[aria-labelledby="issue-heading"] select').setValue('member-1');
    await wrapper.get('dialog[aria-labelledby="issue-heading"] button').trigger('click');
    await flushPromises();

    expect(mocks.issueBook).toHaveBeenCalledWith('book-1', 'member-1');
    expect(wrapper.text()).toContain('Book issued. Due date: 2026-03-15.');
    wrapper.unmount();
  });

  it('announces member-loading failures in the issue dialog', async () => {
    const book = {
      _id: 'book-1',
      title: 'The Book',
      author: 'Author',
      isbn: 'ISBN-1',
      category: 'Fiction',
      status: 'available',
      created_at: '',
      updated_at: '',
    };
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({ items: [book], page: 1, pageSize: 20, total: 1, totalPages: 1 });
    mocks.listMembers.mockRejectedValue(new Error('Unable to load members.'));

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('nav button:nth-child(2)').trigger('click');
    const issueButton = wrapper.findAll('button').find((button) => button.text() === 'Issue');
    if (!issueButton) throw new Error('Issue button was not rendered.');
    await issueButton.trigger('click');
    await flushPromises();

    expect(wrapper.get('dialog[aria-labelledby="issue-heading"] [role="alert"]').text())
      .toContain('Unable to load members.');
    expect(wrapper.get('dialog[aria-labelledby="issue-heading"] button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('announces pending member loading in the issue dialog', async () => {
    const book = {
      _id: 'book-1',
      title: 'The Book',
      author: 'Author',
      isbn: 'ISBN-1',
      category: 'Fiction',
      status: 'available',
      created_at: '',
      updated_at: '',
    };
    type MemberPage = {
      items: { _id: string; name: string; email: string; active_loans_count: number }[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    let finishMemberRequest: (page: MemberPage) => void = () => undefined;
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({ items: [book], page: 1, pageSize: 20, total: 1, totalPages: 1 });
    mocks.listMembers.mockReturnValue(new Promise<MemberPage>((resolve) => {
      finishMemberRequest = resolve;
    }));

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('nav button:nth-child(2)').trigger('click');
    const issueButton = wrapper.findAll('button').find((button) => button.text() === 'Issue');
    if (!issueButton) throw new Error('Issue button was not rendered.');
    await issueButton.trigger('click');
    expect(wrapper.get('dialog[aria-labelledby="issue-heading"] [role="status"]').text())
      .toContain('Loading members');

    finishMemberRequest({ items: [], page: 1, pageSize: 100, total: 0, totalPages: 0 });
    await flushPromises();
    expect(wrapper.text()).toContain('No members are registered yet.');
    wrapper.unmount();
  });

  it('requires return confirmation before calling the API', async () => {
    const loan = {
      _id: 'loan-1',
      book_id: { _id: 'book-1', title: 'The Book' },
      member_id: { _id: 'member-1', name: 'Reader' },
      issue_date: '2026-03-01T00:00:00.000Z',
      due_date: '2026-03-15',
      status: 'active',
    };
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    mocks.listLoans.mockResolvedValue({ items: [loan], page: 1, pageSize: 20, total: 1, totalPages: 1 });
    mocks.returnLoan.mockResolvedValue(loan);

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('nav button:nth-child(4)').trigger('click');
    const returnButton = wrapper.findAll('button').find((button) => button.text() === 'Return');
    if (!returnButton) throw new Error('Return button was not rendered.');
    await returnButton.trigger('click');
    expect(mocks.returnLoan).not.toHaveBeenCalled();
    await wrapper.get('[data-confirm-return]').trigger('click');
    await flushPromises();

    expect(mocks.returnLoan).toHaveBeenCalledWith('loan-1');
    expect(wrapper.text()).toContain('Book returned.');
    wrapper.unmount();
  });

  it('lets a librarian edit a member profile', async () => {
    const member = {
      _id: 'member-1',
      name: 'Reader',
      email: 'reader@example.com',
      active_loans_count: 0,
      created_at: '',
    };
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listMembers.mockResolvedValue({ items: [member], page: 1, pageSize: 20, total: 1, totalPages: 1 });
    mocks.updateMember.mockResolvedValue({ ...member, name: 'Updated Reader' });

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('nav button:nth-child(3)').trigger('click');
    const editButton = wrapper.findAll('button').find((button) => button.text() === 'Edit');
    if (!editButton) throw new Error('Member edit button was not rendered.');
    await editButton.trigger('click');
    const form = wrapper.get('form[aria-label="Edit member"]');
    await form.get('input').setValue('Updated Reader');
    await form.trigger('submit');
    await flushPromises();

    expect(mocks.updateMember).toHaveBeenCalledWith('member-1', {
      name: 'Updated Reader',
      email: 'reader@example.com',
    });
    wrapper.unmount();
  });

  it('shows an accessible empty state when there are no overdue loans', async () => {
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listOverdueLoans.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('nav button:nth-child(5)').trigger('click');
    await flushPromises();

    expect(wrapper.get('h1').text()).toBe('Overdue loans');
    expect(wrapper.get('[role="status"]').text()).toContain('No overdue loans');
    wrapper.unmount();
  });

  it('provides named tables, dialog relationships, and visible keyboard focus', async () => {
    const book = {
      _id: 'book-1',
      title: 'The Book',
      author: 'Author',
      isbn: 'ISBN-1',
      category: 'Fiction',
      status: 'available',
      created_at: '',
      updated_at: '',
    };
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({ items: [book], page: 1, pageSize: 20, total: 1, totalPages: 1 });

    const wrapper = mount(App);
    await flushPromises();
    expect(wrapper.get('table caption').text()).toBe('Library catalog');
    expect(wrapper.findAll('th[scope="col"]').length).toBeGreaterThan(0);
    expect(wrapper.get('dialog[aria-labelledby="issue-heading"]').attributes('aria-modal')).toBe('true');
    const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    expect(styles).toContain(':focus-visible');
    wrapper.unmount();
  });

  it('validates member registration and shows duplicate-email errors', async () => {
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    mocks.listMembers.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    mocks.createMember.mockRejectedValue(new Error('Email already exists'));

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('nav button:nth-child(3)').trigger('click');
    expect(wrapper.text()).toContain('No members registered yet.');
    const form = wrapper.get('form.inline-form');
    expect(form.findAll('input').every((input) => input.attributes('required') !== undefined)).toBe(true);
    await form.get('input').setValue('Reader');
    await form.get('input[type="email"]').setValue('reader@example.com');
    await form.trigger('submit');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('Email already exists');

    mocks.listMembers.mockResolvedValue({
      items: [{ _id: 'member-1', name: 'Reader', email: 'reader@example.com', active_loans_count: 0 }],
      page: 2,
      pageSize: 20,
      total: 21,
      totalPages: 2,
    });
    await wrapper.get('nav button:nth-child(3)').trigger('click');
    await flushPromises();
    await wrapper.get('.pager button:last-child').trigger('click');
    await flushPromises();
    expect(mocks.listMembers).toHaveBeenLastCalledWith(2);
    wrapper.unmount();
  });

  it('keeps the UI desktop-targeted with visible keyboard focus styling', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    expect(styles).toContain('min-width: 900px');
    expect(styles).toContain(':focus-visible');
    expect(styles).toContain('#667085');
    expect(styles).toContain('#8a4b00');
    expect(styles).not.toContain('@media');
  });

  it('shows overdue loan summaries and a friendly empty state', async () => {
    const loan = {
      _id: 'loan-1',
      book_id: { _id: 'book-1', title: 'The Book' },
      member_id: { _id: 'member-1', name: 'Reader' },
      issue_date: '2026-03-01T00:00:00.000Z',
      due_date: '2026-03-15',
      status: 'overdue',
    };
    mocks.sessionState.mockResolvedValue({ authenticated: true, csrf_token: 'csrf' });
    mocks.listBooks.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    mocks.listOverdueLoans.mockResolvedValue({
      items: [loan],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get('nav button:nth-child(5)').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('The Book — Reader');
    expect(wrapper.text()).toContain('2026-03-15');
    const returnButton = wrapper.findAll('button').find((button) => button.text() === 'Return');
    if (!returnButton) throw new Error('Overdue return action was not rendered.');
    await returnButton.trigger('click');
    expect(wrapper.get('dialog[aria-labelledby="return-heading"]').text()).toContain('Return book?');
    await wrapper.get('dialog[aria-labelledby="return-heading"] button:last-child').trigger('click');

    mocks.listOverdueLoans.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
    await wrapper.get('nav button:nth-child(5)').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('No overdue loans to show.');
    wrapper.unmount();
  });
});
