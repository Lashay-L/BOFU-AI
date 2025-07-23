-- Migration: Fix Content Brief Slack Notifications
-- Switch from simple in-app only trigger to full notification system

-- Drop the current simple trigger
DROP TRIGGER IF EXISTS content_brief_notification_trigger ON content_briefs;

-- Create a new function that calls the Edge Function directly without database settings
CREATE OR REPLACE FUNCTION handle_content_brief_full_notifications()
RETURNS trigger AS $$
DECLARE
    brief_title TEXT;
    product_name TEXT;
    target_user_data RECORD;
    company_name_val TEXT;
    http_request_id BIGINT;
BEGIN
    -- Get the brief user's company information
    SELECT up.company_name
    INTO company_name_val
    FROM user_profiles up
    WHERE up.id = NEW.user_id;
    
    -- If we can't find the brief user's company, skip notification
    IF company_name_val IS NULL THEN
        RAISE NOTICE 'No company found for brief user: %', NEW.user_id;
        RETURN NEW;
    END IF;
    
    -- Find the main company user (usually the one with Slack enabled)
    SELECT up.id as profile_id, up.email, up.company_name
    INTO target_user_data
    FROM user_profiles up
    WHERE up.company_name = company_name_val
    ORDER BY 
        (up.slack_notifications_enabled AND up.slack_access_token IS NOT NULL) DESC,
        CASE WHEN up.email NOT LIKE '%team@%' AND up.email NOT LIKE '%admin@%' THEN 1 ELSE 0 END DESC,
        up.created_at ASC
    LIMIT 1;
    
    -- If we can't find any user for this company, fall back to the brief user
    IF target_user_data IS NULL THEN
        SELECT up.id as profile_id, up.email, up.company_name
        INTO target_user_data
        FROM user_profiles up
        WHERE up.id = NEW.user_id;
        
        IF target_user_data IS NULL THEN
            RAISE NOTICE 'No user profile found for user_id: %', NEW.user_id;
            RETURN NEW;
        END IF;
    END IF;
    
    -- Extract brief title (fallback to 'Content Brief' if null)
    brief_title := COALESCE(NEW.title, 'Content Brief');
    product_name := target_user_data.company_name;
    
    -- Log the notification attempt
    RAISE NOTICE 'Triggering full notification (in-app + email + Slack) for user % (email %): %', 
        target_user_data.profile_id, target_user_data.email, brief_title;
    
    -- 1. Create in-app notification immediately
    INSERT INTO user_notifications (
        user_id,
        brief_id,
        notification_type,
        title,
        message,
        is_read,
        created_at
    ) VALUES (
        target_user_data.profile_id,
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
    
    -- 2. Try to call the Edge Function for Slack + Email notifications
    BEGIN
        SELECT INTO http_request_id
            net.http_post(
                url := 'https://nhxjashreguofalhaofj.supabase.co/functions/v1/send-user-notification',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer sbp_3d5cd8b7a046e8dfcf1706d7265af9092b0230cc'
                ),
                body := jsonb_build_object(
                    'userId', target_user_data.profile_id,
                    'briefId', NEW.id,
                    'briefTitle', brief_title,
                    'productName', product_name,
                    'notificationType', 'brief_generated'
                )
            );
        
        RAISE NOTICE 'Edge Function called for full notifications (request_id: %)', http_request_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- If Edge Function call fails, log but don't fail the brief creation
            RAISE NOTICE 'Edge Function call failed, notifications limited to in-app only: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Content brief notification completed for user %', target_user_data.profile_id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the content brief creation
        RAISE NOTICE 'Error in content brief notification trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the new trigger using the full notifications function
CREATE TRIGGER content_brief_notification_trigger
    AFTER INSERT ON content_briefs
    FOR EACH ROW
    EXECUTE FUNCTION handle_content_brief_full_notifications();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_content_brief_full_notifications() TO service_role;

-- Ensure http extension is enabled for calling Edge Functions
CREATE EXTENSION IF NOT EXISTS http;

COMMENT ON FUNCTION handle_content_brief_full_notifications() IS 'Sends full notifications (in-app + email + Slack) when new content briefs are created';
COMMENT ON TRIGGER content_brief_notification_trigger ON content_briefs IS 'Triggers comprehensive user notifications when content briefs are inserted';