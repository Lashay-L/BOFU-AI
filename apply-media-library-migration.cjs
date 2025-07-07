// Apply Media Library Migration Script
// This script creates the media_files and media_folders tables with RLS policies

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrationSQL = `
-- Media Library Tables and RLS Policies
-- Created: 2025-02-01
-- Description: Centralized media management system for BOFU AI with company-based isolation

-- Drop existing objects if they exist (for idempotent migrations)
DROP TABLE IF EXISTS public.media_files CASCADE;
DROP TABLE IF EXISTS public.media_folders CASCADE;

-- Create media_folders table for organization
CREATE TABLE public.media_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES public.media_folders(id) ON DELETE CASCADE,
    path TEXT NOT NULL, -- Full folder path for efficient queries
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ensure unique folder names within the same parent and company
    UNIQUE(company_id, parent_folder_id, name),
    
    -- Check constraint to prevent self-referencing
    CHECK (id != parent_folder_id)
);

-- Create media_files table for centralized media storage
CREATE TABLE public.media_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.media_folders(id) ON DELETE SET NULL,
    
    -- File metadata
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Supabase storage path
    file_type VARCHAR(50) NOT NULL, -- image, video, gif, etc.
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    
    -- Media-specific metadata
    width INTEGER, -- For images/videos
    height INTEGER, -- For images/videos
    duration_seconds FLOAT, -- For videos/gifs
    
    -- User-editable metadata
    title VARCHAR(255),
    caption TEXT,
    alt_text VARCHAR(255),
    tags TEXT[], -- Array of tags for searchability
    
    -- Thumbnail information
    thumbnail_path TEXT, -- Path to thumbnail in storage
    thumbnail_width INTEGER,
    thumbnail_height INTEGER,
    
    -- Timestamps and attribution
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(title, '') || ' ' || 
            COALESCE(caption, '') || ' ' || 
            COALESCE(alt_text, '') || ' ' || 
            COALESCE(original_filename, '') || ' ' ||
            COALESCE(array_to_string(tags, ' '), '')
        )
    ) STORED
);

-- Create indexes for performance
CREATE INDEX idx_media_folders_company_id ON public.media_folders(company_id);
CREATE INDEX idx_media_folders_parent ON public.media_folders(parent_folder_id);
CREATE INDEX idx_media_folders_path ON public.media_folders USING gin(path gin_trgm_ops);

CREATE INDEX idx_media_files_company_id ON public.media_files(company_id);
CREATE INDEX idx_media_files_folder_id ON public.media_files(folder_id);
CREATE INDEX idx_media_files_type ON public.media_files(file_type);
CREATE INDEX idx_media_files_created_at ON public.media_files(created_at DESC);
CREATE INDEX idx_media_files_search ON public.media_files USING gin(search_vector);
CREATE INDEX idx_media_files_tags ON public.media_files USING gin(tags);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_media_folders_updated_at 
    BEFORE UPDATE ON public.media_folders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_files_updated_at 
    BEFORE UPDATE ON public.media_files 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_folders
-- Company users can only access their company's folders
CREATE POLICY "Company users can view their company folders" 
ON public.media_folders FOR SELECT
USING (
    company_id IN (
        SELECT p.company_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Company users can insert their company folders" 
ON public.media_folders FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT p.company_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Company users can update their company folders" 
ON public.media_folders FOR UPDATE
USING (
    company_id IN (
        SELECT p.company_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Company users can delete their company folders" 
ON public.media_folders FOR DELETE
USING (
    company_id IN (
        SELECT p.company_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
    )
);

-- Super admin override policies for media_folders
CREATE POLICY "Super admins can access all folders" 
ON public.media_folders FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'super_admin'
    )
);

-- RLS Policies for media_files
-- Company users can only access their company's files
CREATE POLICY "Company users can view their company files" 
ON public.media_files FOR SELECT
USING (
    company_id IN (
        SELECT p.company_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Company users can insert their company files" 
ON public.media_files FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT p.company_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Company users can update their company files" 
ON public.media_files FOR UPDATE
USING (
    company_id IN (
        SELECT p.company_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Company users can delete their company files" 
ON public.media_files FOR DELETE
USING (
    company_id IN (
        SELECT p.company_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
    )
);

-- Super admin override policies for media_files
CREATE POLICY "Super admins can access all files" 
ON public.media_files FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'super_admin'
    )
);

-- Grant permissions
GRANT ALL ON public.media_folders TO authenticated;
GRANT ALL ON public.media_files TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
`;

async function applyMigration() {
  try {
    console.log('🚀 Applying Media Library Migration...');
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
    
    console.log('✅ Media Library Migration applied successfully!');
    console.log('📋 Created tables:');
    console.log('   - media_folders (for organization)');
    console.log('   - media_files (for centralized storage)');
    console.log('🔒 RLS policies configured for company-based access control');
    console.log('📈 Performance indexes created');
    
  } catch (error) {
    console.error('❌ Failed to apply migration:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  applyMigration();
}

module.exports = { applyMigration }; 