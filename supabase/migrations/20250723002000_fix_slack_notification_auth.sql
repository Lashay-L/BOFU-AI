-- Migration: Fix Slack notification authentication issue
-- Create a simpler notification queue system that bypasses auth issues

-- Create a notification queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_queue (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    brief_id UUID REFERENCES content_briefs(id),
    brief_title TEXT NOT NULL,
    product_name TEXT,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('brief_generated', 'article_generated')),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_notification_queue_unprocessed ON notification_queue (processed, created_at) WHERE processed = FALSE;

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS content_brief_notification_trigger ON content_briefs;

-- Create a simplified trigger that just queues notifications
CREATE OR REPLACE FUNCTION handle_content_brief_queue_notification()
RETURNS trigger AS $$
DECLARE
    brief_title TEXT;
    product_name TEXT;
    target_user_data RECORD;
    company_name_val TEXT;
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
    RAISE NOTICE 'Queueing notification for user % (email %): %', 
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
    
    -- 2. Queue the Slack/Email notification for processing
    INSERT INTO notification_queue (
        user_id,
        brief_id,
        brief_title,
        product_name,
        notification_type,
        processed
    ) VALUES (
        target_user_data.profile_id,
        NEW.id,
        brief_title,
        product_name,
        'brief_generated',
        false
    );
    
    RAISE NOTICE 'Notification queued successfully for user %', target_user_data.profile_id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the content brief creation
        RAISE NOTICE 'Error in content brief notification trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the new trigger
CREATE TRIGGER content_brief_notification_trigger
    AFTER INSERT ON content_briefs
    FOR EACH ROW
    EXECUTE FUNCTION handle_content_brief_queue_notification();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_content_brief_queue_notification() TO service_role;

-- Create a function to process the notification queue
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS void AS $$
DECLARE
    queue_item RECORD;
    auth_header TEXT;
BEGIN
    -- Get admin service token for authentication
    auth_header := 'Bearer sbp_3d5cd8b7a046e8dfcf1706d7265af9092b0230cc';
    
    -- Process all unprocessed notifications
    FOR queue_item IN 
        SELECT * FROM notification_queue 
        WHERE processed = FALSE 
        ORDER BY created_at ASC
        LIMIT 10
    LOOP
        BEGIN
            -- Call the Edge Function
            PERFORM net.http_post(
                url := 'https://nhxjashreguofalhaofj.supabase.co/functions/v1/send-user-notification',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', auth_header
                ),
                body := jsonb_build_object(
                    'userId', queue_item.user_id,
                    'briefId', queue_item.brief_id,
                    'briefTitle', queue_item.brief_title,
                    'productName', queue_item.product_name,
                    'notificationType', queue_item.notification_type
                )
            );
            
            -- Mark as processed
            UPDATE notification_queue 
            SET processed = TRUE, processed_at = NOW()
            WHERE id = queue_item.id;
            
            RAISE NOTICE 'Processed notification queue item %', queue_item.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to process notification queue item %: %', queue_item.id, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_content_brief_queue_notification() IS 'Queues notifications for processing when content briefs are created';
COMMENT ON FUNCTION process_notification_queue() IS 'Processes queued notifications for Slack and email delivery';
COMMENT ON TABLE notification_queue IS 'Queue for processing Slack and email notifications';