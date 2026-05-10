import React from 'react';

export default function Toast({ message, onDismiss, duration = 3000 }) {
  React.useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [message, onDismiss, duration]);

  if (!message) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        padding: '12px 24px',
        background: '#fbf5ea',
        border: '1px solid rgba(46,34,24,0.18)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        fontFamily: '"EB Garamond", Georgia, serif',
        fontSize: 15,
        color: '#2e2218',
        animation: 'toastSlide 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes toastSlide {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      {message}
    </div>
  );
}
