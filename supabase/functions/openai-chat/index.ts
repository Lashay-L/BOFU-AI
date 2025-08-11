import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  action: 'create_thread' | 'send_message' | 'get_run_status' | 'get_messages';
  threadId?: string;
  message?: string;
  runId?: string;
  vectorStoreId?: string;
  assistantId?: string;
}

interface ChatResponse {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
}

serve(async (req) => {
  console.log('[OpenAI-Chat] Request received - Method:', req.method, 'URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('[OpenAI-Chat] OpenAI API key not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured', errorCode: 'MISSING_CONFIG' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client for auth verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('[OpenAI-Chat] Auth error:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, threadId, message, runId, vectorStoreId, assistantId }: ChatRequest = await req.json()
    console.log(`[OpenAI-Chat] Processing action: ${action}`)

    // OpenAI API base URL
    const openaiBaseUrl = 'https://api.openai.com/v1'
    const openaiHeaders = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    }

    let response: ChatResponse = { success: false }

    switch (action) {
      case 'create_thread':
        try {
          const threadConfig: any = {}
          if (vectorStoreId) {
            threadConfig.tool_resources = {
              file_search: {
                vector_store_ids: [vectorStoreId]
              }
            }
          }

          const threadResponse = await fetch(`${openaiBaseUrl}/threads`, {
            method: 'POST',
            headers: openaiHeaders,
            body: JSON.stringify(threadConfig)
          })

          if (!threadResponse.ok) {
            const error = await threadResponse.text()
            console.error('[OpenAI-Chat] Thread creation failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to create thread', errorCode: 'THREAD_CREATION_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const threadData = await threadResponse.json()
          response = { success: true, data: threadData }
        } catch (error) {
          console.error('[OpenAI-Chat] Thread creation error:', error)
          response = { success: false, error: error.message, errorCode: 'THREAD_CREATION_FAILED' }
        }
        break

      case 'send_message':
        try {
          if (!threadId || !message || !assistantId) {
            return new Response(
              JSON.stringify({ success: false, error: 'Missing required parameters', errorCode: 'INVALID_INPUT' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Add message to thread
          const messageResponse = await fetch(`${openaiBaseUrl}/threads/${threadId}/messages`, {
            method: 'POST',
            headers: openaiHeaders,
            body: JSON.stringify({
              role: 'user',
              content: message
            })
          })

          if (!messageResponse.ok) {
            const error = await messageResponse.text()
            console.error('[OpenAI-Chat] Message creation failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to create message', errorCode: 'MESSAGE_CREATION_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Create run
          const runResponse = await fetch(`${openaiBaseUrl}/threads/${threadId}/runs`, {
            method: 'POST',
            headers: openaiHeaders,
            body: JSON.stringify({
              assistant_id: assistantId
            })
          })

          if (!runResponse.ok) {
            const error = await runResponse.text()
            console.error('[OpenAI-Chat] Run creation failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to create run', errorCode: 'RUN_CREATION_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const runData = await runResponse.json()
          response = { success: true, data: runData }
        } catch (error) {
          console.error('[OpenAI-Chat] Send message error:', error)
          response = { success: false, error: error.message, errorCode: 'MESSAGE_CREATION_FAILED' }
        }
        break

      case 'get_run_status':
        try {
          if (!threadId || !runId) {
            return new Response(
              JSON.stringify({ success: false, error: 'Missing required parameters', errorCode: 'INVALID_INPUT' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const runResponse = await fetch(`${openaiBaseUrl}/threads/${threadId}/runs/${runId}`, {
            method: 'GET',
            headers: openaiHeaders
          })

          if (!runResponse.ok) {
            const error = await runResponse.text()
            console.error('[OpenAI-Chat] Run retrieval failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to retrieve run', errorCode: 'RUN_RETRIEVAL_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const runData = await runResponse.json()
          response = { success: true, data: runData }
        } catch (error) {
          console.error('[OpenAI-Chat] Get run status error:', error)
          response = { success: false, error: error.message, errorCode: 'RUN_RETRIEVAL_FAILED' }
        }
        break

      case 'get_messages':
        try {
          if (!threadId) {
            return new Response(
              JSON.stringify({ success: false, error: 'Missing threadId parameter', errorCode: 'INVALID_INPUT' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const messagesResponse = await fetch(`${openaiBaseUrl}/threads/${threadId}/messages`, {
            method: 'GET',
            headers: openaiHeaders
          })

          if (!messagesResponse.ok) {
            const error = await messagesResponse.text()
            console.error('[OpenAI-Chat] Messages retrieval failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to retrieve messages', errorCode: 'MESSAGE_RETRIEVAL_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const messagesData = await messagesResponse.json()
          response = { success: true, data: messagesData }
        } catch (error) {
          console.error('[OpenAI-Chat] Get messages error:', error)
          response = { success: false, error: error.message, errorCode: 'MESSAGE_RETRIEVAL_FAILED' }
        }
        break

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action', errorCode: 'INVALID_INPUT' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: response.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[OpenAI-Chat] Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})