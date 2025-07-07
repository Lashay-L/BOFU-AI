import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, CheckCircle, Archive, MoreHorizontal, Edit2, Trash2, Reply, User, Clock, ArrowLeft, Sparkles, Quote, Image as ImageIcon, Smile, AtSign, Hash, Bold, Italic, Link, List, Type } from 'lucide-react';
import { ArticleComment, createComment, updateCommentStatus, deleteComment, updateComment, createCommentWithMentions } from '../../lib/commentApi';
import { CommentEditor } from './CommentEditor';
import { CommentThread } from './CommentThread';
import { motion } from 'framer-motion';
import { BaseModal } from './BaseModal';

interface TextSelection {
  start: number;
  end: number;
  text: string;
  range?: Range;
}

interface CommentPopoverProps {
  position: { x: number; y: number };
  articleId: string;
  selectedText?: TextSelection | null;
  selectedComment?: ArticleComment | null;
  onClose: () => void;
  onSubmit: (content: string) => void;
  onCommentCreated?: (comment: ArticleComment) => void;
}

export const CommentPopover: React.FC<CommentPopoverProps> = ({
  position,
  articleId,
  selectedText,
  selectedComment,
  onClose,
  onSubmit,
  onCommentCreated
}) => {
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentType, setCommentType] = useState<'text' | 'suggestion'>('text');
  const [viewMode, setViewMode] = useState<'view' | 'reply' | 'edit'>(!selectedComment ? 'reply' : 'view');
  const [isCreating, setIsCreating] = useState(!selectedComment);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Add image upload state
  const [selectedImage, setSelectedImage] = useState<File | undefined>(undefined);

  // Debug logging for selectedComment when in reply mode
  useEffect(() => {
    if (viewMode === 'reply' && selectedComment) {
      console.log('🔍 CommentPopover Reply Mode - selectedComment:', {
        id: selectedComment.id,
        content_type: selectedComment.content_type,
        image_url: selectedComment.image_url,
        content: selectedComment.content,
        user: selectedComment.user
      });
    }
  }, [viewMode, selectedComment]);

  // Auto-focus textarea when creating/replying
  useEffect(() => {
    if ((isCreating || viewMode === 'reply') && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isCreating, viewMode]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (viewMode === 'reply' || viewMode === 'edit') {
          setViewMode('view');
          setCommentContent('');
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, viewMode]);

  const handleSubmit = async () => {
    if (!commentContent.trim() && !selectedImage) return;

    setIsSubmitting(true);
    try {
      if (viewMode === 'edit') {
        // Handle edit mode - use existing onSubmit for now
        await onSubmit(commentContent);
        setViewMode('view');
      } else {
        // Handle new comment creation with proper image and mention support
        const createdComment = await createCommentWithMentions(
          articleId,
          commentContent,
          selectedImage ? 'image' : commentType,
          selectedImage,
          selectedText?.start,
          selectedText?.end,
          selectedComment?.id // parent comment ID for replies
        );

        if (createdComment) {
          // Call the callback to notify parent component
          if (onCommentCreated) {
            onCommentCreated(createdComment);
          } else {
            // Fallback to old onSubmit for backward compatibility
            await onSubmit(commentContent);
          }

          setCommentContent('');
          setSelectedImage(undefined);
          
          if (viewMode === 'reply') {
            setViewMode('view');
          } else {
            onClose();
          }
        } else {
          throw new Error('Failed to create comment');
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (commentId: string, status: 'active' | 'resolved' | 'archived') => {
    try {
      await updateCommentStatus(commentId, status);
      // Let parent handle refresh
    } catch (error) {
      console.error('Error updating comment status:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(commentId);
      onClose(); // Close popover after deletion
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReply = () => {
    setViewMode('reply');
    setCommentContent('');
    setIsCreating(true);
  };

  const handleEdit = (comment: ArticleComment) => {
    setCommentContent(comment.content);
    setViewMode('edit');
    setIsCreating(true);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <motion.span 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 dark:from-emerald-900/30 dark:to-green-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700"
          >
            <CheckCircle className="w-3 h-3 mr-1.5" />
            Resolved
          </motion.span>
        );
      case 'archived':
        return (
          <motion.span 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700 dark:from-slate-900/30 dark:to-gray-900/30 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          >
            <Archive className="w-3 h-3 mr-1.5" />
            Archived
          </motion.span>
        );
      default:
        return (
          <motion.span 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
          >
            <MessageCircle className="w-3 h-3 mr-1.5" />
            Active
          </motion.span>
        );
    }
  };

  // Add image upload handlers
  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
  };

  const handleImageRemove = () => {
    setSelectedImage(undefined);
  };

  const getCommentTypeIcon = (type: string) => {
    return type === 'suggestion' ? (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
    ) : (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
        <MessageCircle className="w-4 h-4 text-white" />
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={!selectedComment ? 'New Comment' : 
             viewMode === 'reply' ? 'Reply to Comment' :
             viewMode === 'edit' ? 'Edit Comment' : 'Comment Details'}
      size="lg"
      theme="dark"
    >
      <div className="max-h-[80vh] overflow-y-auto">
        {/* Selected text display with enhanced design */}
        {selectedText && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm"
          >
            <div className="flex items-start space-x-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              >
                <Quote className="w-5 h-5 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2"
                >
                  Selected Text
                  <span className="px-2 py-1 bg-blue-200/50 dark:bg-blue-800/50 rounded-lg text-xs">
                    {selectedText.text.length} chars
                  </span>
                </motion.p>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm shadow-sm"
                >
                  <p className="text-sm text-gray-900 dark:text-gray-100 italic leading-relaxed">
                    "{selectedText.text.length > 200 ? selectedText.text.slice(0, 200) + '...' : selectedText.text}"
                  </p>
                </motion.div>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-xs text-blue-600 dark:text-blue-400 mt-3 flex items-center gap-2"
                >
                  <Hash className="w-3 h-3" />
                  Characters {selectedText.start}-{selectedText.end}
                </motion.p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Comment Thread View with enhanced styling */}
        {selectedComment && viewMode === 'view' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 space-y-6"
          >
            {/* Original Comment Display */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-gray-800/80 dark:to-gray-900/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-lg"
            >
              {/* User Info */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-4">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className={`
                      relative w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg
                      ${selectedComment.user?.isAdmin 
                        ? 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700' 
                        : 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700'
                      }
                    `}
                  >
                    {selectedComment.user?.name?.charAt(0)?.toUpperCase() || 
                     selectedComment.user?.email?.charAt(0)?.toUpperCase() || '?'}
                    {selectedComment.user?.isAdmin && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <Sparkles className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </motion.div>
                  <div>
                    <motion.h4 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                      className="font-bold text-gray-900 dark:text-white text-lg"
                    >
                      {selectedComment.user?.name || selectedComment.user?.email || 'Anonymous User'}
                    </motion.h4>
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
                    >
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(selectedComment.created_at)}</span>
                    </motion.div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {selectedComment.user?.isAdmin && (
                    <motion.span 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.35 }}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 text-purple-700 dark:text-purple-300 rounded-xl text-sm font-semibold border border-purple-200 dark:border-purple-700"
                    >
                      Admin
                    </motion.span>
                  )}
                  {getStatusBadge(selectedComment.status)}
                </div>
              </div>

              {/* Comment Content */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="prose prose-sm max-w-none"
              >
                {/* Image Display for Image Comments */}
                {selectedComment.content_type === 'image' && selectedComment.image_url && (
                  <div className="mb-4">
                    <img
                      src={selectedComment.image_url}
                      alt="Comment attachment"
                      className="max-w-full max-h-64 rounded-lg object-cover border border-gray-200 dark:border-gray-600 shadow-sm"
                    />
                  </div>
                )}
                
                {/* Text Content */}
                <p className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap m-0 text-base">
                  {selectedComment.content}
                </p>
              </motion.div>

              {/* Selection Context */}
              {selectedComment.selection_start !== undefined && selectedComment.selection_end !== undefined && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 }}
                  className="mt-5 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-l-4 border-blue-500 backdrop-blur-sm"
                >
                  <div className="flex items-center space-x-3 text-sm text-blue-700 dark:text-blue-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="font-semibold">Inline comment</span>
                    <span>•</span>
                    <span>Characters {selectedComment.selection_start}-{selectedComment.selection_end}</span>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Enhanced Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between pt-6 border-t border-gray-200/50 dark:border-gray-700/50"
            >
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReply}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
                  style={{
                    background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                    color: 'white'
                  }}
                >
                  <Reply className="w-4 h-4" />
                  <span>Reply</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleEdit(selectedComment)}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gray-100/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-600/80 transition-all duration-200 backdrop-blur-sm font-semibold"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </motion.button>
              </div>

              <div className="flex items-center space-x-2">
                {selectedComment.status === 'active' && (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStatusChange(selectedComment.id, 'resolved')}
                    className="flex items-center space-x-2 px-4 py-2.5 text-emerald-600 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20 rounded-xl transition-all duration-200 backdrop-blur-sm font-semibold"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Resolve</span>
                  </motion.button>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDeleteComment(selectedComment.id)}
                  className="flex items-center space-x-2 px-4 py-2.5 text-red-600 hover:bg-red-50/80 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 backdrop-blur-sm font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Comment Form */}
        {(isCreating || viewMode === 'reply' || viewMode === 'edit') && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 space-y-6"
          >
            <CommentEditor
              value={commentContent}
              onChange={setCommentContent}
              placeholder={viewMode === 'reply' ? 'Write your reply...' : 'Share your thoughts...'}
              selectedImage={selectedImage}
              onImageSelect={handleImageSelect}
              onImageRemove={handleImageRemove}
              showImageUpload={true}
              showSubmitButton={true}
              commentType={commentType}
              onCommentTypeChange={setCommentType}
            />
          </motion.div>
        )}
      </div>
    </BaseModal>
  );
}; 