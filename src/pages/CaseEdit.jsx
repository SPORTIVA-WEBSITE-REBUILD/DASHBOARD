import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import useResourceForm from '../hooks/useResourceForm.js';
import { PageHeader } from '../layout/Shell.jsx';
import { Field, Spinner, ErrorState } from '../components/ui.jsx';
import Editor from '../components/Editor.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import SeoFields from '../components/SeoFields.jsx';
import AuthorPicker from '../components/AuthorPicker.jsx';

const EMPTY = {
  title: '', slug: '', forum: '', year: new Date().getFullYear(),
  partyRepresented: 'athlete', outcome: 'won', summary: '', body: '',
  anonymised: true, practiceArea: null, authors: [], featuredImage: null, seo: {}, status: 'draft',
};

const PARTIES = [
  ['athlete', 'Athlete'], ['club', 'Club'], ['federation', 'Federation'],
  ['agent', 'Agent'], ['sponsor', 'Sponsor'], ['other', 'Other'],
];
const OUTCOMES = [
  ['won', 'Won'], ['settled', 'Settled'], ['dismissed', 'Dismissed'],
  ['ongoing', 'Ongoing'], ['withdrawn', 'Withdrawn'],
];

/** References arrive populated but must be sent back as ids. */
const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || undefined;

function toPayload(v) {
  return {
    title: v.title,
    ...(v.slug ? { slug: v.slug } : {}),
    forum: v.forum,
    year: Number(v.year),
    partyRepresented: v.partyRepresented,
    outcome: v.outcome,
    summary: v.summary,
    body: v.body,
    anonymised: v.anonymised,
    practiceArea: idOf(v.practiceArea),
    authors: (v.authors || []).map(idOf).filter(Boolean),
    featuredImage: idOf(v.featuredImage),
    // Noon UTC so the chosen calendar day survives any timezone.
    ...(v.publishedAt ? { publishedAt: new Date(`${String(v.publishedAt).slice(0, 10)}T12:00:00Z`).toISOString() } : {}),
    seo: { ...v.seo, ogImage: idOf(v.seo?.ogImage) },
  };
}

export default function CaseEdit() {
  const form = useResourceForm({
    resource: 'cases', singular: 'Case', empty: EMPTY, toPayload,
  });
  const { values, set, errors, isNew, isLoading, isError, error, submit, cancel, saving, dirty } = form;

  const { data: services } = useQuery({
    queryKey: ['services', 'all'],
    queryFn: () => api.get('/services?limit=100').then((r) => r.data),
  });

  if (isLoading) return <><PageHeader title="Loading…" /><div className="content"><Spinner /></div></>;
  if (isError) return <><PageHeader title="Case" /><div className="content"><ErrorState error={error} /></div></>;

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isNew ? 'New case' : values.title || 'Edit case'}
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
          <Field label="Matter title" htmlFor="title" error={errors.title} required>
            <input id="title" type="text" value={values.title} onChange={(e) => set('title', e.target.value)} required />
          </Field>

          <Field
            label="URL slug"
            htmlFor="slug"
            error={errors.slug}
            hint={isNew
              ? 'Left blank, this is generated from the title.'
              : 'Changing this alters the public URL. The old address will redirect automatically.'}
          >
            <input id="slug" type="text" value={values.slug} onChange={(e) => set('slug', e.target.value)} />
          </Field>

          <div className="row">
            <Field label="Forum" htmlFor="forum" error={errors.forum} required hint="e.g. CAS, FIFA DRC, NFF, High Court">
              <input id="forum" type="text" value={values.forum} onChange={(e) => set('forum', e.target.value)} required />
            </Field>

            <Field label="Year" htmlFor="year" error={errors.year} required>
              <input
                id="year" type="number" min="1900" max="2200"
                value={values.year} onChange={(e) => set('year', e.target.value)} required
              />
            </Field>
          </div>

          <AuthorPicker label="Team" value={values.authors} onChange={(ids) => set('authors', ids)} />

          <Field
            label="Publication date"
            htmlFor="publishedAt"
            hint="Pick an earlier date to backdate the entry; leave empty to use the day it is first published. Entries are listed newest year first, then by this date."
          >
            <input
              id="publishedAt"
              type="date"
              value={values.publishedAt ? String(values.publishedAt).slice(0, 10) : ''}
              onChange={(e) => set('publishedAt', e.target.value)}
            />
          </Field>

          <div className="row">
            <Field label="Party represented" htmlFor="party" error={errors.partyRepresented} required>
              <select id="party" value={values.partyRepresented} onChange={(e) => set('partyRepresented', e.target.value)}>
                {PARTIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>

            <Field label="Outcome" htmlFor="outcome" error={errors.outcome} required>
              <select id="outcome" value={values.outcome} onChange={(e) => set('outcome', e.target.value)}>
                {OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>

            <Field label="Practice area" htmlFor="practice">
              <select
                id="practice"
                value={idOf(values.practiceArea) || ''}
                onChange={(e) => set('practiceArea', e.target.value || null)}
              >
                <option value="">None</option>
                {(services || []).map((s) => <option key={s._id} value={s._id}>{s.title}</option>)}
              </select>
            </Field>
          </div>

          <Field
            label="Summary"
            htmlFor="summary"
            error={errors.summary}
            required
            hint="Shown on the archive cards and used as the search description. Up to 600 characters."
          >
            <textarea
              id="summary" rows={3} maxLength={600}
              value={values.summary} onChange={(e) => set('summary', e.target.value)} required
            />
          </Field>

          <MediaPicker label="Featured image" value={values.featuredImage} onChange={(m) => set('featuredImage', m)} />

          <div className="field">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={values.anonymised}
                onChange={(e) => set('anonymised', e.target.checked)}
              />
              Parties are anonymised
            </label>
            {!values.anonymised && (
              <div className="alert alert--warning mt-1">
                This matter will be published with the parties named. Confirm the firm
                has cleared this in writing before publishing.
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__header"><h2>Full account</h2></div>
          <Editor value={values.body} onChange={(html) => set('body', html)} placeholder="Describe the matter…" />
        </div>

        <SeoFields value={values.seo || {}} onChange={(seo) => set('seo', seo)} errors={errors} />
      </div>
    </form>
  );
}
