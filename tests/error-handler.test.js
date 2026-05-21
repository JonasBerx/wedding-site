const request = require('supertest');
const express = require('express');
const { errorHandler } = require('../src/middleware/errorHandler');

function appWith(routeHandler) {
  const app = express();
  app.get('/boom', routeHandler);
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  test('responds 500 with JSON for a synchronous throw', async () => {
    const app = appWith(() => { throw new Error('kaboom'); });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'internal_error' });
  });

  test('honors err.status when the error carries one', async () => {
    const app = appWith((req, res, next) => {
      const e = new Error('bad request');
      e.status = 400;
      next(e);
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'internal_error' });
  });
});
