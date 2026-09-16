import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { PageHeader } from '../layout/Shell.jsx';
import { Field, Spinner, useToast } from '../components/ui.jsx';

function NavEditor({ location, label }) {
  const [items, setItems] = useState([]);
  const [dirty, setDirty] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['navigation', location],
    queryFn: () => api.get(`/navigation/${location}`).then((r) => r.data),
  });

  useEffect(() => { if (data) { setItems(data.items || []); setDirty(false); } }, [data]);

  const save = useMutation({
    mutationFn: () => api.put(`/navigation/${location}`, {
      // Order is implied by position in the list, so it is assigned on save
      // rather than asking an administrator to keep numbers in sync.
      items: items
        .filter((i) => i.label && i.href)
        .map((i, order) => ({ label: i.label, href: i.href, order, external: Boolean(i.external) })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navigation'] });
      toast.success(`${label} saved`);
      setDirty(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const update = (i, patch) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    setItems(next);
    setDirty(true);
  };

  const move = (i, delta) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    setDirty(true);
  };

  if (isLoading) return <div className="card"><Spinner /></div>;

  return (
    <div className="card">
      <div className="card__header">
        <h2>{label}</h2>
        <button
          type="button"
          className="btn btn--primary btn--sm spacer"
          onClick={() => save.mutate()}
          disabled={save.isPending || !dirty}
        >
          {save.isPending && <Spinner />} Save
        </button>
      </div>

      {items.length === 0 && <p className="muted">No links yet.</p>}

      {items.map((item, i) => (
        // Links are reordered by explicit buttons that swap whole objects, and
        // React re-renders the row either way; index is the stable identity.
        // eslint-disable-next-line react/no-array-index-key
        <div className="row" key={i} style={{ alignItems: 'flex-end' }}>
          <Field label="Label" htmlFor={`nl-${location}-${i}`}>
            <input id={`nl-${location}-${i}`} type="text" value={item.label || ''} onChange={(e) => update(i, { label: e.target.value })} />
          </Field>

          <Field label="Link" htmlFor={`nh-${location}-${i}`} hint="e.g. /record">
            <input id={`nh-${location}-${i}`} type="text" value={item.href || ''} onChange={(e) => update(i, { href: e.target.value })} />
          </Field>

          <div style={{ flex: '0 0 auto', marginBottom: '1rem' }}>
            <label className="checkbox mb-1">
              <input type="checkbox" checked={Boolean(item.external)} onChange={(e) => update(i, { external: e.target.checked })} />
              External
            </label>
            <button type="button" className="btn btn--sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
            {' '}
            <button type="button" className="btn btn--sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">↓</button>
            {' '}
            <button
              type="button" className="btn btn--sm btn--danger"
              onClick={() => { setItems(items.filter((_, j) => j !== i)); setDirty(true); }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn--sm" onClick={() => { setItems([...items, { label: '', href: '' }]); setDirty(true); }}>
        Add link
      </button>
    </div>
  );
}

export default function Navigation() {
  return (
    <>
      <PageHeader title="Navigation" />
      <div className="content">
        <NavEditor location="header" label="Header menu" />
        <NavEditor location="footer" label="Footer menu" />
      </div>
    </>
  );
}
