// Script to fix corrupted content briefs in the database
// This script will clean up existing corrupted brief_content fields

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhxjashreguofalhaofj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGphc2hyZWd1b2ZhbGhhb2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NzY0NjcsImV4cCI6MjA1MjQ1MjQ2N30.3fW8kXnzgvJUaFLDo_H8ypq60Y-dRgVZ8TQWOSoQOuM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to safely clean corrupted brief_content
function cleanCorruptedContent(rawContent) {
  if (!rawContent) return null;
  
  let cleanedContent = rawContent;
  
  // If it's already a valid object, return it
  if (typeof rawContent === 'object' && rawContent !== null) {
    return rawContent;
  }
  
  // If it's a string, try to extract JSON from it
  if (typeof rawContent === 'string') {
    try {
      // First, try to parse it directly
      const parsed = JSON.parse(rawContent);
      return parsed;
    } catch (e) {
      console.log('Direct JSON parse failed, trying to clean content...');
      
      // Remove HTML tags if present
      cleanedContent = rawContent.replace(/<[^>]*>/g, '');
      
      // Remove ```json code block markers
      if (cleanedContent.includes('```json')) {
        cleanedContent = cleanedContent.replace(/```json\s*/g, '');
        cleanedContent = cleanedContent.replace(/\s*```/g, '');
      }
      
      // Remove other code block markers
      cleanedContent = cleanedContent.replace(/```\s*/g, '');
      
      // Try to find JSON object boundaries
      const jsonStart = cleanedContent.indexOf('{');
      const jsonEnd = cleanedContent.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
      }
      
      // Try to parse again
      try {
        const parsed = JSON.parse(cleanedContent);
        return parsed;
      } catch (e2) {
        console.error('Failed to parse cleaned content:', e2.message);
        return null;
      }
    }
  }
  
  return null;
}

async function fixCorruptedBriefs() {
  try {
    console.log('Starting corrupted brief cleanup...');
    
    // Get all content briefs
    const { data: briefs, error } = await supabase
      .from('content_briefs')
      .select('id, brief_content, title')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching briefs:', error);
      return;
    }
    
    console.log(`Found ${briefs.length} briefs to check`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const brief of briefs) {
      console.log(`\nProcessing brief: ${brief.title} (${brief.id})`);
      
      // Check if brief_content is corrupted
      const isCorrupted = typeof brief.brief_content === 'string' && 
                         (brief.brief_content.includes('<p>') || 
                          brief.brief_content.includes('```json') ||
                          !brief.brief_content.trim().startsWith('{'));
      
      if (isCorrupted) {
        console.log('Detected corrupted content, attempting to fix...');
        
        const cleanedContent = cleanCorruptedContent(brief.brief_content);
        
        if (cleanedContent) {
          // Update the database with cleaned content
          const { error: updateError } = await supabase
            .from('content_briefs')
            .update({ brief_content: cleanedContent })
            .eq('id', brief.id);
          
          if (updateError) {
            console.error(`Failed to update brief ${brief.id}:`, updateError);
          } else {
            console.log(`✅ Successfully fixed brief: ${brief.title}`);
            fixedCount++;
          }
        } else {
          console.log(`❌ Could not fix brief: ${brief.title}`);
        }
      } else {
        console.log('Content appears to be clean, skipping');
        skippedCount++;
      }
    }
    
    console.log(`\n=== Cleanup Summary ===`);
    console.log(`Total briefs checked: ${briefs.length}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Skipped (clean): ${skippedCount}`);
    console.log(`Failed: ${briefs.length - fixedCount - skippedCount}`);
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Run the script
fixCorruptedBriefs();

export { fixCorruptedBriefs, cleanCorruptedContent };