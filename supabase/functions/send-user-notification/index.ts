import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔄 Send user notification function started')
  
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
    // Parse request body
    const { userId, briefId, briefTitle, productName, notificationType } = await req.json()
    
    if (!userId || !briefTitle || !notificationType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, briefTitle, notificationType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create Supabase client with user session for auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Get current user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile with admin-assigned Slack channels
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('email, company_name, name, slack_access_token, slack_channel_id, slack_channel_name, slack_notifications_enabled, admin_assigned_slack_channel_id, admin_assigned_slack_channel_name')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notification messages based on type
    let title: string
    let message: string
    let slackBlocks: any[]

    if (notificationType === 'brief_generated') {
      title = `Content Brief Generated: ${briefTitle}`
      message = `Your content brief "${briefTitle}"${productName ? ` for ${productName}` : ''} has been generated and is ready for your approval.`
      
      slackBlocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📝 Content Brief Generated',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Your content brief *"${briefTitle}"* has been generated and is ready for your approval!`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Brief Title:*\\n${briefTitle}`
            },
            ...(productName ? [{
              type: 'mrkdwn',
              text: `*Product:*\\n${productName}`
            }] : [])
          ]
        }
      ]
    } else if (notificationType === 'article_generated') {
      title = `Article Generated: ${briefTitle}`
      message = `Your article "${briefTitle}"${productName ? ` for ${productName}` : ''} has been generated and is ready for review.`
      
      slackBlocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚀 Article Generated',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Great news! Your article *"${briefTitle}"* has been generated and is ready for review.`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Article Title:*\\n${briefTitle}`
            },
            ...(productName ? [{
              type: 'mrkdwn',
              text: `*Product:*\\n${productName}`
            }] : [])
          ]
        }
      ]
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid notification type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Create in-app notification
    console.log('Creating in-app user notification...')
    const { data: notification, error: notificationError } = await supabaseAdmin
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
      .single()

    if (notificationError) {
      console.error('Error creating user notification:', notificationError)
      return new Response(
        JSON.stringify({ error: 'Failed to create notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User notification created:', notification.id)

    // 2. Send Slack notification (prioritize admin-assigned channels)
    let slackSent = false
    
    // Check if company has admin-assigned channel
    if (userProfile.admin_assigned_slack_channel_id) {
      console.log('Using admin-assigned Slack channel:', userProfile.admin_assigned_slack_channel_name)
      
      // Get admin Slack access token
      const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from('admin_profiles')
        .select('slack_access_token')
        .eq('email', 'lashay@bofu.ai')
        .single()
      
      if (adminError || !adminProfile || !adminProfile.slack_access_token) {
        console.error('Admin Slack access token not found:', adminError)
      } else {
        // Send notification using admin token to company's assigned channel
        await sendSlackNotification(
          adminProfile.slack_access_token,
          userProfile.admin_assigned_slack_channel_id,
          userProfile.admin_assigned_slack_channel_name,
          title,
          slackBlocks
        )
        slackSent = true
      }
    }
    // Fallback to user-level Slack integration if no admin assignment
    else if (userProfile.slack_notifications_enabled && 
             userProfile.slack_access_token && 
             userProfile.slack_channel_id) {
      
      console.log('Using user-level Slack integration:', userProfile.slack_channel_name)
      await sendSlackNotification(
        userProfile.slack_access_token,
        userProfile.slack_channel_id,
        userProfile.slack_channel_name,
        title,
        slackBlocks
      )
      slackSent = true
    }

    // Helper function to send Slack notification
    async function sendSlackNotification(accessToken: string, channelId: string, channelName: string, title: string, slackBlocks: any[]) {
      // Add common footer blocks
      const commonFooterBlocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Next Steps:*\\n• Log into your BOFU dashboard to review\\n• Check your email for detailed information\\n• Questions? Contact our support team'
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
              text: `📅 ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })} | 🤖 BOFU AI Notification System`
            }
          ]
        }
      ]

      const slackMessage = {
        channel: channelId,
        text: title,
        blocks: [...slackBlocks, ...commonFooterBlocks]
      }

      try {
        const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(slackMessage)
        })

        const slackResult = await slackResponse.json()
        console.log('Slack API response:', { ok: slackResult.ok, error: slackResult.error, channel: channelName })

        if (slackResult.ok) {
          console.log('✅ Slack notification sent successfully to', channelName)
        } else {
          console.error('Slack API error:', slackResult.error)
          
          // Handle token expiration (only for user-level tokens, not admin tokens)
          if ((slackResult.error === 'invalid_auth' || slackResult.error === 'token_revoked') && 
              accessToken === userProfile.slack_access_token) {
            console.log('User Slack token invalid, clearing user integration')
            await supabaseAdmin
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
              .eq('id', userId)
          }
        }
      } catch (slackError) {
        console.error('Error sending Slack notification:', slackError)
      }
    }

    // 3. Send Email notification
    console.log('Sending email notification...')
    let emailSent = false
    
    // Use the existing brief approval email system with custom content for user notifications
    try {
      // Call the send-brief-approval-notification function but for user emails
      const emailResponse = await supabaseAdmin.functions.invoke('send-brief-approval-notification', {
        body: {
          briefId,
          briefTitle,
          userId,
          notificationType,
          isUserNotification: true // Flag to indicate this is for user, not admin
        }
      })

      if (!emailResponse.error) {
        emailSent = true
        console.log('✅ Email notification sent successfully')
      } else {
        console.error('Email notification error:', emailResponse.error)
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User notification sent successfully',
        notification_id: notification.id,
        channels: {
          in_app: true,
          slack: slackSent,
          email: emailSent
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-user-notification:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred while sending the notification'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})