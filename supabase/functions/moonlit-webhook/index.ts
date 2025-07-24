import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface MoonlitWebhookPayload {
  researchResultId: string;
  sourceProductId?: string;
  productName: string;
  briefContent: any;
  title: string;
  userId: string;
  [key: string]: any;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const payload: MoonlitWebhookPayload = await req.json();
    console.log('Received Moonlit webhook payload:', payload);

    // Validate required fields
    if (!payload.researchResultId || !payload.briefContent || !payload.userId) {
      return new Response('Missing required fields', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // With the new dual-ID system, we can directly use the provided IDs
    // sourceProductId links to approved_products.id, researchResultId is unique per brief
    const sourceProductId = payload.sourceProductId;
    
    // Log the dual-ID system for debugging
    console.log('🆔 Dual-ID System:', {
      researchResultId: payload.researchResultId,
      sourceProductId: sourceProductId,
      productName: payload.productName
    });

    // Validate that we have a source product ID for proper linking
    if (sourceProductId) {
      const { data: sourceProduct } = await supabase
        .from('approved_products')
        .select('id, product_name')
        .eq('id', sourceProductId)
        .single();
      
      if (!sourceProduct) {
        console.warn(`Source product not found for ID: ${sourceProductId}`);
      } else {
        console.log(`✅ Linked to source product: ${sourceProduct.product_name}`);
      }
    }

    // Create the content brief with dual-ID system
    const contentBriefData = {
      user_id: payload.userId,
      title: payload.title || `Content Brief - ${payload.productName}`,
      product_name: payload.productName,
      brief_content: payload.briefContent,
      research_result_id: payload.researchResultId, // Unique ID per content brief
      source_product_id: sourceProductId, // Links back to approved_products.id
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Add any other fields from payload
      ...(payload.internalLinks && { internal_links: payload.internalLinks }),
      ...(payload.possibleArticleTitles && { possible_article_titles: payload.possibleArticleTitles }),
    };

    const { data: createdBrief, error: insertError } = await supabase
      .from('content_briefs')
      .insert(contentBriefData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting content brief:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully created content brief:', createdBrief.id);

    return new Response(JSON.stringify({ 
      success: true, 
      contentBriefId: createdBrief.id,
      linkedToApprovedProduct: sourceProductId 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});