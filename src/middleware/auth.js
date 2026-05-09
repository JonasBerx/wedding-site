const basicAuth = require('basic-auth');
const crypto = require('crypto');

function safeCompare(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function requireAuth(req, res, next) {
  const credentials = basicAuth(req);
  const validUser = process.env.ADMIN_USER;
  const validPass = process.env.ADMIN_PASSWORD;

  if (!credentials || !safeCompare(credentials.name, validUser) || !safeCompare(credentials.pass, validPass)) {
    res.set('WWW-Authenticate', 'Basic realm="Wedding Admin"');
    return res.status(401).send('Unauthorized');
  }

  next();
}

module.exports = { requireAuth };
