import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  CheckCircle, 
  Archive, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Reply, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  User, 
  Edit3, 
  Image, 
  AtSign, 
  X, 
  Eye,
  Timer,
  Tag
} from 'lucide-react';
import { ArticleComment, highlightMentions, getMentionableUsers, MentionableUser } from '../../lib/commentApi';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../lib/auth';
import { BaseModal } from './BaseModal';

// Custom scrollbar styles for dropdown menu
const scrollbarStyles = `
  .comment-menu-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .comment-menu-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .comment-menu-scroll::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
  .comment-menu-scroll::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
  .dark .comment-menu-scroll::-webkit-scrollbar-thumb {
    background: #4b5563;
  }
  .dark .comment-menu-scroll::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }

  /* Mention highlighting styles */
  .mention-user {
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
    color: #1e40af;
    border: 1px solid #93c5fd;
    padding: 2px 6px;
    border-radius: 6px;
    font-weight: 600;
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .mention-user:hover {
    background: linear-gradient(135deg, #bfdbfe, #93c5fd);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  }
  
  .mention-admin {
    background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
    color: #7c3aed;
    border: 1px solid #c4b5fd;
    padding: 2px 6px;
    border-radius: 6px;
    font-weight: 600;
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }
  
  .mention-admin:hover {
    background: linear-gradient(135deg, #e9d5ff, #ddd6fe);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(124, 58, 237, 0.3);
  }
  
  .mention-admin::after {
    content: '👑';
    font-size: 10px;
    position: absolute;
    top: -2px;
    right: -2px;
  }
  
  .dark .mention-user {
    background: linear-gradient(135deg, #1e3a8a, #1e40af);
    color: #93c5fd;
    border-color: #3b82f6;
  }
  
  .dark .mention-user:hover {
    background: linear-gradient(135deg, #1e40af, #2563eb);
    box-shadow: 0 2px 4px rgba(147, 197, 253, 0.3);
  }
  
  .dark .mention-admin {
    background: linear-gradient(135deg, #581c87, #7c3aed);
    color: #c4b5fd;
    border-color: #8b5cf6;
  }
  
  .dark .mention-admin:hover {
    background: linear-gradient(135deg, #7c3aed, #8b5cf6);
    box-shadow: 0 2px 4px rgba(196, 181, 253, 0.3);
  }
`;

interface CommentThreadProps {
  comment: ArticleComment;
  onReply: (comment: ArticleComment) => void;
  onEdit: (comment: ArticleComment) => void;
  onDelete: (commentId: string) => void;
  onStatusChange: (commentId: string, status: 'active' | 'resolved' | 'archived') => void;
  onResolveWithReason?: (commentId: string, reason: string) => void;
  showActions?: boolean;
  depth?: number;
  showResolutionDetails?: boolean;
  loadingAction?: string | null;
  highlightedCommentId?: string | null;
}

// Resolution templates for quick actions
const resolutionTemplates = [
  { id: 'fixed', label: 'Issue Fixed', reason: 'The reported issue has been addressed and fixed.' },
  { id: 'implemented', label: 'Implemented', reason: 'The suggested improvement has been implemented.' },
  { id: 'duplicate', label: 'Duplicate', reason: 'This comment duplicates another discussion.' },
  { id: 'outdated', label: 'Outdated', reason: 'This comment is no longer relevant.' },
  { id: 'wontfix', label: "Won't Fix", reason: 'This issue will not be addressed in the current scope.' }
];

// Helper function to parse and render mentions in text
const renderTextWithMentions = (text: string) => {
  const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    // Add mention element
    parts.push(
      <span
        key={`mention-${match.index}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
        title={`Mentioned user: ${match[1]}`}
      >
        <AtSign size={12} />
        {match[1]}
      </span>
    );

    lastIndex = mentionRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : text;
};

export const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onStatusChange,
  onResolveWithReason,
  showActions = true,
  depth = 0,
  showResolutionDetails = true,
  loadingAction,
  highlightedCommentId
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  const isOwner = user?.id === comment.user_id;
  const canEdit = isOwner;
  const canDelete = isOwner;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCommentAge = () => {
    const created = new Date(comment.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getResolutionTime = () => {
    if (comment.status !== 'resolved') return null;
    const created = new Date(comment.created_at);
    const updated = new Date(comment.updated_at);
    const diffDays = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle size={12} className="text-green-600" />;
      case 'archived':
        return <Archive size={12} className="text-gray-600" />;
      default:
        return <MessageCircle size={12} className="text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-50 border-green-200';
      case 'archived':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    const age = getCommentAge();
    const isOld = age > 7; // Comments older than 7 days
    
    switch (status) {
      case 'resolved':
        const resolutionTime = getResolutionTime();
        return (
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium">
              ✓ Resolved
            </span>
            {resolutionTime !== null && (
              <span className="text-xs text-gray-500">
                in {resolutionTime === 0 ? 'same day' : `${resolutionTime}d`}
              </span>
            )}
          </div>
        );
      case 'archived':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 font-medium">
            📁 Archived
          </span>
        );
      default:
        return (
          <div className="flex items-center gap-1">
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
              isOld ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isOld ? '⚠ Pending' : '💬 Active'}
            </span>
            {isOld && (
              <span className="text-xs text-orange-600">
                {age}d old
              </span>
            )}
          </div>
        );
    }
  };

  const getTypeLabel = (contentType: string) => {
    switch (contentType) {
      case 'suggestion':
        return { label: '💡 Suggestion', color: 'bg-green-100 text-green-700' };
      case 'image':
        return { label: '🖼 Image', color: 'bg-purple-100 text-purple-700' };
      default:
        return { label: '💬 Comment', color: 'bg-blue-100 text-blue-700' };
    }
  };

  const handleResolveWithTemplate = async () => {
    if (!selectedTemplate && !customReason.trim()) return;
    
    const template = resolutionTemplates.find(t => t.id === selectedTemplate);
    const reason = customReason.trim() || template?.reason || 'Resolved without specific reason';
    
    if (onResolveWithReason) {
      await onResolveWithReason(comment.id, reason);
    } else {
      onStatusChange(comment.id, 'resolved');
    }
    
    setShowResolutionDialog(false);
    setSelectedTemplate('');
    setCustomReason('');
    setShowMenu(false);
  };

  const typeInfo = getTypeLabel(comment.content_type);

  // Enhanced content rendering that handles both images and mentions
  const renderCommentContent = () => {
    if (comment.content_type === 'image' && comment.image_url) {
      return (
        <div className="space-y-3">
          {/* Image Display */}
          <div className="relative">
            <img
              src={comment.image_url}
              alt="Comment attachment"
              className="max-w-full max-h-96 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
              loading="lazy"
            />
          </div>
          
          {/* Optional Caption with Mentions */}
          {comment.content && comment.content.trim() && (
            <div className="text-gray-700 dark:text-gray-300 text-sm">
              <div className="flex items-start gap-2">
                <Image className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  {renderTextWithMentions(comment.content)}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Regular text content with mention highlighting
    return (
      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
        {renderTextWithMentions(comment.content)}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Inject custom scrollbar styles */}
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      
      {/* Main Comment Card - only for top-level comments */}
      {depth === 0 ? (
        <div className={`
          relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm transition-all duration-300
          ${highlightedCommentId === comment.id 
            ? 'ring-2 ring-blue-200 dark:ring-blue-700 border-blue-200 dark:border-blue-700' 
            : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
          }
        `}>
          {/* Main Comment Content */}
          <div className="p-6">
            {/* Comment Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4 flex-1">
                {/* User Avatar */}
                <div className={`
                  relative w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg
                  ${comment.user?.isAdmin 
                    ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                    : 'bg-gradient-to-br from-blue-500 to-blue-700'
                  }
                `}>
                  {comment.user?.name?.charAt(0)?.toUpperCase() || comment.user?.email?.charAt(0)?.toUpperCase() || '?'}
                  {comment.user?.isAdmin && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-xs">👑</span>
                    </div>
                  )}
                </div>
                
                {/* User Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-1">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {comment.user?.name || comment.user?.email || 'Anonymous User'}
                    </h4>
                    
                    {/* Badges */}
                    <div className="flex items-center space-x-2">
                      {comment.user?.isAdmin && (
                        <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium">
                          Admin
                        </span>
                      )}
                      
                      <span 
                        className={`
                          px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200
                          ${typeInfo.color}
                          ${comment.content_type === 'image' ? 'hover:scale-105 hover:shadow-md' : ''}
                        `}
                        onClick={(e) => {
                          console.log('🖼️ Image badge clicked:', {
                            contentType: comment.content_type,
                            imageUrl: comment.image_url,
                            commentId: comment.id
                          });
                          e.stopPropagation();
                          if (comment.content_type === 'image' && comment.image_url) {
                            console.log('✅ Opening image modal for:', comment.image_url);
                            setShowImageModal(true);
                          } else {
                            console.log('❌ Cannot open modal - missing image data');
                          }
                        }}
                      >
                        {typeInfo.label}
                      </span>
                    </div>
                  </div>
                  
                  {/* Timestamp */}
                  <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                    
                    {comment.updated_at !== comment.created_at && (
                      <span className="flex items-center space-x-1">
                        <Edit2 className="w-3 h-3" />
                        <span>edited</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Menu */}
              {showActions && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(!showMenu);
                    }}
                    className={`
                      p-2 rounded-lg transition-all duration-200 
                      ${showMenu 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                      <div 
                        className="py-1"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#d1d5db transparent'
                        }}
                      >
                        <button
                          onClick={() => {
                            onReply(comment);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                        >
                          <Reply className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">Reply</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            onEdit(comment);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">Edit</span>
                        </button>
                        
                        {/* Resolve Button - only show for active comments */}
                        {comment.status === 'active' && (
                          <button
                            onClick={() => {
                              setShowResolutionDialog(true);
                              setShowMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center space-x-2 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Resolve</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            onDelete(comment.id);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="font-medium">Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Main Comment Content */}
            <div className="mb-4">
              {renderCommentContent()}

            </div>

            {/* Replies Section - render inside the same card */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <MessageCircle className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {comment.replies.length} {comment.replies.length === 1 ? 'Reply' : 'Replies'}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      {/* Reply Content */}
                      <div className="flex items-start space-x-3">
                        {/* Reply Avatar */}
                        <div className={`
                          relative w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0
                          ${reply.user?.isAdmin 
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                            : 'bg-gradient-to-br from-green-500 to-green-600'
                          }
                        `}>
                          {reply.user?.name?.charAt(0)?.toUpperCase() || reply.user?.email?.charAt(0)?.toUpperCase() || '?'}
                          {reply.user?.isAdmin && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                              <span className="text-xs">👑</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Reply Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {reply.user?.name || reply.user?.email || 'Anonymous User'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              reply.content_type === 'image' 
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            }`}>
                              {reply.content_type === 'image' ? '🖼 Image Reply' : 'Reply'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(reply.created_at)}
                            </span>
                          </div>
                          
                          {/* Reply Content - Image Support */}
                          <div className="mb-2">
                            {/* Image Content */}
                            {reply.content_type === 'image' && reply.image_url && (
                              <div className="mb-2">
                                <div className="relative inline-block max-w-full">
                                  <img
                                    src={reply.image_url}
                                    alt={reply.content || 'Reply image'}
                                    className="max-w-full max-h-64 rounded-lg object-cover shadow-sm border border-gray-200 dark:border-gray-600"
                                    style={{ maxWidth: '100%', height: 'auto' }}
                                  />
                                </div>
                                {/* Image Caption */}
                                {reply.content && reply.content !== `Image: ${reply.content}` && (
                                  <div className="mt-1">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                                      {reply.content}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Text Content */}
                            {reply.content_type !== 'image' && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {reply.content}
                              </p>
                            )}
                          </div>
                          
                          {/* Reply Actions */}
                          {showActions && (
                            <div className="flex items-center space-x-3 mt-2">
                              <button
                                onClick={() => onReply(reply)}
                                className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                              >
                                Reply
                              </button>
                              <button
                                onClick={() => onEdit(reply)}
                                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => onDelete(reply.id)}
                                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            {showActions && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                <button
                  onClick={() => onReply(comment)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  <span className="text-sm font-medium">Reply</span>
                </button>
                
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  ID: {comment.id.slice(-8)}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // This is a nested reply (shouldn't happen with new structure, but keeping for safety)
        <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Nested reply: {comment.content}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && comment.content_type === 'image' && comment.image_url && (
        <BaseModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          title="Comment Image"
          size="xl"
          theme="dark"
        >
          {/* User info */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Image className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {comment.user?.name || 'User'} • {new Date(comment.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="space-y-4">
            {/* Image */}
            <div className="flex justify-center">
              <img
                src={comment.image_url}
                alt="Comment attachment"
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Comment Text */}
            {comment.content && comment.content.trim() && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Comment:</h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            )}
          </div>
        </BaseModal>
      )}

      {/* Resolution Dialog Modal */}
      {showResolutionDialog && (
        <BaseModal
          isOpen={showResolutionDialog}
          onClose={() => {
            setShowResolutionDialog(false);
            setSelectedTemplate('');
            setCustomReason('');
          }}
          title="Resolve Comment"
          size="md"
          theme="dark"
        >
          <div className="space-y-6">
            {/* Resolution Templates */}
            <div>
              <h4 className="text-sm font-medium text-white mb-3">
                Choose Resolution Reason:
              </h4>
              <div className="space-y-2">
                {resolutionTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedTemplate === template.id
                        ? 'border-green-500 bg-green-900/30 text-green-300'
                        : 'border-gray-600 hover:border-gray-500 text-gray-100 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="font-medium text-white">{template.label}</div>
                    <div className="text-sm text-gray-300 mt-1">
                      {template.reason}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Custom Reason (Optional):
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter a custom resolution reason..."
                className="w-full h-20 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowResolutionDialog(false);
                  setSelectedTemplate('');
                  setCustomReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveWithTemplate}
                disabled={!selectedTemplate && !customReason.trim()}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedTemplate || customReason.trim()
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Resolve Comment</span>
                </div>
              </button>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
}; 