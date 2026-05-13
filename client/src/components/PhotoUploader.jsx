import React, { useState } from 'react';

export default function PhotoUploader({ onUploaded }) {
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [name, setName] = useState('');
  const [progress, setProgress] = useState({});
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      try { const u = await uploadOne(files[i], i); if (u) uploaded.push(u); }
      catch (err) {}
    }
    setBusy(false);
    setFiles([]);
    setCaption('');
    onUploaded && onUploaded(uploaded);
  }

  return (
    <div style={{ background: '#fbf7ee', padding: 20, borderRadius: 8, border: '1px solid #ddd0b8', maxWidth: 520, margin: '0 auto' }}>
      <h3 style={{ marginTop: 0, fontFamily: 'serif' }}>Add your photos</h3>
      <input type="file" multiple accept="image/*,video/*"
        onChange={(e) => { setFiles(Array.from(e.target.files || [])); setProgress({}); }}
        disabled={busy} />
      <div style={{ marginTop: 12 }}>
        <input type="text" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)}
          maxLength={300} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
        <input type="text" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)}
          maxLength={80} style={{ width: '100%', padding: 8 }} />
      </div>
      {files.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
          {files.map((f, i) => (
            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{f.name}</span>
              <span>{progress[i] === 'done' ? '✓' : progress[i] === 'error' ? '✕' : (progress[i] ? `${progress[i]}%` : '—')}</span>
            </li>
          ))}
        </ul>
      )}
      <button onClick={handleUpload} disabled={busy || files.length === 0}
        style={{ marginTop: 12, padding: '10px 20px', background: '#5a4a35', color: 'white', border: 0, cursor: 'pointer' }}>
        {busy ? 'Uploading…' : `Upload ${files.length || ''}`}
      </button>
    </div>
  );
}
