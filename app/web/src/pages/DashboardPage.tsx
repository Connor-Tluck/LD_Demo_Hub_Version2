import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { DashboardStats } from '../types';
import { fmt, timeAgo } from '../format';
import { ACCENT } from '../App';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E6E9EE', borderRadius: 14, padding: 20 };
const h3: React.CSSProperties = { margin: '0 0 16px', fontFamily: "'Space Grotesk'", fontSize: 16 };
const barTrack: React.CSSProperties = { height: 8, background: '#F0F2F5', borderRadius: 5, overflow: 'hidden' };

const AVATAR_COLORS = ['linear-gradient(135deg,#3355FF,#7B5CFF)', 'linear-gradient(135deg,#0EA5A5,#22C55E)', 'linear-gradient(135deg,#7C3AED,#DB2777)', 'linear-gradient(135deg,#F97316,#EF4444)', 'linear-gradient(135deg,#2563EB,#06B6D4)', 'linear-gradient(135deg,#16A34A,#65A30D)'];
const colorFor = (name: string) => AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

export default function DashboardPage() {
  const nav = useNavigate();
  const [dash, setDash] = useState<DashboardStats | null>(null);
  useEffect(() => {
    api.dashboard().then(setDash).catch(() => {});
  }, []);
  if (!dash) return null;

  const kpi = (label: string, value: string | number, sub: React.ReactNode) => (
    <div key={label} style={{ ...card, padding: 18 }}>
      <div style={{ fontSize: 12.5, color: '#8A919D', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 30, fontWeight: 700, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#626B78', marginTop: 4 }}>{sub}</div>
    </div>
  );

  const maxTop = Math.max(1, ...dash.topDemos.map((d) => d.views));
  const maxCat = Math.max(1, ...dash.categories.map((c) => c.views));
  const maxTech = Math.max(1, ...dash.tech.map((t) => t.count));

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 28px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>Dashboard</h1>
            <p style={{ margin: '4px 0 0', color: '#626B78', fontSize: 13.5 }}>How the demo library is being used · updated just now</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E3E6EB', borderRadius: 9, height: 40, padding: '0 12px', fontSize: 12.5, color: '#626B78' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#12B981' }} /> All time
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 20 }}>
          {kpi('Total demos', dash.totalDemos, <><span style={{ color: '#0E7A4F', fontWeight: 600 }}>{dash.published} published</span> · {dash.pending} pending</>)}
          {kpi('Total views', fmt(dash.totalViews), `${fmt(dash.avgViews)} avg / demo`)}
          {kpi('Total likes', fmt(dash.totalLikes), 'across the library')}
          {kpi('Flag adoption', `${dash.flagPct}%`, `${dash.flaggedCount} demos · ${dash.totalFlags} flags`)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16, marginTop: 16 }}>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ ...h3, margin: 0 }}>Most viewed demos</h3>
              <span style={{ fontSize: 12, color: '#98A1AD' }}>views</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {dash.topDemos.map((d) => (
                <button key={d.id} onClick={() => nav(`/demos/${d.id}`)} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, background: d.gradient, color: '#fff', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{d.mono}</span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</span>
                    <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono'", fontWeight: 600, color: '#4A5261' }}>{fmt(d.views)}</span>
                  </div>
                  <div style={barTrack}>
                    <div style={{ height: '100%', width: `${((d.views / maxTop) * 100).toFixed(1)}%`, background: d.gradient, borderRadius: 5 }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={card}>
            <h3 style={h3}>Topic coverage</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {dash.categories.map((c) => (
                <div key={c.name}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#33393F' }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: '#8A919D', fontFamily: "'JetBrains Mono'", flex: '0 0 auto', paddingLeft: 10 }}>{c.count} · {fmt(c.views)} views</span>
                  </div>
                  <div style={barTrack}>
                    <div style={{ height: '100%', width: `${((c.views / maxCat) * 100).toFixed(1)}%`, background: ACCENT, borderRadius: 5 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 16, marginTop: 16 }}>
          <div style={card}>
            <h3 style={h3}>Tech stack usage</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {dash.tech.map((t) => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ flex: '0 0 92px', fontSize: 12.5, fontFamily: "'JetBrains Mono'", color: '#33393F' }}>{t.name}</span>
                  <div style={{ flex: 1, ...barTrack }}>
                    <div style={{ height: '100%', width: `${((t.count / maxTech) * 100).toFixed(1)}%`, background: 'linear-gradient(90deg,#0EA5A5,#10B981)', borderRadius: 5 }} />
                  </div>
                  <span style={{ flex: '0 0 auto', fontSize: 12, fontWeight: 600, color: '#8A919D', fontFamily: "'JetBrains Mono'" }}>{t.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <h3 style={h3}>Top contributors</h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 8, borderBottom: '1px solid #F0F2F5', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: '#A0A7B2', fontWeight: 600 }}>
                <span style={{ flex: 1 }}>Author</span>
                <span style={{ flex: '0 0 60px', textAlign: 'right' }}>Demos</span>
                <span style={{ flex: '0 0 70px', textAlign: 'right' }}>Views</span>
                <span style={{ flex: '0 0 60px', textAlign: 'right' }}>Likes</span>
              </div>
              {dash.topContributors.map((c) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #F4F6F8' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: '0 0 auto' }}>{c.initials}</div>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ flex: '0 0 60px', textAlign: 'right', fontSize: 13, fontFamily: "'JetBrains Mono'", color: '#4A5261' }}>{c.demos}</span>
                  <span style={{ flex: '0 0 70px', textAlign: 'right', fontSize: 13, fontFamily: "'JetBrains Mono'", color: '#4A5261' }}>{fmt(c.views)}</span>
                  <span style={{ flex: '0 0 60px', textAlign: 'right', fontSize: 13, fontFamily: "'JetBrains Mono'", color: '#4A5261' }}>{fmt(c.likes)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...card, marginTop: 16 }}>
          <h3 style={{ ...h3, margin: '0 0 4px' }}>Recent activity</h3>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#98A1AD' }}>Who's using what, right now</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dash.activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F4F6F8' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: colorFor(a.who), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, flex: '0 0 auto' }}>{a.initials}</div>
                <div style={{ flex: 1, fontSize: 13.5, color: '#33393F' }}>
                  <b style={{ fontWeight: 600 }}>{a.who}</b> {a.verb} <b style={{ fontWeight: 600 }}>{a.demoTitle}</b>
                </div>
                <span style={{ flex: '0 0 auto', fontSize: 12, color: '#A0A7B2', fontFamily: "'JetBrains Mono'" }}>{timeAgo(a.at)}</span>
              </div>
            ))}
            {dash.activity.length === 0 && <p style={{ color: '#98A1AD', fontSize: 13 }}>No activity yet — go open some demos.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
