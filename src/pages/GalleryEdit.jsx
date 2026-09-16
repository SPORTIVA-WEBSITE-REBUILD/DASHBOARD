import useResourceForm from '../hooks/useResourceForm.js';
import { PageHeader } from '../layout/Shell.jsx';
import { Field, Spinner, ErrorState } from '../components/ui.jsx';
import MediaPicker from '../components/MediaPicker.jsx';

const EMPTY = {
  title: '', description: '', image: null, location: '', takenAt: '',
  order: 0, status: 'draft',
};

const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || undefined;
const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

function toPayload(v) {
  return {
    title: v.title,
    description: v.description,
    image: idOf(v.image),
    location: v.location,
    takenAt: v.takenAt ? new Date(v.takenAt).toISOString() : null,
    order: Number(v.order) || 0,
  };
}

export default function GalleryEdit() {
  const { values, set, errors, isNew, isLoading, isError, error, submit, cancel, saving, dirty } =
    useResourceForm({ resource: 'gallery', singular: 'Image', empty: EMPTY, toPayload });

  if (isLoading) return <><PageHeader title="Loading…" /><div className="content"><Spinner /></div></>;
  if (isError) return <><PageHeader title="Gallery image" /><div className="content"><ErrorState error={error} /></div></>;

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isNew ? 'Add image' : values.title || 'Edit image'}
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
          <MediaPicker label="Image" value={values.image} onChange={(m) => set('image', m)} />
          {errors.image && <span className="error" role="alert">An image is required</span>}
          <p className="hint">
            Upload through the picker above. Landscape images sit best in the grid.
            Add alt text under Media so the photograph is described to screen readers.
          </p>

          <Field label="Title" htmlFor="title" error={errors.title} required hint="Shown under the image and when it is opened.">
            <input id="title" type="text" value={values.title} onChange={(e) => set('title', e.target.value)} required />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            error={errors.description}
            hint="Optional. A sentence of context, shown when the image is opened."
          >
            <textarea id="description" rows={3} maxLength={600} value={values.description} onChange={(e) => set('description', e.target.value)} />
          </Field>

          <div className="row">
            <Field label="Location" htmlFor="location" hint="Optional, e.g. Lagos, Nigeria">
              <input id="location" type="text" value={values.location} onChange={(e) => set('location', e.target.value)} />
            </Field>

            <Field label="Date taken" htmlFor="takenAt" hint="Optional.">
              <input id="takenAt" type="date" value={toDateInput(values.takenAt)} onChange={(e) => set('takenAt', e.target.value)} />
            </Field>

            <Field label="Display order" htmlFor="order" hint="Lower numbers appear first.">
              <input id="order" type="number" min="0" value={values.order} onChange={(e) => set('order', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>
    </form>
  );
}
