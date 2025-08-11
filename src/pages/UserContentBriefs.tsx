import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserDashboardLayout } from '../components/user-dashboard/UserDashboardLayout';
import { ContentBrief } from '../types/contentBrief';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit, 
  Clock, 
  Check, 
  FileText, 
  Trash2, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  Calendar,
  TrendingUp,
  Eye,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Target,
  Layers
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

// Helper function to extract keywords from brief content
const extractKeywords = (content: any = ''): string[] => {
  if (!content || typeof content !== 'string') return ['content', 'brief'];
  
  // Extract words from content, filter common words, and return top 4 as keywords
  const words = content.toLowerCase().split(/\s+/);
  const commonWords = new Set(['the', 'and', 'of', 'to', 'in', 'a', 'for', 'with', 'on', 'is', 'are', 'that', 'this', 'by', 'as', 'an', 'it', 'if', 'from', 'at', 'or', 'be', 'so']);
  const keywordMap: Record<string, number> = {};
  
  words.forEach(word => {
    if (word.length > 3 && !commonWords.has(word)) {
      keywordMap[word] = (keywordMap[word] || 0) + 1;
    }
  });
  
  const sortedKeywords = Object.entries(keywordMap)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 4);
  
  return sortedKeywords.length ? sortedKeywords : ['content', 'brief'];
};

// Add enhanced interface for UI display
interface EnhancedContentBrief extends ContentBrief {
  title: string;
  date: Date;
  keywords: string[];
  author: string;
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
  
  .gradient-border {
    position: relative;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
    border: 1px solid transparent;
    background-clip: padding-box;
  }
  
  .gradient-border::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: -1;
    margin: -1px;
    border-radius: inherit;
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .gradient-border:hover::before {
    opacity: 1;
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
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
  }
  
  .stat-card:hover::before {
    transform: translateX(0);
  }
  
  .stat-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
    border-color: rgba(99, 102, 241, 0.3);
  }
  
  .action-btn {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .action-btn:hover {
    background: rgba(255, 255, 255, 0.95);
    transform: scale(1.1);
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
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 12px 40px rgba(99, 102, 241, 0.15);
  }
  
  .progress-bar {
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .keyword-tag {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
    border: 1px solid rgba(99, 102, 241, 0.2);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }
  
  .keyword-tag:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
    border-color: rgba(99, 102, 241, 0.4);
    transform: scale(1.05);
  }
  
  .status-badge {
    backdrop-filter: blur(10px);
    font-weight: 600;
    letter-spacing: 0.025em;
    transition: all 0.3s ease;
  }
  
  .status-badge.approved {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.1));
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: rgb(21, 128, 61);
  }
  
  .status-badge.pending {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.1));
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: rgb(146, 64, 14);
  }
  
  .status-badge.draft {
    background: linear-gradient(135deg, rgba(107, 114, 128, 0.15), rgba(107, 114, 128, 0.1));
    border: 1px solid rgba(107, 114, 128, 0.3);
    color: rgb(75, 85, 99);
  }
`;

export default function UserContentBriefs() {
  // Add the enhanced styles to the document head
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = enhancedStyles;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  const { user } = useAuth();
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<EnhancedContentBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ContentBrief['status'] | 'all'>('all');
  const [totalBriefs, setTotalBriefs] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (user) {
      loadBriefs();
    }
  }, [user, page, statusFilter]);

  // Real-time subscription for content_briefs table
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time subscription for content briefs page...');
    
    const subscription = supabase
      .channel(`content_briefs_page_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'content_briefs',
          filter: `user_id=eq.${user.id}` // Only listen to current user's content briefs
        },
        (payload) => {
          console.log('🔄 Real-time content brief change detected on content briefs page:', payload);
          // Refresh briefs when content briefs change
          loadBriefs();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or user change
    return () => {
      console.log('🔄 Cleaning up real-time subscription for content briefs page');
      subscription.unsubscribe();
    };
  }, [user]);

  const loadBriefs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error, count } = await supabase
        .from('content_briefs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id) // Add explicit user filter
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process each brief to use stored titles or generate fallback titles
      const transformedBriefs: EnhancedContentBrief[] = await Promise.all(
        data.map(async (brief) => {
          // Helper function to get title - prioritize stored title
          const getTitle = async () => {
            // If we already have a stored title, use it
            if (brief.title && brief.title.trim()) {
              console.log('Using stored title for brief', brief.id, ':', brief.title);
              return brief.title;
            }
            
            // Generate a fallback title for existing briefs without stored titles
            const briefDate = new Date(brief.created_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            });
            
            // First try to get keywords from the content brief's own content
            if (brief.brief_content) {
              try {
                let briefContent = brief.brief_content as any;
                
                // Handle case where brief_content is stored as a JSON string
                if (typeof briefContent === 'string') {
                  briefContent = JSON.parse(briefContent);
                }
                
                // Check for keywords array in the parsed content
                if (briefContent.keywords && Array.isArray(briefContent.keywords) && briefContent.keywords.length > 0) {
                  // Extract the first keyword and clean it from backticks and quotes
                  const firstKeyword = briefContent.keywords[0].replace(/[`'"]/g, '').trim();
                  // Remove any URL patterns that might be in the keyword
                  const cleanKeyword = firstKeyword.replace(/^\/|\/$|^https?:\/\//, '').replace(/[-_]/g, ' ');
                  return cleanKeyword;
                }
                
                // Try to get primary keyword from SEO Strategy
                const seoStrategy = briefContent['4. SEO Strategy'];
                if (seoStrategy && seoStrategy['Primary Keyword']) {
                  const primaryKeyword = seoStrategy['Primary Keyword'].replace(/[`'"]/g, '').trim();
                  if (primaryKeyword) {
                    return primaryKeyword;
                  }
                }
              } catch (error) {
                console.warn('Could not extract keywords from brief content:', error);
              }
            }
            
            // Fallback: try to get keywords from approved product data if research_result_id exists
            if (brief.research_result_id) {
              try {
                const { data: approvedProduct, error: productError } = await supabase
                  .from('approved_products')
                  .select('product_data')
                  .eq('id', brief.research_result_id)
                  .single();

                if (!productError && approvedProduct?.product_data) {
                  // Extract keywords from product_data
                  const productData = typeof approvedProduct.product_data === 'string' 
                    ? JSON.parse(approvedProduct.product_data) 
                    : approvedProduct.product_data;
                  
                  if (productData.keywords && Array.isArray(productData.keywords) && productData.keywords.length > 0) {
                    // Use first keyword but make it unique with brief ID
                    return `${productData.keywords[0]} Analysis`;
                  }
                }
              } catch (productError) {
                console.warn('Could not fetch keywords from approved product:', productError);
              }
            }
            
            // Fallback to product_name if available
            if (brief.product_name && brief.product_name.trim()) {
              return brief.product_name;
            }
            
            // Final fallback with date and brief ID
            return `Content Brief - ${briefDate}`;
          };

          const title = await getTitle();
          
          // If we generated a new title (not from stored data), persist it to the database
          if (!brief.title || !brief.title.trim()) {
            try {
              await supabase
                .from('content_briefs')
                .update({ title })
                .eq('id', brief.id);
              console.log(`Persisted title for brief ${brief.id}:`, title);
            } catch (updateError) {
              console.warn('Could not persist title to database:', updateError);
            }
          }
          
          return {
            ...brief,
            status: brief.status || 'draft',
            title,
            date: new Date(brief.created_at),
            keywords: extractKeywords(brief.brief_content) || ['content', 'brief'],
            author: user.email || 'Anonymous'
          };
        })
      );
      
      setBriefs(transformedBriefs);
      setTotalBriefs(count || 0);
      setTotalPages(Math.ceil((count || 0) / 10));
      
      const drafts = transformedBriefs.filter(brief => brief.status === 'draft').length;
      const pending = transformedBriefs.filter(brief => brief.status === 'pending').length;
      const approved = transformedBriefs.filter(brief => brief.status === 'approved').length;
      
      setDraftCount(drafts);
      setPendingCount(pending);
      setApprovedCount(approved);
    } catch (error) {
      console.error('Error loading briefs:', error);
      toast.error('Failed to load content briefs');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced filtering and sorting logic
  const filteredAndSortedBriefs = briefs
    .filter(brief => {
      const matchesStatus = statusFilter === 'all' || brief.status === statusFilter;
      const matchesSearch = searchTerm === '' || 
        brief.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (brief.product_name && brief.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        brief.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          const statusOrder = { 'approved': 0, 'pending': 1, 'draft': 2 };
          comparison = (statusOrder[a.status as keyof typeof statusOrder] || 99) - 
                      (statusOrder[b.status as keyof typeof statusOrder] || 99);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

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
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(6, 182, 212, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg">
                  <Layers className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-yellow-500">
                    Content Briefs
                  </h1>
                  <p className="text-white mt-1">Manage and organize your content strategy</p>
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
                    placeholder="Search briefs, products, keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-80 pl-12 pr-4 py-3 bg-transparent border-0 focus:ring-0 text-gray-900 placeholder-gray-500"
                  />
                </div>
                
                {/* Filter Controls */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as ContentBrief['status'] | 'all')}
                      className="appearance-none bg-white/80 backdrop-blur-lg border border-white/30 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300"
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  </div>
                  
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-3 bg-white/80 backdrop-blur-lg border border-white/30 rounded-xl hover:bg-white/90 transition-all duration-300 group"
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                  >
                    {sortOrder === 'asc' ? 
                      <SortAsc className="h-4 w-4 text-gray-600 group-hover:text-indigo-600" /> : 
                      <SortDesc className="h-4 w-4 text-gray-600 group-hover:text-indigo-600" />
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full blur-xl"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full blur-xl"></div>
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
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Briefs</p>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {totalBriefs}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">100%</p>
                <div className="w-2 h-8 bg-gradient-to-t from-indigo-500 to-purple-600 rounded-full"></div>
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
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
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Target size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    {approvedCount}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">
                  {totalBriefs ? Math.round((approvedCount / totalBriefs) * 100) : 0}%
                </p>
                <div className="w-2 h-8 bg-gradient-to-t from-emerald-500 to-green-600 rounded-full"></div>
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${totalBriefs ? (approvedCount / totalBriefs) * 100 : 0}%` }}
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
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Clock size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {pendingCount}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">
                  {totalBriefs ? Math.round((pendingCount / totalBriefs) * 100) : 0}%
                </p>
                <div className="w-2 h-8 bg-gradient-to-t from-amber-500 to-orange-600 rounded-full"></div>
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${totalBriefs ? (pendingCount / totalBriefs) * 100 : 0}%` }}
                transition={{ duration: 1, delay: 0.7 }}
                className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"
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
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Edit size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Drafts</p>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent">
                    {draftCount}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">
                  {totalBriefs ? Math.round((draftCount / totalBriefs) * 100) : 0}%
                </p>
                <div className="w-2 h-8 bg-gradient-to-t from-slate-500 to-gray-600 rounded-full"></div>
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${totalBriefs ? (draftCount / totalBriefs) * 100 : 0}%` }}
                transition={{ duration: 1, delay: 0.8 }}
                className="h-full bg-gradient-to-r from-slate-500 to-gray-600 rounded-full"
              />
            </div>
          </motion.div>
        </div>

        {/* Removed New Content Brief form */}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="animate-pulse bg-white rounded-xl shadow-sm p-6 brief-card"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="h-20 bg-gray-100 rounded mb-4"></div>
                <div className="flex gap-2 mb-4">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="flex justify-end gap-2">
                  <div className="h-8 bg-gray-200 rounded-full w-8"></div>
                  <div className="h-8 bg-gray-200 rounded-full w-8"></div>
                  <div className="h-8 bg-gray-200 rounded-full w-8"></div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : filteredAndSortedBriefs.length === 0 ? (
          <div className="text-center py-12 bg-white shadow-sm rounded-xl">
            <div className="p-4 bg-gray-50 rounded-full inline-flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No content briefs found</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
              Get started by creating a new content brief for your products or services.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedBriefs.map((brief, index) => (
                <motion.div
                  key={brief.id}
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -40, scale: 0.9 }}
                  transition={{ 
                    duration: 0.6, 
                    delay: index * 0.1,
                    type: "spring",
                    bounce: 0.3
                  }}
                  className="glassmorphism-card rounded-3xl overflow-hidden group cursor-pointer"
                >
                  {/* Card Header with Status and Date */}
                  <div className="relative p-6 pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold status-badge ${brief.status}`}>
                        <div className="flex items-center space-x-1.5">
                          {brief.status === 'approved' && <Check size={12} />}
                          {brief.status === 'pending' && <Clock size={12} />}
                          {brief.status === 'draft' && <Edit size={12} />}
                          <span>{brief.status.charAt(0).toUpperCase() + brief.status.slice(1)}</span>
                        </div>
                      </span>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Calendar size={12} />
                        <span>{new Date(brief.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    
                    {/* Title and Product */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors duration-300">
                        {brief.title}
                      </h3>
                      {brief.product_name && (
                        <p className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg inline-block">
                          {brief.product_name}
                        </p>
                      )}
                    </div>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {brief.keywords.slice(0, 3).map((keyword, idx) => (
                        <span
                          key={idx}
                          className="keyword-tag px-3 py-1 rounded-lg text-xs font-medium"
                        >
                          #{keyword}
                        </span>
                      ))}
                      {brief.keywords.length > 3 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{brief.keywords.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Performance Indicator */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <TrendingUp size={12} />
                        <span>Performance Score</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                            style={{ width: `${Math.random() * 40 + 60}%` }}
                          />
                        </div>
                        <span className="font-medium">{Math.floor(Math.random() * 40 + 60)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-6 pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate(`/dashboard/content-briefs/edit/${brief.id}`)}
                          className="action-btn p-3 rounded-xl flex items-center space-x-2 text-indigo-600 hover:text-indigo-700"
                          title="Edit Brief"
                        >
                          <Edit size={16} />
                          <span className="text-xs font-medium">Edit</span>
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate(`/dashboard/content-briefs/edit/${brief.id}`)}
                          className="action-btn p-3 rounded-xl flex items-center space-x-2 text-gray-600 hover:text-gray-700"
                          title="View Details"
                        >
                          <Eye size={16} />
                          <span className="text-xs font-medium">View</span>
                        </motion.button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this brief? This action cannot be undone.')) {
                              supabase
                                .from('content_briefs')
                                .delete()
                                .eq('id', brief.id)
                                .then(({ error }) => {
                                  if (error) {
                                    console.error('Error deleting brief:', error);
                                    toast.error('Failed to delete brief');
                                  } else {
                                    toast.success('Brief deleted successfully');
                                    loadBriefs();
                                  }
                                });
                            }
                          }}
                          className="action-btn p-3 rounded-xl text-red-500 hover:text-red-600"
                          title="Delete Brief"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05, rotate: 5 }}
                          className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg"
                          title="Quick Actions"
                        >
                          <ArrowUpRight size={14} />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none" />
                  
                  {/* Sparkle Effect on Hover */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <Sparkles size={16} className="text-indigo-400" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}
