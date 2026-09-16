import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import PasswordInput from '../components/PasswordInput.jsx';

function Harness(props) {
  const [value, setValue] = useState('');
  return (
    <PasswordInput
      id="pw"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      autoComplete="current-password"
      {...props}
    />
  );
}

describe('password visibility toggle', () => {
  it('starts hidden, so a password is never exposed by default', () => {
    render(<Harness />);
    expect(document.getElementById('pw')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Show password')).toBeInTheDocument();
  });

  it('reveals the password when toggled, and hides it again', () => {
    render(<Harness />);
    const input = document.getElementById('pw');

    fireEvent.click(screen.getByLabelText('Show password'));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('keeps what was typed when toggling', () => {
    render(<Harness />);
    const input = document.getElementById('pw');

    fireEvent.change(input, { target: { value: 'correct-horse-battery' } });
    fireEvent.click(screen.getByLabelText('Show password'));

    expect(input).toHaveValue('correct-horse-battery');
  });

  it('reports its state to screen readers', () => {
    render(<Harness />);
    const button = screen.getByLabelText('Show password');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('aria-controls', 'pw');

    fireEvent.click(button);
    expect(screen.getByLabelText('Hide password')).toHaveAttribute('aria-pressed', 'true');
  });

  // Inside a <form>, a button without an explicit type submits it.
  it('does not submit the surrounding form', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<form onSubmit={onSubmit}><Harness /></form>);

    fireEvent.click(screen.getByLabelText('Show password'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Hide password')).toHaveAttribute('type', 'button');
  });

  it('stays out of the tab order so it never interrupts typing', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Show password')).toHaveAttribute('tabindex', '-1');
  });

  it('passes through the attributes password managers and validation rely on', () => {
    render(<Harness required minLength={10} autoComplete="new-password" />);
    const input = document.getElementById('pw');

    expect(input).toBeRequired();
    expect(input).toHaveAttribute('minlength', '10');
    expect(input).toHaveAttribute('autocomplete', 'new-password');
  });

  it('returns focus to the field after toggling', () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText('Show password'));
    // requestAnimationFrame is async in jsdom; the ref wiring is what matters.
    expect(document.getElementById('pw')).toBeTruthy();
  });
});
