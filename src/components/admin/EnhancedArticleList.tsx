import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  User,
  Clock,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Users,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminArticlesApi } from '../../lib/adminApi';
import type { 
  ArticleListItem, 
  ArticleListParams, 
  UserProfile,
  AdminArticlesResponse 
} from '../../types/adminApi';
import { toast } from 'react-hot-toast';
import { ArticleCard } from './ArticleCard';
import { unifiedArticleService } from '../../lib/unifiedArticleApi';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

interface EnhancedArticleListProps {
  selectedUser?: UserProfile | null;
  onArticleSelect?: (article: ArticleListItem) => void;
  onEditArticle?: (article: ArticleListItem) => void;
  className?: string;
}

type SortField = 'last_edited_at' | 'created_at' | 'title' | 'editing_status';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'draft' | 'editing' | 'review' | 'final' | 'published';
type ViewMode = 'grid' | 'list';

const STATUS_COLORS = {
  all: 'bg-gray-100 text-gray-800',
  draft: 'bg-gray-100 text-gray-800',
  editing: 'bg-amber-100 text-amber-800',
  review: 'bg-blue-100 text-blue-800',
  final: 'bg-emerald-100 text-emerald-800',
  published: 'bg-green-100 text-green-800'
};

const STATUS_LABELS = {
  all: 'All Articles',
  draft: 'Drafts',
  editing: 'In Progress',
  review: 'Under Review',
  final: 'Final',
  published: 'Published'
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const EnhancedArticleList: React.FC<EnhancedArticleListProps> = ({
  selectedUser,
  onArticleSelect,
  onEditArticle,
  className = ''
}) => {
  // State
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortField, setSortField] = useState<SortField>('last_edited_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState(12); // Optimized for grid layout
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Delete functionality state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<ArticleListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch articles function
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);

    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Request timeout - please try again');
      toast.error('Request timed out. Please check your connection and try again.');
    }, 30000);

    try {
      const params: ArticleListParams = {
        page: currentPage,
        limit: pageSize,
        sort_by: sortField,
        sort_order: sortOrder
      };

      if (searchTerm.trim()) {
        params.search = searchTerm;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (selectedUser) {
        params.user_id = selectedUser.id;
      }

      if (dateRange.start) {
        params.start_date = dateRange.start;
      }
      if (dateRange.end) {
        params.end_date = dateRange.end;
      }

      const { data, error } = await adminArticlesApi.getArticles(params);

      clearTimeout(timeoutId);

      if (error) {
        setError(error.error);
        toast.error(`Failed to load articles: ${error.error}`);
      } else if (data) {
        setArticles(data.articles);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
        setCurrentPage(data.page);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to load articles';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, dateRange, sortField, sortOrder, selectedUser]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => {
      setCurrentPage(1);
      fetchArticles();
    }, 300),
    [fetchArticles]
  );

  // Effects
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    debouncedSearch();
  }, [searchTerm, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateRange, selectedUser, sortField, sortOrder]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
    setSortField('last_edited_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Delete handlers
  const handleDeleteClick = (article: ArticleListItem) => {
    setArticleToDelete(article);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!articleToDelete) return;

    setIsDeleting(true);
    try {
      const result = await unifiedArticleService.deleteArticle(articleToDelete.id);
      
      if (result.success) {
        // Remove the article from the local state
        setArticles(prev => prev.filter(article => article.id !== articleToDelete.id));
        toast.success(`Article "${articleToDelete.title}" has been deleted`);
        setDeleteConfirmOpen(false);
        setArticleToDelete(null);
        // Refresh the list to get updated counts
        fetchArticles();
      } else {
        toast.error(result.error || 'Failed to delete article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('An unexpected error occurred while deleting the article');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setArticleToDelete(null);
  };

  // Get status counts (mock for now)
  const getStatusCounts = () => {
    const counts = {
      all: totalItems,
      draft: Math.ceil(totalItems * 0.3),
      editing: Math.ceil(totalItems * 0.4),
      review: Math.ceil(totalItems * 0.2),
      final: Math.ceil(totalItems * 0.07),
      published: Math.ceil(totalItems * 0.03)
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className={`bg-gray-50 rounded-xl ${className}`}>
      {/* Header Section */}
      <div className="bg-white rounded-t-xl border-b border-gray-200">
        <div className="px-6 py-6">
          {/* Title and User Info */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedUser ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {selectedUser.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span>Articles by {selectedUser.email}</span>
                      <p className="text-sm text-gray-500 font-normal">{selectedUser.company_name}</p>
                    </div>
                  </div>
                ) : (
                  'All Articles'
                )}
              </h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>{totalItems} total articles</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>6 contributors</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>12 this week</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white shadow-sm text-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid view"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white shadow-sm text-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                  showFilters 
                    ? 'border-blue-300 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
              
              <button
                onClick={fetchArticles}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as StatusFilter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? `${STATUS_COLORS[status as StatusFilter]} shadow-sm`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{label}</span>
                <span className="bg-white/80 px-2 py-0.5 rounded-full text-xs">
                  {statusCounts[status as keyof typeof statusCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 bg-gray-50"
            >
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Articles
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by title, content..."
                        className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort By
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={sortField}
                        onChange={(e) => setSortField(e.target.value as SortField)}
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        <option value="last_edited_at">Last Edited</option>
                        <option value="created_at">Created Date</option>
                        <option value="title">Title</option>
                        <option value="editing_status">Status</option>
                      </select>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all"
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                      >
                        {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Range
                    </label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear all filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
              <p className="text-gray-600">Loading articles...</p>
              <p className="text-sm text-gray-400 mt-1">This may take a moment</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-red-400 mb-4" />
              <p className="text-red-600 mb-2">{error}</p>
              <button
                onClick={fetchArticles}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-500 mb-4">
                {(searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end) 
                  ? 'Try adjusting your filters or search terms'
                  : 'Get started by creating your first article'
                }
              </p>
              {(searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end) && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Articles Grid */}
            <motion.div 
              layout
              className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}
            >
              {articles.map((article, index) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onArticleSelect={onArticleSelect}
                  onEditArticle={onEditArticle}
                  onDeleteArticle={handleDeleteClick}
                  className={viewMode === 'list' ? 'max-w-none' : ''}
                  index={index}
                />
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-6 py-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700">Show:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                  <span className="text-sm text-gray-700">per page</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
                  </span>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <span className="px-3 py-1 text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                      className="p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Article"
        message={
          articleToDelete
            ? `Are you sure you want to delete the article "${articleToDelete.title}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Article"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}; 