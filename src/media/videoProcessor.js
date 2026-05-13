const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const MAX_DURATION_SEC = 30;
const TARGET_HEIGHT = 720;

function probe(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => err ? reject(err) : resolve(data));
  });
}

function reencode(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        `-vf`, `scale='if(gt(iw,ih),-2,min(${TARGET_HEIGHT},ih))':'if(gt(iw,ih),min(${TARGET_HEIGHT},ih),-2)'`,
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-b:v', '8M',
        '-preset', 'fast',
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

function poster(inputPath, outputPath, atSec) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(atSec)
      .frames(1)
      .outputOptions(['-q:v', '4'])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

async function processVideo(buffer, workDir) {
  const tag = crypto.randomBytes(6).toString('hex');
  const inPath = path.join(workDir, `in-${tag}.bin`);
  const outPath = path.join(workDir, `out-${tag}.mp4`);
  const posterPath = path.join(workDir, `poster-${tag}.jpg`);
  fs.writeFileSync(inPath, buffer);

  let info;
  try {
    info = await probe(inPath);
  } catch (e) {
    try { fs.unlinkSync(inPath); } catch (_) {}
    const err = new Error('Could not probe video');
    err.cause = e;
    throw err;
  }

  const duration = Number(info.format.duration || 0);
  if (!duration || duration > MAX_DURATION_SEC) {
    try { fs.unlinkSync(inPath); } catch (_) {}
    const err = new Error(`Video too long (${duration}s, max ${MAX_DURATION_SEC}s)`);
    err.code = 'video_too_long';
    throw err;
  }

  try {
    await reencode(inPath, outPath);
    await poster(inPath, posterPath, Math.min(1, Math.max(0, duration - 0.1)));
  } finally {
    try { fs.unlinkSync(inPath); } catch (_) {}
  }

  const outBuffer = fs.readFileSync(outPath);
  const posterBuffer = fs.readFileSync(posterPath);
  try { fs.unlinkSync(outPath); } catch (_) {}
  try { fs.unlinkSync(posterPath); } catch (_) {}

  const videoStream = (info.streams || []).find(s => s.codec_type === 'video') || {};
  return {
    mime_type: 'video/mp4',
    ext: 'mp4',
    buffer: outBuffer,
    thumb_buffer: posterBuffer,
    width: videoStream.width || null,
    height: videoStream.height || null,
    duration_sec: Math.round(duration * 100) / 100,
  };
}

module.exports = { processVideo, MAX_DURATION_SEC };
