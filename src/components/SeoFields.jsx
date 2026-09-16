import { Field } from './ui.jsx';
import MediaPicker from './MediaPicker.jsx';

/**
 * Shared by every content type, so SEO looks and behaves the same everywhere
 * and there is one place to change if the fields evolve.
 */
export default function SeoFields({ value = {}, onChange, errors = {} }) {
  const set = (key) => (e) => {
    const v = e?.target ? e.target.value : e;
    onChange({ ...value, [key]: v });
  };

  const titleLength = (value.metaTitle || '').length;
  const descLength = (value.metaDescription || '').length;

  return (
    <div className="card">
      <div className="card__header"><h2>Search &amp; sharing</h2></div>

      <Field
        label="Meta title"
        htmlFor="seo-title"
        error={errors['seo.metaTitle']}
        hint={`${titleLength}/70 characters. Leave blank to use the page title.`}
      >
        <input
          id="seo-title"
          type="text"
          maxLength={70}
          value={value.metaTitle || ''}
          onChange={set('metaTitle')}
        />
      </Field>

      <Field
        label="Meta description"
        htmlFor="seo-desc"
        error={errors['seo.metaDescription']}
        hint={`${descLength}/200 characters. This is the text shown under the link in search results.`}
      >
        <textarea
          id="seo-desc"
          maxLength={200}
          rows={3}
          value={value.metaDescription || ''}
          onChange={set('metaDescription')}
        />
      </Field>

      <MediaPicker
        label="Social sharing image"
        value={value.ogImage}
        onChange={(media) => onChange({ ...value, ogImage: media })}
      />

      <Field
        label="Canonical URL"
        htmlFor="seo-canonical"
        error={errors['seo.canonicalUrl']}
        hint="Only set this if this content is published at another address as well."
      >
        <input id="seo-canonical" type="url" value={value.canonicalUrl || ''} onChange={set('canonicalUrl')} />
      </Field>

      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={Boolean(value.noIndex)}
            onChange={(e) => onChange({ ...value, noIndex: e.target.checked })}
          />
          Hide this from search engines
        </label>
      </div>
    </div>
  );
}
