import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔄 Process notification queue function started')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get unprocessed notifications
    const { data: notifications, error } = await supabaseAdmin
      .from('notification_queue')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(10) // Process in batches

    if (error) {
      console.error('Error fetching notifications:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${notifications?.length || 0} notifications`)

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No notifications to process' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process each notification
    for (const notification of notifications) {
      try {
        console.log(`Processing notification for user ${notification.user_id}: ${notification.brief_title}`)

        // Call the existing send-user-notification function
        const { data, error: notifError } = await supabaseAdmin.functions.invoke('send-user-notification', {
          body: {
            userId: notification.user_id,
            briefId: notification.brief_id,
            briefTitle: notification.brief_title,
            productName: notification.product_name,
            notificationType: notification.notification_type
          }
        })

        if (notifError) {
          console.error(`Error sending notification for ${notification.id}:`, notifError)
          // Mark as processed with error
          await supabaseAdmin
            .from('notification_queue')
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              error_message: notifError.message || 'Unknown error'
            })
            .eq('id', notification.id)
        } else {
          console.log(`Successfully processed notification ${notification.id}`)
          // Mark as successfully processed
          await supabaseAdmin
            .from('notification_queue')
            .update({
              processed: true,
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id)
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error)
        // Mark as processed with error
        await supabaseAdmin
          .from('notification_queue')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            error_message: error.message || 'Unknown error'
          })
          .eq('id', notification.id)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${notifications.length} notifications`,
        processed: notifications.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in notification queue processing:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})