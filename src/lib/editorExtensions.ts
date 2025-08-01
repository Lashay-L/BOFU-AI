import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

// Core extensions - always loaded
import { ImageWithResize } from '../extensions/ImageExtension';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';

// Lazy-loaded extensions interfaces
interface LazyExtensions {
  Highlight?: any;
  Typography?: any;
  Table?: any;
  TableRow?: any;
  TableCell?: any;
  TableHeader?: any;
  CommentHighlightExtension?: any;
  InlineCommentingExtension?: any;
}

/**
 * Editor Extensions Factory
 * 
 * Optimizations:
 * 1. Core extensions load immediately (essential for basic editing)
 * 2. Advanced extensions lazy load when needed
 * 3. Memoized configuration to prevent recreation
 * 4. Conditional loading based on features used
 */
export class EditorExtensionsFactory {
  private static lazyExtensions: LazyExtensions = {};
  private static isLoadingExtensions = false;

  /**
   * Get core extensions that are always needed
   */
  static getCoreExtensions() {
    return [
      StarterKit.configure({
        history: {
          depth: 100,
          newGroupDelay: 500,
        },
        // Disable extensions we'll add individually to avoid duplicates
        strike: false,
        horizontalRule: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        paragraph: {
          HTMLAttributes: {
            class: 'text-base leading-relaxed',
          },
        },
      }),
      
      // Essential formatting
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      
      // Essential elements
      ImageWithResize.configure({
        inline: true,
        allowBase64: true,
        allowResize: true,
      }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
        autolink: true,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline cursor-pointer',
        },
      }),
      
      // List handling
      ListItem.configure({
        HTMLAttributes: {
          style: 'margin: 0.25rem 0; display: list-item;',
        },
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc list-inside ml-4',
          style: 'margin: 1rem 0;',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal list-inside ml-4',
          style: 'margin: 1rem 0;',
        },
      }),
    ];
  }

  /**
   * Lazy load advanced extensions
   */
  static async loadAdvancedExtensions(): Promise<LazyExtensions> {
    if (this.isLoadingExtensions) {
      // Wait for current loading to complete
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (!this.isLoadingExtensions) {
            resolve(this.lazyExtensions);
          } else {
            setTimeout(checkLoaded, 10);
          }
        };
        checkLoaded();
      });
    }

    if (Object.keys(this.lazyExtensions).length > 0) {
      return this.lazyExtensions;
    }

    this.isLoadingExtensions = true;

    try {
      // Load extensions in parallel
      const [
        Highlight,
        Typography,
        Table,
        TableRow,
        TableCell,
        TableHeader,
        CommentHighlightExtension,
        InlineCommentingExtension,
      ] = await Promise.all([
        import('@tiptap/extension-highlight'),
        import('@tiptap/extension-typography'),
        import('@tiptap/extension-table'),
        import('@tiptap/extension-table-row'),
        import('@tiptap/extension-table-cell'),
        import('@tiptap/extension-table-header'),
        import('../extensions/CommentHighlightExtension'),
        import('../components/ui/InlineCommentingExtension'),
      ]);

      this.lazyExtensions = {
        Highlight: Highlight.default,
        Typography: Typography.default,
        Table: Table.default,
        TableRow: TableRow.default,
        TableCell: TableCell.default,
        TableHeader: TableHeader.default,
        CommentHighlightExtension: CommentHighlightExtension.CommentHighlightExtension,
        InlineCommentingExtension: InlineCommentingExtension.InlineCommentingExtension,
      };

      console.log('🚀 Advanced editor extensions loaded successfully');
      return this.lazyExtensions;
    } catch (error) {
      console.error('❌ Failed to load advanced editor extensions:', error);
      return {};
    } finally {
      this.isLoadingExtensions = false;
    }
  }

  /**
   * Get full editor extensions (core + advanced)
   */
  static async getFullExtensions(options: {
    enableComments?: boolean;
    enableTables?: boolean;
    enableAdvancedFormatting?: boolean;
  } = {}) {
    const {
      enableComments = true,
      enableTables = true,
      enableAdvancedFormatting = true,
    } = options;

    const coreExtensions = this.getCoreExtensions();

    if (!enableAdvancedFormatting && !enableComments && !enableTables) {
      return coreExtensions;
    }

    const lazyExtensions = await this.loadAdvancedExtensions();
    const advancedExtensions: Extension[] = [];

    if (enableAdvancedFormatting) {
      if (lazyExtensions.Highlight) {
        advancedExtensions.push(
          lazyExtensions.Highlight.configure({
            multicolor: true,
            HTMLAttributes: {
              class: 'highlight',
            },
          })
        );
      }
      
      if (lazyExtensions.Typography) {
        advancedExtensions.push(lazyExtensions.Typography);
      }
    }

    if (enableTables && lazyExtensions.Table) {
      advancedExtensions.push(
        lazyExtensions.Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: 'border-collapse border border-gray-300 w-full my-4',
          },
        }),
        lazyExtensions.TableRow.configure({
          HTMLAttributes: {
            class: 'border border-gray-300',
          },
        }),
        lazyExtensions.TableHeader.configure({
          HTMLAttributes: {
            class: 'border border-gray-300 bg-gray-50 font-semibold p-2 text-left',
          },
        }),
        lazyExtensions.TableCell.configure({
          HTMLAttributes: {
            class: 'border border-gray-300 p-2',
          },
        })
      );
    }

    if (enableComments) {
      if (lazyExtensions.CommentHighlightExtension) {
        advancedExtensions.push(
          lazyExtensions.CommentHighlightExtension.configure({
            comments: [],
            highlightedCommentId: null,
            onCommentClick: () => {},
          })
        );
      }
      
      if (lazyExtensions.InlineCommentingExtension) {
        advancedExtensions.push(lazyExtensions.InlineCommentingExtension);
      }
    }

    return [...coreExtensions, ...advancedExtensions];
  }

  /**
   * Preload advanced extensions in the background
   */
  static preloadAdvancedExtensions() {
    // Load in the background without blocking
    setTimeout(() => {
      this.loadAdvancedExtensions().catch((error) => {
        console.warn('Background preload of advanced extensions failed:', error);
      });
    }, 1000); // Delay to not interfere with initial page load
  }
}