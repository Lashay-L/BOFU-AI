-- Migration: Fix Content Brief Notification Title Issues
-- This migration updates the trigger to prevent file paths from being used as titles
-- and improves fallback title generation

-- Create improved function to handle content brief notifications with title validation
CREATE OR REPLACE FUNCTION handle_new_content_brief()
RETURNS trigger AS $$
DECLARE
    brief_title TEXT;
    product_name TEXT;
    user_profile_data RECORD;
    is_file_path BOOLEAN := FALSE;
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
    
    -- Validate the title and check if it's a file path
    -- Common file path patterns: starts with /, contains /var/folders/, ends with common extensions
    IF NEW.title IS NOT NULL THEN
        -- Check for file path patterns
        is_file_path := (
            NEW.title LIKE '/%' OR                          -- Starts with /
            NEW.title LIKE '%/var/folders/%' OR             -- Contains /var/folders/
            NEW.title LIKE '%TemporaryItems%' OR            -- Contains TemporaryItems
            NEW.title LIKE '%.png' OR                       -- Ends with image extensions
            NEW.title LIKE '%.jpg' OR
            NEW.title LIKE '%.jpeg' OR
            NEW.title LIKE '%.gif' OR
            NEW.title LIKE '%.pdf' OR
            NEW.title LIKE '%.doc%' OR
            NEW.title LIKE '%Screenshot%' OR                -- Contains Screenshot
            LENGTH(NEW.title) > 200                         -- Unusually long (likely file path)
        );
    END IF;
    
    -- Extract brief title with improved fallback logic
    IF NEW.title IS NOT NULL AND NOT is_file_path AND LENGTH(TRIM(NEW.title)) > 0 THEN
        brief_title := TRIM(NEW.title);
    ELSE
        -- Generate a meaningful fallback title
        IF NEW.product_name IS NOT NULL AND LENGTH(TRIM(NEW.product_name)) > 0 THEN
            brief_title := 'Content Brief: ' || TRIM(NEW.product_name);
        ELSIF user_profile_data.company_name IS NOT NULL THEN
            brief_title := 'Content Brief: ' || user_profile_data.company_name || ' Analysis';
        ELSE
            brief_title := 'Content Brief: Product Analysis';
        END IF;
        
        -- Log when we use fallback title
        IF is_file_path THEN
            RAISE NOTICE 'File path detected in title (%), using fallback: %', NEW.title, brief_title;
        ELSE
            RAISE NOTICE 'Empty or null title, using fallback: %', brief_title;
        END IF;
    END IF;
    
    -- Try to extract product name from the brief content if available
    product_name := COALESCE(NEW.product_name, user_profile_data.company_name);
    
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_content_brief() TO service_role;

-- Add a comment to document the improvement
COMMENT ON FUNCTION handle_new_content_brief() IS 'Automatically sends notifications when new content briefs are created by Moonlit. Includes title validation to prevent file paths from being used as titles and improved fallback logic.';