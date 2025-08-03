import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { EditorExtensionsFactory } from '../lib/editorExtensions';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { MediaLibrarySelector } from './ui/MediaLibrarySelector';
import { LinkTooltip } from './ui/LinkTooltip';
import { CommentingSystem, ArticleComment } from './ui/CommentingSystem';
import { InlineCommentingExtension } from './ui/InlineCommentingExtension';
import { CommentHighlightExtension } from '../extensions/CommentHighlightExtension';
import { LinkEditor } from './ui/LinkEditor';
import { EditorToolbar, EditorStatusBar, ImageHandler, type SelectedImage } from './ui/editor';
import { getTextNodeAtOffset, getTextOffset } from '../lib/textUtils';
import type { ArticleContent } from '../lib/unifiedArticleApi';
import { adminArticlesApi } from '../lib/adminApi';
import { getArticleComments, subscribeToComments } from '../lib/commentApi';
import { debounce } from 'lodash';
import { supabase } from '../lib/supabase';
import { realtimeCollaboration } from '../lib/realtimeCollaboration';
import { useLayout } from '../contexts/LayoutContext';
import { useUserCompany } from '../contexts/ProfileContext';

// Import enhanced CSS styles
import '../styles/article-editor-enhanced.css';
import '../styles/image-editor.css';

// Define UserProfile interface
interface UserProfile {
  id: string;
  email: string;
  company_name?: string;
  role?: string;
  avatar_url?: string;
  status?: 'viewing' | 'editing' | 'idle';
}







interface ArticleEditorProps {
  articleId?: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  onAutoSave?: (content: string) => void;
  onContentChange?: (content: string) => void;
  className?: string;
  // Admin-specific props
  adminMode?: boolean;
  adminUser?: UserProfile | null;
  originalAuthor?: UserProfile | null;
  onStatusChange?: (status: 'draft' | 'editing' | 'review' | 'final' | 'published') => void;
  onOwnershipTransfer?: (newOwnerId: string) => void;
  onAdminNote?: (note: string) => void;
  isAiCopilotOpen?: boolean;
  onBack?: () => void;
  // Real-time collaboration props
  externalContent?: string;
  forceContentUpdate?: boolean;
}

type ViewMode = 'editor' | 'preview' | 'split';
type FocusMode = 'normal' | 'focused' | 'zen';




const ArticleEditorComponent: React.FC<ArticleEditorProps> = ({
  articleId,
  initialContent = '',
  onSave,
  onAutoSave,
  onContentChange,
  className = '',
  // Admin-specific props
  adminMode = false,
  adminUser,
  originalAuthor,
  onStatusChange: _onStatusChange,
  onOwnershipTransfer: _onOwnershipTransfer,
  onAdminNote: _onAdminNote,
  isAiCopilotOpen = false,
  onBack,
  // Real-time collaboration props
  externalContent,
  forceContentUpdate = false
}) => {
  // Layout context for responsive sidebar handling
  const { layout, setCommentsSidebarVisible } = useLayout();
  
  // Get user company for media library access
  const userCompany = useUserCompany();
  
  // Component lifecycle logging
  useEffect(() => {
    console.log('🚀 [ARTICLE EDITOR] Component mounted/remounted:', {
      articleId: articleId || 'none',
      initialContentLength: initialContent?.length || 0,
      adminMode: !!adminMode,
      timestamp: new Date().toISOString()
    });
    
    return () => {
      console.log('🛑 [ARTICLE EDITOR] Component unmounting:', {
        articleId: articleId || 'none',
        adminMode: !!adminMode,
        timestamp: new Date().toISOString()
      });
    };
  }, []); // Empty deps means this runs only on mount/unmount
  // Enhanced theme management
  
  // UI State with better organization
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [focusMode, setFocusMode] = useState<FocusMode>('normal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showLinkTooltip, setShowLinkTooltip] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [currentHighlightColor, setCurrentHighlightColor] = useState('#fef08a');
  
  // Content and Save State
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Force re-render counter for ensuring UI updates
  const [updateCounter, setUpdateCounter] = useState(0);
  
  // Comments and Collaboration
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [textSelection, setTextSelection] = useState<{ start: number; end: number; text: string; range?: Range } | null>(null);
  const [linkData, setLinkData] = useState<any>(null);
  
  // Real-time Collaboration State
  const [isCollaborationReady, setIsCollaborationReady] = useState(false);
  
  // Image Selection State
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  
  // Word count and stats
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);


  // Update image position on scroll
  useEffect(() => {
    if (!selectedImage) return;

    const updateImagePosition = () => {
      if (selectedImage) {
        const rect = selectedImage.element.getBoundingClientRect();
        
        setSelectedImage(prev => prev ? {
          ...prev,
          position: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          }
        } : null);
      }
    };

    window.addEventListener('scroll', updateImagePosition, { passive: true });
    window.addEventListener('resize', updateImagePosition, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateImagePosition);
      window.removeEventListener('resize', updateImagePosition);
    };
  }, [selectedImage]);

  const [article, setArticle] = useState<ArticleContent | null>(null);
  const mounted = useRef(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [linkTooltip, setLinkTooltip] = useState<{
    show: boolean;
    data: any | null;
    position: { x: number; y: number };
  }>({ show: false, data: null, position: { x: 0, y: 0 } });

  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  
  // Use a ref to access current comments without causing re-renders
  const commentsRef = useRef<ArticleComment[]>([]);
  
  // Update the ref whenever comments change
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  // Sync comments sidebar state with layout context - use useRef to prevent infinite loops
  const previousShowComments = useRef(showComments);
  useEffect(() => {
    if (previousShowComments.current !== showComments) {
      setCommentsSidebarVisible(showComments);
      previousShowComments.current = showComments;
    }
  }, [showComments, setCommentsSidebarVisible]);

  const loadComments = useCallback(async () => {
    if (!articleId) return;
    try {
      const fetchedComments = await getArticleComments(articleId);
      // Ensure comment status types are correct
      const typedComments = fetchedComments.map(comment => ({
        ...comment,
        status: comment.status as "active" | "resolved" | "archived"
      }));
      setComments(typedComments);
    } catch (error) {
      console.error('❌ Error loading comments in ArticleEditor:', error);
    }
  }, [articleId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Real-time subscription for comment updates
  useEffect(() => {
    if (!articleId) return;

    console.log('💬 [ADMIN] Setting up real-time subscription for comments on article:', articleId);
    
    const unsubscribe = subscribeToComments(articleId, (updatedComments) => {
      console.log('💬 [ADMIN] Real-time comment update detected:', updatedComments.length, 'comments');
      
      // Update the comments state
      const typedComments = updatedComments.map(comment => ({
        ...comment,
        status: comment.status as "active" | "resolved" | "archived"
      }));
      setComments(typedComments);
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('💬 [ADMIN] Cleaning up real-time subscription for comments');
      unsubscribe();
    };
  }, [articleId]);

  // Text selection tracking for inline comments
  useEffect(() => {
    if (!editorRef.current) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setTextSelection(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedTextContent = selection.toString().trim();

      if (!selectedTextContent || selectedTextContent.length < 3) {
        setTextSelection(null);
        return;
      }

      // Check if selection is within the editor
      if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) {
        setTextSelection(null);
        return;
      }

      // Calculate text offsets
      const editorTextContent = editorRef.current.textContent || '';
      const startNode = getTextNodeAtOffset(editorRef.current, 0);
      
      if (startNode) {
        const startOffset = getTextOffset(editorRef.current, range.startContainer, range.startOffset);
        const endOffset = startOffset + selectedTextContent.length;

        setTextSelection({
          start: startOffset,
          end: endOffset,
          text: selectedTextContent,
          range: range.cloneRange()
        });
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editorRef]);

  // Initialize real-time collaboration when articleId is available
  useEffect(() => {
    if (!articleId) return;

    const initializeCollaboration = async () => {
      try {
        // Get current user info for metadata
        const { data: { user } } = await supabase.auth.getUser();
        const userMetadata = {
          name: (adminUser?.email || user?.email || 'unknown').split('@')[0],
          email: adminUser?.email || user?.email || 'unknown',
          avatar_url: user?.user_metadata?.avatar_url || null
        };
        
        // Join the article for real-time collaboration
        await realtimeCollaboration.joinArticle(articleId, userMetadata);
        setIsCollaborationReady(true);
        console.log('✅ Joined real-time collaboration for article:', articleId);
      } catch (error) {
        console.error('Failed to initialize collaboration:', error);
      }
    };

    initializeCollaboration();

    // Cleanup on unmount
    return () => {
      realtimeCollaboration.leaveArticle();
      setIsCollaborationReady(false);
      console.log('👋 Left real-time collaboration');
    };
  }, [articleId, adminUser]);


  // Load article content when articleId is provided
  useEffect(() => {
    let isMounted = true;

    const loadArticleData = async () => {
      if (!articleId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('🔄 Loading article content...', { articleId, adminMode });

        let articleData;

        if (adminMode) {
          // Use admin API to load article
          const result = await adminArticlesApi.getArticle(articleId);
          if (result.error || !result.data) {
            console.error('❌ Error loading article as admin:', result.error);
            setIsLoading(false);
            return;
          }
          articleData = {
            id: result.data.id,
            title: result.data.title,
            content: result.data.article_content,
            editing_status: result.data.editing_status,
            last_edited_at: result.data.last_edited_at,
            last_edited_by: result.data.last_edited_by,
            article_version: result.data.article_version,
            user_id: result.data.user_id,
            product_name: result.data.product_name,
            created_at: result.data.created_at,
            updated_at: result.data.updated_at
          };
        } else {
          console.error('❌ Cannot load article content - no admin API or initial content provided');
          setIsLoading(false);
          return;
        }

        if (isMounted && articleData) {
          console.log('✅ Article loaded successfully:', articleData.id);
          setArticle(articleData);
          
          // Set initial content if not already set
          if (articleData.content && !content) {
            setContent(articleData.content);
            // Note: Editor will be updated in a separate useEffect when editor is ready
          }
        }
      } catch (error) {
        console.error('❌ Error loading article:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadArticleData();

    return () => {
      isMounted = false;
    };
  }, [articleId, adminMode]);

  // Create stable comment click handler with layout context integration
  const handleCommentClick = useCallback((comment) => {
    console.log('🔥 handleCommentClick called with comment:', comment.id);
    console.log('📊 Current state - highlightedCommentId:', highlightedCommentId, 'showComments:', showComments);
    
    // Set the highlighted comment first
    setHighlightedCommentId(comment.id);
    
    // Open the comments sidebar using both methods for compatibility
    setShowComments(true);
    setCommentsSidebarVisible(true);
    
    console.log('✅ Updated state - setting highlightedCommentId to:', comment.id, 'and opening sidebar');
    
    // Scroll to the comment in the sidebar after a brief delay to ensure sidebar is open
    setTimeout(() => {
      scrollToCommentInSidebar(comment.id);
    }, 300);
  }, [setHighlightedCommentId, setShowComments, setCommentsSidebarVisible, highlightedCommentId, showComments]);
  
  // Function to scroll to a specific comment in the sidebar
  const scrollToCommentInSidebar = useCallback((commentId: string) => {
    console.log('📍 Scrolling to comment in sidebar:', commentId);
    
    // Find the comment element in the sidebar
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (commentElement) {
      // Find the closest scrollable container (likely the sidebar content area)
      const scrollContainer = commentElement.closest('.overflow-y-auto') || 
                            commentElement.closest('[class*="scroll"]') ||
                            document.querySelector('.comments-sidebar-container');
      
      if (scrollContainer) {
        console.log('🎯 Found scroll container, scrolling to comment:', commentId);
        
        // Calculate the position relative to the scroll container
        const containerRect = scrollContainer.getBoundingClientRect();
        const commentRect = commentElement.getBoundingClientRect();
        const relativeTop = commentRect.top - containerRect.top + scrollContainer.scrollTop;
        
        // Scroll to the comment with some offset for better visibility
        const scrollTop = Math.max(0, relativeTop - 100);
        
        scrollContainer.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
        
        console.log('✅ Scrolled to comment in sidebar:', { commentId, scrollTop });
      } else {
        // Fallback: use scrollIntoView
        console.log('🔄 Using fallback scrollIntoView for comment:', commentId);
        commentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    } else {
      console.warn('⚠️ Comment element not found in sidebar:', commentId);
    }
  }, []);

  // Enhanced editor-specific click handler for comments
  useEffect(() => {
    if (!editorRef.current) return;

    const editorElement = editorRef.current;
    
    const handleEditorMouseDown = (event: MouseEvent) => {
      console.log('🎯 Editor mousedown detected:', { target: event.target, type: event.type });
      
      const target = event.target as HTMLElement;
      
      // Immediately check if we're clicking on comment highlighted text
      const elementsAtPoint = document.elementsFromPoint(event.clientX, event.clientY);
      console.log('🔍 All elements at click point:', elementsAtPoint.map(el => ({ 
        tag: el.tagName, 
        classes: Array.from(el.classList || []),
        isCommentHighlight: el.classList.contains('comment-highlight-tiptap'),
        commentId: el.getAttribute('data-comment-id')
      })));
      
      // Look for comment highlights in the elements at click point
      for (const element of elementsAtPoint) {
        if (element.classList.contains('comment-highlight-tiptap')) {
          const commentId = element.getAttribute('data-comment-id');
          const comment = comments.find(c => c.id === commentId);
          
          console.log('🎯 Found comment at click point:', { commentId, comment: !!comment, status: comment?.status });
          
          if (comment && comment.status !== 'resolved') {
            console.log('✅ Editor mousedown: Preventing default and calling handleCommentClick');
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            // Call our comment click handler directly
            handleCommentClick(comment);
            return false;
          }
          break;
        }
      }
    };

    // Add mousedown listener to the editor with high priority
    editorElement.addEventListener('mousedown', handleEditorMouseDown, true);
    
    // Also add a click listener as backup
    const handleEditorClick = (event: MouseEvent) => {
      console.log('🎯 Editor click backup handler');
      handleEditorMouseDown(event);
    };
    
    editorElement.addEventListener('click', handleEditorClick, true);

    return () => {
      editorElement.removeEventListener('mousedown', handleEditorMouseDown, true);
      editorElement.removeEventListener('click', handleEditorClick, true);
    };
  }, [editorRef, comments, handleCommentClick]);

  const [editorExtensions, setEditorExtensions] = useState(() => EditorExtensionsFactory.getCoreExtensions());

  // Load full extensions asynchronously
  useEffect(() => {
    let mounted = true;

    const loadExtensions = async () => {
      try {
        const fullExtensions = await EditorExtensionsFactory.getFullExtensions({
          enableComments: !!articleId, // Only enable comments if we have an article ID
          enableTables: true,
          enableAdvancedFormatting: true,
        });

        if (mounted) {
          setEditorExtensions(fullExtensions);
        }
      } catch (error) {
        console.error('Failed to load editor extensions:', error);
        // Fallback to core extensions
        if (mounted) {
          setEditorExtensions(EditorExtensionsFactory.getCoreExtensions());
        }
      }
    };

    loadExtensions();

    return () => {
      mounted = false;
    };
  }, [articleId]);

  // Comment highlighting is now handled by CommentHighlightExtension

  const editor = useEditor({
    extensions: editorExtensions,
    content: content || initialContent, // Use current content or fall back to initial
    editable: true,
    autofocus: true,
    editorProps: {
      attributes: {
        class: `prose max-w-none focus:outline-none p-6 editor-scrollbar`,
        'data-testid': 'article-editor-content',
        contenteditable: 'true', // Explicitly ensure contenteditable
        spellcheck: 'false', // Disable spellcheck to prevent Grammarly interference
      },
      handleKeyDown: (view, event) => {
        console.log('🎹 Key event in editor:', event.key, event.type);
        return false; // Allow normal key handling
      },
      handleClick: (view, pos, event) => {
        console.log('🖱️ Click event in editor:', pos);
        // Ensure editor gets focus on click using view
        if (view && !view.hasFocus()) {
          view.focus();
        }
        return false; // Allow normal click handling
      },
    },
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      if (newContent !== content) { // Only update if content actually changed
        console.log('✏️ Editor content updated:', newContent.length, 'characters');
        
        // Batch state updates to prevent multiple re-renders
        requestAnimationFrame(() => {
          setContent(newContent);
          setHasUnsavedChanges(true);
          
          // Call the onContentChange callback if provided
          if (onContentChange) {
            console.log('🔄 ArticleEditor calling onContentChange callback');
            onContentChange(newContent);
          }
        });
        
        // Trigger auto-save without waiting for state updates
        if (articleId && newContent.trim() !== content.trim()) {
          console.log('🔄 Triggering debouncedAutoSave...', { articleId, newContentLength: newContent.trim().length, oldContentLength: content.trim().length });
          debouncedAutoSave(newContent);
        }
      }
    },
    onCreate: ({ editor }) => {
      console.log('🎯 Editor created successfully', { 
        isEditable: editor.isEditable, 
        isFocused: editor.isFocused 
      });
      
      
      // Force focus after a short delay to ensure editor is ready
      setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          editor.commands.focus();
          console.log('🎯 Editor focused programmatically');
        }
      }, 100);
    },
    onFocus: () => {
      console.log('🎯 Editor received focus');
    },
    onBlur: () => {
      console.log('🎯 Editor lost focus');
    },
  }, [editorExtensions]); // Add editorExtensions as dependency to recreate editor when extensions change

  // Image operation handlers - defined after editor
  const handleImageResize = useCallback((width: number, height: number) => {
    if (!selectedImage || !editor) return;
    
    console.log('🔄 Resizing image:', { width, height, pos: selectedImage.pos });
    
    // Update the image node attributes
    editor.chain().focus().updateAttributes('imageWithResize', {
      width: Math.round(width),
      height: Math.round(height),
    }).run();
    
    // Update the selected image position
    setTimeout(() => {
      if (selectedImage) {
        const rect = selectedImage.element.getBoundingClientRect();
        
        setSelectedImage(prev => prev ? {
          ...prev,
          position: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          }
        } : null);
      }
    }, 50);
  }, [selectedImage, editor]);

  const handleImageDelete = useCallback(() => {
    if (!selectedImage || !editor) return;
    
    if (window.confirm('Delete this image?')) {
      console.log('🗑️ Deleting image at position:', selectedImage.pos);
      editor.chain().focus().deleteRange({ 
        from: selectedImage.pos, 
        to: selectedImage.pos + 1 
      }).run();
      setSelectedImage(null);
    }
  }, [selectedImage, editor]);

  const handleImageEditCaption = useCallback(() => {
    if (!selectedImage || !editor) return;
    
    const currentCaption = selectedImage.node.attrs.caption || '';
    const newCaption = window.prompt('Enter image caption:', currentCaption);
    
    if (newCaption !== null) {
      console.log('📝 Updating image caption:', newCaption);
      editor.chain().focus().updateAttributes('imageWithResize', {
        caption: newCaption,
      }).run();
    }
  }, [selectedImage, editor]);

  const handleImageClose = useCallback(() => {
    console.log('❌ Closing image resizer');
    setSelectedImage(null);
  }, []);

  // Add a manual focus handler for the editor container
  const handleEditorContainerClick = useCallback((e: React.MouseEvent) => {
    console.log('🖱️ Editor container clicked');
    
    // Check if click is on an image or image controls
    const target = e.target as HTMLElement;
    const isImageClick = target.tagName === 'IMG' || 
                        target.closest('.image-resizer-overlay') ||
                        target.closest('.image-resize-handle') ||
                        target.classList.contains('resize-handle') ||
                        target.classList.contains('toolbar-button');
    
    // Deselect image if clicking elsewhere
    if (!isImageClick && selectedImage) {
      console.log('🖼️ Deselecting image due to outside click');
      setSelectedImage(null);
    }
    
    if (editor && !editor.isDestroyed) {
      // Small delay to ensure click event completes
      setTimeout(() => {
        editor.commands.focus();
        console.log('🎯 Editor focused from container click');
      }, 10);
    }
  }, [editor, selectedImage]);

  // Update comment highlighting when highlighted comment changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // Use a timeout to batch comment updates and prevent excessive re-renders
      const timeoutId = setTimeout(() => {
        console.log('🔍 Updating highlighted comment:', highlightedCommentId);
        
        // Try to update the extension directly
        const extension = editor.extensionManager.extensions.find((ext: any) => ext.name === 'commentHighlight');
        if (extension) {
          console.log('✅ Found commentHighlight extension, updating highlightedCommentId');
          extension.storage.highlightedCommentId = highlightedCommentId;
          
          // Force re-render of decorations
          editor.view.dispatch(editor.state.tr);
          console.log('✅ Forced decoration refresh for highlight');
        } else {
          console.warn('⚠️ commentHighlight extension not found');
          
          // Try using command as fallback
          if (editor.commands.updateHighlightedComment) {
            console.log('✅ Using updateHighlightedComment command as fallback');
            editor.chain().focus().updateHighlightedComment(highlightedCommentId).run();
          }
        }
      }, 50); // Slightly longer delay to ensure extension is loaded
      
      return () => clearTimeout(timeoutId);
    }
  }, [editor, highlightedCommentId]);

  // Update comment data when comments change
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // Use a timeout to batch comment updates and prevent excessive re-renders
      const timeoutId = setTimeout(() => {
        console.log('🔍 Updating comments in editor, count:', comments.length);
        
        // Debug: log all available extensions
        console.log('📋 Available extensions:', editor.extensionManager.extensions.map((ext: any) => ext.name));
        
        // Try to update the extension directly
        const extension = editor.extensionManager.extensions.find((ext: any) => ext.name === 'commentHighlight');
        if (extension) {
          console.log('✅ Found commentHighlight extension, updating storage');
          extension.storage.comments = comments;
          extension.storage.onCommentClick = handleCommentClick;
          
          // Force re-render of decorations by dispatching an empty transaction
          editor.view.dispatch(editor.state.tr);
          console.log('✅ Forced decoration refresh');
        } else {
          console.warn('⚠️ commentHighlight extension not found');
          
          // Try using commands as fallback
          const chain = editor.chain().focus();
          
          // Check if updateComments command exists
          if (editor.commands.updateComments) {
            console.log('✅ Using updateComments command as fallback');
            chain.updateComments(comments);
          }
          
          // Check if updateOnCommentClick command exists
          if (editor.commands.updateOnCommentClick) {
            console.log('✅ Using updateOnCommentClick command as fallback');
            chain.updateOnCommentClick(handleCommentClick);
          }
          
          // Run the chain
          chain.run();
        }
      }, 50); // Slightly longer delay to ensure extension is loaded
      
      return () => clearTimeout(timeoutId);
    }
  }, [editor, comments, handleCommentClick]);

  // Update user status when actively editing (simplified - no cursor positioning)
  useEffect(() => {
    if (!editor || !isCollaborationReady) return;

    const handleTransaction = () => {
      // Update status to editing on any transaction (typing, formatting, etc.)
      if (articleId) {
        realtimeCollaboration.updatePresence(articleId, 'editing');
      }
    };

    // Add event listeners only if editor exists
    if (!editor) return;
    
    editor.on('transaction', handleTransaction);

    return () => {
      if (editor) {
        editor.off('transaction', handleTransaction);
      }
    };
  }, [editor, isCollaborationReady, articleId]);

  // Cleanup for imageSelected event listener
  useEffect(() => {
    const handleImageSelected = (event: CustomEvent) => {
      const { imageElement, node, pos } = event.detail;
      console.log('🖼️ ArticleEditor: Received imageSelected event', { imageElement, node, pos });
      
      // Calculate image position for overlay (using fixed positioning, so no scroll offset needed)
      const rect = imageElement.getBoundingClientRect();
      
      setSelectedImage({
        element: imageElement,
        node: node,
        pos: pos,
        position: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        }
      });
    };

    if (editor?.view?.dom) {
      editor.view.dom.addEventListener('imageSelected', handleImageSelected as EventListener);
      
      return () => {
        if (editor?.view?.dom) {
          editor.view.dom.removeEventListener('imageSelected', handleImageSelected as EventListener);
        }
      };
    }
  }, [editor]);
  
  // Auto-save functionality with stable debounced function
  const debouncedAutoSave = useMemo(
    () => {
      console.log('🔧 Creating new debouncedAutoSave function...');
      return debounce(async (content: string) => {
      console.log('🚀 debouncedAutoSave function executing...', { 
        articleId: articleId || 'none', 
        contentLength: content?.trim()?.length || 0 
      });
      
      if (!articleId || !content?.trim()) {
        console.log('⚠️ debouncedAutoSave early return:', { 
          hasArticleId: !!articleId, 
          hasContent: !!(content?.trim()) 
        });
        return;
      }
      
      try {
        // Set auto-saving state optimistically without causing re-renders
        setIsAutoSaving(true);
        
        // Get current values without creating dependencies
        const currentOnAutoSave = onAutoSave;

        // Use unified auto-save function if provided, otherwise fallback to old API
        if (currentOnAutoSave) {
          console.log('🔄 Using unified auto-save function for articleId:', articleId || 'unknown');
          await currentOnAutoSave(content);
          console.log('✅ onAutoSave function completed successfully');
          
          // Update status smoothly without causing layout shifts
          setTimeout(() => {
            setSaveStatus('saved');
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
          }, 0);
        } else {
          console.warn('⚠️ No auto-save function provided - auto-save disabled');
          // Auto-save is disabled if no onAutoSave function is provided
          setSaveStatus('error');
        }
      } catch (error) {
        setTimeout(() => {
          setSaveStatus('error');
          console.error('Auto-save error:', error);
        }, 0);
      } finally {
        // Always clear auto-saving state
        setTimeout(() => {
          setIsAutoSaving(false);
        }, 100);
      }
      }, 3000);
    },
    [articleId] // Only include absolutely necessary stable dependencies
  );

  // Manual save functionality
  const handleSave = async () => {
    if (!editor || !articleId) return;
    
    const currentContent = editor.getHTML();
    
    try {
      setIsAutoSaving(true);
      setSaveStatus('saving');
      
      // Use the unified save function passed from UnifiedArticleEditor
      if (onSave) {
        console.log('🔄 Using unified save function for:', { adminMode, articleId });
        await onSave(currentContent);
        
        // The UnifiedArticleEditor handles the save result and status
        setSaveStatus('saved');
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      } else {
        console.warn('⚠️ No save function provided - manual save disabled');
        setSaveStatus('error');
        throw new Error('Save function not provided');
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Save error:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Enhanced word count calculation
  const updateWordCount = useCallback((content: string) => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const reading = Math.ceil(words / 200); // 200 words per minute
    
    setWordCount(words);
    setCharCount(chars);
    setReadingTime(reading);
  }, []);

  // Monitor content changes for word count
  useEffect(() => {
    if (content) {
      updateWordCount(content);
    }
  }, [content, updateWordCount]);

  const hasAdminUser = useMemo(() => !!adminUser, [adminUser]);
  const hasOriginalAuthor = useMemo(() => originalAuthor?.id === adminUser?.id, [originalAuthor, adminUser]);

  // Handle image insert
  const handleImageInsert = (imageUrl: string, metadata?: { altText?: string; caption?: string; width?: number; height?: number }) => {
    if (editor) {
      // Store current cursor position
      const { from, to } = editor.state.selection;
      
      // Insert image at current cursor position
      editor.chain()
        .focus()
        .insertContentAt(from, {
          type: 'imageWithResize',
          attrs: {
            src: imageUrl,
            alt: metadata?.altText || '',
            caption: metadata?.caption || '',
            width: metadata?.width,
            height: metadata?.height
          }
        })
        .run();
    }
  };

  // Handle edit link
  const handleEditLink = (linkData: any) => {
    setLinkData(linkData);
    setShowLinkEditor(true);
  };

  // Handle link save from modal
  const handleLinkSave = (url: string, text: string) => {
    if (!editor) return;
    
    if (text) {
      // Insert link with custom text
      editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
    } else {
      // Set link for selected text or insert URL as text
      if (editor.state.selection.empty) {
        editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
      } else {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
    
    setShowLinkEditor(false);
    setLinkData(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      if (isCtrlOrCmd) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            handleSave();
            break;
          case 'm':
            event.preventDefault();
            setShowComments(!showComments);
            break;
        }
      }

      // Escape key
      if (event.key === 'Escape') {
        setShowImageUpload(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showComments]);

  // Auto-show comments if there are existing comments
  useEffect(() => {
    if (comments.length > 0 && !showComments) {
      setShowComments(true);
    }
  }, [comments.length]);

  // Cleanup debounced save on unmount
  useEffect(() => {
    return () => {
      debouncedAutoSave.cancel();
    };
  }, [debouncedAutoSave]);

  // Update editor content when external content changes (real-time collaboration)
  useEffect(() => {
    if (editor && !editor.isDestroyed && externalContent !== undefined) {
      const shouldUpdateContent = forceContentUpdate || (content !== externalContent && !isAutoSaving);
      
      if (shouldUpdateContent) {
        console.log('🔄 [ARTICLE EDITOR] Setting editor content from external update:', {
          currentContentLength: content?.length || 0,
          externalContentLength: externalContent.length,
          forceUpdate: forceContentUpdate,
          isAutoSaving,
          timestamp: new Date().toISOString()
        });
        
        // Update editor content without emitting update event to prevent loops
        setTimeout(() => {
          if (editor && !editor.isDestroyed && !isAutoSaving) {
            editor.commands.setContent(externalContent, false); // false = don't emit update event
            setContent(externalContent);
          }
        }, 0);
      }
    }
  }, [editor, externalContent, forceContentUpdate, isAutoSaving]);

  // Initial content load from article prop (for first load)
  useEffect(() => {
    if (editor && !editor.isDestroyed && article && article.content && !content) {
      console.log('🔄 [ARTICLE EDITOR] Setting initial content from article:', {
        articleId: article.id,
        articleVersion: article.article_version,
        contentLength: article.content.length,
        adminMode,
        timestamp: new Date().toISOString()
      });
      
      setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          editor.commands.setContent(article.content, false);
          setContent(article.content);
        }
      }, 0);
    }
  }, [editor, article?.id, article?.content]); // Only run on initial load

  // Focus management effect - ensure editor is focusable
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // Double-check editable state
      if (!editor.isEditable) {
        console.log('⚠️ Editor not editable, making it editable');
        editor.setEditable(true);
      }
      
      // Log editor state for debugging
      console.log('📊 Editor state:', {
        isEditable: editor.isEditable,
        isFocused: editor.isFocused,
        isEmpty: editor.isEmpty,
        canEdit: editor.can().insertContent('test')
      });
    }
  }, [editor]);


  // Enhanced command handlers that maintain selection and focus
  const executeCommand = useCallback((commandFn: () => any, commandName: string) => {
    if (!editor || editor.isDestroyed) {
      console.error('❌ Editor not available for command:', commandName);
      return false;
    }

    try {
      console.log('🎯 Executing command:', commandName, {
        hasSelection: !editor.state.selection.empty,
        selectionFrom: editor.state.selection.from,
        selectionTo: editor.state.selection.to,
        isFocused: editor.isFocused,
        isEditable: editor.isEditable
      });

      // Store the current selection
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      
      console.log('📝 Selected text:', selectedText);

      // Execute the command
      const result = commandFn();
      
      console.log('✅ Command executed:', commandName, result);
      
      // Debug: Log the current HTML to see what's being generated
      if (commandName.includes('List')) {
        const currentHTML = editor.getHTML();
        console.log('🔍 Current HTML after list command:', currentHTML.substring(Math.max(0, currentHTML.length - 500)));
        
        // Debug: Check for ul and ol elements specifically
        const ulMatches = currentHTML.match(/<ul[^>]*>/g);
        const olMatches = currentHTML.match(/<ol[^>]*>/g);
        const liMatches = currentHTML.match(/<li[^>]*>/g);
        
        console.log('🔍 Found UL elements:', ulMatches);
        console.log('🔍 Found OL elements:', olMatches);
        console.log('🔍 Found LI elements:', liMatches);
        
        // Debug: Search for any list elements in the full HTML
        if (currentHTML.includes('<ul') || currentHTML.includes('<ol')) {
          const listStart = Math.max(0, currentHTML.search(/<[uo]l/));
          const listEnd = Math.min(currentHTML.length, listStart + 1000);
          console.log('🔍 List HTML section:', currentHTML.substring(listStart, listEnd));
        }
      }
      
      // Force editor focus and UI update
      if (!editor.isFocused) {
        editor.commands.focus();
      }
      
      // Force editor to update its internal state and trigger re-render
      setTimeout(() => {
        editor.commands.focus();
        // Trigger a content update to force re-render
        const currentContent = editor.getHTML();
        setContent(currentContent);
        console.log('🔄 Forced UI update after command:', commandName);
      }, 10);
      
      return result;
    } catch (error) {
      console.error('❌ Error executing command:', commandName, error);
      return false;
    }
  }, [editor]);

  const toggleBold = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleBold().run(), 'toggleBold');
  }, [editor, executeCommand]);

  const toggleItalic = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleItalic().run(), 'toggleItalic');
  }, [editor, executeCommand]);

  const toggleUnderline = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleUnderline().run(), 'toggleUnderline');
  }, [editor, executeCommand]);

  const toggleStrike = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleStrike().run(), 'toggleStrike');
  }, [editor, executeCommand]);

  const setTextColor = useCallback((color: string) => {
    return executeCommand(() => editor?.chain().focus().setColor(color).run(), `setColor(${color})`);
  }, [editor, executeCommand]);

  const setHighlight = useCallback((color: string) => {
    return executeCommand(() => editor?.chain().focus().toggleHighlight({ color }).run(), `setHighlight(${color})`);
  }, [editor, executeCommand]);

  const toggleHeading = useCallback((level: 1 | 2 | 3 | 4) => {
    return executeCommand(() => editor?.chain().focus().toggleHeading({ level }).run(), `toggleHeading(${level})`);
  }, [editor, executeCommand]);

  const toggleBulletList = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleBulletList().run(), 'toggleBulletList');
  }, [editor, executeCommand]);

  const toggleOrderedList = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleOrderedList().run(), 'toggleOrderedList');
  }, [editor, executeCommand]);

  const setTextAlign = useCallback((alignment: 'left' | 'center' | 'right') => {
    return executeCommand(() => editor?.chain().focus().setTextAlign(alignment).run(), `setTextAlign(${alignment})`);
  }, [editor, executeCommand]);

  const toggleBlockquote = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleBlockquote().run(), 'toggleBlockquote');
  }, [editor, executeCommand]);

  const toggleCodeBlock = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleCodeBlock().run(), 'toggleCodeBlock');
  }, [editor, executeCommand]);



  // Prevent unwanted scrolling behavior
  useEffect(() => {
    const preventScrollOnClick = (e: Event) => {
      // Check if the click target is a toolbar button
      const target = e.target as HTMLElement;
      if (target && target.closest('[role="button"]') || target.closest('button')) {
        // Prevent any scroll-related behavior
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add scroll prevention
    document.addEventListener('scroll', (e) => {
      // If we detect unwanted scrolling during button clicks, prevent it
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        e.preventDefault();
      }
    }, { passive: false });

    const handleBeforeUnload = () => {
      if (hasUnsavedChanges) {
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`
          ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}
          ${className}
          bg-gray-50
          w-full flex flex-col
          ${focusMode === 'zen' ? 'h-screen' : ''}
        `}
        style={{
          ...(focusMode === 'zen' && {
            overflow: 'auto',
          })
        }}
      >
        {/* Custom styles for heading hierarchy */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .article-editor-content h1 {
              font-size: 2.5rem !important;
              font-weight: 700 !important;
              line-height: 1.2 !important;
              margin-top: 2rem !important;
              margin-bottom: 1rem !important;
            }
            .article-editor-content h2 {
              font-size: 2rem !important;
              font-weight: 600 !important;
              line-height: 1.3 !important;
              margin-top: 1.75rem !important;
              margin-bottom: 0.875rem !important;
            }
            .article-editor-content h3 {
              font-size: 1.5rem !important;
              font-weight: 600 !important;
              line-height: 1.4 !important;
              margin-top: 1.5rem !important;
              margin-bottom: 0.75rem !important;
            }
            .article-editor-content h4 {
              font-size: 1.25rem !important;
              font-weight: 600 !important;
              line-height: 1.5 !important;
              margin-top: 1.25rem !important;
              margin-bottom: 0.625rem !important;
            }
            .article-editor-content p {
              font-size: 1.125rem !important;
              line-height: 1.7 !important;
              margin-bottom: 1rem !important;
            }
          `
        }} />

        {/* Sticky toolbar */}
        <EditorToolbar
          editor={editor}
          onSave={handleSave}
          onImageInsert={() => setShowImageUpload(true)}
          showComments={showComments}
          onToggleComments={() => setShowComments(!showComments)}
          saveStatus={saveStatus}
          isAutoSaving={isAutoSaving}
          lastSaved={lastSaved}
          adminMode={adminMode}
          articleId={articleId}
          article={article}
          comments={comments}
          wordCount={wordCount}
          charCount={charCount}
          readingTime={readingTime}
          focusMode={focusMode}
          onFocusModeChange={setFocusMode}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isFullscreen={isFullscreen}
          onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
          onBack={onBack}
          isAiCopilotOpen={isAiCopilotOpen}
          screenSize={layout.screenSize}
          currentTextColor={currentTextColor}
          currentHighlightColor={currentHighlightColor}
          onTextColorChange={setCurrentTextColor}
          onHighlightColorChange={setCurrentHighlightColor}
          onLinkInsert={() => {
            const selectedText = editor?.state.doc.textBetween(
              editor.state.selection.from,
              editor.state.selection.to
            );
            setSelectedText(selectedText || '');
            setShowLinkEditor(true);
          }}
          onSettingsOpen={() => setShowSettings(true)}
          onHelpOpen={() => setShowHelp(true)}
        />

        {/* Main content area with proper layout - Make wider overall */}
        <div 
          className="flex-1 flex overflow-hidden transition-all duration-300" 
          style={{ 
            maxWidth: '100%',
            width: layout.screenSize === 'mobile' && showComments ? 'calc(100% - 300px)' : '100%'
          }}
        >
        {/* Editor area - takes most space */}
        <div 
          className={`flex-1 flex flex-col min-w-0 ${focusMode === 'zen' ? 'overflow-y-auto' : 'overflow-hidden'} transition-all duration-300`} 
          style={{ 
            minWidth: layout.screenSize === 'mobile' ? '100%' : showComments ? '60%' : '100%',
            maxWidth: showComments ? `calc(100% - ${layout.commentsSidebarWidth}px)` : '100%'
          }}
        >
          {/* Editor container - properly contained with overflow handling */}
          <div className={`flex-1 ${focusMode === 'zen' ? 'overflow-y-auto' : 'overflow-y-auto'}`} style={{ position: 'relative' }}>
            <div 
              ref={editorRef}
              data-editor="true"
              className={`
                px-8 min-h-full relative
                bg-white text-gray-900
                ${focusMode === 'zen' ? 'prose-2xl max-w-5xl mx-auto' : 'prose-xl max-w-none'}
                ${isMobile ? 'prose-lg' : ''}
                w-full leading-relaxed
                article-editor-content
              `}
              onClick={handleEditorContainerClick}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              style={{
                paddingTop: focusMode === 'zen' ? '32px' : '32px',
                scrollBehavior: 'auto', // Prevent smooth scrolling that might interfere
                ...(focusMode === 'zen' && {
                  minHeight: '100vh',
                  paddingBottom: '50vh', // Extra space for zen mode scrolling
                })
              }}
            >
              {/* Collaborative Cursors Overlay removed per user request */}
              
              <EditorContent 
                editor={editor} 
                className={`
                  prose prose-xl max-w-none focus:outline-none
                  ${focusMode === 'zen' ? 'prose-2xl max-w-5xl mx-auto' : 'prose-xl max-w-none'}
                  ${isMobile ? 'prose-lg' : ''}
                  w-full leading-relaxed
                `}
                style={{
                  lineHeight: focusMode === 'zen' ? '2' : '1.8',
                  fontSize: '18px',
                  paddingBottom: '2rem', // Minimal bottom padding
                  maxWidth: focusMode === 'zen' ? '1400px' : 'none',
                  margin: focusMode === 'zen' ? '0 auto' : '0',
                  pointerEvents: 'auto', // Ensure pointer events are enabled
                  userSelect: 'text', // Ensure text selection is enabled
                  cursor: 'text', // Show text cursor
                  minHeight: '200px', // Ensure minimum height for clicking
                }}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
              
              {/* Empty state hint */}
              {editor?.isEmpty && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-12 left-12 text-gray-400 pointer-events-none select-none"
                >
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <Sparkles size={20} className="text-blue-400 animate-pulse-glow" />
                      <span className="text-xl font-light">Start writing your article here...</span>
                    </div>
                    {article?.product_name && (
                      <div className="text-base text-gray-500 max-w-2xl">
                        <div className="font-medium text-gray-600 mb-3 text-lg">Article: {article.product_name}</div>
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <span className="text-blue-500 mt-1">💡</span>
                            <div>
                              <strong>This article was created from a Google Doc.</strong> The content is currently empty in our editor.
                            </div>
                          </div>
                          <div className="ml-8 space-y-2 text-sm">
                            <div>• <strong>Start typing here</strong> to create new content</div>
                            <div>• <strong>Copy & paste</strong> from the Google Doc if you want to edit it here</div>
                            <div>• <strong>Use "Open Google Doc"</strong> button to view the original</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              
              {/* Editor Status Bar */}
              <EditorStatusBar
                wordCount={wordCount}
                charCount={charCount}
                readingTime={readingTime}
                commentCount={comments.length}
                showComments={showComments}
              />
            </div>
          </div>
        </div>

        {/* Inline Comments - Always rendered for seamless UX */}
        {articleId && (
          <InlineCommentingExtension
            articleId={articleId}
            editorRef={editorRef}
            selectedText={textSelection}
            comments={comments}
            onCommentsChange={setComments}
            getMarkerPosition={(start, end, ref) => {
              // Import the positioning logic from CommentingSystem
              if (!ref.current) return null;
              
              try {
                const editorTextContent = ref.current.textContent || '';
                const startNode = getTextNodeAtOffset(ref.current, start);
                const endNode = getTextNodeAtOffset(ref.current, end);
                
                if (!startNode || !endNode) return null;
                
                const range = document.createRange();
                range.setStart(startNode.node, startNode.offset);
                range.setEnd(endNode.node, endNode.offset);
                
                const rect = range.getBoundingClientRect();
                const editorRect = ref.current.getBoundingClientRect();
                
                return {
                  top: rect.top - editorRect.top,
                  left: rect.left - editorRect.left,
                  width: rect.width,
                  height: rect.height
                };
              } catch (error) {
                console.warn('Failed to calculate marker position:', error);
                return null;
              }
            }}
            onCommentClick={handleCommentClick}
            onCommentStatusChange={async (commentId, status) => {
              try {
                // Update comment status
                const updatedComments = comments.map(c => 
                  c.id === commentId ? { ...c, status: status as "active" | "resolved" | "archived" } : c
                );
                setComments(updatedComments);
              } catch (error) {
                console.error('Failed to update comment status:', error);
              }
            }}
            inlineMode={true}
          />
        )}

        {/* Comments area - wider and properly constrained for scrolling */}
        {showComments && articleId && (
          <div 
            className="flex-shrink-0 border-l border-gray-200 bg-gray-50 transition-all duration-300" 
            style={{ 
              width: layout.screenSize === 'mobile' ? '300px' : `${layout.commentsSidebarWidth}px`,
              maxWidth: layout.screenSize === 'mobile' ? '300px' : `${layout.commentsSidebarWidth}px`,
              minWidth: layout.screenSize === 'mobile' ? '300px' : `${layout.commentsSidebarWidth}px`
            }}
          >
            <CommentingSystem
              key={`comments-${articleId}`}
              articleId={articleId}
              editorRef={editorRef}
              comments={comments}
              onCommentsChange={setComments}
              highlightedCommentId={highlightedCommentId}
              onHighlightComment={setHighlightedCommentId}
              adminMode={adminMode}
              adminUser={adminUser}
              inlineMode={true}
            />
          </div>
        )}
      </div>

      {/* Floating action button for zen mode */}
      <AnimatePresence>
        {focusMode === 'zen' && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={() => setFocusMode('normal')}
            className="fixed top-6 right-6 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50"
          >
            <X size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Link Editor Modal */}
      <AnimatePresence>
        {showLinkEditor && (
          <LinkEditor
            isOpen={showLinkEditor}
            onClose={() => {
              setShowLinkEditor(false);
              setLinkData(null);
            }}
            onSave={handleLinkSave}
            initialUrl={linkData?.href || ''}
            initialText={selectedText}
          />
        )}
      </AnimatePresence>

      {/* Image Upload Modal */}
      {showImageUpload && (
        <MediaLibrarySelector
          onImageInsert={handleImageInsert}
          onClose={() => setShowImageUpload(false)}
          articleId={articleId}
          companyName={adminMode ? originalAuthor?.company_name || userCompany : userCompany}
        />
      )}

      {/* Link Tooltip */}
      {showLinkTooltip && linkData && editor && (
        <LinkTooltip
          editor={editor}
          isVisible={showLinkTooltip}
          linkData={linkData}
          position={linkTooltip.position}
          onEdit={() => handleEditLink(linkData)}
          onClose={() => setShowLinkTooltip(false)}
        />
      )}

      {/* Image Resizer */}
      <ImageHandler
        selectedImage={selectedImage}
        onResize={handleImageResize}
        onClose={handleImageClose}
        onDelete={handleImageDelete}
        onEditCaption={handleImageEditCaption}
      />
      </motion.div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ArticleEditor = React.memo(ArticleEditorComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders when only unimportant props change
  return (
    (prevProps.articleId || '') === (nextProps.articleId || '') &&
    (prevProps.initialContent || '') === (nextProps.initialContent || '') &&
    !!prevProps.adminMode === !!nextProps.adminMode &&
    (prevProps.adminUser?.id || '') === (nextProps.adminUser?.id || '') &&
    (prevProps.originalAuthor?.id || '') === (nextProps.originalAuthor?.id || '') &&
    !!prevProps.isAiCopilotOpen === !!nextProps.isAiCopilotOpen
  );
});