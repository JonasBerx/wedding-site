const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');

describe('GET /api/registry', () => {
  let app, db;
  beforeEach(() => { db = initDb(':memory:'); app = createApp(db); });
  afterEach(() => { db.close(); });

  test('returns empty array when no items', async () => {
    const res = await request(app).get('/api/registry');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns items with claimed:false when unclaimed', async () => {
    db.insertRegistryItem({ title: 'Honeymoon fund', description: 'Contribution' });
    const res = await request(app).get('/api/registry');
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ title: 'Honeymoon fund', claimed: false });
    expect(res.body[0]).not.toHaveProperty('claimed_by_rsvp_id');
  });

  test('returns claimed:true when item is claimed', async () => {
    db.insertRegistryItem({ title: 'Test' });
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    const [item] = db.getAllRegistryItems();
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);
    const res = await request(app).get('/api/registry');
    expect(res.body[0].claimed).toBe(true);
  });
});

describe('GET /api/registry/validate', () => {
  let app, db;
  beforeEach(() => {
    db = initDb(':memory:');
    app = createApp(db);
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
  });
  afterEach(() => { db.close(); });

  test('returns 404 for unknown email', async () => {
    const res = await request(app).get('/api/registry/validate?email=nobody@example.com');
    expect(res.status).toBe(404);
  });

  test('returns 400 if email param missing', async () => {
    const res = await request(app).get('/api/registry/validate');
    expect(res.status).toBe(400);
  });

  test('returns claimedItemId:null when no claim', async () => {
    const res = await request(app).get('/api/registry/validate?email=alice@example.com');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ claimedItemId: null });
  });

  test('returns claimedItemId when guest has a claim', async () => {
    db.insertRegistryItem({ title: 'Test' });
    const [item] = db.getAllRegistryItems();
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);
    const res = await request(app).get('/api/registry/validate?email=alice@example.com');
    expect(res.body.claimedItemId).toBe(item.id);
  });
});

describe('POST /api/registry/claim', () => {
  let app, db;
  beforeEach(() => {
    db = initDb(':memory:');
    app = createApp(db);
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    db.insertRegistryItem({ title: 'Honeymoon fund' });
  });
  afterEach(() => { db.close(); });

  test('returns 400 if item_id missing', async () => {
    const res = await request(app).post('/api/registry/claim').send({ email: 'alice@example.com' });
    expect(res.status).toBe(400);
  });

  test('returns 400 if email missing', async () => {
    const [item] = db.getAllRegistryItems();
    const res = await request(app).post('/api/registry/claim').send({ item_id: item.id });
    expect(res.status).toBe(400);
  });

  test('returns 404 if email not in RSVPs', async () => {
    const [item] = db.getAllRegistryItems();
    const res = await request(app).post('/api/registry/claim')
      .send({ item_id: item.id, email: 'unknown@example.com' });
    expect(res.status).toBe(404);
  });

  test('claims item successfully', async () => {
    const [item] = db.getAllRegistryItems();
    const res = await request(app).post('/api/registry/claim')
      .send({ item_id: item.id, email: 'alice@example.com' });
    expect(res.status).toBe(200);
    expect(db.getRegistryItemById(item.id).claimed_by_rsvp_id).not.toBeNull();
  });

  test('returns 409 if item already claimed by someone else', async () => {
    db.insertRsvp({ name: 'Bob', email: 'bob@example.com', attending: 1 });
    const [item] = db.getAllRegistryItems();
    const alice = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, alice.id);
    const res = await request(app).post('/api/registry/claim')
      .send({ item_id: item.id, email: 'bob@example.com' });
    expect(res.status).toBe(409);
  });

  test('returns 409 if guest already has a different claim', async () => {
    db.insertRegistryItem({ title: 'Second item' });
    const [item1, item2] = db.getAllRegistryItems();
    await request(app).post('/api/registry/claim')
      .send({ item_id: item1.id, email: 'alice@example.com' });
    const res = await request(app).post('/api/registry/claim')
      .send({ item_id: item2.id, email: 'alice@example.com' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/registry/unclaim', () => {
  let app, db;
  beforeEach(() => {
    db = initDb(':memory:');
    app = createApp(db);
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    db.insertRegistryItem({ title: 'Honeymoon fund' });
    const [item] = db.getAllRegistryItems();
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);
  });
  afterEach(() => { db.close(); });

  test('returns 400 if fields missing', async () => {
    const res = await request(app).post('/api/registry/unclaim').send({ email: 'alice@example.com' });
    expect(res.status).toBe(400);
  });

  test('returns 404 if email not in RSVPs', async () => {
    const [item] = db.getAllRegistryItems();
    const res = await request(app).post('/api/registry/unclaim')
      .send({ item_id: item.id, email: 'unknown@example.com' });
    expect(res.status).toBe(404);
  });

  test('returns 403 if item claimed by someone else', async () => {
    db.insertRsvp({ name: 'Bob', email: 'bob@example.com', attending: 1 });
    const [item] = db.getAllRegistryItems();
    const res = await request(app).post('/api/registry/unclaim')
      .send({ item_id: item.id, email: 'bob@example.com' });
    expect(res.status).toBe(403);
  });

  test('unclaims successfully', async () => {
    const [item] = db.getAllRegistryItems();
    const res = await request(app).post('/api/registry/unclaim')
      .send({ item_id: item.id, email: 'alice@example.com' });
    expect(res.status).toBe(200);
    expect(db.getRegistryItemById(item.id).claimed_by_rsvp_id).toBeNull();
  });
});

describe('unclaimable items', () => {
  let app, db;
  beforeEach(() => { db = initDb(':memory:'); app = createApp(db); });
  afterEach(()  => { db.close(); });

  test('GET /api/registry includes unclaimable on each item', async () => {
    db.insertRegistryItem({ title: 'Espresso machine' });
    db.insertRegistryItem({ title: 'Cash gift', unclaimable: true });
    const res = await request(app).get('/api/registry');
    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual(expect.objectContaining({ title: 'Espresso machine', unclaimable: 0, claimed: false }));
    expect(res.body[1]).toEqual(expect.objectContaining({ title: 'Cash gift', unclaimable: 1, claimed: false }));
  });

  test('POST /api/registry/claim rejects unclaimable item with 400', async () => {
    db.insertRegistryItem({ title: 'Cash gift', unclaimable: true });
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    const [item] = db.getAllRegistryItems();
    const res = await request(app).post('/api/registry/claim')
      .send({ item_id: item.id, email: 'alice@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('unclaimable');
    const reread = db.getRegistryItemById(item.id);
    expect(reread.claimed_by_rsvp_id).toBeNull();
  });

  test('POST /api/registry/unclaim rejects unclaimable item with 400', async () => {
    db.insertRegistryItem({ title: 'Cash gift', unclaimable: true });
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    const [item] = db.getAllRegistryItems();
    const res = await request(app).post('/api/registry/unclaim')
      .send({ item_id: item.id, email: 'alice@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('unclaimable');
  });
});
