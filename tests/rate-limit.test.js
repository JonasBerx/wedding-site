const { createRateLimiter } = require('../src/middleware/rateLimit');

function makeReqRes(key) {
  return {
    req: { signedCookies: { guest_upload: 'ok' }, ip: '1.2.3.4', _key: key },
    res: { statusCode: 200, headers: {}, set(h, v) { this.headers[h] = v; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } },
  };
}

describe('rate limiter', () => {
  test('allows N requests then blocks the next', () => {
    let now = 0;
    const limiter = createRateLimiter({ max: 3, windowMs: 1000, keyFn: (req) => req._key, nowFn: () => now });
    const k = 'a';
    let blocked = false;
    for (let i = 0; i < 3; i++) {
      const { req, res } = makeReqRes(k);
      limiter(req, res, () => {});
      if (res.statusCode === 429) blocked = true;
    }
    expect(blocked).toBe(false);
    const { req, res } = makeReqRes(k);
    limiter(req, res, () => {});
    expect(res.statusCode).toBe(429);
  });

  test('refills after window elapses', () => {
    let now = 0;
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, keyFn: (req) => req._key, nowFn: () => now });
    const k = 'b';
    const a = makeReqRes(k); limiter(a.req, a.res, () => {}); expect(a.res.statusCode).toBe(200);
    const b = makeReqRes(k); limiter(b.req, b.res, () => {}); expect(b.res.statusCode).toBe(429);
    now = 1500;
    const c = makeReqRes(k); limiter(c.req, c.res, () => {}); expect(c.res.statusCode).toBe(200);
  });
});
