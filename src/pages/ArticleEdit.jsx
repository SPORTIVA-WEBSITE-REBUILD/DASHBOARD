import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import useResourceForm from '../hooks/useResourceForm.js';
import { PageHeader } from '../layout/Shell.jsx';
import { Field, Spinner, ErrorState } from '../components/ui.jsx';
import Editor from '../components/Editor.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import SeoFields from '../components/SeoFields.jsx';

const EMPTY = {
  title: '', slug: '', excerpt: '', body: '', author: null, category: null,
  tags: [], featuredImage: null, seo: {}, status: 'draft',
};

const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || undefined;

function toPayload(v) {
  return {
    title: v.title,
    ...(v.slug ? { slug: v.slug } : {}),
    excerpt: v.excerpt,
    body: v.body,
    author: idOf(v.author),
    category: idOf(v.category),
    tags: v.tags,
    featuredImage: idOf(v.featuredImage),
    // Noon UTC so the chosen calendar day survives any timezone.
    ...(v.publishedAt ? { publishedAt: new Date(`${String(v.publishedAt).slice(0, 10)}T12:00:00Z`).toISOString() } : {}),
    seo: { ...v.seo, ogImage: idOf(v.seo?.ogImage) },
  };
}

export default function ArticleEdit() {
  const form = useResourceForm({
    resource: 'articles', singular: 'Article', empty: EMPTY, toPayload,
  });
  const { values, set, errors, isNew, isLoading, isError, error, submit, cancel, saving, dirty } = form;

  const { data: lawyers } = useQuery({
    queryKey: ['lawyers', 'all'],
    queryFn: () => api.get('/lawyers?limit=100').then((r) => r.data),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => api.get('/categories?limit=100').then((r) => r.data),
  });

  if (isLoading) return <><PageHeader title="Loading…" /><div className="content"><Spinner /></div></>;
  if (isError) return <><PageHeader title="Article" /><div className="content"><ErrorState error={error} /></div></>;

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isNew ? 'New article' : values.title || 'Edit article'}
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
          <Field label="Title" htmlFor="title" error={errors.title} required>
            <input id="title" type="text" value={values.title} onChange={(e) => set('title', e.target.value)} required />
          </Field>

          <Field
            label="URL slug"
            htmlFor="slug"
            error={errors.slug}
            hint={isNew
              ? 'Generated from the title if left blank.'
              : 'Changing this alters the public URL. The old address will redirect automatically.'}
          >
            <input id="slug" type="text" value={values.slug} onChange={(e) => set('slug', e.target.value)} />
          </Field>

          <Field
            label="Excerpt"
            htmlFor="excerpt"
            error={errors.excerpt}
            hint="Shown under the headline on Insights cards. Write a fresh sentence, not the headline again (a repeat is hidden on the card). Left blank, the opening of the article is used."
          >
            <textarea id="excerpt" rows={3} maxLength={400} value={values.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
          </Field>

          <div className="row">
            <Field label="Author" htmlFor="author">
              <select id="author" value={idOf(values.author) || ''} onChange={(e) => set('author', e.target.value || null)}>
                <option value="">No author</option>
                {(lawyers || []).map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </Field>

            <Field label="Category" htmlFor="category">
              <select id="category" value={idOf(values.category) || ''} onChange={(e) => set('category', e.target.value || null)}>
                <option value="">Uncategorised</option>
                {(categories || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </Field>

            <Field label="Tags" htmlFor="tags" hint="Separate with commas.">
              <input
                id="tags"
                type="text"
                value={(values.tags || []).join(', ')}
                onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
              />
            </Field>
          </div>

          <Field
            label="Publication date"
            htmlFor="publishedAt"
            hint="Shown on the article. Pick an earlier date to backdate it; leave empty to use the day it is first published."
          >
            <input
              id="publishedAt"
              type="date"
              value={values.publishedAt ? String(values.publishedAt).slice(0, 10) : ''}
              onChange={(e) => set('publishedAt', e.target.value)}
            />
          </Field>

          <MediaPicker label="Featured image" value={values.featuredImage} onChange={(m) => set('featuredImage', m)} />
        </div>

        <div className="card">
          <div className="card__header"><h2>Article</h2></div>
          <Editor value={values.body} onChange={(html) => set('body', html)} placeholder="Write the article…" />
          <p className="hint mt-1">Reading time is calculated automatically when you save.</p>
        </div>

        <SeoFields value={values.seo || {}} onChange={(seo) => set('seo', seo)} errors={errors} />
      </div>
    </form>
  );
}
