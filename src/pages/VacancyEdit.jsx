import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import useResourceForm from '../hooks/useResourceForm.js';
import { PageHeader } from '../layout/Shell.jsx';
import { Field, Spinner, ErrorState } from '../components/ui.jsx';
import Editor from '../components/Editor.jsx';
import SeoFields from '../components/SeoFields.jsx';

const EMPTY = {
  title: '', slug: '', department: '', location: '', workplaceType: 'on_site',
  employmentType: 'full_time', summary: '', description: '',
  responsibilities: [], requirements: [], salaryRange: '', closingDate: '',
  applyEmail: '', applyUrl: '', order: 0, seo: {}, status: 'draft',
};

const EMPLOYMENT_TYPES = [
  ['full_time', 'Full time'], ['part_time', 'Part time'], ['contract', 'Contract'],
  ['internship', 'Internship'], ['pupillage', 'Pupillage'], ['nysc', 'NYSC placement'],
];

const WORKPLACE_TYPES = [
  ['on_site', 'On site'], ['hybrid', 'Hybrid'], ['remote', 'Remote'],
];

const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || undefined;

/** <input type="date"> wants yyyy-mm-dd, the API returns an ISO timestamp. */
const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

function toPayload(v) {
  return {
    title: v.title,
    ...(v.slug ? { slug: v.slug } : {}),
    department: v.department,
    location: v.location,
    workplaceType: v.workplaceType,
    employmentType: v.employmentType,
    summary: v.summary,
    description: v.description,
    responsibilities: v.responsibilities,
    requirements: v.requirements,
    salaryRange: v.salaryRange,
    // Explicit null clears a previously set date rather than leaving it stale.
    closingDate: v.closingDate ? new Date(v.closingDate).toISOString() : null,
    applyEmail: v.applyEmail,
    applyUrl: v.applyUrl,
    order: Number(v.order) || 0,
    seo: { ...v.seo, ogImage: idOf(v.seo?.ogImage) },
  };
}

/** One item per line is far easier for a non-technical editor than a repeater. */
function LineList({ label, id, value, onChange, hint }) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <textarea
        id={id}
        rows={6}
        value={(value || []).join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean))}
      />
    </Field>
  );
}

export default function VacancyEdit() {
  const form = useResourceForm({
    resource: 'vacancies', singular: 'Vacancy', empty: EMPTY, toPayload,
  });
  const { values, set, errors, isNew, isLoading, isError, error, submit, cancel, saving, dirty } = form;

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });

  if (isLoading) return <><PageHeader title="Loading…" /><div className="content"><Spinner /></div></>;
  if (isError) return <><PageHeader title="Vacancy" /><div className="content"><ErrorState error={error} /></div></>;

  const closed = values.closingDate && new Date(values.closingDate).getTime() < Date.now();
  const fallbackInbox = settings?.careersEmail || settings?.contact?.email;

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isNew ? 'New vacancy' : values.title || 'Edit vacancy'}
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
        {closed && (
          <div className="alert alert--warning">
            The closing date has passed, so this role no longer appears on the Careers
            page. Its own page still works, so any link already shared keeps going.
          </div>
        )}

        <div className="card">
          <Field label="Job title" htmlFor="title" error={errors.title} required>
            <input id="title" type="text" value={values.title} onChange={(e) => set('title', e.target.value)} required />
          </Field>

          <div className="row">
            <Field label="Team or department" htmlFor="department" hint="e.g. Disputes, Regulatory">
              <input id="department" type="text" value={values.department} onChange={(e) => set('department', e.target.value)} />
            </Field>

            <Field label="Location" htmlFor="location" error={errors.location} required hint="e.g. Lagos, Nigeria">
              <input id="location" type="text" value={values.location} onChange={(e) => set('location', e.target.value)} required />
            </Field>
          </div>

          <div className="row">
            <Field label="Employment type" htmlFor="employmentType" error={errors.employmentType} required>
              <select id="employmentType" value={values.employmentType} onChange={(e) => set('employmentType', e.target.value)}>
                {EMPLOYMENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>

            <Field label="Working arrangement" htmlFor="workplaceType">
              <select id="workplaceType" value={values.workplaceType} onChange={(e) => set('workplaceType', e.target.value)}>
                {WORKPLACE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>

            <Field label="Display order" htmlFor="order" hint="Lower numbers appear first.">
              <input id="order" type="number" min="0" value={values.order} onChange={(e) => set('order', e.target.value)} />
            </Field>
          </div>

          <Field
            label="Summary"
            htmlFor="summary"
            error={errors.summary}
            required
            hint="One or two sentences for the listing card and the search description."
          >
            <textarea id="summary" rows={3} maxLength={600} value={values.summary} onChange={(e) => set('summary', e.target.value)} required />
          </Field>

          <div className="row">
            <Field
              label="Closing date"
              htmlFor="closingDate"
              hint="After this date the role drops off the Careers page automatically. Leave blank for an open advert."
            >
              <input
                id="closingDate" type="date"
                value={toDateInput(values.closingDate)}
                onChange={(e) => set('closingDate', e.target.value)}
              />
            </Field>

            <Field label="Salary range" htmlFor="salaryRange" hint="Optional. Leave blank to omit it entirely.">
              <input id="salaryRange" type="text" value={values.salaryRange} onChange={(e) => set('salaryRange', e.target.value)} />
            </Field>
          </div>

          <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={isNew ? 'Generated from the title if left blank.' : 'The old address will redirect automatically.'}>
            <input id="slug" type="text" value={values.slug} onChange={(e) => set('slug', e.target.value)} />
          </Field>
        </div>

        <div className="card">
          <div className="card__header"><h2>The role</h2></div>
          <Editor value={values.description} onChange={(html) => set('description', html)} placeholder="Describe the role…" />
        </div>

        <div className="card">
          <div className="card__header"><h2>Responsibilities and requirements</h2></div>
          <LineList
            label="Responsibilities" id="responsibilities" hint="One per line."
            value={values.responsibilities} onChange={(v) => set('responsibilities', v)}
          />
          <LineList
            label="Requirements" id="requirements" hint="One per line."
            value={values.requirements} onChange={(v) => set('requirements', v)}
          />
        </div>

        <div className="card">
          <div className="card__header"><h2>How to apply</h2></div>

          <Field
            label="Application email"
            htmlFor="applyEmail"
            error={errors.applyEmail}
            hint={fallbackInbox
              ? `Leave blank to use ${fallbackInbox} from Site Settings.`
              : 'Set a careers email under Site Settings so applications have somewhere to go.'}
          >
            <input id="applyEmail" type="email" value={values.applyEmail} onChange={(e) => set('applyEmail', e.target.value)} />
          </Field>

          <Field
            label="External application link"
            htmlFor="applyUrl"
            error={errors.applyUrl}
            hint="Optional. If set, the Apply button points here instead of opening an email."
          >
            <input id="applyUrl" type="url" value={values.applyUrl} onChange={(e) => set('applyUrl', e.target.value)} />
          </Field>
        </div>

        <SeoFields value={values.seo || {}} onChange={(seo) => set('seo', seo)} errors={errors} />
      </div>
    </form>
  );
}
