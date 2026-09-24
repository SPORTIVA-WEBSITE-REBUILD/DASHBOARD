import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../lib/api.js';
import { PageHeader } from '../layout/Shell.jsx';
import {
  ConfirmDialog, EmptyState, ErrorState, LoadingRows, Pagination, Spinner,
  StatusBadge, useDebounced, useToast, formatDate,
} from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function Subscribers() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [exporting, setExporting] = useState(false);
  const debounced = useDebounced(search);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();

  const query = { page, limit: 50, status, q: debounced };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['subscribers', query],
    queryFn: () => api.get(`/subscribers${qs(query)}`),
    placeholderData: (prev) => prev,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['subscribers'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const setStatusMutation = useMutation({
    mutationFn: ({ id, next }) => api.patch(`/subscribers/${id}/status`, { status: next }),
    onSuccess: () => { refresh(); toast.success('Subscriber updated'); },
    onError: (err) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id) => api.del(`/subscribers/${id}`),
    onSuccess: () => { refresh(); toast.success('Subscriber removed'); setPendingDelete(null); },
    onError: (err) => toast.error(err.message),
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      await api.download(`/subscribers/export${qs({ status, q: debounced })}`, 'subscribers.csv');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  const items = data?.data || [];

  return (
    <>
      <PageHeader
        title="Subscribers"
        actions={(
          <button type="button" className="btn" onClick={exportCsv} disabled={exporting || items.length === 0}>
            {exporting && <Spinner />} Export CSV
          </button>
        )}
      />

      <div className="content">
        <div className="card">
          <div className="toolbar">
            <input
              type="search"
              placeholder="Search by email"
              aria-label="Search subscribers"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>

          {isError && <ErrorState error={error} onRetry={refetch} />}

          {!isError && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Email</th><th>Status</th><th>Signed up</th><th className="text-right">Actions</th></tr>
                </thead>
                {isLoading && !data
                  ? <LoadingRows rows={6} cols={4} />
                  : (
                    <tbody>
                      {items.map((s) => (
                        <tr key={s._id}>
                          <td><a href={`mailto:${s.email}`}>{s.email}</a></td>
                          <td><StatusBadge status={s.status} /></td>
                          <td className="muted">{formatDate(s.createdAt)}</td>
                          <td className="actions">
                            {can('subscribers:update') && (
                              <button
                                type="button"
                                className="btn btn--sm"
                                onClick={() => setStatusMutation.mutate({ id: s._id, next: s.status === 'subscribed' ? 'unsubscribed' : 'subscribed' })}
                              >
                                {s.status === 'subscribed' ? 'Unsubscribe' : 'Resubscribe'}
                              </button>
                            )}
                            {' '}
                            {can('subscribers:delete') && (
                              <button type="button" className="btn btn--sm btn--danger" onClick={() => setPendingDelete(s)}>Delete</button>
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
              title={status || search ? 'Nothing matches those filters' : 'No subscribers yet'}
              message="Addresses entered in the website's newsletter band appear here."
            />
          )}

          <Pagination meta={data?.meta} onChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this subscriber?"
        message={`${pendingDelete?.email || ''} will be permanently removed. To stop emailing someone but keep a record, unsubscribe them instead.`}
        busy={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => remove.mutate(pendingDelete._id)}
      />
    </>
  );
}
