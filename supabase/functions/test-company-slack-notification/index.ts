import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { companyId } = await req.json()

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Company ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get admin Slack access token
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('slack_access_token, slack_team_name')
      .eq('email', 'lashay@bofu.ai')
      .single()

    if (adminError || !adminProfile || !adminProfile.slack_access_token) {
      console.error('Admin Slack not connected:', adminError)
      return new Response(
        JSON.stringify({ error: 'Admin Slack integration not configured' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get company's assigned Slack channel
    const { data: company, error: companyError } = await supabaseAdmin
      .from('user_profiles')
      .select('company_name, admin_assigned_slack_channel_id, admin_assigned_slack_channel_name')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      console.error('Company not found:', companyError)
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!company.admin_assigned_slack_channel_id) {
      return new Response(
        JSON.stringify({ error: 'No Slack channel assigned to this company' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create test notification message
    const message = {
      channel: company.admin_assigned_slack_channel_id,
      text: `🧪 Test notification for ${company.company_name}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🧪 BOFU AI Test Notification"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `This is a test notification for *${company.company_name}*`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Company:*\n${company.company_name}`
            },
            {
              type: "mrkdwn",
              text: `*Channel:*\n#${company.admin_assigned_slack_channel_name}`
            },
            {
              type: "mrkdwn",
              text: `*Workspace:*\n${adminProfile.slack_team_name}`
            },
            {
              type: "mrkdwn",
              text: `*Time:*\n${new Date().toLocaleString()}`
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "✅ Your Slack integration is working correctly! Future content brief notifications will be delivered to this channel."
            }
          ]
        }
      ]
    }

    // Send message to Slack
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminProfile.slack_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    const slackData = await slackResponse.json()
    console.log('Test company Slack notification response:', { 
      ok: slackData.ok, 
      error: slackData.error,
      company: company.company_name,
      channel: company.admin_assigned_slack_channel_name
    })

    if (!slackData.ok) {
      console.error('Failed to send test notification:', slackData.error)
      
      // Handle specific Slack errors
      let errorMessage = 'Failed to send test notification'
      if (slackData.error === 'channel_not_found') {
        errorMessage = 'Channel not found. Please make sure the BOFU AI bot is added to the channel.'
      } else if (slackData.error === 'not_in_channel') {
        errorMessage = 'Bot not in channel. Please add the BOFU AI bot to the channel first.'
      } else if (slackData.error === 'invalid_auth') {
        errorMessage = 'Slack connection expired. Please reconnect admin Slack integration.'
      } else if (slackData.error) {
        errorMessage = `Slack error: ${slackData.error}`
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Test notification sent successfully to ${company.company_name} (#${company.admin_assigned_slack_channel_name})`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test notification sent successfully',
        company: company.company_name,
        channel: company.admin_assigned_slack_channel_name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in test-company-slack-notification function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})