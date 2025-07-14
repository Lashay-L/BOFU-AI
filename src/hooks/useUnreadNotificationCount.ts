import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  getMentionNotifications, 
  subscribeToAdminMentionNotifications,
  MentionNotification
} from '../lib/commentApi';
import { getBriefApprovalNotifications } from '../lib/briefApprovalNotifications';
import { useAdminContext } from '../contexts/AdminContext';

/**
 * Custom hook to get the unread notification count for admin users
 * Combines mention notifications, brief approvals, product approvals, and article generation notifications
 * Includes real-time updates for mention notifications
 */
export const useUnreadNotificationCount = (adminRole: 'super_admin' | 'sub_admin' | null) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const { assignedClientIds } = useAdminContext();

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

      // Get client IDs for filtering (for sub-admins)
      const clientIdsForFiltering = adminRole === 'sub_admin' ? assignedClientIds : undefined;

      // Fetch mention notifications
      const mentions = await getMentionNotifications(user.id, clientIdsForFiltering);
      const unreadMentions = mentions.filter(mention => !mention.notification_sent).length;

      // Fetch brief approval notifications (includes brief, product, and article notifications)
      const briefApprovals = await getBriefApprovalNotifications(user.id, clientIdsForFiltering);
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

  // Set up real-time subscription for mention notifications
  useEffect(() => {
    const setupMentionSubscription = async () => {
      if (!adminRole || (adminRole !== 'super_admin' && adminRole !== 'sub_admin')) {
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        // Clean up any existing subscription first
        if (subscriptionRef.current) {
          console.log('🔔 Cleaning up existing notification count subscription');
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }

        console.log('🔔 Setting up admin notification count subscription');
        
        subscriptionRef.current = subscribeToAdminMentionNotifications(
          user.id,
          assignedClientIds || [],
          (newNotification: MentionNotification) => {
            console.log('🔔 Admin notification count received new mention');
            setUnreadCount(prev => prev + 1);
          }
        );
      } catch (error) {
        console.error('❌ Error setting up admin notification subscription:', error);
      }
    };

    setupMentionSubscription();

    return () => {
      if (subscriptionRef.current) {
        console.log('🔔 Cleaning up admin notification count subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [adminRole, assignedClientIds]);

  useEffect(() => {
    fetchUnreadCount();
  }, [adminRole, assignedClientIds]);

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