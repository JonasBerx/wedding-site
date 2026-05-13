import React, { useState } from 'react';

export default function PhotoUploader({ onUploaded, t, fonts, isMobile }) {
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [name, setName] = useState('');
  const [progress, setProgress] = useState({});
  const [busy, setBusy] = useState(false);
  const fileInputRef = React.useRef(null);

  function uploadOne(file, idx) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      if (caption) fd.append('caption', caption);
      if (name) fd.append('uploader_name', name);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/photos');
      xhr.withCredentials = true;
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress((p) => ({ ...p, [idx]: Math.round((e.loaded / e.total) * 100) }));
        }
      });
      xhr.onload = () => {
        if (xhr.status === 201) {
          setProgress((p) => ({ ...p, [idx]: 'done' }));
          try { resolve(JSON.parse(xhr.responseText)); } catch { resolve(null); }
        } else {
          setProgress((p) => ({ ...p, [idx]: 'error' }));
          reject(new Error(`upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => { setProgress((p) => ({ ...p, [idx]: 'error' })); reject(new Error('network')); };
      xhr.send(fd);
    });
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setBusy(true);
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      try { const u = await uploadOne(files[i], i); if (u) uploaded.push(u); }
      catch {}
    }
    setBusy(false);
    setFiles([]);
    setCaption('');
    setProgress({});
    if (fileInputRef.current) fileInputRef.current.value = '';
    onUploaded && onUploaded(uploaded);
  }

  const labelStyle = {
    display: 'block',
    fontFamily: fonts.label, fontSize: 11, letterSpacing: '0.28em',
    textTransform: 'uppercase', color: t.label, marginBottom: 6,
  };
  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'transparent', border: 'none',
    borderBottom: `1px solid ${t.rule}`,
    fontFamily: fonts.body, fontSize: 17, color: t.ink,
    padding: '10px 0 8px', outline: 'none', borderRadius: 0,
  };

  return (
    <div style={{
      maxWidth: 560, margin: '0 auto',
      background: t.paper,
      padding: isMobile ? '28px 22px 32px' : '40px 44px 42px',
      border: `1px solid ${t.rule}`,
      boxShadow: `7px 7px 0 ${t.accentSoft}33`,
      transform: isMobile ? 'none' : 'rotate(-0.3deg)',
      position: 'relative',
    }}>
      <div style={{
        fontFamily: fonts.label, fontSize: 10, letterSpacing: '0.42em',
        textTransform: 'uppercase', color: t.label, textAlign: 'center', marginBottom: 8,
      }}>
        add to the album
      </div>
      <h2 style={{
        margin: 0, marginBottom: 22,
        fontFamily: fonts.head, fontStyle: 'italic',
        fontSize: isMobile ? 28 : 34, color: t.ink, textAlign: 'center', lineHeight: 1.1,
      }}>
        Slip in a memory
      </h2>

      {/* File picker */}
      <div style={{ marginBottom: 22 }}>
        <span style={labelStyle}>Photos &amp; videos</span>
        <label
          htmlFor="photo-file-input"
          style={{
            display: 'block', textAlign: 'center', cursor: busy ? 'default' : 'pointer',
            padding: isMobile ? '22px 14px' : '30px 18px',
            border: `1px dashed ${t.rule}`,
            background: `${t.bg}88`,
            transition: 'border-color .2s, background .2s',
          }}
          onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.borderColor = t.accent; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.rule; }}
        >
          <div style={{
            fontFamily: fonts.body, fontSize: 16, color: t.ink, fontStyle: 'italic',
          }}>
            {files.length === 0
              ? 'Tap to choose, or drop them here'
              : `${files.length} file${files.length === 1 ? '' : 's'} ready`}
          </div>
          <div style={{
            marginTop: 6, fontFamily: fonts.label, fontSize: 10,
            letterSpacing: '0.32em', textTransform: 'uppercase',
            color: t.label, opacity: 0.7,
          }}>
            jpg · png · heic · mp4 · mov
          </div>
        </label>
        <input
          id="photo-file-input"
          ref={fileInputRef}
          type="file" multiple accept="image/*,video/*"
          onChange={(e) => { setFiles(Array.from(e.target.files || [])); setProgress({}); }}
          disabled={busy}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />
      </div>

      {/* Caption */}
      <div style={{ marginBottom: 18 }}>
        <span style={labelStyle}>Caption (optional)</span>
        <input
          type="text" value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={300}
          placeholder="The dance floor at 1 a.m."
          style={inputStyle}
          disabled={busy}
          onFocus={(e) => { e.target.style.borderBottomColor = t.accent; }}
          onBlur={(e) => { e.target.style.borderBottomColor = t.rule; }}
        />
      </div>

      {/* Name */}
      <div style={{ marginBottom: 22 }}>
        <span style={labelStyle}>Your name (optional)</span>
        <input
          type="text" value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="So we know who pinned it up"
          style={inputStyle}
          disabled={busy}
          onFocus={(e) => { e.target.style.borderBottomColor = t.accent; }}
          onBlur={(e) => { e.target.style.borderBottomColor = t.rule; }}
        />
      </div>

      {/* Per-file progress */}
      {files.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px' }}>
          {files.map((f, i) => {
            const p = progress[i];
            const status = p === 'done' ? '✓' : p === 'error' ? '✕' : p ? `${p}%` : '—';
            const color = p === 'done' ? t.accent : p === 'error' ? '#a33' : t.inkSoft;
            return (
              <li key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                fontFamily: fonts.body, fontSize: 14, color: t.inkSoft,
                padding: '6px 0', borderBottom: `1px dashed ${t.rule}`,
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                  {f.name}
                </span>
                <span style={{
                  fontFamily: fonts.label, fontSize: 11, letterSpacing: '0.18em', color,
                }}>
                  {status}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={handleUpload}
        disabled={busy || files.length === 0}
        style={{
          width: '100%', padding: '14px 0',
          background: busy || files.length === 0 ? `${t.ink}33` : t.accent,
          color: t.paper, border: 'none', borderRadius: 0,
          fontFamily: fonts.label, fontSize: 12, letterSpacing: '0.36em',
          textTransform: 'uppercase',
          cursor: busy || files.length === 0 ? 'default' : 'pointer',
          transition: 'transform .15s, box-shadow .15s, background .2s',
        }}
        onMouseEnter={(e) => {
          if (busy || files.length === 0) return;
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = `0 4px 0 ${t.accentSoft}66`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {busy ? 'Uploading…' : files.length === 0 ? 'Choose photos first' : `Pin up ${files.length} ${files.length === 1 ? 'photo' : 'photos'}`}
      </button>
    </div>
  );
}
