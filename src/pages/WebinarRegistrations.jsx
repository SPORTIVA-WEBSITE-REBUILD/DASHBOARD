import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../lib/api.js';
import { COUNTRIES } from '../lib/countries.js';
import { PageHeader } from '../layout/Shell.jsx';
import {
  ConfirmDialog, EmptyState, ErrorState, LoadingRows,
  Pagination, Spinner, useDebounced, useToast, formatDate,
} from '../components/ui.jsx';

const STATUS_LABEL = { PENDING: 'Pending', SENT: 'Sent', FAILED: 'Failed' };

const ROLES = [
  'Athlete (Professional)',
  'Athlete (Recreational)',
  'Sports Management and Administration',
  'Lawyer',
  'Law Student',
  'Other',
];

function StatusChip({ status }) {
  return <span className={`badge badge--${status?.toLowerCase()}`}>{STATUS_LABEL[status] || status}</span>;
}

export default function WebinarRegistrations() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [nationality, setNationality] = useState('');
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'resend-failed'|'reminder-day'|'reminder-hour', count }
  const debounced = useDebounced(search);
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = { page, limit: 20, status, role, nationality, q: debounced };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['webinar-registrations', query],
    queryFn: () => api.get(`/admin/webinar/registrations${qs(query)}`),
    placeholderData: (prev) => prev,
  });

  const items = data?.data || [];
  const counts = data?.meta?.counts || { total: 0, sent: 0, failed: 0, pending: 0 };

  const resendOne = useMutation({
    mutationFn: (id) => api.post(`/admin/webinar/registrations/${id}/resend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webinar-registrations'] });
      toast.success('Email resent');
    },
    onError: (err) => toast.error(err.message || 'Could not resend'),
  });

  const resendFailed = useMutation({
    mutationFn: () => api.post('/admin/webinar/resend-failed'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['webinar-registrations'] });
      toast.success(`Resent to ${res.data.sent} of ${res.data.attempted}`);
      setConfirmAction(null);
    },
    onError: (err) => { toast.error(err.message || 'Could not resend'); setConfirmAction(null); },
  });

  const sendReminder = useMutation({
    mutationFn: (type) => api.post('/admin/webinar/send-reminder', { type, dryRun: false }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['webinar-registrations'] });
      toast.success(`Reminder sent to ${res.data.sent} of ${res.data.recipientCount}`);
      setConfirmAction(null);
    },
    onError: (err) => { toast.error(err.message || 'Could not send the reminder'); setConfirmAction(null); },
  });

  /** Dry-run first, to get the recipient count for the confirm dialog —
   *  the real send only happens once the admin confirms that count. */
  async function openReminderConfirm(type) {
    try {
      const res = await api.post('/admin/webinar/send-reminder', { type, dryRun: true });
      setConfirmAction({ type: `reminder-${type}`, count: res.data.recipientCount });
    } catch (err) {
      toast.error(err.message || 'Could not check the recipient count');
    }
  }

  function runConfirmedAction() {
    if (confirmAction?.type === 'resend-failed') resendFailed.mutate();
    else if (confirmAction?.type === 'reminder-day') sendReminder.mutate('day');
    else if (confirmAction?.type === 'reminder-hour') sendReminder.mutate('hour');
  }

  return (
    <>
      <PageHeader
        title="Webinar registrations"
        actions={(
          <button
            type="button" className="btn"
            onClick={() => api.download('/admin/webinar/registrations.csv', 'webinar-registrations.csv').catch((err) => toast.error(err.message))}
          >
            Export CSV
          </button>
        )}
      />

      <div className="content">
        <div className="row" style={{ marginBottom: '1rem' }}>
          <div className="card" style={{ flex: 1 }}>
            <div className="muted">Total</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{counts.total}</div>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <div className="muted">Sent</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{counts.sent}</div>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <div className="muted">Failed</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{counts.failed}</div>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <div className="muted">Pending</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{counts.pending}</div>
          </div>
        </div>

        <div className="card">
          <div className="toolbar" style={{ justifyContent: 'space-between', rowGap: '0.75rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="search" placeholder="Search name or email" aria-label="Search registrations"
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {['', 'PENDING', 'SENT', 'FAILED'].map((s) => (
                  <button
                    key={s || 'all'}
                    type="button"
                    className={`btn btn--sm${status === s ? ' btn--primary' : ''}`}
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={() => { setStatus(s); setPage(1); }}
                  >
                    {s ? STATUS_LABEL[s] : 'All'}
                  </button>
                ))}
              </div>
              <select
                aria-label="Filter by role"
                value={role}
                onChange={(e) => { setRole(e.target.value); setPage(1); }}
              >
                <option value="">All roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input
                type="text"
                list="webinar-registrations-countries"
                aria-label="Filter by nationality"
                placeholder="Filter by nationality"
                value={nationality}
                onChange={(e) => { setNationality(e.target.value); setPage(1); }}
              />
              <datalist id="webinar-registrations-countries">
                {COUNTRIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button" className="btn btn--sm"
                style={{ whiteSpace: 'nowrap' }}
                disabled={counts.failed === 0 || resendFailed.isPending}
                onClick={() => setConfirmAction({ type: 'resend-failed', count: counts.failed })}
              >
                Resend failed ({counts.failed})
              </button>
              <button type="button" className="btn btn--sm" style={{ whiteSpace: 'nowrap' }} onClick={() => openReminderConfirm('day')}>
                Send reminder: day before
              </button>
              <button type="button" className="btn btn--sm" style={{ whiteSpace: 'nowrap' }} onClick={() => openReminderConfirm('hour')}>
                Send reminder: hour before
              </button>
            </div>
          </div>

          {isError && <ErrorState error={error} onRetry={refetch} />}

          {!isError && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Role</th><th>Nationality</th><th>Phone</th>
                    <th>Registered at</th><th>Email status</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                {isLoading && !data
                  ? <LoadingRows rows={6} cols={8} />
                  : (
                    <tbody>
                      {items.map((r) => (
                        <tr key={r._id}>
                          <td>{r.name}</td>
                          <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                          <td>{r.role === 'Other' && r.roleOther ? `Other (${r.roleOther})` : (r.role || '—')}</td>
                          <td>{r.nationality || '—'}</td>
                          <td>{r.phone || '—'}</td>
                          <td className="muted">{formatDate(r.createdAt)}</td>
                          <td>
                            <StatusChip status={r.emailStatus} />
                            {r.emailStatus === 'FAILED' && r.emailError && (
                              <div className="muted" style={{ fontSize: 12 }}>{r.emailError}</div>
                            )}
                          </td>
                          <td className="actions">
                            <button
                              type="button" className="btn btn--sm"
                              disabled={resendOne.isPending}
                              onClick={() => resendOne.mutate(r._id)}
                            >
                              Resend
                            </button>
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
              title={status || search ? 'Nothing matches those filters' : 'No registrations yet'}
              message="Registrations submitted through the webinar form appear here."
            />
          )}

          <Pagination meta={data?.meta} onChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'resend-failed' ? 'Resend to everyone with a failed email?'
            : confirmAction?.type === 'reminder-day' ? 'Send the day-before reminder?'
              : 'Send the hour-before reminder?'
        }
        message={
          confirmAction?.type === 'resend-failed'
            ? `This will try again for ${confirmAction?.count ?? 0} registration(s) currently marked Failed.`
            : `This will email ${confirmAction?.count ?? 0} registration(s) who have not yet received this reminder.`
        }
        confirmLabel="Send"
        busy={resendFailed.isPending || sendReminder.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
      />
    </>
  );
}
