import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { PageHeader } from '../layout/Shell.jsx';
import {
  ConfirmDialog, ErrorState, Field, LoadingRows, Modal, Spinner, useToast, formatDate,
} from '../components/ui.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { useAuth } from '../lib/auth.jsx';

const ROLES = [
  ['editor', 'Editor', 'Can manage articles, the case record and media.'],
  ['admin', 'Admin', 'Can manage all content, settings and navigation.'],
  ['super_admin', 'Super Admin', 'Full access, including managing administrators.'],
];

export default function Administrators() {
  const { admin: me } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(null);
  const [errors, setErrors] = useState({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admins'],
    queryFn: () => api.get('/admins').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (v) => {
      const payload = { name: v.name, email: v.email, role: v.role };
      if (v.password) payload.password = v.password;
      if (v._id && typeof v.isActive === 'boolean') payload.isActive = v.isActive;
      return v._id ? api.patch(`/admins/${v._id}`, payload) : api.post('/admins', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Administrator saved');
      setEditing(null);
      setErrors({});
    },
    onError: (err) => {
      if (err.details) setErrors(err.fieldErrors);
      else toast.error(err.message);
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/admins/${id}`, { isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success(isActive ? 'Account enabled' : 'Account disabled');
    },
    // The server refuses to disable the last super admin, or your own account.
    onError: (err) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id) => api.del(`/admins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Administrator deleted');
      setPending(null);
    },
    onError: (err) => { toast.error(err.message); setPending(null); },
  });

  const admins = data || [];

  return (
    <>
      <PageHeader
        title="Administrators"
        actions={(
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { setEditing({ name: '', email: '', role: 'editor', password: '' }); setErrors({}); }}
          >
            New administrator
          </button>
        )}
      />

      <div className="content">
        <div className="alert alert--warning">
          Administrators can change what the public website says. Give each person
          the lowest role that lets them do their job, and disable accounts rather
          than sharing one.
        </div>

        <div className="card">
          {isError && <ErrorState error={error} onRetry={refetch} />}

          {!isError && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last signed in</th><th className="text-right">Actions</th></tr>
                </thead>
                {isLoading
                  ? <LoadingRows rows={3} cols={6} />
                  : (
                    <tbody>
                      {admins.map((a) => {
                        const isSelf = a._id === me?.id;
                        return (
                          <tr key={a._id}>
                            <td>{a.name}{isSelf && <span className="badge" style={{ marginLeft: 6 }}>You</span>}</td>
                            <td className="muted">{a.email}</td>
                            <td>{a.role.replace('_', ' ')}</td>
                            <td>
                              <span className={`badge badge--${a.isActive ? 'published' : 'draft'}`}>
                                {a.isActive ? 'active' : 'disabled'}
                              </span>
                            </td>
                            <td className="muted">{formatDate(a.lastLoginAt)}</td>
                            <td className="actions">
                              <button
                                type="button" className="btn btn--sm"
                                onClick={() => { setEditing({ ...a, password: '' }); setErrors({}); }}
                              >
                                Edit
                              </button>
                              {' '}
                              {!isSelf && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn--sm"
                                    onClick={() => toggleActive.mutate({ id: a._id, isActive: !a.isActive })}
                                  >
                                    {a.isActive ? 'Disable' : 'Enable'}
                                  </button>
                                  {' '}
                                  <button type="button" className="btn btn--sm btn--danger" onClick={() => setPending(a)}>
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  )}
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(editing)}
        title={editing?._id ? 'Edit administrator' : 'New administrator'}
        onClose={() => setEditing(null)}
      >
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }}>
          <Field label="Full name" htmlFor="a-name" error={errors.name} required>
            <input id="a-name" type="text" required value={editing?.name || ''} onChange={(e) => setEditing((v) => ({ ...v, name: e.target.value }))} />
          </Field>

          <Field label="Email" htmlFor="a-email" error={errors.email} required>
            <input id="a-email" type="email" required value={editing?.email || ''} onChange={(e) => setEditing((v) => ({ ...v, email: e.target.value }))} />
          </Field>

          <Field
            label="Role"
            htmlFor="a-role"
            error={errors.role}
            hint={ROLES.find(([v]) => v === editing?.role)?.[2]}
          >
            <select
              id="a-role"
              value={editing?.role || 'editor'}
              onChange={(e) => setEditing((v) => ({ ...v, role: e.target.value }))}
              disabled={editing?._id === me?.id}
            >
              {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>

          {editing?._id === me?.id && (
            <p className="hint">You cannot change your own role. Ask another super administrator.</p>
          )}

          <Field
            label={editing?._id ? 'New password' : 'Password'}
            htmlFor="a-pass"
            error={errors.password}
            required={!editing?._id}
            hint={editing?._id
              ? 'Leave blank to keep the current password. Setting one signs them out everywhere.'
              : 'At least 10 characters.'}
          >
            <PasswordInput
              id="a-pass" autoComplete="new-password"
              required={!editing?._id} minLength={10}
              value={editing?.password || ''}
              onChange={(e) => setEditing((v) => ({ ...v, password: e.target.value }))}
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
        title="Delete this administrator?"
        message={`${pending?.name || ''} will lose access immediately and permanently. Disabling the account instead keeps the record.`}
        busy={remove.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => remove.mutate(pending._id)}
      />
    </>
  );
}
