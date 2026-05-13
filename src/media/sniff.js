const FileType = require('file-type');

const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm',
]);

async function sniff(buffer) {
  const ft = await FileType.fromBuffer(buffer);
  if (!ft) return null;
  return { mime: ft.mime, ext: ft.ext };
}

function isAllowed(mime) {
  return ALLOWED.has(mime);
}

function isImage(mime) {
  return mime.startsWith('image/');
}

function isVideo(mime) {
  return mime.startsWith('video/');
}

module.exports = { sniff, isAllowed, isImage, isVideo, ALLOWED };
