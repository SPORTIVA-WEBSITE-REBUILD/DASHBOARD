import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { PageHeader } from '../layout/Shell.jsx';
import { ErrorState, Field, Spinner, useToast } from '../components/ui.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import SocialIcon, { SUPPORTED_PLATFORMS, platformLabel } from '../components/SocialIcon.jsx';
import SeoFields from '../components/SeoFields.jsx';

const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || undefined;

export default function Settings() {
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });

  useEffect(() => { if (data) { setValues(data); setDirty(false); } }, [data]);

  const set = (key, value) => { setValues((v) => ({ ...v, [key]: value })); setDirty(true); };
  const setContact = (key, value) => set('contact', { ...values.contact, [key]: value });

  const save = useMutation({
    mutationFn: () => api.patch('/settings', {
      siteName: values.siteName,
      tagline: values.tagline,
      logo: idOf(values.logo),
      favicon: idOf(values.favicon),
      contact: {
        address: values.contact?.address || '',
        phone: values.contact?.phone || '',
        email: values.contact?.email || '',
        mapUrl: values.contact?.mapUrl || '',
        businessHours: (values.contact?.businessHours || []).filter((h) => h.label),
      },
      // A row the administrator added but never filled in is discarded rather
      // than saved, so the footer never has to decide whether to draw it.
      socials: (values.socials || [])
        .map((s) => ({ platform: s.platform, url: (s.url || '').trim() }))
        .filter((s) => s.platform && s.url),
      copyrightText: values.copyrightText,
      seoDefaults: { ...values.seoDefaults, ogImage: idOf(values.seoDefaults?.ogImage) },
      enquiryRecipient: values.enquiryRecipient || '',
      careersEmail: values.careersEmail || '',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
      setErrors({});
      setDirty(false);
    },
    onError: (err) => {
      if (err.details) { setErrors(err.fieldErrors); toast.error('Please correct the highlighted fields'); }
      else toast.error(err.message);
    },
  });

  if (isLoading || !values) return <><PageHeader title="Site Settings" /><div className="content"><Spinner /></div></>;
  if (isError) return <><PageHeader title="Site Settings" /><div className="content"><ErrorState error={error} onRetry={refetch} /></div></>;

  const hours = values.contact?.businessHours || [];
  const socials = values.socials || [];

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <PageHeader
        title="Site Settings"
        actions={(
          <button type="submit" className="btn btn--primary" disabled={save.isPending || !dirty}>
            {save.isPending && <Spinner />} Save changes
          </button>
        )}
      />

      <div className="content">
        <div className="card">
          <div className="card__header"><h2>Identity</h2></div>

          <div className="row">
            <Field label="Website name" htmlFor="siteName" error={errors.siteName} required>
              <input id="siteName" type="text" value={values.siteName || ''} onChange={(e) => set('siteName', e.target.value)} required />
            </Field>

            <Field label="Tagline" htmlFor="tagline" hint="Shown beside the name in the header and footer.">
              <input id="tagline" type="text" value={values.tagline || ''} onChange={(e) => set('tagline', e.target.value)} />
            </Field>
          </div>

          <MediaPicker label="Logo" value={values.logo} onChange={(m) => set('logo', m)} />

          <Field label="Copyright text" htmlFor="copyright" error={errors.copyrightText}>
            <input id="copyright" type="text" value={values.copyrightText || ''} onChange={(e) => set('copyrightText', e.target.value)} />
          </Field>
        </div>

        <div className="card">
          <div className="card__header"><h2>Contact details</h2></div>

          <Field label="Address" htmlFor="address" error={errors['contact.address']}>
            <textarea id="address" rows={2} value={values.contact?.address || ''} onChange={(e) => setContact('address', e.target.value)} />
          </Field>

          <div className="row">
            <Field label="Phone" htmlFor="phone">
              <input id="phone" type="tel" value={values.contact?.phone || ''} onChange={(e) => setContact('phone', e.target.value)} />
            </Field>

            <Field label="Public email" htmlFor="cemail" error={errors['contact.email']}>
              <input id="cemail" type="email" value={values.contact?.email || ''} onChange={(e) => setContact('email', e.target.value)} />
            </Field>
          </div>

          <Field
            label="Map embed URL"
            htmlFor="mapUrl"
            hint="The src of a Google Maps embed. Leave blank to hide the map."
          >
            <input id="mapUrl" type="url" value={values.contact?.mapUrl || ''} onChange={(e) => setContact('mapUrl', e.target.value)} />
          </Field>

          <Field
            label="Enquiry notifications"
            htmlFor="recipient"
            error={errors.enquiryRecipient}
            hint="The address enquiries should be directed to."
          >
            <input id="recipient" type="email" value={values.enquiryRecipient || ''} onChange={(e) => set('enquiryRecipient', e.target.value)} />
          </Field>

          <Field
            label="Careers inbox"
            htmlFor="careersEmail"
            error={errors.careersEmail}
            hint="Where job applications are sent, unless a vacancy sets its own address."
          >
            <input id="careersEmail" type="email" value={values.careersEmail || ''} onChange={(e) => set('careersEmail', e.target.value)} />
          </Field>

          <h3 className="mt-2">Office hours</h3>
          {hours.map((h, i) => (
            // Fixed-length ordered list edited in place; index is stable here.
            // eslint-disable-next-line react/no-array-index-key
            <div className="row" key={i}>
              <Field label="Label" htmlFor={`hl-${i}`}>
                <input
                  id={`hl-${i}`} type="text" value={h.label || ''} placeholder="Monday – Friday"
                  onChange={(e) => {
                    const next = [...hours]; next[i] = { ...h, label: e.target.value }; setContact('businessHours', next);
                  }}
                />
              </Field>
              <Field label="Hours" htmlFor={`hv-${i}`}>
                <input
                  id={`hv-${i}`} type="text" value={h.value || ''} placeholder="9am – 5pm"
                  onChange={(e) => {
                    const next = [...hours]; next[i] = { ...h, value: e.target.value }; setContact('businessHours', next);
                  }}
                />
              </Field>
              <div style={{ flex: '0 0 auto', alignSelf: 'end', marginBottom: '1rem' }}>
                <button
                  type="button" className="btn btn--sm btn--danger"
                  onClick={() => setContact('businessHours', hours.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn--sm" onClick={() => setContact('businessHours', [...hours, { label: '', value: '' }])}>
            Add hours
          </button>
        </div>

        <div className="card">
          <div className="card__header"><h2>Social links</h2></div>

          <p className="muted mb-2">
            These appear as icons in the website footer. A row left without a link
            is simply not shown — remove it, or fill it in.
          </p>

          {socials.map((s, i) => {
            const filled = Boolean(s.platform && (s.url || '').trim());
            return (
              // eslint-disable-next-line react/no-array-index-key
              <div className="row" key={i} style={{ alignItems: 'flex-end' }}>
                <div style={{ flex: '0 0 auto', marginBottom: '1rem', width: 28, color: filled ? 'var(--text)' : 'var(--border)' }}>
                  <SocialIcon platform={s.platform} size={22} />
                </div>

                <Field label="Platform" htmlFor={`sp-${i}`}>
                  <select
                    id={`sp-${i}`} value={s.platform || ''}
                    onChange={(e) => { const next = [...socials]; next[i] = { ...s, platform: e.target.value }; set('socials', next); }}
                  >
                    <option value="">Choose…</option>
                    {SUPPORTED_PLATFORMS.map((p) => (
                      <option key={p} value={p}>{platformLabel(p)}</option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Link"
                  htmlFor={`su-${i}`}
                  error={errors[`socials.${i}.url`]}
                  hint={!filled && s.platform ? 'Add the full address, or this row will not be shown.' : undefined}
                >
                  <input
                    id={`su-${i}`} type="url" placeholder="https://"
                    value={s.url || ''}
                    onChange={(e) => { const next = [...socials]; next[i] = { ...s, url: e.target.value }; set('socials', next); }}
                  />
                </Field>

                <div style={{ flex: '0 0 auto', alignSelf: 'end', marginBottom: '1rem' }}>
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => set('socials', socials.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          <button type="button" className="btn btn--sm" onClick={() => set('socials', [...socials, { platform: '', url: '' }])}>
            Add social link
          </button>
        </div>

        <SeoFields
          value={values.seoDefaults || {}}
          onChange={(seo) => set('seoDefaults', seo)}
          errors={errors}
        />
      </div>
    </form>
  );
}
