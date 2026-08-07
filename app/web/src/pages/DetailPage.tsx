import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Demo } from '../types';
import { fmt, fmtDate } from '../format';
import { ACCENT, useToast } from '../App';
import { PendingBadge } from './BrowsePage';
import { BackIcon, ChevronDownIcon, CodeIcon, CopyIcon, ExternalIcon, FlagIcon, ForkIcon, HeartIcon, SplitIcon } from '../icons';

const sectionH: React.CSSProperties = { fontFamily: "'Space Grotesk'", fontSize: 15, textTransform: 'uppercase', letterSpacing: '.08em', color: '#8A919D' };
const chipStyle: React.CSSProperties = { fontSize: 11.5, color: '#4A5261', background: '#F2F4F7', padding: '3px 8px', borderRadius: 6, fontFamily: "'JetBrains Mono'" };

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const toast = useToast();
  const [demo, setDemo] = useState<Demo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const viewedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getDemo(id).then(setDemo).catch(() => setNotFound(true));
    if (viewedRef.current !== id) {
      viewedRef.current = id; // count once per visit (StrictMode double-mount included)
      api.view(id, 'detail').catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (notFound)
    return (
      <div style={{ margin: '20vh auto', textAlign: 'center', color: '#626B78' }}>
        <h2 style={{ fontFamily: "'Space Grotesk'" }}>Demo not found</h2>
        <button onClick={() => nav('/browse')} style={{ color: ACCENT, fontWeight: 600 }}>Back to gallery</button>
      </div>
    );
  if (!demo) return null;

  const hasFlags = (demo.launchDarkly?.flags.length ?? 0) > 0;

  const onLike = () => {
    const optimistic = { ...demo, likedByCurrentUser: !demo.likedByCurrentUser, metrics: { ...demo.metrics, likeCount: demo.metrics.likeCount + (demo.likedByCurrentUser ? -1 : 1) } };
    setDemo(optimistic);
    api
      .like(demo.id)
      .then((r) => setDemo((d) => (d ? { ...d, likedByCurrentUser: r.likedByCurrentUser, metrics: { ...d.metrics, likeCount: r.likeCount } } : d)))
      .catch(() => setDemo(demo));
  };

  const copyClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`git clone ${demo.repo.cloneUrl}`).catch(() => {});
    setCopied(true);
    toast('Clone command copied');
    api.event(demo.id, 'clone').catch(() => {});
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 28px 60px' }}>
        <button onClick={() => nav('/browse')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#626B78', fontSize: 13.5, fontWeight: 500, padding: '6px 0' }}>
          <BackIcon /> Back to gallery
        </button>

        <div style={{ borderRadius: 18, overflow: 'hidden', marginTop: 12, border: '1px solid #E6E9EE' }}>
          <div style={{ height: 180, background: demo.gradient, position: 'relative' }}>
            <div style={{ position: 'absolute', right: 0, bottom: -34, fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 170, color: 'rgba(255,255,255,.14)', lineHeight: 1 }}>{demo.mono}</div>
            <div style={{ position: 'absolute', top: 16, left: 18, display: 'flex', gap: 8 }}>
              <span style={{ background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 20 }}>{demo.category}</span>
              {demo.status === 'pending' && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 20 }}>Pending — PR open</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginTop: 22, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontSize: 30, fontWeight: 700, letterSpacing: '-.025em' }}>{demo.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: demo.author.avatarColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{demo.author.initials}</div>
              <span style={{ fontSize: 13.5, color: '#4A5261' }}>{demo.author.name}</span>
              <span style={{ color: '#C4CAD3' }}>·</span>
              <span style={{ fontSize: 13, color: '#8A919D', fontFamily: "'JetBrains Mono'" }}>Updated {fmtDate(demo.updatedAt)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onLike} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono'", padding: '11px 16px', borderRadius: 10, background: '#fff', border: '1px solid #E3E6EB', color: demo.likedByCurrentUser ? '#FF3D6B' : '#4A5261' }}>
              <HeartIcon size={17} filled={demo.likedByCurrentUser} />
              {fmt(demo.metrics.likeCount)}
            </button>
            <div style={{ position: 'relative' }}>
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#101317', color: '#fff', fontWeight: 600, fontSize: 14, padding: '11px 16px', borderRadius: 10 }}>
                <CodeIcon /> Get the code <ChevronDownIcon />
              </button>
              {menuOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 320, background: '#fff', border: '1px solid #E3E6EB', borderRadius: 12, boxShadow: '0 16px 44px rgba(16,19,23,.16)', padding: 6, zIndex: 30, animation: 'fadeUp .16s ease' }}>
                  <a href={demo.repo.forkUrl} target="_blank" rel="noreferrer" className="menu-item" onClick={() => api.event(demo.id, 'fork').catch(() => {})} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 8, color: '#101317' }}>
                    <ForkIcon style={{ color: '#4A5261' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Fork on GitHub</div>
                      <div style={{ fontSize: 12, color: '#8A919D' }}>Create your own copy</div>
                    </div>
                  </a>
                  <button onClick={copyClone} className="menu-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 8, textAlign: 'left' }}>
                    <CopyIcon style={{ color: '#4A5261' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{copied ? 'Copied!' : 'Copy clone command'}</div>
                      <div style={{ fontSize: 11.5, color: '#8A919D', fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>git clone {demo.repo.cloneUrl}</div>
                    </div>
                  </button>
                  <a href={demo.repo.htmlUrl} target="_blank" rel="noreferrer" className="menu-item" onClick={() => api.event(demo.id, 'source').catch(() => {})} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 8, color: '#101317' }}>
                    <ExternalIcon size={18} strokeWidth={1.6} style={{ color: '#4A5261' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>View source</div>
                      <div style={{ fontSize: 12, color: '#8A919D' }}>Open repo on GitHub</div>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          {hasFlags && (
            <button onClick={() => nav(`/demos/${demo.id}/split`)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 14, padding: '11px 18px', borderRadius: 10, boxShadow: '0 3px 12px rgba(51,85,255,.28)' }}>
              <SplitIcon /> Open split view + flags
            </button>
          )}
          {demo.liveDemoUrl && (
            <a href={demo.liveDemoUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E3E6EB', color: '#101317', fontWeight: 600, fontSize: 14, padding: '11px 18px', borderRadius: 10 }}>
              <ExternalIcon size={16} /> Open live demo
            </a>
          )}
        </div>

        <div style={{ display: 'flex', gap: 28, marginTop: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h3 style={{ ...sectionH, margin: '0 0 12px' }}>About</h3>
            {demo.longDescription.map((p, i) => (
              <p key={i} style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.7, color: '#33393F' }}>{p}</p>
            ))}

            {hasFlags && (
              <>
                <h3 style={{ ...sectionH, margin: '28px 0 12px' }}>Connected flags</h3>
                <div style={{ border: '1px solid #E6E9EE', borderRadius: 12, overflow: 'hidden' }}>
                  {demo.launchDarkly!.flags.map((f) => (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderBottom: '1px solid #F0F2F5', background: '#fff' }}>
                      <FlagIcon size={16} strokeWidth={1.8} style={{ color: ACCENT, flex: '0 0 auto' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                        <div style={{ fontSize: 11.5, color: '#8A919D', fontFamily: "'JetBrains Mono'" }}>{f.key}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#4A5261', background: '#F2F4F7', padding: '3px 9px', borderRadius: 20, fontFamily: "'JetBrains Mono'" }}>{f.kind}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside style={{ flex: '0 0 260px', background: '#fff', border: '1px solid #E6E9EE', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingBottom: 16, borderBottom: '1px solid #F0F2F5' }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 700 }}>{fmt(demo.metrics.viewCount)}</div>
                <div style={{ fontSize: 12, color: '#8A919D', marginTop: 2 }}>Views</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 700 }}>{fmt(demo.metrics.likeCount)}</div>
                <div style={{ fontSize: 12, color: '#8A919D', marginTop: 2 }}>Likes</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#A0A7B2', marginBottom: 5 }}>Tech stack</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{demo.techStack.map((t) => <span key={t} style={chipStyle}>{t}</span>)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#A0A7B2', marginBottom: 5 }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{demo.tags.map((t) => <span key={t} style={chipStyle}>{t}</span>)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#A0A7B2', marginBottom: 5 }}>Repository</div>
                <div style={{ fontSize: 12.5, color: '#4A5261', fontFamily: "'JetBrains Mono'", wordBreak: 'break-all' }}>
                  {demo.repo.owner}/{demo.repo.name}
                  {demo.repo.path ? `/${demo.repo.path}` : ''}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#A0A7B2', marginBottom: 5 }}>Created</div>
                <div style={{ fontSize: 13, color: '#4A5261', fontFamily: "'JetBrains Mono'" }}>{fmtDate(demo.createdAt)}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
