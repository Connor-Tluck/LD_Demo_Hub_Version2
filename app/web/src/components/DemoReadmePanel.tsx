import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Demo } from '../types';
import { ExternalIcon } from '../icons';

interface Props {
  demo: Demo;
}

export default function DemoReadmePanel({ demo }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [readmeUrl, setReadmeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMissing(false);
    setHtml(null);

    api
      .getDemoReadme(demo.id)
      .then((r) => {
        if (cancelled) return;
        setHtml(r.html);
        setReadmeUrl(r.url);
      })
      .catch(() => {
        if (cancelled) return;
        setMissing(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [demo.id]);

  if (loading) {
    return (
      <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid #F0F2F5' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#A0A7B2', marginBottom: 12, fontWeight: 600 }}>Project README</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: 12, background: '#EEF0F3', borderRadius: 6, width: i === 3 ? '60%' : '100%', animation: 'skel 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  if (missing || !html) {
    return (
      <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid #F0F2F5' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#A0A7B2', marginBottom: 12, fontWeight: 600 }}>About this project</div>
        {demo.longDescription.map((p, i) => (
          <p key={i} style={{ margin: '0 0 12px', color: '#4A5261', fontSize: 14, lineHeight: 1.65 }}>{p}</p>
        ))}
        {demo.techStack.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {demo.techStack.map((t) => (
              <span key={t} style={{ fontSize: 11, color: '#4A5261', background: '#F2F4F7', padding: '3px 8px', borderRadius: 6, fontFamily: "'JetBrains Mono'" }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid #F0F2F5' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#A0A7B2', fontWeight: 600 }}>Project README</div>
        {readmeUrl && (
          <a href={readmeUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#626B78' }}>
            View on GitHub <ExternalIcon size={13} />
          </a>
        )}
      </div>
      <div className="demo-readme" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
