import { ProductAnalysis } from '../types/product/types';

// Moonlit API configuration
const MOONLIT_CONTENT_BRIEF_ENDPOINT = 'https://api.moonlitplatform.com/api/v1/app/1Q4He7LV2POazP05x2HB'; // For product card → content brief generation
const MOONLIT_ARTICLE_GENERATION_ENDPOINT = 'https://api.moonlitplatform.com/api/v1/app/WEV2N2oDeUWPKoGaWNH8'; // For content brief → article generation
const MOONLIT_API_KEY = import.meta.env.VITE_MOONLIT_API_KEY || 'your_api_key';

// Define the structure for content brief input
interface ContentBriefInput {
  contentBrief: string;
  internalLinks: string;
  articleTitle: string;
  contentFramework: string;
  research_result_id: string | null;
}

// Define the structure for Moonlit product card input
interface MoonlitProductInput {
  productCard: ProductAnalysis & { 
    google_doc: string;
    userUUID?: string;
    userEmail?: string;
    userCompanyName?: string;
  };
  researchResultId?: string;
  sourceProductId?: string;
}

/**
 * Safely logs objects by handling circular references
 */
function safeLog(prefix: string, obj: any) {
  try {
    const seen = new WeakSet();
    const safeObj = JSON.stringify(obj, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
    
    console.log(`${prefix}:`, safeObj);
  } catch (err) {
    console.log(`${prefix} (error stringifying):`, obj);
  }
}

/**
 * Formats content framework for Moonlit API
 */
function formatContentFramework(contentFramework: string | string[]): string {
  if (Array.isArray(contentFramework)) {
    return contentFramework
      .filter(item => item && item.trim())
      .join('\n\n');
  }
  return String(contentFramework || '');
}

/**
 * Sends content brief data to Moonlit for article generation
 */
export async function approveContentBriefWithMoonlit(briefData: ContentBriefInput) {
  try {
    console.log('Sending content brief to Moonlit for article generation...');
    
    // Enhanced logging for article generation debugging
    console.log('🎯 Moonlit Article Generation Data:', {
      hasContentBrief: !!briefData.contentBrief,
      hasInternalLinks: !!briefData.internalLinks,
      hasArticleTitle: !!briefData.articleTitle,
      hasContentFramework: !!briefData.contentFramework,
      contentFrameworkValue: briefData.contentFramework,
      contentFrameworkLength: briefData.contentFramework?.length || 0,
      contentFrameworkType: Array.isArray(briefData.contentFramework) ? 'array' : typeof briefData.contentFramework,
      researchResultId: briefData.research_result_id
    });

    // Format content framework properly for article generation
    const formattedContentFramework = formatContentFramework(briefData.contentFramework);

    // Prepare JSON data matching your curl example structure
    // Ensure contentBrief is always a string
    const contentBriefString = typeof briefData.contentBrief === 'string' 
      ? briefData.contentBrief 
      : JSON.stringify(briefData.contentBrief);
    
    const requestBody = {
      "Content Brief": contentBriefString,
      "Content Framework": formattedContentFramework,
      "Suggested Title": briefData.articleTitle,
      "Internal Links": briefData.internalLinks,
      "Research Result ID": briefData.research_result_id || ''
    };

    console.log('🚀 Form data being sent to Moonlit for article generation:', {
      contentBriefLength: contentBriefString?.length || 0,
      contentFrameworkLength: formattedContentFramework?.length || 0,
      suggestedTitle: briefData.articleTitle,
      internalLinksLength: briefData.internalLinks?.length || 0,
      researchResultId: briefData.research_result_id || ''
    });
    
    // Debug the content brief data
    console.log('🔍 Content Brief Debug:', {
      contentBriefType: typeof briefData.contentBrief,
      contentBriefValue: typeof briefData.contentBrief === 'string' 
        ? briefData.contentBrief.substring(0, 200) + '...' 
        : briefData.contentBrief,
      contentBriefFull: briefData.contentBrief
    });

    // Use HTTP Basic Auth as shown in curl -u example (try Bearer token first)
    console.log('🔑 Moonlit API Key:', MOONLIT_API_KEY ? 'Present' : 'Missing', 'Length:', MOONLIT_API_KEY?.length);
    
    const response = await fetch(MOONLIT_ARTICLE_GENERATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOONLIT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Moonlit article generation API error:', response.status, response.statusText, errorText);
      
      // Handle specific Moonlit API errors
      if (response.status === 401) {
        throw new Error('AUTHENTICATION_ERROR: Invalid Moonlit API key. Please check your credentials.');
      } else if (response.status === 403) {
        throw new Error('PERMISSION_ERROR: Insufficient permissions to access Moonlit API.');
      } else if (response.status === 429) {
        throw new Error('RATE_LIMIT_ERROR: Too many requests to Moonlit API. Please try again later.');
      }
      
      throw new Error(`Moonlit article generation API error (${response.status}): ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Moonlit article generation response:', data);
    
    // Log success confirmation
    console.log('✅ Successfully sent content brief to Moonlit for article generation:', {
      contentFramework: briefData.contentFramework,
      responseStatus: response.status
    });
    
    return data;
  } catch (error) {
    console.error('Error in Moonlit article generation integration:', error);
    throw error;
  }
}

/**
 * Checks the status of a Moonlit run using the run ID
 * This is mainly for testing purposes
 */
export async function checkMoonlitRunStatus(runId: string) {
  try {
    console.log(`Checking Moonlit run status for ID: ${runId}`);
    
    // Create Bearer token header (matching Node.js example format)
    console.log('🔑 Moonlit API Key:', MOONLIT_API_KEY ? 'Present' : 'Missing', 'Length:', MOONLIT_API_KEY?.length);
    const authHeader = `Bearer ${MOONLIT_API_KEY}`;
    
    const response = await fetch(`https://api.moonlitplatform.com/api/v1/run/${runId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Moonlit run status API error:', response.status, response.statusText, errorText);
      throw new Error(`Moonlit run status API error (${response.status}): ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Moonlit run status response:', data);
    return data;
  } catch (error) {
    console.error('Error checking Moonlit run status:', error);
    throw error;
  }
}

/**
 * Sends product card data to Moonlit for content brief generation
 */
export async function sendProductCardToMoonlit(productData: MoonlitProductInput) {
  try {
    console.log('Sending product card to Moonlit...');
    
    // Map product data to the exact required format
    const productCardData = {
      companyName: productData.productCard.companyName || '',
      productDetails: {
        name: productData.productCard.productDetails?.name || '',
        description: productData.productCard.productDetails?.description || ''
      },
      usps: productData.productCard.usps || [],
      features: productData.productCard.features || [],
      painPoints: productData.productCard.painPoints || [],
      businessOverview: {
        mission: productData.productCard.businessOverview?.mission || '',
        industry: productData.productCard.businessOverview?.industry || '',
        keyOperations: productData.productCard.businessOverview?.keyOperations || ''
      },
      targetPersona: {
        primaryAudience: productData.productCard.targetPersona?.primaryAudience || '',
        demographics: Array.isArray(productData.productCard.targetPersona?.demographics) 
          ? productData.productCard.targetPersona.demographics 
          : (productData.productCard.targetPersona?.demographics ? [productData.productCard.targetPersona.demographics] : []),
        industrySegments: Array.isArray(productData.productCard.targetPersona?.industrySegments)
          ? productData.productCard.targetPersona.industrySegments
          : (productData.productCard.targetPersona?.industrySegments ? [productData.productCard.targetPersona.industrySegments] : []),
        psychographics: Array.isArray(productData.productCard.targetPersona?.psychographics)
          ? productData.productCard.targetPersona.psychographics
          : (productData.productCard.targetPersona?.psychographics ? [productData.productCard.targetPersona.psychographics] : [])
      },
      pricing: productData.productCard.pricing || '',
      currentSolutions: {
        existingMethods: productData.productCard.currentSolutions?.existingMethods || [],
        directCompetitors: productData.productCard.currentSolutions?.directCompetitors || []
      },
      capabilities: productData.productCard.capabilities || [],
      competitors: {
        niche_competitors: productData.productCard.competitors?.niche_competitors || [],
        direct_competitors: productData.productCard.competitors?.direct_competitors || [],
        broader_competitors: productData.productCard.competitors?.broader_competitors || []
      },
      keywords: productData.productCard.keywords || [],
      framework: productData.productCard.framework || '',
      isApproved: productData.productCard.isApproved || false,
      google_doc: productData.productCard.google_doc || '',
      userUUID: productData.productCard.userUUID || '',
      userEmail: productData.productCard.userEmail || '',
      userCompanyName: productData.productCard.userCompanyName || ''
    };
    
    // Create JSON body to match API requirements
    const body = JSON.stringify({
      "Product Card": JSON.stringify(productCardData),
      "Research Result ID": productData.researchResultId || '',
      "text_input_3": productData.sourceProductId || ''
    });

    console.log('Product card data being sent to Moonlit:', productCardData);
    console.log('Research Result ID:', productData.researchResultId || '');
    console.log('Source Product ID (text_input_3):', productData.sourceProductId || '');
    
    // Create Bearer token header (matching Node.js example format)
    console.log('🔑 Moonlit API Key:', MOONLIT_API_KEY ? 'Present' : 'Missing', 'Length:', MOONLIT_API_KEY?.length);
    const authHeader = `Bearer ${MOONLIT_API_KEY}`;
    
    const response = await fetch(MOONLIT_CONTENT_BRIEF_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: body
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Moonlit API error:', response.status, response.statusText, errorText);
      
      // Handle specific Moonlit API errors
      if (response.status === 401) {
        throw new Error('AUTHENTICATION_ERROR: Invalid Moonlit API key. Please check your credentials.');
      } else if (response.status === 403) {
        throw new Error('PERMISSION_ERROR: Insufficient permissions to access Moonlit API.');
      } else if (response.status === 429) {
        throw new Error('RATE_LIMIT_ERROR: Too many requests to Moonlit API. Please try again later.');
      }
      
      throw new Error(`Moonlit API error (${response.status}): ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Moonlit product card response:', data);
    return data;
  } catch (error) {
    console.error('Error in Moonlit product card integration:', error);
    throw error;
  }
}