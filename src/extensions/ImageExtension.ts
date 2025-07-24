import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { NodeSelection } from '@tiptap/pm/state';

export interface ImageOptions {
  allowBase64: boolean;
  HTMLAttributes: Record<string, string | number | boolean>;
  inline: boolean;
  allowResize: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageWithResize: {
      setImage: (options: { src: string; alt?: string; title?: string; width?: number; height?: number; caption?: string }) => ReturnType;
    };
  }
}

const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

// Helper functions for image manipulation
const handleImageResize = (editor: any, pos: number, event: MouseEvent) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const target = event.target as HTMLElement;
  const direction = target.getAttribute('data-direction');
  const node = editor.state.doc.nodeAt(pos);
  
  if (!node || !direction) return;

  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = node.attrs.width || 300;
  const startHeight = node.attrs.height || 200;

  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    let newWidth = startWidth;
    let newHeight = startHeight;
    
    // Calculate new dimensions based on resize direction
    switch (direction) {
      case 'se':
        newWidth = Math.max(100, startWidth + deltaX);
        newHeight = Math.max(75, startHeight + deltaY);
        break;
      case 'sw':
        newWidth = Math.max(100, startWidth - deltaX);
        newHeight = Math.max(75, startHeight + deltaY);
        break;
      case 'ne':
        newWidth = Math.max(100, startWidth + deltaX);
        newHeight = Math.max(75, startHeight - deltaY);
        break;
      case 'nw':
        newWidth = Math.max(100, startWidth - deltaX);
        newHeight = Math.max(75, startHeight - deltaY);
        break;
    }

    // Maintain aspect ratio by default (can be made optional)
    const aspectRatio = startWidth / startHeight;
    newHeight = newWidth / aspectRatio;

    // Update the node attributes
    editor.chain().focus().updateAttributes('imageWithResize', {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    }).run();
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.body.style.cursor = `${direction}-resize`;
};

const editImageCaption = (editor: any, pos: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;

  const currentCaption = node.attrs.caption || '';
  const newCaption = window.prompt('Enter image caption:', currentCaption);
  
  if (newCaption !== null) {
    editor.chain().focus().updateAttributes('imageWithResize', {
      caption: newCaption,
    }).run();
  }
};

const deleteImage = (editor: any, pos: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (window.confirm('Delete this image?')) {
    editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
  }
};

export const ImageWithResize = Node.create<ImageOptions>({
  name: 'imageWithResize',

  addOptions() {
    return {
      allowBase64: false,
      HTMLAttributes: {},
      inline: false,
      allowResize: true,
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      caption: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: dom => {
          const element = dom as HTMLElement;
          return {
            src: element.getAttribute('src'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
            width: element.getAttribute('width') ? parseInt(element.getAttribute('width')!) : null,
            height: element.getAttribute('height') ? parseInt(element.getAttribute('height')!) : null,
            caption: element.getAttribute('data-caption'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { caption, ...imageAttrs } = HTMLAttributes;
    
    if (caption) {
      return [
        'figure',
        { class: 'image-figure' },
        ['img', mergeAttributes(this.options.HTMLAttributes, imageAttrs)],
        ['figcaption', { class: 'image-caption' }, caption],
      ];
    }

    return ['img', mergeAttributes(this.options.HTMLAttributes, imageAttrs)];
  },

  addCommands() {
    return {
      setImage:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: match => {
          const [, , alt, src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    if (!this.options.allowResize) {
      return [];
    }

    return [
      new Plugin({
        key: new PluginKey('imageSelection'),
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement;
              
              // Handle image clicks for selection
              if (target.tagName === 'IMG' && target.closest('.ProseMirror')) {
                const pos = view.posAtDOM(target, 0);
                if (pos !== null) {
                  const node = view.state.doc.nodeAt(pos);
                  if (node && node.type.name === this.name) {
                    // Create a NodeSelection for the image
                    const selection = NodeSelection.create(view.state.doc, pos);
                    const transaction = view.state.tr.setSelection(selection);
                    view.dispatch(transaction);
                    
                    // Dispatch custom event for ArticleEditor to handle
                    const customEvent = new CustomEvent('imageSelected', {
                      detail: {
                        imageElement: target,
                        node: node,
                        pos: pos,
                      }
                    });
                    console.log('🖼️ ImageExtension: Dispatching imageSelected event', { target, node, pos });
                    // Dispatch on the editor DOM instead of the image element
                    view.dom.dispatchEvent(customEvent);
                    
                    return true;
                  }
                }
              }
              
              return false;
            },
          },
        },
      }),
    ];
  },
}); 