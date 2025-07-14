import React, { useEffect, useState, useCallback } from 'react';
import { ArticleComment } from '../../lib/commentApi';

interface CommentHighlightProps {
  comments: ArticleComment[];
  editorRef: React.RefObject<HTMLElement>;
  onCommentClick: (comment: ArticleComment) => void;
  highlightedCommentId?: string | null;
}

interface HighlightRange {
  start: number;
  end: number;
  comment: ArticleComment;
}

export const CommentHighlight: React.FC<CommentHighlightProps> = ({
  comments,
  editorRef,
  onCommentClick,
  highlightedCommentId
}) => {
  const [highlightRanges, setHighlightRanges] = useState<HighlightRange[]>([]);

  // Get color based on comment status - Google Docs style with yellow highlighting
  const getCommentColor = (comment: ArticleComment, isHighlighted: boolean = false): string => {
    if (isHighlighted) {
      // Darker yellow when comment is selected/highlighted
      switch (comment.status) {
        case 'resolved': return 'rgba(251, 191, 36, 0.5)'; // darker yellow-orange for resolved
        case 'archived': return 'rgba(161, 161, 170, 0.4)'; // gray for archived
        default: return 'rgba(254, 240, 138, 0.7)'; // darker yellow for active
      }
    }

    // Light yellow for all commented text by default
    switch (comment.status) {
      case 'resolved': return 'rgba(251, 191, 36, 0.25)'; // light yellow-orange for resolved
      case 'archived': return 'rgba(161, 161, 170, 0.15)'; // light gray for archived
      default: return 'rgba(254, 240, 138, 0.4)'; // light yellow for active comments
    }
  };

  // Get border color for comment status - yellow theme
  const getBorderColor = (comment: ArticleComment): string => {
    switch (comment.status) {
      case 'resolved': return '#f59e0b'; // yellow-orange border for resolved
      case 'archived': return '#6b7280'; // gray border for archived
      default: return '#eab308'; // yellow border for active comments
    }
  };

  // Create highlight ranges from comments
  const createHighlightRanges = useCallback(() => {
    const ranges: HighlightRange[] = [];
    
    comments.forEach(comment => {
      if (typeof comment.selection_start === 'number' && typeof comment.selection_end === 'number') {
        ranges.push({
          start: comment.selection_start,
          end: comment.selection_end,
          comment
        });
      }
    });

    // Sort ranges by start position to handle overlaps properly
    ranges.sort((a, b) => a.start - b.start);
    setHighlightRanges(ranges);
  }, [comments]);

  // Apply highlights to the editor content
  const applyHighlights = useCallback(() => {
    if (!editorRef.current || highlightRanges.length === 0) {
      return;
    }

    const editor = editorRef.current;
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    // Calculate absolute text positions
    let currentOffset = 0;
    const nodeOffsets: { node: Text; start: number; end: number }[] = [];
    
    textNodes.forEach(textNode => {
      const nodeStart = currentOffset;
      const nodeEnd = currentOffset + textNode.textContent!.length;
      nodeOffsets.push({ node: textNode, start: nodeStart, end: nodeEnd });
      currentOffset = nodeEnd;
    });

    // Remove existing highlights
    editor.querySelectorAll('.comment-highlight').forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });

    // Apply new highlights
    highlightRanges.forEach(range => {
      const isHighlighted = highlightedCommentId === range.comment.id;
      
      nodeOffsets.forEach(({ node, start, end }) => {
        // Check if this text node intersects with the comment range
        if (start < range.end && end > range.start) {
          const highlightStart = Math.max(0, range.start - start);
          const highlightEnd = Math.min(node.textContent!.length, range.end - start);
          
          if (highlightStart < highlightEnd) {
            // Split the text node and wrap the highlighted part
            const beforeText = node.textContent!.substring(0, highlightStart);
            const highlightText = node.textContent!.substring(highlightStart, highlightEnd);
            const afterText = node.textContent!.substring(highlightEnd);
            
            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'comment-highlight';
            highlightSpan.style.backgroundColor = getCommentColor(range.comment, isHighlighted);
            highlightSpan.style.borderBottom = `2px solid ${getBorderColor(range.comment)}`;
            highlightSpan.style.cursor = 'pointer';
            highlightSpan.style.borderRadius = '2px';
            highlightSpan.style.padding = '1px 2px';
            highlightSpan.style.margin = '0 1px';
            highlightSpan.style.transition = 'background-color 0.2s ease, border-color 0.2s ease';
            highlightSpan.textContent = highlightText;
            highlightSpan.title = `Comment by ${range.comment.user?.name || 'Unknown'}: ${range.comment.content.substring(0, 100)}${range.comment.content.length > 100 ? '...' : ''}`;
            
            // Add click handler
            highlightSpan.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              onCommentClick(range.comment);
            };

            // Add hover effects
            highlightSpan.onmouseenter = () => {
              highlightSpan.style.backgroundColor = getCommentColor(range.comment, true);
            };
            
            highlightSpan.onmouseleave = () => {
              if (highlightedCommentId !== range.comment.id) {
                highlightSpan.style.backgroundColor = getCommentColor(range.comment, false);
              }
            };

            // Add reply count indicator if there are replies
            if (range.comment.replies && range.comment.replies.length > 0) {
              const replyIndicator = document.createElement('sup');
              replyIndicator.style.color = getBorderColor(range.comment);
              replyIndicator.style.fontSize = '10px';
              replyIndicator.style.fontWeight = 'bold';
              replyIndicator.style.marginLeft = '2px';
              replyIndicator.textContent = `${range.comment.replies.length}`;
              highlightSpan.appendChild(replyIndicator);
            }
            
            // Replace the text node with the highlighted structure
            const parent = node.parentNode;
            if (parent) {
              if (beforeText) {
                parent.insertBefore(document.createTextNode(beforeText), node);
              }
              parent.insertBefore(highlightSpan, node);
              if (afterText) {
                parent.insertBefore(document.createTextNode(afterText), node);
              }
              parent.removeChild(node);
            }
          }
        }
      });
    });
  }, [highlightRanges, highlightedCommentId, onCommentClick, editorRef]);

  // Update highlights when comments or highlighted comment changes
  useEffect(() => {
    createHighlightRanges();
  }, [createHighlightRanges]);

  useEffect(() => {
    applyHighlights();
  }, [applyHighlights]);

  // Clean up highlights on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.querySelectorAll('.comment-highlight').forEach(highlight => {
          const parent = highlight.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
            parent.normalize();
          }
        });
      }
    };
  }, [editorRef]);

  // This component doesn't render anything directly - it manipulates the DOM
  return null;
}; 