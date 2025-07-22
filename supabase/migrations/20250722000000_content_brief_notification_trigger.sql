-- Migration: Content Brief Notification Trigger
-- This trigger automatically sends notifications when new content briefs are created by Moonlit

-- Create function to handle content brief notifications
CREATE OR REPLACE FUNCTION handle_new_content_brief()
RETURNS trigger AS $$
DECLARE
    brief_title TEXT;
    product_name TEXT;
    user_profile_data RECORD;
BEGIN
    -- Get the user profile information
    SELECT up.id as profile_id, up.email, up.company_name
    INTO user_profile_data
    FROM user_profiles up
    WHERE up.user_id = NEW.user_id;
    
    -- If we can't find the user profile, skip notification
    IF user_profile_data IS NULL THEN
        RAISE NOTICE 'No user profile found for user_id: %', NEW.user_id;
        RETURN NEW;
    END IF;
    
    -- Extract brief title (fallback to 'Content Brief' if null)
    brief_title := COALESCE(NEW.title, 'Content Brief');
    
    -- Try to extract product name from the brief content if available
    -- This is a simple approach - you might want to make it more sophisticated
    product_name := user_profile_data.company_name;
    
    -- Log the notification attempt
    RAISE NOTICE 'Triggering content brief notification for user % (profile %): %', 
        NEW.user_id, user_profile_data.profile_id, brief_title;
    
    -- Call the Edge Function to send notifications (Slack + Email + In-app)
    PERFORM
        net.http_post(
            url := current_setting('app.supabase_url') || '/functions/v1/send-user-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key')
            ),
            body := jsonb_build_object(
                'userId', user_profile_data.profile_id,
                'briefId', NEW.id,
                'briefTitle', brief_title,
                'productName', product_name,
                'notificationType', 'brief_generated'
            )
        );
    
    -- Also create a fallback in-app notification directly in the database
    INSERT INTO user_notifications (
        user_id,
        brief_id,
        notification_type,
        title,
        message,
        is_read,
        created_at
    ) VALUES (
        user_profile_data.profile_id,
        NEW.id,
        'brief_generated',
        'Content Brief Generated: ' || brief_title,
        'Your content brief "' || brief_title || '"' || 
        CASE 
            WHEN product_name IS NOT NULL THEN ' for ' || product_name 
            ELSE '' 
        END || ' has been generated and is ready for your approval.',
        false,
        NOW()
    );
    
    RAISE NOTICE 'Content brief notification completed for user %', user_profile_data.profile_id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the content brief creation
        RAISE NOTICE 'Error in content brief notification trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS content_brief_notification_trigger ON content_briefs;

CREATE TRIGGER content_brief_notification_trigger
    AFTER INSERT ON content_briefs
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_content_brief();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_content_brief() TO service_role;

-- Enable http extension if not already enabled (for calling Edge Functions)
CREATE EXTENSION IF NOT EXISTS http;

-- Add settings for the trigger to access Supabase URL and service role key
-- Note: These should be set in your Supabase dashboard under Settings > Database > Extensions
-- ALTER DATABASE postgres SET "app.supabase_url" TO 'https://nhxjashreguofalhaofj.supabase.co';
-- ALTER DATABASE postgres SET "app.service_role_key" TO 'your_service_role_key';

COMMENT ON FUNCTION handle_new_content_brief() IS 'Automatically sends notifications when new content briefs are created by Moonlit';
COMMENT ON TRIGGER content_brief_notification_trigger ON content_briefs IS 'Triggers user notifications when content briefs are inserted';