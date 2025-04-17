import OpenAI from 'openai';

export interface ScrapedBlog {
  url: string;
  title: string;
  content: string;
  error?: string;
  status: 'scraped' | 'error';
  citations?: Array<{url: string; title: string;}>;
}

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'Your API Key Here',
  dangerouslyAllowBrowser: true // Only for demo purposes, in production use server-side API calls
});

export async function scrapeBlogContent(url: string): Promise<ScrapedBlog> {
  try {
    console.log(`Attempting to extract content from: ${url} using OpenAI Web Search`);
    
    // First check if the URL is valid
    try {
      new URL(url);
    } catch (e) {
      return {
        url,
        title: url,
        content: "",
        error: "Invalid URL format",
        status: "error"
      };
    }

    // Use OpenAI's web search to extract the content
    const response = await openai.chat.completions.create({
      model: "gpt-4o-search-preview", // Using the appropriate model for web search
      web_search_options: {
        search_context_size: "high", // Using high to ensure we get full content
      },
      messages: [
        {
          role: "system",
          content: "You are a content extraction assistant. Your task is to visit the provided URL and extract its content accurately. Do not summarize from search results - only extract content from the specific URL provided."
        },
        {
          role: "user",
          content: `Please visit and extract the content from this exact URL: "${url}". Do not search for similar content or summarize from search results. I need the actual content from this specific webpage.

Instructions:
1. Visit the exact URL provided
2. Extract the complete article/blog post content
3. Include:
   - Title
   - Author (if available)
   - Publication date (if available)
   - Full article text
4. Format in markdown
5. Do not include:
   - Comments
   - Advertisements
   - Navigation elements
   - Sidebars
   
If you cannot access the specific URL, please indicate that clearly in your response.`
        }
      ],
    });

    // Check if there was a response
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    // Extract the content from the API response
    const content = response.choices[0].message.content || '';
    
    // Extract citations if available
    const citations = response.choices[0].message.annotations
      ?.filter(annotation => annotation.type === 'url_citation')
      .map(annotation => {
        if ('url_citation' in annotation) {
          return {
            url: annotation.url_citation.url,
            title: annotation.url_citation.title
          };
        }
        return null;
      })
      .filter((citation): citation is {url: string; title: string} => citation !== null) || [];

    // If the content indicates inability to access the URL
    if (content.toLowerCase().includes("unable to access") || 
        content.toLowerCase().includes("cannot access") ||
        content.toLowerCase().includes("isn't available") ||
        content.toLowerCase().includes("could not access")) {
      return {
        url,
        title: url,
        content: `Error: Could not access the content at ${url}. This might be because:\n\n` +
                `1. The page requires authentication\n` +
                `2. The page is blocking automated access\n` +
                `3. The URL might be incorrect\n` +
                `4. The page might be temporarily unavailable\n\n` +
                `Please verify the URL and try again.`,
        error: "Could not access content",
        status: 'error'
      };
    }

    // Extract a title from the content (usually the first line)
    const title = content.split('\n')[0].replace(/^#+ /, '').trim() || 
                  url.split('/').pop()?.replace(/-/g, ' ') || 
                  'Blog Content';

    return {
      url,
      title,
      content,
      citations,
      status: 'scraped'
    };

  } catch (error) {
    console.error(`Error extracting content from ${url}:`, error);
    
    // If API key is not set or invalid, provide a helpful error message
    if (error instanceof Error && 
       (error.message.includes('API key') || 
        error.message.includes('authentication') || 
        error.message.includes('401'))) {
      return {
        url,
        title: url,
        content: `[OpenAI API key is missing or invalid]\n\nTo extract blog content, you need to set your OpenAI API key in the environment variables (VITE_OPENAI_API_KEY).\n\nFor now, we've submitted the URL for reference.`,
        error: "OpenAI API key is missing or invalid",
        status: 'error'
      };
    }
    
    // Handle specific API errors
    if (error instanceof Error && 
        (error.message.includes('model') || 
         error.message.includes('API version'))) {
      return {
        url,
        title: url,
        content: `[OpenAI API model error]\n\nThere was an issue with the OpenAI API model used for web search. The model 'gpt-4o-search-preview' might not be available or there's an incompatibility with the API version.\n\nPlease check your API access and model availability.`,
        error: "OpenAI API model error: " + error.message,
        status: 'error'
      };
    }
    
    return {
      url,
      title: url,
      content: `[Error occurred while processing ${url}]\n\nWe couldn't extract the content of this blog post. The URL has been submitted for reference.`,
      error: error instanceof Error ? error.message : 'Unknown error processing blog URL',
      status: 'error'
    };
  }
}