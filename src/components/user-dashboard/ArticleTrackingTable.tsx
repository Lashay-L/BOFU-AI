import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExternalLink,
  Edit3,
  Eye,
  MoreVertical,
  CheckCircle,
  Clock,
  FileText,
  Globe,
  Star,
  Calendar,
  User,
  Tag,
  ChevronDown,
  ChevronUp,
  ArrowUpRight
} from 'lucide-react';

interface ArticleTrackingData {
  id: string;
  productName: string;
  articleTitle: string;
  briefLink: string;
  articleLink?: string;
  status: 'draft' | 'pending' | 'approved' | 'published';
  progress: number;
  lastModified: string;
  keywords: string[];
  category: string;
  author: string;
  estimatedReadTime?: number;
  qualityScore?: number;
}

interface ArticleTrackingTableProps {
  articles: ArticleTrackingData[];
  viewMode: 'table' | 'cards';
  selectedArticles: Set<string>;
  onSelectArticle: (id: string) => void;
  onSelectAll: () => void;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  getProductColor: (productName: string) => string;
}

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
    icon: FileText,
    progress: 25
  },
  pending: {
    label: 'In Review',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-300',
    icon: Clock,
    progress: 65
  },
  approved: {
    label: 'Approved',
    color: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    icon: CheckCircle,
    progress: 90
  },
  published: {
    label: 'Published',
    color: 'from-blue-500 to-purple-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    icon: Globe,
    progress: 100
  }
};

export function ArticleTrackingTable({
  articles,
  viewMode,
  selectedArticles,
  onSelectArticle,
  onSelectAll,
  sortField,
  sortOrder,
  onSort,
  getProductColor
}: ArticleTrackingTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const SortIndicator: React.FC<{ field: string }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const ProgressRing: React.FC<{ progress: number; size?: number }> = ({ progress, size = 40 }) => {
    const radius = (size - 8) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            className="text-blue-600 dark:text-blue-400 transition-all duration-300"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
          {progress}%
        </span>
      </div>
    );
  };

  const ActionMenu: React.FC<{ article: ArticleTrackingData }> = ({ article }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
            >
              <div className="py-1">
                <a
                  href={article.briefLink}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit3 className="w-4 h-4 mr-3" />
                  Edit Brief
                </a>
                {article.articleLink ? (
                  <a
                    href={article.articleLink}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit3 className="w-4 h-4 mr-3" />
                    Edit Article
                  </a>
                ) : (
                  <div className="flex items-center px-4 py-2 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed">
                    <Edit3 className="w-4 h-4 mr-3 opacity-50" />
                    <span>Edit Article</span>
                    <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      Not Generated
                    </span>
                  </div>
                )}
                {article.articleLink && (
                  <a
                    href={article.articleLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-3" />
                    View Article
                  </a>
                )}
                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Eye className="w-4 h-4 mr-3" />
                  Preview
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  };

  if (viewMode === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {articles.map((article, index) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative"
          >
            <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              {/* Card Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getProductColor(article.productName)} text-white`}>
                    {article.productName}
                  </div>
                  <div className="flex items-center space-x-2">
                    <ProgressRing progress={article.progress} size={32} />
                    <ActionMenu article={article} />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                  {article.articleTitle}
                </h3>

                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[article.status].bgColor} ${STATUS_CONFIG[article.status].textColor} mb-3`}>
                  {React.createElement(STATUS_CONFIG[article.status].icon, { className: 'w-3 h-3 mr-1' })}
                  {STATUS_CONFIG[article.status].label}
                </div>

                {article.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {article.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(article.lastModified)}
                  </div>
                  {article.qualityScore && (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-1 text-yellow-500" />
                      {article.qualityScore}%
                    </div>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 gap-2">
                  {/* First row: Brief and Article editing */}
                  <div className="flex space-x-2">
                    <a
                      href={article.briefLink}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Brief
                    </a>
                    {article.articleLink ? (
                      <a
                        href={article.articleLink}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30 transition-colors"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Article
                      </a>
                    ) : (
                      <div className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed">
                        <FileText className="w-4 h-4 mr-2" />
                        Article Not Generated
                      </div>
                    )}
                  </div>
                  
                  {/* Second row: View article */}
                  {article.articleLink ? (
                    <a
                      href={article.articleLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-purple-700 dark:text-purple-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      View Published Article
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  ) : (
                    <div className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-gray-400 bg-gray-100 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed">
                      <Globe className="w-4 h-4 mr-2 opacity-50" />
                      <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                        Pending Generation
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Table View
  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedArticles.size === articles.length && articles.length > 0}
                  onChange={onSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => onSort('productName')}
              >
                <div className="flex items-center">
                  Product
                  <SortIndicator field="productName" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => onSort('articleTitle')}
              >
                <div className="flex items-center">
                  Article Title
                  <SortIndicator field="articleTitle" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Brief Link
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Edit Article
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                View Article
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIndicator field="status" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => onSort('lastModified')}
              >
                <div className="flex items-center">
                  Last Modified
                  <SortIndicator field="lastModified" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {articles.map((article, index) => (
              <React.Fragment key={article.id}>
                <motion.tr
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedArticles.has(article.id)}
                      onChange={() => onSelectArticle(article.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getProductColor(article.productName)} text-white shadow-sm`}>
                      {article.productName}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {article.articleTitle}
                        </p>
                        {article.keywords.length > 0 && (
                          <div className="flex items-center mt-1 space-x-1">
                            {article.keywords.slice(0, 2).map((keyword, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                              >
                                {keyword}
                              </span>
                            ))}
                            {article.keywords.length > 2 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                +{article.keywords.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleRowExpansion(article.id)}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {expandedRows.has(article.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={article.briefLink}
                      className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit Brief
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </a>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {article.articleLink ? (
                      <a
                        href={article.articleLink}
                        className="inline-flex items-center text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm font-medium"
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit Article
                        <ArrowUpRight className="w-3 h-3 ml-1" />
                      </a>
                    ) : (
                      <div className="inline-flex items-center text-gray-400 dark:text-gray-500 text-sm">
                        <FileText className="w-4 h-4 mr-1" />
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-xs font-medium">
                          Article Not Generated
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {article.articleLink ? (
                      <a
                        href={article.articleLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-medium"
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        View Article
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    ) : (
                      <button 
                        disabled
                        className="inline-flex items-center text-gray-400 dark:text-gray-500 text-sm cursor-not-allowed"
                      >
                        <Globe className="w-4 h-4 mr-1 opacity-50" />
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-xs font-medium">
                          Pending Generation
                        </span>
                      </button>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[article.status].bgColor} ${STATUS_CONFIG[article.status].textColor}`}>
                        {React.createElement(STATUS_CONFIG[article.status].icon, { className: 'w-3 h-3 mr-1' })}
                        {STATUS_CONFIG[article.status].label}
                      </div>
                      <ProgressRing progress={article.progress} size={32} />
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(article.lastModified)}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <ActionMenu article={article} />
                  </td>
                </motion.tr>

                {/* Expanded Row Content */}
                <AnimatePresence>
                  {expandedRows.has(article.id) && (
                    <motion.tr
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50 dark:bg-gray-900/50"
                    >
                      <td colSpan={9} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Keywords</h4>
                            <div className="flex flex-wrap gap-1">
                              {article.keywords.map((keyword, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Metrics</h4>
                            <div className="space-y-1">
                              {article.estimatedReadTime && (
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                  <Clock className="w-4 h-4 mr-2" />
                                  {article.estimatedReadTime} min read
                                </div>
                              )}
                              {article.qualityScore && (
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                  <Star className="w-4 h-4 mr-2" />
                                  Quality: {article.qualityScore}%
                                </div>
                              )}
                              <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <User className="w-4 h-4 mr-2" />
                                {article.author}
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Category</h4>
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <Tag className="w-4 h-4 mr-2" />
                              {article.category}
                            </div>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}