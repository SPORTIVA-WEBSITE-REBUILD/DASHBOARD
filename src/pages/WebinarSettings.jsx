import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { PageHeader } from '../layout/Shell.jsx';
import { ErrorState, Field, Spinner, useToast, Modal } from '../components/ui.jsx';
import UrlImageUpload from '../components/UrlImageUpload.jsx';

/** UTC <-> the plain local-time strings a datetime-local input needs. The
 *  Webinar's startsAt/endsAt/webinarHeroEndsAt are stored as real UTC
 *  instants; this box shows/edits them in the admin's own browser
 *  timezone, same as every other date field in this dashboard. */
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(local) {
  return local ? new Date(local).toISOString() : undefined;
}

// Not VITE_SITE_URL (the dashboard has no such env var today — only
// VITE_API_URL) — derived from the API URL's host instead, which this
// dashboard already has, swapping the api/admin subdomain for the bare
// domain. Falls back to the known production domain if that guess fails.
function publicSiteUrl() {
  try {
    const apiHost = new URL(import.meta.env.VITE_API_URL || '').hostname;
    if (apiHost.includes('netlify.app')) {
      // A preview/branch host, e.g. webinar-preview--pcnsportivalp-api —
      // the matching web preview swaps the site segment, same alias.
      return `https://${apiHost.replace('pcnsportivalp-api', 'pcnsportivalp-web')}`;
    }
  } catch {
    // fall through to the production default below
  }
  return 'https://pcnsportivalp.com';
}

export default function WebinarSettings() {
  const [values, setValues] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['webinar-admin'],
    queryFn: () => api.get('/admin/webinar').then((r) => r.data),
  });

  useEffect(() => { if (data) { setValues(data); setDirty(false); } }, [data]);

  // Unsaved-changes warning, same pattern used on every content form in the
  // dashboard.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const set = (key, value) => { setValues((v) => ({ ...v, [key]: value })); setDirty(true); };
  const setEmail = (key, value) => set('email', { ...values.email, [key]: value });
  const setSocial = (key, value) => set('social', { ...values.social, [key]: value });

  const speakers = values?.speakers || [];
  const setSpeaker = (i, patch) => {
    const next = [...speakers];
    next[i] = { ...next[i], ...patch };
    set('speakers', next);
  };
  const addSpeaker = () => set('speakers', [...speakers, {
    name: '', role: 'Speaker', titleLines: [], shortBio: '', bio: '', photoUrl: '', order: speakers.length + 1,
  }]);
  const removeSpeaker = (i) => set('speakers', speakers.filter((_, j) => j !== i).map((s, j) => ({ ...s, order: j + 1 })));
  const moveSpeaker = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= speakers.length) return;
    const next = [...speakers];
    [next[i], next[j]] = [next[j], next[i]];
    set('speakers', next.map((s, k) => ({ ...s, order: k + 1 })));
  };

  const faq = values?.faq || [];
  const setFaqItem = (i, patch) => {
    const next = [...faq];
    next[i] = { ...next[i], ...patch };
    set('faq', next);
  };
  const addFaq = () => set('faq', [...faq, { question: '', answer: '', order: faq.length + 1 }]);
  const removeFaq = (i) => set('faq', faq.filter((_, j) => j !== i).map((f, j) => ({ ...f, order: j + 1 })));
  const moveFaq = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= faq.length) return;
    const next = [...faq];
    [next[i], next[j]] = [next[j], next[i]];
    set('faq', next.map((f, k) => ({ ...f, order: k + 1 })));
  };

  const save = useMutation({
    mutationFn: () => api.put('/admin/webinar', {
      title: values.title || '',
      subtitle: values.subtitle || '',
      description: values.description || '',
      startsAt: values.startsAt || undefined,
      endsAt: values.endsAt || undefined,
      timezone: values.timezone || 'Africa/Lagos',
      meetUrl: values.meetUrl || '',
      supportEmail: values.supportEmail || '',
      organiserName: values.organiserName || '',
      bannerUrl: values.bannerUrl || '',
      shareImageUrl: values.shareImageUrl || '',
      speakers: speakers.map((s) => ({
        name: s.name || '', role: s.role || '', titleLines: s.titleLines || [],
        shortBio: s.shortBio || '', bio: s.bio || '', photoUrl: s.photoUrl || '', order: s.order || 0,
      })),
      faq: faq.map((f) => ({ question: f.question || '', answer: f.answer || '', order: f.order || 0 })),
      social: values.social || {},
      recordingUrl: values.recordingUrl || '',
      email: values.email || {},
      webinarHeroEnabled: Boolean(values.webinarHeroEnabled),
      webinarHeroEndsAt: values.webinarHeroEndsAt || undefined,
      registrationOpen: values.registrationOpen !== false,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webinar-admin'] });
      toast.success('Webinar settings saved');
      setDirty(false);
    },
    onError: (err) => toast.error(err.message || 'Could not save'),
  });

  const testEmail = useMutation({
    mutationFn: () => api.post('/admin/webinar/test-email', { to: testEmailAddr }),
    onSuccess: () => { toast.success(`Test email sent to ${testEmailAddr}`); setTestEmailOpen(false); setTestEmailAddr(''); },
    onError: (err) => toast.error(err.message || 'Could not send the test email'),
  });

  if (isLoading || !values) return <><PageHeader title="Webinar" /><div className="content"><Spinner /></div></>;
  if (isError) return <><PageHeader title="Webinar" /><div className="content"><ErrorState error={error} onRetry={refetch} /></div></>;

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <PageHeader
        title="Webinar"
        actions={(
          <>
            <a href={`${publicSiteUrl()}/webinar?previewWebinar=1`} className="btn btn--ghost" target="_blank" rel="noopener noreferrer">
              Preview
            </a>
            <button type="button" className="btn" onClick={() => setTestEmailOpen(true)}>Send test email</button>
            <button type="submit" className="btn btn--primary" disabled={save.isPending || !dirty}>
              {save.isPending && <Spinner />} Save changes
            </button>
          </>
        )}
      />

      <div className="content">
        <div className="card">
          <div className="card__header"><h2>Hero control</h2></div>
          <label className="checkbox" htmlFor="heroEnabled">
            <input
              id="heroEnabled" type="checkbox" checked={Boolean(values.webinarHeroEnabled)}
              onChange={(e) => set('webinarHeroEnabled', e.target.checked)}
            />
            {' '}Show webinar in the home page hero
          </label>
          <Field label="Hero ends at" htmlFor="heroEndsAt" hint="The normal hero returns automatically after this time.">
            <input
              id="heroEndsAt" type="datetime-local"
              value={toLocalInput(values.webinarHeroEndsAt)}
              onChange={(e) => set('webinarHeroEndsAt', fromLocalInput(e.target.value))}
            />
          </Field>
          <label className="checkbox" htmlFor="registrationOpen">
            <input
              id="registrationOpen" type="checkbox" checked={values.registrationOpen !== false}
              onChange={(e) => set('registrationOpen', e.target.checked)}
            />
            {' '}Registration is open
          </label>
          <p className="hint">
            To look at the webinar hero before switching this on for everyone, open{' '}
            <code>/?previewWebinar=1</code> on the live site while signed in here — it shows
            only to you and never changes this setting.
          </p>
        </div>

        <div className="card">
          <div className="card__header"><h2>Event details</h2></div>
          <Field label="Title" htmlFor="title" required>
            <input id="title" type="text" value={values.title || ''} onChange={(e) => set('title', e.target.value)} required />
          </Field>
          <Field label="Subtitle" htmlFor="subtitle" hint="A short restatement used in link previews alongside the full title.">
            <input id="subtitle" type="text" value={values.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} />
          </Field>
          <Field label="About this webinar" htmlFor="description">
            <textarea id="description" rows={4} value={values.description || ''} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <div className="row">
            <Field label="Starts at" htmlFor="startsAt" required>
              <input
                id="startsAt" type="datetime-local" required
                value={toLocalInput(values.startsAt)}
                onChange={(e) => set('startsAt', fromLocalInput(e.target.value))}
              />
            </Field>
            <Field label="Ends at" htmlFor="endsAt" required>
              <input
                id="endsAt" type="datetime-local" required
                value={toLocalInput(values.endsAt)}
                onChange={(e) => set('endsAt', fromLocalInput(e.target.value))}
              />
            </Field>
            <Field label="Timezone" htmlFor="timezone" hint="IANA zone, e.g. Africa/Lagos">
              <input id="timezone" type="text" value={values.timezone || ''} onChange={(e) => set('timezone', e.target.value)} />
            </Field>
          </div>
          <Field
            label="Google Meet link"
            htmlFor="meetUrl"
            hint="Never shown on the website. Sent only in the confirmation and reminder emails."
          >
            <input id="meetUrl" type="url" value={values.meetUrl || ''} onChange={(e) => set('meetUrl', e.target.value)} placeholder="https://meet.google.com/…" />
          </Field>
          <div className="row">
            <Field label="Organiser name" htmlFor="organiserName">
              <input id="organiserName" type="text" value={values.organiserName || ''} onChange={(e) => set('organiserName', e.target.value)} />
            </Field>
            <Field label="Support email" htmlFor="supportEmail">
              <input id="supportEmail" type="email" value={values.supportEmail || ''} onChange={(e) => set('supportEmail', e.target.value)} />
            </Field>
          </div>
          <Field label="Recording link" htmlFor="recordingUrl" hint="Shown on /webinar once the event has ended.">
            <input id="recordingUrl" type="url" value={values.recordingUrl || ''} onChange={(e) => set('recordingUrl', e.target.value)} />
          </Field>
        </div>

        <div className="card">
          <div className="card__header"><h2>Banner &amp; share image</h2></div>
          <UrlImageUpload
            label="Promotional banner (portrait, 1080×1350)"
            value={values.bannerUrl}
            onChange={(url) => set('bannerUrl', url)}
            hint="Shown on the hero and the /webinar page."
          />
          <UrlImageUpload
            label="Link-preview image (landscape, 1200×630)"
            value={values.shareImageUrl}
            onChange={(url) => set('shareImageUrl', url)}
            hint="Used when the webinar link is shared on WhatsApp, LinkedIn, X and Facebook. A generated default is used until one is uploaded here."
          />
        </div>

        <div className="card">
          <div className="card__header"><h2>Speakers</h2></div>
          {speakers.map((s, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="card" key={i} style={{ background: '#fafbfc' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Speaker {i + 1}</strong>
                <div>
                  <button type="button" className="btn btn--sm" onClick={() => moveSpeaker(i, -1)} disabled={i === 0}>Move up</button>
                  {' '}
                  <button type="button" className="btn btn--sm" onClick={() => moveSpeaker(i, 1)} disabled={i === speakers.length - 1}>Move down</button>
                  {' '}
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => removeSpeaker(i)}>Remove</button>
                </div>
              </div>
              <UrlImageUpload label="Photo" value={s.photoUrl} onChange={(url) => setSpeaker(i, { photoUrl: url })} />
              <div className="row">
                <Field label="Name" htmlFor={`sp-name-${i}`}>
                  <input id={`sp-name-${i}`} type="text" value={s.name || ''} onChange={(e) => setSpeaker(i, { name: e.target.value })} />
                </Field>
                <Field label="Role" htmlFor={`sp-role-${i}`} hint="e.g. Moderator/Speaker, Speaker">
                  <input id={`sp-role-${i}`} type="text" value={s.role || ''} onChange={(e) => setSpeaker(i, { role: e.target.value })} />
                </Field>
              </div>
              <Field label="Title lines" htmlFor={`sp-titles-${i}`} hint="One per line.">
                <textarea
                  id={`sp-titles-${i}`} rows={3}
                  value={(s.titleLines || []).join('\n')}
                  onChange={(e) => setSpeaker(i, { titleLines: e.target.value.split('\n') })}
                />
              </Field>
              <Field label="Short bio" htmlFor={`sp-short-${i}`} hint="Shown on the website speaker cards. Up to 600 characters.">
                <textarea id={`sp-short-${i}`} rows={2} maxLength={600} value={s.shortBio || ''} onChange={(e) => setSpeaker(i, { shortBio: e.target.value })} />
              </Field>
              <Field label="Full bio" htmlFor={`sp-bio-${i}`} hint="Shown in the confirmation email. Up to 4000 characters.">
                <textarea id={`sp-bio-${i}`} rows={5} maxLength={4000} value={s.bio || ''} onChange={(e) => setSpeaker(i, { bio: e.target.value })} />
              </Field>
            </div>
          ))}
          <button type="button" className="btn btn--sm" onClick={addSpeaker}>Add speaker</button>
        </div>

        <div className="card">
          <div className="card__header"><h2>FAQ</h2></div>
          <p className="hint mb-2">A question with no answer is skipped everywhere it would otherwise show.</p>
          {faq.map((f, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="row" key={i} style={{ alignItems: 'flex-start' }}>
              <Field label="Question" htmlFor={`faq-q-${i}`}>
                <input id={`faq-q-${i}`} type="text" value={f.question || ''} onChange={(e) => setFaqItem(i, { question: e.target.value })} />
              </Field>
              <Field label="Answer" htmlFor={`faq-a-${i}`}>
                <textarea id={`faq-a-${i}`} rows={2} value={f.answer || ''} onChange={(e) => setFaqItem(i, { answer: e.target.value })} />
              </Field>
              <div style={{ flex: '0 0 auto', alignSelf: 'end', marginBottom: '1rem' }}>
                <button type="button" className="btn btn--sm" onClick={() => moveFaq(i, -1)} disabled={i === 0}>↑</button>
                {' '}
                <button type="button" className="btn btn--sm" onClick={() => moveFaq(i, 1)} disabled={i === faq.length - 1}>↓</button>
                {' '}
                <button type="button" className="btn btn--sm btn--danger" onClick={() => removeFaq(i)}>Remove</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn--sm" onClick={addFaq}>Add question</button>
        </div>

        <div className="card">
          <div className="card__header"><h2>Confirmation email content</h2></div>
          <Field label="Subject" htmlFor="email-subject">
            <input id="email-subject" type="text" value={values.email?.subject || ''} onChange={(e) => setEmail('subject', e.target.value)} />
          </Field>
          <Field label="Intro paragraph" htmlFor="email-intro">
            <textarea id="email-intro" rows={2} value={values.email?.introParagraph || ''} onChange={(e) => setEmail('introParagraph', e.target.value)} />
          </Field>
          <Field label="Note box text" htmlFor="email-note" hint="A short reminder shown in a tinted box near the bottom of the email.">
            <textarea id="email-note" rows={2} value={values.email?.noteBoxText || ''} onChange={(e) => setEmail('noteBoxText', e.target.value)} />
          </Field>
          <Field label="Footer text" htmlFor="email-footer">
            <textarea id="email-footer" rows={2} value={values.email?.footerText || ''} onChange={(e) => setEmail('footerText', e.target.value)} />
          </Field>
        </div>

        <div className="card">
          <div className="card__header"><h2>Links</h2></div>
          <div className="row">
            <Field label="Instagram" htmlFor="soc-ig">
              <input id="soc-ig" type="url" value={values.social?.instagram || ''} onChange={(e) => setSocial('instagram', e.target.value)} />
            </Field>
            <Field label="X" htmlFor="soc-x">
              <input id="soc-x" type="url" value={values.social?.x || ''} onChange={(e) => setSocial('x', e.target.value)} />
            </Field>
            <Field label="LinkedIn" htmlFor="soc-li">
              <input id="soc-li" type="url" value={values.social?.linkedin || ''} onChange={(e) => setSocial('linkedin', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      <Modal open={testEmailOpen} title="Send a test email" onClose={() => setTestEmailOpen(false)}>
        <Field label="Send to" htmlFor="test-to" hint="Uses the current saved settings and sample registrant details.">
          <input id="test-to" type="email" value={testEmailAddr} onChange={(e) => setTestEmailAddr(e.target.value)} required />
        </Field>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={() => setTestEmailOpen(false)}>Cancel</button>
          <button
            type="button" className="btn btn--primary"
            disabled={!testEmailAddr || testEmail.isPending}
            onClick={() => testEmail.mutate()}
          >
            {testEmail.isPending && <Spinner />} Send
          </button>
        </div>
      </Modal>
    </form>
  );
}
