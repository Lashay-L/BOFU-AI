import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[UploadProductDocument] Request received - Method:', req.method, 'URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('[UploadProductDocument] OpenAI API key not configured')
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
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
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('[UploadProductDocument] Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the multipart/form-data request
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const vectorStoreId = formData.get('vectorStoreId') as string | null

    // Validate input
    if (!file) {
      return new Response(JSON.stringify({ error: 'File not provided.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    if (!vectorStoreId) {
      return new Response(JSON.stringify({ error: 'Vector Store ID not provided.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log(`Processing file: ${file.name}, Size: ${file.size} bytes`)
    console.log(`Target Vector Store ID: ${vectorStoreId}`)

    // Step 1: Upload the file to OpenAI
    const fileFormData = new FormData()
    fileFormData.append('file', file)
    fileFormData.append('purpose', 'assistants')
    
    const uploadResponse = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: fileFormData
    })

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text()
      console.error('[UploadProductDocument] File upload failed:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to upload file to OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const uploadedFile = await uploadResponse.json()
    console.log(`File uploaded to OpenAI. File ID: ${uploadedFile.id}`)

    // Step 2: Add the uploaded file to the Vector Store
    const vectorStoreResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({ file_id: uploadedFile.id }),
    })

    const vectorStoreData = await vectorStoreResponse.json()

    if (!vectorStoreResponse.ok) {
      console.error('Error adding file to vector store:', vectorStoreData)
      return new Response(JSON.stringify({
        message: 'File uploaded to OpenAI, but failed to add to Vector Store.',
        uploadedFileId: uploadedFile.id,
        errorDetails: vectorStoreData,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: vectorStoreResponse.status,
      })
    }

    console.log('File successfully added to Vector Store:', vectorStoreData)

    return new Response(JSON.stringify({ 
      message: 'File uploaded and added to Vector Store successfully.',
      uploadedFileId: uploadedFile.id,
      vectorStoreFileAssociation: vectorStoreData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error during file upload and processing:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})