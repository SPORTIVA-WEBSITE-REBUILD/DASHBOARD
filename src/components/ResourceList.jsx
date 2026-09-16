import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../lib/api.js';
import { PageHeader } from '../layout/Shell.jsx';
import {
  ConfirmDialog, EmptyState, ErrorState, LoadingRows,
  Pagination, useDebounced, useToast,
} from './ui.jsx';
import { useAuth } from '../lib/auth.jsx';

/**
 * One list screen for every content type. The columns and labels are the only
 * things that differ, so they are passed in rather than copied into eight
 * near-identical files that would then drift apart.
 */
export default function ResourceList({
  resource,          // API path segment, e.g. 'cases'
  title,
  singular,
  columns,           // [{ key, label, render?, width? }]
  withStatus = true,
  filters = null,    // optional extra filter controls
  emptyMessage,
  newLabel,
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(null);
  const debounced = useDebounced(search);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();

  const query = { page, limit: 20, q: debounced, status };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [resource, query],
    queryFn: () => api.get(`/${resource}${qs(query)}`),
    placeholderData: (prev) => prev,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => api.del(`/${resource}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(`${singular} deleted`);
      setPending(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }) => api.patch(`/${resource}/${id}/status`, { status: next }),
    onSuccess: (_, { next }) => {
      queryClient.invalidateQueries({ queryKey: [resource] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(next === 'published' ? `${singular} published` : `${singular} unpublished`);
    },
    onError: (err) => toast.error(err.message),
  });

  const items = data?.data || [];
  const canCreate = can(`${resource}:create`);
  const canDelete = can(`${resource}:delete`);
  const canUpdate = can(`${resource}:update`);

  return (
    <>
      <PageHeader
        title={title}
        actions={canCreate && (
          <Link className="btn btn--primary" to={`/${resource}/new`}>
            {newLabel || `New ${singular.toLowerCase()}`}
          </Link>
        )}
      />

      <div className="content">
        <div className="card">
          <div className="toolbar">
            <input
              type="search"
              placeholder={`Search ${title.toLowerCase()}`}
              aria-label={`Search ${title}`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />

            {withStatus && (
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            )}

            {filters}
          </div>

          {isError && <ErrorState error={error} onRetry={refetch} />}

          {!isError && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    {columns.map((c) => <th key={c.key} style={c.width ? { width: c.width } : undefined}>{c.label}</th>)}
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>

                {isLoading && !data
                  ? <LoadingRows rows={6} cols={columns.length + 1} />
                  : (
                    <tbody>
                      {items.map((item) => (
                        <tr key={item._id}>
                          {columns.map((c) => (
                            <td key={c.key}>
                              {c.render
                                ? c.render(item)
                                : <Link to={`/${resource}/${item._id}`}>{item[c.key] || '—'}</Link>}
                            </td>
                          ))}
                          <td className="actions">
                            {withStatus && canUpdate && (
                              <button
                                type="button"
                                className="btn btn--sm"
                                disabled={statusMutation.isPending}
                                onClick={() => statusMutation.mutate({
                                  id: item._id,
                                  next: item.status === 'published' ? 'draft' : 'published',
                                })}
                              >
                                {item.status === 'published' ? 'Unpublish' : 'Publish'}
                              </button>
                            )}
                            {' '}
                            <Link className="btn btn--sm" to={`/${resource}/${item._id}`}>Edit</Link>
                            {' '}
                            {canDelete && (
                              <button
                                type="button"
                                className="btn btn--sm btn--danger"
                                onClick={() => setPending(item)}
                              >
                                Delete
                              </button>
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
            <EmptyState
              title={search || status ? 'Nothing matches those filters' : `No ${title.toLowerCase()} yet`}
              message={search || status
                ? 'Try a different search or clear the status filter.'
                : emptyMessage}
              action={canCreate && !search && !status && (
                <Link className="btn btn--primary" to={`/${resource}/new`}>
                  {newLabel || `New ${singular.toLowerCase()}`}
                </Link>
              )}
            />
          )}

          <Pagination meta={data?.meta} onChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={`Delete this ${singular.toLowerCase()}?`}
        message={
          `"${pending?.title || pending?.name || ''}" will be permanently removed. `
          + 'This cannot be undone, and any links pointing to it will stop working.'
        }
        busy={removeMutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => removeMutation.mutate(pending._id)}
      />
    </>
  );
}
