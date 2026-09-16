import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { PageHeader } from '../layout/Shell.jsx';
import { MediaLibrary } from '../components/MediaPicker.jsx';
import { ConfirmDialog, Field, Modal, Spinner, useToast, formatBytes } from '../components/ui.jsx';
import { preview } from '../lib/upload.js';
import { useAuth } from '../lib/auth.jsx';

export default function Media() {
  const [selected, setSelected] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();

  function open(media) {
    setSelected(media);
    setAlt(media.alt || '');
    setCaption(media.caption || '');
  }

  const save = useMutation({
    mutationFn: () => api.patch(`/media/${selected._id}`, { alt, caption }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Details saved');
      setSelected(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id) => api.del(`/media/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('File deleted');
      setPendingDelete(null);
      setSelected(null);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <PageHeader title="Media" />
      <div className="content">
        <div className="card">
          <MediaLibrary onSelect={open} selectedId={selected?._id} />
        </div>
      </div>

      <Modal open={Boolean(selected)} title="File details" onClose={() => setSelected(null)}>
        {selected && (
          <>
            {selected.resourceType === 'image' && (
              <img
                src={preview(selected, 600)}
                alt={selected.alt || ''}
                style={{ width: '100%', borderRadius: 6, marginBottom: '1rem' }}
              />
            )}

            <p className="muted" style={{ wordBreak: 'break-all' }}>
              {selected.width ? `${selected.width}×${selected.height} · ` : ''}
              {formatBytes(selected.bytes)} · {selected.format?.toUpperCase()}
            </p>

            <Field
              label="Alt text"
              htmlFor="alt"
              hint="Describes the image for screen readers and search engines. Leave blank only for purely decorative images."
            >
              <input id="alt" type="text" maxLength={200} value={alt} onChange={(e) => setAlt(e.target.value)} />
            </Field>

            <Field label="Caption" htmlFor="caption">
              <input id="caption" type="text" maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} />
            </Field>

            <div className="modal__actions">
              {can('media:delete') && (
                <button
                  type="button"
                  className="btn btn--danger"
                  style={{ marginRight: 'auto' }}
                  onClick={() => setPendingDelete(selected)}
                >
                  Delete
                </button>
              )}
              <button type="button" className="btn" onClick={() => setSelected(null)}>Close</button>
              {can('media:update') && (
                <button type="button" className="btn btn--primary" onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending && <Spinner />} Save
                </button>
              )}
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this file?"
        message="The file will be permanently removed from storage. Any page still using it will show a broken image."
        busy={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => remove.mutate(pendingDelete._id)}
      />
    </>
  );
}
