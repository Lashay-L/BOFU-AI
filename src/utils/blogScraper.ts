import { supabase } from '../lib/supabase';

export interface ScrapedBlog {
  url: string;
  title: string;
  content: string;
  error?: string;
  status: 'scraped' | 'error';
  citations?: Array<{url: string; title: string;}>;
}

export async function scrapeBlogContent(url: string): Promise<ScrapedBlog> {
  try {
    console.log(`Attempting to extract content from: ${url} using OpenAI Edge Function`);
    
    // Call the secure Edge Function instead of OpenAI directly
    const { data, error } = await supabase.functions.invoke('openai-blog-scraper', {
      body: { url, action: 'scrape' }
    });

    if (error) {
      console.error('[blogScraper] Edge Function error:', error);
      return {
        url,
        title: url,
        content: "",
        error: error.message || "Failed to process URL with Edge Function",
        status: "error"
      };
    }

    if (!data.success) {
      console.error('[blogScraper] Edge Function failed:', data.error);
      return {
        url,
        title: url,
        content: "",
        error: data.error || "Edge Function processing failed",
        status: "error"
      };
    }

    const result = data.data as ScrapedBlog;
    console.log(`Successfully processed URL: ${url}, status: ${result.status}`);
    return result;

  } catch (error: any) {
    console.error('Error scraping blog content:', error);
    return {
      url,
      title: url,
      content: "",
      error: error.message || "Failed to process URL",
      status: "error"
    };
  }
}