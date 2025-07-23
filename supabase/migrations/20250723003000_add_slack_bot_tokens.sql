-- Add bot token fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS slack_bot_token TEXT,
ADD COLUMN IF NOT EXISTS slack_bot_user_id TEXT;

-- Add bot token fields to admin_profiles table  
ALTER TABLE admin_profiles
ADD COLUMN IF NOT EXISTS slack_bot_token TEXT,
ADD COLUMN IF NOT EXISTS slack_bot_user_id TEXT;

-- Add comments for clarity
COMMENT ON COLUMN user_profiles.slack_bot_token IS 'Bot access token for Slack integration (xoxb- prefix)';
COMMENT ON COLUMN user_profiles.slack_bot_user_id IS 'Bot user ID for Slack workspace';
COMMENT ON COLUMN admin_profiles.slack_bot_token IS 'Admin bot access token for Slack integration (xoxb- prefix)';
COMMENT ON COLUMN admin_profiles.slack_bot_user_id IS 'Admin bot user ID for Slack workspace';