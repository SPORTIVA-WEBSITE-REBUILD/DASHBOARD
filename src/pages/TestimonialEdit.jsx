import useResourceForm from '../hooks/useResourceForm.js';
import { PageHeader } from '../layout/Shell.jsx';
import { Field, Spinner, ErrorState } from '../components/ui.jsx';
import MediaPicker from '../components/MediaPicker.jsx';

const EMPTY = { quote: '', name: '', position: '', photo: null, order: 0, status: 'draft' };

const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || undefined;

function toPayload(v) {
  return {
    quote: v.quote,
    name: v.name,
    position: v.position,
    photo: idOf(v.photo),
    order: Number(v.order) || 0,
  };
}

export default function TestimonialEdit() {
  const { values, set, errors, isNew, isLoading, isError, error, submit, cancel, saving, dirty } =
    useResourceForm({ resource: 'testimonials', singular: 'Testimonial', empty: EMPTY, toPayload });

  if (isLoading) return <><PageHeader title="Loading…" /><div className="content"><Spinner /></div></>;
  if (isError) return <><PageHeader title="Testimonial" /><div className="content"><ErrorState error={error} /></div></>;

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isNew ? 'Add testimonial' : values.name || 'Edit testimonial'}
        actions={(
          <>
            <button type="button" className="btn" onClick={cancel}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving || !dirty}>
              {saving && <Spinner />} {isNew ? 'Add' : 'Save changes'}
            </button>
          </>
        )}
      />

      <div className="content">
        <div className="card">
          <p className="hint mb-2">
            Publish only testimonials the client has agreed to share, in their own words.
          </p>

          <Field label="Quote" htmlFor="quote" error={errors.quote} required>
            <textarea id="quote" rows={4} maxLength={800} value={values.quote} onChange={(e) => set('quote', e.target.value)} required />
          </Field>

          <div className="row">
            <Field label="Name" htmlFor="name" error={errors.name} required>
              <input id="name" type="text" value={values.name} onChange={(e) => set('name', e.target.value)} required />
            </Field>

            <Field label="Position" htmlFor="position" error={errors.position} hint="e.g. Club Secretary">
              <input id="position" type="text" value={values.position} onChange={(e) => set('position', e.target.value)} />
            </Field>

            <Field label="Display order" htmlFor="order" hint="Lower numbers appear first.">
              <input id="order" type="number" min="0" value={values.order} onChange={(e) => set('order', e.target.value)} />
            </Field>
          </div>

          <MediaPicker label="Photo" value={values.photo} onChange={(m) => set('photo', m)} />
        </div>
      </div>
    </form>
  );
}
