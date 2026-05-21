function createRateLimiter({ max = 30, windowMs = 10 * 60 * 1000, keyFn, nowFn = Date.now } = {}) {
  const buckets = new Map();

  function rateLimit(req, res, next) {
    const key = keyFn ? keyFn(req) : (req.ip || 'anon');
    const now = nowFn();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      // Evict expired buckets to bound memory before allocating a new one.
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'rate_limited', retry_after_sec: retryAfter });
    }
    bucket.count += 1;
    next();
  }

  // Exposed for tests; not used in production code.
  rateLimit._buckets = buckets;
  return rateLimit;
}

module.exports = { createRateLimiter };
