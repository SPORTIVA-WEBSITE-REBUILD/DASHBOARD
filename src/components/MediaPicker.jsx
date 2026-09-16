import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../lib/api.js';
import { uploadFile, validateFile, thumb, preview } from '../lib/upload.js';
import { Modal, EmptyState, Spinner, useToast, useDebounced, formatBytes } from './ui.jsx';

function UploadArea({ onUploaded }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function handleFiles(files) {
    const list = Array.from(files);
    if (!list.length) return;

    setBusy(true);
    for (const file of list) {
      const problem = validateFile(file);
      if (problem) { toast.error(problem); continue; }
      try {
        setProgress(0);
        // eslint-disable-next-line no-await-in-loop
        const media = await uploadFile(file, { onProgress: setProgress });
        onUploaded(media);
        toast.success(`${file.name} uploaded`);
      } catch (err) {
        toast.error(err.message || `${file.name} could not be uploaded`);
      }
    }
    setProgress(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="mb-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={busy}
      />
      <span className="hint">JPEG, PNG, WebP, AVIF or PDF. Up to 10 MB each.</span>
      {progress !== null && (
        <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress__bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

export function MediaLibrary({ onSelect, selectedId }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['media', { page, q: debounced }],
    queryFn: () => api.get(`/media${qs({ page, limit: 24, q: debounced })}`),
    placeholderData: (prev) => prev,
  });

  const items = data?.data || [];

  return (
    <>
      <UploadArea onUploaded={(media) => {
        queryClient.invalidateQueries({ queryKey: ['media'] });
        onSelect?.(media);
      }} />

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search media"
          aria-label="Search media"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading && <div className="state"><Spinner /> Loading media…</div>}

      {!isLoading && items.length === 0 && (
        <EmptyState title="No media yet" message="Upload an image to get started." />
      )}

      <div className="media-grid">
        {items.map((m) => (
          <button
            type="button"
            key={m._id}
            className={`media-item${selectedId === m._id ? ' selected' : ''}`}
            onClick={() => onSelect?.(m)}
            title={m.publicId}
          >
            {m.resourceType === 'image'
              ? <img src={thumb(m)} alt={m.alt || ''} loading="lazy" />
              : <div className="media-item__meta" style={{ height: 110, display: 'grid', placeItems: 'center' }}>PDF</div>}
            <span className="media-item__meta">
              {m.width ? `${m.width}×${m.height} · ` : ''}{formatBytes(m.bytes)}
            </span>
          </button>
        ))}
      </div>

      {data?.meta?.pages > 1 && (
        <div className="pagination">
          <button type="button" className="btn btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="muted">Page {data.meta.page} of {data.meta.pages}</span>
          <button type="button" className="btn btn--sm" disabled={page >= data.meta.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </>
  );
}

/** A single-image form control: shows the current choice, opens the library. */
export default function MediaPicker({ value, onChange, label = 'Image' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="field">
      <label>{label}</label>
      <div className="image-picker">
        {value?.secureUrl
          ? <img className="image-picker__preview" src={preview(value, 240)} alt={value.alt || ''} />
          : <div className="image-picker__preview" aria-hidden="true" />}
        <div>
          <button type="button" className="btn btn--sm" onClick={() => setOpen(true)}>
            {value ? 'Change' : 'Choose image'}
          </button>
          {value && (
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => onChange(null)}>
              Remove
            </button>
          )}
          {value?.alt === '' && (
            <p className="hint mt-1">This image has no alt text. Add one in Media for accessibility and SEO.</p>
          )}
        </div>
      </div>

      <Modal open={open} title="Media library" onClose={() => setOpen(false)} wide>
        <MediaLibrary
          selectedId={value?._id}
          onSelect={(media) => { onChange(media); setOpen(false); }}
        />
        <div className="modal__actions">
          <button type="button" className="btn" onClick={() => setOpen(false)}>Close</button>
        </div>
      </Modal>
    </div>
  );
}
