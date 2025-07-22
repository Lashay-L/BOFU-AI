import { supabase } from './supabase';

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  purpose: string;
  member_count: number;
}

export interface SlackConnectionStatus {
  connected: boolean;
  team_name?: string;
  channel_name?: string;
  notifications_enabled?: boolean;
}

/**
 * Generate Slack OAuth authorization URL
 */
export function generateSlackOAuthURL(userId: string): string {
  const SLACK_CLIENT_ID = "5930579212176.9234329054229";
  const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-oauth-callback`;
  
  const scopes = [
    'chat:write',
    'channels:read',
    'groups:read',
    'users:read',
    'users:read.email'
  ].join(',');

  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    scope: scopes,
    redirect_uri: REDIRECT_URI,
    state: userId, // Pass user ID as state for callback
    response_type: 'code'
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

/**
 * Get user's Slack connection status
 */
export async function getSlackConnectionStatus(): Promise<SlackConnectionStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { connected: false };
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('slack_team_name, slack_channel_name, slack_notifications_enabled, slack_access_token')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.error('Error fetching Slack status:', error);
      return { connected: false };
    }

    return {
      connected: !!profile.slack_access_token,
      team_name: profile.slack_team_name,
      channel_name: profile.slack_channel_name,
      notifications_enabled: profile.slack_notifications_enabled
    };
  } catch (error) {
    console.error('Error in getSlackConnectionStatus:', error);
    return { connected: false };
  }
}

/**
 * Fetch available Slack channels for the connected user
 */
export async function fetchSlackChannels(): Promise<{ success: boolean; channels?: SlackChannel[]; team_name?: string; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await supabase.functions.invoke('slack-channels', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (response.error) {
      console.error('Error fetching Slack channels:', response.error);
      return { success: false, error: 'Failed to fetch channels' };
    }

    return {
      success: true,
      channels: response.data.channels,
      team_name: response.data.team_name
    };
  } catch (error) {
    console.error('Error in fetchSlackChannels:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Update user's selected Slack channel
 */
export async function updateSlackChannel(channelId: string, channelName: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        slack_channel_id: channelId,
        slack_channel_name: channelName
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating Slack channel:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateSlackChannel:', error);
    return false;
  }
}

/**
 * Toggle Slack notifications on/off
 */
export async function toggleSlackNotifications(enabled: boolean): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        slack_notifications_enabled: enabled
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error toggling Slack notifications:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in toggleSlackNotifications:', error);
    return false;
  }
}

/**
 * Disconnect user's Slack integration
 */
export async function disconnectSlack(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        slack_access_token: null,
        slack_team_id: null,
        slack_team_name: null,
        slack_user_id: null,
        slack_channel_id: null,
        slack_channel_name: null,
        slack_notifications_enabled: false,
        slack_connected_at: null
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error disconnecting Slack:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in disconnectSlack:', error);
    return false;
  }
}

/**
 * Send a test notification to user's Slack channel
 */
export async function sendTestSlackNotification(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await supabase.functions.invoke('send-test-slack-notification', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (response.error) {
      console.error('Error sending test notification:', response.error);
      return { success: false, error: 'Failed to send test notification' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in sendTestSlackNotification:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Format notification type for display
 */
export function getNotificationTypeLabel(type: string): string {
  switch (type) {
    case 'brief_approved':
      return 'Content Brief Approved';
    case 'product_approved':
      return 'Product Approved';
    case 'article_generated':
      return 'Article Generated';
    default:
      return 'Notification';
  }
}

/**
 * Check if URL query params contain Slack OAuth results
 */
export function checkSlackOAuthResult(): { success?: boolean; error?: string; team?: string } {
  const params = new URLSearchParams(window.location.search);
  
  if (params.has('slack_success')) {
    const team = params.get('team');
    return { success: true, team: team || undefined };
  }
  
  if (params.has('slack_error')) {
    const error = params.get('slack_error');
    return { error: error || 'Unknown error' };
  }
  
  return {};
}