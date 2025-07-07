import React, { useState } from 'react';
import { 
  Calendar,
  Clock, 
  User,
  FileText,
  Edit,
  Eye,
  MoreVertical,
  ExternalLink,
  Tag,
  TrendingUp,
  MessageSquare,
  Heart,
  Share2,
  ChevronRight,
  Star,
  Users,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { ArticleListItem } from '../../types/adminApi';

interface ArticleCardProps {
  article: ArticleListItem & { content?: string }; // Allow optional content property
  onArticleSelect?: (article: ArticleListItem) => void;
  onEditArticle?: (article: ArticleListItem) => void;
  className?: string;
  index?: number;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  editing: 'bg-amber-50 text-amber-800 border-amber-200',
  review: 'bg-blue-50 text-blue-800 border-blue-200',
  final: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  published: 'bg-green-50 text-green-800 border-green-200'
} as const;

const STATUS_LABELS = {
  draft: 'Draft',
  editing: 'In Progress',
  review: 'Under Review',
  final: 'Final',
  published: 'Published'
} as const;

const STATUS_ICONS = {
  draft: '📝',
  editing: '⚡',
  review: '👁️',
  final: '✅',
  published: '🚀'
} as const;

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onArticleSelect,
  onEditArticle,
  className = '',
  index = 0
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Extract text content from HTML (simple version)
  const extractTextContent = (html: string, maxLength: number = 150) => {
    if (!html) return 'No content available...';
    
    // Remove HTML tags and decode entities
    const textContent = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    if (textContent.length <= maxLength) return textContent;
    return textContent.substring(0, maxLength).trim() + '...';
  };

  // Get initials for avatar
  const getInitials = (email: string) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const contentPreview = extractTextContent(article.content || '');
  const hasContent = contentPreview !== 'No content available...';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/3 group-hover:to-purple-500/3 transition-all duration-300 pointer-events-none" />
      
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${STATUS_COLORS[article.editing_status].replace('bg-', 'bg-gradient-to-r from-').replace('text-', 'to-').split(' ')[0]}-400 to-${STATUS_COLORS[article.editing_status].split(' ')[0].replace('bg-', '')}-500`} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{STATUS_ICONS[article.editing_status]}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[article.editing_status]}`}>
                {STATUS_LABELS[article.editing_status]}
              </span>
              <span className="text-xs text-gray-400">v{article.article_version}</span>
            </div>
            
            <h3 
              className="text-lg font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => onArticleSelect?.(article)}
            >
              {article.title || 'Untitled Article'}
            </h3>
            
            {article.product_name && (
              <div className="flex items-center gap-1 mt-2">
                <Tag className="w-3 h-3 text-blue-500" />
                <span className="text-sm text-blue-600 font-medium">{article.product_name}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onArticleSelect?.(article);
              }}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="View article"
            >
              <Eye className="w-4 h-4" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onEditArticle?.(article);
              }}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              title="Edit article"
            >
              <Edit className="w-4 h-4" />
            </motion.button>
            
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content preview */}
        {hasContent && (
          <div className="mb-4">
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
              {contentPreview}
            </p>
          </div>
        )}

        {/* Author info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {getInitials(article.user_email)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {article.user_email}
            </p>
            {article.user_company && (
              <p className="text-xs text-gray-500 truncate">
                {article.user_company}
              </p>
            )}
          </div>
        </div>

        {/* Metadata and stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>Created {formatDate(article.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Updated {formatDate(article.last_edited_at)}</span>
            </div>
          </div>
          
          {/* Engagement metrics (placeholder for future features) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Activity className="w-3 h-3" />
              <span>ID: {article.id.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText className="w-3 h-3" />
              <span>{hasContent ? 'Has content' : 'Empty draft'}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {/* Future engagement buttons */}
            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
              <Heart className="w-3 h-3" />
              <span>0</span>
            </button>
            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors">
              <MessageSquare className="w-3 h-3" />
              <span>0</span>
            </button>
            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-500 transition-colors">
              <Share2 className="w-3 h-3" />
              <span>Share</span>
            </button>
          </div>

          <motion.button
            whileHover={{ x: 3 }}
            onClick={() => onArticleSelect?.(article)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <span>View details</span>
            <ChevronRight className="w-3 h-3" />
          </motion.button>
        </div>
      </div>

      {/* Hover effect border */}
      <motion.div
        initial={false}
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.8
        }}
        className="absolute inset-0 border-2 border-blue-200 rounded-xl pointer-events-none"
      />
    </motion.div>
  );
}; 