import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import type { SubmissionResult } from '../types';
import { ACCENT } from '../App';
import { BackIcon, CheckIcon, ForkIcon, InfoIcon } from '../icons';

const STEPS = ['Metadata', 'Source', 'LaunchDarkly', 'Review'];
const DEFAULT_CATEGORIES = ['Rollouts', 'Targeting', 'Experimentation', 'Release Orchestration', 'Reliability', 'Mobile', 'Migration', 'Onboarding', 'AI', 'Customer Demo', 'Internal Tool'];

const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #E3E6EB', borderRadius: 9, padding: '10px 12px', fontSize: 14, outline: 'none', background: '#FBFBFC', color: '#101317' };
const lblStyle: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4A5261', marginBottom: 6 };

const csv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export default function AddDemoPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [sourceType, setSourceType] = useState<'github' | 'upload'>('github');
  const [files, setFiles] = useState<FileList | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', customer: '', category: 'Rollouts', tags: '', tech: '',
    repo: '', path: '', branch: 'main', live: '',
    ldProject: '', ldEnv: 'production', ldFlags: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api
      .config()
      .then((c) => {
        setForm((f) => ({ ...f, ldProject: f.ldProject || c.ldProjectKey, ldEnv: f.ldEnv || c.ldEnvironmentKey }));
        setCategories([...new Set([...DEFAULT_CATEGORIES, ...c.categories])].sort());
      })
      .catch(() => {});
  }, []);

  const payload = () => ({
    title: form.title,
    description: form.description,
    customer: form.customer.trim() || undefined,
    category: form.category,
    tags: csv(form.tags),
    techStack: csv(form.tech),
    sourceType,
    repo: sourceType === 'github' ? { url: form.repo, path: form.path || undefined, branch: form.branch || 'main' } : undefined,
    liveDemoUrl: form.live || null,
    launchDarkly: form.ldProject && csv(form.ldFlags).length > 0
      ? { projectKey: form.ldProject, environmentKey: form.ldEnv || 'production', flagKeys: csv(form.ldFlags) }
      : null,
  });

  const submit = () => {
    setSubmitting(true);
    setError(null);
    const run = sourceType === 'upload' && files && files.length > 0
      ? api.submitUpload(payload(), files)
      : api.submit(payload());

    run
      .then(setResult)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Submission failed — try again.'))
      .finally(() => setSubmitting(false));
  };

  if (result) {
    return (
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 28px 60px' }}>
          <div style={{ textAlign: 'center', padding: '6vh 0', animation: 'fadeUp .4s ease' }}>
            <div style={{ width: 78, height: 78, borderRadius: 22, background: '#EAF7F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' }}>
              <CheckIcon size={38} color="#12B981" />
            </div>
            <h1 style={{ margin: '0 0 8px', fontFamily: "'Space Grotesk'", fontSize: 26, fontWeight: 700 }}>PR opened</h1>
            <p style={{ margin: '0 auto 24px', color: '#626B78', fontSize: 15, maxWidth: 400, lineHeight: 1.6 }}>
              The agent created a pull request for <b>{form.title}</b>. Once a maintainer merges it, your demo flips from pending to published.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #E6E9EE', borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
              <ForkIcon size={22} style={{ color: '#4A5261' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>PR #{result.prNumber}</div>
                <a href={result.prUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontFamily: "'JetBrains Mono'" }}>{result.prUrl}</a>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <a href={result.prUrl} target="_blank" rel="noreferrer" style={{ background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 14, padding: '11px 20px', borderRadius: 10 }}>View pull request</a>
              <button onClick={() => nav('/browse')} style={{ background: '#fff', border: '1px solid #E3E6EB', color: '#101317', fontWeight: 600, fontSize: 14, padding: '11px 20px', borderRadius: 10 }}>Back to gallery</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const reviewRows = [
    { label: 'Title', value: form.title || '—' },
    { label: 'Description', value: form.description || '—' },
    { label: 'Customer', value: form.customer || '(none — internal/generic)' },
    { label: 'Category', value: form.category },
    { label: 'Tags', value: form.tags || '—' },
    { label: 'Tech stack', value: form.tech || '—' },
    { label: 'Source', value: sourceType === 'github' ? `GitHub: ${form.repo || '—'}${form.path ? ` /${form.path}` : ''} @ ${form.branch || 'main'}` : `File upload (${files?.length ?? 0} file(s) → demos/<slug>/)` },
    { label: 'Live URL', value: form.live || '(none)' },
    { label: 'LD project', value: `${form.ldProject || '—'} / ${form.ldEnv}` },
    { label: 'Flags', value: form.ldFlags || '(none)' },
  ];

  const sourceValid = sourceType === 'github' ? !!form.repo.trim() : !!(files && files.length > 0);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 28px 60px' }}>
        <button onClick={() => nav('/browse')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#626B78', fontSize: 13.5, fontWeight: 500, padding: '6px 0' }}>
          <BackIcon /> Cancel
        </button>

        <h1 style={{ margin: '10px 0 4px', fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 700, letterSpacing: '-.02em' }}>Add content</h1>
        <p style={{ margin: '0 0 22px', color: '#626B78', fontSize: 14 }}>Submit a demo or internal tool. Our agent opens a GitHub PR against the central hub repo.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 26 }}>
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono'", flex: '0 0 auto', transition: 'all .15s ease', background: step >= i ? ACCENT : '#EEF0F3', color: step >= i ? '#fff' : '#98A1AD' }}>
                  {step > i ? <CheckIcon /> : i + 1}
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', color: step >= i ? '#101317' : '#A0A7B2' }}>{label}</span>
              </div>
              {i < 3 && <div style={{ flex: 1, height: 2, borderRadius: 2, background: step > i ? ACCENT : '#E3E6EB', margin: '0 4px' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #E6E9EE', borderRadius: 16, padding: 24 }}>
          {step === 0 && (
            <>
              <h3 style={{ margin: '0 0 16px', fontFamily: "'Space Grotesk'", fontSize: 17 }}>Metadata</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div><label style={lblStyle}>Title</label><input value={form.title} onChange={set('title')} placeholder="Progressive Rollout Playground" style={inputStyle} /></div>
                <div><label style={lblStyle}>Short description</label><textarea value={form.description} onChange={set('description')} placeholder="One line for the card — what does this demo show?" rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></div>
                <div><label style={lblStyle}>Customer (optional)</label><input value={form.customer} onChange={set('customer')} placeholder="Acme Corp — leave blank for internal/generic demos" style={inputStyle} /></div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={lblStyle}>Category</label>
                    <select value={form.category} onChange={set('category')} style={inputStyle}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
                  </div>
                  <div style={{ flex: 1 }}><label style={lblStyle}>Tags (comma-sep)</label><input value={form.tags} onChange={set('tags')} placeholder="canary, guarded-release" style={inputStyle} /></div>
                </div>
                <div><label style={lblStyle}>Tech stack / code (comma-sep)</label><input value={form.tech} onChange={set('tech')} placeholder="React, Node, Python" style={inputStyle} /></div>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h3 style={{ margin: '0 0 16px', fontFamily: "'Space Grotesk'", fontSize: 17 }}>Source</h3>
              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                {(['github', 'upload'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSourceType(mode)}
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `2px solid ${sourceType === mode ? ACCENT : '#E3E6EB'}`,
                      background: sourceType === mode ? '#EEF1FF' : '#fff',
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: '#101317',
                    }}
                  >
                    {mode === 'github' ? 'Link GitHub repo' : 'Upload project files'}
                  </button>
                ))}
              </div>
              {sourceType === 'github' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div><label style={lblStyle}>GitHub URL or owner/name</label><input value={form.repo} onChange={set('repo')} placeholder="Connor-Tluck/ld-release-runner" style={inputStyle} /></div>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{ flex: 1 }}><label style={lblStyle}>Path (monorepo, optional)</label><input value={form.path} onChange={set('path')} placeholder="apps/rollout" style={inputStyle} /></div>
                    <div style={{ flex: 1 }}><label style={lblStyle}>Branch</label><input value={form.branch} onChange={set('branch')} placeholder="main" style={inputStyle} /></div>
                  </div>
                  <div><label style={lblStyle}>Live demo URL (optional)</label><input value={form.live} onChange={set('live')} placeholder="https://rollout.demos.dev" style={inputStyle} /></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={lblStyle}>Project files</label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setFiles(e.target.files)}
                      style={{ ...inputStyle, padding: 8 }}
                    />
                    <p style={{ margin: '7px 0 0', fontSize: 12, color: '#98A1AD' }}>
                      Upload source files, README, or a zip. Files land in <code>demos/&lt;slug&gt;/</code> in the hub repo via PR.
                    </p>
                  </div>
                  <div><label style={lblStyle}>Live demo URL (optional)</label><input value={form.live} onChange={set('live')} placeholder="https://..." style={inputStyle} /></div>
                </div>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <h3 style={{ margin: '0 0 16px', fontFamily: "'Space Grotesk'", fontSize: 17 }}>LaunchDarkly</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ flex: 1 }}><label style={lblStyle}>Project key</label><input value={form.ldProject} onChange={set('ldProject')} placeholder="CT-Demo_Hub" style={inputStyle} /></div>
                  <div style={{ flex: 1 }}><label style={lblStyle}>Environment key</label><input value={form.ldEnv} onChange={set('ldEnv')} placeholder="production" style={inputStyle} /></div>
                </div>
                <div>
                  <label style={lblStyle}>Connected flag keys (comma-sep)</label>
                  <input value={form.ldFlags} onChange={set('ldFlags')} placeholder="new-checkout, promo-banner" style={inputStyle} />
                  <p style={{ margin: '7px 0 0', fontSize: 12, color: '#98A1AD' }}>Leave blank if this demo has no flags.</p>
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h3 style={{ margin: '0 0 16px', fontFamily: "'Space Grotesk'", fontSize: 17 }}>Review & submit</h3>
              <div style={{ border: '1px solid #EEF0F3', borderRadius: 10, overflow: 'hidden' }}>
                {reviewRows.map((r) => (
                  <div key={r.label} style={{ display: 'flex', gap: 14, padding: '11px 14px', borderBottom: '1px solid #F4F6F8', fontSize: 13.5 }}>
                    <div style={{ flex: '0 0 130px', color: '#8A919D', fontWeight: 600 }}>{r.label}</div>
                    <div style={{ flex: 1, color: '#33393F', fontFamily: "'JetBrains Mono'", wordBreak: 'break-word' }}>{r.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 9, marginTop: 16, padding: '12px 14px', background: '#EEF1FF', borderRadius: 10 }}>
                <InfoIcon size={18} style={{ color: ACCENT, flex: '0 0 auto' }} />
                <span style={{ fontSize: 13, color: '#33393F', lineHeight: 1.5 }}>
                  On submit, an agent opens a PR against <b>LD_Demo_Hub_Version2</b>. Your entry appears as <b>pending</b> until it merges.
                </span>
              </div>
              {error && (
                <div style={{ marginTop: 12, padding: '11px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 13, color: '#B91C1C' }}>{error}</div>
              )}
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid #F0F2F5' }}>
            <button onClick={() => (step === 0 ? nav('/browse') : setStep(step - 1))} style={{ background: '#fff', border: '1px solid #E3E6EB', color: '#626B78', fontWeight: 600, fontSize: 14, padding: '10px 20px', borderRadius: 9 }}>
              Back
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={(step === 0 && (!form.title.trim() || !form.description.trim())) || (step === 1 && !sourceValid)}
                style={{ background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 14, padding: '10px 22px', borderRadius: 9, opacity: (step === 0 && (!form.title.trim() || !form.description.trim())) || (step === 1 && !sourceValid) ? 0.5 : 1 }}
              >
                Continue
              </button>
            ) : (
              <button onClick={submit} disabled={submitting || !sourceValid} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#101317', color: '#fff', fontWeight: 600, fontSize: 14, padding: '10px 22px', borderRadius: 9 }}>
                {submitting && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
                {submitting ? 'Opening PR…' : 'Submit & open PR'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
