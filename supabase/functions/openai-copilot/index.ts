import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CopilotRequest {
  action: 'chat_completion' | 'create_thread' | 'send_message' | 'get_run_status' | 'get_messages';
  // Chat completion parameters
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  // Assistant parameters
  threadId?: string;
  message?: string;
  runId?: string;
  assistantId?: string;
  vectorStoreId?: string;
}

interface CopilotResponse {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
}

serve(async (req) => {
  console.log('[OpenAI-Copilot] Request received - Method:', req.method, 'URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('[OpenAI-Copilot] OpenAI API key not configured')
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
      console.error('[OpenAI-Copilot] Auth error:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestBody: CopilotRequest = await req.json()
    const { action } = requestBody
    console.log(`[OpenAI-Copilot] Processing action: ${action}`)

    // OpenAI API base URL
    const openaiBaseUrl = 'https://api.openai.com/v1'
    const openaiHeaders = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    }

    let response: CopilotResponse = { success: false }

    switch (action) {
      case 'chat_completion':
        try {
          const { model = 'gpt-4', messages, temperature = 0.7, max_tokens = 2000, stream = false } = requestBody
          
          if (!messages || messages.length === 0) {
            return new Response(
              JSON.stringify({ success: false, error: 'Messages are required for chat completion', errorCode: 'INVALID_INPUT' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          console.log(`[OpenAI-Copilot] Creating chat completion with model: ${model}`)

          const completionBody = {
            model,
            messages,
            temperature,
            max_tokens,
            stream
          }

          const completionResponse = await fetch(`${openaiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: openaiHeaders,
            body: JSON.stringify(completionBody)
          })

          if (!completionResponse.ok) {
            const error = await completionResponse.text()
            console.error('[OpenAI-Copilot] Chat completion failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to create chat completion', errorCode: 'CHAT_COMPLETION_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const completion = await completionResponse.json()
          response = { success: true, data: completion }
        } catch (error) {
          console.error('[OpenAI-Copilot] Chat completion error:', error)
          response = { success: false, error: error.message, errorCode: 'CHAT_COMPLETION_FAILED' }
        }
        break

      case 'create_thread':
        try {
          const { vectorStoreId } = requestBody
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
            console.error('[OpenAI-Copilot] Thread creation failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to create thread', errorCode: 'THREAD_CREATION_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const threadData = await threadResponse.json()
          response = { success: true, data: threadData }
        } catch (error) {
          console.error('[OpenAI-Copilot] Thread creation error:', error)
          response = { success: false, error: error.message, errorCode: 'THREAD_CREATION_FAILED' }
        }
        break

      case 'send_message':
        try {
          const { threadId, message, assistantId } = requestBody
          console.log('[OpenAI-Copilot] send_message params:', { threadId, message: message?.substring(0, 100), assistantId })
          
          if (!threadId || !message || !assistantId) {
            console.log('[OpenAI-Copilot] Missing params check:', { 
              hasThreadId: !!threadId, 
              hasMessage: !!message, 
              hasAssistantId: !!assistantId,
              threadIdValue: threadId,
              assistantIdValue: assistantId
            })
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
            console.error('[OpenAI-Copilot] Message creation failed:', error)
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
            console.error('[OpenAI-Copilot] Run creation failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to create run', errorCode: 'RUN_CREATION_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const runData = await runResponse.json()
          response = { success: true, data: runData }
        } catch (error) {
          console.error('[OpenAI-Copilot] Send message error:', error)
          response = { success: false, error: error.message, errorCode: 'MESSAGE_CREATION_FAILED' }
        }
        break

      case 'get_run_status':
        try {
          const { threadId, runId } = requestBody
          
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
            console.error('[OpenAI-Copilot] Run retrieval failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to retrieve run', errorCode: 'RUN_RETRIEVAL_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const runData = await runResponse.json()
          response = { success: true, data: runData }
        } catch (error) {
          console.error('[OpenAI-Copilot] Get run status error:', error)
          response = { success: false, error: error.message, errorCode: 'RUN_RETRIEVAL_FAILED' }
        }
        break

      case 'get_messages':
        try {
          const { threadId } = requestBody
          
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
            console.error('[OpenAI-Copilot] Messages retrieval failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to retrieve messages', errorCode: 'MESSAGE_RETRIEVAL_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const messagesData = await messagesResponse.json()
          response = { success: true, data: messagesData }
        } catch (error) {
          console.error('[OpenAI-Copilot] Get messages error:', error)
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
    console.error('[OpenAI-Copilot] Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})