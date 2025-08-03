import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  TrendingUp, 
  RefreshCw, 
  Clock, 
  User,
  FileText,
  MessageSquare,
  CheckCircle,
  Search,
  Package,
  Calendar,
  ChevronRight,
  Zap,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

interface UserActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'content_brief' | 'research' | 'article' | 'comment' | 'system';
  status?: 'success' | 'pending' | 'info';
  metadata?: {
    brief_title?: string;
    research_title?: string;
    article_title?: string;
    comment_content?: string;
  };
}

export const UserActivityFeed: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<UserActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const fetchUserActivity = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const allActivities: UserActivityItem[] = [];

      // Fetch content briefs activity
      const { data: briefsData, error: briefsError } = await supabase
        .from('content_briefs')
        .select('id, title, product_name, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (!briefsError && briefsData) {
        briefsData.forEach(brief => {
          allActivities.push({
            id: `brief-${brief.id}`,
            title: 'Content Brief Created',
            description: `Created content brief for "${brief.title || brief.product_name}"`,
            time: formatTime(brief.created_at),
            type: 'content_brief',
            status: brief.status === 'approved' ? 'success' : brief.status === 'pending' ? 'pending' : 'info',
            metadata: { brief_title: brief.title || brief.product_name }
          });

          if (brief.updated_at !== brief.created_at) {
            allActivities.push({
              id: `brief-update-${brief.id}`,
              title: 'Content Brief Updated',
              description: `Updated content brief "${brief.title || brief.product_name}"`,
              time: formatTime(brief.updated_at),
              type: 'content_brief',
              status: 'info',
              metadata: { brief_title: brief.title || brief.product_name }
            });
          }
        });
      }

      // Fetch research activity
      const { data: researchData, error: researchError } = await supabase
        .from('research_results')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!researchError && researchData) {
        researchData.forEach(research => {
          allActivities.push({
            id: `research-${research.id}`,
            title: 'Research Completed',
            description: `AI research completed for "${research.title}"`,
            time: formatTime(research.created_at),
            type: 'research',
            status: 'success',
            metadata: { research_title: research.title }
          });
        });
      }

      // Fetch article comments activity
      const { data: commentsData, error: commentsError } = await supabase
        .from('article_comments')
        .select(`
          id, 
          content, 
          created_at,
          content_briefs!inner(title, product_name, user_id)
        `)
        .eq('content_briefs.user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!commentsError && commentsData) {
        commentsData.forEach(comment => {
          const briefTitle = (comment.content_briefs as any)?.title || (comment.content_briefs as any)?.product_name;
          allActivities.push({
            id: `comment-${comment.id}`,
            title: 'New Comment Added',
            description: `Comment added to "${briefTitle}"`,
            time: formatTime(comment.created_at),
            type: 'comment',
            status: 'info',
            metadata: { 
              comment_content: comment.content?.substring(0, 100),
              article_title: briefTitle
            }
          });
        });
      }

      // Add some system activity
      if (allActivities.length > 0) {
        allActivities.push({
          id: 'system-welcome',
          title: 'Welcome to BOFU.ai',
          description: 'Your AI-powered content creation journey begins here',
          time: formatTime(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()), // 1 day ago
          type: 'system',
          status: 'success'
        });
      }

      // Sort by time and limit to 8 most recent
      allActivities.sort((a, b) => {
        const timeA = a.time === 'Just now' ? Date.now() : new Date(a.time).getTime();
        const timeB = b.time === 'Just now' ? Date.now() : new Date(b.time).getTime();
        return timeB - timeA;
      });

      setActivities(allActivities.slice(0, 8));
    } catch (error) {
      console.error('Error fetching user activity:', error);
      setError('Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserActivity();
  }, [user?.id]);

  // Real-time subscription for activity updates
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Setting up real-time subscription for user activity feed...');

    const subscription = supabase
      .channel(`user_activity_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_briefs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Real-time change detected in user activity:', payload);
          fetchUserActivity();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research_results',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Real-time research change detected in user activity:', payload);
          fetchUserActivity();
        }
      )
      .subscribe();

    // Additional subscription for detecting article content updates from admins
    const articleUpdateSubscription = supabase
      .channel(`user_article_activity_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_briefs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Real-time article update detected in user activity:', payload);
          // Check if article_content was updated
          if (payload.new && payload.old && payload.new.article_content !== payload.old.article_content) {
            console.log('🔄 Article content changed, adding activity...');
            // Add a new activity item for article content update
            const briefTitle = payload.new.title || payload.new.product_name;
            const newActivity: UserActivityItem = {
              id: `article-update-${payload.new.id}-${Date.now()}`,
              title: 'Article Content Updated',
              description: `Article content was updated for "${briefTitle}"`,
              time: 'Just now',
              type: 'article',
              status: 'success',
              metadata: { article_title: briefTitle }
            };
            
            setActivities(prev => [newActivity, ...prev.slice(0, 7)]);
            // Also refresh full activity to get accurate data
            setTimeout(() => fetchUserActivity(), 1000);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time subscriptions for user activity');
      subscription.unsubscribe();
      articleUpdateSubscription.unsubscribe();
    };
  }, [user?.id]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'content_brief': return Package;
      case 'research': return Search;
      case 'article': return FileText;
      case 'comment': return MessageSquare;
      case 'system': return Zap;
      default: return Activity;
    }
  };

  const getActivityConfig = (type: string, status?: string) => {
    const baseConfig = {
      'content_brief': {
        bgColor: 'bg-gray-800/60 backdrop-blur-sm',
        iconBg: 'bg-blue-500',
        iconColor: 'text-white',
        borderColor: 'border-gray-700/30'
      },
      'research': {
        bgColor: 'bg-gray-800/60 backdrop-blur-sm',
        iconBg: 'bg-cyan-500',
        iconColor: 'text-white',
        borderColor: 'border-gray-700/30'
      },
      'article': {
        bgColor: 'bg-gray-800/60 backdrop-blur-sm',
        iconBg: 'bg-green-500',
        iconColor: 'text-white',
        borderColor: 'border-gray-700/30'
      },
      'comment': {
        bgColor: 'bg-gray-800/60 backdrop-blur-sm',
        iconBg: 'bg-purple-500',
        iconColor: 'text-white',
        borderColor: 'border-gray-700/30'
      },
      'system': {
        bgColor: 'bg-gray-800/60 backdrop-blur-sm',
        iconBg: 'bg-orange-500',
        iconColor: 'text-white',
        borderColor: 'border-gray-700/30'
      }
    };

    return baseConfig[type as keyof typeof baseConfig] || baseConfig.system;
  };

  const getStatusIndicator = (status?: string) => {
    switch (status) {
      case 'success':
        return <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />;
      case 'pending':
        return <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />;
      default:
        return <div className="w-2 h-2 bg-blue-400 rounded-full" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/30 shadow-lg overflow-hidden">
        <div className="bg-gray-700/40 backdrop-blur-sm px-6 py-5 border-b border-gray-700/30">
          <h2 className="text-xl font-bold text-white flex items-center">
            <TrendingUp className="h-6 w-6 text-blue-400 mr-2" />
            Recent Activity
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-gray-700/40 backdrop-blur-sm animate-pulse">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-600/60 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-600/60 rounded w-3/4" />
                  <div className="h-3 bg-gray-600/60 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/30 shadow-lg overflow-hidden">
        <div className="bg-gray-700/40 backdrop-blur-sm px-6 py-5 border-b border-gray-700/30">
          <h2 className="text-xl font-bold text-white flex items-center">
            <TrendingUp className="h-6 w-6 text-blue-400 mr-2" />
            Recent Activity
          </h2>
        </div>
        <div className="p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchUserActivity}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/30 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-700/40 backdrop-blur-sm px-6 py-5 border-b border-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              <p className="text-sm text-gray-300">Your latest actions and updates</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activities.length > 0 && (
              <div className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                <span className="text-xs font-semibold text-green-400">
                  {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                </span>
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchUserActivity}
              className="p-2 bg-gray-700/60 border border-gray-600/50 rounded-xl hover:bg-gray-600/60 transition-colors"
              title="Refresh activity"
            >
              <RefreshCw className="h-4 w-4 text-gray-300" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-700/60 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No activity yet</h3>
            <p className="text-gray-400 mb-6">Start creating content briefs to see your activity here</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/dashboard/content-briefs'}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md"
            >
              Create Your First Brief
            </motion.button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {activities.map((activity, index) => {
                const IconComponent = getActivityIcon(activity.type);
                const config = getActivityConfig(activity.type, activity.status);
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4 }}
                    className="group relative"
                  >
                    <div className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${config.bgColor} ${config.borderColor}`}>
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 ${config.iconBg} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                          <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                              {activity.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              {getStatusIndicator(activity.status)}
                              <ChevronRight className="h-4 w-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-300 mb-2 leading-relaxed">
                            {activity.description}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="h-3 w-3" />
                            <span>{activity.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {/* View More */}
            {activities.length >= 8 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-4 border-t border-gray-700/30"
              >
                <button className="w-full py-3 text-sm font-medium text-gray-400 hover:text-blue-400 transition-colors flex items-center justify-center gap-2 hover:bg-gray-700/40 rounded-xl">
                  <BarChart3 className="h-4 w-4" />
                  View All Activity
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};