import React from 'react';
import { usePaletteMode } from '../PaletteShell';
import { useIsMobile } from '../shared';
import { OliveBranch, Wildflower, Lavender, Sprig } from '../botanicals';
import { FooterSection } from '../sections/Footer';
import Toast from '../components/Toast';
import ClaimModal from '../components/ClaimModal';

const SESSION_KEY = 'registryEmail';
const ICONS = [<Wildflower size={20} />, <Lavender size={20} />, <Sprig size={20} />];

export default function RegistryPage() {
  const { t, fonts } = usePaletteMode();
  const isMobile = useIsMobile();

  const [items, setItems] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const [myClaimedItemId, setMyClaimedItemId] = React.useState(null);
  const [sessionEmail, setSessionEmail] = React.useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) || ''; } catch { return ''; }
  });
  const [modal, setModal] = React.useState(null); // null | { mode: 'claim'|'lookup', itemTitle?, itemId? }
  const [toast, setToast] = React.useState('');

  const fetchItems = React.useCallback(async () => {
    const res = await fetch('/api/registry');
    if (!res.ok) return;
    setItems(await res.json());
    setLoaded(true);
  }, []);

  React.useEffect(() => { fetchItems(); }, [fetchItems]);

  // On first mount, if we have a remembered email, look up the claim silently
  React.useEffect(() => {
    let stored = '';
    try { stored = sessionStorage.getItem(SESSION_KEY) || ''; } catch {}
    if (!stored) return;
    fetch(`/api/registry/validate?email=${encodeURIComponent(stored)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && data.claimedItemId) setMyClaimedItemId(data.claimedItemId);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function rememberEmail(email) {
    try { sessionStorage.setItem(SESSION_KEY, email); } catch {}
    setSessionEmail(email);
  }

  function clearEmail() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setSessionEmail('');
  }

  function openClaim(item) {
    setModal({ mode: 'claim', itemTitle: item.title, itemId: item.id });
  }

  function openLookup() {
    setModal({ mode: 'lookup' });
  }

  async function handleClaimSuccess(email) {
    rememberEmail(email);
    setMyClaimedItemId(modal.itemId);
    setModal(null);
    setToast('Gift claimed!');
    await fetchItems();
  }

  function handleLookupSuccess({ claimedItemId, email }) {
    rememberEmail(email);
    if (claimedItemId === null) {
      setToast('No active claim for this email.');
    }
    setMyClaimedItemId(claimedItemId);
    setModal(null);
  }

  async function handleRelease(item) {
    if (!sessionEmail) return;
    if (!window.confirm('Release this gift?')) return;
    const res = await fetch('/api/registry/unclaim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, email: sessionEmail }),
    });
    if (!res.ok) {
      setToast('Could not release the gift. Please try again.');
      return;
    }
    setMyClaimedItemId(null);
    clearEmail();
    setToast('Released.');
    await fetchItems();
  }

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, color: t.ink,
      fontFamily: fonts.body, transition: 'background .4s ease, color .4s ease',
    }}>
      <Toast message={toast} onDismiss={() => setToast('')} />

      <div style={{
        position: 'relative',
        padding: isMobile ? '40px 20px 0' : '70px 80px 0',
        maxWidth: 900, margin: '0 auto',
      }}>
        <button
          onClick={openLookup}
          style={{
            position: isMobile ? 'static' : 'absolute',
            top: isMobile ? 'auto' : 80,
            right: isMobile ? 'auto' : 80,
            display: isMobile ? 'block' : 'inline-block',
            marginLeft: isMobile ? 'auto' : 0,
            marginBottom: isMobile ? 24 : 0,
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: fonts.label, fontSize: 11,
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: t.label, opacity: 0.7, padding: 0,
          }}
        >View my claim →</button>

        <div style={{ textAlign: 'center', marginBottom: isMobile ? 36 : 56 }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: t.accentSoft, marginBottom: 20 }}>
            <OliveBranch size={isMobile ? 80 : 120} />
          </div>
          <div style={{
            fontFamily: fonts.label, fontSize: isMobile ? 10 : 11,
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: t.label, marginBottom: 16,
          }}>choose with care</div>
          <div style={{
            fontFamily: fonts.head, fontSize: isMobile ? 42 : 64, fontStyle: 'italic',
            lineHeight: 1, color: t.ink, marginBottom: 20,
          }}>Gift Registry</div>
          <div style={{
            fontFamily: fonts.body, fontSize: isMobile ? 16 : 17, color: t.inkSoft,
            maxWidth: 480, margin: '0 auto', lineHeight: 1.6,
          }}>
            Pick something for us — one gift per guest. You can change your mind any time.
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 720, margin: '0 auto',
        padding: isMobile ? '0 20px 60px' : '0 80px 80px',
      }}>
        {loaded && items.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            fontFamily: fonts.head, fontSize: 22, fontStyle: 'italic',
            color: t.inkSoft,
          }}>No gifts available yet — check back soon.</div>
        )}

        {(() => {
          const universal = items.filter(i => i.unclaimable === 1);
          const claimable = items.filter(i => i.unclaimable !== 1);
          const showBothKickers = universal.length > 0 && claimable.length > 0;

          const groupKickerStyle = {
            fontFamily: fonts.label, fontSize: 11, letterSpacing: '0.32em',
            textTransform: 'uppercase', color: t.label, textAlign: 'center',
            marginBottom: 24, marginTop: 8,
          };

          const tilts = [-1.4, 0.7, -0.5];
          const cardIcons = [
            <Wildflower size={42} />,
            <Lavender size={36} />,
            <Sprig size={36} />,
          ];

          return (
            <>
              {universal.length > 0 && (
                <div style={{ marginBottom: claimable.length > 0 ? 48 : 0 }}>
                  {showBothKickers && <div style={groupKickerStyle}>Always welcome</div>}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr',
                    gap: 28, maxWidth: 720, margin: '0 auto',
                  }}>
                    {universal.map((u, ui) => (
                      <div key={u.id} style={{
                        padding: '36px 30px 30px', background: t.paper,
                        border: `1px solid ${t.rule}`,
                        transform: `rotate(${tilts[ui % tilts.length]}deg)`,
                        boxShadow: `7px 7px 0 ${t.accentSoft}38`,
                        position: 'relative', textAlign: 'center',
                      }}>
                        <div style={{ marginBottom: 14, color: t.accent, display: 'flex', justifyContent: 'center' }}>
                          {cardIcons[ui % cardIcons.length]}
                        </div>
                        <div style={{
                          fontFamily: fonts.head, fontSize: 24, color: t.ink,
                          marginBottom: 12, lineHeight: 1.2, fontStyle: 'italic',
                        }}>{u.title}</div>
                        {u.description && (
                          <div style={{
                            fontFamily: fonts.body, fontSize: 16, color: t.inkSoft,
                            lineHeight: 1.55,
                          }}>{u.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {claimable.length > 0 && (
                <div>
                  {showBothKickers && <div style={groupKickerStyle}>A few specific gifts</div>}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {claimable.map((item, i) => {
                      const isMine = item.id === myClaimedItemId;
                      return (
                        <li key={item.id} style={{
                          display: 'flex',
                          alignItems: isMobile ? 'flex-start' : 'center',
                          gap: isMobile ? 12 : 16,
                          flexWrap: isMobile ? 'wrap' : 'nowrap',
                          padding: isMobile ? '18px 0' : '20px 0',
                          borderBottom: `1px solid ${t.rule}`,
                        }}>
                          <div style={{ color: t.accent, flexShrink: 0 }}>
                            {ICONS[i % ICONS.length]}
                          </div>
                          <div style={{ flex: '1 1 60%', minWidth: 0 }}>
                            <div style={{
                              fontFamily: fonts.head, fontSize: isMobile ? 19 : 22, fontStyle: 'italic',
                              color: t.ink, lineHeight: 1.2,
                            }}>{item.title}</div>
                            {item.description && (
                              <div style={{
                                fontFamily: fonts.body, fontSize: 15,
                                color: t.inkSoft, marginTop: 4, lineHeight: 1.5,
                              }}>{item.description}</div>
                            )}
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {isMine ? (
                              <button
                                onClick={() => handleRelease(item)}
                                style={{
                                  background: 'transparent', color: t.ink,
                                  border: `1px solid ${t.ink}`, cursor: 'pointer',
                                  fontFamily: fonts.label, fontSize: 11,
                                  letterSpacing: '0.18em', textTransform: 'uppercase',
                                  padding: '8px 18px',
                                }}
                              >Release</button>
                            ) : item.claimed ? (
                              <span style={{
                                fontFamily: fonts.label, fontSize: 11,
                                letterSpacing: '0.2em', textTransform: 'uppercase',
                                color: t.label, opacity: 0.5,
                              }}>Taken</span>
                            ) : (
                              <button
                                onClick={() => openClaim(item)}
                                style={{
                                  background: t.ink, color: t.paper, border: 'none',
                                  cursor: 'pointer',
                                  fontFamily: fonts.label, fontSize: 11,
                                  letterSpacing: '0.18em', textTransform: 'uppercase',
                                  padding: '9px 18px',
                                }}
                              >Claim</button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          );
        })()}
      </div>

      <FooterSection t={t} fonts={fonts} />

      <ClaimModal
        open={!!modal}
        mode={modal?.mode}
        itemId={modal?.itemId}
        itemTitle={modal?.itemTitle}
        defaultEmail={sessionEmail}
        onClose={() => setModal(null)}
        onClaimSuccess={handleClaimSuccess}
        onLookupSuccess={handleLookupSuccess}
      />
    </div>
  );
}
