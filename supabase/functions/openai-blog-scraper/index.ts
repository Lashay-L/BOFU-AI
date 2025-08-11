import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BlogScraperRequest {
  url: string;
  action: 'scrape';
}

interface ScrapedBlog {
  url: string;
  title: string;
  content: string;
  error?: string;
  status: 'scraped' | 'error';
  citations?: Array<{url: string; title: string;}>;
}

interface BlogScraperResponse {
  success: boolean;
  data?: ScrapedBlog;
  error?: string;
  errorCode?: string;
}

serve(async (req) => {
  console.log('[OpenAI-BlogScraper] Request received - Method:', req.method, 'URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('[OpenAI-BlogScraper] OpenAI API key not configured')
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
      console.error('[OpenAI-BlogScraper] Auth error:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { url, action }: BlogScraperRequest = await req.json()
    console.log(`[OpenAI-BlogScraper] Processing action: ${action} for URL: ${url}`)

    if (action !== 'scrape') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action', errorCode: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required', errorCode: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // Validate URL format
      new URL(url)
    } catch (e) {
      const result: ScrapedBlog = {
        url,
        title: url,
        content: "",
        error: "Invalid URL format",
        status: "error"
      }
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[OpenAI-BlogScraper] Attempting to extract content from: ${url} using OpenAI Web Search`)
    
    try {
      // OpenAI API configuration
      const openaiHeaders = {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }

      // Create a chat completion to extract content from the URL
      const prompt = `Please extract and summarize the main content from the following URL: ${url}

Instructions:
1. Extract the main title and content
2. Provide a clean, readable summary
3. Focus on the key information and main points
4. If the URL cannot be accessed, explain the issue

Format your response as:
Title: [Page Title]
Content: [Main content summary]

If there are any issues accessing the URL, include:
Error: [Error description]`

      const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: openaiHeaders,
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful web content extractor. You can analyze URLs and provide summaries of their content.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      })

      if (!completionResponse.ok) {
        const error = await completionResponse.text()
        console.error('[OpenAI-BlogScraper] OpenAI API error:', error)
        
        const result: ScrapedBlog = {
          url,
          title: url,
          content: "",
          error: "Failed to process URL with AI",
          status: "error"
        }
        
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const completion = await completionResponse.json()
      const aiResponse = completion.choices?.[0]?.message?.content || ""

      // Parse the AI response
      let title = url
      let content = ""
      let error: string | undefined = undefined

      // Extract title and content from AI response
      const titleMatch = aiResponse.match(/Title:\s*(.+?)(?:\n|$)/i)
      const contentMatch = aiResponse.match(/Content:\s*([\s\S]*?)(?:\nError:|$)/i)
      const errorMatch = aiResponse.match(/Error:\s*(.+?)(?:\n|$)/i)

      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim()
      }

      if (contentMatch && contentMatch[1]) {
        content = contentMatch[1].trim()
      }

      if (errorMatch && errorMatch[1]) {
        error = errorMatch[1].trim()
      }

      // If we got content, consider it successful
      const status = content && content.length > 0 ? 'scraped' : 'error'
      if (status === 'error' && !error) {
        error = 'No content could be extracted from the URL'
      }

      const result: ScrapedBlog = {
        url,
        title,
        content,
        status,
        citations: status === 'scraped' ? [{ url, title }] : undefined
      }

      if (error) {
        result.error = error
      }

      console.log(`[OpenAI-BlogScraper] Successfully processed URL: ${url}, status: ${status}`)

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('[OpenAI-BlogScraper] Processing error:', error)
      
      const result: ScrapedBlog = {
        url,
        title: url,
        content: "",
        error: error.message || "Failed to process URL",
        status: "error"
      }

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('[OpenAI-BlogScraper] Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})