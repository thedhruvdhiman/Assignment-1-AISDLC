<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { api, clearSessionState, sessionState, setCsrfToken } from './api/client';
import { createBook, deleteBook, listBooks, updateBook } from './api/books';
import { createMember, deleteMember, listMembers, updateMember } from './api/members';
import { issueBook, listLoans, listOverdueLoans, returnLoan } from './api/loans';
import type { Book, Loan, Member, Page } from './api/types';

type View = 'catalog' | 'books' | 'members' | 'loans' | 'overdue';
const view = ref<View>('catalog');
const sessionReady = ref(false);
const authenticated = ref(false);
const email = ref('');
const password = ref('');
const signInError = ref('');
const signInLoading = ref(false);
const signInHeading = ref<HTMLHeadingElement | null>(null);
const error = ref('');
const statusMessage = ref('');
const busy = ref(false);
const savingBook = ref(false);
const savingMember = ref(false);
const books = ref<Page<Book> | null>(null);
const members = ref<Page<Member> | null>(null);
const loans = ref<Page<Loan> | null>(null);
const search = ref('');
const category = ref('');
const status = ref('');
const sort = ref('title');
const direction = ref('asc');
const page = ref(1);
const issueTarget = ref<Book | null>(null);
const issueDialog = ref<HTMLDialogElement | null>(null);
const issueTrigger = ref<HTMLButtonElement | null>(null);
const returnTarget = ref<Loan | null>(null);
const returnDialog = ref<HTMLDialogElement | null>(null);
const returnTrigger = ref<HTMLButtonElement | null>(null);
const selectedMember = ref('');
const issueLoading = ref(false);
const issueError = ref('');
const returnError = ref('');
const returnLoading = ref(false);
const bookForm = ref({ title: '', author: '', isbn: '', category: '' });
const memberForm = ref({ name: '', email: '' });
const editingBook = ref<Book | null>(null);
const bookEditForm = ref({ title: '', author: '', isbn: '', category: '' });
const editingMember = ref<Member | null>(null);
const memberEditForm = ref({ name: '', email: '' });

const isStaffView = computed(() => ['books', 'members', 'loans', 'overdue'].includes(view.value));
const navigation: { id: View; label: string; private: boolean }[] = [
  { id: 'catalog', label: 'Catalog', private: false },
  { id: 'books', label: 'Manage books', private: true },
  { id: 'members', label: 'Members', private: true },
  { id: 'loans', label: 'Loans', private: true },
  { id: 'overdue', label: 'Overdue', private: true },
];
const visibleNavigation = computed(() => navigation.filter((item) => !item.private || authenticated.value));

watch(issueTarget, async (target, previous) => {
  await nextTick();
  const dialog = issueDialog.value;
  if (!dialog) return;
  if (target && !dialog.open) {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector('select')?.focus();
  } else if (!target && dialog.open) {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }
  if (previous && !target) {
    issueTrigger.value?.focus();
    issueTrigger.value = null;
  }
});

watch(returnTarget, async (target, previous) => {
  await nextTick();
  const dialog = returnDialog.value;
  if (!dialog) return;
  if (target && !dialog.open) {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector<HTMLButtonElement>('[data-confirm-return]')?.focus();
  } else if (!target && dialog.open) {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }
  if (previous && !target) {
    returnTrigger.value?.focus();
    returnTrigger.value = null;
  }
});

async function loadView(): Promise<void> {
  if (!authenticated.value) return;
  error.value = '';
  busy.value = true;
  try {
    if (view.value === 'catalog' || view.value === 'books') {
      books.value = await listBooks({
        q: search.value,
        category: category.value,
        status: status.value,
        sort: sort.value,
        direction: direction.value,
        page: page.value,
      });
    } else if (view.value === 'members') {
      members.value = await listMembers(page.value);
    } else if (view.value === 'loans') {
      loans.value = await listLoans(page.value);
    } else {
      loans.value = await listOverdueLoans(page.value);
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to load records.';
  } finally {
    busy.value = false;
  }
}

function go(next: View): void {
  statusMessage.value = '';
  view.value = next;
  page.value = 1;
  void loadView();
}

async function signIn(): Promise<void> {
  signInError.value = '';
  signInLoading.value = true;
  try {
    const result = await api<{ authenticated: boolean; csrf_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    authenticated.value = result.authenticated;
    setCsrfToken(result.csrf_token);
    password.value = '';
    go('books');
  } catch (reason) {
    signInError.value = reason instanceof Error ? reason.message : 'Unable to sign in.';
  } finally {
    signInLoading.value = false;
  }
}

function clearPrivateState(): void {
  authenticated.value = false;
  clearSessionState();
  books.value = null;
  members.value = null;
  loans.value = null;
  issueTarget.value = null;
  returnTarget.value = null;
  selectedMember.value = '';
  editingBook.value = null;
  editingMember.value = null;
  error.value = '';
  statusMessage.value = '';
  signInError.value = '';
  view.value = 'catalog';
  page.value = 1;
}

async function signOut(): Promise<void> {
  try {
    await api<void>('/auth/logout', { method: 'POST' });
    clearPrivateState();
    await nextTick();
    signInHeading.value?.focus();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to sign out.';
  }
}

function handleUnauthorized(): void {
  clearPrivateState();
  signInError.value = 'Your session has expired. Sign in again to continue.';
  void nextTick(() => signInHeading.value?.focus());
}

async function saveBook(): Promise<void> {
  savingBook.value = true;
  try {
    await createBook({ ...bookForm.value, status: 'available' });
    bookForm.value = { title: '', author: '', isbn: '', category: '' };
    await loadView();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to save book.';
  } finally {
    savingBook.value = false;
  }
}

function startBookEdit(book: Book): void {
  editingBook.value = book;
  bookEditForm.value = {
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    category: book.category,
  };
}

async function saveBookEdit(): Promise<void> {
  if (!editingBook.value) return;
  savingBook.value = true;
  try {
    await updateBook(editingBook.value._id, bookEditForm.value);
    editingBook.value = null;
    await loadView();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to update book.';
  } finally {
    savingBook.value = false;
  }
}

async function saveMember(): Promise<void> {
  savingMember.value = true;
  try {
    await createMember(memberForm.value);
    memberForm.value = { name: '', email: '' };
    await loadView();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to save member.';
  } finally {
    savingMember.value = false;
  }
}

function startMemberEdit(member: Member): void {
  editingMember.value = member;
  memberEditForm.value = { name: member.name, email: member.email };
}

async function saveMemberEdit(): Promise<void> {
  if (!editingMember.value) return;
  savingMember.value = true;
  try {
    await updateMember(editingMember.value._id, memberEditForm.value);
    editingMember.value = null;
    await loadView();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to update member.';
  } finally {
    savingMember.value = false;
  }
}

async function archiveBook(book: Book): Promise<void> {
  try {
    await deleteBook(book._id);
    await loadView();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to archive book.';
  }
}

async function archiveMember(member: Member): Promise<void> {
  try {
    await deleteMember(member._id);
    await loadView();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to archive member.';
  }
}

async function setMaintenance(book: Book): Promise<void> {
  try {
    await updateBook(book._id, { status: book.status === 'maintenance' ? 'available' : 'maintenance' });
    await loadView();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to update book status.';
  }
}

async function confirmIssue(): Promise<void> {
  if (!issueTarget.value || !selectedMember.value) return;
  issueLoading.value = true;
  issueError.value = '';
  try {
    const loan = await issueBook(issueTarget.value._id, selectedMember.value);
    issueTarget.value = null;
    selectedMember.value = '';
    statusMessage.value = `Book issued. Due date: ${loan.due_date}.`;
    await loadView();
  } catch (reason) {
    issueError.value = reason instanceof Error ? reason.message : 'Unable to issue book.';
  } finally {
    issueLoading.value = false;
  }
}

async function startIssue(book: Book, event: MouseEvent): Promise<void> {
  if (event.currentTarget instanceof HTMLButtonElement) issueTrigger.value = event.currentTarget;
  issueTarget.value = book;
  selectedMember.value = '';
  issueError.value = '';
  issueLoading.value = true;
  try {
    members.value = await listMembers(1, 100);
  } catch (reason) {
    issueError.value = reason instanceof Error ? reason.message : 'Unable to load members.';
  } finally {
    issueLoading.value = false;
  }
}

function startReturn(loan: Loan, event: MouseEvent): void {
  if (event.currentTarget instanceof HTMLButtonElement) returnTrigger.value = event.currentTarget;
  returnError.value = '';
  returnTarget.value = loan;
}

async function confirmReturn(): Promise<void> {
  if (!returnTarget.value) return;
  returnLoading.value = true;
  returnError.value = '';
  try {
    await returnLoan(returnTarget.value._id);
    returnTarget.value = null;
    statusMessage.value = 'Book returned.';
    await loadView();
  } catch (reason) {
    returnError.value = reason instanceof Error ? reason.message : 'Unable to return book.';
  } finally {
    returnLoading.value = false;
  }
}

function bookDetails(loan: Loan): string {
  const book = loan.book_id as Book;
  const member = loan.member_id as Member;
  return `${book?.title ?? 'Archived book'} — ${member?.name ?? 'Archived member'}`;
}

onMounted(async () => {
  window.addEventListener('library:unauthorized', handleUnauthorized);
  try {
    const state = await sessionState();
    authenticated.value = state.authenticated;
  } catch (reason) {
    authenticated.value = false;
    signInError.value = reason instanceof Error
      ? 'Unable to verify your session. Check the API connection and try again.'
      : 'Unable to verify your session.';
  } finally {
    sessionReady.value = true;
  }
  if (authenticated.value) await loadView();
});

onBeforeUnmount(() => {
  window.removeEventListener('library:unauthorized', handleUnauthorized);
});
</script>

<template>
  <main class="shell">
    <p v-if="!sessionReady" class="session-loading" role="status">Checking librarian session…</p>

    <header v-if="sessionReady && authenticated" class="topbar">
      <a class="brand" href="#" @click.prevent="go('catalog')">The Library</a>
      <nav aria-label="Main navigation">
        <button
          v-for="item in visibleNavigation"
          :key="item.id"
          type="button"
          :aria-current="view === item.id ? 'page' : undefined"
          @click="go(item.id)"
        >{{ item.label }}</button>
      </nav>
      <button v-if="authenticated" type="button" @click="signOut">Sign out</button>
    </header>

    <section v-else-if="sessionReady" class="signin" aria-labelledby="signin-heading">
      <h1 id="signin-heading" ref="signInHeading" tabindex="-1">Librarian sign in</h1>
      <form :aria-busy="signInLoading" @submit.prevent="signIn">
        <label>Email <input v-model="email" type="email" autocomplete="username" required /></label>
        <label>Password <input v-model="password" type="password" autocomplete="current-password" required /></label>
        <button type="submit" :disabled="signInLoading">
          {{ signInLoading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
      <p v-if="signInError" role="alert">{{ signInError }}</p>
    </section>

    <template v-if="authenticated && (view === 'catalog' || view === 'books')">
      <section class="page-heading">
        <p class="eyebrow">{{ view === 'catalog' ? 'Browse the collection' : 'Librarian workspace' }}</p>
        <h1>{{ view === 'catalog' ? 'Find your next read' : 'Book inventory' }}</h1>
      </section>
      <section class="filters" aria-label="Catalog search and filters">
        <label>Search title or author
          <input v-model="search" type="search" placeholder="Search the catalog" @input="page = 1; loadView()" />
        </label>
        <label>Category
          <input v-model="category" type="text" placeholder="Any category" @change="page = 1; loadView()" />
        </label>
        <label>Availability
          <select v-model="status" @change="page = 1; loadView()">
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="issued">Issued</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </label>
        <label>Sort by
          <select v-model="sort" @change="loadView()">
            <option value="title">Title</option>
            <option value="created_at">Date added</option>
            <option value="status_priority">Availability priority</option>
          </select>
        </label>
        <label>Direction
          <select v-model="direction" @change="loadView()">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
      </section>
      <section v-if="view === 'books' && authenticated" class="form-panel">
        <h2>Add a book</h2>
        <form class="inline-form" @submit.prevent="saveBook">
          <label>Title <input v-model="bookForm.title" required /></label>
          <label>Author <input v-model="bookForm.author" required /></label>
          <label>ISBN <input v-model="bookForm.isbn" required /></label>
          <label>Category <input v-model="bookForm.category" required /></label>
          <button type="submit" :disabled="savingBook">{{ savingBook ? 'Saving…' : 'Add book' }}</button>
        </form>
      </section>
      <section v-if="editingBook && view === 'books'" class="form-panel" aria-labelledby="edit-book-heading">
        <h2 id="edit-book-heading">Edit {{ editingBook.title }}</h2>
        <form class="inline-form" @submit.prevent="saveBookEdit">
          <label>Title <input v-model="bookEditForm.title" required /></label>
          <label>Author <input v-model="bookEditForm.author" required /></label>
          <label>ISBN <input v-model="bookEditForm.isbn" required /></label>
          <label>Category <input v-model="bookEditForm.category" required /></label>
          <button type="submit" :disabled="savingBook">{{ savingBook ? 'Saving…' : 'Save changes' }}</button>
          <button type="button" @click="editingBook = null">Cancel edit</button>
        </form>
      </section>
      <p v-if="error" class="notice" role="alert">{{ error }}</p>
      <p v-if="statusMessage" role="status" aria-live="polite">{{ statusMessage }}</p>
      <p v-if="busy" role="status">Loading books…</p>
      <p v-else-if="books && books.items.length === 0" class="empty" role="status" aria-live="polite">
        No books match these filters. Try changing your search.
      </p>
      <table v-else-if="books" class="data-table">
        <caption>Library catalog</caption>
        <thead><tr><th scope="col">Title</th><th scope="col">Author</th><th scope="col">Category</th><th scope="col">Status</th><th v-if="authenticated" scope="col">Actions</th></tr></thead>
        <tbody>
          <tr v-for="book in books.items" :key="book._id">
            <td>{{ book.title }}<small>{{ book.isbn }}</small></td>
            <td>{{ book.author }}</td><td>{{ book.category }}</td><td>{{ book.status }}</td>
            <td v-if="authenticated" class="actions">
              <button
                v-if="book.status === 'available'"
                type="button"
                @click="startIssue(book, $event)"
              >Issue</button>
              <button v-if="book.status !== 'issued'" type="button" @click="setMaintenance(book)">
                {{ book.status === 'maintenance' ? 'Mark available' : 'Maintenance' }}
              </button>
              <button v-if="view === 'books'" type="button" @click="startBookEdit(book)">Edit</button>
              <button type="button" @click="archiveBook(book)">Archive</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="books && books.totalPages > 1" class="pager" aria-live="polite">
        <button type="button" :disabled="page <= 1" @click="page--; loadView()">Previous</button>
        <span>Page {{ books.page }} of {{ books.totalPages }} ({{ books.total }} books)</span>
        <button type="button" :disabled="page >= books.totalPages" @click="page++; loadView()">Next</button>
      </div>
    </template>

    <section v-if="view === 'members' && authenticated" class="workspace">
      <h1>Members</h1>
      <form class="inline-form form-panel" @submit.prevent="saveMember">
        <label>Name <input v-model="memberForm.name" required /></label>
        <label>Email <input v-model="memberForm.email" type="email" required /></label>
        <button type="submit" :disabled="savingMember">{{ savingMember ? 'Saving…' : 'Register member' }}</button>
      </form>
      <form v-if="editingMember" class="inline-form form-panel" aria-label="Edit member" @submit.prevent="saveMemberEdit">
        <label>Name <input v-model="memberEditForm.name" required /></label>
        <label>Email <input v-model="memberEditForm.email" type="email" required /></label>
        <button type="submit" :disabled="savingMember">{{ savingMember ? 'Saving…' : 'Save changes' }}</button>
        <button type="button" @click="editingMember = null">Cancel edit</button>
      </form>
      <p v-if="error" class="notice" role="alert">{{ error }}</p>
      <p v-if="busy" role="status">Loading members…</p>
      <p v-else-if="members?.items.length === 0" class="empty" role="status" aria-live="polite">No members registered yet.</p>
      <table v-else-if="members" class="data-table">
        <caption>Library members</caption>
        <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Active loans</th><th scope="col">Actions</th></tr></thead>
        <tbody><tr v-for="member in members.items" :key="member._id">
          <td>{{ member.name }}</td><td>{{ member.email }}</td><td>{{ member.active_loans_count }}</td>
          <td class="actions">
            <button type="button" @click="startMemberEdit(member)">Edit</button>
            <button type="button" @click="archiveMember(member)">Archive</button>
          </td>
        </tr></tbody>
      </table>
      <div v-if="members && members.totalPages > 1" class="pager" aria-live="polite">
        <button type="button" :disabled="page <= 1" @click="page--; loadView()">Previous</button>
        <span>Page {{ members.page }} of {{ members.totalPages }} ({{ members.total }} members)</span>
        <button type="button" :disabled="page >= members.totalPages" @click="page++; loadView()">Next</button>
      </div>
    </section>

    <section v-if="(view === 'loans' || view === 'overdue') && authenticated" class="workspace">
      <h1>{{ view === 'overdue' ? 'Overdue loans' : 'Loan history' }}</h1>
      <p v-if="error" class="notice" role="alert">{{ error }}</p>
      <p v-if="statusMessage" role="status" aria-live="polite">{{ statusMessage }}</p>
      <p v-if="busy" role="status">Loading loans…</p>
      <p v-else-if="loans?.items.length === 0" class="empty" role="status" aria-live="polite">
        No {{ view === 'overdue' ? 'overdue loans' : 'loans' }} to show.
      </p>
      <table v-else-if="loans" class="data-table">
        <caption>{{ view === 'overdue' ? 'Overdue book loans' : 'Book loans' }}</caption>
        <thead><tr><th scope="col">Book and member</th><th scope="col">Issued</th><th scope="col">Due</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
        <tbody><tr v-for="loan in loans.items" :key="loan._id">
          <td>{{ bookDetails(loan) }}</td><td>{{ new Date(loan.issue_date).toLocaleDateString() }}</td>
          <td>{{ loan.due_date }}</td><td>{{ loan.status }}</td>
          <td>
            <button
              v-if="loan.status !== 'returned'"
              type="button"
              @click="startReturn(loan, $event)"
            >Return</button>
          </td>
        </tr></tbody>
      </table>
      <div v-if="loans && loans.totalPages > 1" class="pager" aria-live="polite">
        <button type="button" :disabled="page <= 1" @click="page--; loadView()">Previous</button>
        <span>Page {{ loans.page }} of {{ loans.totalPages }} ({{ loans.total }} loans)</span>
        <button type="button" :disabled="page >= loans.totalPages" @click="page++; loadView()">Next</button>
      </div>
    </section>

    <dialog
      ref="issueDialog"
      aria-labelledby="issue-heading"
      aria-modal="true"
      class="modal"
      @cancel.prevent="issueTarget = null"
    >
      <h2 id="issue-heading">Issue {{ issueTarget?.title }}</h2>
      <label>Member
        <select v-model="selectedMember" required :disabled="issueLoading">
          <option value="">Choose a member</option>
          <option v-for="member in members?.items ?? []" :key="member._id" :value="member._id">{{ member.name }} ({{ member.email }})</option>
        </select>
      </label>
      <p v-if="issueLoading" role="status">Loading members…</p>
      <p v-else-if="members?.items.length === 0" role="status">No members are registered yet.</p>
      <p v-if="issueError" role="alert">{{ issueError }}</p>
      <div class="actions">
        <button type="button" :disabled="!selectedMember || issueLoading" @click="confirmIssue">Confirm issue</button>
        <button type="button" @click="issueTarget = null">Cancel</button>
      </div>
    </dialog>

    <dialog
      ref="returnDialog"
      aria-labelledby="return-heading"
      aria-modal="true"
      class="modal"
      @cancel.prevent="returnTarget = null"
    >
      <h2 id="return-heading">Return book?</h2>
      <p>{{ returnTarget ? bookDetails(returnTarget) : '' }}</p>
      <p v-if="returnError" role="alert">{{ returnError }}</p>
      <div class="actions">
        <button type="button" data-confirm-return :disabled="returnLoading" @click="confirmReturn">
          {{ returnLoading ? 'Returning…' : 'Confirm return' }}
        </button>
        <button type="button" :disabled="returnLoading" @click="returnTarget = null">Cancel</button>
      </div>
    </dialog>
  </main>
</template>
