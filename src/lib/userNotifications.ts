import { supabase } from './supabase';

export interface UserNotification {
  id: string;
  user_id: string;
  brief_id?: string;
  notification_type: 'brief_generated' | 'article_generated';
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

/**
 * Create a content brief generation notification for the user
 * This notifies the user that their brief has been generated and needs approval
 */
export async function createBriefGenerationNotification({
  userId,
  briefId,
  briefTitle,
  productName
}: {
  userId: string;
  briefId: string;
  briefTitle: string;
  productName?: string;
}) {
  try {
    console.log('Creating brief generation notification for user...', { userId, briefId, briefTitle });

    // Get the current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No active session found');
      return;
    }

    // Call the Edge Function for user notifications (email + Slack)
    const { data, error } = await supabase.functions.invoke('send-user-notification', {
      body: {
        userId,
        briefId,
        briefTitle,
        productName,
        notificationType: 'brief_generated'
      },
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (error) {
      console.error('Error calling user notification Edge Function:', error);
      // Create fallback notification
      await createFallbackUserNotification({
        userId,
        briefId,
        notificationType: 'brief_generated',
        title: `Content Brief Generated: ${briefTitle}`,
        message: `Your content brief "${briefTitle}"${productName ? ` for ${productName}` : ''} has been generated and is ready for your approval.`
      });
      return { success: true, message: 'User notification created via fallback' };
    }

    console.log('✅ User notification Edge Function response:', data);
    return data;

  } catch (error) {
    console.error('Error creating brief generation notification:', error);
    throw error;
  }
}

/**
 * Create an article generation notification for the user
 * This notifies the user that their article has been generated and is ready
 */
export async function createArticleGenerationNotification({
  userId,
  briefId,
  briefTitle,
  productName
}: {
  userId: string;
  briefId: string;
  briefTitle: string;
  productName?: string;
}) {
  try {
    console.log('Creating article generation notification for user...', { userId, briefId, briefTitle });

    // Get the current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No active session found');
      return;
    }

    // Call the Edge Function for user notifications (email + Slack)
    const { data, error } = await supabase.functions.invoke('send-user-notification', {
      body: {
        userId,
        briefId,
        briefTitle,
        productName,
        notificationType: 'article_generated'
      },
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (error) {
      console.error('Error calling user notification Edge Function:', error);
      // Create fallback notification
      await createFallbackUserNotification({
        userId,
        briefId,
        notificationType: 'article_generated',
        title: `Article Generated: ${briefTitle}`,
        message: `Your article "${briefTitle}"${productName ? ` for ${productName}` : ''} has been generated and is ready for review.`
      });
      return { success: true, message: 'User notification created via fallback' };
    }

    console.log('✅ User notification Edge Function response:', data);
    return data;

  } catch (error) {
    console.error('Error creating article generation notification:', error);
    throw error;
  }
}

/**
 * Create fallback user notification when Edge Function fails
 */
async function createFallbackUserNotification({
  userId,
  briefId,
  notificationType,
  title,
  message
}: {
  userId: string;
  briefId?: string;
  notificationType: 'brief_generated' | 'article_generated';
  title: string;
  message: string;
}) {
  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        brief_id: briefId,
        notification_type: notificationType,
        title,
        message,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating fallback user notification:', error);
      return null;
    }

    console.log('✅ Fallback user notification created:', data.id);
    return data;
  } catch (error) {
    console.error('Error in createFallbackUserNotification:', error);
    return null;
  }
}

/**
 * Get user notifications for the current user
 */
export async function getUserNotifications(): Promise<UserNotification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    return [];
  }
}

/**
 * Get unread user notification count
 */
export async function getUnreadUserNotificationCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return 0;
    }

    const { count, error } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread user notification count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadUserNotificationCount:', error);
    return 0;
  }
}

/**
 * Mark user notifications as read
 */
export async function markUserNotificationsAsRead(notificationIds: string[]): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { error } = await supabase
      .from('user_notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', user.id)
      .in('id', notificationIds);

    if (error) {
      console.error('Error marking user notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markUserNotificationsAsRead:', error);
    return false;
  }
}

/**
 * Mark all user notifications as read
 */
export async function markAllUserNotificationsAsRead(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { error } = await supabase
      .from('user_notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all user notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAllUserNotificationsAsRead:', error);
    return false;
  }
}

/**
 * Subscribe to real-time user notifications
 */
export function subscribeToUserNotifications(
  userId: string,
  callback: (notification: UserNotification) => void
) {
  console.log('🔔 Setting up real-time user notifications subscription for:', userId);

  // Use a unique channel name with timestamp to avoid conflicts during re-renders
  const channelName = `user-notifications:${userId}-${Date.now()}`;
  
  const subscription = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔔 New user notification received:', payload.new);
        callback(payload.new as UserNotification);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔔 User notification updated:', payload.new);
        callback(payload.new as UserNotification);
      }
    )
    .subscribe((status) => {
      console.log('🔔 User notifications subscription status:', status, 'for channel:', channelName);
    });

  return {
    unsubscribe: () => {
      try {
        console.log('🔔 Unsubscribing from user notifications channel:', channelName);
        subscription.unsubscribe();
      } catch (error) {
        console.error('❌ Error unsubscribing from user notifications:', error);
      }
    }
  };
}

/**
 * Format notification type for display
 */
export function getNotificationTypeLabel(type: string): string {
  switch (type) {
    case 'brief_generated':
      return 'Content Brief Generated';
    case 'article_generated':
      return 'Article Generated';
    default:
      return 'Notification';
  }
}