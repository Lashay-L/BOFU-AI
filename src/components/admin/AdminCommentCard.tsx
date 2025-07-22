import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminArticleComment, CommentPriority, AdminCommentType, ApprovalStatus } from '../../types/adminComment';
import { PRIORITY_LEVELS, ADMIN_COMMENT_TYPES } from '../../types/adminComment';
import { approveComment, rejectComment, updateCommentsPriority } from '../../lib/adminCommentApi';
import { ArticleNavigation, ArticleInfo } from '../../lib/articleNavigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Check,
  Clock,
  AlertTriangle,
  Shield,
  MessageSquare,
  User,
  Calendar,
  ChevronDown,
  Star,
  CheckCircle,
  XCircle,
  Edit3,
  MoreHorizontal,
  Flag,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send,
  Lock,
  Settings,
  ArrowRight,
  Archive,
  ExternalLink,
  FileText,
  Building,
  AlertCircle
} from 'lucide-react';

interface AdminCommentCardProps {
  comment: AdminArticleComment;
  onUpdate?: () => void;
  showArticleInfo?: boolean;
  isSelected?: boolean;
  onSelect?: (commentId: string, selected: boolean) => void;
}

interface ExtendedComment extends AdminArticleComment {
  articleInfo?: ArticleInfo;
}

export const AdminCommentCard: React.FC<AdminCommentCardProps> = ({
  comment,
  onUpdate,
  showArticleInfo = false,
  isSelected = false,
  onSelect
}) => {
  const navigate = useNavigate();
  const [articleInfo, setArticleInfo] = useState<ArticleInfo | null>(null);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  // Fetch article information
  useEffect(() => {
    const fetchArticleInfo = async () => {
      if (!comment.article_id) return;
      
      setIsLoadingArticle(true);
      try {
        const info = await ArticleNavigation.getArticleInfo(comment.article_id);
        setArticleInfo(info);
      } catch (error) {
        console.error('Error fetching article info:', error);
      } finally {
        setIsLoadingArticle(false);
      }
    };

    fetchArticleInfo();
  }, [comment.article_id]);

  const priorityConfig = PRIORITY_LEVELS[comment.priority];
  const typeConfig = comment.admin_comment_type ? ADMIN_COMMENT_TYPES[comment.admin_comment_type] : null;

  const handleApprove = async () => {
    if (!showApprovalForm) {
      setShowApprovalForm(true);
      return;
    }

    setIsApproving(true);
    try {
      await approveComment(comment.id, approvalComments);
      setShowApprovalForm(false);
      setApprovalComments('');
      onUpdate?.();
    } catch (error) {
      console.error('Error approving comment:', error);
      alert('Failed to approve comment');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setIsRejecting(true);
    try {
      await rejectComment(comment.id, rejectionReason);
      setRejectionReason('');
      onUpdate?.();
    } catch (error) {
      console.error('Error rejecting comment:', error);
      alert('Failed to reject comment');
    } finally {
      setIsRejecting(false);
    }
  };

  const handlePriorityChange = async (newPriority: CommentPriority) => {
    setIsUpdatingPriority(true);
    try {
      await updateCommentsPriority([comment.id], newPriority);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Failed to update priority');
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const handleNavigateToArticle = async () => {
    if (!comment.article_id) return;
    
    setNavigationError(null);
    await ArticleNavigation.navigateToArticle(
      comment.article_id,
      navigate,
      setNavigationError
    );
  };


  const getStatusBadge = (status: string) => {
    const configs = {
      active: { 
        label: 'Active', 
        className: 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200',
        icon: CheckCircle
      },
      resolved: { 
        label: 'Resolved', 
        className: 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200',
        icon: Check
      },
      archived: { 
        label: 'Archived', 
        className: 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200',
        icon: Archive
      }
    };
    const config = configs[status as keyof typeof configs] || configs.active;
    const IconComponent = config.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full backdrop-blur-sm ${config.className}`}
      >
        <IconComponent className="h-3 w-3" />
        <span>{config.label}</span>
      </motion.div>
    );
  };

  const getApprovalStatusBadge = (status?: ApprovalStatus) => {
    if (!status) return null;

    const configs = {
      pending: { 
        label: 'Pending', 
        className: 'bg-gradient-to-r from-yellow-100 to-amber-50 text-yellow-800 border border-yellow-200',
        icon: Clock
      },
      approved: { 
        label: 'Approved', 
        className: 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-800 border border-green-200',
        icon: CheckCircle
      },
      rejected: { 
        label: 'Rejected', 
        className: 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200',
        icon: XCircle
      },
      requires_changes: { 
        label: 'Needs Changes', 
        className: 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200',
        icon: AlertTriangle
      },
      escalated: { 
        label: 'Escalated', 
        className: 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200',
        icon: Flag
      }
    };
    
    const config = configs[status];
    const IconComponent = config.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full backdrop-blur-sm ${config.className}`}
      >
        <IconComponent className="h-3 w-3" />
        <span>{config.label}</span>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -8,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        transition: { duration: 0.2 }
      }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative bg-white/80 backdrop-blur-3xl rounded-3xl border border-gray-200/40 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden ${
        isSelected 
          ? 'ring-2 ring-blue-500/30 border-blue-400/50 shadow-blue-500/20' 
          : 'hover:border-gray-300/60'
      }`}
    >
      {/* Sophisticated Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-gray-50/30 to-white/90 rounded-3xl"></div>
      
      {/* Elegant Glow Effects */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-gradient-to-r from-blue-500/5 via-purple-500/10 to-blue-500/5 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 h-32 bg-gradient-to-tl from-indigo-500/5 to-transparent blur-2xl"></div>
      </div>

      {/* Priority Left Accent */}
      <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full ${priorityConfig.bgColor.replace('bg-', 'bg-gradient-to-b from-').replace('/20', '/60 to-').replace(' ', '/40 ')}`}></div>

      <div className="relative z-10 p-3">
        {/* Elegant Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Selection Checkbox */}
            {onSelect && (
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onSelect(comment.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-2 border-gray-300 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
              </motion.div>
            )}
            
            {/* Refined User Avatar */}
            <motion.div 
              whileHover={{ scale: 1.02, rotate: 2 }}
              className="relative"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md shadow-purple-500/20">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full shadow-sm"></div>
            </motion.div>
            
            {/* Compact User Info */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm tracking-tight">
                  {comment.user?.email?.split('@')[0] || 'Unknown User'}
                </h3>
                <span className="text-xs text-gray-500 font-medium">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              
              {/* Priority & Type Badges */}
              <div className="flex items-center gap-1">
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`px-1.5 py-0.5 text-xs font-medium rounded-md ${priorityConfig.bgColor} ${priorityConfig.color}`}
                >
                  {priorityConfig.icon} {priorityConfig.label}
                </motion.span>
                
                {typeConfig && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`px-1.5 py-0.5 text-xs font-medium rounded-md ${typeConfig.bgColor} ${typeConfig.color}`}
                  >
                    {typeConfig.icon} {typeConfig.label}
                  </motion.span>
                )}

                {comment.is_admin_only && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-md border border-purple-200/50"
                  >
                    <Lock className="h-2.5 w-2.5" />
                    <span className="text-xs font-medium">Private</span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            {getStatusBadge(comment.status)}
            {getApprovalStatusBadge(comment.approval_status)}
          </div>
        </div>

        {/* Article Context - Elevated Design */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-3 relative"
        >
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-3 border border-gray-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white rounded-md shadow-sm">
                  <FileText className="h-3 w-3 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">Article Context</h4>
                  <p className="text-xs text-gray-600">Related content information</p>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNavigateToArticle}
                className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-black font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-200"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="text-xs">Open Article</span>
              </motion.button>
            </div>

            {isLoadingArticle ? (
              <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-md">
                <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="text-xs text-indigo-700 font-medium">Loading...</span>
              </div>
            ) : articleInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-white/80 rounded-md p-2 border border-gray-200/50">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</span>
                  </div>
                  <h5 className="font-bold text-gray-900 text-xs leading-tight">{articleInfo.title}</h5>
                </div>
                
                {articleInfo.product_name && (
                  <div className="bg-white/80 rounded-md p-2 border border-gray-200/50">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</span>
                    </div>
                    <h5 className="font-bold text-gray-900 text-xs">{articleInfo.product_name}</h5>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md border border-red-200">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-xs text-red-700 font-medium">Unable to load article</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Comment Content - Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-3"
        >
          <div className="bg-white/90 rounded-lg p-3 shadow-md border border-gray-200/60">
            <div className="flex items-start gap-2 mb-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md shadow-md">
                <MessageSquare className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-xs mb-0.5">User Feedback</h4>
                <p className="text-xs text-gray-600 font-medium">Original comment content</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-md p-2 border border-gray-200/50">
              <blockquote className="text-gray-800 leading-relaxed text-xs font-medium italic">
                "{comment.content}"
              </blockquote>
            </div>
          </div>
        </motion.div>
        
        {/* Admin Notes - Refined */}
        {comment.admin_notes && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-3"
          >
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-2 border-l-2 border-amber-400 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-amber-100 rounded-md">
                  <Shield className="h-3 w-3 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900 text-xs mb-0.5">Internal Notes</h4>
                  <p className="text-amber-800 leading-relaxed font-medium text-xs">
                    {comment.admin_notes}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Elegant Approval Actions */}
        <AnimatePresence>
          {comment.approval_status === 'pending' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-3 border border-gray-200/60"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 bg-orange-100 rounded-md">
                  <Clock className="h-3 w-3 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">Awaiting Review</h4>
                  <p className="text-xs text-gray-600">This comment requires approval</p>
                </div>
              </div>

              {!showApprovalForm && !isRejecting ? (
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleApprove}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-black font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span className="text-xs">Approve</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsRejecting(!isRejecting)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-black font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <XCircle className="h-3 w-3" />
                    <span className="text-xs">Changes</span>
                  </motion.button>
                </div>
              ) : showApprovalForm ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-2 bg-emerald-50 rounded-md p-2 border border-emerald-200"
                >
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle className="h-3 w-3 text-emerald-600" />
                    <span className="font-bold text-emerald-800 text-xs">Approval Notes</span>
                  </div>
                  
                  <textarea
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder="Add optional approval notes..."
                    className="w-full p-2 border border-emerald-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-200 bg-white/80 text-xs"
                    rows={2}
                  />
                  
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-md transition-all duration-200 text-xs"
                    >
                      {isApproving ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      {isApproving ? 'Approving...' : 'Confirm'}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowApprovalForm(false)}
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md transition-all duration-200 text-xs"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              ) : isRejecting ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-2 bg-red-50 rounded-md p-2 border border-red-200"
                >
                  <div className="flex items-center gap-1 mb-1">
                    <XCircle className="h-3 w-3 text-red-600" />
                    <span className="font-bold text-red-800 text-xs">Request Changes</span>
                  </div>
                  
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain what changes are needed..."
                    className="w-full p-2 border border-red-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500/30 focus:border-red-500 transition-all duration-200 bg-white/80 text-xs"
                    rows={2}
                    required
                  />
                  
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReject}
                      disabled={isRejecting || !rejectionReason.trim()}
                      className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-md transition-all duration-200 text-xs"
                    >
                      {isRejecting ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      {isRejecting ? 'Sending...' : 'Send Request'}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsRejecting(false)}
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md transition-all duration-200 text-xs"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions Footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between pt-2 border-t border-gray-200/40"
        >
          <div className="flex items-center gap-2">
            {/* Priority Selector - Compact */}
            <div className="relative">
              <select
                value={comment.priority}
                onChange={(e) => handlePriorityChange(e.target.value as CommentPriority)}
                disabled={isUpdatingPriority}
                className="appearance-none bg-white/80 border border-gray-200/60 rounded-md pl-2 pr-4 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {Object.entries(PRIORITY_LEVELS).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 h-2.5 w-2.5 text-gray-400 pointer-events-none" />
              {isUpdatingPriority && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-md">
                  <div className="w-2 h-2 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-500 font-medium">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="p-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-all duration-200 group"
              title="More options"
            >
              <MoreHorizontal className="h-2.5 w-2.5 text-gray-600 group-hover:text-gray-800" />
            </motion.button>
          </div>
        </motion.div>

        {/* Success State - When Approved */}
        {comment.approval_status === 'approved' && comment.approver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-3 p-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border-l-2 border-emerald-400"
          >
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-emerald-100 rounded-md">
                <CheckCircle className="h-3 w-3 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-emerald-900 text-xs mb-0.5">Comment Approved</h4>
                <p className="text-emerald-700 font-medium text-xs">
                  Approved by <span className="font-bold">{comment.approver.email.split('@')[0]}</span>
                  {comment.approved_at && (
                    <span className="text-emerald-600"> • {formatDistanceToNow(new Date(comment.approved_at), { addSuffix: true })}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5 text-emerald-500 fill-current" />
                <Star className="h-2 w-2 text-emerald-400 fill-current" />
                <Star className="h-1.5 w-1.5 text-emerald-300 fill-current" />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}; 