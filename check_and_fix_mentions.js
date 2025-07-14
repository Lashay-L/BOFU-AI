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

async function checkDatabase() {
  console.log('🔍 Checking database for mention system...\n');

  // Check admin_profiles
  console.log('1. Checking admin_profiles table:');
  const { data: adminProfiles, error: adminError } = await supabase
    .from('admin_profiles')
    .select('id, email, full_name, mention_text')
    .eq('email', 'lashay@bofu.ai');
  
  if (adminError) {
    console.error('❌ Admin profiles error:', adminError);
  } else {
    console.log('✅ Admin profiles found:', adminProfiles);
  }

  // Check user_profiles  
  console.log('\n2. Checking user_profiles table:');
  const { data: userProfiles, error: userError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, mention_text')
    .eq('email', 'lashay@bofu.ai');
  
  if (userError) {
    console.error('❌ User profiles error:', userError);
  } else {
    console.log('✅ User profiles found:', userProfiles);
  }

  // Test current mention function
  console.log('\n3. Testing current get_mentionable_users function:');
  const { data: mentionableUsers, error: mentionError } = await supabase
    .rpc('get_mentionable_users', { 
      article_id_param: null, 
      search_term: '' 
    });
  
  if (mentionError) {
    console.error('❌ Mention function error:', mentionError);
  } else {
    console.log('✅ Mentionable users returned:', mentionableUsers);
  }

  return { adminProfiles, userProfiles, mentionableUsers };
}

async function fixMentionFunction() {
  console.log('\n🔧 Fixing get_mentionable_users function...\n');

  const functionSQL = `
CREATE OR REPLACE FUNCTION get_mentionable_users(
  article_id_param UUID DEFAULT NULL,
  search_term TEXT DEFAULT ''
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN,
  mention_text TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id as user_id,
    up.email,
    up.full_name,
    up.avatar_url,
    false as is_admin,
    COALESCE(up.mention_text, LOWER(SPLIT_PART(up.email, '@', 1))) as mention_text
  FROM user_profiles up
  WHERE up.full_name IS NOT NULL
    AND up.email IS NOT NULL
    AND (search_term = '' OR up.full_name ILIKE '%' || search_term || '%')
  
  UNION ALL
  
  SELECT 
    ap.id as user_id,
    ap.email,
    ap.full_name,
    ap.avatar_url,
    true as is_admin,
    COALESCE(ap.mention_text, LOWER(SPLIT_PART(ap.email, '@', 1))) as mention_text
  FROM admin_profiles ap
  WHERE ap.full_name IS NOT NULL
    AND ap.email IS NOT NULL
    AND (search_term = '' OR ap.full_name ILIKE '%' || search_term || '%')
  
  ORDER BY full_name;
END;
$$;
`;

  try {
    // Note: This might not work through the JavaScript client as it doesn't support DDL
    // But let's try first
    const { data, error } = await supabase.rpc('exec', { sql: functionSQL });
    
    if (error) {
      console.log('❌ Cannot execute DDL through client. Need to run manually.');
      console.log('\n📝 SQL to run manually in Supabase SQL editor:');
      console.log(functionSQL);
      return false;
    } else {
      console.log('✅ Function updated successfully');
      return true;
    }
  } catch (err) {
    console.log('❌ Cannot execute DDL through client. Need to run manually.');
    console.log('\n📝 SQL to run manually in Supabase SQL editor:');
    console.log(functionSQL);
    return false;
  }
}

async function main() {
  try {
    const results = await checkDatabase();
    
    if (results.mentionableUsers && results.mentionableUsers.length === 0) {
      console.log('\n🚨 No mentionable users found! Function needs fixing.');
      await fixMentionFunction();
    } else {
      console.log('\n✅ Mention system appears to be working correctly.');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

main(); 