-- Fix column name mismatches in media_files table
-- The TypeScript code expects different column names than what we created

-- 1. Rename storage_path to file_path
ALTER TABLE media_files 
RENAME COLUMN storage_path TO file_path;

-- 2. Add user_id as an alias/computed column for uploaded_by_user_id
-- Since TypeScript expects 'user_id' but we have 'uploaded_by_user_id'
ALTER TABLE media_files 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Update the user_id column to match uploaded_by_user_id for existing records
UPDATE media_files 
SET user_id = uploaded_by_user_id 
WHERE uploaded_by_user_id IS NOT NULL; 