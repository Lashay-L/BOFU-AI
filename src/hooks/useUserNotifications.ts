import { useState, useEffect, useRef } from 'react';
import { 
  getUserNotifications, 
  getUnreadUserNotificationCount,
  markUserNotificationsAsRead,
  markAllUserNotificationsAsRead,
  subscribeToUserNotifications,
  UserNotification
} from '../lib/userNotifications';
import { useAuth } from '../lib/auth';

/**
 * Custom hook to manage user notifications (brief generation, article generation)
 * Includes real-time updates and unread count tracking
 */
export const useUserNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const subscriptionRef = useRef<any>(null);

  // Load notifications when user changes
  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Set up real-time subscription for user notifications
  useEffect(() => {
    if (user?.id) {
      console.log('🔔 Setting up real-time user notifications for:', user.id);
      
      // Clean up any existing subscription first
      if (subscriptionRef.current) {
        console.log('🔔 Cleaning up existing user notification subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      
      subscriptionRef.current = subscribeToUserNotifications(
        user.id,
        (newNotification: UserNotification) => {
          console.log('🔔 Received new user notification:', newNotification);
          
          // Add the new notification to the list (or update existing one)
          setNotifications(prev => {
            const existingIndex = prev.findIndex(n => n.id === newNotification.id);
            if (existingIndex >= 0) {
              // Update existing notification
              const updated = [...prev];
              updated[existingIndex] = newNotification;
              return updated;
            } else {
              // Add new notification at the top
              return [newNotification, ...prev];
            }
          });
          
          // Update unread count based on notification status
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      );

      return () => {
        if (subscriptionRef.current) {
          console.log('🔔 Cleaning up user notifications subscription');
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }
      };
    }
  }, [user?.id]);

  // Load notifications from database
  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log('📥 Loading user notifications');
      
      const [notificationsData, unreadCountData] = await Promise.all([
        getUserNotifications(),
        getUnreadUserNotificationCount()
      ]);
      
      console.log('📥 Loaded user notifications:', notificationsData.length);
      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (error) {
      console.error('❌ Error loading user notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark specific notifications as read
  const markAsRead = async (notificationIds: string[]) => {
    try {
      const success = await markUserNotificationsAsRead(notificationIds);
      if (success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notificationIds.includes(notification.id)
              ? { ...notification, is_read: true, read_at: new Date().toISOString() }
              : notification
          )
        );
        
        // Update unread count
        const markedCount = notifications.filter(n => 
          notificationIds.includes(n.id) && !n.is_read
        ).length;
        setUnreadCount(prev => Math.max(0, prev - markedCount));
      }
      return success;
    } catch (error) {
      console.error('❌ Error marking notifications as read:', error);
      return false;
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const success = await markAllUserNotificationsAsRead();
      if (success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.is_read 
              ? notification 
              : { ...notification, is_read: true, read_at: new Date().toISOString() }
          )
        );
        setUnreadCount(0);
      }
      return success;
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      return false;
    }
  };

  // Refresh notifications manually
  const refreshNotifications = () => {
    loadNotifications();
  };

  // Filter notifications by type
  const getNotificationsByType = (type: 'brief_generated' | 'article_generated') => {
    return notifications.filter(n => n.notification_type === type);
  };

  // Get unread notifications
  const getUnreadNotifications = () => {
    return notifications.filter(n => !n.is_read);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    getNotificationsByType,
    getUnreadNotifications
  };
};