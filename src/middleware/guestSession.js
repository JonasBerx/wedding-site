const COOKIE_NAME = 'guest_upload';
const COOKIE_VALUE = 'ok';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setGuestCookie(res) {
  res.cookie(COOKIE_NAME, COOKIE_VALUE, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

function requireGuestSession(req, res, next) {
  if (req.signedCookies && req.signedCookies[COOKIE_NAME] === COOKIE_VALUE) {
    return next();
  }
  return res.status(401).json({ error: 'unauthenticated' });
}

module.exports = { setGuestCookie, requireGuestSession, COOKIE_NAME };
