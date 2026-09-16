import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../lib/api.js';
import { PageHeader } from '../layout/Shell.jsx';
import {
  ConfirmDialog, EmptyState, ErrorState, LoadingRows, Modal,
  Pagination, Spinner, StatusBadge, useDebounced, useToast, formatDate,
} from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function Enquiries() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const debounced = useDebounced(search);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();

  const query = { page, limit: 20, status, q: debounced };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['enquiries', query],
    queryFn: () => api.get(`/enquiries${qs(query)}`),
    placeholderData: (prev) => prev,
  });

  // Opening an enquiry marks it read server-side, so the list is refreshed.
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['enquiries', openId],
    queryFn: () => api.get(`/enquiries/${openId}`).then((r) => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      return r.data;
    }),
    enabled: Boolean(openId),
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, next }) => api.patch(`/enquiries/${id}/status`, { status: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Status updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id) => api.del(`/enquiries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      toast.success('Enquiry deleted');
      setPendingDelete(null);
      setOpenId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const items = data?.data || [];

  return (
    <>
      <PageHeader title="Enquiries" />

      <div className="content">
        <div className="card">
          <div className="toolbar">
            <input
              type="search"
              placeholder="Search enquiries"
              aria-label="Search enquiries"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="spam">Spam</option>
            </select>
          </div>

          {isError && <ErrorState error={error} onRetry={refetch} />}

          {!isError && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>From</th><th>Subject</th><th>Status</th><th>Received</th><th className="text-right">Actions</th></tr>
                </thead>
                {isLoading && !data
                  ? <LoadingRows rows={6} cols={5} />
                  : (
                    <tbody>
                      {items.map((e) => (
                        <tr key={e._id} style={e.status === 'new' ? { fontWeight: 500 } : undefined}>
                          <td>
                            <button type="button" className="btn btn--ghost btn--sm" style={{ padding: 0 }} onClick={() => setOpenId(e._id)}>
                              {e.name}
                            </button>
                            <div className="muted">{e.email}</div>
                          </td>
                          <td>{e.subject || <span className="muted">No subject</span>}</td>
                          <td><StatusBadge status={e.status} /></td>
                          <td className="muted">{formatDate(e.createdAt)}</td>
                          <td className="actions">
                            <button type="button" className="btn btn--sm" onClick={() => setOpenId(e._id)}>Open</button>
                            {' '}
                            {can('enquiries:delete') && (
                              <button type="button" className="btn btn--sm btn--danger" onClick={() => setPendingDelete(e)}>Delete</button>
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
              title={status || search ? 'Nothing matches those filters' : 'No enquiries yet'}
              message="Messages sent through the website's contact form appear here."
            />
          )}

          <Pagination meta={data?.meta} onChange={setPage} />
        </div>
      </div>

      <Modal open={Boolean(openId)} title="Enquiry" onClose={() => setOpenId(null)}>
        {detailLoading && <Spinner />}
        {detail && (
          <>
            <p><strong>{detail.name}</strong> — <a href={`mailto:${detail.email}`}>{detail.email}</a></p>
            {detail.phone && <p className="muted">{detail.phone}</p>}
            {detail.subject && <p><strong>Subject:</strong> {detail.subject}</p>}
            <p className="muted">{new Date(detail.createdAt).toLocaleString('en-GB')}</p>

            <div className="card" style={{ background: '#fafbfc', whiteSpace: 'pre-wrap' }}>
              {detail.message}
            </div>

            <div className="row">
              <label htmlFor="enq-status">
                Status
                <select
                  id="enq-status"
                  value={detail.status}
                  onChange={(e) => setStatusMutation.mutate({ id: detail._id, next: e.target.value })}
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="spam">Spam</option>
                </select>
              </label>
            </div>

            <div className="modal__actions">
              <a className="btn btn--primary" href={`mailto:${detail.email}?subject=${encodeURIComponent(`Re: ${detail.subject || 'Your enquiry'}`)}`}>
                Reply by email
              </a>
              <button type="button" className="btn" onClick={() => setOpenId(null)}>Close</button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this enquiry?"
        message={`The message from ${pendingDelete?.name || ''} will be permanently removed.`}
        busy={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => remove.mutate(pendingDelete._id)}
      />
    </>
  );
}
