// =========================================
// 🧪 Automated Tests for Persons + Todos API
// 👩‍💻 Yasmin Akter - Karelia UAS ICT 2026
// =========================================

const request = require('supertest');
const app = require('../../server'); // আপনার ফোল্ডার স্ট্রাকচার অনুযায়ী পাথ ঠিক করা হয়েছে

let token;
let personId;
let todoId;

describe('1. Auth Tests', () => {
  test('Login should return a valid JWT token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: '2310637@edu.karelia.fi', password: 'Yasmin2026?' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test('Protected endpoint (/persons) should reject request without token', async () => {
    const res = await request(app).get('/persons');
    expect(res.status).toBe(401);
  });
});

describe('2. Persons CRUD', () => {
  test('POST /persons should create a new person', async () => {
    const res = await request(app)
      .post('/persons')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test User', email: 'unique_test@karelia.fi' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    personId = res.body.id; // পরবর্তী টেস্টের জন্য সেভ করা হলো
  });

  test('POST /persons should reject duplicate email with 409', async () => {
    const res = await request(app)
      .post('/persons')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Duplicate User', email: 'unique_test@karelia.fi' });
    expect(res.status).toBe(409);
  });
});

describe('3. Todos CRUD & Validation', () => {
  test('POST /todos should create an unassigned todo', async () => {
    const res = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Task', state: 'todo' });
    expect(res.status).toBe(201);
    expect(res.body.assigneeId).toBeNull();
    todoId = res.body.id;
  });

  test('POST /todos should reject invalid state (e.g., "waiting")', async () => {
    const res = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad Task', state: 'waiting' });
    expect(res.status).toBe(400);
  });
});

describe('4. Assignment & Filtering Logic', () => {
  test('Assign a todo to a person via PUT', async () => {
    const res = await request(app)
      .put(`/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assigneeId: personId });
    expect(res.status).toBe(200);
    expect(res.body.assigneeId).toBe(personId);
  });

  test('Reject assignment to non-existent personId', async () => {
    const res = await request(app)
      .put(`/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assigneeId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(400);
  });

  test('Filter: GET /todos?unassigned=true', async () => {
    // একটি আন-অ্যাসাইনড টোডো তৈরি করে নিচ্ছি
    await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lonely Task', assigneeId: null });

    const res = await request(app)
      .get('/todos?unassigned=true')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    res.body.forEach(t => expect(t.assigneeId).toBeNull());
  });
});

describe('5. Cleanup', () => {
  test('DELETE /todos/:id should work', async () => {
    const res = await request(app)
      .delete(`/todos/${todoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  test('DELETE /persons/:id should work', async () => {
    const res = await request(app)
      .delete(`/persons/${personId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});