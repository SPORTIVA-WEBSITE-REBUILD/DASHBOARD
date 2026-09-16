import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/* ------------------------------- toasts -------------------------------- */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, variant = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((all) => [...all, { id, message, variant }]);
    setTimeout(() => dismiss(id), variant === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const value = useMemo(() => ({
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.variant}`} onClick={() => dismiss(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

/* -------------------------------- modal -------------------------------- */

export function Modal({ open, title, children, onClose, wide = false }) {
  // Escape closes, and the body does not scroll behind the dialog.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

/**
 * Destructive actions are never one click. The caller supplies what will be
 * destroyed, so the wording is specific rather than a generic "are you sure".
 */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  return (
    <Modal open={open} title={title} onClose={busy ? undefined : onCancel}>
      <p className="muted">{message}</p>
      <div className="modal__actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
          {busy && <span className="spinner" />} {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* -------------------------------- states ------------------------------- */

export function Spinner() { return <span className="spinner" aria-hidden="true" />; }

export function LoadingRows({ rows = 5, cols = 4 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}><span className="skeleton" style={{ height: 14, width: c === 0 ? '70%' : '45%' }} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="state">
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state">
      <h3>Something went wrong</h3>
      <p>{error?.message || 'Please try again.'}</p>
      {onRetry && <button type="button" className="btn" onClick={onRetry}>Retry</button>}
    </div>
  );
}

/* -------------------------------- form --------------------------------- */

export function Field({ label, htmlFor, error, hint, children, required }) {
  return (
    <div className="field">
      {label && (
        <label htmlFor={htmlFor}>
          {label}{required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{status}</span>;
}

export function Pagination({ meta, onChange }) {
  if (!meta || meta.pages <= 1) return null;

  const pages = [];
  for (let i = Math.max(1, meta.page - 2); i <= Math.min(meta.pages, meta.page + 2); i += 1) pages.push(i);

  return (
    <div className="pagination">
      <button type="button" className="btn btn--sm" onClick={() => onChange(meta.page - 1)} disabled={meta.page <= 1}>
        Previous
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`btn btn--sm${p === meta.page ? ' current' : ''}`}
          onClick={() => onChange(p)}
          aria-current={p === meta.page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <button type="button" className="btn btn--sm" onClick={() => onChange(meta.page + 1)} disabled={meta.page >= meta.pages}>
        Next
      </button>
      <span className="muted" style={{ marginLeft: '.5rem' }}>{meta.total} total</span>
    </div>
  );
}

/** Keeps a search box from firing a request on every keystroke. */
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
