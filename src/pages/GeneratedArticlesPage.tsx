import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { 
  ExternalLink, 
  CalendarDays, 
  FileText, 
  Edit3, 
  Trash2,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  TrendingUp,
  Eye,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Target,
  BookOpen,
  Clock,
  Check,
  Calendar,
  Layers
} from 'lucide-react';
import { UserDashboardLayout } from '../components/user-dashboard/UserDashboardLayout';
import { useNavigate } from 'react-router-dom';
import { unifiedArticleService } from '../lib/unifiedArticleApi';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface GeneratedArticle {
  id: string;
  title: string;
  product_name?: string;
  link: string | null;
  updated_at: string;
  first_keyword?: string | null;
}

// Enhanced styles with glassmorphism and modern effects
const enhancedStyles = `
  .glassmorphism-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .glassmorphism-card:hover {
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    border-color: rgba(99, 102, 241, 0.2);
  }
  
  .stat-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.8));
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #f59e0b, #f97316, #ef4444);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
  }
  
  .stat-card:hover::before {
    transform: translateX(0);
  }
  
  .stat-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
    border-color: rgba(245, 158, 11, 0.3);
  }
  
  .action-btn {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .action-btn:hover {
    background: rgba(255, 255, 255, 0.95);
    transform: scale(1.05);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }
  
  .floating-search {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }
  
  .floating-search:focus-within {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(245, 158, 11, 0.5);
    box-shadow: 0 12px 40px rgba(245, 158, 11, 0.15);
  }
  
  .keyword-tag {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(249, 115, 22, 0.1));
    border: 1px solid rgba(245, 158, 11, 0.2);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }
  
  .keyword-tag:hover {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(249, 115, 22, 0.2));
    border-color: rgba(245, 158, 11, 0.4);
    transform: scale(1.05);
  }
  
  .article-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .article-card:hover {
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    border-color: rgba(245, 158, 11, 0.3);
  }
`;

const GeneratedArticlesPage: React.FC = () => {
  // Add the enhanced styles to the document head
  React.useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = enhancedStyles;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  const { user } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<GeneratedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced state management
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'product'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'with-link' | 'without-link'>('all');
  
  // Delete functionality state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<GeneratedArticle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Stats
  const [totalArticles, setTotalArticles] = useState(0);
  const [articlesWithLinks, setArticlesWithLinks] = useState(0);
  const [recentArticles, setRecentArticles] = useState(0);

  useEffect(() => {
    const fetchArticles = async () => {
      if (!user) {
        // User is not yet available, keep loading state or set a specific auth-pending state
        // For now, we'll rely on the initial loading state set to true
        // and the effect re-running when user changes.
        // We won't set an error here immediately.
        return; 
      }

      // Proceed with fetching only if user is available
      setError(null); // Clear any previous errors like 'User not authenticated'
      try {
        setLoading(true);
        const { data, error: dbError } = await supabase
          .from('content_briefs')
          .select('id, possible_article_titles, product_name, link, updated_at, brief_content, article_content') // Added article_content to select
          .not('article_content', 'is', null)
          .order('updated_at', { ascending: false });

        if (dbError) {
          throw dbError;
        }

        if (data) {
          // Utility function to extract first keyword from brief content
          const extractFirstKeyword = (briefContent: any): string | null => {
            if (!briefContent) return null;
            
            try {
              let parsedContent = briefContent;
              
              // Handle case where brief_content is stored as a JSON string
              if (typeof briefContent === 'string') {
                parsedContent = JSON.parse(briefContent);
              }
              
              // Check for keywords array in the parsed content
              if (parsedContent.keywords && Array.isArray(parsedContent.keywords) && parsedContent.keywords.length > 0) {
                // Extract the first keyword and clean it from backticks and quotes
                const firstKeyword = parsedContent.keywords[0].replace(/[`'"]/g, '').trim();
                // Remove any URL patterns that might be in the keyword
                const cleanKeyword = firstKeyword.replace(/^\/|\/$|^https?:\/\//, '').replace(/[-_]/g, ' ');
                return cleanKeyword;
              }
              
              // Try to get primary keyword from SEO Strategy as fallback
              const seoStrategy = parsedContent['4. SEO Strategy'];
              if (seoStrategy && seoStrategy['Primary Keyword']) {
                const primaryKeyword = seoStrategy['Primary Keyword'].replace(/[`'"]/g, '').trim();
                if (primaryKeyword) {
                  return primaryKeyword;
                }
              }
            } catch (error) {
              console.warn('Could not extract keyword from brief content:', error);
            }
            
            return null;
          };

          const formattedArticles = data.map(article => {
            let parsedTitle = `Untitled Article ${article.id.substring(0, 4)}`;
            if (typeof article.possible_article_titles === 'string' && article.possible_article_titles.trim() !== '') {
              const titlesString = article.possible_article_titles;
              const match = titlesString.match(/^1\\.s*(.*?)(?:\\n2\\.|$)/s);
              if (match && match[1]) {
                parsedTitle = match[1].trim();
              } else {
                const firstLine = titlesString.split('\n')[0].trim();
                if (firstLine) parsedTitle = firstLine;
              }
            }
            return {
              id: article.id,
              title: parsedTitle,
              product_name: article.product_name || undefined,
              link: article.link,
              updated_at: new Date(article.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), // More readable date format
              first_keyword: extractFirstKeyword(article.brief_content)
            };
          });
          setArticles(formattedArticles);
          
          // Calculate stats
          setTotalArticles(formattedArticles.length);
          setArticlesWithLinks(formattedArticles.filter(article => article.link).length);
          
          // Recent articles (last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          setRecentArticles(formattedArticles.filter(article => 
            new Date(article.updated_at) > sevenDaysAgo
          ).length);
        }
      } catch (e: any) {
        console.error('Error fetching generated articles:', e);
        setError('Failed to fetch articles. ' + e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [user]);

  const handleEditArticle = (articleId: string) => {
    // Navigate to the dedicated editor page
            navigate(`/articles/${articleId}`);
  };

  const handleDeleteClick = (article: GeneratedArticle) => {
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
        toast.success(`Article content and metadata cleared for "${articleToDelete.title}"`);
        setDeleteConfirmOpen(false);
        setArticleToDelete(null);
      } else {
        toast.error(result.error || 'Failed to clear article data');
      }
    } catch (error) {
      console.error('Error clearing article content:', error);
      toast.error('An unexpected error occurred while clearing the article data');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setArticleToDelete(null);
  };

  // Enhanced filtering and sorting logic
  const filteredAndSortedArticles = articles
    .filter(article => {
      const matchesSearch = searchTerm === '' || 
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.product_name && article.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (article.first_keyword && article.first_keyword.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'with-link' && article.link) ||
        (filterBy === 'without-link' && !article.link);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'product':
          comparison = (a.product_name || '').localeCompare(b.product_name || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // If user is not available yet, show loading state within layout
  if (!user && loading) { // Modified condition to ensure loading is shown until user is available
    return (
      <UserDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Generated Articles</h1>
          <p className="text-gray-600">Loading user information...</p> {/* More specific loading message */}
        </div>
      </UserDashboardLayout>
    );
  }

  // If there's an actual fetch error (not auth related initially) within layout
  if (error) {
    return (
      <UserDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Generated Articles</h1>
          <p className="text-red-500">Error: {error}</p>
        </div>
      </UserDashboardLayout>
    );
  }

  // If loading is true (and user is available but data is fetching) within layout
  if (loading) {
    return (
      <UserDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Generated Articles</h1>
          <p className="text-gray-600">Loading articles...</p>
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Enhanced Header with Gradient Background */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mb-8 p-8 rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(249, 115, 22, 0.1) 50%, rgba(239, 68, 68, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-yellow-500">
                    Generated Articles
                  </h1>
                  <p className="text-white mt-1">Access and edit your AI-generated content</p>
                </div>
              </div>
              
              {/* Enhanced Search and Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {/* Search Bar */}
                <div className="relative floating-search rounded-2xl overflow-hidden">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search articles, products, keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-80 pl-12 pr-4 py-3 bg-transparent border-0 focus:ring-0 text-gray-900 placeholder-gray-500"
                  />
                </div>
                
                {/* Filter Controls */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <select
                      value={filterBy}
                      onChange={(e) => setFilterBy(e.target.value as 'all' | 'with-link' | 'without-link')}
                      className="appearance-none bg-white/80 backdrop-blur-lg border border-white/30 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-300"
                    >
                      <option value="all">All Articles</option>
                      <option value="with-link">With Google Doc</option>
                      <option value="without-link">No Google Doc</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  </div>
                  
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-3 bg-white/80 backdrop-blur-lg border border-white/30 rounded-xl hover:bg-white/90 transition-all duration-300 group"
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                  >
                    {sortOrder === 'asc' ? 
                      <SortAsc className="h-4 w-4 text-gray-600 group-hover:text-amber-600" /> : 
                      <SortDesc className="h-4 w-4 text-gray-600 group-hover:text-amber-600" />
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full blur-xl"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-red-400 to-pink-500 rounded-full blur-xl"></div>
          </div>
        </motion.div>

        {/* Enhanced Dashboard Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="stat-card rounded-2xl p-6 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Articles</p>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {totalArticles}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">100%</p>
                <div className="w-2 h-8 bg-gradient-to-t from-amber-500 to-orange-600 rounded-full"></div>
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="stat-card rounded-2xl p-6 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <ExternalLink size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">With Google Docs</p>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    {articlesWithLinks}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">
                  {totalArticles ? Math.round((articlesWithLinks / totalArticles) * 100) : 0}%
                </p>
                <div className="w-2 h-8 bg-gradient-to-t from-emerald-500 to-green-600 rounded-full"></div>
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${totalArticles ? (articlesWithLinks / totalArticles) * 100 : 0}%` }}
                transition={{ duration: 1, delay: 0.6 }}
                className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="stat-card rounded-2xl p-6 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Clock size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent (7 days)</p>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {recentArticles}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">
                  {totalArticles ? Math.round((recentArticles / totalArticles) * 100) : 0}%
                </p>
                <div className="w-2 h-8 bg-gradient-to-t from-blue-500 to-cyan-600 rounded-full"></div>
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${totalArticles ? (recentArticles / totalArticles) * 100 : 0}%` }}
                transition={{ duration: 1, delay: 0.7 }}
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="stat-card rounded-2xl p-6 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Target size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {filteredAndSortedArticles.length}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">
                  {totalArticles ? Math.round((filteredAndSortedArticles.length / totalArticles) * 100) : 0}%
                </p>
                <div className="w-2 h-8 bg-gradient-to-t from-purple-500 to-indigo-600 rounded-full"></div>
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${totalArticles ? (filteredAndSortedArticles.length / totalArticles) * 100 : 0}%` }}
                transition={{ duration: 1, delay: 0.8 }}
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
              />
            </div>
          </motion.div>
        </div>

        {articles.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 glassmorphism-card rounded-3xl"
          >
            <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-full inline-flex items-center justify-center mx-auto mb-6">
              <FileText className="h-12 w-12 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No generated articles found</h3>
            <p className="text-gray-600 max-w-md mx-auto">Once articles are generated, they will appear here with beautiful cards and easy access to editing tools.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedArticles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -40, scale: 0.9 }}
                  transition={{ 
                    duration: 0.6, 
                    delay: index * 0.1,
                    type: "spring",
                    bounce: 0.3
                  }}
                  className="article-card rounded-3xl overflow-hidden group cursor-pointer"
                >
                  {/* Card Header */}
                  <div className="relative p-6 pb-4">
                    <div className="flex items-center justify-between mb-4">
                      {article.product_name && (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200">
                          {article.product_name}
                        </span>
                      )}
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Calendar size={12} />
                        <span>{article.updated_at}</span>
                      </div>
                    </div>
                    
                    {/* Title */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-amber-700 transition-colors duration-300">
                        {article.title}
                      </h3>
                      
                      {/* First Keyword */}
                      {article.first_keyword && (
                        <span className="keyword-tag px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center space-x-1">
                          <span>📝</span>
                          <span>{article.first_keyword}</span>
                        </span>
                      )}
                    </div>

                    {/* Status and Metrics */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <TrendingUp size={12} />
                        <span>Article Ready</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {article.link && (
                          <div className="flex items-center space-x-1 text-green-600">
                            <Check size={12} />
                            <span className="font-medium">Google Doc</span>
                          </div>
                        )}
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full w-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-6 pb-6">
                    <div className="space-y-3">
                      {/* Primary Edit Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleEditArticle(article.id)}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg"
                      >
                        <Edit3 size={16} />
                        <span>Edit Article</span>
                        <span className="text-xs opacity-80">(Advanced Editor)</span>
                      </motion.button>
                      
                      {/* Secondary Actions */}
                      <div className="flex items-center space-x-3">
                        {article.link && (
                          <motion.a
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 action-btn p-3 rounded-xl flex items-center justify-center space-x-2 text-emerald-600 hover:text-emerald-700"
                            title="Open in Google Docs"
                          >
                            <ExternalLink size={16} />
                            <span className="text-xs font-medium">Google Doc</span>
                          </motion.a>
                        )}
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEditArticle(article.id)}
                          className="flex-1 action-btn p-3 rounded-xl flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-700"
                          title="Quick Preview"
                        >
                          <Eye size={16} />
                          <span className="text-xs font-medium">Preview</span>
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeleteClick(article)}
                          className="action-btn p-3 rounded-xl text-red-500 hover:text-red-600"
                          title="Clear Article Data"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05, rotate: 5 }}
                          className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl shadow-lg"
                          title="Quick Actions"
                        >
                          <ArrowUpRight size={14} />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none" />
                  
                  {/* Sparkle Effect on Hover */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <Sparkles size={16} className="text-amber-400" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Clear All Article Data"
        message={
          articleToDelete
            ? `Are you sure you want to clear all article content and metadata for "${articleToDelete.title}"? This will remove the generated article content, Google Doc link, editing history, version information, and all related article metadata, but preserve the original brief. This action cannot be undone.`
            : ''
        }
        confirmText="Clear All Data"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </UserDashboardLayout>
  );
};

export default GeneratedArticlesPage;
