import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { DashboardStats, InternalTool } from '../types';
import { fmt } from '../format';
import { ACCENT } from '../App';
import { ArrowRightIcon, ChartIcon, ExternalIcon, GridIcon, PlusIcon } from '../icons';

const sectionH: React.CSSProperties = { fontFamily: "'Space Grotesk'", fontSize: 15, textTransform: 'uppercase', letterSpacing: '.08em', color: '#8A919D' };

export default function HomePage() {
  const nav = useNavigate();
  const [dash, setDash] = useState<DashboardStats | null>(null);
  const [tools, setTools] = useState<InternalTool[]>([]);
  useEffect(() => {
    api.dashboard().then(setDash).catch(() => {});
    api.tools().then((r) => setTools(r.tools)).catch(() => {});
  }, []);

  const stat = (value: string | number, label: string) => (
    <div key={label}>
      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 700, color: '#fff' }}>{value}</div>
      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{label}</div>
    </div>
  );

  const jumpCard = (
    icon: React.ReactNode,
    iconBg: string,
    title: string,
    desc: string,
    cta: string,
    onClick: () => void,
  ) => (
    <button key={title} onClick={onClick} className="card-hover" style={{ textAlign: 'left', background: '#fff', border: '1px solid #E6E9EE', borderRadius: 16, padding: 22 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#fff' }}>{icon}</div>
      <h3 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontSize: 17, fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: '7px 0 14px', color: '#626B78', fontSize: 13.5, lineHeight: 1.5 }}>{desc}</p>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: ACCENT, fontSize: 13.5, fontWeight: 600 }}>
        {cta} <ArrowRightIcon />
      </span>
    </button>
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#EEF0F3' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '26px 28px 64px' }}>
        {/* HERO */}
        <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', background: '#0E1116', padding: '56px 48px', animation: 'fadeUp .5s ease' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(1000px 400px at 80% -20%, rgba(123,92,255,.55), transparent), radial-gradient(700px 400px at 0% 120%, rgba(51,85,255,.45), transparent)' }} />
          <div style={{ position: 'absolute', right: -40, bottom: -70, fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 260, color: 'rgba(255,255,255,.04)', lineHeight: 1 }}>◆</div>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 12.5, fontWeight: 600, padding: '6px 12px', borderRadius: 20, marginBottom: 22 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#12E29B' }} /> Internal · Solution Engineering
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontSize: 52, fontWeight: 700, letterSpacing: '-.03em', color: '#fff', lineHeight: 1.02, maxWidth: 640 }}>SE Content Hub</h1>
            <p style={{ margin: '18px 0 0', color: 'rgba(255,255,255,.72)', fontSize: 17, lineHeight: 1.6, maxWidth: 560 }}>
              Discover, run, and share every demo and internal tool the team has built. Browse the catalog, analyze usage, link a GitHub repo or upload project files — and pair live demos with LaunchDarkly flags in split view.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap' }}>
              <button onClick={() => nav('/browse')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', color: '#101317', fontWeight: 700, fontSize: 15, padding: '13px 22px', borderRadius: 11, fontFamily: "'Space Grotesk'" }}>
                <GridIcon size={17} strokeWidth={1.8} /> Browse the gallery
              </button>
              <button onClick={() => nav('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,.12)', color: '#fff', fontWeight: 600, fontSize: 15, padding: '13px 22px', borderRadius: 11, border: '1px solid rgba(255,255,255,.18)' }}>
                <ChartIcon size={17} strokeWidth={1.8} /> View analytics
              </button>
            </div>
            <div style={{ display: 'flex', gap: 40, marginTop: 40, flexWrap: 'wrap' }}>
              {dash && [
                stat(dash.totalDemos, 'demos'),
                stat(fmt(dash.totalViews), 'total views'),
                stat(`${dash.flagPct}%`, 'wired to flags'),
                stat(dash.contributors, 'contributors'),
              ]}
            </div>
          </div>
        </div>

        {/* JUMP IN */}
        <h2 style={{ ...sectionH, margin: '36px 0 14px' }}>Jump in</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {jumpCard(<GridIcon size={22} strokeWidth={1.8} />, 'linear-gradient(135deg,#3355FF,#7B5CFF)', 'Demo Gallery', 'Search and browse every demo. Grid or sidebar, filter by topic, tech, or flags.', 'Open gallery', () => nav('/browse'))}
          {jumpCard(<ChartIcon size={22} strokeWidth={1.8} />, 'linear-gradient(135deg,#0EA5A5,#10B981)', 'Analytics Dashboard', "See what's used most, topic coverage, contributors, and recent activity.", 'View dashboard', () => nav('/dashboard'))}
          {jumpCard(<PlusIcon size={22} strokeWidth={2.2} />, 'linear-gradient(135deg,#F97316,#EF4444)', 'Add Content', 'Link a GitHub repo or upload project files. An agent opens a PR — no manual repo edits.', 'Add content', () => nav('/add'))}
        </div>

        {/* INTERNAL TOOLS */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '38px 0 14px' }}>
          <h2 style={{ ...sectionH, margin: 0 }}>Internal tools</h2>
          <span style={{ fontSize: 12.5, color: '#A0A7B2' }}>Opens in a new tab</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {tools.map((t) => (
            <a key={t.id} href={t.url} target="_blank" rel="noreferrer" className="tool-hover" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: '#fff', border: '1px solid #E6E9EE', borderRadius: 14, padding: 18, color: '#101317' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: t.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 15 }}>{t.mono}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 14.5 }}>{t.name}</span>
                  <ExternalIcon size={13} style={{ color: '#B7BEC9' }} />
                </div>
                <p style={{ margin: '4px 0 0', color: '#626B78', fontSize: 12.5, lineHeight: 1.5 }}>{t.description}</p>
              </div>
            </a>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: '#A0A7B2', fontSize: 12.5, marginTop: 40 }}>SE Content Hub · Solution Engineering</p>
      </div>
    </div>
  );
}
