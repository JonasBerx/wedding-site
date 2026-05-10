import React from 'react';

const HEAD_FONT = '"DM Serif Display", serif';
const BODY_FONT = '"EB Garamond", Georgia, serif';
const LABEL_FONT = '"EB Garamond", serif';

export default function ClaimModal({
  open,
  mode,            // 'claim' | 'lookup'
  itemId,          // required when mode === 'claim'
  itemTitle,       // required when mode === 'claim'
  onClose,
  onClaimSuccess,  // called with the email when mode === 'claim'
  onLookupSuccess, // called with { claimedItemId, email } when mode === 'lookup'
  defaultEmail = '',
}) {
  const [email, setEmail] = React.useState(defaultEmail);
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setEmail(defaultEmail);
      setError('');
      setSubmitting(false);
    }
  }, [open, defaultEmail]);

  if (!open) return null;

  const isClaim = mode === 'claim';
  const title = isClaim ? 'Claim this gift' : 'View your claim';
  const submitLabel = submitting ? '…' : (isClaim ? 'Claim' : 'Look up');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isClaim) {
        const res = await fetch('/api/registry/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: itemId, email }),
        });
        if (!res.ok) {
          let msg = 'Could not claim this gift.';
          try { msg = (await res.json()).error || msg; } catch {}
          setError(msg);
          return;
        }
        onClaimSuccess(email);
      } else {
        const res = await fetch(`/api/registry/validate?email=${encodeURIComponent(email)}`);
        if (res.status === 404) {
          setError("We don't have an RSVP for that email");
          return;
        }
        if (!res.ok) {
          setError('Something went wrong.');
          return;
        }
        const { claimedItemId } = await res.json();
        onLookupSuccess({ claimedItemId, email });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fbf5ea',
          border: '1px solid rgba(46,34,24,0.18)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          padding: '36px 32px',
          width: '100%', maxWidth: 380,
          fontFamily: BODY_FONT,
          color: '#2e2218',
        }}
      >
        <div style={{
          fontFamily: HEAD_FONT, fontSize: 28, fontStyle: 'italic',
          lineHeight: 1.2, marginBottom: 8,
        }}>{title}</div>
        {isClaim && itemTitle && (
          <div style={{
            fontFamily: HEAD_FONT, fontSize: 17, fontStyle: 'italic',
            color: '#5a4a3a', marginBottom: 20,
          }}>{itemTitle}</div>
        )}
        {!isClaim && (
          <div style={{ fontSize: 15, color: '#5a4a3a', marginBottom: 20 }}>
            Enter the email you used to RSVP.
          </div>
        )}
        <label style={{
          display: 'block',
          fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: '0.3em',
          textTransform: 'uppercase', color: '#7a5a3e', marginBottom: 6,
        }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid rgba(46,34,24,0.3)',
            fontFamily: BODY_FONT, fontSize: 16, color: '#2e2218',
            padding: '8px 0', marginBottom: 12, outline: 'none',
          }}
        />
        {error && (
          <div style={{ color: '#b85c4a', fontSize: 14, marginBottom: 16 }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: LABEL_FONT, fontSize: 12, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: '#7a5a3e', padding: '8px 14px',
            }}
          >Cancel</button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: '#2e2218', color: '#fbf5ea', border: 'none',
              cursor: submitting ? 'wait' : 'pointer',
              fontFamily: LABEL_FONT, fontSize: 12, letterSpacing: '0.18em',
              textTransform: 'uppercase', padding: '10px 22px',
              opacity: submitting ? 0.6 : 1,
            }}
          >{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
