const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const request = require('supertest');
const { initDb } = require('../src/db');
const { createApp } = require('../src/app');
const { ensureMediaDirs } = require('../src/media/storage');

const fx = (n) => path.join(__dirname, 'fixtures', n);

describe('POST /api/photos', () => {
  let app, db, mediaDir;

  beforeAll(() => {
    process.env.GUEST_UPLOAD_PASSWORD = 'love2026';
    process.env.COOKIE_SECRET = 'test-secret';
  });

  beforeEach(() => {
    mediaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'photos-up-'));
    ensureMediaDirs(mediaDir);
    db = initDb(':memory:');
    app = createApp(db, { mediaDir });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(mediaDir, { recursive: true, force: true });
  });

  async function loggedInAgent() {
    const agent = request.agent(app);
    const r = await agent.post('/api/photos/session').send({ password: 'love2026' });
    expect(r.status).toBe(204);
    return agent;
  }

  test('rejects with 401 when not authenticated', async () => {
    const res = await request(app).post('/api/photos').attach('file', fx('sample.jpg'));
    expect(res.status).toBe(401);
  });

  test('uploads a JPEG, writes files, creates DB row', async () => {
    const agent = await loggedInAgent();
    const res = await agent.post('/api/photos')
      .field('caption', 'a card')
      .field('uploader_name', 'Marie')
      .attach('file', fx('sample.jpg'));
    expect(res.status).toBe(201);
    expect(res.body.media_type).toBe('photo');
    expect(res.body.caption).toBe('a card');
    expect(res.body.media_url).toMatch(/^\/media\//);
    expect(res.body.thumb_url).toMatch(/^\/media\/thumbs\//);
    expect(fs.existsSync(path.join(mediaDir, 'originals', res.body.filename))).toBe(true);
    expect(fs.existsSync(path.join(mediaDir, 'thumbs', res.body.thumb_filename))).toBe(true);
    expect(db.listAllGuestPhotos()).toHaveLength(1);
  }, 20000);

  test('uploads an MP4', async () => {
    const agent = await loggedInAgent();
    const res = await agent.post('/api/photos').attach('file', fx('sample.mp4'));
    expect(res.status).toBe(201);
    expect(res.body.media_type).toBe('video');
    expect(res.body.duration_sec).toBeGreaterThan(0);
  }, 60000);

  test('rejects video over duration cap', async () => {
    const agent = await loggedInAgent();
    const res = await agent.post('/api/photos').attach('file', fx('long.mp4'));
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/duration|too_long/i);
  }, 60000);

  test('rejects garbage with 415', async () => {
    const agent = await loggedInAgent();
    const res = await agent.post('/api/photos').attach('file', fx('not-an-image.bin'));
    expect(res.status).toBe(415);
  });

  test('rejects when no file is attached with 400', async () => {
    const agent = await loggedInAgent();
    const res = await agent.post('/api/photos').field('caption', 'hi');
    expect(res.status).toBe(400);
  });
});
