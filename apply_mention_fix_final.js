import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMentionSystem() {
  console.log('🔧 Fixing mention system...\n');

  // Step 1: Update admin user's name since it's currently null
  console.log('1. Updating admin user name...');
  try {
    const { data: updateResult, error: updateError } = await supabase
      .from('admin_profiles')
      .update({ 
        name: 'Lashay' // Set a proper name for @lashay mentions
      })
      .eq('email', 'lashay@bofu.ai')
      .select();

    if (updateError) {
      console.error('❌ Failed to update admin name:', updateError);
    } else {
      console.log('✅ Admin name updated:', updateResult);
    }
  } catch (err) {
    console.error('❌ Error updating admin name:', err.message);
  }

  // Step 2: Show the SQL that needs to be run manually
  console.log('\n2. Database function fix required...');
  console.log('📝 Please copy and paste this SQL into the Supabase SQL Editor:\n');
  
  const functionSQL = fs.readFileSync('fix_mention_function_final.sql', 'utf8');
  console.log(functionSQL);
  
  console.log('\n3. After running the SQL, test the mention system...');
  
  // Step 3: Test if we can update through data changes  
  console.log('\n4. Testing current state...');
  try {
    const { data: testUsers, error: testError } = await supabase
      .rpc('get_mentionable_users', { 
        article_id_param: null, 
        search_term: '' 
      });
    
    if (testError) {
      console.log('❌ Function still needs fixing:', testError.message);
    } else {
      console.log('✅ Function test result:', testUsers);
      
      // Check if lashay is now mentionable
      const lashayMentionable = testUsers.find(user => 
        user.mention_text === 'lashay' || user.email === 'lashay@bofu.ai'
      );
      
      if (lashayMentionable) {
        console.log('🎉 Success! Lashay is now mentionable:', lashayMentionable);
      } else {
        console.log('⚠️ Lashay not found in mentionable users. Function may still need fixing.');
      }
    }
  } catch (err) {
    console.error('❌ Cannot test function:', err.message);
  }

  console.log('\n📋 Next steps:');
  console.log('1. Run the SQL above in Supabase SQL Editor');
  console.log('2. Test mentioning @lashay in an article comment');
  console.log('3. Check admin notification center for the mention notification');
}

fixMentionSystem(); 