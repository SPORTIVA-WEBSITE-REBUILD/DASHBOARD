import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import useResourceForm from '../hooks/useResourceForm.js';
import { PageHeader } from '../layout/Shell.jsx';
import { Field, Spinner, ErrorState } from '../components/ui.jsx';
import Editor from '../components/Editor.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import SeoFields from '../components/SeoFields.jsx';
import SocialIcon, { SUPPORTED_PLATFORMS, platformLabel } from '../components/SocialIcon.jsx';

const EMPTY = {
  name: '', slug: '', role: '', quote: '', bio: '', photo: null, qualifications: [],
  practiceAreas: [], email: '', phone: '', socials: [], order: 0, seo: {}, status: 'draft',
};

const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || undefined;

function toPayload(v) {
  return {
    name: v.name,
    ...(v.slug ? { slug: v.slug } : {}),
    role: v.role,
    quote: v.quote,
    bio: v.bio,
    photo: idOf(v.photo),
    qualifications: v.qualifications,
    practiceAreas: (v.practiceAreas || []).map(idOf).filter(Boolean),
    email: v.email,
    phone: v.phone,
    socials: (v.socials || [])
      .map((s) => ({ platform: s.platform, url: (s.url || '').trim() }))
      .filter((s) => s.platform && s.url),
    order: Number(v.order) || 0,
    seo: { ...v.seo, ogImage: idOf(v.seo?.ogImage) },
  };
}

export default function LawyerEdit() {
  const { values, set, errors, isNew, isLoading, isError, error, submit, cancel, saving, dirty } =
    useResourceForm({ resource: 'lawyers', singular: 'Team member', empty: EMPTY, toPayload });

  const { data: services } = useQuery({
    queryKey: ['services', 'all'],
    queryFn: () => api.get('/services?limit=100').then((r) => r.data),
  });

  if (isLoading) return <><PageHeader title="Loading…" /><div className="content"><Spinner /></div></>;
  if (isError) return <><PageHeader title="Team member" /><div className="content"><ErrorState error={error} /></div></>;

  const selectedAreas = (values.practiceAreas || []).map(idOf);

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isNew ? 'New team member' : values.name || 'Edit profile'}
        actions={(
          <>
            <button type="button" className="btn" onClick={cancel}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving || !dirty}>
              {saving && <Spinner />} {isNew ? 'Create' : 'Save changes'}
            </button>
          </>
        )}
      />

      <div className="content">
        <div className="card">
          <div className="row">
            <Field label="Full name" htmlFor="name" error={errors.name} required>
              <input id="name" type="text" value={values.name} onChange={(e) => set('name', e.target.value)} required />
            </Field>

            <Field label="Role" htmlFor="role" error={errors.role} hint="e.g. Managing Partner">
              <input id="role" type="text" value={values.role} onChange={(e) => set('role', e.target.value)} />
            </Field>
          </div>

          <div className="row">
            <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={isNew ? 'Generated from the name if left blank.' : 'The old address will redirect automatically.'}>
              <input id="slug" type="text" value={values.slug} onChange={(e) => set('slug', e.target.value)} />
            </Field>

            <Field label="Display order" htmlFor="order" hint="Lower numbers appear first.">
              <input id="order" type="number" min="0" value={values.order} onChange={(e) => set('order', e.target.value)} />
            </Field>
          </div>

          <MediaPicker label="Photo" value={values.photo} onChange={(m) => set('photo', m)} />

          <Field label="Card quote" htmlFor="quote" error={errors.quote} hint="A sentence or two shown when a visitor turns over the team member's card.">
            <textarea id="quote" rows={2} maxLength={400} value={values.quote || ''} onChange={(e) => set('quote', e.target.value)} />
          </Field>

          <div className="row">
            <Field label="Email" htmlFor="email" error={errors.email} hint="Separate several addresses with a comma.">
              <input id="email" type="email" multiple value={values.email} onChange={(e) => set('email', e.target.value)} />
            </Field>

            <Field label="Phone" htmlFor="phone">
              <input id="phone" type="tel" value={values.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
          </div>

          <Field label="Qualifications" htmlFor="quals" hint="One per line.">
            <textarea
              id="quals"
              rows={4}
              value={(values.qualifications || []).join('\n')}
              onChange={(e) => set('qualifications', e.target.value.split('\n').map((q) => q.trim()).filter(Boolean))}
            />
          </Field>

          <h3 className="mt-2">Social links</h3>
          <p className="muted mb-2">Shown as icons on the profile. A row without a link is not displayed.</p>
          {(values.socials || []).map((s, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="row" key={i} style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: '0 0 auto', marginBottom: '1rem', width: 28 }}>
                <SocialIcon platform={s.platform} size={22} />
              </div>
              <Field label="Platform" htmlFor={`lsp-${i}`}>
                <select
                  id={`lsp-${i}`} value={s.platform || ''}
                  onChange={(e) => {
                    const next = [...(values.socials || [])];
                    next[i] = { ...s, platform: e.target.value }; set('socials', next);
                  }}
                >
                  <option value="">Choose…</option>
                  {SUPPORTED_PLATFORMS.map((p) => <option key={p} value={p}>{platformLabel(p)}</option>)}
                </select>
              </Field>
              <Field label="Link" htmlFor={`lsu-${i}`}>
                <input
                  id={`lsu-${i}`} type="url" placeholder="https://" value={s.url || ''}
                  onChange={(e) => {
                    const next = [...(values.socials || [])];
                    next[i] = { ...s, url: e.target.value }; set('socials', next);
                  }}
                />
              </Field>
              <div style={{ flex: '0 0 auto', marginBottom: '1rem' }}>
                <button
                  type="button" className="btn btn--sm btn--danger"
                  onClick={() => set('socials', (values.socials || []).filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button" className="btn btn--sm mb-2"
            onClick={() => set('socials', [...(values.socials || []), { platform: '', url: '' }])}
          >
            Add social link
          </button>

          <Field label="Practice areas" htmlFor="areas" hint="Hold Cmd or Ctrl to select more than one.">
            <select
              id="areas"
              multiple
              size={Math.min(6, (services || []).length || 2)}
              value={selectedAreas}
              onChange={(e) => set('practiceAreas', Array.from(e.target.selectedOptions).map((o) => o.value))}
            >
              {(services || []).map((s) => <option key={s._id} value={s._id}>{s.title}</option>)}
            </select>
          </Field>
        </div>

        <div className="card">
          <div className="card__header"><h2>Biography</h2></div>
          <Editor value={values.bio} onChange={(html) => set('bio', html)} placeholder="Write a short biography…" />
        </div>

        <SeoFields value={values.seo || {}} onChange={(seo) => set('seo', seo)} errors={errors} />
      </div>
    </form>
  );
}
