import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../lib/api.js';
import { PageHeader } from '../layout/Shell.jsx';
import {
  ConfirmDialog, EmptyState, ErrorState, LoadingRows, Pagination,
  StatusBadge, useDebounced, useToast, formatDate,
} from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function Comments() {
  const [page, setPage] = useState(1);
  // Opens on the queue that needs attention.
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const debounced = useDebounced(search);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();

  const query = { page, limit: 20, status, q: debounced };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['comments', query],
    queryFn: () => api.get(`/comments${qs(query)}`),
    placeholderData: (prev) => prev,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['comments'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const moderate = useMutation({
    mutationFn: ({ id, next }) => api.patch(`/comments/${id}/status`, { status: next }),
    onSuccess: (_, { next }) => {
      refresh();
      toast.success(next === 'approved' ? 'Comment approved — it is now on the website' : `Comment marked ${next}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id) => api.del(`/comments/${id}`),
    onSuccess: () => { refresh(); toast.success('Comment deleted'); setPendingDelete(null); },
    onError: (err) => toast.error(err.message),
  });

  const items = data?.data || [];
  const canModerate = can('comments:update');

  return (
    <>
      <PageHeader title="Comments" />

      <div className="content">
        <div className="card">
          <p className="hint mb-2">
            New comments wait here and are not shown on the website until approved.
          </p>

          <div className="toolbar">
            <input
              type="search"
              placeholder="Search comments"
              aria-label="Search comments"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="pending">Awaiting approval</option>
              <option value="approved">Approved</option>
              <option value="spam">Spam</option>
              <option value="">All</option>
            </select>
          </div>

          {isError && <ErrorState error={error} onRetry={refetch} />}

          {!isError && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>From</th><th>Comment</th><th>Article</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                {isLoading && !data
                  ? <LoadingRows rows={6} cols={5} />
                  : (
                    <tbody>
                      {items.map((c) => (
                        <tr key={c._id}>
                          <td>
                            {c.name}
                            <div className="muted">{c.email}</div>
                            {c.website && <div className="muted">{c.website}</div>}
                            <div className="muted">{formatDate(c.createdAt)}</div>
                          </td>
                          <td style={{ whiteSpace: 'pre-wrap', maxWidth: 420 }}>
                            {c.parent && <div className="muted">Replying to {c.parent.name}</div>}
                            {c.message}
                          </td>
                          <td>
                            {c.article
                              ? <Link to={`/articles/${c.article._id}`}>{c.article.title}</Link>
                              : <span className="muted">Deleted article</span>}
                          </td>
                          <td><StatusBadge status={c.status} /></td>
                          <td className="actions">
                            {canModerate && c.status !== 'approved' && (
                              <button type="button" className="btn btn--sm btn--primary" onClick={() => moderate.mutate({ id: c._id, next: 'approved' })}>Approve</button>
                            )}
                            {' '}
                            {canModerate && c.status === 'approved' && (
                              <button type="button" className="btn btn--sm" onClick={() => moderate.mutate({ id: c._id, next: 'pending' })}>Unapprove</button>
                            )}
                            {' '}
                            {canModerate && c.status !== 'spam' && (
                              <button type="button" className="btn btn--sm" onClick={() => moderate.mutate({ id: c._id, next: 'spam' })}>Spam</button>
                            )}
                            {' '}
                            {can('comments:delete') && (
                              <button type="button" className="btn btn--sm btn--danger" onClick={() => setPendingDelete(c)}>Delete</button>
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
              title={status === 'pending' && !search ? 'Nothing awaiting approval' : 'No comments match'}
              message="Comments left on Articles articles appear here."
            />
          )}

          <Pagination meta={data?.meta} onChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this comment?"
        message={`The comment from ${pendingDelete?.name || ''} and any replies to it will be permanently removed.`}
        busy={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => remove.mutate(pendingDelete._id)}
      />
    </>
  );
}
