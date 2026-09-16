import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { PageHeader } from '../layout/Shell.jsx';
import { Field, Spinner, useToast } from '../components/ui.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function Profile() {
  const { admin, setAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: '', email: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    if (admin) setProfile({ name: admin.name, email: admin.email });
  }, [admin]);

  const saveProfile = useMutation({
    mutationFn: () => api.patch('/auth/me', profile),
    onSuccess: (res) => {
      setAdmin(res.data);
      setProfileErrors({});
      toast.success('Profile updated');
    },
    onError: (err) => {
      if (err.details) setProfileErrors(err.fieldErrors);
      else toast.error(err.message);
    },
  });

  const changePassword = useMutation({
    mutationFn: () => api.patch('/auth/me/password', {
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    }),
    onSuccess: () => {
      toast.success('Password changed. Please sign in again.');
      // The server ends every session on a password change, this one included.
      navigate('/login', { replace: true });
    },
    onError: (err) => {
      if (err.details) setPasswordErrors(err.fieldErrors);
      else toast.error(err.message);
    },
  });

  const mismatch = passwords.newPassword && passwords.confirm && passwords.newPassword !== passwords.confirm;

  return (
    <>
      <PageHeader title="My Profile" />

      <div className="content">
        <form
          className="card"
          onSubmit={(e) => { e.preventDefault(); saveProfile.mutate(); }}
        >
          <div className="card__header"><h2>Details</h2></div>

          <Field label="Full name" htmlFor="p-name" error={profileErrors.name} required>
            <input id="p-name" type="text" required value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
          </Field>

          <Field label="Email" htmlFor="p-email" error={profileErrors.email} required>
            <input id="p-email" type="email" required value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
          </Field>

          <p className="muted">Role: {admin?.role?.replace('_', ' ')}</p>

          <button type="submit" className="btn btn--primary" disabled={saveProfile.isPending}>
            {saveProfile.isPending && <Spinner />} Save details
          </button>
        </form>

        <form
          className="card"
          onSubmit={(e) => { e.preventDefault(); if (!mismatch) changePassword.mutate(); }}
        >
          <div className="card__header"><h2>Change password</h2></div>

          <Field label="Current password" htmlFor="p-current" error={passwordErrors.currentPassword} required>
            <PasswordInput
              id="p-current" autoComplete="current-password" required
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </Field>

          <Field
            label="New password"
            htmlFor="p-new"
            error={passwordErrors.newPassword}
            required
            hint="At least 10 characters. A passphrase of a few words is both stronger and easier to remember."
          >
            <PasswordInput
              id="p-new" autoComplete="new-password" required minLength={10}
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            />
          </Field>

          <Field label="Confirm new password" htmlFor="p-confirm" error={mismatch ? 'The passwords do not match' : undefined} required>
            <PasswordInput
              id="p-confirm" autoComplete="new-password" required
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
            />
          </Field>

          <p className="hint">Changing your password signs you out of every device, including this one.</p>

          <button type="submit" className="btn btn--primary" disabled={changePassword.isPending || mismatch}>
            {changePassword.isPending && <Spinner />} Change password
          </button>
        </form>
      </div>
    </>
  );
}
