import { useRef, useState } from 'react';

/**
 * A password field with a show/hide toggle.
 *
 * Typing a long passphrase blind is the main reason people pick a short one, so
 * being able to check what was typed is a security feature rather than a
 * convenience. It always starts hidden, so a password is never exposed by
 * default on a shared screen.
 */
function EyeIcon({ off }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {off ? (
        <>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.15 18.15 0 0 0 1 12s4 8 11 8a9 9 0 0 0 5.39-1.61" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export default function PasswordInput({ id, value, onChange, ...props }) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);

  function toggle() {
    setVisible((v) => !v);
    // Put the caret back where it was: losing your place mid-passphrase is
    // exactly the annoyance this is meant to remove.
    const input = inputRef.current;
    if (!input) return;
    const { selectionStart, selectionEnd } = input;
    requestAnimationFrame(() => {
      input.focus();
      try {
        input.setSelectionRange(selectionStart, selectionEnd);
      } catch {
        // Some browsers refuse setSelectionRange on a password input; the
        // focus alone is still the useful part.
      }
    });
  }

  return (
    <span className="password-field">
      <input
        {...props}
        ref={inputRef}
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        className="password-field__toggle"
        onClick={toggle}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={id}
        tabIndex={-1}
        title={visible ? 'Hide password' : 'Show password'}
      >
        <EyeIcon off={visible} />
      </button>
    </span>
  );
}
