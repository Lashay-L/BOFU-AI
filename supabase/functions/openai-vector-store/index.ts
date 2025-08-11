import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VectorStoreRequest {
  action: 'create' | 'get' | 'list' | 'delete';
  vectorStoreId?: string;
  name?: string;
  metadata?: Record<string, any>;
  params?: Record<string, any>;
}

interface VectorStoreResponse {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
}

serve(async (req) => {
  console.log('[OpenAI-VectorStore] Request received - Method:', req.method, 'URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('[OpenAI-VectorStore] OpenAI API key not configured')
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
      console.error('[OpenAI-VectorStore] Auth error:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, vectorStoreId, name, metadata, params }: VectorStoreRequest = await req.json()
    console.log(`[OpenAI-VectorStore] Processing action: ${action}`)

    // OpenAI API base URL
    const openaiBaseUrl = 'https://api.openai.com/v1'
    const openaiHeaders = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    }

    let response: VectorStoreResponse = { success: false }

    switch (action) {
      case 'create':
        try {
          if (!name) {
            return new Response(
              JSON.stringify({ success: false, error: 'Name is required for creating vector store', errorCode: 'INVALID_INPUT' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          console.log(`[OpenAI-VectorStore] Creating vector store with name: ${name}`)
          
          const createBody: any = { name }
          if (metadata) {
            createBody.metadata = metadata
          }

          const createResponse = await fetch(`${openaiBaseUrl}/vector_stores`, {
            method: 'POST',
            headers: openaiHeaders,
            body: JSON.stringify(createBody)
          })

          if (!createResponse.ok) {
            const error = await createResponse.text()
            console.error('[OpenAI-VectorStore] Vector store creation failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to create vector store', errorCode: 'VECTOR_STORE_CREATION_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const vectorStore = await createResponse.json()
          console.log(`[OpenAI-VectorStore] Vector store created with ID: ${vectorStore.id}`)
          response = { success: true, data: vectorStore }
        } catch (error) {
          console.error('[OpenAI-VectorStore] Create error:', error)
          response = { success: false, error: error.message, errorCode: 'VECTOR_STORE_CREATION_FAILED' }
        }
        break

      case 'get':
        try {
          if (!vectorStoreId) {
            return new Response(
              JSON.stringify({ success: false, error: 'Vector store ID is required', errorCode: 'INVALID_INPUT' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const getResponse = await fetch(`${openaiBaseUrl}/vector_stores/${vectorStoreId}`, {
            method: 'GET',
            headers: openaiHeaders
          })

          if (!getResponse.ok) {
            const error = await getResponse.text()
            console.error('[OpenAI-VectorStore] Vector store retrieval failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to retrieve vector store', errorCode: 'VECTOR_STORE_NOT_FOUND' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const vectorStore = await getResponse.json()
          response = { success: true, data: vectorStore }
        } catch (error) {
          console.error('[OpenAI-VectorStore] Get error:', error)
          response = { success: false, error: error.message, errorCode: 'VECTOR_STORE_NOT_FOUND' }
        }
        break

      case 'list':
        try {
          const queryParams = new URLSearchParams()
          if (params?.limit) queryParams.append('limit', params.limit.toString())
          if (params?.order) queryParams.append('order', params.order)
          if (params?.after) queryParams.append('after', params.after)
          if (params?.before) queryParams.append('before', params.before)

          const listUrl = `${openaiBaseUrl}/vector_stores${queryParams.toString() ? '?' + queryParams.toString() : ''}`
          
          const listResponse = await fetch(listUrl, {
            method: 'GET',
            headers: openaiHeaders
          })

          if (!listResponse.ok) {
            const error = await listResponse.text()
            console.error('[OpenAI-VectorStore] Vector store listing failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to list vector stores', errorCode: 'VECTOR_STORE_LIST_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const vectorStores = await listResponse.json()
          response = { success: true, data: vectorStores }
        } catch (error) {
          console.error('[OpenAI-VectorStore] List error:', error)
          response = { success: false, error: error.message, errorCode: 'VECTOR_STORE_LIST_FAILED' }
        }
        break

      case 'delete':
        try {
          if (!vectorStoreId) {
            return new Response(
              JSON.stringify({ success: false, error: 'Vector store ID is required', errorCode: 'INVALID_INPUT' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const deleteResponse = await fetch(`${openaiBaseUrl}/vector_stores/${vectorStoreId}`, {
            method: 'DELETE',
            headers: openaiHeaders
          })

          if (!deleteResponse.ok) {
            const error = await deleteResponse.text()
            console.error('[OpenAI-VectorStore] Vector store deletion failed:', error)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to delete vector store', errorCode: 'VECTOR_STORE_DELETE_FAILED' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const deleteResult = await deleteResponse.json()
          response = { success: true, data: deleteResult }
        } catch (error) {
          console.error('[OpenAI-VectorStore] Delete error:', error)
          response = { success: false, error: error.message, errorCode: 'VECTOR_STORE_DELETE_FAILED' }
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
    console.error('[OpenAI-VectorStore] Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})