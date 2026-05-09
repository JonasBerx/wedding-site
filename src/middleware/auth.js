const basicAuth = require('basic-auth');

function requireAuth(req, res, next) {
  const credentials = basicAuth(req);
  const validUser = process.env.ADMIN_USER;
  const validPass = process.env.ADMIN_PASSWORD;

  if (!credentials || credentials.name !== validUser || credentials.pass !== validPass) {
    res.set('WWW-Authenticate', 'Basic realm="Wedding Admin"');
    return res.status(401).send('Unauthorized');
  }

  next();
}

module.exports = { requireAuth };
