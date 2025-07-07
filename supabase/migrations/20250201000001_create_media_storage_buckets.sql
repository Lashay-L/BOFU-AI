-- Media Library Storage Buckets and Policies
-- Migration: 20250201000001_create_media_storage_buckets.sql
-- Creates storage buckets and RLS policies for media library

-- Create storage buckets and policies for the Image Repository feature
-- This migration creates the storage infrastructure with proper company isolation and admin access

-- =================================================================
-- STORAGE BUCKETS CREATION
-- =================================================================

-- Create media-library bucket for original files (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-library',
  'media-library',
  false, -- Private bucket - requires authentication
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png', 
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/mov',
    'video/avi'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create media-thumbnails bucket for generated thumbnails (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-thumbnails',
  'media-thumbnails', 
  true, -- Public bucket for optimized thumbnails
  5242880, -- 5MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
) ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- HELPER FUNCTION FOR STORAGE ACCESS
-- =================================================================

-- Helper function to check if user can access storage files for a company
CREATE OR REPLACE FUNCTION can_access_company_storage(file_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    company_from_path TEXT;
    user_company TEXT;
    target_user_id UUID;
BEGIN
    -- Extract company name from path (format: company_name/folder/file)
    company_from_path := SPLIT_PART(file_path, '/', 1);
    
    -- Super admins can access everything
    IF is_super_admin() THEN
        RETURN TRUE;
    END IF;
    
    -- Get user's company
    SELECT company_name INTO user_company 
    FROM user_profiles 
    WHERE id = auth.uid();
    
    -- Users can access their own company files
    IF user_company = company_from_path THEN
        RETURN TRUE;
    END IF;
    
    -- Sub-admins can access assigned client companies
    -- Find a user from the target company to check assignment
    SELECT id INTO target_user_id 
    FROM user_profiles 
    WHERE company_name = company_from_path 
    LIMIT 1;
    
    IF target_user_id IS NOT NULL AND is_client_assigned_to_admin(target_user_id) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- STORAGE POLICIES FOR MEDIA-LIBRARY BUCKET
-- =================================================================

-- Users can view media files for accessible companies
CREATE POLICY "Users can view accessible company media files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media-library' AND
    can_access_company_storage(name)
  );

-- Users can upload media files to accessible companies
CREATE POLICY "Users can upload media to accessible companies" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media-library' AND
    can_access_company_storage(name)
  );

-- Users can update media files in accessible companies
CREATE POLICY "Users can update accessible media files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media-library' AND
    can_access_company_storage(name)
  );

-- Users can delete media files in accessible companies
CREATE POLICY "Users can delete accessible media files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media-library' AND
    can_access_company_storage(name)
  );

-- =================================================================
-- STORAGE POLICIES FOR MEDIA-THUMBNAILS BUCKET
-- =================================================================

-- Users can view thumbnail files for accessible companies
CREATE POLICY "Users can view accessible company thumbnails" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media-thumbnails' AND
    can_access_company_storage(name)
  );

-- Users can upload thumbnails for accessible companies
CREATE POLICY "Users can upload thumbnails to accessible companies" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media-thumbnails' AND
    can_access_company_storage(name)
  );

-- Users can update thumbnails in accessible companies
CREATE POLICY "Users can update accessible thumbnails" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media-thumbnails' AND
    can_access_company_storage(name)
  );

-- Users can delete thumbnails in accessible companies
CREATE POLICY "Users can delete accessible thumbnails" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media-thumbnails' AND
    can_access_company_storage(name)
  );

-- =================================================================
-- DOCUMENTATION
-- =================================================================

-- Comments for documentation
COMMENT ON POLICY "Users can view accessible company media files" ON storage.objects IS 'Allow users to view media files for their company or assigned companies (admins)';
COMMENT ON POLICY "Users can upload media to accessible companies" ON storage.objects IS 'Allow users to upload media files to accessible company folder structures';
COMMENT ON POLICY "Users can view accessible company thumbnails" ON storage.objects IS 'Allow users to view thumbnail files for accessible companies';
COMMENT ON POLICY "Users can upload thumbnails to accessible companies" ON storage.objects IS 'Allow users to upload thumbnail files for accessible companies'; 