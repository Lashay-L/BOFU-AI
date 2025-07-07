-- Image Repository Feature - Database Foundation
-- Migration: 20250201000000_create_media_library.sql
-- Creates media_files and media_folders tables with company-based isolation

-- Create media_folders table
CREATE TABLE IF NOT EXISTS media_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES media_folders(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate folder names within the same parent/company
  UNIQUE(name, company_name, parent_folder_id)
);

-- Create media_files table
CREATE TABLE IF NOT EXISTS media_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  company_name TEXT NOT NULL,
  
  -- Storage
  file_path TEXT NOT NULL UNIQUE,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'gif')),
  mime_type TEXT NOT NULL,
  
  -- Metadata
  width INTEGER,
  height INTEGER,
  duration REAL, -- For videos, in seconds
  
  -- Organization
  folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  
  -- File variants
  thumbnail_path TEXT, -- Generated thumbnail for videos
  thumbnail_width INTEGER,
  thumbnail_height INTEGER,
  
  -- Tracking
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  download_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_media_folders_updated_at
  BEFORE UPDATE ON media_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_files_updated_at
  BEFORE UPDATE ON media_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_folders_company_name ON media_folders(company_name);
CREATE INDEX IF NOT EXISTS idx_media_folders_parent_id ON media_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_created_by ON media_folders(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_media_files_company_name ON media_files(company_name);
CREATE INDEX IF NOT EXISTS idx_media_files_folder_id ON media_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_media_files_file_type ON media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_media_files_uploaded_by ON media_files(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_upload_date ON media_files(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_media_files_tags ON media_files USING GIN(tags);

-- Enable RLS
ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user can access company data
CREATE OR REPLACE FUNCTION can_access_company_media(target_company_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_company TEXT;
    target_user_id UUID;
BEGIN
    -- Super admins can access everything
    IF is_super_admin() THEN
        RETURN TRUE;
    END IF;
    
    -- Get user's company
    user_company := get_user_company_name(auth.uid());
    
    -- Users can access their own company
    IF user_company = target_company_name THEN
        RETURN TRUE;
    END IF;
    
    -- Sub-admins can access assigned client companies
    -- Find a user from the target company to check assignment
    SELECT id INTO target_user_id 
    FROM user_profiles 
    WHERE company_name = target_company_name 
    LIMIT 1;
    
    IF target_user_id IS NOT NULL AND is_client_assigned_to_admin(target_user_id) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users can view folders for accessible companies
CREATE POLICY "Users can view accessible company folders" ON media_folders
  FOR SELECT USING (can_access_company_media(company_name));

-- Users can create folders in accessible companies
CREATE POLICY "Users can create folders in accessible companies" ON media_folders
  FOR INSERT WITH CHECK (can_access_company_media(company_name));

-- Users can update folders in accessible companies
CREATE POLICY "Users can update accessible folders" ON media_folders
  FOR UPDATE USING (can_access_company_media(company_name));

-- Users can delete folders in accessible companies
CREATE POLICY "Users can delete accessible folders" ON media_folders
  FOR DELETE USING (can_access_company_media(company_name));

-- Users can view media files for accessible companies
CREATE POLICY "Users can view accessible company media" ON media_files
  FOR SELECT USING (can_access_company_media(company_name));

-- Users can upload media files to accessible companies
CREATE POLICY "Users can upload media to accessible companies" ON media_files
  FOR INSERT WITH CHECK (can_access_company_media(company_name));

-- Users can update media files in accessible companies
CREATE POLICY "Users can update accessible media" ON media_files
  FOR UPDATE USING (can_access_company_media(company_name));

-- Users can delete media files in accessible companies
CREATE POLICY "Users can delete accessible media" ON media_files
  FOR DELETE USING (can_access_company_media(company_name));

-- Create storage buckets (handled separately via Supabase dashboard or storage API)
-- media-library bucket for actual files
-- media-thumbnails bucket for generated thumbnails

-- Grant necessary permissions
GRANT ALL ON media_folders TO authenticated;
GRANT ALL ON media_files TO authenticated;

-- Comments for documentation
COMMENT ON TABLE media_folders IS 'Folder organization for company media libraries';
COMMENT ON TABLE media_files IS 'Media files with company-based isolation and metadata';
COMMENT ON COLUMN media_files.file_type IS 'Media type: image, video, or gif';
COMMENT ON COLUMN media_files.tags IS 'Array of tags for organization and search';
COMMENT ON COLUMN media_files.thumbnail_path IS 'Path to generated thumbnail (for videos)'; 