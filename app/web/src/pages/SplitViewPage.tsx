import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import type { Demo, Flag } from '../types';
import { ACCENT, useToast } from '../App';
import { BackIcon, ExternalIcon, FlagIcon, InfoIcon, MonitorIcon, ReloadIcon, WarnIcon } from '../icons';

// The left pane renders a simulated storefront driven by live flag state —
// the design's stand-in until demos embed their real liveDemoUrl (most demo
// hosts block iframing anyway; swap this component for an <iframe> per-demo
// when the URL allows it).
function StorefrontPreview({ demo, values }: { demo: Demo; values: Record<string, unknown> }) {
  const variantMap: Record<string, { tag: string; title: string; sub: string; bg: string }> = {
    control: { tag: 'New Arrivals', title: 'Welcome to Galaxy Store', sub: 'Fresh drops every day', bg: 'linear-gradient(90deg,#0EA5A5,#10B981)' },
    holiday: { tag: 'Limited Time', title: 'Holiday Sale — 30% off', sub: 'Ends Sunday at midnight', bg: 'linear-gradient(90deg,#EF4444,#F97316)' },
    vip: { tag: 'Members Only', title: 'VIP Early Access Drop', sub: 'You unlocked the vault', bg: 'linear-gradient(90deg,#7C3AED,#3355FF)' },
  };
  const banner = variantMap[String(values['promo-banner'] ?? 'control')] ?? variantMap.control;
  const newCheckout = values['new-checkout'] !== undefined ? !!values['new-checkout'] : true;
  const showRecs = !!values['recommendations'];
  const showShip = !!values['express-shipping'];
  const products = [
    { name: 'Nebula Headphones', price: '$129', bg: 'linear-gradient(135deg,#C7D2FE,#818CF8)' },
    { name: 'Comet Keyboard', price: '$89', bg: 'linear-gradient(135deg,#FBCFE8,#F472B6)' },
    { name: 'Orbit Mouse', price: '$49', bg: 'linear-gradient(135deg,#BBF7D0,#4ADE80)' },
  ];

  return (
    <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 6px 24px rgba(16,19,23,.10)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#F3F4F6', borderBottom: '1px solid #E6E9EE', flex: '0 0 auto' }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F57' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FEBC2E' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28C840' }} />
        <div style={{ flex: 1, marginLeft: 8, background: '#fff', border: '1px solid #E6E9EE', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#8A919D', fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{demo.liveDemoUrl}</div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#0E7A4F', fontWeight: 600 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', animation: 'skel 1.6s ease-in-out infinite' }} />
          Live
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', background: '#FBFBFC' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #EEF0F3' }}>
          <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 17, letterSpacing: '-.02em' }}>◆ Galaxy Store</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#626B78', fontSize: 13 }}>
            <span>Shop</span>
            <span>Deals</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: ACCENT, color: '#fff', padding: '6px 12px', borderRadius: 8, fontWeight: 600 }}>Cart · 2</span>
          </div>
        </div>
        <div style={{ margin: '16px 18px', borderRadius: 12, padding: 22, background: banner!.bg, color: '#fff', transition: 'background .4s ease' }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, letterSpacing: '.04em', textTransform: 'uppercase' }}>{banner!.tag}</div>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 700, marginTop: 6, letterSpacing: '-.02em' }}>{banner!.title}</div>
          <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 4 }}>{banner!.sub}</div>
        </div>
        {showRecs && (
          <div style={{ padding: '4px 18px 0' }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 11, background: '#EEF1FF', color: ACCENT, padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>AI</span>
              Recommended for you
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '12px 18px 4px' }}>
          {products.map((p) => (
            <div key={p.name} style={{ border: '1px solid #EEF0F3', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              <div style={{ height: 68, background: p.bg }} />
              <div style={{ padding: '9px 10px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono'" }}>{p.price}</span>
                  {showShip && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#0E7A4F', background: '#EAF7F0', padding: '2px 5px', borderRadius: 4 }}>2-DAY</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 18px 22px' }}>
          <button style={{ width: '100%', padding: 13, borderRadius: 10, fontWeight: 700, fontSize: 14, fontFamily: "'Space Grotesk'", color: '#fff', background: newCheckout ? ACCENT : '#0E1116', transition: 'background .3s ease' }}>
            {newCheckout ? 'Express Checkout — 1 tap' : 'Continue to Checkout'}
          </button>
          <div style={{ textAlign: 'center', fontSize: 11.5, color: '#98A1AD', marginTop: 8 }}>
            {newCheckout ? 'Powered by one-page express flow' : 'Standard multi-step checkout'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SplitViewPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const toast = useToast();
  const [demo, setDemo] = useState<Demo | null>(null);
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [leftPct, setLeftPct] = useState(0.6);
  const dragging = useRef(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef<string | null>(null);

  const loadFlags = useCallback(() => {
    if (!id) return;
    setLoadingFlags(true);
    setFlagError(null);
    api
      .getFlags(id)
      .then((f) => setFlags(f))
      .catch((err: unknown) => {
        setFlagError(
          err instanceof ApiError && err.status === 409
            ? "This demo's environment isn't provisioned yet — its PR hasn't merged. Retry once the demo is published."
            : 'Could not reach LaunchDarkly. Check the server logs and retry.',
        );
      })
      .finally(() => setLoadingFlags(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api.getDemo(id).then(setDemo).catch(() => {});
    loadFlags();
    if (viewedRef.current !== id) {
      viewedRef.current = id;
      api.view(id, 'split').catch(() => {});
    }
  }, [id, loadFlags]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !splitRef.current) return;
      const r = splitRef.current.getBoundingClientRect();
      setLeftPct(Math.max(0.32, Math.min(0.78, (e.clientX - r.left) / r.width)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!demo) return null;
  const locked = !demo.liveDemoUrl;
  const values = Object.fromEntries((flags ?? []).map((f) => [f.key, f.currentValue]));

  const setValue = (flag: Flag, value: unknown) => {
    if (locked) return;
    const prev = flags;
    setFlags((fs) => fs?.map((f) => (f.key === flag.key ? { ...f, currentValue: value } : f)) ?? null);
    api
      .setFlag(demo.id, flag.key, value)
      .then((updated) => setFlags((fs) => fs?.map((f) => (f.key === flag.key ? updated : f)) ?? null))
      .catch((err: unknown) => {
        setFlags(prev ?? null);
        toast(err instanceof ApiError ? `Update failed: ${err.message}` : 'Flag update failed');
      });
  };

  const resetEnv = () => {
    api
      .resetEnvironment(demo.id)
      .then((r) => {
        setFlags(r.flags);
        toast('Environment reset to defaults');
      })
      .catch(() => toast('Reset failed'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid #E3E6EB', background: '#fff', flex: '0 0 auto' }}>
        <button onClick={() => nav(`/demos/${demo.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#626B78', fontSize: 13.5, fontWeight: 500 }}>
          <BackIcon /> Back
        </button>
        <div style={{ width: 1, height: 20, background: '#E3E6EB' }} />
        <div style={{ width: 26, height: 26, borderRadius: 7, background: demo.gradient, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 12 }}>{demo.mono}</div>
        <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15 }}>{demo.title}</div>
        <span style={{ background: '#EAF7F0', color: '#0E7A4F', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, fontFamily: "'JetBrains Mono'" }}>SPLIT VIEW</span>
        <div style={{ flex: 1 }} />
        <button onClick={resetEnv} title="Reset all flags to catalog defaults" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#626B78', border: '1px solid #E3E6EB', borderRadius: 8, padding: '7px 12px' }}>
          <ReloadIcon size={14} /> Reset environment
        </button>
      </div>

      <div ref={splitRef} style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative', background: '#E4E7EC' }}>
        {/* LEFT */}
        <div style={{ flex: `0 0 ${(leftPct * 100).toFixed(2)}%`, minWidth: 0, display: 'flex', flexDirection: 'column', padding: 16, overflow: 'hidden' }}>
          {demo.liveDemoUrl ? (
            <StorefrontPreview demo={demo} values={values} />
          ) : (
            <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px dashed #CDD3DC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 30 }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <MonitorIcon style={{ color: '#98A1AD' }} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontFamily: "'Space Grotesk'", fontSize: 18 }}>No live URL for this demo</h3>
              <p style={{ margin: 0, color: '#626B78', fontSize: 14, maxWidth: 320 }}>
                Flags are shown read-only on the right. Add a <span style={{ fontFamily: "'JetBrains Mono'" }}>liveDemoUrl</span> to enable the interactive preview.
              </p>
            </div>
          )}
        </div>

        {/* DIVIDER */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            dragging.current = true;
            document.body.style.userSelect = 'none';
          }}
          style={{ width: 8, flex: '0 0 8px', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}
        >
          <div style={{ width: 3, height: 44, borderRadius: 3, background: '#C4CAD3' }} />
        </div>

        {/* RIGHT: flag panel */}
        <div style={{ flex: 1, minWidth: 280, background: '#fff', borderLeft: '1px solid #E3E6EB', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1px solid #EEF0F3', flex: '0 0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <FlagIcon size={17} strokeWidth={2} style={{ color: ACCENT }} />
              <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 15 }}>LaunchDarkly Flags</span>
            </div>
            <button onClick={loadFlags} title="Reload flag state" style={{ color: '#8A919D', display: 'flex', padding: 5 }}>
              <ReloadIcon />
            </button>
          </div>
          <div style={{ padding: '10px 18px', borderBottom: '1px solid #F0F2F5', display: 'flex', gap: 8, flex: '0 0 auto' }}>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono'", background: '#F2F4F7', color: '#4A5261', padding: '4px 9px', borderRadius: 6 }}>{demo.launchDarkly?.projectKey ?? '—'}</span>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono'", background: '#EEF1FF', color: ACCENT, padding: '4px 9px', borderRadius: 6 }}>env: {demo.launchDarkly?.environmentKey ?? '—'}</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {loadingFlags && (
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <div style={{ height: 13, width: '55%', background: '#EEF0F3', borderRadius: 5, animation: 'skel 1.4s ease-in-out infinite' }} />
                    <div style={{ height: 28, width: '100%', background: '#F4F6F8', borderRadius: 7, marginTop: 10, animation: 'skel 1.4s ease-in-out infinite' }} />
                  </div>
                ))}
              </div>
            )}

            {!loadingFlags && flagError && (
              <div style={{ margin: '24px 18px', textAlign: 'center', animation: 'fadeUp .3s ease' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <WarnIcon style={{ color: '#EF4444' }} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontFamily: "'Space Grotesk'", fontSize: 16 }}>Couldn't load flag state</h4>
                <p style={{ margin: '0 0 16px', color: '#626B78', fontSize: 13.5 }}>{flagError}</p>
                <button onClick={loadFlags} style={{ background: '#101317', color: '#fff', fontWeight: 600, fontSize: 13.5, padding: '9px 18px', borderRadius: 9 }}>Retry</button>
              </div>
            )}

            {!loadingFlags && !flagError && flags && flags.length === 0 && (
              <div style={{ margin: '24px 18px', textAlign: 'center', color: '#626B78', fontSize: 13.5 }}>This demo has no connected flags.</div>
            )}

            {!loadingFlags &&
              !flagError &&
              flags?.map((f) => {
                const isOn = !!f.currentValue;
                return (
                  <div key={f.key} style={{ padding: '15px 18px', borderBottom: '1px solid #F4F6F8' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                        <div style={{ fontSize: 11.5, color: '#8A919D', fontFamily: "'JetBrains Mono'", marginTop: 2 }}>{f.key}</div>
                      </div>
                      <a href={f.launchDarklyUrl} target="_blank" rel="noreferrer" title="Open in LaunchDarkly" style={{ color: '#B7BEC9', flex: '0 0 auto', padding: 2 }}>
                        <ExternalIcon size={15} strokeWidth={1.6} />
                      </a>
                    </div>
                    {f.description && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#7A828F', lineHeight: 1.45 }}>{f.description}</p>}

                    {f.kind === 'boolean' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                        <button
                          onClick={() => setValue(f, !isOn)}
                          disabled={locked}
                          style={{ position: 'relative', width: 46, height: 26, borderRadius: 20, transition: 'background .2s ease', background: isOn ? '#12B981' : '#CDD3DC', opacity: locked ? 0.55 : 1, padding: 0 }}
                        >
                          <span style={{ position: 'absolute', top: 3, left: isOn ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s ease', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
                        </button>
                        <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: isOn ? '#0E7A4F' : '#98A1AD' }}>{isOn ? 'ON' : 'OFF'}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                        {f.variations.map((v) => {
                          const active = JSON.stringify(f.currentValue) === JSON.stringify(v.value);
                          return (
                            <button
                              key={v.name}
                              onClick={() => setValue(f, v.value)}
                              disabled={locked}
                              style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 7, transition: 'all .12s ease', background: active ? ACCENT : '#F2F4F7', color: active ? '#fff' : '#4A5261', opacity: locked ? 0.6 : 1 }}
                            >
                              {v.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

            {!loadingFlags && !flagError && locked && (flags?.length ?? 0) > 0 && (
              <div style={{ margin: '14px 18px', padding: '11px 13px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 9, fontSize: 12.5, color: '#92400E', display: 'flex', gap: 8 }}>
                <InfoIcon style={{ flex: '0 0 auto' }} />
                Read-only — no live URL to reflect changes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
