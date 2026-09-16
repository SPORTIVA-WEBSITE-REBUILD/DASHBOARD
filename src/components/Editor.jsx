import { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Modal } from './ui.jsx';
import { MediaLibrary } from './MediaPicker.jsx';
import { preview } from '../lib/upload.js';

/**
 * Rich text, not raw HTML or Markdown: the firm's staff are lawyers, and the
 * proposal commits to them publishing unaided after a week of coaching.
 *
 * Safety does not depend on this component. The backend sanitises every rich
 * text field on write against a strict allowlist, so whatever an editor (or a
 * compromised browser extension) produces is filtered server-side before it is
 * ever stored or served.
 */
function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      className={active ? 'is-active' : undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active || undefined}
    >
      {children}
    </button>
  );
}

export default function Editor({ value, onChange, placeholder = 'Write here…' }) {
  const [mediaOpen, setMediaOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      // StarterKit v3 already bundles the link extension, so it is configured
      // here rather than added again — registering it twice is a duplicate
      // extension name and Tiptap refuses to start.
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        // The public site owns typography; a code block would not be styled.
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          // Schemes are restricted here and again by the backend sanitiser.
          protocols: ['http', 'https', 'mailto', 'tel'],
          HTMLAttributes: { rel: 'noopener noreferrer' },
        },
      }),
      // Not part of StarterKit; base64 is refused so images always go through
      // the media library and end up on the CDN.
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value || '',
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: { class: 'editor__content', 'aria-label': placeholder },
    },
  }, []);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    // eslint-disable-next-line no-alert
    const url = window.prompt('Link URL', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return <div className="editor"><div className="editor__content muted">Loading editor…</div></div>;

  return (
    <div className="editor">
      <div className="editor__toolbar">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><strong>B</strong></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><em>I</em></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><s>S</s></ToolbarButton>

        <span className="muted" style={{ padding: '0 .25rem' }}>|</span>

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">H3</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph">¶</ToolbarButton>

        <span className="muted" style={{ padding: '0 .25rem' }}>|</span>

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">• List</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">1. List</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">❝</ToolbarButton>

        <span className="muted" style={{ padding: '0 .25rem' }}>|</span>

        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Add or edit link">Link</ToolbarButton>
        <ToolbarButton onClick={() => setMediaOpen(true)} title="Insert image">Image</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">—</ToolbarButton>

        <span className="muted" style={{ padding: '0 .25rem' }}>|</span>

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">↶</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">↷</ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <Modal open={mediaOpen} title="Insert an image" onClose={() => setMediaOpen(false)} wide>
        <MediaLibrary
          onSelect={(media) => {
            editor.chain().focus().setImage({ src: preview(media, 1200), alt: media.alt || '' }).run();
            setMediaOpen(false);
          }}
        />
        <div className="modal__actions">
          <button type="button" className="btn" onClick={() => setMediaOpen(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
