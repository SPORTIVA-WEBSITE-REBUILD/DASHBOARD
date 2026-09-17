import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useResourceForm from '../hooks/useResourceForm.js';
import { PageHeader } from '../layout/Shell.jsx';
import { Field, Spinner, ErrorState } from '../components/ui.jsx';
import Editor from '../components/Editor.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import SeoFields from '../components/SeoFields.jsx';
import { api } from '../lib/api.js';
import { ICONS } from '../lib/icons.js';

const EMPTY = { slug: '', title: '', sections: [], seo: {}, status: 'draft' };

const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || undefined;

/** A field spec is either a plain label or an object with a label and options. */
const spec = (s) => (typeof s === 'string' ? { label: s } : s);

/**
 * The editor for a page with no blueprint (one an administrator created). It
 * offers every field, because nothing says which ones the page uses.
 */
const GENERIC_FIELDS = {
  subheading: 'Subheading',
  heading: 'Heading',
  body: { label: 'Text', type: 'textarea' },
  value: 'Value',
  image: 'Image',
  video: 'Video link',
  cta: 'Button',
  items: {
    label: 'Items',
    singular: 'Item',
    max: 40,
    fields: {
      title: 'Title', text: { label: 'Text', type: 'textarea' }, value: 'Value', icon: 'Icon', href: 'Link', image: 'Image',
    },
  },
};

function toPayload(v) {
  return {
    title: v.title,
    ...(v.slug ? { slug: v.slug } : {}),
    status: v.status,
    sections: (v.sections || []).map((s) => ({
      key: s.key,
      heading: s.heading || '',
      subheading: s.subheading || '',
      body: s.body || '',
      image: idOf(s.image),
      video: s.video || '',
      value: s.value || '',
      cta: { label: s.cta?.label || '', href: s.cta?.href || '' },
      // Only words someone typed are stored; an empty label falls back to the
      // template default on the website, and keeps doing so if it changes.
      labels: Object.fromEntries(
        Object.entries(s.labels || {}).filter(([, text]) => text && text.trim()),
      ),
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

function TextInput({ id, field, value, onChange, error }) {
  const f = spec(field);
  let input;
  if (f.type === 'rich') {
    input = <Editor value={value || ''} onChange={onChange} />;
  } else if (f.type === 'textarea') {
    input = <textarea id={id} rows={3} value={value || ''} placeholder={f.default} onChange={(e) => onChange(e.target.value)} />;
  } else {
    input = <input id={id} type="text" value={value || ''} placeholder={f.default} onChange={(e) => onChange(e.target.value)} />;
  }
  return <Field label={f.label} htmlFor={f.type === 'rich' ? undefined : id} hint={hintWithDefault(f)} error={error}>{input}</Field>;
}

/** A field with a template default says so, so leaving it empty is a choice. */
function hintWithDefault(f) {
  if (f.default === undefined || f.default === '') return f.hint;
  return [f.hint, 'Left empty, the website shows the text in grey.'].filter(Boolean).join(' ');
}

/**
 * Named interface text for a section — placeholders, button names, widget
 * titles. Each input shows the template's wording in grey, which is exactly
 * what the website shows until someone types over it.
 */
function LabelsEditor({ id, field, labels, onChange }) {
  const keys = Object.entries(field.keys || {});
  const current = labels || {};
  return (
    <fieldset className="field">
      <legend>{field.label || 'Text'}</legend>
      <div className="row">
        {keys.map(([name, spec]) => (
          <Field key={name} label={spec.label} htmlFor={`${id}-${name}`} hint={spec.hint}>
            <input
              id={`${id}-${name}`}
              type="text"
              maxLength={300}
              value={current[name] || ''}
              placeholder={spec.default}
              onChange={(e) => onChange({ ...current, [name]: e.target.value })}
            />
          </Field>
        ))}
      </div>
    </fieldset>
  );
}

function ItemsEditor({ id, field, items, onChange }) {
  const f = spec(field);
  const fields = f.fields || {};
  const list = items || [];
  const max = f.max || 40;
  const singular = f.singular || 'Item';

  const update = (i, patch) => onChange(list.map((item, n) => (n === i ? { ...item, ...patch } : item)));
  const remove = (i) => onChange(list.filter((_, n) => n !== i));
  const move = (i, by) => {
    const next = [...list];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    onChange(next);
  };

  return (
    <div className="field">
      <label>{f.label}</label>
      {f.hint && <p className="hint">{f.hint}</p>}

      {list.map((item, i) => (
        // Items have no identity of their own; every input is controlled, so
        // position is enough to keep what the administrator typed in place.
        // eslint-disable-next-line react/no-array-index-key
        <div className="card card--nested" key={i}>
          <div className="card__header">
            <h3>{singular} {i + 1}</h3>
            <span className="spacer" />
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${singular.toLowerCase()} ${i + 1} up`}>↑</button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={`Move ${singular.toLowerCase()} ${i + 1} down`}>↓</button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => remove(i)}>Remove</button>
          </div>

          <div className="row">
            {['title', 'value', 'href'].filter((k) => fields[k]).map((k) => (
              <TextInput key={k} id={`${id}-${i}-${k}`} field={fields[k]} value={item[k]} onChange={(v) => update(i, { [k]: v })} />
            ))}
            {fields.icon && (
              <Field label={spec(fields.icon).label} htmlFor={`${id}-${i}-icon`}>
                <select id={`${id}-${i}-icon`} value={item.icon || ''} onChange={(e) => update(i, { icon: e.target.value })}>
                  <option value="">No icon</option>
                  {ICONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            )}
          </div>
          {fields.text && (
            <TextInput id={`${id}-${i}-text`} field={fields.text} value={item.text} onChange={(v) => update(i, { text: v })} />
          )}
          {fields.image && (
            <MediaPicker label={spec(fields.image).label} value={item.image} onChange={(m) => update(i, { image: m })} />
          )}
        </div>
      ))}

      <button type="button" className="btn btn--sm" onClick={() => onChange([...list, {}])} disabled={list.length >= max}>
        Add {singular.toLowerCase()}
      </button>
      {list.length >= max && <span className="hint"> This section holds up to {max}.</span>}
    </div>
  );
}

function SectionEditor({ blueprint, section, onChange, onRemove }) {
  const fields = blueprint?.fields || GENERIC_FIELDS;
  const set = (key, value) => onChange({ ...section, [key]: value });
  const id = `s-${section.key}`;
  const cta = fields.cta && spec(fields.cta);

  return (
    <div className="card">
      <div className="card__header">
        <h2>{blueprint?.label || section.key}</h2>
        <span className="muted spacer">{section.key}</span>
        {onRemove && <button type="button" className="btn btn--sm btn--ghost" onClick={onRemove}>Remove section</button>}
      </div>
      {blueprint?.hint && <p className="hint mb-2">{blueprint.hint}</p>}

      {(fields.subheading || fields.heading) && (
        <div className="row">
          {fields.subheading && <TextInput id={`${id}-sh`} field={fields.subheading} value={section.subheading} onChange={(v) => set('subheading', v)} />}
          {fields.heading && <TextInput id={`${id}-h`} field={fields.heading} value={section.heading} onChange={(v) => set('heading', v)} />}
        </div>
      )}

      {fields.value && <TextInput id={`${id}-v`} field={fields.value} value={section.value} onChange={(v) => set('value', v)} />}
      {fields.body && <TextInput id={`${id}-b`} field={fields.body} value={section.body} onChange={(v) => set('body', v)} />}
      {fields.image && <MediaPicker label={spec(fields.image).label} value={section.image} onChange={(m) => set('image', m)} />}
      {fields.video && <TextInput id={`${id}-vid`} field={fields.video} value={section.video} onChange={(v) => set('video', v)} />}

      {cta && (
        <div className="row">
          <Field label={`${cta.label} label`} htmlFor={`${id}-cl`} hint={cta.labelOnly ? cta.hint : undefined}>
            <input
              id={`${id}-cl`} type="text" value={section.cta?.label || ''} placeholder={cta.default?.label}
              onChange={(e) => set('cta', { ...section.cta, label: e.target.value })}
            />
          </Field>
          {!cta.labelOnly && (
            <Field label={`${cta.label} link`} htmlFor={`${id}-ch`} hint={cta.hint || 'e.g. /contact or https://…'}>
              <input
                id={`${id}-ch`} type="text" value={section.cta?.href || ''} placeholder={cta.default?.href}
                onChange={(e) => set('cta', { ...section.cta, href: e.target.value })}
              />
            </Field>
          )}
        </div>
      )}

      {fields.labels && (
        <LabelsEditor id={`${id}-l`} field={fields.labels} labels={section.labels} onChange={(labels) => set('labels', labels)} />
      )}

      {fields.items && (
        <ItemsEditor id={`${id}-i`} field={fields.items} items={section.items} onChange={(items) => set('items', items)} />
      )}
    </div>
  );
}

function AddSection({ existing, onAdd }) {
  const [key, setKey] = useState('');
  const clean = key.trim();
  const taken = existing.includes(clean);

  return (
    <div className="card">
      <div className="row">
        <Field label="New section key" htmlFor="new-section" hint="A short name the website looks for, e.g. intro" error={taken ? 'This page already has that section' : undefined}>
          <input id="new-section" type="text" value={key} onChange={(e) => setKey(e.target.value)} />
        </Field>
      </div>
      <button
        type="button"
        className="btn btn--sm"
        disabled={!clean || taken}
        onClick={() => { onAdd(clean); setKey(''); }}
      >
        Add section
      </button>
    </div>
  );
}

export default function PageEdit() {
  const { values, set, errors, isNew, isLoading, isError, error, submit, cancel, saving, dirty } =
    useResourceForm({ resource: 'pages', singular: 'Page', empty: EMPTY, toPayload });

  const blueprints = useQuery({
    queryKey: ['pages', 'blueprints'],
    queryFn: () => api.get('/pages/blueprints').then((r) => r.data),
    staleTime: Infinity,
  });

  if (isLoading || blueprints.isLoading) return <><PageHeader title="Loading…" /><div className="content"><Spinner /></div></>;
  if (isError) return <><PageHeader title="Page" /><div className="content"><ErrorState error={error} /></div></>;
  if (blueprints.isError) return <><PageHeader title="Page" /><div className="content"><ErrorState error={blueprints.error} /></div></>;

  const blueprint = blueprints.data.find((b) => b.slug === values.slug);
  const sections = values.sections || [];
  const planned = new Set(blueprint?.sections.map((s) => s.key));

  // A section the blueprint lists but the stored page lacks is shown empty and
  // only saved once it is edited, so opening a page never marks it changed.
  const updateSection = (next) => {
    const at = sections.findIndex((s) => s.key === next.key);
    set('sections', at === -1 ? [...sections, next] : sections.map((s, i) => (i === at ? next : s)));
  };
  const removeSection = (key) => set('sections', sections.filter((s) => s.key !== key));
  const unplanned = sections.filter((s) => !planned.has(s.key));

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
              hint={blueprint
                ? 'This is a built-in page. Changing its slug will stop it loading on the website.'
                : 'The address of the page, e.g. terms'}
            >
              <input id="slug" type="text" value={values.slug} onChange={(e) => set('slug', e.target.value)} />
            </Field>

            <Field label="Status" htmlFor="status" hint="Draft pages are hidden from the website.">
              <select id="status" value={values.status || 'draft'} onChange={(e) => set('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </Field>
          </div>
        </div>

        {blueprint
          ? blueprint.sections.map((b) => (
            <SectionEditor
              key={b.key}
              blueprint={b}
              section={sections.find((s) => s.key === b.key) || { key: b.key }}
              onChange={updateSection}
            />
          ))
          : sections.map((s) => (
            <SectionEditor key={s.key} section={s} onChange={updateSection} onRemove={() => removeSection(s.key)} />
          ))}

        {blueprint && unplanned.length > 0 && (
          <>
            <h2 className="mt-2">Unused sections</h2>
            <p className="hint mb-2">The website no longer shows these sections. Remove them once you have copied anything you need.</p>
            {unplanned.map((s) => (
              <SectionEditor key={s.key} section={s} onChange={updateSection} onRemove={() => removeSection(s.key)} />
            ))}
          </>
        )}

        {!blueprint && (
          <AddSection existing={sections.map((s) => s.key)} onAdd={(key) => updateSection({ key })} />
        )}

        <SeoFields value={values.seo || {}} onChange={(seo) => set('seo', seo)} errors={errors} />
      </div>
    </form>
  );
}
