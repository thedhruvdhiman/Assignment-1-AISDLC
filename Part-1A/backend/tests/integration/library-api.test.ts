import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/app';
import { Book } from '../../src/models/book.model';
import { Loan } from '../../src/models/loan.model';
import { Librarian } from '../../src/models/librarian.model';
import { Member } from '../../src/models/member.model';
import { hashPassword } from '../../src/services/auth.service';
import { provisionLibrarianAccount } from '../../src/services/librarian-provisioning.service';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../support/mongodb-replica-set';

const agent = request.agent(app);
let csrfToken = '';

beforeAll(async () => {
  await connectTestDatabase();
  await Promise.all([Book.init(), Loan.init(), Member.init(), Librarian.init()]);
});

beforeEach(async () => {
  await clearTestDatabase();
  await Librarian.create({
    email_normalized: 'librarian@example.com',
    password_hash: await hashPassword('test-password-123'),
  });
  const session = await agent.get('/api/auth/session').expect(200);
  csrfToken = session.body.csrf_token as string;
  const login = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrfToken)
    .send({ email: 'librarian@example.com', password: 'test-password-123' })
    .expect(200);
  csrfToken = login.body.csrf_token as string;
});

afterAll(async () => {
  await disconnectTestDatabase();
});

describe('librarian access and atomic loan workflows', () => {
  it('provisions an account once and leaves existing credentials unchanged on repeat', async () => {
    const first = await provisionLibrarianAccount('New.Librarian@example.com', 'a-strong-password');
    const stored = await Librarian.findOne({ email_normalized: 'new.librarian@example.com' });
    const originalHash = stored?.password_hash;
    const second = await provisionLibrarianAccount('new.librarian@example.com', 'different-password');
    const unchanged = await Librarian.findOne({ email_normalized: 'new.librarian@example.com' });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(unchanged?.password_hash).toBe(originalHash);
  });

  it('rejects invalid credentials and regenerates the session after successful login', async () => {
    const unauthenticatedAgent = request.agent(app);
    const before = await unauthenticatedAgent.get('/api/auth/session').expect(200);

    await unauthenticatedAgent
      .post('/api/auth/login')
      .set('X-CSRF-Token', before.body.csrf_token as string)
      .send({ email: 'librarian@example.com', password: 'wrong-password' })
      .expect(401);
    expect((await unauthenticatedAgent.get('/api/auth/session').expect(200)).body.authenticated).toBe(false);

    const freshSession = await unauthenticatedAgent.get('/api/auth/session').expect(200);
    const login = await unauthenticatedAgent
      .post('/api/auth/login')
      .set('X-CSRF-Token', freshSession.body.csrf_token as string)
      .send({ email: 'librarian@example.com', password: 'test-password-123' })
      .expect(200);
    expect(login.body.csrf_token).not.toBe(freshSession.body.csrf_token);
    expect((await unauthenticatedAgent.get('/api/auth/session').expect(200)).body.authenticated).toBe(true);
    await unauthenticatedAgent
      .post('/api/auth/logout')
      .set('X-CSRF-Token', login.body.csrf_token as string)
      .expect(204);
    expect((await unauthenticatedAgent.get('/api/auth/session').expect(200)).body.authenticated).toBe(false);
  });

  it('requires a librarian session for catalog, member, and loan reads', async () => {
    await agent.post('/api/auth/logout').set('X-CSRF-Token', csrfToken).expect(204);
    await request(app).get('/api/books').expect(401);
    await request(app).get(`/api/books/${new mongoose.Types.ObjectId().toString()}`).expect(401);
    await request(app).get('/api/members').expect(401);
    await request(app).get('/api/loans').expect(401);
  });

  it('rejects state changes without a valid CSRF token and exposes health status', async () => {
    await agent
      .post('/api/books')
      .send({ title: 'No Token', author: 'Staff', isbn: 'NO-TOKEN', category: 'Reference' })
      .expect(403);
    await request(app).get('/api/health').expect(200);
  });

  it('issues and returns a book with consistent inventory and member counts', async () => {
    const book = await Book.create({
      title: 'The Left Hand of Darkness',
      author: 'Ursula K. Le Guin',
      isbn: '9780441478125',
      isbn_normalized: '9780441478125',
      category: 'Science Fiction',
    });
    const member = await Member.create({
      name: 'A. Reader',
      email: 'reader@example.com',
      email_normalized: 'reader@example.com',
    });

    const issued = await agent
      .post('/api/loans/issue')
      .set('X-CSRF-Token', csrfToken)
      .send({ book_id: book.id, member_id: member.id })
      .expect(201);
    expect(issued.body.status).toBe('active');
    expect(issued.body.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((await Book.findById(book.id))?.status).toBe('issued');
    expect((await Member.findById(member.id))?.active_loans_count).toBe(1);
    expect(await Loan.countDocuments({ book_id: book.id, return_date: null })).toBe(1);
    await agent.delete(`/api/books/${book.id}`).set('X-CSRF-Token', csrfToken).expect(409);
    await agent.delete(`/api/members/${member.id}`).set('X-CSRF-Token', csrfToken).expect(409);
    await agent
      .patch(`/api/books/${book.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'available' })
      .expect(409);

    await agent
      .post(`/api/loans/return/${issued.body._id as string}`)
      .set('X-CSRF-Token', csrfToken)
      .expect(200);
    expect((await Book.findById(book.id))?.status).toBe('available');
    expect((await Member.findById(member.id))?.active_loans_count).toBe(0);
    expect(await Loan.countDocuments({ book_id: book.id, return_date: { $ne: null } })).toBe(1);
  });

  it('rejects concurrent duplicate issues and leaves only one active loan', async () => {
    const book = await Book.create({
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: '9780441172719',
      isbn_normalized: '9780441172719',
      category: 'Science Fiction',
    });
    const first = await Member.create({
      name: 'Reader One',
      email: 'one@example.com',
      email_normalized: 'one@example.com',
    });
    const second = await Member.create({
      name: 'Reader Two',
      email: 'two@example.com',
      email_normalized: 'two@example.com',
    });
    const results = await Promise.all([
      agent.post('/api/loans/issue').set('X-CSRF-Token', csrfToken).send({ book_id: book.id, member_id: first.id }),
      agent.post('/api/loans/issue').set('X-CSRF-Token', csrfToken).send({ book_id: book.id, member_id: second.id }),
    ]);

    expect(results.filter((result) => result.status === 201)).toHaveLength(1);
    expect(results.filter((result) => [400, 409].includes(result.status))).toHaveLength(1);
    expect(await Loan.countDocuments({ book_id: book.id, return_date: null })).toBe(1);
    const counts = await Member.aggregate([{ $group: { _id: null, total: { $sum: '$active_loans_count' } } }]);
    expect(counts[0]?.total).toBe(1);
  });

  it('rejects an unavailable book and does not create an extra loan', async () => {
    const book = await Book.create({
      title: 'Maintenance Book',
      author: 'Staff',
      isbn: 'TEST-MAINT-1',
      isbn_normalized: 'test-maint-1',
      category: 'Reference',
      status: 'maintenance',
    });
    const member = await Member.create({
      name: 'Reader',
      email: 'reader@example.com',
      email_normalized: 'reader@example.com',
    });
    await agent
      .post('/api/loans/issue')
      .set('X-CSRF-Token', csrfToken)
      .send({ book_id: book.id, member_id: member.id })
      .expect(400);
    expect(await Loan.countDocuments()).toBe(0);
    expect((await Member.findById(member.id))?.active_loans_count).toBe(0);
  });

  it('rolls back book status when the selected member does not exist', async () => {
    const book = await Book.create({
      title: 'Missing Member',
      author: 'Staff',
      isbn: 'MISSING-MEMBER-1',
      isbn_normalized: 'missing-member-1',
      category: 'Reference',
    });

    await agent
      .post('/api/loans/issue')
      .set('X-CSRF-Token', csrfToken)
      .send({ book_id: book.id, member_id: new mongoose.Types.ObjectId().toString() })
      .expect(404);

    expect((await Book.findById(book.id))?.status).toBe('available');
    expect(await Loan.countDocuments({ book_id: book.id })).toBe(0);
  });

  it('supports book and member CRUD with normalized unique values', async () => {
    await agent
      .post('/api/books')
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .expect(400);
    const book = await agent
      .post('/api/books')
      .set('X-CSRF-Token', csrfToken)
      .send({ title: '  Test Book ', author: 'Test Author', isbn: 'AbC-123', category: 'Fiction' })
      .expect(201);
    expect(book.body.title).toBe('Test Book');
    await agent.get(`/api/books/${book.body._id as string}`).expect(200);
    await agent
      .post('/api/books')
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Duplicate', author: 'Test Author', isbn: 'abc-123', category: 'Fiction' })
      .expect(409);
    await agent
      .patch(`/api/books/${book.body._id as string}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Updated Book' })
      .expect(200);
    await agent.delete(`/api/books/${book.body._id as string}`).set('X-CSRF-Token', csrfToken).expect(204);
    await agent.get(`/api/books/${new mongoose.Types.ObjectId().toString()}`).expect(404);
    await agent.get('/api/books/not-an-id').expect(400);

    const member = await agent
      .post('/api/members')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Test Member', email: 'Member@example.com' })
      .expect(201);
    await agent.get(`/api/members/${member.body._id as string}`).expect(200);
    await agent
      .post('/api/members')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Duplicate', email: 'member@EXAMPLE.com' })
      .expect(409);
    await agent
      .patch(`/api/members/${member.body._id as string}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Updated Member' })
      .expect(200);
    await agent.get(`/api/members/${new mongoose.Types.ObjectId().toString()}`).expect(404);
    await agent.get('/api/members/not-an-id').expect(400);
    await agent.delete(`/api/members/${member.body._id as string}`).set('X-CSRF-Token', csrfToken).expect(204);
  });

  it('rolls back unavailable issue references and rejects repeated returns', async () => {
    await agent
      .post('/api/loans/issue')
      .set('X-CSRF-Token', csrfToken)
      .send({ book_id: 'invalid', member_id: 'invalid' })
      .expect(400);
    const book = await Book.create({
      title: 'Atomicity',
      author: 'Staff',
      isbn: 'ATOMIC-1',
      isbn_normalized: 'atomic-1',
      category: 'Reference',
    });
    await agent
      .post('/api/loans/issue')
      .set('X-CSRF-Token', csrfToken)
      .send({ book_id: book.id, member_id: new mongoose.Types.ObjectId().toString() })
      .expect(404);
    expect((await Book.findById(book.id))?.status).toBe('available');
    expect(await Loan.countDocuments()).toBe(0);
    await agent
      .post(`/api/loans/return/${new mongoose.Types.ObjectId().toString()}`)
      .set('X-CSRF-Token', csrfToken)
      .expect(404);
    await agent.post('/api/loans/return/not-an-id').set('X-CSRF-Token', csrfToken).expect(400);

    const member = await Member.create({
      name: 'Reader',
      email: 'return@example.com',
      email_normalized: 'return@example.com',
    });
    const issued = await agent
      .post('/api/loans/issue')
      .set('X-CSRF-Token', csrfToken)
      .send({ book_id: book.id, member_id: member.id })
      .expect(201);
    const returnPath = `/api/loans/return/${issued.body._id as string}`;
    await agent.post(returnPath).set('X-CSRF-Token', csrfToken).expect(200);
    await agent.post(returnPath).set('X-CSRF-Token', csrfToken).expect(409);
  });

  it('rolls back every return mutation if a related record cannot be updated', async () => {
    const book = await Book.create({
      title: 'Return Rollback',
      author: 'Staff',
      isbn: 'RETURN-ROLLBACK',
      isbn_normalized: 'return-rollback',
      category: 'Reference',
    });
    const member = await Member.create({
      name: 'Rollback Reader',
      email: 'rollback@example.com',
      email_normalized: 'rollback@example.com',
    });
    const issued = await agent
      .post('/api/loans/issue')
      .set('X-CSRF-Token', csrfToken)
      .send({ book_id: book.id, member_id: member.id })
      .expect(201);
    await Member.updateOne({ _id: member.id }, { $set: { active_loans_count: 0 } });

    const failure = await agent
      .post(`/api/loans/return/${issued.body._id as string}`)
      .set('X-CSRF-Token', csrfToken)
      .expect(500);
    expect(failure.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected server error occurred.',
    });
    expect((await Loan.findById(issued.body._id as string))?.return_date).toBeFalsy();
    expect((await Book.findById(book.id))?.status).toBe('issued');
  });

  it('lists only outstanding loans past their due date as overdue', async () => {
    const [book, futureBook, todayBook, member] = await Promise.all([
      Book.create({
        title: 'Overdue Test',
        author: 'Staff',
        isbn: 'OVERDUE-1',
        isbn_normalized: 'overdue-1',
        category: 'Reference',
      }),
      Book.create({
        title: 'Future Test',
        author: 'Staff',
        isbn: 'OVERDUE-2',
        isbn_normalized: 'overdue-2',
        category: 'Reference',
      }),
      Book.create({
        title: 'Due Today Test',
        author: 'Staff',
        isbn: 'OVERDUE-3',
        isbn_normalized: 'overdue-3',
        category: 'Reference',
      }),
      Member.create({
        name: 'Overdue Reader',
        email: 'overdue@example.com',
        email_normalized: 'overdue@example.com',
      }),
    ]);
    await Loan.create([
      { book_id: book.id, member_id: member.id, issue_date: new Date('2020-01-01'), due_date: '2020-01-15' },
      { book_id: futureBook.id, member_id: member.id, issue_date: new Date(), due_date: '2999-01-01' },
      {
        book_id: todayBook.id,
        member_id: member.id,
        issue_date: new Date(),
        due_date: new Date().toISOString().slice(0, 10),
      },
      {
        book_id: book.id,
        member_id: member.id,
        issue_date: new Date('2020-01-01'),
        due_date: '2020-01-15',
        return_date: new Date('2020-01-10'),
      },
    ]);
    const orphan = await Loan.create({
      book_id: new mongoose.Types.ObjectId(),
      member_id: member.id,
      issue_date: new Date('2020-01-01'),
      due_date: '2020-01-15',
    });
    const orphanResponse = await agent.get(`/api/loans/${orphan.id}`).expect(200);
    expect(orphanResponse.body.book_id).toBeNull();
    await Loan.deleteOne({ _id: orphan._id });

    const overdue = await agent.get('/api/loans/overdue').expect(200);
    expect(overdue.body.total).toBe(1);
    expect(overdue.body.items[0].status).toBe('overdue');
    expect((await agent.get('/api/loans/overdue?page=1&pageSize=1').expect(200)).body.total).toBe(1);
    expect((await agent.get('/api/loans?status=active').expect(200)).body.total).toBe(2);
    expect((await agent.get('/api/loans?status=returned').expect(200)).body.total).toBe(1);
  });

  it('searches and filters books case-insensitively with validated pagination and stable sorting', async () => {
    const first = await Book.create({
      title: 'Alpha Library',
      author: 'Reader',
      isbn: 'SEARCH-1',
      isbn_normalized: 'search-1',
      category: 'Fiction',
    });
    const second = await Book.create({
      title: 'Alpha Library',
      author: 'Reader Two',
      isbn: 'SEARCH-2',
      isbn_normalized: 'search-2',
      category: 'Fiction',
    });
    await Book.create({
      title: 'Beta Library',
      author: 'Another',
      isbn: 'SEARCH-3',
      isbn_normalized: 'search-3',
      category: 'Reference',
      status: 'maintenance',
    });

    const filtered = await agent
      .get('/api/books?q=ALPHA&category=Fiction&status=available&sort=title')
      .expect(200);
    expect(filtered.body.total).toBe(2);
    expect(filtered.body.items.map((item: { _id: string }) => item._id)).toEqual(
      [first.id, second.id].sort(),
    );
    const secondPage = await agent.get('/api/books?q=ALPHA&category=Fiction&page=2&pageSize=1').expect(200);
    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.items[0]._id).toBe(second.id);
    expect((await agent.get('/api/books?sort=title&direction=desc').expect(200)).body.items[0].title).toBe('Beta Library');
    expect((await agent.get('/api/books?q=.&pageSize=1').expect(200)).body.total).toBe(0);
    expect((await agent.get('/api/books?status=invalid').expect(400)).body.code).toBe('INVALID_QUERY');
    expect((await agent.get('/api/books?pageSize=101').expect(400)).body.code).toBe('INVALID_PAGINATION');
  });
});
