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

  // Parse state parameter to get return path and validation - do this outside try block
  let returnPath = '/admin';
  let stateData: { type?: string; returnPath?: string } | null = null;
  
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    console.log('Admin Slack OAuth callback received:', { code: !!code, state, error })
    
    // Parse state parameter first
    if (state) {
      try {
        stateData = JSON.parse(atob(state));
        if (stateData?.returnPath) {
          returnPath = stateData.returnPath;
        }
      } catch (_e) {
        // Fallback to legacy state format
        if (state === 'admin_connection') {
          stateData = { type: 'admin_connection' };
        }
      }
    }

    // Handle OAuth error
    if (error) {
      console.error('Admin Slack OAuth error:', error)
      const urlSeparator = returnPath.includes('?') ? '&' : '?';
      const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}${returnPath}${urlSeparator}slack_error=${encodeURIComponent(error)}`
      return Response.redirect(redirectUrl, 302)
    }

    // Validate required parameters
    if (!code || !stateData || (stateData.type !== 'admin_connection' && state !== 'admin_connection')) {
      console.error('Missing or invalid OAuth parameters:', { code: !!code, state, stateData })
      const urlSeparator = returnPath.includes('?') ? '&' : '?';
      const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}${returnPath}${urlSeparator}slack_error=invalid_request`
      return Response.redirect(redirectUrl, 302)
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required environment variables')
      const urlSeparator = returnPath.includes('?') ? '&' : '?';
      const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}${returnPath}${urlSeparator}slack_error=configuration_error`
      return Response.redirect(redirectUrl, 302)
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Exchange authorization code for access token
    const SLACK_CLIENT_ID = "5930579212176.9234329054229"
    const SLACK_CLIENT_SECRET = Deno.env.get('SLACK_CLIENT_SECRET')

    if (!SLACK_CLIENT_SECRET) {
      console.error('Missing SLACK_CLIENT_SECRET environment variable')
      const urlSeparator = returnPath.includes('?') ? '&' : '?';
      const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}${returnPath}${urlSeparator}slack_error=configuration_error`
      return Response.redirect(redirectUrl, 302)
    }

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/admin-slack-oauth-callback`
      })
    })

    const tokenData = await tokenResponse.json()
    console.log('Admin Slack token exchange response:', { 
      ok: tokenData.ok, 
      error: tokenData.error,
      team: tokenData.team?.name 
    })

    if (!tokenData.ok) {
      console.error('Admin Slack token exchange failed:', tokenData.error)
      const urlSeparator = returnPath.includes('?') ? '&' : '?';
      const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}${returnPath}${urlSeparator}slack_error=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`
      return Response.redirect(redirectUrl, 302)
    }

    // Store admin Slack connection in admin_profiles table
    const { error: updateError } = await supabaseAdmin
      .from('admin_profiles')
      .update({
        slack_access_token: tokenData.access_token,
        slack_bot_token: tokenData.bot?.bot_access_token,
        slack_bot_user_id: tokenData.bot?.bot_user_id,
        slack_team_id: tokenData.team.id,
        slack_team_name: tokenData.team.name,
        slack_user_id: tokenData.authed_user.id,
        slack_connected_at: new Date().toISOString()
      })
      .eq('email', 'lashay@bofu.ai') // Super admin email

    if (updateError) {
      console.error('Error storing admin Slack connection:', updateError)
      const urlSeparator = returnPath.includes('?') ? '&' : '?';
      const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}${returnPath}${urlSeparator}slack_error=database_error`
      return Response.redirect(redirectUrl, 302)
    }

    console.log('Admin Slack integration successful for:', tokenData.team.name)

    // Redirect back to admin dashboard with success
    const urlSeparator = returnPath.includes('?') ? '&' : '?';
    const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}${returnPath}${urlSeparator}slack_success=true&team=${encodeURIComponent(tokenData.team.name)}`
    return Response.redirect(redirectUrl, 302)

  } catch (error) {
    console.error('Admin Slack OAuth callback error:', error)
    const urlSeparator = returnPath.includes('?') ? '&' : '?';
    const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}${returnPath}${urlSeparator}slack_error=server_error`
    return Response.redirect(redirectUrl, 302)
  }
})