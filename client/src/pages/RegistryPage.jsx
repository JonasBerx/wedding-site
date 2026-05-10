import React from 'react';

export default function RegistryPage() {
  const [email, setEmail] = React.useState('');
  const [rsvpEmail, setRsvpEmail] = React.useState(null);
  const [emailError, setEmailError] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [myClaimedItemId, setMyClaimedItemId] = React.useState(null);
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function fetchItems() {
    const res = await fetch('/api/registry');
    if (!res.ok) return;
    setItems(await res.json());
  }

  async function handleUnlock(e) {
    e.preventDefault();
    setEmailError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/registry/validate?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        setEmailError("We don't have an RSVP for that email");
        return;
      }
      const { claimedItemId } = await res.json();
      setRsvpEmail(email);
      setMyClaimedItemId(claimedItemId);
      await fetchItems();
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim(itemId) {
    setMessage('');
    const res = await fetch('/api/registry/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, email: rsvpEmail }),
    });
    if (!res.ok) {
      try {
        const data = await res.json();
        setMessage(data.error || 'Something went wrong');
      } catch {
        setMessage('Something went wrong');
      }
      return;
    }
    setMyClaimedItemId(itemId);
    setMessage('Gift claimed!');
    await fetchItems();
  }

  async function handleUnclaim(itemId) {
    setMessage('');
    const res = await fetch('/api/registry/unclaim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, email: rsvpEmail }),
    });
    if (!res.ok) {
      setMessage('Could not release the gift. Please try again.');
      return;
    }
    setMyClaimedItemId(null);
    await fetchItems();
  }

  const containerStyle = {
    maxWidth: 600,
    margin: '80px auto',
    padding: '0 24px',
    fontFamily: '"EB Garamond", serif',
    color: '#2e2218',
  };

  if (!rsvpEmail) {
    return (
      <div style={containerStyle}>
        <h1 style={{ fontSize: 36, marginBottom: 8, fontStyle: 'italic' }}>Gift Registry</h1>
        <p style={{ marginBottom: 28, opacity: 0.65, fontSize: 18 }}>Enter your email to see and claim gifts.</p>
        <form onSubmit={handleUnlock}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{ width: '100%', padding: '10px 14px', fontSize: 16, boxSizing: 'border-box', marginBottom: 12, border: '1px solid #ccc', fontFamily: 'inherit' }}
          />
          {emailError && <p style={{ color: '#a00', marginBottom: 12, fontSize: 15 }}>{emailError}</p>}
          <button type="submit" disabled={loading} style={{ padding: '10px 28px', fontSize: 15, cursor: 'pointer', background: '#2e2218', color: '#f1e6d3', border: 'none', fontFamily: 'inherit', letterSpacing: '0.06em' }}>
            {loading ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: 36, marginBottom: 8, fontStyle: 'italic' }}>Gift Registry</h1>
      {message && (
        <p style={{ color: message === 'Gift claimed!' ? '#2a5c1e' : '#a00', marginBottom: 16, fontSize: 15 }}>
          {message}
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map(item => (
          <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', borderBottom: '1px solid #ddd' }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 600 }}>{item.title}</div>
              {item.description && <div style={{ opacity: 0.6, marginTop: 4, fontSize: 15 }}>{item.description}</div>}
            </div>
            <div style={{ marginLeft: 16, flexShrink: 0 }}>
              {item.id === myClaimedItemId ? (
                <button onClick={() => handleUnclaim(item.id)} style={{ padding: '6px 18px', cursor: 'pointer', background: 'transparent', border: '1px solid #2e2218', fontFamily: 'inherit', fontSize: 14 }}>
                  Release
                </button>
              ) : item.claimed ? (
                <span style={{ opacity: 0.45, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Taken</span>
              ) : (
                <button onClick={() => handleClaim(item.id)} style={{ padding: '6px 18px', cursor: 'pointer', background: '#2e2218', color: '#f1e6d3', border: 'none', fontFamily: 'inherit', fontSize: 14 }}>
                  Claim
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
