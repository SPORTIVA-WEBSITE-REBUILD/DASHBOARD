import { Node, mergeAttributes } from '@tiptap/core';

/**
 * An inline footnote. The source text lives in the `data-fn` attribute of an
 * empty <sup>, so the article body stays plain HTML. The public site numbers
 * the markers in reading order and collects the sources into a "Notes" list at
 * the foot of the article; here in the editor CSS counters number them, so the
 * writer sees the same numbers.
 */
const Footnote = Node.create({
  name: 'footnote',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-fn') || '',
        renderHTML: (attrs) => ({ 'data-fn': attrs.text }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-fn]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes, { class: 'fn' })];
  },

  addCommands() {
    return {
      insertFootnote: (text) => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: { text },
      }),
    };
  },
});

export default Footnote;
