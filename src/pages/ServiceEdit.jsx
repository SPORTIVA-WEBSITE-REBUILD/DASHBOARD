import useResourceForm from '../hooks/useResourceForm.js';
import { PageHeader } from '../layout/Shell.jsx';
import { Field, Spinner, ErrorState } from '../components/ui.jsx';
import Editor from '../components/Editor.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import SeoFields from '../components/SeoFields.jsx';
import { ICONS } from '../lib/icons.js';

const EMPTY = {
  title: '', slug: '', icon: '', summary: '', body: '',
  image: null, order: 0, seo: {}, status: 'draft',
};

const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || undefined;

function toPayload(v) {
  return {
    title: v.title,
    ...(v.slug ? { slug: v.slug } : {}),
    icon: v.icon,
    summary: v.summary,
    body: v.body,
    image: idOf(v.image),
    order: Number(v.order) || 0,
    seo: { ...v.seo, ogImage: idOf(v.seo?.ogImage) },
  };
}

export default function ServiceEdit() {
  const { values, set, errors, isNew, isLoading, isError, error, submit, cancel, saving, dirty } =
    useResourceForm({ resource: 'services', singular: 'Service', empty: EMPTY, toPayload });

  if (isLoading) return <><PageHeader title="Loading…" /><div className="content"><Spinner /></div></>;
  if (isError) return <><PageHeader title="Service" /><div className="content"><ErrorState error={error} /></div></>;

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isNew ? 'New service' : values.title || 'Edit service'}
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
          <Field label="Service name" htmlFor="title" error={errors.title} required>
            <input id="title" type="text" value={values.title} onChange={(e) => set('title', e.target.value)} required />
          </Field>

          <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={isNew ? 'Generated from the name if left blank.' : 'The old address will redirect automatically.'}>
            <input id="slug" type="text" value={values.slug} onChange={(e) => set('slug', e.target.value)} />
          </Field>

          <div className="row">
            <Field label="Icon" htmlFor="icon" hint="Shown on the service cards.">
              <select id="icon" value={values.icon} onChange={(e) => set('icon', e.target.value)}>
                <option value="">Default</option>
                {ICONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>

            <Field label="Display order" htmlFor="order" hint="Lower numbers appear first.">
              <input id="order" type="number" min="0" value={values.order} onChange={(e) => set('order', e.target.value)} />
            </Field>
          </div>

          <Field label="Summary" htmlFor="summary" error={errors.summary} hint="One or two sentences for the service cards.">
            <textarea id="summary" rows={3} maxLength={400} value={values.summary} onChange={(e) => set('summary', e.target.value)} />
          </Field>

          <MediaPicker label="Image" value={values.image} onChange={(m) => set('image', m)} />
        </div>

        <div className="card">
          <div className="card__header"><h2>Full description</h2></div>
          <Editor value={values.body} onChange={(html) => set('body', html)} placeholder="Describe this service…" />
        </div>

        <SeoFields value={values.seo || {}} onChange={(seo) => set('seo', seo)} errors={errors} />
      </div>
    </form>
  );
}
