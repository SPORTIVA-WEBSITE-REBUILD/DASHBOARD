import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useToast } from '../components/ui.jsx';

/**
 * The create/edit lifecycle every content form shares: load, track changes,
 * save, surface field errors from the API, warn before losing unsaved work.
 */
export default function useResourceForm({ resource, singular, empty, toPayload, listPath }) {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [resource, id],
    queryFn: () => api.get(`/${resource}/${id}`).then((r) => r.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (data) {
      setValues({ ...empty, ...data });
      setDirty(false);
    }
  // `empty` is a stable literal from the caller; re-running on it would reset
  // the form on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Closing the tab mid-edit should not silently discard the work.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const set = useCallback((key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }, []);

  const save = useMutation({
    mutationFn: (payload) => (isNew
      ? api.post(`/${resource}`, payload)
      : api.patch(`/${resource}/${id}`, payload)),
    onSuccess: (res) => {
      setErrors({});
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: [resource] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(isNew ? `${singular} created` : `${singular} saved`);
      if (isNew) navigate(`/${resource}/${res.data._id}`, { replace: true });
    },
    onError: (err) => {
      if (err.status === 400 && err.details) {
        setErrors(err.fieldErrors);
        toast.error('Please correct the highlighted fields');
      } else {
        toast.error(err.message || 'Could not save');
      }
    },
  });

  const submit = useCallback((e) => {
    e?.preventDefault?.();
    save.mutate(toPayload(values));
  }, [save, toPayload, values]);

  const cancel = useCallback(() => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    navigate(listPath || `/${resource}`);
  }, [dirty, navigate, listPath, resource]);

  return {
    id, isNew, values, setValues, set, errors, dirty,
    isLoading, isError, error,
    submit, cancel, saving: save.isPending,
  };
}
