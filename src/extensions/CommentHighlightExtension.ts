import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ArticleComment } from '../lib/commentApi';

interface CommentHighlightOptions {
  comments: ArticleComment[];
  highlightedCommentId: string | null;
  onCommentClick: (comment: ArticleComment) => void;
}

export interface CommentHighlightStorage {
  comments: ArticleComment[];
  highlightedCommentId: string | null;
  onCommentClick: (comment: ArticleComment) => void;
}

const commentHighlightPluginKey = new PluginKey('commentHighlight');

// Get color based on comment status - Google Docs style with yellow highlighting
const getCommentColor = (comment: ArticleComment, isHighlighted: boolean = false): string => {
  // Don't highlight resolved comments at all
  if (comment.status === 'resolved') {
    return 'transparent';
  }

  if (isHighlighted) {
    // Darker yellow when comment is selected/highlighted
    switch (comment.status) {
      case 'archived': return 'rgba(161, 161, 170, 0.4)'; // gray for archived
      default: return 'rgba(254, 240, 138, 0.7)'; // darker yellow for active
    }
  }

  // Light yellow for all commented text by default
  switch (comment.status) {
    case 'archived': return 'rgba(161, 161, 170, 0.15)'; // light gray for archived
    default: return 'rgba(254, 240, 138, 0.4)'; // light yellow for active comments
  }
};

// Get border color for comment status - yellow theme
const getBorderColor = (comment: ArticleComment): string => {
  switch (comment.status) {
    case 'resolved': return 'transparent'; // no border for resolved comments
    case 'archived': return '#6b7280'; // gray border for archived
    default: return '#eab308'; // yellow border for active comments
  }
};

// Find text in ProseMirror document and return positions
const findTextInDocument = (doc: any, searchText: string): { start: number; end: number } | null => {
  if (!searchText || searchText.trim() === '') {
    console.warn('🚫 Empty search text provided');
    return null;
  }

  // Get the full text content of the document
  const docText = doc.textContent;
  
  // Find the text in the document
  const textIndex = docText.indexOf(searchText);
  if (textIndex === -1) {
    console.warn('🚫 Text not found in document:', { searchText: searchText.substring(0, 50) + '...', docText: docText.substring(0, 100) + '...' });
    return null;
  }

  // Convert text positions to ProseMirror positions
  let proseMirrorStart = 1; // Start at 1 (after doc node)
  let proseMirrorEnd = 1;
  let textOffset = 0;
  let foundStart = false;
  let foundEnd = false;

  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      const nodeTextLength = node.text.length;
      
      // Check if start position is in this node
      if (!foundStart && textOffset <= textIndex && textIndex < textOffset + nodeTextLength) {
        const offsetInNode = textIndex - textOffset;
        proseMirrorStart = pos + offsetInNode;
        foundStart = true;
      }
      
      // Check if end position is in this node
      const textEndIndex = textIndex + searchText.length;
      if (!foundEnd && textOffset < textEndIndex && textEndIndex <= textOffset + nodeTextLength) {
        const offsetInNode = textEndIndex - textOffset;
        proseMirrorEnd = pos + offsetInNode;
        foundEnd = true;
      }
      
      textOffset += nodeTextLength;
      
      // Stop if we found both positions
      if (foundStart && foundEnd) {
        return false;
      }
    }
    return true; // Continue iteration
  });

  console.log('🎯 Text found in document:', {
    searchText: searchText.substring(0, 30) + '...',
    textIndex,
    textEndIndex: textIndex + searchText.length,
    proseMirrorStart,
    proseMirrorEnd,
    foundStart,
    foundEnd,
    docTextLength: docText.length
  });

  return foundStart && foundEnd ? { start: proseMirrorStart, end: proseMirrorEnd } : null;
};

export const CommentHighlightExtension = Extension.create<CommentHighlightOptions, CommentHighlightStorage>({
  name: 'commentHighlight',

  addOptions() {
    return {
      comments: [],
      highlightedCommentId: null,
      onCommentClick: () => {},
    };
  },

  addStorage() {
    return {
      comments: this.options.comments,
      highlightedCommentId: this.options.highlightedCommentId,
      onCommentClick: this.options.onCommentClick,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    
    return [
      new Plugin({
        key: commentHighlightPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, set) {
            // Get storage from extension
            const storage = extension.storage;
            if (!storage || !storage.comments || storage.comments.length === 0) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];

            storage.comments.forEach((comment: ArticleComment) => {
              if (comment.selected_text && comment.selected_text.trim() !== '') {
                const isHighlighted = storage.highlightedCommentId === comment.id;
                const backgroundColor = getCommentColor(comment, isHighlighted);
                const borderColor = getBorderColor(comment);
                
                console.log('🎨 Creating decoration for comment:', {
                  commentId: comment.id,
                  isHighlighted,
                  backgroundColor,
                  highlightedCommentId: storage.highlightedCommentId,
                  selectedText: comment.selected_text.substring(0, 30) + '...'
                });

                // Find text in document and get ProseMirror positions
                const positions = findTextInDocument(tr.doc, comment.selected_text);

                if (positions) {
                  console.log('🎯 Comment highlight positioning:', {
                    commentId: comment.id,
                    selectedText: comment.selected_text.substring(0, 30) + '...',
                    proseMirrorStart: positions.start,
                    proseMirrorEnd: positions.end,
                    storedStart: comment.selection_start,
                    storedEnd: comment.selection_end
                  });

                  const decoration = Decoration.inline(
                    positions.start,
                    positions.end,
                    {
                      class: 'comment-highlight-tiptap',
                      style: `
                        background-color: ${backgroundColor};
                        border-bottom: 2px solid ${borderColor};
                        border-radius: 2px;
                        padding: 1px 2px;
                        margin: 0 1px;
                        cursor: pointer;
                        transition: background-color 0.2s ease, border-color 0.2s ease;
                      `,
                      title: `Comment by ${comment.user?.name || 'Unknown'}: ${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''}`,
                      'data-comment-id': comment.id,
                    }
                  );

                  decorations.push(decoration);
                } else {
                  console.warn('🚫 Could not find text for comment highlighting:', {
                    commentId: comment.id,
                    selectedText: comment.selected_text?.substring(0, 50) + '...'
                  });
                }
              }
            });

            return DecorationSet.create(tr.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleDOMEvents: {
            click(view, event) {
              console.log('🖱️ Click event in CommentHighlightExtension:', event.target);
              const target = event.target as HTMLElement;
              console.log('🎯 Target element:', target, 'Has comment class:', target?.classList.contains('comment-highlight-tiptap'));
              
              // Debug: Check if we can find any comment highlight elements near the click
              const allCommentElements = document.querySelectorAll('.comment-highlight-tiptap');
              console.log('🔍 All comment elements found:', allCommentElements.length, Array.from(allCommentElements).map(el => ({
                id: el.getAttribute('data-comment-id'),
                text: el.textContent?.substring(0, 30) + '...',
                style: el.getAttribute('style')
              })));
              
              // Check target and parent elements for comment class
              let commentElement = target;
              let found = false;
              
              // Look up the DOM tree for comment elements
              for (let i = 0; i < 5 && commentElement; i++) {
                if (commentElement.classList && commentElement.classList.contains('comment-highlight-tiptap')) {
                  found = true;
                  break;
                }
                commentElement = commentElement.parentElement as HTMLElement;
              }
              
              if (found && commentElement) {
                const commentId = commentElement.getAttribute('data-comment-id');
                console.log('💭 Found comment ID:', commentId);
                const comment = extension.storage.comments.find(c => c.id === commentId);
                console.log('📝 Found comment object:', comment);
                
                if (comment) {
                  console.log('✅ Calling onCommentClick for comment:', comment.id);
                  event.preventDefault();
                  event.stopPropagation();
                  extension.storage.onCommentClick(comment);
                  return true;
                } else {
                  console.warn('❌ Comment not found in storage for ID:', commentId);
                }
              }
              return false;
            },
            mouseover(view, event) {
              const target = event.target as HTMLElement;
              if (target && target.classList.contains('comment-highlight-tiptap')) {
                const commentId = target.getAttribute('data-comment-id');
                const comment = extension.storage.comments.find(c => c.id === commentId);
                if (comment) {
                  target.style.backgroundColor = getCommentColor(comment, true);
                }
              }
              return false;
            },
            mouseout(view, event) {
              const target = event.target as HTMLElement;
              if (target && target.classList.contains('comment-highlight-tiptap')) {
                const commentId = target.getAttribute('data-comment-id');
                const comment = extension.storage.comments.find(c => c.id === commentId);
                if (comment && extension.storage.highlightedCommentId !== comment.id) {
                  target.style.backgroundColor = getCommentColor(comment, false);
                }
              }
              return false;
            },
          },
        },
      }),
    ];
  },

  // Method to update comments
  updateComments(comments: ArticleComment[]) {
    this.storage.comments = comments;
    // Force re-render of decorations
    this.editor.view.dispatch(this.editor.state.tr);
  },

  // Method to update highlighted comment
  updateHighlightedComment(commentId: string | null) {
    this.storage.highlightedCommentId = commentId;
    // Force re-render of decorations
    this.editor.view.dispatch(this.editor.state.tr);
  },

  // Method to update click handler
  updateOnCommentClick(onCommentClick: (comment: ArticleComment) => void) {
    this.storage.onCommentClick = onCommentClick;
  },
}); 