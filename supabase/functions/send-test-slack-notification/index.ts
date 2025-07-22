import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔄 Send test Slack notification function started')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
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

    // Get user's profile and Slack integration data
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('email, company_name, slack_access_token, slack_channel_id, slack_channel_name, slack_notifications_enabled')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!userProfile.slack_notifications_enabled || !userProfile.slack_access_token || !userProfile.slack_channel_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Slack not configured',
          message: 'Slack notifications are not enabled or properly configured for your account'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Sending test Slack notification to channel:', userProfile.slack_channel_name)

    // Prepare test Slack message
    const testMessage = {
      channel: userProfile.slack_channel_id,
      text: '🧪 Test Notification from BOFU AI',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 Test Notification from BOFU AI',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'This is a test notification to verify that your Slack integration is working correctly!'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Company:*\n${userProfile.company_name || 'Unknown Company'}`
            },
            {
              type: 'mrkdwn',
              text: `*Channel:*\n#${userProfile.slack_channel_name}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*What this means:*\n• Your Slack integration is properly configured ✅\n• You will receive notifications for content brief approvals\n• You will receive notifications for article generations\n• You can manage these settings in your BOFU dashboard'
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `📅 Test sent on ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })} | 🤖 BOFU AI Test System`
            }
          ]
        }
      ]
    }

    // Send message to Slack using Web API
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userProfile.slack_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    })

    const slackResult = await slackResponse.json()
    console.log('Slack API response:', { ok: slackResult.ok, error: slackResult.error })

    if (!slackResult.ok) {
      console.error('Slack API error:', slackResult.error)
      
      // Handle token expiration or revocation
      if (slackResult.error === 'invalid_auth' || slackResult.error === 'token_revoked') {
        console.log('Slack token invalid, clearing user integration')
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
          JSON.stringify({ 
            error: 'slack_disconnected',
            message: 'Your Slack connection has expired. Please reconnect your Slack account.'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Handle bot not in channel
      if (slackResult.error === 'not_in_channel') {
        return new Response(
          JSON.stringify({ 
            error: 'bot_not_in_channel',
            message: `The BOFU AI bot is not a member of #${userProfile.slack_channel_name}. Please invite the bot to the channel by typing "/invite @BOFU AI" in the channel, then try again.`,
            details: slackResult.error,
            channel: userProfile.slack_channel_name
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'slack_send_failed',
          message: `Failed to send Slack message: ${slackResult.error}`,
          details: slackResult.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Test Slack notification sent successfully:', slackResult.ts)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test notification sent successfully!',
        channel: userProfile.slack_channel_name,
        timestamp: slackResult.ts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-test-slack-notification:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred while sending the test notification'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})