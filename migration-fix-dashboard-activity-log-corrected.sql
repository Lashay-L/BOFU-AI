-- Fix RLS Policy for dashboard_activity_log Table (Corrected Version)
-- This migration fixes the RLS policy that prevents comment creation

-- First, let's check if the table exists and get its structure
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dashboard_activity_log') THEN
        RAISE NOTICE 'dashboard_activity_log table exists, proceeding with policy fixes...';
        
        -- Drop existing conflicting policies
        DROP POLICY IF EXISTS "Users can insert their own activity logs" ON dashboard_activity_log;
        DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON dashboard_activity_log;
        DROP POLICY IF EXISTS "Activity logs insert policy" ON dashboard_activity_log;
        DROP POLICY IF EXISTS "Users can read activity logs" ON dashboard_activity_log;

        -- Create permissive INSERT policy for authenticated users
        CREATE POLICY "Allow authenticated users to insert activity logs" 
        ON dashboard_activity_log
        FOR INSERT 
        TO authenticated
        WITH CHECK (
          -- Allow if the user_id matches the authenticated user
          -- OR if it's a system-generated activity log (user_id can be null)
          auth.uid()::text = user_id::text OR user_id IS NULL
        );

        -- Create SELECT policy for reading activity logs
        CREATE POLICY "Users can read activity logs" 
        ON dashboard_activity_log
        FOR SELECT 
        TO authenticated
        USING (
          -- Users can read their own activity logs
          auth.uid()::text = user_id::text
        );

        -- Ensure RLS is enabled
        ALTER TABLE dashboard_activity_log ENABLE ROW LEVEL SECURITY;

        -- Grant necessary permissions (without sequence grant)
        GRANT INSERT, SELECT ON dashboard_activity_log TO authenticated;
        
        RAISE NOTICE 'RLS policies updated successfully for dashboard_activity_log';
    ELSE
        RAISE NOTICE 'dashboard_activity_log table does not exist, skipping...';
    END IF;
END $$;