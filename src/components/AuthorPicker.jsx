import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Field } from './ui.jsx';

const idOf = (v) => (v && typeof v === 'object' ? v._id : v);

/**
 * Credits any number of team members. The order they are ticked in is the
 * order they are shown in, and the first one is the lead author.
 */
export default function AuthorPicker({ value = [], onChange, label = 'Authors' }) {
  const { data: lawyers } = useQuery({
    queryKey: ['lawyers', 'all'],
    queryFn: () => api.get('/lawyers?limit=100').then((r) => r.data),
  });

  const selected = (value || []).map(idOf).filter(Boolean);

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <Field
      label={label}
      hint="Tick everyone who should be credited. They appear in the order ticked, and the first is the lead author."
    >
      <div className="author-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
        {(lawyers || []).map((l) => (
          <label key={l._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={selected.includes(l._id)}
              onChange={() => toggle(l._id)}
              style={{ width: 'auto' }}
            />
            {l.name}
            {selected.includes(l._id) && <span className="muted"> ({selected.indexOf(l._id) + 1})</span>}
          </label>
        ))}
        {lawyers && lawyers.length === 0 && <span className="muted">No team members yet.</span>}
      </div>
    </Field>
  );
}
