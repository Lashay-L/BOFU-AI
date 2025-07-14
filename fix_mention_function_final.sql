-- Fix the get_mentionable_users function to use the correct column names
-- and handle missing mention_text columns

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
  -- Get regular users from user_profiles table
  SELECT 
    up.id as user_id,
    up.email,
    COALESCE(up.company_name, SPLIT_PART(up.email, '@', 1)) as full_name,
    up.avatar_url,
    false as is_admin,
    LOWER(SPLIT_PART(up.email, '@', 1)) as mention_text
  FROM user_profiles up
  WHERE up.email IS NOT NULL
    AND (search_term = '' OR up.company_name ILIKE '%' || search_term || '%' OR up.email ILIKE '%' || search_term || '%')
  
  UNION ALL
  
  -- Get admin users from admin_profiles table
  SELECT 
    ap.id as user_id,
    ap.email,
    COALESCE(ap.name, SPLIT_PART(ap.email, '@', 1)) as full_name,
    ap.avatar_url,
    true as is_admin,
    LOWER(SPLIT_PART(ap.email, '@', 1)) as mention_text
  FROM admin_profiles ap
  WHERE ap.email IS NOT NULL
    AND (search_term = '' OR ap.name ILIKE '%' || search_term || '%' OR ap.email ILIKE '%' || search_term || '%')
  
  ORDER BY full_name;
END;
$$; 