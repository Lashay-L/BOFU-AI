import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  RefreshCw,
  FileText,
  Grid3X3,
  List,
  BarChart3
} from 'lucide-react';
import { ContentBrief } from '../../../types/contentBrief';
import { CompanyGroup, UserProfile, ArticleTrackingData, AdminArticleTrackerProps } from './types';
import { ArticleTrackingTable } from '../../user-dashboard/ArticleTrackingTable';

type ViewMode = 'table' | 'cards';
type SortField = 'lastModified' | 'status' | 'productName' | 'progress';
type SortOrder = 'asc' | 'desc';

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'from-gray-400 to-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    textColor: 'text-gray-600 dark:text-gray-400',
    icon: FileText,
    progress: 25
  },
  pending: {
    label: 'In Review',
    color: 'from-yellow-400 to-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    icon: FileText,
    progress: 65
  },
  approved: {
    label: 'Approved',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: FileText,
    progress: 90
  },
  published: {
    label: 'Published',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-400',
    icon: FileText,
    progress: 100
  }
};

const PRODUCT_COLORS = [
  'from-rose-500 to-pink-600',
  'from-blue-500 to-cyan-600', 
  'from-green-500 to-emerald-600',
  'from-purple-500 to-violet-600',
  'from-orange-500 to-red-600',
  'from-teal-500 to-blue-600',
  'from-indigo-500 to-purple-600',
  'from-yellow-500 to-orange-600'
];

export function AdminArticleTracker({
  contentBriefs,
  companyGroup,
  isLoading,
  onRefreshData
}: AdminArticleTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('lastModified');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());

  // Transform ContentBrief data to ArticleTrackingData format
  const transformedArticles = useMemo(() => {
    if (!contentBriefs) return [];

    return contentBriefs
      .filter(brief => brief.brief_content && brief.brief_content !== '{}')
      .map((brief: ContentBrief) => {
        // Find which user created this brief
        const briefCreator = companyGroup.main_account.id === brief.user_id 
          ? companyGroup.main_account 
          : companyGroup.sub_accounts.find((sub: UserProfile) => sub.id === brief.user_id);

        const briefContent = typeof brief.brief_content === 'string' 
          ? JSON.parse(brief.brief_content) 
          : brief.brief_content;

        // Extract article title
        let articleTitle = 'Untitled Article';
        if (brief.title?.trim()) {
          // Clean title logic - remove any ID suffixes
          const cleanTitle = brief.title
            .replace(/\s*-\s*Brief\s+[a-z0-9]{8,}$/i, '')
            .replace(/\s*-\s*Content Brief\s+[a-z0-9]{8,}$/i, '')
            .replace(/\s*-\s*Content Brief$/i, '')
            .trim();
          if (cleanTitle) {
            articleTitle = cleanTitle;
          }
        } else if (brief.possible_article_titles) {
          const titles = typeof brief.possible_article_titles === 'string' 
            ? brief.possible_article_titles 
            : brief.possible_article_titles.join('\n');
          const match = titles.match(/^1\.\s*(.*?)(?:\n2\.|$)/);
          if (match && match[1]) {
            articleTitle = match[1].trim();
          }
        } else if (briefContent?.keywords && briefContent.keywords.length > 0) {
          const firstKeyword = briefContent.keywords[0].replace(/[`'"]/g, '').trim();
          const cleanKeyword = firstKeyword.replace(/^\/|\/$|^https?:\/\//, '').replace(/[-_]/g, ' ');
          articleTitle = `${cleanKeyword} - Article`;
        }

        // Extract keywords
        const keywords = briefContent?.keywords || [];

        // Check if article has been generated (has content)
        const hasArticleContent = brief.article_content && brief.article_content.trim().length > 0;
        
        return {
          id: brief.id,
          productName: brief.product_name || 'Unknown Product',
          articleTitle,
          briefLink: `/admin/content-management/briefs/${brief.id}`, // Admin-specific link
          articleLink: hasArticleContent ? `/admin/content-management/articles/${brief.id}` : undefined,
          status: brief.status as 'draft' | 'pending' | 'approved' | 'published',
          progress: STATUS_CONFIG[brief.status as keyof typeof STATUS_CONFIG]?.progress || 0,
          lastModified: brief.updated_at,
          keywords: Array.isArray(keywords) ? keywords.slice(0, 3) : [],
          category: brief.product_name || 'General',
          author: briefCreator?.email || briefCreator?.profile_name || 'Unknown User',
          estimatedReadTime: Math.ceil((brief.article_content?.length || 0) / 200),
          qualityScore: hasArticleContent ? Math.floor(Math.random() * 30) + 70 : undefined
        };
      });
  }, [contentBriefs, companyGroup]);

  // Filter and sort articles
  const filteredAndSortedArticles = useMemo(() => {
    let filtered = transformedArticles;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(article =>
        article.articleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(article => article.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        case 'lastModified':
          aValue = new Date(a.lastModified).getTime();
          bValue = new Date(b.lastModified).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'productName':
          aValue = a.productName.toLowerCase();
          bValue = b.productName.toLowerCase();
          break;
        case 'progress':
          aValue = a.progress;
          bValue = b.progress;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [transformedArticles, searchTerm, statusFilter, sortField, sortOrder]);

  // Generate color for product name
  const getProductColor = (productName: string) => {
    const hash = productName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return PRODUCT_COLORS[Math.abs(hash) % PRODUCT_COLORS.length];
  };

  // Handle selection
  const handleSelectArticle = (id: string) => {
    const newSelection = new Set(selectedArticles);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedArticles(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedArticles.size === filteredAndSortedArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(filteredAndSortedArticles.map(a => a.id)));
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortOrder('desc');
    }
  };

  const stats = {
    total: transformedArticles.length,
    inProgress: transformedArticles.filter(a => a.status === 'pending').length,
    completed: transformedArticles.filter(a => a.status === 'approved').length,
    published: transformedArticles.filter(a => a.status === 'published').length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-blue-400" />
          <div>
            <h3 className="text-xl font-semibold text-white">Article Tracking Overview</h3>
            <p className="text-gray-400 text-sm">Track your content creation from product research to published article</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRefreshData}
            disabled={isLoading}
            className="p-2 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw size={18} className={`text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>
          <div className="flex items-center gap-1 bg-gray-700/40 rounded-lg p-1 border border-gray-600/30">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-600/50'
              }`}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'cards'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-600/50'
              }`}
              title="Cards View"
            >
              <Grid3X3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-gray-400 text-sm">Total Articles</div>
        </div>
        <div className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30">
          <div className="text-2xl font-bold text-yellow-400">{stats.inProgress}</div>
          <div className="text-gray-400 text-sm">In Review</div>
        </div>
        <div className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30">
          <div className="text-2xl font-bold text-blue-400">{stats.completed}</div>
          <div className="text-gray-400 text-sm">Approved</div>
        </div>
        <div className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30">
          <div className="text-2xl font-bold text-green-400">{stats.published}</div>
          <div className="text-gray-400 text-sm">Published</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search articles, products, keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700/40 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/60 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700/40 border border-gray-600/30 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/60 transition-colors"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">In Review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
        </select>
      </div>

      {/* Article Table */}
      {filteredAndSortedArticles.length > 0 ? (
        <div className="dark">
          <div className="[&_table]:bg-transparent [&_thead]:bg-gray-900/50 [&_tbody]:bg-transparent [&_tr]:bg-transparent [&_tr:hover]:bg-gray-700/30 [&_.text-gray-400]:!text-white [&_.text-gray-500]:!text-white [&_.text-gray-600]:!text-white [&_.bg-gray-100]:!bg-gray-700/50 [&_.bg-gray-800]:!bg-gray-700/50 [&_.text-gray-300]:!text-white [&_.bg-gray-50]:!bg-gray-700/70 [&_.bg-gray-800\/50]:!bg-gray-700/70 [&_.text-gray-900]:!text-white [&_.text-gray-100]:!text-white [&_p]:!text-white [&_h4]:!text-white [&_div]:!text-gray-100">
            <ArticleTrackingTable
              articles={filteredAndSortedArticles}
              viewMode={viewMode}
              selectedArticles={selectedArticles}
              onSelectArticle={handleSelectArticle}
              onSelectAll={handleSelectAll}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleSort}
              getProductColor={getProductColor}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">
            {searchTerm || statusFilter !== 'all' 
              ? 'No articles match your current filters' 
              : 'No content briefs found for this company'
            }
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria' 
              : 'Content briefs will appear here once users create them'
            }
          </p>
        </div>
      )}
    </motion.div>
  );
}