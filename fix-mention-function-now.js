const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dbbfadyywkmtkyuwasam.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const fixFunction = `
-- Drop the broken function completely
DROP FUNCTION IF EXISTS get_mentionable_users(UUID, TEXT);
DROP FUNCTION IF EXISTS get_mentionable_users();
DROP FUNCTION IF EXISTS get_mentionable_users(UUID);
DROP FUNCTION IF EXISTS get_mentionable_users(TEXT);

-- Create the corrected function with proper column names and logic
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
SECURITY DEFINER
AS $$
BEGIN
  -- Enhanced logging for debugging
  RAISE NOTICE 'get_mentionable_users called with article_id: %, search_term: %', article_id_param, search_term;
  
  RETURN QUERY
  WITH user_data AS (
    -- Get regular users from user_profiles table
    SELECT 
      up.id as user_id,
      up.email,
      COALESCE(up.company_name, SPLIT_PART(up.email, '@', 1)) as full_name,
      up.avatar_url,
      FALSE as is_admin,
      COALESCE(up.company_name, SPLIT_PART(up.email, '@', 1)) as display_name
    FROM user_profiles up
    WHERE up.email IS NOT NULL
      -- Don't exclude current user in service role context (auth.uid() returns null)
      AND (auth.uid() IS NULL OR up.id != auth.uid())
    
    UNION ALL
    
    -- Get admin users from admin_profiles table - using 'name' column (not 'full_name')
    SELECT 
      ap.id as user_id,
      ap.email,
      COALESCE(ap.name, SPLIT_PART(ap.email, '@', 1)) as full_name,
      ap.avatar_url,
      TRUE as is_admin,
      COALESCE(ap.name, SPLIT_PART(ap.email, '@', 1)) as display_name
    FROM admin_profiles ap
    WHERE ap.email IS NOT NULL
      -- Don't exclude current user in service role context (auth.uid() returns null)
      AND (auth.uid() IS NULL OR ap.id != auth.uid())
  )
  SELECT 
    ud.user_id,
    ud.email,
    ud.full_name,
    ud.avatar_url,
    ud.is_admin,
    '@' || LOWER(REPLACE(REPLACE(REPLACE(ud.display_name, ' ', ''), '-', ''), '.', '')) as mention_text
  FROM user_data ud
  WHERE 
    (
      search_term = '' OR 
      LOWER(ud.display_name) LIKE LOWER('%' || search_term || '%') OR
      LOWER(ud.email) LIKE LOWER('%' || search_term || '%') OR
      LOWER(ud.full_name) LIKE LOWER('%' || search_term || '%')
    )
  ORDER BY 
    ud.is_admin DESC, -- Admins first
    LENGTH(ud.display_name) ASC, -- Shorter names first
    ud.display_name ASC
  LIMIT 20; -- Reasonable limit
END;
$$;

-- Grant comprehensive permissions
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO service_role;
`;

async function fixMentionFunction() {
  try {
    console.log('🔧 Fixing get_mentionable_users function...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: fixFunction
    });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      return;
    }
    
    console.log('✅ Function updated successfully');
    
    // Test the function
    console.log('🧪 Testing function...');
    const { data: testData, error: testError } = await supabase.rpc('get_mentionable_users', {
      article_id_param: null,
      search_term: ''
    });
    
    if (testError) {
      console.error('❌ Error testing function:', testError);
      return;
    }
    
    console.log('✅ Function test results:', {
      count: testData?.length || 0,
      users: testData?.map(u => ({ email: u.email, isAdmin: u.is_admin, mentionText: u.mention_text })) || []
    });
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

fixMentionFunction(); 