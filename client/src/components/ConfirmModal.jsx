import React from 'react';

export default function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const confirmStyle = destructive
    ? { background: 'transparent', color: '#b85c4a', border: '1px solid #b85c4a' }
    : { background: '#2e2218', color: '#fbf5ea', border: 'none' };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fbf5ea',
          border: '1px solid rgba(46,34,24,0.18)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          padding: '36px 32px',
          width: '100%', maxWidth: 360,
          fontFamily: '"EB Garamond", Georgia, serif',
          color: '#2e2218',
        }}
      >
        <div style={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: 28, fontStyle: 'italic', lineHeight: 1.2, marginBottom: 12,
        }}>{title}</div>
        {body && (
          <div style={{ fontSize: 15, color: '#5a4a3a', marginBottom: 24 }}>{body}</div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: '"EB Garamond", serif', fontSize: 12,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a5a3e',
              padding: '8px 14px',
            }}
          >{cancelLabel}</button>
          <button
            onClick={onConfirm}
            style={{
              ...confirmStyle, cursor: 'pointer',
              fontFamily: '"EB Garamond", serif', fontSize: 12,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              padding: '10px 22px',
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
