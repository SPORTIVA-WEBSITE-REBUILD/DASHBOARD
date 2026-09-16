import useResourceForm from '../hooks/useResourceForm.js';
import { PageHeader } from '../layout/Shell.jsx';
import { Field, Spinner, ErrorState } from '../components/ui.jsx';
import Editor from '../components/Editor.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import SeoFields from '../components/SeoFields.jsx';

const EMPTY = { slug: '', title: '', sections: [], seo: {}, status: 'draft' };

const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || undefined;

/**
 * Human labels for the section keys the frontend looks for. The keys are a
 * contract between the React components and the content; administrators edit
 * the copy, they do not invent new sections, because a section with no
 * component to render it would simply not appear.
 */
const SECTION_LABELS = {
  hero: 'Hero banner',
  intro: 'Introduction',
  services: 'Services block',
  record: 'Case record block',
  insights: 'Insights block',
  stats: 'Statistics',
  team: 'Team block',
  cta: 'Call to action',
  body: 'Page content',
};

function toPayload(v) {
  return {
    title: v.title,
    ...(v.slug ? { slug: v.slug } : {}),
    sections: (v.sections || []).map((s) => ({
      key: s.key,
      heading: s.heading || '',
      subheading: s.subheading || '',
      body: s.body || '',
      image: idOf(s.image),
      cta: { label: s.cta?.label || '', href: s.cta?.href || '' },
      items: (s.items || []).map((i) => ({
        title: i.title || '',
        text: i.text || '',
        icon: i.icon || '',
        value: i.value || '',
        href: i.href || '',
        image: idOf(i.image),
      })),
    })),
    seo: { ...v.seo, ogImage: idOf(v.seo?.ogImage) },
  };
}

function SectionEditor({ section, index, onChange }) {
  const set = (key, value) => onChange(index, { ...section, [key]: value });

  const setItem = (i, patch) => {
    const items = [...(section.items || [])];
    items[i] = { ...items[i], ...patch };
    set('items', items);
  };

  return (
    <div className="card">
      <div className="card__header">
        <h2>{SECTION_LABELS[section.key] || section.key}</h2>
        <span className="muted spacer">{section.key}</span>
      </div>

      <div className="row">
        <Field label="Heading" htmlFor={`h-${index}`}>
          <input id={`h-${index}`} type="text" value={section.heading || ''} onChange={(e) => set('heading', e.target.value)} />
        </Field>

        <Field label="Subheading" htmlFor={`sh-${index}`}>
          <input id={`sh-${index}`} type="text" value={section.subheading || ''} onChange={(e) => set('subheading', e.target.value)} />
        </Field>
      </div>

      {section.key === 'body' ? (
        <Field label="Content">
          <Editor value={section.body} onChange={(html) => set('body', html)} />
        </Field>
      ) : (
        <Field label="Text" htmlFor={`b-${index}`}>
          <textarea id={`b-${index}`} rows={3} value={section.body || ''} onChange={(e) => set('body', e.target.value)} />
        </Field>
      )}

      <MediaPicker label="Image" value={section.image} onChange={(m) => set('image', m)} />

      <div className="row">
        <Field label="Button label" htmlFor={`cl-${index}`}>
          <input
            id={`cl-${index}`} type="text" value={section.cta?.label || ''}
            onChange={(e) => set('cta', { ...section.cta, label: e.target.value })}
          />
        </Field>

        <Field label="Button link" htmlFor={`ch-${index}`} hint="e.g. /contact">
          <input
            id={`ch-${index}`} type="text" value={section.cta?.href || ''}
            onChange={(e) => set('cta', { ...section.cta, href: e.target.value })}
          />
        </Field>
      </div>

      {(section.items || []).length > 0 && (
        <>
          <h3 className="mt-2">Items</h3>
          {section.items.map((item, i) => (
            // Index is a stable identity here: items are a fixed ordered list
            // that is only edited in place, never reordered or filtered.
            // eslint-disable-next-line react/no-array-index-key
            <div className="row" key={i}>
              <Field label="Title" htmlFor={`it-${index}-${i}`}>
                <input id={`it-${index}-${i}`} type="text" value={item.title || ''} onChange={(e) => setItem(i, { title: e.target.value })} />
              </Field>
              <Field label="Text" htmlFor={`ix-${index}-${i}`}>
                <input id={`ix-${index}-${i}`} type="text" value={item.text || ''} onChange={(e) => setItem(i, { text: e.target.value })} />
              </Field>
              <Field label="Value" htmlFor={`iv-${index}-${i}`} hint="Used for statistics.">
                <input id={`iv-${index}-${i}`} type="text" value={item.value || ''} onChange={(e) => setItem(i, { value: e.target.value })} />
              </Field>
            </div>
          ))}
        </>
      )}

      <button
        type="button"
        className="btn btn--sm"
        onClick={() => set('items', [...(section.items || []), { title: '', text: '' }])}
      >
        Add item
      </button>
    </div>
  );
}

export default function PageEdit() {
  const { values, set, errors, isNew, isLoading, isError, error, submit, cancel, saving, dirty } =
    useResourceForm({ resource: 'pages', singular: 'Page', empty: EMPTY, toPayload });

  if (isLoading) return <><PageHeader title="Loading…" /><div className="content"><Spinner /></div></>;
  if (isError) return <><PageHeader title="Page" /><div className="content"><ErrorState error={error} /></div></>;

  const updateSection = (index, next) => {
    const sections = [...values.sections];
    sections[index] = next;
    set('sections', sections);
  };

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isNew ? 'New page' : values.title || 'Edit page'}
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
            <Field label="Page title" htmlFor="title" error={errors.title} required>
              <input id="title" type="text" value={values.title} onChange={(e) => set('title', e.target.value)} required />
            </Field>

            <Field
              label="URL slug"
              htmlFor="slug"
              error={errors.slug}
              hint="The frontend looks pages up by slug. Changing a built-in page's slug will stop it loading."
            >
              <input id="slug" type="text" value={values.slug} onChange={(e) => set('slug', e.target.value)} />
            </Field>
          </div>
        </div>

        {(values.sections || []).map((s, i) => (
          <SectionEditor key={s.key} section={s} index={i} onChange={updateSection} />
        ))}

        <SeoFields value={values.seo || {}} onChange={(seo) => set('seo', seo)} errors={errors} />
      </div>
    </form>
  );
}
