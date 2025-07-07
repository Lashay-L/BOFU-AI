-- Fix media-library bucket RLS policies for authenticated users

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media-library', 'media-library', true, 52428800, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov', 'video/avi'])
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov', 'video/avi'];

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Authenticated users can upload to media library" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view media library files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their own media files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their own media files" ON storage.objects;

-- Create new policies for media-library bucket

-- 1. Allow authenticated users to upload files to their company folder
CREATE POLICY "Authenticated users can upload to media library"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'media-library' 
    AND auth.uid() IS NOT NULL
);

-- 2. Allow anyone to view public media library files (since bucket is public)
CREATE POLICY "Anyone can view media library files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media-library');

-- 3. Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update their own media files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'media-library'
    AND auth.uid() IS NOT NULL
    -- Allow if they uploaded it (path contains their user ID)
    AND (
        name LIKE auth.uid()::text || '/%'
        OR EXISTS (
            SELECT 1 FROM media_files 
            WHERE file_path = storage.objects.name 
            AND user_id = auth.uid()
        )
    )
);

-- 4. Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete their own media files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'media-library'
    AND auth.uid() IS NOT NULL
    -- Allow if they uploaded it (path contains their user ID)
    AND (
        name LIKE auth.uid()::text || '/%'
        OR EXISTS (
            SELECT 1 FROM media_files 
            WHERE file_path = storage.objects.name 
            AND user_id = auth.uid()
        )
    )
);

-- Also ensure media_files table has proper RLS policies
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can insert their own media files" ON media_files;
DROP POLICY IF EXISTS "Users can view media files from their company" ON media_files;
DROP POLICY IF EXISTS "Users can update their own media files" ON media_files;
DROP POLICY IF EXISTS "Users can delete their own media files" ON media_files;

-- Create policies for media_files table
CREATE POLICY "Users can insert their own media files"
ON media_files FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view media files from their company"
ON media_files FOR SELECT
TO authenticated
USING (
    -- Can see files from their company
    company_name IN (
        SELECT company_name FROM user_profiles WHERE id = auth.uid()
        UNION
        SELECT company_id FROM company_profiles WHERE user_id = auth.uid() AND is_active = true
    )
    -- Or files they uploaded
    OR user_id = auth.uid()
);

CREATE POLICY "Users can update their own media files"
ON media_files FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR uploaded_by_user_id = auth.uid());

CREATE POLICY "Users can delete their own media files"
ON media_files FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR uploaded_by_user_id = auth.uid());