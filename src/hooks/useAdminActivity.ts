import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getRealtimeCommentActivity } from '../lib/commentAnalytics';

export interface AdminActivityItem {
  id: string;
  title: string;
  time: string;
  type: 'comment' | 'article' | 'user' | 'content_brief' | 'system';
  user?: string;
  details?: string;
}

export interface AdminActivityData {
  activities: AdminActivityItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useAdminActivity = (maxItems: number = 10): AdminActivityData => {
  const [activities, setActivities] = useState<AdminActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return past.toLocaleDateString();
  };

  const fetchAdminActivity = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const allActivities: AdminActivityItem[] = [];

      // Fetch recent comments
      try {
        const commentActivity = await getRealtimeCommentActivity();
        const recentComments = commentActivity.recentComments.slice(0, 5);
        
        recentComments.forEach((comment: any) => {
          const userEmail = comment.user?.email || 'Unknown user';
          const userName = comment.user?.raw_user_meta_data?.name || userEmail;
          const productName = comment.content_briefs?.product_name || 'Unknown article';
          
          allActivities.push({
            id: `comment-${comment.id}`,
            title: `New comment on ${productName}`,
            time: formatTimeAgo(comment.created_at),
            type: 'comment',
            user: userName,
            details: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : '')
          });
        });
      } catch (commentError) {
        console.warn('Failed to fetch comment activity:', commentError);
      }

      // Fetch recent articles
      try {
        const { data: recentArticles, error: articlesError } = await supabase
          .from('articles')
          .select(`
            id,
            title,
            possible_article_titles,
            created_at,
            updated_at,
            user_profiles:user_id (
              email,
              company_name
            )
          `)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (articlesError) throw articlesError;

        recentArticles?.forEach((article: any) => {
          const userEmail = article.user_profiles?.email || 'Unknown user';
          const articleTitle = article.possible_article_titles?.split('\n')[0] || article.title || 'Untitled Article';
          
          allActivities.push({
            id: `article-${article.id}`,
            title: `Article updated: ${articleTitle.substring(0, 50)}${articleTitle.length > 50 ? '...' : ''}`,
            time: formatTimeAgo(article.updated_at),
            type: 'article',
            user: userEmail,
            details: `Last modified by ${userEmail}`
          });
        });
      } catch (articleError) {
        console.warn('Failed to fetch article activity:', articleError);
      }

      // Fetch recent user registrations
      try {
        const { data: recentUsers, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, email, company_name, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        if (usersError) throw usersError;

        recentUsers?.forEach((user: any) => {
          allActivities.push({
            id: `user-${user.id}`,
            title: `New user registered${user.company_name ? ` from ${user.company_name}` : ''}`,
            time: formatTimeAgo(user.created_at),
            type: 'user',
            user: user.email,
            details: `Email: ${user.email}`
          });
        });
      } catch (userError) {
        console.warn('Failed to fetch user activity:', userError);
      }

      // Fetch recent content briefs
      try {
        const { data: recentBriefs, error: briefsError } = await supabase
          .from('content_briefs')
          .select(`
            id,
            title,
            approval_status,
            created_at,
            updated_at,
            user_profiles:user_id (
              email,
              company_name
            )
          `)
          .order('updated_at', { ascending: false })
          .limit(3);

        if (briefsError) throw briefsError;

        recentBriefs?.forEach((brief: any) => {
          const userEmail = brief.user_profiles?.email || 'Unknown user';
          const action = brief.approval_status === 'approved' ? 'approved' : 'submitted';
          
          allActivities.push({
            id: `brief-${brief.id}`,
            title: `Content brief ${action}: ${brief.title}`,
            time: formatTimeAgo(brief.updated_at),
            type: 'content_brief',
            user: userEmail,
            details: `Status: ${brief.approval_status}`
          });
        });
      } catch (briefError) {
        console.warn('Failed to fetch content brief activity:', briefError);
      }

      // Sort all activities by time (most recent first) and limit
      allActivities.sort((a, b) => {
        // Parse the time strings to compare properly
        const parseTime = (timeStr: string) => {
          if (timeStr === 'Just now') return 0;
          const match = timeStr.match(/(\d+)\s+(minute|hour|day)s?\s+ago/);
          if (!match) return 999999; // Put dates at the end
          const [, num, unit] = match;
          const multipliers = { minute: 1, hour: 60, day: 1440 };
          return parseInt(num) * multipliers[unit as keyof typeof multipliers];
        };
        
        return parseTime(a.time) - parseTime(b.time);
      });

      setActivities(allActivities.slice(0, maxItems));
    } catch (err) {
      console.error('Error fetching admin activity:', err);
      setError('Failed to load activity data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminActivity();
  }, [maxItems]);

  return {
    activities,
    isLoading,
    error,
    refresh: fetchAdminActivity
  };
}; 