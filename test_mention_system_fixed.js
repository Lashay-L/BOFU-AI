import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMentionSystemFixed() {
  console.log('🧪 Testing mention system after database fix...\n');

  // Test 1: Check if get_mentionable_users now returns users
  console.log('1. Testing get_mentionable_users function:');
  try {
    const { data: mentionableUsers, error: mentionError } = await supabase
      .rpc('get_mentionable_users', { 
        article_id_param: null, 
        search_term: '' 
      });
    
    if (mentionError) {
      console.error('❌ Function error:', mentionError);
      return false;
    } else {
      console.log('✅ Function returned:', mentionableUsers);
      console.log(`📊 Found ${mentionableUsers.length} mentionable users`);
      
      // Check if lashay is in the list
      const lashayUser = mentionableUsers.find(user => 
        user.mention_text === 'lashay' || user.email === 'lashay@bofu.ai'
      );
      
      if (lashayUser) {
        console.log('🎉 SUCCESS: Lashay found as mentionable user!');
        console.log('   User details:', lashayUser);
      } else {
        console.log('❌ FAIL: Lashay not found in mentionable users');
        return false;
      }
    }
  } catch (err) {
    console.error('❌ Cannot test function:', err.message);
    return false;
  }

  // Test 2: Simulate mention extraction and validation
  console.log('\n2. Testing mention extraction with new function:');
  try {
    const testComment = "Hey @lashay, this mention should now work!";
    
    // Extract mentions (same logic as in commentApi.ts)
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(testComment)) !== null) {
      mentions.push('@' + match[1]);
    }
    
    console.log('📝 Extracted mentions:', mentions);
    
    // Get mentionable users to validate against
    const { data: allUsers, error: usersError } = await supabase
      .rpc('get_mentionable_users', { 
        article_id_param: null, 
        search_term: '' 
      });
    
    if (usersError) {
      console.error('❌ Cannot get users for validation:', usersError);
      return false;
    }
    
    // Validate mentions
    const validMentions = [];
    const invalidMentions = [];
    
    for (const mention of mentions) {
      const mentionText = mention.substring(1); // Remove @
      const user = allUsers.find(u => u.mention_text === mentionText);
      
      if (user) {
        validMentions.push({
          mention,
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          is_admin: user.is_admin
        });
      } else {
        invalidMentions.push(mention);
      }
    }
    
    console.log('✅ Valid mentions:', validMentions);
    console.log('❌ Invalid mentions:', invalidMentions);
    
    if (validMentions.length > 0) {
      console.log('🎉 SUCCESS: Mention validation is now working!');
      return true;
    } else {
      console.log('❌ FAIL: No valid mentions found');
      return false;
    }
    
  } catch (err) {
    console.error('❌ Mention validation test failed:', err.message);
    return false;
  }
}

async function main() {
  const success = await testMentionSystemFixed();
  
  if (success) {
    console.log('\n🎉 MENTION SYSTEM IS NOW WORKING! 🎉');
    console.log('\n📋 Next steps:');
    console.log('1. Test in the UI: Go to an article and try mentioning @lashay');
    console.log('2. Check the admin notification center for mention notifications');
    console.log('3. The debug button should now show valid mentions');
  } else {
    console.log('\n❌ Mention system still has issues');
    console.log('Please check the database function was applied correctly');
  }
}

main(); 