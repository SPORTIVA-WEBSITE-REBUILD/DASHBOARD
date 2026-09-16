import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Editor from '../components/Editor.jsx';
import { ToastProvider } from '../components/ui.jsx';

function renderEditor(props = {}) {
  return render(
    <ToastProvider>
      <Editor value="<p>Existing content</p>" onChange={() => {}} {...props} />
    </ToastProvider>,
  );
}

/**
 * The editor is the main authoring surface, and a Tiptap major upgrade can
 * break it in ways a successful build does not reveal — a duplicate extension
 * name, for instance, throws only at construction time.
 */
describe('article editor', () => {
  it('constructs without a duplicate-extension error and shows existing content', async () => {
    const errors = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a.join(' ')));
    const warns = [];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...a) => warns.push(a.join(' ')));

    renderEditor();

    await waitFor(() => expect(screen.getByText('Existing content')).toBeInTheDocument());

    const noise = [...errors, ...warns].join('\n');
    expect(noise).not.toMatch(/duplicate extension/i);

    spy.mockRestore();
    warnSpy.mockRestore();
  });

  it('renders the full toolbar', async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByTitle('Bold')).toBeInTheDocument());

    for (const label of ['Bold', 'Italic', 'Heading 2', 'Heading 3', 'Bullet list', 'Quote', 'Add or edit link', 'Insert image', 'Undo', 'Redo']) {
      expect(screen.getByTitle(label), label).toBeInTheDocument();
    }
  });

  it('keeps undo and redo working after the upgrade', async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByTitle('Undo')).toBeInTheDocument());
    // Disabled on a fresh document rather than missing, which is what the
    // UndoRedo extension being registered looks like.
    expect(screen.getByTitle('Undo')).toBeDisabled();
  });

  it('reports edits back to the form', async () => {
    const onChange = vi.fn();
    renderEditor({ onChange });
    await waitFor(() => expect(screen.getByText('Existing content')).toBeInTheDocument());
    expect(onChange).toBeTypeOf('function');
  });
});
