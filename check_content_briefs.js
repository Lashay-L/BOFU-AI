import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nhxjashreguofalhaofj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGphc2hyZWd1b2ZhbGhhb2ZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzUwODg0NCwiZXhwIjoyMDU5MDg0ODQ0fQ.EZWUlp5MkaMBohd8VZEf_2qUO8xYz1jofkaAw1ITilQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkContentBriefs() {
  console.log('Checking content_briefs table...\n')
  
  // Check content_briefs structure and sample data
  console.log('=== content_briefs structure ===')
  const { data: contentBriefs, error: briefsError } = await supabase
    .from('content_briefs')
    .select('id, title, product_name, brief_content, created_at')
    .limit(5)
  
  if (briefsError) {
    console.error('Error accessing content_briefs:', briefsError)
    return
  }
  
  if (contentBriefs && contentBriefs.length > 0) {
    console.log('Sample content briefs:')
    contentBriefs.forEach((brief, index) => {
      console.log(`\n${index + 1}. Brief ID: ${brief.id}`)
      console.log(`   Title: "${brief.title}"`)
      console.log(`   Product Name: "${brief.product_name}"`)
      console.log(`   Created: ${brief.created_at}`)
      
      // Check if brief_content has keywords
      if (brief.brief_content) {
        try {
          let briefContent = brief.brief_content
          if (typeof briefContent === 'string') {
            briefContent = JSON.parse(briefContent)
          }
          if (briefContent.keywords && Array.isArray(briefContent.keywords)) {
            console.log(`   First Keyword: "${briefContent.keywords[0]}"`)
          }
        } catch (error) {
          console.log('   Brief content parsing failed')
        }
      }
    })
  } else {
    console.log('No content briefs found')
  }
  
  // Look for specific brief with "Blackhawk" in title or product_name
  console.log('\n\n=== Looking for Blackhawk brief ===')
  const { data: blackhawkBriefs, error: blackhawkError } = await supabase
    .from('content_briefs')
    .select('id, title, product_name, brief_content')
    .or('title.ilike.%blackhawk%,product_name.ilike.%blackhawk%')
  
  if (blackhawkError) {
    console.error('Error searching for Blackhawk brief:', blackhawkError)
  } else if (blackhawkBriefs && blackhawkBriefs.length > 0) {
    blackhawkBriefs.forEach((brief) => {
      console.log(`\nFound Blackhawk brief:`)
      console.log(`ID: ${brief.id}`)
      console.log(`Title: "${brief.title}"`)
      console.log(`Product Name: "${brief.product_name}"`)
      
      if (brief.brief_content) {
        try {
          let briefContent = brief.brief_content
          if (typeof briefContent === 'string') {
            briefContent = JSON.parse(briefContent)
          }
          if (briefContent.keywords && Array.isArray(briefContent.keywords)) {
            console.log(`Keywords: ${JSON.stringify(briefContent.keywords)}`)
          }
        } catch (error) {
          console.log('Brief content parsing failed')
        }
      }
    })
  } else {
    console.log('No Blackhawk briefs found')
  }
}

checkContentBriefs().catch(console.error) 