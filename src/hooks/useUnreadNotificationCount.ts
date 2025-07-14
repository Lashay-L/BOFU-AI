import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getMentionNotifications } from '../lib/commentApi';
import { getBriefApprovalNotifications } from '../lib/briefApprovalNotifications';

/**
 * Custom hook to get the unread notification count for admin users
 * Combines mention notifications, brief approvals, product approvals, and article generation notifications
 */
export const useUnreadNotificationCount = (adminRole: 'super_admin' | 'sub_admin' | null) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUnreadCount = async () => {
    if (!adminRole || (adminRole !== 'super_admin' && adminRole !== 'sub_admin')) {
      setUnreadCount(0);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get current admin ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setUnreadCount(0);
        return;
      }

      // Fetch mention notifications
      const mentions = await getMentionNotifications(user.id);
      const unreadMentions = mentions.filter(mention => !mention.notification_sent).length;

      // Fetch brief approval notifications (includes brief, product, and article notifications)
      const briefApprovals = await getBriefApprovalNotifications(user.id);
      const unreadBriefApprovals = briefApprovals.filter(brief => !brief.is_read).length;

      // Calculate total unread count
      const totalUnread = unreadMentions + unreadBriefApprovals;
      setUnreadCount(totalUnread);

    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [adminRole]);

  // Refresh function to manually update the count
  const refreshUnreadCount = () => {
    fetchUnreadCount();
  };

  return {
    unreadCount,
    isLoading,
    refreshUnreadCount
  };
};