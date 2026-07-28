const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

const AUTH = ['admin', 'secret'];

describe('/api/admin/seating — tables', () => {
  let app, db;

  beforeEach(() => {
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    db = initDb(':memory:');
    app = createApp(db);
  });
  afterEach(() => {
    db.close();
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
  });

  test('requires auth', async () => {
    expect((await request(app).get('/api/admin/seating')).status).toBe(401);
  });

  test('creates a table', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name: 'Olijf' });
    expect(res.status).toBe(201);
    expect(res.body.table_number).toBe(1);
    expect(res.body.name).toBe('Olijf');
  });

  test('stores an empty name as null', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name: '   ' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBeNull();
  });

  test('rejects a non-positive table_number', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_table_number');
  });

  test('rejects a name over 60 chars', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name: 'x'.repeat(61) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_table_name');
  });

  test('rejects a duplicate table_number with 409', async () => {
    await request(app).post('/api/admin/seating/tables').auth(...AUTH).send({ table_number: 1 });
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('table_number_taken');
  });

  test('renames and renumbers', async () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    const res = await request(app).patch(`/api/admin/seating/tables/${t.id}`)
      .auth(...AUTH).send({ table_number: 4, name: 'Munt' });
    expect(res.status).toBe(200);
    expect(res.body.table_number).toBe(4);
    expect(res.body.name).toBe('Munt');
  });

  test('patching only the number keeps the existing name', async () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    const res = await request(app).patch(`/api/admin/seating/tables/${t.id}`)
      .auth(...AUTH).send({ table_number: 4 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Olijf');
  });

  test('patching a missing table is 404', async () => {
    const res = await request(app).patch('/api/admin/seating/tables/999')
      .auth(...AUTH).send({ table_number: 4 });
    expect(res.status).toBe(404);
  });

  test('deletes a table and its assignments', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    db.createSeatingAssignment({ table_id: t.id, guest_name: 'Oma Julia' });
    const res = await request(app).delete(`/api/admin/seating/tables/${t.id}`).auth(...AUTH);
    expect(res.status).toBe(204);
    expect(db._rawAll('SELECT id FROM seating_assignments')).toHaveLength(0);
  });

  test('publish toggle round-trips', async () => {
    const res = await request(app).put('/api/admin/seating/published')
      .auth(...AUTH).send({ published: true });
    expect(res.status).toBe(200);
    expect(res.body.published).toBe(true);
    expect(db.isSeatingPublished()).toBe(true);

    const off = await request(app).put('/api/admin/seating/published')
      .auth(...AUTH).send({ published: false });
    expect(off.body.published).toBe(false);
  });

  test('rejects a non-boolean published value', async () => {
    const res = await request(app).put('/api/admin/seating/published')
      .auth(...AUTH).send({ published: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_published');
  });

  test('every route requires auth', async () => {
    const t = db.createSeatingTable({ table_number: 1 });
    const responses = await Promise.all([
      request(app).get('/api/admin/seating'),
      request(app).post('/api/admin/seating/tables').send({ table_number: 2 }),
      request(app).patch(`/api/admin/seating/tables/${t.id}`).send({ table_number: 2 }),
      request(app).delete(`/api/admin/seating/tables/${t.id}`),
      request(app).put('/api/admin/seating/published').send({ published: true }),
    ]);
    expect(responses.map(r => r.status)).toEqual([401, 401, 401, 401, 401]);
    // and nothing was mutated
    expect(db.getSeatingTableById(t.id)).not.toBeNull();
    expect(db.isSeatingPublished()).toBe(false);
  });

  test('renumbering onto a taken number is 409', async () => {
    db.createSeatingTable({ table_number: 1 });
    const b = db.createSeatingTable({ table_number: 2, name: 'Munt' });
    const res = await request(app).patch(`/api/admin/seating/tables/${b.id}`)
      .auth(...AUTH).send({ table_number: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('table_number_taken');
    // unchanged
    expect(db.getSeatingTableById(b.id).table_number).toBe(2);
  });

  test('a non-unique database error surfaces as a 500 JSON response', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const boom = Object.assign(new Error('disk I/O error'), { errcode: 10 });
    db.createSeatingTable = () => { throw boom; };

    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1 });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    spy.mockRestore();
  });

  test('accepts an explicit null name', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name: null });
    expect(res.status).toBe(201);
    expect(res.body.name).toBeNull();
  });

  test('rejects a non-string name', async () => {
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_table_name');
  });

  test('accepts a 60-char name', async () => {
    const name = 'x'.repeat(60);
    const res = await request(app).post('/api/admin/seating/tables')
      .auth(...AUTH).send({ table_number: 1, name });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(name);
  });

  test('patching with an empty body is a no-op', async () => {
    const t = db.createSeatingTable({ table_number: 3, name: 'Olijf' });
    const res = await request(app).patch(`/api/admin/seating/tables/${t.id}`)
      .auth(...AUTH).send({});
    expect(res.status).toBe(200);
    expect(res.body.table_number).toBe(3);
    expect(res.body.name).toBe('Olijf');
  });

  test('patching with no body at all is a no-op', async () => {
    const t = db.createSeatingTable({ table_number: 3, name: 'Olijf' });
    const res = await request(app).patch(`/api/admin/seating/tables/${t.id}`).auth(...AUTH);
    expect(res.status).toBe(200);
    expect(res.body.table_number).toBe(3);
    expect(res.body.name).toBe('Olijf');
  });

  test('patching name to null clears it', async () => {
    const t = db.createSeatingTable({ table_number: 3, name: 'Olijf' });
    const res = await request(app).patch(`/api/admin/seating/tables/${t.id}`)
      .auth(...AUTH).send({ name: null });
    expect(res.status).toBe(200);
    expect(res.body.table_number).toBe(3);
    expect(res.body.name).toBeNull();
  });

  test('GET returns published state, tables with assignments and unseated guests', async () => {
    const t = db.createSeatingTable({ table_number: 1, name: 'Olijf' });
    db.createSeatingAssignment({ table_id: t.id, guest_name: 'Oma Julia' });
    const res = await request(app).get('/api/admin/seating').auth(...AUTH);
    expect(res.status).toBe(200);
    expect(res.body.published).toBe(false);
    expect(res.body.tables).toHaveLength(1);
    expect(res.body.tables[0].assignments).toHaveLength(1);
    expect(Array.isArray(res.body.unseated)).toBe(true);
  });
});
