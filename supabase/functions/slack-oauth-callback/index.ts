import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔄 [v6] Slack OAuth callback - manual deployment')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get Slack app credentials
    const SLACK_CLIENT_ID = "5930579212176.9234329054229"
    const SLACK_CLIENT_SECRET = "37fdc8b3c4a2ee0a509f23a4cc1e597b"
    const SLACK_REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/slack-oauth-callback`

    // Parse URL parameters
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // This should contain user ID
    const error = url.searchParams.get('error')

    console.log('OAuth callback params:', { code: !!code, state, error, method: req.method })

    // Handle test requests
    if (url.searchParams.has('test')) {
      return new Response(
        JSON.stringify({ 
          status: 'OK', 
          message: 'Slack OAuth callback function is working [v6 - manual deployment]',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (error) {
      console.error('Slack OAuth error:', error)
      const frontendUrl = 'http://localhost:5173' // Default to localhost for errors
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${frontendUrl}/user-settings?slack_error=${encodeURIComponent(error)}`
        }
      })
    }

    if (!code || !state) {
      console.error('Missing required params:', { code: !!code, state: !!state })
      return new Response(
        JSON.stringify({ error: 'Missing authorization code or state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = state

    // Verify the user exists
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (userCheckError || !existingUser) {
      console.error('User verification failed:', userCheckError)
      const frontendUrl = 'http://localhost:5173' // Default to localhost for errors
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${frontendUrl}/user-settings?slack_error=user_not_found`
        }
      })
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code: code,
        redirect_uri: SLACK_REDIRECT_URI
      })
    })

    const tokenData = await tokenResponse.json()
    console.log('Slack OAuth response:', { ok: tokenData.ok, team: tokenData.team?.name, error: tokenData.error })

    if (!tokenData.ok) {
      console.error('Slack OAuth token exchange failed:', tokenData.error)
      const frontendUrl = 'http://localhost:5173' // Default to localhost for errors
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${frontendUrl}/user-settings?slack_error=token_exchange_failed`
        }
      })
    }

    // Extract token and team info
    const accessToken = tokenData.access_token
    const botToken = tokenData.bot?.bot_access_token
    const botUserId = tokenData.bot?.bot_user_id
    const teamId = tokenData.team?.id
    const teamName = tokenData.team?.name
    const slackUserId = tokenData.authed_user?.id

    // Fetch available channels using bot token for better permissions
    const channelsResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=50', {
      headers: {
        'Authorization': `Bearer ${botToken || accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    const channelsData = await channelsResponse.json()
    
    let defaultChannel = null
    if (channelsData.ok && channelsData.channels?.length > 0) {
      defaultChannel = channelsData.channels.find((ch: any) => ch.name === 'general') || 
                      channelsData.channels.find((ch: any) => !ch.is_private && ch.is_member) ||
                      channelsData.channels.find((ch: any) => !ch.is_private) ||
                      channelsData.channels[0]
    }

    // Update user's Slack integration data
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        slack_access_token: accessToken,
        slack_bot_token: botToken,
        slack_bot_user_id: botUserId,
        slack_team_id: teamId,
        slack_team_name: teamName,
        slack_user_id: slackUserId,
        slack_channel_id: defaultChannel?.id || null,
        slack_channel_name: defaultChannel?.name || null,
        slack_notifications_enabled: true,
        slack_connected_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      const frontendUrl = 'http://localhost:5173' // Default to localhost for errors
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${frontendUrl}/user-settings?slack_error=database_update_failed`
        }
      })
    }

    console.log('✅ Successfully connected Slack for user:', existingUser.email)

    // Redirect back to settings page with success - use frontend app URL
    const frontendUrl = existingUser.email.includes('demo') ? 'http://localhost:5173' : 'https://bofu.netlify.app'
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `${frontendUrl}/user-settings?slack_success=true&team=${encodeURIComponent(teamName)}&channel=${encodeURIComponent(defaultChannel?.name || 'no-channel')}`
      }
    })

  } catch (error) {
    console.error('Error in slack-oauth-callback:', error)
    const frontendUrl = 'http://localhost:5173' // Default to localhost for errors
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `${frontendUrl}/user-settings?slack_error=unexpected_error`
      }
    })
  }
})