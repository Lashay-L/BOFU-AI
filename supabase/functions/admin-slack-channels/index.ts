import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get super admin's Slack connection details
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .select('slack_access_token, slack_team_name')
      .eq('email', 'lashay@bofu.ai')
      .single()

    if (profileError || !adminProfile) {
      console.error('Error fetching admin profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Admin profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!adminProfile.slack_access_token) {
      console.error('No admin Slack access token found')
      return new Response(
        JSON.stringify({ error: 'Admin Slack not connected' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch channels from Slack API
    const channelTypes = 'public_channel,private_channel'
    const slackResponse = await fetch(
      `https://slack.com/api/conversations.list?types=${channelTypes}&exclude_archived=true&limit=200`,
      {
        headers: {
          'Authorization': `Bearer ${adminProfile.slack_access_token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const slackData = await slackResponse.json()
    console.log('Admin Slack channels response:', { 
      ok: slackData.ok, 
      error: slackData.error,
      channelCount: slackData.channels?.length 
    })

    if (!slackData.ok) {
      console.error('Slack API error:', slackData.error)
      
      // Handle expired token
      if (slackData.error === 'invalid_auth' || slackData.error === 'account_inactive') {
        // Clear the expired token
        await supabaseAdmin
          .from('admin_profiles')
          .update({
            slack_access_token: null,
            slack_team_id: null,
            slack_team_name: null,
            slack_user_id: null,
            slack_connected_at: null
          })
          .eq('email', 'lashay@bofu.ai')
        
        return new Response(
          JSON.stringify({ error: 'admin_slack_disconnected' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ error: slackData.error || 'Failed to fetch channels' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Transform channels data
    const channels = slackData.channels.map((channel: any) => ({
      id: channel.id,
      name: channel.name,
      is_private: channel.is_private || false,
      is_member: channel.is_member || false,
      purpose: channel.purpose?.value || '',
      member_count: channel.num_members || 0
    }))

    console.log(`Successfully fetched ${channels.length} admin Slack channels`)

    return new Response(
      JSON.stringify({
        channels,
        team_name: adminProfile.slack_team_name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-slack-channels function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})