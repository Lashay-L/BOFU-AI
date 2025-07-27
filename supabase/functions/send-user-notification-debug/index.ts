import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔄 DEBUG: Send user notification function started')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log('❌ DEBUG: Method not POST:', req.method)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Parse request body
    const body = await req.json()
    console.log('📥 DEBUG: Request body:', JSON.stringify(body, null, 2))
    
    const { userId, briefId, briefTitle, productName, notificationType } = body
    
    if (!userId || !briefTitle || !notificationType) {
      console.log('❌ DEBUG: Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, briefTitle, notificationType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    console.log('🔑 DEBUG: Auth header:', authHeader ? 'Present' : 'Missing')
    console.log('🔑 DEBUG: Auth header preview:', authHeader ? authHeader.substring(0, 20) + '...' : 'None')
    
    if (!authHeader) {
      console.log('❌ DEBUG: Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    console.log('🌍 DEBUG: Environment check:')
    console.log('  - SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing')
    console.log('  - SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'Present' : 'Missing')
    console.log('  - SUPABASE_ANON_KEY:', anonKey ? 'Present' : 'Missing')

    // Create Supabase client with service role for database operations
    const supabaseAdmin = createClient(supabaseUrl ?? '', serviceRoleKey ?? '')

    // Check if this is a service role call
    const isServiceRoleCall = authHeader.includes('sbp_')
    console.log('🔑 DEBUG: Is service role call:', isServiceRoleCall)
    
    if (!isServiceRoleCall) {
      console.log('❌ DEBUG: Not a service role call, would fail auth')
      return new Response(
        JSON.stringify({ error: 'DEBUG: Not a service role call' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ DEBUG: Service role call detected, proceeding...')

    // Get user profile
    console.log('👤 DEBUG: Looking up user profile for ID:', userId)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('email, company_name, name, slack_access_token, slack_channel_id, slack_channel_name, slack_notifications_enabled, admin_assigned_slack_channel_id, admin_assigned_slack_channel_name')
      .eq('id', userId)
      .single()

    console.log('👤 DEBUG: User profile lookup result:')
    console.log('  - Error:', profileError ? JSON.stringify(profileError) : 'None')
    console.log('  - Profile found:', userProfile ? 'Yes' : 'No')
    if (userProfile) {
      console.log('  - Email:', userProfile.email)
      console.log('  - Slack enabled:', userProfile.slack_notifications_enabled)
      console.log('  - User channel:', userProfile.slack_channel_id || 'None')
      console.log('  - Admin channel:', userProfile.admin_assigned_slack_channel_id || 'None')
    }

    if (profileError || !userProfile) {
      console.log('❌ DEBUG: User profile not found')
      return new Response(
        JSON.stringify({ error: 'User profile not found', debug: { profileError, userId } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check Slack configuration
    let slackConfig = 'none'
    if (userProfile.admin_assigned_slack_channel_id) {
      slackConfig = 'admin-assigned'
    } else if (userProfile.slack_notifications_enabled && userProfile.slack_channel_id) {
      slackConfig = 'user-level'
    }
    
    console.log('💬 DEBUG: Slack configuration type:', slackConfig)

    // If we have admin-assigned channel, get admin token
    if (slackConfig === 'admin-assigned') {
      console.log('🔍 DEBUG: Looking up admin Slack token...')
      const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from('admin_profiles')
        .select('slack_access_token')
        .eq('email', 'lashay@bofu.ai')
        .single()
      
      console.log('🔍 DEBUG: Admin lookup result:')
      console.log('  - Error:', adminError ? JSON.stringify(adminError) : 'None')
      console.log('  - Admin found:', adminProfile ? 'Yes' : 'No')
      console.log('  - Has token:', adminProfile?.slack_access_token ? 'Yes' : 'No')
      
      if (!adminError && adminProfile?.slack_access_token) {
        console.log('🚀 DEBUG: Would send Slack notification to admin channel')
        // Simulate Slack API call
        console.log('📤 DEBUG: Simulated Slack message sent successfully!')
      } else {
        console.log('❌ DEBUG: Cannot send Slack - admin token missing')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        debug: {
          userId,
          briefTitle,
          notificationType,
          isServiceRoleCall,
          slackConfig,
          userEmail: userProfile.email,
          hasAdminChannel: !!userProfile.admin_assigned_slack_channel_id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 DEBUG: Error in function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        debug: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})