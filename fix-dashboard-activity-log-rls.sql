-- Fix RLS policy for dashboard_activity_log table to allow comment creation

-- First check if the table exists and its current structure
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'dashboard_activity_log';

-- Create RLS policy to allow authenticated users to insert activity logs
-- This policy allows any authenticated user to insert into dashboard_activity_log
-- which is needed when comments trigger activity logging

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON dashboard_activity_log;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON dashboard_activity_log;
DROP POLICY IF EXISTS "Activity logs insert policy" ON dashboard_activity_log;

-- Create a permissive policy for INSERT operations
CREATE POLICY "Allow authenticated users to insert activity logs" 
ON dashboard_activity_log
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow if the user_id matches the authenticated user
  -- OR if it's a system-generated activity log (user_id can be null for system actions)
  auth.uid()::text = user_id::text OR user_id IS NULL
);

-- Also create SELECT policy for reading activity logs
DROP POLICY IF EXISTS "Users can read activity logs" ON dashboard_activity_log;
CREATE POLICY "Users can read activity logs" 
ON dashboard_activity_log
FOR SELECT 
TO authenticated
USING (
  -- Users can read their own activity logs
  -- Admins can read all activity logs (this would need admin role check)
  auth.uid()::text = user_id::text
);

-- Enable RLS on the table (if not already enabled)
ALTER TABLE dashboard_activity_log ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated role
GRANT INSERT, SELECT ON dashboard_activity_log TO authenticated;
GRANT USAGE ON SEQUENCE dashboard_activity_log_id_seq TO authenticated;