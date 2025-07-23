import { supabase, supabaseAdmin } from './supabase';
import { SlackChannel } from './slackService';

export interface AdminSlackConnectionStatus {
  connected: boolean;
  team_name?: string;
  admin_email?: string;
}

export interface CompanySlackSettings {
  company_id: string;
  company_name: string;
  slack_channel_id?: string;
  slack_channel_name?: string;
  notifications_enabled: boolean;
  assigned_at?: string;
}

/**
 * Generate Slack OAuth authorization URL for super admin
 */
export function generateAdminSlackOAuthURL(): string {
  const SLACK_CLIENT_ID = "5930579212176.9234329054229";
  const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-slack-oauth-callback`;
  
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
    state: 'admin_connection', // Special state for admin connections
    response_type: 'code'
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

/**
 * Get super admin's Slack connection status
 */
export async function getAdminSlackConnectionStatus(): Promise<AdminSlackConnectionStatus> {
  try {
    // Check admin_profiles table for super admin Slack connection
    const { data: adminProfile, error } = await supabaseAdmin
      .from('admin_profiles')
      .select('slack_team_name, slack_access_token, email')
      .eq('email', 'lashay@bofu.ai') // Super admin email
      .single();

    if (error || !adminProfile) {
      console.error('Error fetching admin Slack status:', error);
      return { connected: false };
    }

    return {
      connected: !!adminProfile.slack_access_token,
      team_name: adminProfile.slack_team_name,
      admin_email: adminProfile.email
    };
  } catch (error) {
    console.error('Error in getAdminSlackConnectionStatus:', error);
    return { connected: false };
  }
}

/**
 * Fetch available Slack channels for the super admin
 */
export async function fetchAdminSlackChannels(): Promise<{ success: boolean; channels?: SlackChannel[]; team_name?: string; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await supabase.functions.invoke('admin-slack-channels', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (response.error) {
      console.error('Error fetching admin Slack channels:', response.error);
      return { success: false, error: 'Failed to fetch channels' };
    }

    return {
      success: true,
      channels: response.data.channels,
      team_name: response.data.team_name
    };
  } catch (error) {
    console.error('Error in fetchAdminSlackChannels:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Assign a Slack channel to a specific company
 */
export async function assignCompanySlackChannel(
  companyId: string, 
  channelId: string, 
  channelName: string
): Promise<boolean> {
  try {
    // First, check if we have a company_slack_settings table, if not create the record in user_profiles
    // We'll update the main account for the company with the assigned channel info
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        admin_assigned_slack_channel_id: channelId,
        admin_assigned_slack_channel_name: channelName,
        admin_slack_assigned_at: new Date().toISOString()
      })
      .eq('id', companyId);

    if (error) {
      console.error('Error assigning Slack channel to company:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in assignCompanySlackChannel:', error);
    return false;
  }
}

/**
 * Get company's assigned Slack channel
 */
export async function getCompanySlackChannel(companyId: string): Promise<CompanySlackSettings | null> {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is null - missing service role key');
      return null;
    }

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        company_name,
        admin_assigned_slack_channel_id,
        admin_assigned_slack_channel_name,
        slack_notifications_enabled,
        admin_slack_assigned_at
      `)
      .eq('id', companyId)
      .single();

    if (error || !profile) {
      return null;
    }

    return {
      company_id: profile.id,
      company_name: profile.company_name,
      slack_channel_id: profile.admin_assigned_slack_channel_id,
      slack_channel_name: profile.admin_assigned_slack_channel_name,
      notifications_enabled: profile.slack_notifications_enabled || false,
      assigned_at: profile.admin_slack_assigned_at
    };
  } catch (error) {
    console.error('Error in getCompanySlackChannel:', error);
    return null;
  }
}

/**
 * Send a test notification to a company's assigned Slack channel
 */
export async function testCompanySlackNotification(companyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await supabase.functions.invoke('test-company-slack-notification', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ companyId })
    });

    if (response.error) {
      console.error('Error sending test company notification:', response.error);
      const errorMessage = response.data?.message || response.data?.error || response.error.message || 'Failed to send test notification';
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in testCompanySlackNotification:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Disconnect super admin's Slack integration
 */
export async function disconnectAdminSlack(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('admin_profiles')
      .update({
        slack_access_token: null,
        slack_team_id: null,
        slack_team_name: null,
        slack_user_id: null,
        slack_connected_at: null
      })
      .eq('email', 'lashay@bofu.ai'); // Super admin email

    if (error) {
      console.error('Error disconnecting admin Slack:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in disconnectAdminSlack:', error);
    return false;
  }
}

/**
 * Get all companies with their Slack settings
 */
export async function getAllCompaniesSlackSettings(): Promise<CompanySlackSettings[]> {
  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        company_name,
        admin_assigned_slack_channel_id,
        admin_assigned_slack_channel_name,
        slack_notifications_enabled,
        admin_slack_assigned_at
      `)
      .order('company_name');

    if (error) {
      console.error('Error fetching companies Slack settings:', error);
      return [];
    }

    return (profiles || []).map(profile => ({
      company_id: profile.id,
      company_name: profile.company_name,
      slack_channel_id: profile.admin_assigned_slack_channel_id,
      slack_channel_name: profile.admin_assigned_slack_channel_name,
      notifications_enabled: profile.slack_notifications_enabled || false,
      assigned_at: profile.admin_slack_assigned_at
    }));
  } catch (error) {
    console.error('Error in getAllCompaniesSlackSettings:', error);
    return [];
  }
}

/**
 * Update company's Slack notification settings
 */
export async function updateCompanySlackNotifications(
  companyId: string, 
  enabled: boolean
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        slack_notifications_enabled: enabled
      })
      .eq('id', companyId);

    if (error) {
      console.error('Error updating company Slack notifications:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateCompanySlackNotifications:', error);
    return false;
  }
}

/**
 * Remove channel assignment from a company
 */
export async function removeCompanySlackChannel(companyId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        admin_assigned_slack_channel_id: null,
        admin_assigned_slack_channel_name: null,
        admin_slack_assigned_at: null,
        slack_notifications_enabled: false
      })
      .eq('id', companyId);

    if (error) {
      console.error('Error removing company Slack channel:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeCompanySlackChannel:', error);
    return false;
  }
}