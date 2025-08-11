import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Zap,
  Globe,
  Grid3X3,
  List
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { ContentBrief } from '../../types/contentBrief';
import { ArticleTrackingTable } from './ArticleTrackingTable';
import { toast } from 'react-hot-toast';

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

interface TrackerStats {
  total: number;
  inProgress: number;
  completed: number;
  published: number;
  avgCompletionTime: number;
}

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
    icon: Clock,
    progress: 65
  },
  approved: {
    label: 'Approved',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: CheckCircle,
    progress: 90
  },
  published: {
    label: 'Published',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-400',
    icon: Globe,
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

export function ArticleGenerationTracker() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<ArticleTrackingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('lastModified');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());

  // Fetch and transform data
  useEffect(() => {
    if (user) {
      fetchArticleData();
    }
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Setting up real-time subscription for article tracker...');

    const subscription = supabase
      .channel(`article_tracker_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_briefs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Real-time change detected in article tracker:', payload);
          fetchArticleData();
        }
      )
      .subscribe();

    // Additional subscription specifically for article content updates
    const articleContentSubscription = supabase
      .channel(`article_content_tracker_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_briefs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Real-time article content update in tracker:', payload);
          // Check if article_content, title, or other relevant fields were updated
          if (payload.new && payload.old) {
            const hasContentChange = payload.new.article_content !== payload.old.article_content;
            const hasTitleChange = payload.new.title !== payload.old.title;
            const hasStatusChange = payload.new.status !== payload.old.status;
            
            if (hasContentChange || hasTitleChange || hasStatusChange) {
              console.log('🔄 Article data changed, refreshing tracker...');
              fetchArticleData();
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time subscriptions for article tracker');
      subscription.unsubscribe();
      articleContentSubscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchArticleData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('User ID is not available');
      }

      const { data: briefs, error: briefsError } = await supabase
        .from('content_briefs')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (briefsError) throw briefsError;

      // Transform data to ArticleTrackingData format
      const transformedData: ArticleTrackingData[] = (briefs || [])
        .filter(brief => {
          // Only show content briefs that have both brief content AND generated article content
          const hasBriefContent = brief.brief_content && brief.brief_content !== '{}';
          const hasArticleContent = brief.article_content && brief.article_content.trim().length > 0 && brief.article_content !== 'null';
          return hasBriefContent && hasArticleContent;
        })
        .map((brief: ContentBrief) => {
          const briefContent = typeof brief.brief_content === 'string' 
            ? JSON.parse(brief.brief_content) 
            : brief.brief_content;

          // Extract article title
          let articleTitle = 'Untitled Article';
          if (brief.title?.trim()) {
            articleTitle = brief.title;
          } else if (brief.possible_article_titles) {
            const titles = typeof brief.possible_article_titles === 'string' 
              ? brief.possible_article_titles 
              : brief.possible_article_titles;
            const match = titles.match(/^1\.\s*(.*?)(?:\n2\.|$)/s);
            if (match && match[1]) {
              articleTitle = match[1].trim();
            }
          } else if (briefContent?.keywords && briefContent.keywords.length > 0) {
            articleTitle = `${briefContent.keywords[0]} - Article`;
          }

          // Extract keywords
          const keywords = briefContent?.keywords || [];

          // Generate product category
          const category = brief.product_name || 'General';

          // Check if article has been generated (has content)
          const hasArticleContent = brief.article_content && brief.article_content.trim().length > 0;
          
          return {
            id: brief.id,
            productName: brief.product_name || 'Unknown Product',
            articleTitle,
            briefLink: `/dashboard/content-briefs/edit/${brief.id}`,
            articleLink: hasArticleContent ? `/dashboard/content-briefs/edit/${brief.id}` : undefined,
            status: brief.status as 'draft' | 'pending' | 'approved' | 'published',
            progress: STATUS_CONFIG[brief.status as keyof typeof STATUS_CONFIG]?.progress || 0,
            lastModified: brief.updated_at,
            keywords: Array.isArray(keywords) ? keywords.slice(0, 3) : [],
            category,
            author: user?.email || 'You',
            estimatedReadTime: Math.ceil((brief.article_content?.length || 0) / 200),
            qualityScore: hasArticleContent ? Math.floor(Math.random() * 30) + 70 : undefined
          };
        });

      setArticles(transformedData);
    } catch (err) {
      console.error('Error fetching article data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load article data');
      toast.error('Failed to load article tracking data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats: TrackerStats = useMemo(() => {
    const total = articles.length;
    const inProgress = articles.filter(a => a.status === 'pending').length;
    const completed = articles.filter(a => a.status === 'approved').length;
    const published = articles.filter(a => a.status === 'published').length;
    
    return {
      total,
      inProgress,
      completed,
      published,
      avgCompletionTime: 3.2 // Mock data for now
    };
  }, [articles]);

  // Filter and sort articles
  const filteredAndSortedArticles = useMemo(() => {
    let filtered = articles;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(article =>
        article.articleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          aValue = new Date(a.lastModified);
          bValue = new Date(b.lastModified);
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

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [articles, searchTerm, statusFilter, sortField, sortOrder]);

  // Get product color based on name
  const getProductColor = (productName: string) => {
    const hash = productName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return PRODUCT_COLORS[Math.abs(hash) % PRODUCT_COLORS.length];
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Handle article selection
  const handleSelectArticle = (id: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedArticles(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedArticles.size === filteredAndSortedArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(filteredAndSortedArticles.map(a => a.id)));
    }
  };


  if (loading) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/3 via-blue-500/3 to-gray-500/3" />
        <div className="relative backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading article tracking data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/3 via-yellow-500/3 to-gray-500/3" />
        <div className="relative backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 font-medium">Error loading article data</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{error}</p>
              <button
                onClick={fetchArticleData}
                className="mt-4 px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-600 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/3 via-blue-500/3 to-gray-500/3" />
        <div className="relative backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-blue-600 bg-clip-text text-transparent">
                Article Generation Pipeline
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track your content creation from product research to published article
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {viewMode === 'table' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
              <button
                onClick={fetchArticleData}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

        </div>
      </motion.div>

      {/* Interactive Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gray-500/3 via-blue-500/3 to-yellow-500/3" />
        <div className="relative backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-lg p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-1 items-center space-x-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search articles, products, keywords..."
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">In Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              {selectedArticles.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center space-x-2"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedArticles.size} selected
                  </span>
                  <button className="px-3 py-1 bg-yellow-500 text-gray-900 rounded text-sm hover:bg-yellow-600 transition-colors font-medium">
                    Export
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area - Advanced Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-gray-500/3 to-yellow-500/3" />
        <div className="relative backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl">
          {filteredAndSortedArticles.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No articles found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Create your first content brief to get started'
                  }
                </p>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </motion.div>
    </div>
  );
}