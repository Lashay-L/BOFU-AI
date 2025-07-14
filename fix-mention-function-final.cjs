const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dbbfadyywkmtkyuwasam.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMentionFunction() {
  console.log('🔧 Fixing get_mentionable_users function...');
  
  try {
    // First, let's check what users exist in the profiles table
    console.log('📋 Checking existing profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_admin')
      .limit(10);
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
    } else {
      console.log('✅ Found profiles:', profiles?.length || 0);
      console.log('👥 Sample profiles:', profiles?.slice(0, 3));
    }

    // Now let's fix the function
    const fixSQL = `
-- Drop any existing versions of the function
DROP FUNCTION IF EXISTS get_mentionable_users(UUID, TEXT);
DROP FUNCTION IF EXISTS get_mentionable_users();
DROP FUNCTION IF EXISTS get_mentionable_users(UUID);
DROP FUNCTION IF EXISTS get_mentionable_users(TEXT);

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_mentionable_users(
  article_id_param UUID DEFAULT NULL,
  search_term_param TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  is_admin BOOLEAN,
  mention_text TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    COALESCE(p.full_name, p.email) as full_name,
    COALESCE(p.is_admin, false) as is_admin,
    CASE 
      WHEN p.full_name IS NOT NULL AND p.full_name != '' THEN 
        '@' || LOWER(REGEXP_REPLACE(p.full_name, '[^a-zA-Z0-9]', '', 'g'))
      ELSE 
        '@' || LOWER(SPLIT_PART(p.email, '@', 1))
    END as mention_text
  FROM profiles p
  WHERE 
    (search_term_param = '' OR 
     p.email ILIKE '%' || search_term_param || '%' OR 
     p.full_name ILIKE '%' || search_term_param || '%')
  ORDER BY 
    p.is_admin DESC, 
    p.full_name ASC, 
    p.email ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO anon;
`;

    console.log('🔧 Executing SQL to fix function...');
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql_query: fixSQL });
    
    if (sqlError) {
      console.error('❌ Error executing SQL:', sqlError);
      
      // Try direct approach
      console.log('🔄 Trying direct RPC execution...');
      const { data, error } = await supabase.rpc('sql', { query: fixSQL });
      if (error) {
        console.error('❌ Direct RPC also failed:', error);
      } else {
        console.log('✅ Direct RPC succeeded');
      }
    } else {
      console.log('✅ SQL executed successfully');
    }

    // Test the function
    console.log('🧪 Testing the fixed function...');
    const { data: testData, error: testError } = await supabase.rpc('get_mentionable_users');
    
    if (testError) {
      console.error('❌ Error testing function:', testError);
    } else {
      console.log('✅ Function test successful!');
      console.log('📊 Mentionable users found:', testData?.length || 0);
      console.log('👥 Sample users:', testData?.slice(0, 3));
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixMentionFunction(); 