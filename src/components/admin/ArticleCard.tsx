import React, { useState } from 'react';
import { 
  Calendar,
  Edit3,
  ExternalLink,
  CalendarDays,
  Trash2,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { ArticleListItem } from '../../types/adminApi';

interface ArticleCardProps {
  article: ArticleListItem & { content?: string };
  onEditArticle?: (article: ArticleListItem) => void;
  onDeleteArticle?: (article: ArticleListItem) => void;
  className?: string;
  index?: number;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  editing: 'bg-amber-100 text-amber-700',
  review: 'bg-blue-100 text-blue-700',
  final: 'bg-emerald-100 text-emerald-700',
  published: 'bg-green-100 text-green-700'
} as const;

const STATUS_LABELS = {
  draft: 'Draft',
  editing: 'In Progress',
  review: 'Under Review',
  final: 'Final',
  published: 'Published'
} as const;

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onEditArticle,
  onDeleteArticle,
  className = '',
  index = 0
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-in-out overflow-hidden border border-gray-200 flex flex-col h-full ${className}`}
    >
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-2">
          {/* Status badge */}
          <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 ${STATUS_COLORS[article.editing_status]}`}>
            {STATUS_LABELS[article.editing_status]}
          </span>
          
          {/* Version indicator */}
          <span className="text-xs text-gray-400">v{article.article_version}</span>
        </div>

        {/* Product name badge - smaller and less prominent */}
        {article.product_name && (
          <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full mb-2">
            {article.product_name}
          </span>
        )}

        {/* Article Title - more prominent */}
        <h2 className="text-lg font-semibold text-gray-800 mb-2 min-h-[2.5em] leading-tight group-hover:text-blue-600 transition-colors duration-200">
          {article.title || 'Untitled Article'}
        </h2>

        {/* Content Brief Title (First Keyword) */}
        {article.first_keyword && (
          <p className="text-sm text-blue-600 font-medium mb-3 px-2 py-1 bg-blue-50 rounded-md inline-block">
            📝 {article.first_keyword}
          </p>
        )}

        {/* Author info */}
        <div className="text-sm text-gray-600 mb-2">
          <span>{article.user_email}</span>
          {article.user_company && (
            <span className="text-gray-400"> • {article.user_company}</span>
          )}
        </div>
        
        {/* Last updated */}
        <div className="flex items-center text-xs text-gray-500 mt-auto">
          <CalendarDays size={14} className="mr-1.5 text-gray-400" />
          <span>Last updated: {formatDate(article.last_edited_at)}</span>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="bg-gray-50 border-t border-gray-200 p-3 space-y-2">
        <button
          onClick={() => onEditArticle?.(article)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Edit3 size={16} />
          Edit Article (New Editor)
        </button>

        {article.google_doc_url && (
          <button
            onClick={() => window.open(article.google_doc_url, '_blank')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors duration-200"
          >
            <FileText size={16} />
            Open Google Doc
          </button>
        )}

        <button
          onClick={() => onDeleteArticle?.(article)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors duration-200"
        >
          <Trash2 size={16} />
          Clear All Article Data
        </button>
      </div>
    </motion.div>
  );
};
