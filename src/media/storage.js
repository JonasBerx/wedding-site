const fs = require('node:fs');
const path = require('node:path');

const SAFE_NAME_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/;

function assertSafeName(name) {
  if (!SAFE_NAME_RE.test(name)) {
    throw new Error(`invalid filename: ${name}`);
  }
}

function ensureMediaDirs(mediaDir) {
  fs.mkdirSync(path.join(mediaDir, 'originals'), { recursive: true });
  fs.mkdirSync(path.join(mediaDir, 'thumbs'), { recursive: true });
}

function originalPath(mediaDir, filename) {
  assertSafeName(filename);
  return path.join(mediaDir, 'originals', filename);
}

function thumbPath(mediaDir, filename) {
  assertSafeName(filename);
  return path.join(mediaDir, 'thumbs', filename);
}

function deleteFiles(mediaDir, originalName, thumbName) {
  for (const [, p] of [[originalName, originalPath(mediaDir, originalName)], [thumbName, thumbPath(mediaDir, thumbName)]]) {
    try { fs.unlinkSync(p); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  }
}

module.exports = { ensureMediaDirs, originalPath, thumbPath, deleteFiles, assertSafeName };
