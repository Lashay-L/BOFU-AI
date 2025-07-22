import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔄 Slack channels function started')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's session
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Slack integration data
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('slack_access_token, slack_team_name')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile || !userProfile.slack_access_token) {
      return new Response(
        JSON.stringify({ error: 'Slack not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching channels for team:', userProfile.slack_team_name)

    // Fetch available channels using the user's access token
    const channelsResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100', {
      headers: {
        'Authorization': `Bearer ${userProfile.slack_access_token}`,
        'Content-Type': 'application/json'
      }
    })

    const channelsData = await channelsResponse.json()
    console.log('Slack API response:', { ok: channelsData.ok, channelCount: channelsData.channels?.length })

    if (!channelsData.ok) {
      console.error('Slack API error:', channelsData.error)
      
      // Handle token expiration
      if (channelsData.error === 'invalid_auth' || channelsData.error === 'token_revoked') {
        // Clear invalid token from database
        await supabase
          .from('user_profiles')
          .update({
            slack_access_token: null,
            slack_team_id: null,
            slack_team_name: null,
            slack_user_id: null,
            slack_channel_id: null,
            slack_channel_name: null,
            slack_notifications_enabled: false
          })
          .eq('id', user.id)

        return new Response(
          JSON.stringify({ error: 'slack_disconnected', message: 'Slack connection expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ error: 'Failed to fetch channels', details: channelsData.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format channels for frontend
    const formattedChannels = channelsData.channels
      .filter((channel: any) => !channel.is_archived) // Only active channels
      .map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        is_private: channel.is_private,
        is_member: channel.is_member,
        purpose: channel.purpose?.value || '',
        member_count: channel.num_members || 0
      }))
      .sort((a: any, b: any) => {
        // Sort by: member channels first, then alphabetically
        if (a.is_member && !b.is_member) return -1
        if (!a.is_member && b.is_member) return 1
        return a.name.localeCompare(b.name)
      })

    console.log(`✅ Retrieved ${formattedChannels.length} channels`)

    return new Response(
      JSON.stringify({
        success: true,
        channels: formattedChannels,
        team_name: userProfile.slack_team_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in slack-channels:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})