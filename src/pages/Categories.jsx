import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { PageHeader } from '../layout/Shell.jsx';
import {
  ConfirmDialog, EmptyState, ErrorState, Field, LoadingRows, Modal, Spinner, useToast,
} from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';

/**
 * Categories are small and simple enough that a full edit page would be more
 * clicks than the task deserves, so they are managed inline in a dialog.
 */
export default function Categories() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(null);
  const [errors, setErrors] = useState({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories?limit=100'),
  });

  const save = useMutation({
    mutationFn: (values) => (values._id
      ? api.patch(`/categories/${values._id}`, { name: values.name, description: values.description })
      : api.post('/categories', { name: values.name, description: values.description })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category saved');
      setEditing(null);
      setErrors({});
    },
    onError: (err) => {
      if (err.details) setErrors(err.fieldErrors);
      else toast.error(err.message);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => api.del(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
      setPending(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const items = data?.data || [];

  return (
    <>
      <PageHeader
        title="Categories"
        actions={can('categories:create') && (
          <button type="button" className="btn btn--primary" onClick={() => { setEditing({ name: '', description: '' }); setErrors({}); }}>
            New category
          </button>
        )}
      />

      <div className="content">
        <div className="card">
          {isError && <ErrorState error={error} onRetry={refetch} />}

          {!isError && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Name</th><th>Slug</th><th>Description</th><th className="text-right">Actions</th></tr>
                </thead>
                {isLoading
                  ? <LoadingRows rows={4} cols={4} />
                  : (
                    <tbody>
                      {items.map((c) => (
                        <tr key={c._id}>
                          <td>{c.name}</td>
                          <td className="muted">{c.slug}</td>
                          <td className="muted">{c.description || '—'}</td>
                          <td className="actions">
                            {can('categories:update') && (
                              <button type="button" className="btn btn--sm" onClick={() => { setEditing(c); setErrors({}); }}>Edit</button>
                            )}
                            {' '}
                            {can('categories:delete') && (
                              <button type="button" className="btn btn--sm btn--danger" onClick={() => setPending(c)}>Delete</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
              </table>
            </div>
          )}

          {!isLoading && items.length === 0 && !isError && (
            <EmptyState title="No categories yet" message="Categories group articles on the Insights page." />
          )}
        </div>
      </div>

      <Modal open={Boolean(editing)} title={editing?._id ? 'Edit category' : 'New category'} onClose={() => setEditing(null)}>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }}>
          <Field label="Name" htmlFor="cat-name" error={errors.name} required>
            <input
              id="cat-name" type="text" required autoFocus
              value={editing?.name || ''}
              onChange={(e) => setEditing((c) => ({ ...c, name: e.target.value }))}
            />
          </Field>

          <Field label="Description" htmlFor="cat-desc" error={errors.description}>
            <textarea
              id="cat-desc" rows={3} maxLength={300}
              value={editing?.description || ''}
              onChange={(e) => setEditing((c) => ({ ...c, description: e.target.value }))}
            />
          </Field>

          <div className="modal__actions">
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={save.isPending}>
              {save.isPending && <Spinner />} Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Delete this category?"
        message={`"${pending?.name}" will be removed. Articles in it will become uncategorised, not deleted.`}
        busy={remove.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => remove.mutate(pending._id)}
      />
    </>
  );
}
