import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserDashboardLayout } from '../components/user-dashboard/UserDashboardLayout';
import { UserActivityFeed } from '../components/user-dashboard/UserActivityFeed';
import { DataboxEmbed } from '../components/common/DataboxEmbed';
import { ArticleGenerationTracker } from '../components/user-dashboard/ArticleGenerationTracker';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { ChartBarIcon, DocumentTextIcon, ChatBubbleLeftIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface ContentBrief {
  id: string;
  product_name: string;
  status: 'draft' | 'pending' | 'approved';
  created_at: string;
  updated_at: string;
  brief_content?: any;
  article_content?: string;
  title?: string;
}

interface DashboardStats {
  totalBriefs: number;
  approved: number;
  pending: number;
  drafts: number;
  generatedArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalComments: number;
}

export default function UserDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalBriefs: 0,
    approved: 0,
    pending: 0,
    drafts: 0,
    generatedArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    totalComments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    } else if (!authLoading && !user) {
      // No user and auth loading is complete - redirect to home
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Real-time subscription for content_briefs table
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Setting up real-time subscription for user content briefs...');
    
    const subscription = supabase
      .channel(`user_content_briefs_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'content_briefs',
          filter: `user_id=eq.${user.id}` // Only listen to current user's content briefs
        },
        (payload) => {
          console.log('🔄 Real-time content brief change detected for user:', payload);
          // Refresh dashboard data when content briefs change
          fetchDashboardData();
        }
      )
      .subscribe();

    // Additional subscription for article_content updates to sync with admin changes
    const articleSubscription = supabase
      .channel(`user_article_updates_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_briefs',
          filter: `user_id=eq.${user.id}` // Listen for updates to user's content briefs
        },
        (payload) => {
          console.log('🔄 Real-time article content update detected:', payload);
          // Check if article_content was updated
          if (payload.new && payload.old && payload.new.article_content !== payload.old.article_content) {
            console.log('🔄 Article content changed, refreshing dashboard...');
            fetchDashboardData();
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount or user change
    return () => {
      console.log('🔄 Cleaning up real-time subscriptions for user content briefs');
      subscription.unsubscribe();
      articleSubscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        console.error('No user ID available');
        setError('User not authenticated');
        return;
      }
      
      console.log('[DASHBOARD] Fetching data for user:', user.id);
      
      // Add timeout protection for dashboard queries
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Dashboard query timeout')), 10000);
      });
      
      // Fetch content briefs with timeout protection
      const queryPromise = supabase
        .from('content_briefs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data: briefs, error: briefsError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;

      if (briefsError) {
        console.error('[DASHBOARD] Error fetching content briefs:', briefsError);
        throw briefsError;
      }

      // Filter out briefs with empty content (cleared briefs)
      const filteredBriefs = (briefs || []).filter((brief: ContentBrief) => {
        // Allow briefs with any content (string or object with content)
        if (!brief.brief_content) return false;
        
        // If it's a string, check if it's not empty
        if (typeof brief.brief_content === 'string') {
          return brief.brief_content.trim().length > 0 && brief.brief_content !== '{}';
        }
        
        // If it's an object, check if it has keys
        if (typeof brief.brief_content === 'object') {
          return Object.keys(brief.brief_content).length > 0;
        }
        
        return true;
      });

      console.log('[DASHBOARD] Fetched briefs:', briefs?.length || 0, 'Filtered:', filteredBriefs.length);

      // Calculate stats using filtered briefs
      const totalBriefs = filteredBriefs.length;
      const approved = filteredBriefs.filter((brief: ContentBrief) => brief.status === 'approved').length;
      const pending = filteredBriefs.filter((brief: ContentBrief) => brief.status === 'pending').length;
      const drafts = filteredBriefs.filter((brief: ContentBrief) => brief.status === 'draft').length;
      
      // Calculate article stats
      const generatedArticles = filteredBriefs.filter((brief: ContentBrief) => 
        brief.article_content && brief.article_content.trim().length > 0
      ).length;
      const publishedArticles = filteredBriefs.filter((brief: ContentBrief) => 
        brief.status === 'approved' && brief.article_content && brief.article_content.trim().length > 0
      ).length;
      const draftArticles = filteredBriefs.filter((brief: ContentBrief) => 
        brief.status === 'draft' && brief.article_content && brief.article_content.trim().length > 0
      ).length;

      // Fetch comment stats
      const { data: comments } = await supabase
        .from('article_comments')
        .select('id')
        .in('content_brief_id', filteredBriefs.map(brief => brief.id));
      
      const totalComments = comments?.length || 0;

      setStats({ 
        totalBriefs, 
        approved, 
        pending, 
        drafts, 
        generatedArticles, 
        publishedArticles, 
        draftArticles, 
        totalComments 
      });
    } catch (error) {
      console.error('[DASHBOARD] Error fetching dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };


  if (authLoading) {
    return (
      <UserDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-300">Checking authentication...</p>
          </div>
        </div>
      </UserDashboardLayout>
    );
  }

  if (loading) {
    return (
      <UserDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-300">Loading dashboard...</p>
          </div>
        </div>
      </UserDashboardLayout>
    );
  }

  if (error) {
    return (
      <UserDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-300 font-medium">Error loading dashboard</p>
              <p className="text-red-400 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-300">Manage your content briefs and track progress</p>
        </div>

        {/* Enhanced Stats Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Content Briefs Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <DocumentTextIcon className="h-6 w-6 text-blue-400 mr-2" />
                  Content Briefs
                </h3>
                <span className="text-sm text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full border border-blue-500/30">
                  {stats.totalBriefs} Total
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
                    <div className="text-sm text-gray-300 mt-1">Approved</div>
                    <div className="w-full bg-gray-600/50 rounded-full h-2 mt-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${stats.totalBriefs > 0 ? (stats.approved / stats.totalBriefs) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
                    <div className="text-sm text-gray-300 mt-1">Pending</div>
                    <div className="w-full bg-gray-600/50 rounded-full h-2 mt-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${stats.totalBriefs > 0 ? (stats.pending / stats.totalBriefs) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-300">{stats.drafts}</div>
                    <div className="text-sm text-gray-300 mt-1">Drafts</div>
                    <div className="w-full bg-gray-600/50 rounded-full h-2 mt-2">
                      <div 
                        className="bg-gray-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${stats.totalBriefs > 0 ? (stats.drafts / stats.totalBriefs) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="space-y-6">
            {/* Generated Articles */}
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <ChartBarIcon className="h-6 w-6 text-purple-400 mr-2" />
                  Articles
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Generated</span>
                  <span className="text-2xl font-bold text-purple-400">{stats.generatedArticles}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Published</span>
                  <span className="text-lg font-semibold text-green-400">{stats.publishedArticles}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">In Draft</span>
                  <span className="text-lg font-semibold text-orange-400">{stats.draftArticles}</span>
                </div>
              </div>
            </div>

            {/* Comments & Activity */}
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <ChatBubbleLeftIcon className="h-6 w-6 text-emerald-400 mr-2" />
                  Collaboration
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Total Comments</span>
                  <span className="text-2xl font-bold text-emerald-400">{stats.totalComments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Avg per Brief</span>
                  <span className="text-lg font-semibold text-teal-400">
                    {stats.totalBriefs > 0 ? (stats.totalComments / stats.totalBriefs).toFixed(1) : '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Article Generation Tracking */}
        <div className="mb-8">
          <ArticleGenerationTracker />
        </div>

        {/* Recent Activity Feed */}
        <div className="mb-8">
          <UserActivityFeed />
        </div>

        {/* Collapsible Analytics Dashboard */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/30 overflow-hidden">
          <button
            onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-center">
              <ChartBarIcon className="h-6 w-6 text-blue-400 mr-3" />
              <h3 className="text-lg font-semibold text-white">Analytics Dashboard</h3>
            </div>
            {isAnalyticsExpanded ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
          
          {isAnalyticsExpanded && (
            <div className="border-t border-gray-700/30 p-6">
              <DataboxEmbed 
                dashboardName="Analytics Dashboard"
                className="w-full bg-transparent border-gray-600/30"
                fallbackMessage="Analytics dashboard will be configured by your administrator"
                showTitle={false}
              />
            </div>
          )}
        </div>
      </div>
    </UserDashboardLayout>
  );
}
