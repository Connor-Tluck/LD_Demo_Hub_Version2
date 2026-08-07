import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { Demo } from '../types';
import { fmt } from '../format';
import { ACCENT, useToast, useViewMode } from '../App';
import { EyeIcon, FlagIcon, HeartIcon, PlusIcon, SearchIcon, SplitIcon, XIcon } from '../icons';


export function useLikeToggle(update: (id: string, likeCount: number, liked: boolean) => void) {
  const toast = useToast();
  return useCallback(
    (demo: Demo) => {
      // Optimistic flip; reconcile with the server response.
      update(demo.id, demo.metrics.likeCount + (demo.likedByCurrentUser ? -1 : 1), !demo.likedByCurrentUser);
      api
        .like(demo.id)
        .then((r) => update(demo.id, r.likeCount, r.likedByCurrentUser))
        .catch(() => {
          update(demo.id, demo.metrics.likeCount, demo.likedByCurrentUser);
          toast('Could not update like');
        });
    },
    [update, toast],
  );
}

export function PendingBadge({ small = false }: { small?: boolean }) {
  return small ? (
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', flex: '0 0 auto' }} title="PR open" />
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 20 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
      PR open
    </div>
  );
}

function DemoCard({ demo, onLike }: { demo: Demo; onLike: (d: Demo) => void }) {
  const nav = useNavigate();
  const flagCount = demo.launchDarkly?.flags.length ?? 0;
  return (
    <div onClick={() => nav(`/demos/${demo.id}`)} className="card-hover" style={{ background: '#fff', border: '1px solid #E6E9EE', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', animation: 'fadeUp .35s ease both' }}>
      <div style={{ height: 132, background: demo.gradient, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -14, bottom: -30, fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 120, color: 'rgba(255,255,255,.14)', lineHeight: 1 }}>{demo.mono}</div>
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <span style={{ background: 'rgba(0,0,0,.28)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 20, letterSpacing: '.02em' }}>{demo.category}</span>
        </div>
        {demo.status === 'pending' && (
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <PendingBadge />
          </div>
        )}
        {flagCount > 0 && (
          <div style={{ position: 'absolute', bottom: 11, left: 12, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.92)', color: '#101317', fontSize: 10.5, fontWeight: 700, padding: '4px 8px', borderRadius: 6 }}>
            <FlagIcon size={11} strokeWidth={2} />
            {flagCount} flags
          </div>
        )}
      </div>
      <div style={{ padding: 18 }}>
        <h3 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontSize: 16.5, fontWeight: 600, letterSpacing: '-.01em', lineHeight: 1.25 }}>{demo.title}</h3>
        {demo.customer && (
          <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 600, color: '#6366F1' }}>{demo.customer}</div>
        )}
        <p style={{ margin: '7px 0 0', color: '#626B78', fontSize: 13, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{demo.description}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {demo.tags.map((t) => (
            <span key={t} style={{ fontSize: 11, color: '#4A5261', background: '#F2F4F7', padding: '3px 8px', borderRadius: 6, fontFamily: "'JetBrains Mono'" }}>{t}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, paddingTop: 13, borderTop: '1px solid #F0F2F5' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#7A828F', fontSize: 12.5, fontFamily: "'JetBrains Mono'" }}>
            <EyeIcon /> {fmt(demo.metrics.viewCount)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(demo);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, color: demo.likedByCurrentUser ? '#FF3D6B' : '#7A828F', fontSize: 12.5, fontFamily: "'JetBrains Mono'", fontWeight: 500 }}
          >
            <HeartIcon filled={demo.likedByCurrentUser} /> {fmt(demo.metrics.likeCount)}
          </button>
          <div style={{ flex: 1 }} />
          {demo.liveDemoUrl && <span title="Live demo available" style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,.16)' }} />}
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [viewMode, setViewMode] = useViewMode();
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [hasFlags, setHasFlags] = useState(false);
  const [sort, setSort] = useState('views');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    api.config().then((c) => setCategories(c.categories)).catch(() => {});
  }, []);

  // Nav-rail buttons deep-link the mode via ?view=
  useEffect(() => {
    const v = params.get('view');
    if (v === 'grid' || v === 'sidebar') setViewMode(v);
  }, [params, setViewMode]);

  const reload = useCallback(() => {
    api
      .listDemos({ search, category, hasFlags, sort })
      .then((r) => {
        setDemos(r.demos);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, category, hasFlags, sort]);

  // Debounced server-side search (the contract supports it even though the
  // dataset is small enough to filter client-side).
  useEffect(() => {
    const t = setTimeout(reload, search ? 220 : 0);
    return () => clearTimeout(t);
  }, [reload, search]);

  const updateLike = useCallback((id: string, likeCount: number, liked: boolean) => {
    setDemos((ds) => ds.map((d) => (d.id === id ? { ...d, metrics: { ...d.metrics, likeCount }, likedByCurrentUser: liked } : d)));
  }, []);
  const onLike = useLikeToggle(updateLike);

  const selected = useMemo(() => demos.find((d) => d.id === selectedId) ?? demos[0], [demos, selectedId]);

  const chip = (label: string, on: boolean, onClick: () => void, icon?: React.ReactNode) => (
    <button key={label} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 8, transition: 'all .12s ease', ...(on ? { background: '#101317', color: '#fff' } : { background: '#fff', color: '#4A5261', border: '1px solid #E3E6EB' }) }}>
      {icon}
      {label}
    </button>
  );

  const seg = (label: string, on: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 7, transition: 'all .12s ease', background: on ? '#101317' : 'transparent', color: on ? '#fff' : '#626B78' }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <header style={{ padding: '22px 28px 0', background: '#EEF0F3' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>Demo Gallery</h1>
            <p style={{ margin: '4px 0 0', color: '#626B78', fontSize: 13.5 }}>
              {loading ? 'Loading demos…' : `${demos.length} demo${demos.length === 1 ? '' : 's'}${search ? ` matching “${search}”` : ''}`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #E3E6EB', borderRadius: 9, padding: 2 }}>
              {seg('Grid', viewMode === 'grid', () => setViewMode('grid'))}
              {seg('Sidebar', viewMode === 'sidebar', () => setViewMode('sidebar'))}
            </div>
            <button onClick={() => nav('/add')} style={{ display: 'flex', alignItems: 'center', gap: 7, background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13.5, padding: '9px 15px', borderRadius: 9, boxShadow: '0 2px 8px rgba(51,85,255,.28)' }}>
              <PlusIcon size={15} strokeWidth={2} /> Add a demo
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #E3E6EB', borderRadius: 11, padding: '0 14px', height: 44, maxWidth: 560 }}>
            <SearchIcon style={{ color: '#98A1AD', flex: '0 0 auto' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search demos, tags, tech…" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14.5, background: 'transparent', color: '#101317' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: '#98A1AD', display: 'flex' }}>
                <XIcon />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E3E6EB', borderRadius: 11, height: 44, padding: '0 12px' }}>
            <span style={{ color: '#98A1AD', fontSize: 12.5 }}>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, fontWeight: 600, color: '#101317', cursor: 'pointer' }}>
              <option value="views">Most viewed</option>
              <option value="likes">Most liked</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid #E3E6EB' }}>
          {['All', ...categories].map((c) => chip(c, category === c, () => setCategory(c)))}
          <div style={{ width: 1, height: 22, background: '#E3E6EB', margin: '0 4px' }} />
          <button onClick={() => setHasFlags(!hasFlags)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 8, transition: 'all .12s ease', ...(hasFlags ? { background: '#EEF1FF', color: ACCENT, border: `1px solid ${ACCENT}` } : { background: '#fff', color: '#4A5261', border: '1px solid #E3E6EB' }) }}>
            <FlagIcon size={14} /> Has LaunchDarkly flags
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 40px' }}>
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #E9ECF0', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ height: 132, background: '#E9ECF0', animation: 'skel 1.4s ease-in-out infinite' }} />
                <div style={{ padding: 16 }}>
                  <div style={{ height: 15, width: '65%', background: '#E9ECF0', borderRadius: 5, animation: 'skel 1.4s ease-in-out infinite' }} />
                  <div style={{ height: 11, width: '92%', background: '#EEF0F3', borderRadius: 5, marginTop: 12, animation: 'skel 1.4s ease-in-out infinite' }} />
                  <div style={{ height: 22, width: '48%', background: '#EEF0F3', borderRadius: 6, marginTop: 16, animation: 'skel 1.4s ease-in-out infinite' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && demos.length === 0 && (
          <div style={{ maxWidth: 420, margin: '8vh auto', textAlign: 'center', animation: 'fadeUp .4s ease' }}>
            <div style={{ width: 76, height: 76, borderRadius: 20, background: '#fff', border: '1px solid #E3E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <SearchIcon size={34} style={{ color: '#B7BEC9' }} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontFamily: "'Space Grotesk'", fontSize: 19 }}>No demos match “{search}”</h3>
            <p style={{ margin: '0 0 18px', color: '#626B78', fontSize: 14 }}>Try a different keyword, or clear your filters to see everything.</p>
            <button onClick={() => { setSearch(''); setCategory('All'); setHasFlags(false); }} style={{ background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 14, padding: '10px 18px', borderRadius: 9 }}>
              Clear filters
            </button>
          </div>
        )}

        {!loading && demos.length > 0 && viewMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
            {demos.map((d) => (
              <DemoCard key={d.id} demo={d} onLike={onLike} />
            ))}
          </div>
        )}

        {!loading && demos.length > 0 && viewMode === 'sidebar' && selected && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {demos.map((d) => {
                const isSel = d.id === selected.id;
                return (
                  <button key={d.id} onClick={() => setSelectedId(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 10, borderRadius: 11, width: '100%', textAlign: 'left', transition: 'background .12s ease', background: isSel ? '#fff' : 'transparent', border: `1px solid ${isSel ? '#D9DEE6' : 'transparent'}`, boxShadow: isSel ? '0 2px 10px rgba(16,19,23,.06)' : undefined }}>
                    <div style={{ width: 40, height: 40, borderRadius: 9, background: d.gradient, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 15 }}>{d.mono}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Space Grotesk'" }}>{d.title}</div>
                      <div style={{ color: '#8A919D', fontSize: 11.5, marginTop: 2, fontFamily: "'JetBrains Mono'" }}>{d.category} · {fmt(d.metrics.viewCount)} views</div>
                    </div>
                    {d.status === 'pending' && <PendingBadge small />}
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1, minWidth: 0, background: '#fff', border: '1px solid #E6E9EE', borderRadius: 16, overflow: 'hidden', position: 'sticky', top: 0 }}>
              <div style={{ height: 150, background: selected.gradient, position: 'relative' }}>
                <div style={{ position: 'absolute', right: -10, bottom: -26, fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 130, color: 'rgba(255,255,255,.14)' }}>{selected.mono}</div>
                <div style={{ position: 'absolute', top: 14, left: 16, background: 'rgba(0,0,0,.28)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>{selected.category}</div>
              </div>
              <div style={{ padding: '20px 22px 24px' }}>
                <h2 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontSize: 22, letterSpacing: '-.02em' }}>{selected.title}</h2>
                <p style={{ margin: '8px 0 0', color: '#4A5261', fontSize: 14, lineHeight: 1.6 }}>{selected.description}</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button onClick={() => nav(`/demos/${selected.id}`)} style={{ background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13.5, padding: '9px 16px', borderRadius: 9 }}>Open details</button>
                  {(selected.launchDarkly?.flags.length ?? 0) > 0 && (
                    <button onClick={() => nav(`/demos/${selected.id}/split`)} style={{ background: '#101317', color: '#fff', fontWeight: 600, fontSize: 13.5, padding: '9px 16px', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <SplitIcon size={14} /> Split view
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
