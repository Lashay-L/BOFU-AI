import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAdminContext } from '../../contexts/AdminContext';
import { useArticleNavigation } from '../../lib/articleNavigation';
import { 
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Users, 
  UserPlus, 
  UserMinus, 
  Shuffle, 
  Clock, 
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Filter,
  MoreVertical,
  AtSign,
  MessageSquare,
  FileText,
  Loader2,
  ExternalLink,
  Building,
  User,
  Calendar,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { 
  getMentionNotifications, 
  markMentionNotificationsAsSent,
  MentionNotification,
  subscribeToAdminMentionNotifications,
  debugMentionSystem
} from '../../lib/commentApi';
import {
  getBriefApprovalNotifications,
  getBriefOnlyNotifications,
  getProductOnlyNotifications,
  getArticleOnlyNotifications,
  markBriefApprovalNotificationsAsRead,
  BriefApprovalNotification
} from '../../lib/briefApprovalNotifications';
import { BaseModal } from '../ui/BaseModal';

interface AssignmentNotificationCenterProps {
  isVisible: boolean;
  onClose: () => void;
}

interface NotificationItem {
  id: string;
  type: 'assignment' | 'unassignment' | 'transfer' | 'account_created' | 'account_deleted' | 'bulk_operation' | 'mention' | 'comment' | 'brief_approved' | 'product_approved' | 'article_generated';
  message: string;
  details?: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  adminId?: string;
  clientId?: string;
  metadata?: any;
}

interface AssignmentActivity {
  id: string;
  admin_id: string;
  client_user_id: string;
  admin_email: string;
  client_email: string;
  client_company: string;
  assigned_at: string;
  assigned_by: string;
}

export function AssignmentNotificationCenter({ isVisible, onClose }: AssignmentNotificationCenterProps) {
  const navigate = useNavigate();
  const { navigateToArticle } = useArticleNavigation();
  const { 
    adminRole, 
    allAdmins, 
    assignedClients,
    assignedClientIds,
    refreshAdminData
  } = useAdminContext();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<AssignmentActivity[]>([]);
  const [mentionNotifications, setMentionNotifications] = useState<MentionNotification[]>([]);
  const [briefApprovalNotifications, setBriefApprovalNotifications] = useState<BriefApprovalNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'assignments' | 'accounts' | 'mentions' | 'briefs' | 'products' | 'articles'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [unreadMentionCount, setUnreadMentionCount] = useState(0);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const mentionSubscriptionRef = useRef<any>(null);

  // Only admin users can access this component
  if (!adminRole || (adminRole !== 'super_admin' && adminRole !== 'sub_admin')) {
    return null;
  }

  // Navigation handlers for notifications
  const handleNavigateToArticle = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNavigationError(null);
    
    await navigateToArticle(
      articleId,
      navigate,
      (error) => setNavigationError(error)
    );
  };

  const handleNavigateToComment = async (articleId: string, commentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNavigationError(null);
    
    await navigateToArticleWithComment(
      articleId,
      commentId,
      navigate,
      (error) => setNavigationError(error)
    );
  };

  // Set up real-time mention notifications subscription
  useEffect(() => {
    const setupMentionSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id || !isVisible) return;

        // Clean up any existing subscription first
        if (mentionSubscriptionRef.current) {
          console.log('🔔 Cleaning up existing admin mention subscription before creating new one');
          mentionSubscriptionRef.current.unsubscribe();
          mentionSubscriptionRef.current = null;
        }

        console.log('🔔 Setting up admin mention notifications subscription for:', user.id, 'with clients:', assignedClientIds);
        
        mentionSubscriptionRef.current = subscribeToAdminMentionNotifications(
          user.id,
          assignedClientIds,
          (newNotification: MentionNotification) => {
            console.log('🔔 Admin received new mention notification:', newNotification);
            
            // Add the new mention to the list
            setMentionNotifications(prev => [newNotification, ...prev]);
            
            // Update unread count
            setUnreadMentionCount(prev => prev + 1);
            
            // Show toast notification
            const articleTitle = newNotification.comment?.content_briefs?.title || 'an article';
            const productName = newNotification.comment?.content_briefs?.product_name || 'a product';
            const userName = newNotification.mentioned_by_user?.name || newNotification.mentioned_by_user?.email || 'someone';
            
            toast.success(
              `${userName} mentioned you in ${productName} article "${articleTitle}"`,
              {
                icon: '🔔',
                duration: 5000,
              }
            );
            
            // Play notification sound (optional)
            try {
              const audio = new Audio('/notification-sound.mp3');
              audio.volume = 0.3;
              audio.play().catch(() => {}); // Ignore errors if sound doesn't exist
            } catch (error) {
              // Ignore audio errors
            }
          }
        );
      } catch (error) {
        console.error('❌ Error setting up mention subscription:', error);
      }
    };

    // Only setup subscription when notification center is visible
    if (isVisible) {
      setupMentionSubscription();
    }

    return () => {
      if (mentionSubscriptionRef.current) {
        console.log('🔔 Cleaning up admin mention notifications subscription');
        mentionSubscriptionRef.current.unsubscribe();
        mentionSubscriptionRef.current = null;
      }
    };
  }, [isVisible, assignedClientIds]);

  // Update unread mention count when mention notifications change
  useEffect(() => {
    const unread = mentionNotifications.filter(n => !n.notification_sent).length;
    setUnreadMentionCount(unread);
  }, [mentionNotifications]);

  // Load recent assignment activities and mention notifications
  const loadRecentActivities = async () => {
    try {
      setIsLoading(true);
      
      // Get current admin ID for filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      
      // Load assignment activities - filter based on admin role
      let assignmentQuery = supabase
        .from('admin_client_assignments')
        .select(`
          id,
          admin_id,
          client_user_id,
          assigned_at,
          assigned_by,
          admin_profiles!admin_id(email),
          user_profiles!client_user_id(email, company_name)
        `)
        .order('assigned_at', { ascending: false })
        .limit(50);
      
      // Filter by assigned clients for sub-admins
      if (adminRole === 'sub_admin' && assignedClientIds.length > 0) {
        assignmentQuery = assignmentQuery.in('client_user_id', assignedClientIds);
        console.log(`🔍 [SUB-ADMIN] Filtering assignment activities for ${assignedClientIds.length} assigned clients`);
      } else if (adminRole === 'sub_admin' && assignedClientIds.length === 0) {
        // Sub-admin with no assigned clients should see no assignment activities
        console.log('🔍 [SUB-ADMIN] No assigned clients, showing no assignment activities');
        setRecentActivities([]);
      }
      
      let data, error;
      if (adminRole === 'sub_admin' && assignedClientIds.length === 0) {
        // Skip query if sub-admin has no clients
        data = [];
        error = null;
      } else {
        const result = await assignmentQuery;
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error loading recent activities:', error);
        return;
      }

      const activities: AssignmentActivity[] = data.map(item => ({
        id: item.id,
        admin_id: item.admin_id,
        client_user_id: item.client_user_id,
        admin_email: (item.admin_profiles as any)?.email || 'Unknown Admin',
        client_email: (item.user_profiles as any)?.email || 'Unknown Client',
        client_company: (item.user_profiles as any)?.company_name || 'Unknown Company',
        assigned_at: item.assigned_at,
        assigned_by: item.assigned_by
      }));

      setRecentActivities(activities);
      
      // Load mention notifications for admin (with client filtering for sub-admins)
      let mentions: MentionNotification[] = [];
      try {
        const clientIdsForFiltering = adminRole === 'sub_admin' ? assignedClientIds : undefined;
        mentions = await getMentionNotifications(undefined, clientIdsForFiltering);
        setMentionNotifications(mentions);
        console.log('📥 Loaded mention notifications for admin:', mentions.length);
      } catch (mentionError) {
        console.error('Error loading mention notifications:', mentionError);
      }
      
      // Load brief approval notifications for admin (with client filtering for sub-admins)
      let briefApprovals: BriefApprovalNotification[] = [];
      try {
        // Get current admin ID from authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const clientIdsForFiltering = adminRole === 'sub_admin' ? assignedClientIds : undefined;
          briefApprovals = await getBriefApprovalNotifications(user.id, clientIdsForFiltering);
          setBriefApprovalNotifications(briefApprovals);
          console.log('📄 Loaded brief approval notifications for admin:', briefApprovals.length);
        }
      } catch (briefError) {
        console.error('Error loading brief approval notifications:', briefError);
      }
      
      // Generate notifications based on recent activities, mentions, and brief approvals
      await generateNotificationsFromActivities(activities, mentions, briefApprovals);

    } catch (error) {
      console.error('Error loading recent activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate notifications from activities, mentions, and brief approvals
  const generateNotificationsFromActivities = async (activities: AssignmentActivity[], mentions: MentionNotification[] = [], briefApprovals: BriefApprovalNotification[] = []) => {
    try {
      // Get current admin ID from authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      // Get deleted notifications for this admin
      const { data: deletedNotifications } = await supabase
        .from('deleted_notifications')
        .select('notification_id')
        .eq('admin_id', user.id);

      const deletedIds = new Set(deletedNotifications?.map(d => d.notification_id) || []);
    const generatedNotifications: NotificationItem[] = activities.map((activity, index) => ({
      id: `activity-${activity.id}`,
      type: 'assignment' as const,
      message: `Client assigned to sub-admin`,
      details: `${activity.client_email} (${activity.client_company}) assigned to ${activity.admin_email}`,
      timestamp: activity.assigned_at,
      isRead: index > 10, // Mark older items as read
      priority: 'medium' as const,
      adminId: activity.admin_id,
      clientId: activity.client_user_id,
      metadata: {
        adminEmail: activity.admin_email,
        clientEmail: activity.client_email,
        clientCompany: activity.client_company
      }
    }));

    // Convert mention notifications to notification items
    const mentionNotificationItems: NotificationItem[] = mentions.map((mention) => {
      const articleTitle = mention.comment?.content_briefs?.title || 'Unknown Article';
      const productName = mention.comment?.content_briefs?.product_name || 'Unknown Product';
      const commentUser = mention.comment?.user?.name || mention.comment?.user?.email || 'Someone';
      const articleId = mention.comment?.content_briefs?.id || mention.comment?.article_id;
      
      return {
        id: `mention-${mention.id}`,
        type: 'mention' as const,
        message: articleTitle,
        details: `${commentUser} mentioned you in ${productName}: "${mention.comment?.content?.substring(0, 80)}..."`,
        timestamp: mention.created_at,
        isRead: mention.notification_sent,
        priority: 'high' as const,
        metadata: {
          commentId: mention.comment_id,
          articleId: articleId,
          mentionText: mention.mention_text,
          commentContent: mention.comment?.content,
          articleTitle,
          productName,
          userEmail: mention.comment?.user?.email,
          userName: commentUser
        }
      };
    });

    // Convert brief approval notifications to notification items
    const briefApprovalNotificationItems: NotificationItem[] = briefApprovals.map((brief) => {
      const isProductApproval = brief.notification_type === 'product_approved';
      const isArticleGenerated = brief.notification_type === 'article_generated';
      
      // Use the pre-constructed message if individual fields are null/missing
      const hasIndividualFields = brief.user_email && brief.user_company && brief.brief_title;
      let details, message, notificationType;
      
      if (isArticleGenerated) {
        details = hasIndividualFields 
          ? `${brief.user_email} from ${brief.user_company} generated an article: "${brief.brief_title}"`
          : brief.message || 'Article generated';
        message = 'Article Generated';
        notificationType = 'article_generated' as const;
      } else if (isProductApproval) {
        details = hasIndividualFields 
          ? `${brief.user_email} from ${brief.user_company} approved a product card: "${brief.brief_title}"`
          : brief.message || 'Product card approved';
        message = 'Product Card Approved';
        notificationType = 'product_approved' as const;
      } else {
        details = hasIndividualFields 
          ? `${brief.user_email} from ${brief.user_company} approved: "${brief.brief_title}"`
          : brief.message || 'Content brief approved';
        message = 'Content Brief Approved';
        notificationType = 'brief_approved' as const;
      }
      
      return {
        id: `${isArticleGenerated ? 'article' : (isProductApproval ? 'product' : 'brief')}-${brief.id}`,
        type: notificationType,
        message,
        details,
        timestamp: brief.created_at,
        isRead: brief.is_read,
        priority: 'medium' as const,
        metadata: {
          briefId: brief.brief_id,
          userEmail: brief.user_email,
          userCompany: brief.user_company,
          briefTitle: brief.brief_title,
          notificationType: brief.notification_type
        }
      };
    });

    // Add some system notifications
    const systemNotifications: NotificationItem[] = [
      {
        id: 'system-1',
        type: 'account_created',
        message: 'New sub-admin account created',
        details: 'A new sub-admin editor account was created and is ready for client assignments',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        priority: 'high',
        metadata: { systemGenerated: true }
      },
      {
        id: 'system-2',
        type: 'bulk_operation',
        message: 'Bulk assignment operation completed',
        details: 'Successfully assigned 5 clients to 2 sub-admin editors',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        priority: 'medium',
        metadata: { operationType: 'bulk_assign', count: 5 }
      }
    ];

    // Combine all notifications and sort by timestamp
    const allNotifications = [...systemNotifications, ...mentionNotificationItems, ...briefApprovalNotificationItems, ...generatedNotifications.slice(0, 20)]
      .filter(notification => !deletedIds.has(notification.id))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setNotifications(allNotifications);
    } catch (error) {
      console.error('Error generating notifications:', error);
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'assignments':
        return ['assignment', 'unassignment', 'transfer', 'bulk_operation'].includes(notification.type);
      case 'accounts':
        return ['account_created', 'account_deleted'].includes(notification.type);
      case 'mentions':
        return ['mention', 'comment'].includes(notification.type);
      case 'briefs':
        return notification.type === 'brief_approved';
      case 'products':
        return notification.type === 'product_approved';
      case 'articles':
        return notification.type === 'article_generated';
      default:
        return true;
    }
  });

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    // Handle mention notifications separately
    if (notificationId.startsWith('mention-')) {
      const mentionId = notificationId.replace('mention-', '');
      try {
        await markMentionNotificationsAsSent([mentionId]);
      } catch (error) {
        console.error('Error marking mention as read:', error);
      }
    }
    
    // Handle brief approval notifications separately
    if (notificationId.startsWith('brief-') || notificationId.startsWith('product-') || notificationId.startsWith('article-')) {
      const briefNotificationId = notificationId.replace(/^(brief-|product-|article-)/, '');
      try {
        // Get current admin ID from authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await markBriefApprovalNotificationsAsRead(user.id, [briefNotificationId]);
        }
      } catch (error) {
        console.error('Error marking brief/product/article notification as read:', error);
      }
    }
    
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  // Mark all as read
  const markAllAsRead = async () => {
    // Immediately update UI state for better UX
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
    
    // Update mention notifications state
    setMentionNotifications(prev => 
      prev.map(mention => ({ ...mention, notification_sent: true }))
    );
    
    // Update brief approval notifications state
    setBriefApprovalNotifications(prev => 
      prev.map(brief => ({ ...brief, is_read: true }))
    );
    
    // Mark mention notifications as read
    const mentionIds = notifications
      .filter(n => n.id.startsWith('mention-') && !n.isRead)
      .map(n => n.id.replace('mention-', ''));
    
    if (mentionIds.length > 0) {
      try {
        await markMentionNotificationsAsSent(mentionIds);
      } catch (error) {
        console.error('Error marking mentions as read:', error);
        toast.error('Failed to mark mention notifications as read');
      }
    }
    
    // Mark brief approval notifications as read
    const briefIds = notifications
      .filter(n => (n.id.startsWith('brief-') || n.id.startsWith('product-') || n.id.startsWith('article-')) && !n.isRead)
      .map(n => n.id.replace(/^(brief-|product-|article-)/, ''));
    
    if (briefIds.length > 0) {
      try {
        // Get current admin ID from authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await markBriefApprovalNotificationsAsRead(user.id, briefIds);
        }
      } catch (error) {
        console.error('Error marking brief/product/article notifications as read:', error);
        toast.error('Failed to mark brief/product/article notifications as read');
      }
    }
    
    // Show success message
    toast.success('All notifications marked as read');
    
    // Refresh the data to ensure database changes are reflected
    await loadRecentActivities();
  };

  // Toggle notification selection
  const toggleNotificationSelection = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  // Delete selected notifications
  const deleteSelectedNotifications = () => {
    setNotifications(prev => 
      prev.filter(notification => !selectedNotifications.has(notification.id))
    );
    setSelectedNotifications(new Set());
    toast.success(`Deleted ${selectedNotifications.size} notifications`);
  };

  // Delete individual notification
  const deleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the parent click handler
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error('User not authenticated');
        return;
      }

      // Handle different types of notifications for database cleanup
      if (notificationId.startsWith('brief-') || notificationId.startsWith('product-') || notificationId.startsWith('article-')) {
        const briefNotificationId = notificationId.replace(/^(brief-|product-|article-)/, '');
        // Delete from brief_approval_notifications table (used for brief, product, and article notifications)
        const { error } = await supabase
          .from('brief_approval_notifications')
          .delete()
          .eq('id', briefNotificationId)
          .eq('admin_id', user.id);
        
        if (error) {
          console.error('Error deleting brief/product/article notification:', error);
          toast.error('Failed to delete notification');
          return;
        }
      } else if (notificationId.startsWith('mention-')) {
        const mentionNotificationId = notificationId.replace('mention-', '');
        // Delete from comment_mentions table
        const { error } = await supabase
          .from('comment_mentions')
          .delete()
          .eq('id', mentionNotificationId);
        
        if (error) {
          console.error('Error deleting mention notification:', error);
          toast.error('Failed to delete notification');
          return;
        }
      } else if (notificationId.startsWith('activity-')) {
        // For activity notifications, just mark as deleted in our tracking table
        // since we don't want to delete actual assignment records
        const { error } = await supabase
          .from('deleted_notifications')
          .insert({
            admin_id: user.id,
            notification_id: notificationId,
            notification_type: 'activity'
          });
        
        if (error) {
          console.error('Error marking activity notification as deleted:', error);
          toast.error('Failed to delete notification');
          return;
        }
      } else if (notificationId.startsWith('system-')) {
        // For system notifications, mark as deleted in tracking table
        const { error } = await supabase
          .from('deleted_notifications')
          .insert({
            admin_id: user.id,
            notification_id: notificationId,
            notification_type: 'system'
          });
        
        if (error) {
          console.error('Error marking system notification as deleted:', error);
          toast.error('Failed to delete notification');
          return;
        }
      }
      
      // Remove from local state
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      // Remove from selected notifications if it was selected
      setSelectedNotifications(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(notificationId);
        return newSelected;
      });
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'assignment':
        return UserPlus;
      case 'unassignment':
        return UserMinus;
      case 'transfer':
        return Shuffle;
      case 'account_created':
        return UserPlus;
      case 'account_deleted':
        return Trash2;
      case 'bulk_operation':
        return Users;
      case 'mention':
        return AtSign;
      case 'comment':
        return MessageSquare;
      case 'brief_approved':
        return CheckCircle;
      case 'product_approved':
        return CheckCircle;
      case 'article_generated':
        return FileText;
      default:
        return Bell;
    }
  };

  // Get notification color
  const getNotificationColor = (priority: NotificationItem['priority'], isRead: boolean) => {
    if (isRead) return 'text-gray-400';
    
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  // Load data on component mount and when assignments change
  useEffect(() => {
    if (isVisible) {
      loadRecentActivities();
    }
  }, [isVisible, assignedClientIds, adminRole]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <BaseModal
      isOpen={isVisible}
      onClose={onClose}
      title="Assignment Notifications"
      size="xl"
      theme="dark"
    >
      {/* Title icon and stats */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-blue-500/20 relative">
          <Bell className="h-6 w-6 text-blue-400" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-400">
            {unreadCount} unread • {notifications.length} total
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {selectedNotifications.size > 0 && (
            <button
              onClick={deleteSelectedNotifications}
              className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedNotifications.size})
            </button>
          )}
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30"
          >
            <CheckCircle className="h-4 w-4" />
            Mark All Read
          </button>
          
          {/* Debug button for testing mention system */}
          <button
            onClick={() => debugMentionSystem()}
            className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30"
          >
            🐛 Debug Mentions
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-700 pb-4">
        {[
          { key: 'all', label: 'All', count: notifications.length },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { key: 'assignments', label: 'Assignments', count: notifications.filter(n => ['assignment', 'unassignment', 'transfer', 'bulk_operation'].includes(n.type)).length },
          { key: 'accounts', label: 'Accounts', count: notifications.filter(n => ['account_created', 'account_deleted'].includes(n.type)).length },
          { key: 'mentions', label: 'Mentions', count: notifications.filter(n => ['mention', 'comment'].includes(n.type)).length },
          { key: 'briefs', label: 'Brief Approvals', count: notifications.filter(n => n.type === 'brief_approved').length },
          { key: 'products', label: 'Product Approvals', count: notifications.filter(n => n.type === 'product_approved').length },
          { key: 'articles', label: 'Article Generation', count: notifications.filter(n => n.type === 'article_generated').length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Bell className="h-8 w-8 animate-pulse text-blue-400" />
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const isSelected = selectedNotifications.has(notification.id);
            
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group p-5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/25'
                    : notification.isRead
                    ? 'bg-gray-800/40 border-gray-700/50'
                    : 'bg-gray-800/80 border-gray-600/50 hover:bg-gray-700/60 shadow-lg'
                }`}
                onClick={() => {
                  toggleNotificationSelection(notification.id);
                  if (!notification.isRead) markAsRead(notification.id);
                }}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    notification.priority === 'high' ? 'bg-red-500/20' :
                    notification.priority === 'medium' ? 'bg-yellow-500/20' :
                    'bg-blue-500/20'
                  }`}>
                    <Icon className={`h-5 w-5 ${getNotificationColor(notification.priority, notification.isRead)}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className={`font-semibold text-lg ${notification.isRead ? 'text-gray-300' : 'text-white'}`}>
                        {notification.message}
                      </h4>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      )}
                    </div>

                    {/* Rich Context for Mention Notifications */}
                    {notification.type === 'mention' && notification.metadata && (
                      <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-gray-300">Article:</span>
                            <span className="text-sm text-white font-medium">{notification.metadata.articleTitle}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-green-400" />
                            <span className="text-sm text-gray-300">Product:</span>
                            <span className="text-sm text-white font-medium">{notification.metadata.productName}</span>
                          </div>
                        </div>
                        
                        {notification.metadata.commentContent && (
                          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/20">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="h-4 w-4 text-purple-400" />
                              <span className="text-sm text-gray-300 font-medium">Comment Preview</span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">
                              {notification.metadata.commentContent.length > 150 
                                ? `${notification.metadata.commentContent.substring(0, 150)}...`
                                : notification.metadata.commentContent
                              }
                            </p>
                          </div>
                        )}
                        
                        {/* Navigation Button */}
                        <div className="flex items-center gap-2 mt-4">
                          {notification.metadata.articleId && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => handleNavigateToArticle(notification.metadata.articleId, e)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Go to Article
                            </motion.button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rich Context for Brief Approval Notifications */}
                    {(['brief_approved', 'product_approved', 'article_generated'].includes(notification.type)) && notification.metadata && (
                      <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-gray-300">User:</span>
                            <span className="text-sm text-white font-medium">{notification.metadata.userEmail || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-green-400" />
                            <span className="text-sm text-gray-300">Company:</span>
                            <span className="text-sm text-white font-medium">{notification.metadata.userCompany || 'Unknown'}</span>
                          </div>
                        </div>
                        
                        {notification.metadata.briefTitle && (
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4 text-purple-400" />
                            <span className="text-sm text-gray-300">Brief:</span>
                            <span className="text-sm text-white font-medium">{notification.metadata.briefTitle}</span>
                          </div>
                        )}

                        {/* Navigation Button */}
                        {notification.metadata.briefId && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => handleNavigateToArticle(notification.metadata.briefId, e)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Content Brief
                          </motion.button>
                        )}
                      </div>
                    )}

                    {/* Standard Details */}
                    {notification.details && !['mention', 'brief_approved', 'product_approved', 'article_generated'].includes(notification.type) && (
                      <p className={`text-sm ${notification.isRead ? 'text-gray-500' : 'text-gray-400'} leading-relaxed`}>
                        {notification.details}
                      </p>
                    )}
                    
                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>

                    {/* Navigation Error */}
                    {navigationError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 p-3 bg-red-50/10 border border-red-500/20 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          <span className="text-sm text-red-400">{navigationError}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-blue-400" />
                    )}
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      notification.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                      notification.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {notification.priority}
                    </span>
                    <button
                      onClick={(e) => deleteNotification(notification.id, e)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
          <p>
            {filter === 'all' ? 'No notifications found' :
             filter === 'unread' ? 'All notifications have been read' :
             `No ${filter} notifications found`}
          </p>
        </div>
      )}
    </BaseModal>
  );
} 